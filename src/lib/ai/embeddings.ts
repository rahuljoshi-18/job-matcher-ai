import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { generateEmbeddingWithGemini } from '@/lib/ai/providers/gemini';

/**
 * Generates a 768-dim embedding using Gemini text-embedding-004.
 * This is the single entry point for all embedding generation in the app.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateEmbeddingWithGemini(text);
}

/**
 * Formats a number[] as a PostgreSQL vector literal string.
 * Used for $queryRaw — no external pgvector npm package needed.
 * Example: [0.1, 0.2, 0.3] → "[0.1,0.2,0.3]"
 */
export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Builds a text blob from a candidate's structured profile for embedding.
 */
export function buildCandidateText(profile: {
  skills: string[];
  experiences?: { company: string; role: string; description?: string | null }[];
  education?: { institution: string; degree?: string | null; field?: string | null }[];
}): string {
  const parts: string[] = [];

  if (profile.skills.length) {
    parts.push(`Skills: ${profile.skills.join(', ')}`);
  }

  if (profile.experiences?.length) {
    const expText = profile.experiences
      .map((e) => `${e.role} at ${e.company}${e.description ? ': ' + e.description : ''}`)
      .join('. ');
    parts.push(`Experience: ${expText}`);
  }

  if (profile.education?.length) {
    const eduText = profile.education
      .map((e) => [e.degree, e.field, 'at', e.institution].filter(Boolean).join(' '))
      .join('. ');
    parts.push(`Education: ${eduText}`);
  }

  return parts.join('\n');
}

/**
 * Builds a text blob from a job posting for embedding.
 */
export function buildJobText(job: {
  title: string;
  description: string;
  requiredSkills: string[];
}): string {
  return [
    `Job Title: ${job.title}`,
    `Required Skills: ${job.requiredSkills.join(', ')}`,
    `Description: ${job.description}`,
  ].join('\n');
}

/**
 * Generates and upserts an embedding for a candidate.
 * Sets embeddingStatus to "pending" before, "ready" on success, "failed" on error.
 * Never throws — errors are logged so the main request flow is unaffected.
 */
export async function generateAndStoreCandidateEmbedding(candidateId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: candidateId },
      data: { embeddingStatus: 'pending' },
    });

    // Fetch profile data for embedding
    const user = await prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        skills: true,
        experiences: { select: { company: true, role: true, description: true } },
        education: { select: { institution: true, degree: true, field: true } },
        profileHash: true,
      },
    });

    if (!user) return;

    const text = buildCandidateText({
      skills: user.skills,
      experiences: user.experiences,
      education: user.education,
    });

    if (!text.trim()) {
      await prisma.user.update({
        where: { id: candidateId },
        data: { embeddingStatus: 'failed' },
      });
      return;
    }

    const newHash = crypto.createHash('sha256').update(text).digest('hex');

    if (user.profileHash === newHash) {
      console.log(`[embeddings] Profile unchanged for ${candidateId}, skipping embedding`);
      await prisma.user.update({
        where: { id: candidateId },
        data: { embeddingStatus: 'ready' },
      });
      return;
    }

    const embedding = await generateEmbedding(text);
    const vectorString = toVectorString(embedding);

    // Upsert using raw SQL (Prisma doesn't support vector type natively)
    await prisma.$executeRaw`
      INSERT INTO candidate_embeddings ("id", "candidateId", "embedding", "embeddingModel", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${candidateId}, ${vectorString}::vector, 'gemini-embedding-2', NOW(), NOW())
      ON CONFLICT ("candidateId")
      DO UPDATE SET embedding = ${vectorString}::vector, "updatedAt" = NOW()
    `;

    await prisma.user.update({
      where: { id: candidateId },
      data: { embeddingStatus: 'ready', profileHash: newHash },
    });
  } catch (error) {
    console.error(`[embeddings] Failed to generate candidate embedding for ${candidateId}:`, error);
    await prisma.user
      .update({ where: { id: candidateId }, data: { embeddingStatus: 'failed' } })
      .catch(() => { });
  }
}

/**
 * Generates and upserts an embedding for a job posting.
 * Never throws — errors are logged.
 */
export async function generateAndStoreJobEmbedding(jobId: string): Promise<void> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { title: true, description: true, requiredSkills: true },
    });

    if (!job) return;

    const text = buildJobText(job);
    const embedding = await generateEmbedding(text);
    const vectorString = toVectorString(embedding);

    await prisma.$executeRaw`
      INSERT INTO job_embeddings ("id", "jobId", "embedding", "embeddingModel", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${jobId}, ${vectorString}::vector, 'gemini-embedding-2', NOW(), NOW())
      ON CONFLICT ("jobId")
      DO UPDATE SET embedding = ${vectorString}::vector, "updatedAt" = NOW()
    `;
  } catch (error) {
    console.error(`[embeddings] Failed to generate job embedding for ${jobId}:`, error);
  }
}
