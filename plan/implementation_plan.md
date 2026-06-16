# Job Matcher AI — Comprehensive Audit & Remediation Plan

## 1. Architecture Overview

**Stack:** Next.js App Router, TypeScript, Prisma ORM, PostgreSQL + pgvector, Clerk Auth, React Query, shadcn/ui, Groq (LLM), OpenAI (embeddings), Supabase Storage (resumes)

### Current State
- **Works:** Auth flow, CRUD for all entities, role-based dashboards, deterministic skill matching, domain isolation, Clerk webhook sync
- **Partially broken:** AI matching (Groq-only, crashes on error), inconsistent API response shapes
- **Missing:** pgvector/embeddings, hybrid ranking, resume upload/parsing, normalized candidate profile, job status, typed API client, response envelope

---

## 2. Full Issues List

### 🔴 Critical (6)

| # | File | Issue | Fix |
|---|------|-------|-----|
| C1 | `src/lib/env.ts` | `GROQ_API_KEY` required at module load — crashes if missing | Make optional, lazy-validate |
| C2 | `src/app/api/jobs/match/route.ts` | AI match crashes on Groq failure, no fallback | Add try/catch + deterministic fallback |
| C3 | `prisma/schema.prisma` | No CASCADE on Application→Job/User FK | Add `onDelete: Cascade` |
| C4 | `src/app/api/applications/route.ts:193` | Race condition: duplicate check + create not in transaction | Wrap in `$transaction` |
| C5 | `src/lib/axios.ts` | Throws on SSR when `window` undefined | Guard with `typeof window` check |
| C6 | `.env.example` | Missing `OPENAI_API_KEY`, `AI_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Add vars |

### 🟡 Major (18)

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | All API routes | Inconsistent response envelope | Standardize to `{ data, error, meta }` |
| M2 | `src/lib/matching.ts` | Only skill overlap, no hybrid formula | Implement `0.70×semantic + 0.20×skill + 0.10×experience` |
| M3 | Schema | No embedding tables, no pgvector | Add migration with `vector(1536)` columns |
| M4 | Schema | No `status` on Job (draft/active/closed) | Add `JobStatus` enum |
| M5 | Schema | No normalized candidate profile tables | Add experiences, education, certifications, skills tables |
| M6 | Schema | No `updatedAt` on Domain/Invitation | Add fields |
| M7 | `src/app/api/profile/route.ts` | Batch update not transactional | Use `$transaction` |
| M8 | `src/hooks/useApplications.ts` | Duplicate hook exports with mutations file | Remove duplicates |
| M9 | `src/hooks/useJobs.ts` | Duplicate hook exports with mutations file | Remove duplicates |
| M10 | `src/app/jobs/new/page.tsx` | No RHF/Zod, manual state | Use RHF + Zod |
| M11 | `src/app/jobs/ai-match/page.tsx` | Direct `useEffect` fetch, `any` types | Refactor to React Query |
| M12 | `src/app/jobs/upload/page.tsx` | Direct `apiClient.post` loop, no React Query | Refactor |
| M13 | `candidate-dashboard.tsx:269` | Dead link to `/jobs/search` | Fix or create route |
| M14 | `src/lib/middleware/rbac.ts:18` | Throws generic `Error` not `AuthorizationError` | Fix error type |
| M15 | `src/app/api/jobs/match/route.ts:7` | Groq client at module scope crashes on missing key | Lazy-init |
| M16 | No `lib/ai/` directory | No provider-agnostic AI layer | Create abstraction |
| M17 | No `lib/api/client.ts` | No typed API client | Create |
| M18 | No resume upload pipeline | No PDF parsing, no Supabase integration | Build full pipeline |

### 🟢 Minor (11)

| # | File | Issue | Fix |
|---|------|-------|-----|
| m1 | `profile/page.tsx:147` | Deprecated `onKeyPress` | Use `onKeyDown` |
| m2 | `candidate-dashboard.tsx:113` | Deprecated `onKeyPress` | Use `onKeyDown` |
| m3 | `layout.tsx` | No Google Font | Add Inter |
| m4 | `site-header.tsx:38` | Deprecated `afterSignOutUrl` | Use `afterSignOutRedirectUrl` |
| m5 | `dashboard/page.tsx:15` | Fallback to CANDIDATE before load | Show skeleton |
| m6 | Multiple hooks | Fragile error extraction | Use `extractErrorMessage` |
| m7 | `types/dashboard.ts:98` | `CreateApplicationInput` has unused `candidateSkills` | Remove |
| m8-11 | profile, invitations, domains, users pages | Missing SiteHeader layout | Add shared layout |

---

## 3. Database Redesign Plan

### 3.1 New Enums
```prisma
enum JobStatus {
  DRAFT
  ACTIVE
  CLOSED
}
```

### 3.2 Modified Models
```prisma
model User {
  // existing fields...
  yearsOfExperience Int?
  resumeUrl         String?          // Supabase Storage URL
  resumeRawText     String?          // Extracted PDF text
  embeddingStatus   String?          // "pending" | "ready" | "failed"
  // NEW relations
  experiences       CandidateExperience[]
  education         CandidateEducation[]
  certifications    CandidateCertification[]
  candidateSkills   CandidateSkill[]
  candidateEmbedding CandidateEmbedding?
}

model Job {
  // existing fields...
  status       JobStatus @default(ACTIVE)
  jobEmbedding JobEmbedding?
}

model Domain {
  // existing fields...
  updatedAt DateTime @updatedAt  // NEW
}

model Invitation {
  // existing fields...
  updatedAt DateTime @updatedAt  // NEW
  status    String   @default("PENDING")  // NEW
}

// Fix cascade rules
model Application {
  // ...
  job  Job  @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3.3 New Normalized Tables
```prisma
model CandidateExperience {
  id          String   @id @default(cuid())
  candidateId String
  company     String
  role        String
  startDate   DateTime?
  endDate     DateTime?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@index([candidateId])
  @@map("candidate_experiences")
}

model CandidateEducation {
  id             String  @id @default(cuid())
  candidateId    String
  institution    String
  degree         String?
  field          String?
  graduationYear Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@index([candidateId])
  @@map("candidate_education")
}

model CandidateCertification {
  id          String  @id @default(cuid())
  candidateId String
  name        String
  issuer      String?
  year        Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@index([candidateId])
  @@map("candidate_certifications")
}

model CandidateSkill {
  id          String  @id @default(cuid())
  candidateId String
  name        String
  level       String?  // "beginner" | "intermediate" | "advanced" | "expert"
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@unique([candidateId, name])
  @@index([candidateId])
  @@map("candidate_skills")
}

model CandidateEmbedding {
  id               String   @id @default(cuid())
  candidateId      String   @unique
  embedding        Bytes    // Cast to vector(1536) via raw SQL
  embeddingModel   String   @default("text-embedding-3-small")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@map("candidate_embeddings")
}

model JobEmbedding {
  id               String   @id @default(cuid())
  jobId            String   @unique
  embedding        Bytes
  embeddingModel   String   @default("text-embedding-3-small")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  job              Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  @@map("job_embeddings")
}
```

### 3.4 Migration Plan
1. Migration 1: Add `JobStatus` enum, `status` to jobs, user fields (`yearsOfExperience`, `resumeUrl`, `resumeRawText`, `embeddingStatus`), `updatedAt` to domains/invitations
2. Migration 2: Create 4 normalized candidate tables + 2 embedding tables
3. Raw SQL migration: `CREATE EXTENSION IF NOT EXISTS vector;` then `ALTER TABLE candidate_embeddings ALTER COLUMN embedding TYPE vector(1536)` (same for job_embeddings)
4. Fix cascade rules on Application model
5. Add indexes on all `candidateId` and `jobId` foreign keys

---

## 4. AI & Matching Layer Plan

### 4.1 Architecture — Two Providers, Two Concerns
| Provider | Purpose | Model |
|----------|---------|-------|
| **Groq** | Resume PDF parsing (text → structured JSON) | `llama-3.1-8b-instant` |
| **Groq** | AI match reasoning (existing) | `llama-3.1-8b-instant` |
| **OpenAI** | Embedding generation (candidate + job) | `text-embedding-3-small` |

### 4.2 File Structure
```
src/lib/ai/
├── embeddings.ts           # OpenAI embedding generation
├── matching.ts             # Hybrid ranking: semantic + skill + experience
├── resume-parser.ts        # Groq PDF text → structured JSON
└── providers/
    ├── openai.ts           # OpenAI client (embeddings only)
    └── groq.ts             # Groq client (parsing + reasoning)
```

### 4.3 Resume Parsing Pipeline (Groq)
```
Upload PDF → Extract text (pdf-parse) → Send to Groq with structured prompt →
Get JSON { personalInfo, experiences[], education[], skills[], certifications[] } →
Save each section to normalized tables → Trigger embedding generation
```

### 4.4 Embedding Pipeline (OpenAI)
```
Candidate: Combine skills + experience descriptions + education → 
  OpenAI text-embedding-3-small → vector(1536) → candidate_embeddings

Job: Combine title + description + required skills →
  OpenAI text-embedding-3-small → vector(1536) → job_embeddings
```

### 4.5 Matching Formula
```
hybridScore = 0.70 × semanticSimilarity + 0.20 × skillOverlap + 0.10 × experienceScore
```
- **semanticSimilarity**: pgvector cosine distance `1 - (embedding <=> $1::vector)`
- **skillOverlap**: Jaccard index of candidate skills vs required skills
- **experienceScore**: `min(candidateYears / requiredYears, 1.0)` normalized to 0-1
- **Fallback** (if embeddings unavailable): `0.80 × skillOverlap + 0.20 × experienceScore`

### 4.6 Vector Query (no pgvector npm package)
```typescript
const vectorString = `[${embedding.join(',')}]`;
const results = await prisma.$queryRaw`
  SELECT ce.*, u.email, u.id as "userId",
    1 - (ce.embedding <=> ${vectorString}::vector) as similarity
  FROM candidate_embeddings ce
  JOIN users u ON u.id = ce."candidateId"
  ORDER BY ce.embedding <=> ${vectorString}::vector ASC
  LIMIT 20
`;
```

---

## 5. Backend API Fix Plan

### 5.1 Response Envelope
```typescript
// Success: { data: T, error: null, meta?: { page, total } }
// Error:   { data: null, error: { message, code, fields? } }
```

### 5.2 New API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/resume/upload` | POST | Upload PDF to Supabase → extract text → parse with Groq → save to DB |
| `/api/resume/parse` | POST | Re-parse existing resume text |
| `/api/profile/experiences` | GET/POST/PATCH/DELETE | CRUD for candidate experiences |
| `/api/profile/education` | GET/POST/PATCH/DELETE | CRUD for candidate education |
| `/api/profile/certifications` | GET/POST/PATCH/DELETE | CRUD for candidate certifications |
| `/api/profile/skills` | GET/POST/DELETE | CRUD for candidate skills (relation table) |
| `/api/embeddings/generate` | POST | Trigger embedding generation for a candidate or job |

### 5.3 Existing Routes to Fix (all 18 route files)
- Wrap in standard envelope `{ data, error, meta }`
- Add Zod validation schemas for all request bodies
- Wrap mutations in `prisma.$transaction`
- Fix `rbac.ts` to throw `AuthorizationError`
- Add pagination to list endpoints

---

## 6. Frontend Fix Plan

### 6.1 Forms → RHF + Zod
| Form | File | Status |
|------|------|--------|
| New Job | `jobs/new/page.tsx` | Needs RHF + Zod |
| Domains | `domains/page.tsx` | Needs RHF + Zod |
| Invitations | `invitations/page.tsx` | Needs RHF + Zod |
| Profile Skills | `profile/page.tsx` | Has RHF ✓, fix `onKeyPress` |

### 6.2 Data Fetching → React Query
| Component | Fix |
|-----------|-----|
| `ai-match/page.tsx` | Convert `useEffect` fetch to React Query hook |
| `upload/page.tsx` | Convert to React Query mutation |
| All hooks | Consolidate duplicates, use typed client |

### 6.3 New UI Components
| Component | Purpose |
|-----------|---------|
| Resume upload widget | Drag-and-drop PDF upload with progress + status |
| Parsed profile viewer/editor | View/edit experiences, education, certifications, skills |
| Embedding status indicator | Shows "pending/ready/failed" badge |
| Job status filter | Draft/Active/Closed filter for recruiter |
| Candidate rank list | Per-job list of candidates with score breakdown |
| Shortlist/reject actions | Buttons on application cards |

### 6.4 Layout Fixes
- Create shared `(authenticated)/layout.tsx` with SiteHeader
- Fix dead `/jobs/search` link
- Show job titles in application lists (not just IDs)

---

## 7. Feature Gap Analysis

### Now Resolved by This Plan
| Gap | Resolution |
|-----|-----------|
| No resume upload | Supabase Storage + PDF parsing pipeline |
| No embeddings | OpenAI `text-embedding-3-small` + pgvector |
| No semantic matching | Hybrid formula with cosine similarity |
| No normalized profile | 4 new tables with full CRUD |
| No job status | `JobStatus` enum (DRAFT/ACTIVE/CLOSED) |
| Dead `/jobs/search` link | Create search page or fix link |
| No recruiter candidate ranking | Per-job candidate list with scores |

### Backend Features Still Unreachable from UI
| Feature | Route | Needs UI |
|---------|-------|----------|
| Delete application | `DELETE /api/applications/[id]` | Add button |
| Domain disable | `PATCH /api/domains/[id]/disable` | Add toggle |
| Update user role | `PATCH /api/users/[id]/role` | Add admin UI |
| Application score detail | `GET /api/applications/[id]/score` | Show breakdown |

---

## 8. Implementation Roadmap

### Phase 1: Critical Fixes (3-4 hours)
| Step | Task | Effort |
|------|------|--------|
| 1.1 | Fix `env.ts` — make `GROQ_API_KEY` optional, add `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 15 min |
| 1.2 | Fix `axios.ts` — SSR guard | 15 min |
| 1.3 | Fix `rbac.ts` — throw `AuthorizationError` | 5 min |
| 1.4 | Fix cascade rules + add missing fields in Prisma schema | 30 min |
| 1.5 | Create & run migrations (schema changes + normalized tables) | 20 min |
| 1.6 | Fix application creation race condition with `$transaction` | 20 min |
| 1.7 | Fix profile update transaction | 15 min |
| 1.8 | Fix deprecated props (`afterSignOutUrl`, `onKeyPress`) | 10 min |

### Phase 2: Database, AI Layer & Resume Pipeline (6-7 hours)
| Step | Task | Effort |
|------|------|--------|
| 2.1 | Create pgvector migration (enable extension + alter columns) | 30 min |
| 2.2 | Create `lib/ai/providers/openai.ts` (embedding client) | 20 min |
| 2.3 | Create `lib/ai/providers/groq.ts` (extract from match route) | 15 min |
| 2.4 | Create `lib/ai/embeddings.ts` (generate + store) | 30 min |
| 2.5 | Create `lib/ai/resume-parser.ts` (Groq structured prompt) | 45 min |
| 2.6 | Create `lib/ai/matching.ts` (hybrid formula + pgvector query) | 45 min |
| 2.7 | Create Supabase client (`lib/supabase.ts`) | 15 min |
| 2.8 | Create `api/resume/upload/route.ts` (upload → extract → parse → save → embed) | 60 min |
| 2.9 | Create CRUD routes for experiences, education, certifications, skills | 60 min |
| 2.10 | Add embedding trigger on job creation/update | 20 min |
| 2.11 | Fix `api/jobs/match/route.ts` with hybrid matching + fallback | 30 min |

### Phase 3: Backend API Standardization (3-4 hours)
| Step | Task | Effort |
|------|------|--------|
| 3.1 | Create `lib/validations/` with Zod schemas for all entities | 45 min |
| 3.2 | Create response envelope helpers (`lib/api/response.ts`) | 20 min |
| 3.3 | Create typed API client (`lib/api/client.ts`) | 30 min |
| 3.4 | Update all 18 existing API routes to use envelope + Zod | 90 min |

### Phase 4: Frontend Fixes (5-6 hours)
| Step | Task | Effort |
|------|------|--------|
| 4.1 | Create shared `(authenticated)/layout.tsx` with SiteHeader | 20 min |
| 4.2 | Consolidate duplicate hooks | 30 min |
| 4.3 | Refactor `jobs/new`, `domains`, `invitations` to RHF + Zod | 60 min |
| 4.4 | Convert `ai-match` and `upload` pages to React Query | 40 min |
| 4.5 | Build resume upload widget with drag-and-drop + progress | 45 min |
| 4.6 | Build parsed profile viewer/editor (experiences, education, certs, skills) | 60 min |
| 4.7 | Build embedding status indicator component | 15 min |
| 4.8 | Fix candidate dashboard (dead link, job titles, recommended jobs) | 30 min |
| 4.9 | Build recruiter per-job candidate rank list + shortlist/reject | 45 min |
| 4.10 | Add job status filters to recruiter view | 20 min |
| 4.11 | Update all hooks to use typed client + new envelope | 45 min |

### Phase 5: Polish (2-3 hours)
| Step | Task | Effort |
|------|------|--------|
| 5.1 | Add Google Font (Inter) | 10 min |
| 5.2 | Add loading skeletons to all pages | 30 min |
| 5.3 | Add error states with retry | 30 min |
| 5.4 | End-to-end testing | 45 min |

**Total Estimated Effort: ~22-27 hours**

---

## 9. Files Plan

### Files to CREATE (20+)
| File | Purpose |
|------|---------|
| `src/lib/ai/embeddings.ts` | OpenAI embedding generation + pgvector storage |
| `src/lib/ai/matching.ts` | Hybrid ranking with cosine similarity |
| `src/lib/ai/resume-parser.ts` | Groq-powered PDF text → structured JSON |
| `src/lib/ai/providers/openai.ts` | OpenAI client (embeddings) |
| `src/lib/ai/providers/groq.ts` | Groq client (parsing + reasoning) |
| `src/lib/supabase.ts` | Supabase client for storage |
| `src/lib/api/client.ts` | Typed API client |
| `src/lib/api/response.ts` | Response envelope helpers |
| `src/lib/validations/job.ts` | Job Zod schemas |
| `src/lib/validations/application.ts` | Application Zod schemas |
| `src/lib/validations/profile.ts` | Profile + resume Zod schemas |
| `src/lib/validations/domain.ts` | Domain Zod schemas |
| `src/lib/validations/invitation.ts` | Invitation Zod schemas |
| `src/lib/validations/user.ts` | User Zod schemas |
| `src/app/api/resume/upload/route.ts` | Resume upload + parse + embed pipeline |
| `src/app/api/resume/parse/route.ts` | Re-parse existing resume |
| `src/app/api/profile/experiences/route.ts` | CRUD for experiences |
| `src/app/api/profile/education/route.ts` | CRUD for education |
| `src/app/api/profile/certifications/route.ts` | CRUD for certifications |
| `src/app/api/profile/skills/route.ts` | CRUD for skills (relation table) |
| `src/app/api/embeddings/generate/route.ts` | Trigger embedding generation |
| `src/app/(authenticated)/layout.tsx` | Shared layout with SiteHeader |
| `src/components/resume-upload.tsx` | Drag-and-drop PDF upload widget |
| `src/components/profile-sections.tsx` | Editable experiences/education/certs/skills |
| `src/components/embedding-status.tsx` | Status badge component |
| `src/hooks/useResume.ts` | React Query hooks for resume operations |
| `src/hooks/useProfileSections.ts` | Hooks for experiences/education/certs/skills |
| `prisma/migrations/XXXX_add_fields/` | Schema field additions |
| `prisma/migrations/XXXX_add_candidate_tables/` | Normalized tables |
| `prisma/migrations/XXXX_enable_pgvector/` | pgvector extension + vector columns |

### Files to MODIFY (25+)
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add enums, models, cascade rules, new relations |
| `.env.example` | Add `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER` |
| `src/lib/env.ts` | Make GROQ optional, add new env vars |
| `src/lib/axios.ts` | Fix SSR crash |
| `src/lib/middleware/rbac.ts` | Throw `AuthorizationError` |
| `src/lib/matching.ts` | Delegate to `lib/ai/matching.ts` |
| `src/lib/errors.ts` | Add envelope format |
| All 18 API route files | Standardize envelope, Zod, transactions |
| `src/hooks/useJobs.ts` | Remove duplicate mutations |
| `src/hooks/useApplications.ts` | Remove duplicate mutations |
| All 6 mutation hook files | Use typed client, fix error extraction |
| `src/app/jobs/new/page.tsx` | RHF + Zod |
| `src/app/jobs/ai-match/page.tsx` | React Query |
| `src/app/jobs/upload/page.tsx` | React Query mutation |
| `src/app/domains/page.tsx` | RHF + Zod |
| `src/app/invitations/page.tsx` | RHF + Zod |
| `src/app/profile/page.tsx` | Fix `onKeyPress`, add resume upload + profile sections |
| `src/app/layout.tsx` | Add Google Font |
| `src/app/dashboard/page.tsx` | Fix default role logic |
| `src/components/site-header.tsx` | Fix deprecated prop |
| `src/components/dashboard/candidate-dashboard.tsx` | Fix dead link, add recommended jobs, resume widget |
| `src/components/dashboard/recruiter-dashboard.tsx` | Add candidate rank list, shortlist/reject, status filters |
| `src/types/dashboard.ts` | Fix types, add new interfaces |

### Files to DELETE
None.

---

## Resolved Decisions (No Open Questions)

| Decision | Answer |
|----------|--------|
| **File storage** | Supabase Storage, bucket `resumes`, private access |
| **pgvector** | Available in PostgreSQL, enable with `CREATE EXTENSION IF NOT EXISTS vector` |
| **Vector package** | No `pgvector` npm package — use `$queryRaw` with manual `[${embedding.join(',')}]::vector` |
| **Groq usage** | PDF parsing (text → JSON) + AI match reasoning |
| **OpenAI usage** | `text-embedding-3-small` for all embeddings (candidate + job) |
| **Package manager** | **yarn** — use `yarn add`, `yarn dev`, `yarn build` |
| **shadcn/ui** | `yarn shadcn add <component1> <component2> ...` |
| **New dependencies** | `yarn add openai @supabase/supabase-js pdf-parse` |
| **Unused dep** | Remove `effect` via `yarn remove effect` |
