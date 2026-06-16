import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError } from '@/lib/errors';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/providers/groq';
import { calculateMatchingScore } from '@/lib/matching';

/**
 * GET /api/jobs/match
 *
 * Returns top job matches for the authenticated candidate using:
 * 1. Hybrid semantic + skill + experience ranking (if embeddings available)
 * 2. Groq LLM reasoning for human-readable explanations
 * 3. Deterministic fallback if Groq/embeddings fail
 */
export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      if (!user.skills?.length) {
        throw new ValidationError('You need to add skills to your profile before matching.');
      }

      // Fetch active jobs only
      const jobs = await prisma.job.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
        },
        take: 50,
      });

      if (!jobs.length) {
        return Response.json({ matches: [] });
      }

      // ── Step 1: Query pgvector embedding similarities if candidate embedding exists ──
      const embeddingMatches: Record<string, number> = {};
      try {
        const rows = await prisma.$queryRaw<{ jobId: string; similarity: number }[]>`
          SELECT
            je."jobId",
            (1 - (je.embedding <=> ce.embedding)) * 100 AS similarity
          FROM job_embeddings je
          JOIN candidate_embeddings ce ON ce."candidateId" = ${user.id}
          WHERE je."jobId" IN (SELECT id FROM jobs WHERE status = 'ACTIVE')
        `;
        if (rows && rows.length > 0) {
          for (const row of rows) {
            embeddingMatches[row.jobId] = Math.max(0, Math.min(100, Math.round(Number(row.similarity))));
          }
        }
      } catch (err) {
        console.warn('[match-jobs] pgvector job query failed, fallback to skill matching:', err);
      }

      // ── Step 2: Deterministically score all jobs to pick top 5 candidates for AI Review ──
      const scoredJobs = jobs.map((job) => {
        const embeddingScore = embeddingMatches[job.id] !== undefined ? embeddingMatches[job.id] : null;
        
        const { score: skillScoreFraction, commonSkills } = calculateMatchingScore({
          candidateSkills: user.skills,
          requiredSkills: job.requiredSkills,
        });
        const skillScore = Math.round(skillScoreFraction * 100);

        // Deterministic baseline ranking
        const baselineScore = embeddingScore !== null
          ? Math.round((embeddingScore * 0.7) + (skillScore * 0.3))
          : skillScore;

        return {
          job,
          embeddingScore,
          skillScore,
          baselineScore,
          commonSkills,
        };
      });

      // Sort by baseline score and take top 5 for the premium AI Review call
      scoredJobs.sort((a, b) => b.baselineScore - a.baselineScore);
      const topScored = scoredJobs.slice(0, 5);

      // Fetch additional candidate background details for Groq prompt context
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          yearsOfExperience: true,
          experiences: {
            select: {
              role: true,
              company: true,
              description: true,
            },
          },
        },
      });

      // ── Step 3: Run personalized AI Review matching via Groq for top jobs ──
      const aiScores: Record<string, { score: number; reasoning: string }> = {};
      let aiAvailable = false;

      try {
        const groq = getGroqClient();
        const experiencesText = fullUser?.experiences?.map((e) => `${e.role} at ${e.company}${e.description ? `: ${e.description}` : ''}`).join('; ') || 'None';
        
        const prompt = `
You are an expert AI recruiter matching a candidate's full profile against open job postings.

Candidate Profile:
Skills: ${user.skills.join(', ')}
Years of Experience: ${fullUser?.yearsOfExperience || 0}
Work History: ${experiencesText}

Available Jobs:
${topScored.map(({ job }) => `ID: ${job.id}\nTitle: ${job.title}\nRequired Skills: ${job.requiredSkills.join(', ')}\nDescription: ${job.description}`).join('\n\n')}

For each job, evaluate how well the candidate aligns with the role.
Determine:
1. An AI match compatibility score (0 to 100) based on their skills, work background, and overall profile alignment.
2. A warm, professional, personalized reasoning (1-2 sentences, max 80 words) written directly for the candidate explaining why this job matches their profile and what key strengths they bring.

Return the results as ONLY a raw JSON array (no markdown code blocks, no comments):
[{"jobId":"...","score":85,"reasoning":"Your strong React background and 3 years experience make you a great fit for this frontend role."}]
`.trim();

        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are a strict JSON-only API. Only return raw JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 1200,
        });

        const content = completion.choices[0]?.message?.content ?? '[]';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned) as { jobId: string; score: number; reasoning: string }[];
        for (const item of parsed) {
          aiScores[item.jobId] = { score: item.score, reasoning: item.reasoning };
        }
        aiAvailable = true;
      } catch (err) {
        console.warn('[match] Groq AI reasoning failed, using fallback metrics:', err);
      }

      // ── Step 4: Map matches into hybrid scores ──
      const finalMatches = topScored.map(({ job, embeddingScore, skillScore, commonSkills }) => {
        const aiMatch = aiScores[job.id];
        const finalAIScore = aiMatch ? aiMatch.score : skillScore;

        // Hybrid score calculation aligned exactly with recruiter's schema
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

        finalScore = Math.max(0, Math.min(100, finalScore));

        let reasoning = aiMatch?.reasoning;
        if (!reasoning) {
          const expText = fullUser?.yearsOfExperience !== null && fullUser?.yearsOfExperience !== undefined
            ? `${fullUser.yearsOfExperience} years of experience`
            : 'experience record';
          reasoning = `Matched on ${commonSkills.length} of ${job.requiredSkills.length} required skills. Candidate brings ${expText}. pgvector semantic similarity: ${embeddingScore !== null ? `${embeddingScore}%` : 'N/A'}.`;
        }

        return {
          jobId: job.id,
          aiScore: finalScore, // Display final hybrid score to the user
          skillScore,
          embeddingScore,
          reasoning,
          commonSkills,
          job,
        };
      });

      // Sort final hybrid matches descending
      finalMatches.sort((a, b) => b.aiScore - a.aiScore);

      return Response.json({
        matches: finalMatches,
        source: aiAvailable ? 'hybrid-ai' : 'hybrid-fallback',
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
