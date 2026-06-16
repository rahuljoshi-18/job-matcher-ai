import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError, NotFoundError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';

/**
 * GET /api/jobs/[id]/pre-match
 *
 * Dynamically computes a candidate's hybrid matching score and personalized landing probability
 * for a single job before they apply.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) {
        return Response.json({ error: 'Candidates only' }, { status: 403 });
      }

      const { id: jobId } = await params;

      // 1. Fetch the Job details
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
        },
      });

      if (!job) {
        throw new NotFoundError('Job');
      }

      if (!user.skills?.length) {
        throw new ValidationError('Please add skills to your profile to see your match rating.');
      }

      // 2. Fetch skill score fraction
      const { score: skillScoreFraction, commonSkills } = calculateMatchingScore({
        candidateSkills: user.skills,
        requiredSkills: job.requiredSkills,
      });
      const skillScore = Math.round(skillScoreFraction * 100);

      // 3. Query pgvector cosine similarity
      let embeddingScore: number | null = null;
      try {
        const rows = await prisma.$queryRaw<{ similarity: number }[]>`
          SELECT 1 - (je.embedding <=> ce.embedding) AS similarity
          FROM job_embeddings je
          CROSS JOIN candidate_embeddings ce
          WHERE je."jobId" = ${jobId} AND ce."candidateId" = ${user.id}
        `;
        if (rows && rows.length > 0) {
          embeddingScore = Math.max(0, Math.min(100, Math.round(Number(rows[0].similarity) * 100)));
        }
      } catch (err) {
        console.warn('[pre-match] pgvector query failed:', err);
      }

      // 4. Check if an application already exists to bypass Groq call
      const existingApp = await prisma.application.findFirst({
        where: { jobId, userId: user.id },
        select: { matchingScore: true, aiReasoning: true },
      });

      if (existingApp && existingApp.matchingScore !== null) {
        return Response.json({
          score: existingApp.matchingScore,
          reasoning: existingApp.aiReasoning,
          embeddingScore,
          skillScore,
          commonSkills,
          applied: true,
        });
      }

      // 5. If not applied yet, skip the Groq call to save resources. Compute match probability purely from pgvector & skill overlap!
      let finalScore = skillScore;
      if (embeddingScore !== null) {
        finalScore = Math.round((embeddingScore * 0.7) + (skillScore * 0.3));
      }
      finalScore = Math.max(0, Math.min(100, finalScore));

      const reasoning = `Click "Apply Now" to submit your profile. Once applied, our AI Recruiter will run a comprehensive, deep LLM audit of your complete work history and skills to write your personalized evaluation statement!`;

      return Response.json({
        score: finalScore,
        reasoning,
        embeddingScore,
        skillScore,
        commonSkills,
        applied: false,
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
