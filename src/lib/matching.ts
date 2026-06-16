/**
 * Legacy deterministic matching — kept for backwards compatibility and as the
 * synchronous fallback used during application creation (before embeddings exist).
 *
 * For full hybrid semantic+skill+experience matching, use:
 *   import { rankCandidatesForJob } from '@/lib/ai/matching'
 */

interface MatchInput {
  candidateSkills: string[];
  requiredSkills: string[];
}

interface MatchResult {
  score: number;
  commonSkills: string[];
}

/**
 * Calculates a deterministic skill-overlap score using Jaccard similarity.
 * Returns a score between 0 and 1 and the list of common skills.
 */
export function calculateMatchingScore({ candidateSkills, requiredSkills }: MatchInput): MatchResult {
  if (!requiredSkills.length || !candidateSkills.length) {
    return { score: 0, commonSkills: [] };
  }

  const candidateSet = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));
  const requiredSet = new Set(requiredSkills.map((s) => s.toLowerCase().trim()));

  const commonSkills: string[] = [];
  for (const skill of requiredSet) {
    if (candidateSet.has(skill)) commonSkills.push(skill);
  }

  const score = requiredSet.size > 0 ? commonSkills.length / requiredSet.size : 0;

  return { score, commonSkills };
}
