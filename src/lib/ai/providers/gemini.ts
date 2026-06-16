import { GoogleGenAI } from '@google/genai';
import { requireEnv } from '@/lib/env';

let _client: GoogleGenAI | null = null;

/**
 * Returns a lazily-initialised Google GenAI client.
 * Throws a clear error if GEMINI_API_KEY is missing.
 */
function getClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  }
  return _client;
}

/**
 * Generates an embedding vector using Gemini text-embedding-004.
 * Returns a 768-dimensional float array.
 */
export async function generateEmbeddingWithGemini(text: string): Promise<number[]> {
  const client = getClient();
  const response = await client.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text.trim(),
    config: {
      outputDimensionality: 768,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
    throw new Error('Failed to generate embedding with Gemini');
  }

  return response.embeddings[0].values;
}
