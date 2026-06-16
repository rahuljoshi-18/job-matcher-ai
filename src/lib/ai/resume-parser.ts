import { getGroqClient, GROQ_MODEL } from '@/lib/ai/providers/groq';

export interface ParsedResume {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
  };
  experiences: {
    company: string;
    role: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }[];
  education: {
    institution: string;
    degree?: string;
    field?: string;
    graduationYear?: number;
  }[];
  skills: string[];
  certifications: {
    name: string;
    issuer?: string;
    year?: number;
  }[];
  yearsOfExperience?: number;
}

const PARSE_PROMPT = `You are a resume parser. Extract structured information from the resume text below.
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "personalInfo": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "linkedIn": "string or null"
  },
  "experiences": [
    {
      "company": "string",
      "role": "string",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or null (use null if current)",
      "description": "string summarising responsibilities"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string or null",
      "field": "string or null",
      "graduationYear": number or null
    }
  ],
  "skills": ["array", "of", "skill", "strings"],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "year": number or null
    }
  ],
  "yearsOfExperience": number or null
}

Resume text:
`;

/**
 * Sends extracted resume text to Groq (llama-3.1-8b-instant) and returns
 * a structured ParsedResume object.
 *
 * Throws if the Groq response is not valid JSON or is missing required fields.
 */
export async function parseResumeWithGroq(rawText: string): Promise<ParsedResume> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: PARSE_PROMPT + rawText.slice(0, 12000), // cap to avoid context window limit
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned an empty response when parsing resume');
  }

  // Strip any accidental markdown fences
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsed: ParsedResume;
  try {
    parsed = JSON.parse(cleaned) as ParsedResume;
  } catch {
    throw new Error(`Groq returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  // Ensure required arrays exist
  parsed.skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  parsed.experiences = Array.isArray(parsed.experiences) ? parsed.experiences : [];
  parsed.education = Array.isArray(parsed.education) ? parsed.education : [];
  parsed.certifications = Array.isArray(parsed.certifications) ? parsed.certifications : [];
  parsed.personalInfo = parsed.personalInfo ?? {};

  return parsed;
}
