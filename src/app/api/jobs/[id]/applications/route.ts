import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/providers/groq';
import { calculateMatchingScore } from '@/lib/matching';

/**
 * GET /api/jobs/[id]/applications
 * 
 * Fetches all applications for a specific job.
 * - Only Recruiter, Company_Admin, or Super_Admin can view applications
 * - Recruiters/Company_Admins can only view applications for jobs in their domain
 * - Super_Admin can view applications for any job
 * 
 * @param request - Request object
 * @param params - Route parameters with job id
 * @returns Applications array with id, jobId, userId, candidateSkills, matchingScore, status, createdAt, user details
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to view applications
 * @throws {NotFoundError} If job is not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to view applications
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot view job applications');
      }
      
      const { id: jobId } = await params;
      
      // Fetch job to check existence and domain
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
        },
      });
      
      if (!job) {
        throw new NotFoundError('Job');
      }
      
      // Apply domain isolation for non-Super_Admin users
      if (user.role !== Role.SUPER_ADMIN) {
        if (job.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to view applications for this job');
        }
      }
      
      // Fetch all applications for the job with user details
      const applications = await prisma.application.findMany({
        where: { jobId },
        select: {
          id: true,
          jobId: true,
          userId: true,
          matchingScore: true,
          aiReasoning: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              skills: true,
              resumeUrl: true,
              yearsOfExperience: true,
              experiences: {
                select: {
                  role: true,
                  company: true,
                  startDate: true,
                  endDate: true,
                  description: true,
                },
              },
              education: {
                select: {
                  degree: true,
                  field: true,
                  institution: true,
                  graduationYear: true,
                },
              },
              certifications: {
                select: {
                  name: true,
                  issuer: true,
                  year: true,
                },
              },
            },
          },
        },
      });

      if (!applications.length) {
        return successResponse([]);
      }

      // Check if all applications already have fully cached scores and reasoning statements in the DB
      const allCached = applications.every(
        (app) => app.matchingScore !== null && app.aiReasoning !== null
      );

      if (allCached) {
        const enriched = applications.map((app) => ({
          ...app,
          matchingScore: app.matchingScore!,
          aiReasoning: app.aiReasoning!,
          embeddingScore: null,
          skillScore: null,
        }));
        // Sort applicants by matching percentage descending
        enriched.sort((a, b) => b.matchingScore - a.matchingScore);
        return successResponse(enriched);
      }

      // Filter to uncached applications to avoid wasting LLM API limits
      const uncachedApps = applications.filter(
        (app) => app.matchingScore === null || app.aiReasoning === null
      );

      // ── Step 1: Query Groq AI matching scores and reasoning only for uncached applicants ──
      const aiScores: Record<string, { score: number; reasoning: string }> = {};
      if (uncachedApps.length > 0) {
        try {
          const groq = getGroqClient();
          const prompt = `
You are an expert AI recruiter matching candidate applications for the following job listing:
Job Title: ${job.title}
Job Description: ${job.description}
Required Skills: ${job.requiredSkills.join(', ')}

Here are the candidates who applied:
${uncachedApps.map((app) => {
  const experiences = app.user?.experiences?.map((e) => `${e.role} at ${e.company} (${e.startDate ? new Date(e.startDate).getFullYear() : ''}-${e.endDate ? new Date(e.endDate).getFullYear() : 'Present'})`).join('; ') || 'None';
  return `Candidate ID: ${app.userId}
Email: ${app.user?.email}
Skills: ${app.user?.skills?.join(', ') || 'None'}
Experience Years: ${app.user?.yearsOfExperience || 0}
Experience Details: ${experiences}`;
}).join('\n\n')}

For each candidate, evaluate their profile against the job requirements.
Determine:
1. An AI match compatibility score (0 to 100) based on their skills overlap, experience years, and overall background.
2. A professional, clear recruiters' reasoning (1-2 sentences, max 80 words) detailing their key strengths and alignment with the job.

Return the results as ONLY a raw JSON array (no markdown code blocks, no comments):
[{"candidateId":"...","score":85,"reasoning":"Candidate has strong React skills and 5 years experience, matches all frontend requirements."}]
`.trim();

          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: 'You are a strict JSON-only API. Only return raw JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 1500,
          });

          const content = completion.choices[0]?.message?.content ?? '[]';
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned) as { candidateId: string; score: number; reasoning: string }[];
          for (const item of parsed) {
            aiScores[item.candidateId] = { score: item.score, reasoning: item.reasoning };
          }
        } catch (err) {
          console.warn('[applicants-score] Groq AI reasoning failed, using fallback:', err);
        }
      }

      // Check if job embedding exists
      const jobEmb = await prisma.jobEmbedding.findUnique({
        where: { jobId },
        select: { id: true },
      });

      // ── Step 2: Query pgvector embedding similarities and calculate hybrid scores ──
      const enrichedApplications = await Promise.all(
        applications.map(async (app) => {
          // If already cached, simply return the cached values immediately
          if (app.matchingScore !== null && app.aiReasoning !== null) {
            return {
              ...app,
              matchingScore: app.matchingScore,
              aiReasoning: app.aiReasoning,
              embeddingScore: null,
              skillScore: null,
            };
          }

          let embeddingScore: number | null = null;
          
          if (jobEmb) {
            try {
              const embeddingMatch = await prisma.$queryRaw<{ score: number }[]>`
                SELECT (1 - (je.embedding <=> ce.embedding)) * 100 as score
                FROM job_embeddings je
                JOIN candidate_embeddings ce ON ce."candidateId" = ${app.user?.id}
                WHERE je."jobId" = ${jobId}
              `;
              if (embeddingMatch && embeddingMatch[0]?.score !== undefined) {
                embeddingScore = Math.round(Number(embeddingMatch[0].score));
              }
            } catch (err) {
              console.warn(`[applicants-score] Embedding matching failed for candidate ${app.userId}:`, err);
            }
          }

          const { score: skillScoreFraction, commonSkills } = calculateMatchingScore({
            candidateSkills: app.user?.skills || [],
            requiredSkills: job.requiredSkills || [],
          });
          const skillScore = Math.round(skillScoreFraction * 100);

          // Get AI score and reasoning from Groq or compute fallback
          const aiMatch = aiScores[app.userId];
          const finalAIScore = aiMatch ? aiMatch.score : skillScore;
          
          // Hybrid score calculation:
          // If Groq is available: 50% AI Review, 30% pgvector embedding, 20% skill score
          // If pgvector is not available: 70% AI Review, 30% skill score
          let finalScore = skillScore;
          if (aiMatch) {
            if (embeddingScore !== null) {
              finalScore = Math.round((finalAIScore * 0.5) + (embeddingScore * 0.3) + (skillScore * 0.2));
            } else {
              finalScore = Math.round((finalAIScore * 0.7) + (skillScore * 0.3));
            }
          } else if (embeddingScore !== null) {
            finalScore = Math.round((embeddingScore * 0.7) + (skillScore * 0.3));
          }

          // Ensure score is within valid [0, 100] range
          finalScore = Math.max(0, Math.min(100, finalScore));

          // Set professional recruiter-style reasoning
          let reasoning = aiMatch?.reasoning;
          if (!reasoning) {
            const expText = app.user?.yearsOfExperience !== null && app.user?.yearsOfExperience !== undefined 
              ? `${app.user.yearsOfExperience} years of experience` 
              : 'experience record';
            reasoning = `Aligned on ${commonSkills.length} of ${job.requiredSkills.length} required skills. Candidate brings ${expText}. pgvector semantic similarity: ${embeddingScore !== null ? `${embeddingScore}%` : 'N/A'}.`;
          }

          // Cache BOTH final hybrid score and AI Review statement back to the DB!
          try {
            await prisma.application.update({
              where: { id: app.id },
              data: { 
                matchingScore: finalScore,
                aiReasoning: reasoning,
              },
            });
          } catch (err) {
            console.warn(`[applicants-score] Failed to cache score for application ${app.id}:`, err);
          }

          return {
            ...app,
            matchingScore: finalScore,
            aiReasoning: reasoning,
            embeddingScore,
            skillScore,
          };
        })
      );

      // Sort applicants by matching percentage descending
      enrichedApplications.sort((a, b) => b.matchingScore - a.matchingScore);

      return successResponse(enrichedApplications);
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
