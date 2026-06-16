import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseResumeWithGroq } from '@/lib/ai/resume-parser';
import { generateAndStoreCandidateEmbedding } from '@/lib/ai/embeddings';

export const runtime = 'nodejs';

/**
 * POST /api/resume/upload
 *
 * Full resume pipeline:
 * 1. Accepts multipart/form-data with a PDF file
 * 2. Uploads to Supabase Storage (bucket: resumes, private)
 * 3. Extracts text using pdf-parse
 * 4. Sends raw text to Groq for structured JSON parsing
 * 5. Saves parsed data to normalized DB tables
 * 6. Triggers OpenAI embedding generation (non-blocking)
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) {
        throw new AuthorizationError('Only candidates can upload resumes');
      }

      const formData = await request.formData();
      const file = formData.get('resume') as File | null;

      if (!file) {
        throw new ValidationError('No file provided. Include a PDF file with field name "resume"');
      }

      if (file.type !== 'application/pdf') {
        throw new ValidationError('Only PDF files are accepted');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new ValidationError('File size must be under 5 MB');
      }

      // ── 0. Delete previous resume from Supabase Storage if it exists ──────────
      if (user.resumeUrl) {
        try {
          let oldPath = user.resumeUrl;
          if (oldPath.includes('/public/resumes/')) {
            oldPath = oldPath.split('/public/resumes/')[1];
          } else if (oldPath.startsWith('http')) {
            const parts = oldPath.split('/');
            if (parts.length >= 2) {
              oldPath = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
            }
          }
          
          if (oldPath) {
            console.log(`[resume] Deleting old resume file: ${oldPath}`);
            const supabase = getSupabaseAdmin();
            await supabase.storage.from('resumes').remove([oldPath]);
          }
        } catch (deleteError) {
          console.error('[resume] Failed to delete old resume:', deleteError);
        }
      }

      // ── 1. Upload to Supabase Storage ────────────────────────────────────────
      const supabase = getSupabaseAdmin();
      const filePath = `${user.id}/${Date.now()}_resume.pdf`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload resume: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
      const resumeUrl = urlData?.publicUrl ?? filePath;

      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

      const rawText = (await pdfParse(fileBuffer)).text;

      if (!rawText?.trim()) {
        throw new ValidationError('Could not extract text from the PDF. Ensure the file is not scanned/image-only.');
      }

      // ── 3. Parse with Groq ────────────────────────────────────────────────────
      const parsed = await parseResumeWithGroq(rawText);

      // Sync name with Clerk if found
      if (parsed.personalInfo?.name) {
        const parts = parsed.personalInfo.name.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        try {
          const { clerkClient } = await import('@clerk/nextjs/server');
          const clerk = await clerkClient();
          await clerk.users.updateUser(user.id, {
            firstName,
            lastName,
          });
        } catch (err) {
          console.error('[clerk] Failed to sync name with Clerk:', err);
        }
      }

      // ── 4. Save parsed data to normalized tables (in a transaction) ──────────
      await prisma.$transaction(async (tx) => {
        // Update user's top-level fields
        await tx.user.update({
          where: { id: user.id },
          data: {
            resumeUrl,
            resumeRawText: rawText.slice(0, 10000), // cap stored text
            yearsOfExperience: parsed.yearsOfExperience ?? undefined,
            embeddingStatus: 'pending',
            // Sync legacy skills array with parsed skills
            skills: parsed.skills.slice(0, 50),
          },
        });

        // Replace experiences
        await tx.candidateExperience.deleteMany({ where: { candidateId: user.id } });
        if (parsed.experiences.length) {
          await tx.candidateExperience.createMany({
            data: parsed.experiences.map((exp) => ({
              candidateId: user.id,
              company: exp.company || 'Unknown Company',
              role: exp.role || 'Unknown Role',
              startDate: exp.startDate ? new Date(exp.startDate) : null,
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              description: exp.description ?? null,
            })),
          });
        }

        // Replace education
        await tx.candidateEducation.deleteMany({ where: { candidateId: user.id } });
        if (parsed.education.length) {
          await tx.candidateEducation.createMany({
            data: parsed.education.map((edu) => ({
              candidateId: user.id,
              institution: edu.institution || 'Unknown Institution',
              degree: edu.degree ?? null,
              field: edu.field ?? null,
              graduationYear: edu.graduationYear ?? null,
            })),
          });
        }

        // Replace certifications
        await tx.candidateCertification.deleteMany({ where: { candidateId: user.id } });
        if (parsed.certifications.length) {
          await tx.candidateCertification.createMany({
            data: parsed.certifications.map((cert) => ({
              candidateId: user.id,
              name: cert.name || 'Unknown Certification',
              issuer: cert.issuer ?? null,
              year: cert.year ?? null,
            })),
          });
        }

        // Upsert skills in batch (keep existing + add new ones using skipDuplicates: true)
        if (parsed.skills.length) {
          await tx.candidateSkill.createMany({
            data: parsed.skills.slice(0, 50).map((skillName) => ({
              candidateId: user.id,
              name: skillName,
            })),
            skipDuplicates: true,
          });
        }

        // Invalidate cached matching score & reasoning for all this user's applications that are not accepted
        await tx.application.updateMany({
          where: { 
            userId: user.id,
            status: { not: 'ACCEPTED' }
          },
          data: {
            matchingScore: null,
            aiReasoning: null,
          },
        });
      }, {
        maxWait: 15000,
        timeout: 30000,
      });

      // ── 5. Trigger embedding (non-blocking — errors logged internally) ────────
      generateAndStoreCandidateEmbedding(user.id).catch(() => { });

      return Response.json(
        {
          message: 'Resume uploaded and parsed successfully',
          resumeUrl,
          parsed: {
            skills: parsed.skills,
            experienceCount: parsed.experiences.length,
            educationCount: parsed.education.length,
            certificationCount: parsed.certifications.length,
            yearsOfExperience: parsed.yearsOfExperience,
          },
        },
        { status: 201 }
      );
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
