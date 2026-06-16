import Groq from 'groq-sdk';
import { requireEnv } from '@/lib/env';

let _client: Groq | null = null;

/**
 * Returns a lazily-initialised Groq client.
 * Throws a clear error if GROQ_API_KEY is missing.
 */
export function getGroqClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: requireEnv('GROQ_API_KEY') });
  }
  return _client;
}

export const GROQ_MODEL = 'llama-3.1-8b-instant';
