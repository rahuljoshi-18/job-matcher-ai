import { prisma } from '@/lib/prisma';
import { generateEmbedding, toVectorString } from '@/lib/ai/embeddings';

export interface HybridMatchResult {
  userId: string;
  email: string;
  semanticScore: number;
  skillScore: number;
  experienceScore: number;
  hybridScore: number;
  commonSkills: string[];
}

export interface MatchInput {
  jobId: string;
  requiredSkills: string[];
  requiredExperienceYears?: number;
  jobTitle: string;
  jobDescription: string;
}

/**
 * Calculates Jaccard similarity between two skill sets.
 * Returns a value between 0 and 1.
 */
function calcSkillOverlap(candidateSkills: string[], requiredSkills: string[]): {
  score: number;
  commonSkills: string[];
} {
  if (!requiredSkills.length) return { score: 0, commonSkills: [] };

  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));
  const requiredSet = new Set(requiredSkills.map((s) => s.toLowerCase().trim()));

  const commonSkills: string[] = [];
  for (const skill of requiredSet) {
    if (candidateSet.has(skill)) commonSkills.push(skill);
  }

  const score = requiredSet.size > 0 ? commonSkills.length / requiredSet.size : 0;

  return { score, commonSkills };
}

/**
 * Calculates a normalised experience score.
 * Returns 1.0 if candidate meets or exceeds the requirement.
 */
function calcExperienceScore(
  candidateYears: number | null | undefined,
  requiredYears: number | undefined
): number {
  if (!requiredYears || requiredYears <= 0) return 1.0;
  if (!candidateYears || candidateYears < 0) return 0;
  return Math.min(candidateYears / requiredYears, 1.0);
}

/**
 * Queries pgvector for the top N candidates semantically closest to a job.
 * Returns raw rows with userId, email, similarity score, and skill data.
 */
async function querySemanticCandidates(
  jobVectorString: string,
  limit = 20
): Promise<{ candidateId: string; email: string; similarity: number; skills: string[] }[]> {
  type RawRow = {
    candidateId: string;
    email: string;
    similarity: number;
    skills: string[];
  };

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      ce."candidateId",
      u.email,
      u.skills,
      1 - (ce.embedding <=> ${jobVectorString}::vector) AS similarity
    FROM candidate_embeddings ce
    JOIN users u ON u.id = ce."candidateId"
    ORDER BY ce.embedding <=> ${jobVectorString}::vector ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    candidateId: r.candidateId,
    email: r.email,
    similarity: Number(r.similarity),
    skills: r.skills ?? [],
  }));
}

/**
 * Full hybrid ranking for a job posting.
 *
 * Formula: 0.70 × semanticSimilarity + 0.20 × skillOverlap + 0.10 × experienceScore
 *
 * Falls back to deterministic-only if embeddings are unavailable.
 */
export async function rankCandidatesForJob(input: MatchInput): Promise<HybridMatchResult[]> {
  const { requiredSkills, requiredExperienceYears, jobTitle, jobDescription } = input;

  let semanticRows: Awaited<ReturnType<typeof querySemanticCandidates>> = [];
  let embeddingsAvailable = false;

  try {
    const jobText = `Job Title: ${jobTitle}\nRequired Skills: ${requiredSkills.join(', ')}\nDescription: ${jobDescription}`;
    const jobEmbedding = await generateEmbedding(jobText);
    const jobVectorString = toVectorString(jobEmbedding);
    semanticRows = await querySemanticCandidates(jobVectorString);
    embeddingsAvailable = true;
  } catch (err) {
    console.warn('[matching] Semantic ranking unavailable, falling back to deterministic:', err);
  }

  // Fetch experience data for top candidates
  const candidateIds = embeddingsAvailable
    ? semanticRows.map((r) => r.candidateId)
    : // Fallback: fetch all candidates in same domain (crude but safe)
      (
        await prisma.user.findMany({
          where: { role: 'CANDIDATE' },
          select: { id: true },
          take: 50,
        })
      ).map((u) => u.id);

  const experienceData = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, email: true, skills: true, yearsOfExperience: true },
  });

  const expMap = new Map(experienceData.map((u) => [u.id, u]));

  if (embeddingsAvailable) {
    return semanticRows.map((row) => {
      const userData = expMap.get(row.candidateId);
      const { score: skillScore, commonSkills } = calcSkillOverlap(
        userData?.skills ?? row.skills,
        requiredSkills
      );
      const experienceScore = calcExperienceScore(
        userData?.yearsOfExperience,
        requiredExperienceYears
      );

      const hybridScore =
        0.7 * row.similarity + 0.2 * skillScore + 0.1 * experienceScore;

      return {
        userId: row.candidateId,
        email: row.email,
        semanticScore: row.similarity,
        skillScore,
        experienceScore,
        hybridScore,
        commonSkills,
      };
    });
  }

  // ── Deterministic fallback (no embeddings) ────────────────────────────────
  return experienceData
    .map((user) => {
      const { score: skillScore, commonSkills } = calcSkillOverlap(user.skills, requiredSkills);
      const experienceScore = calcExperienceScore(user.yearsOfExperience, requiredExperienceYears);
      const hybridScore = 0.8 * skillScore + 0.2 * experienceScore;

      return {
        userId: user.id,
        email: user.email,
        semanticScore: 0,
        skillScore,
        experienceScore,
        hybridScore,
        commonSkills,
      };
    })
    .sort((a, b) => b.hybridScore - a.hybridScore);
}
