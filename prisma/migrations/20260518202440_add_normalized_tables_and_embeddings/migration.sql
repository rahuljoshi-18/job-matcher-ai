-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- DropForeignKey (re-add with CASCADE below)
ALTER TABLE "applications" DROP CONSTRAINT "applications_jobId_fkey";
ALTER TABLE "applications" DROP CONSTRAINT "applications_userId_fkey";

-- AlterTable: domains — add updatedAt with a safe default for existing rows
ALTER TABLE "domains" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: invitations — add updatedAt + status with safe defaults
ALTER TABLE "invitations"
  ADD COLUMN "status"    TEXT         NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: jobs — add status
ALTER TABLE "jobs" ADD COLUMN "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable: users — add new profile fields
ALTER TABLE "users"
  ADD COLUMN "embeddingStatus"   TEXT,
  ADD COLUMN "resumeRawText"     TEXT,
  ADD COLUMN "resumeUrl"         TEXT,
  ADD COLUMN "yearsOfExperience" INTEGER;

-- CreateTable: candidate_experiences
CREATE TABLE "candidate_experiences" (
    "id"          TEXT         NOT NULL,
    "candidateId" TEXT         NOT NULL,
    "company"     TEXT         NOT NULL,
    "role"        TEXT         NOT NULL,
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: candidate_education
CREATE TABLE "candidate_education" (
    "id"             TEXT         NOT NULL,
    "candidateId"    TEXT         NOT NULL,
    "institution"    TEXT         NOT NULL,
    "degree"         TEXT,
    "field"          TEXT,
    "graduationYear" INTEGER,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable: candidate_certifications
CREATE TABLE "candidate_certifications" (
    "id"          TEXT         NOT NULL,
    "candidateId" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "issuer"      TEXT,
    "year"        INTEGER,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: candidate_skills (relation table, replaces skills[] array)
CREATE TABLE "candidate_skills" (
    "id"          TEXT         NOT NULL,
    "candidateId" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "level"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable: candidate_embeddings with native vector(768) column
-- (declared as vector(768) directly — Prisma maps this via Unsupported)
CREATE TABLE "candidate_embeddings" (
    "id"             TEXT         NOT NULL,
    "candidateId"    TEXT         NOT NULL,
    "embedding"      vector(768) NOT NULL,
    "embeddingModel" TEXT         NOT NULL DEFAULT 'text-embedding-004',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: job_embeddings with native vector(768) column
CREATE TABLE "job_embeddings" (
    "id"             TEXT         NOT NULL,
    "jobId"          TEXT         NOT NULL,
    "embedding"      vector(768) NOT NULL,
    "embeddingModel" TEXT         NOT NULL DEFAULT 'text-embedding-004',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_embeddings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "candidate_experiences_candidateId_idx"    ON "candidate_experiences"("candidateId");
CREATE INDEX "candidate_education_candidateId_idx"      ON "candidate_education"("candidateId");
CREATE INDEX "candidate_certifications_candidateId_idx" ON "candidate_certifications"("candidateId");
CREATE INDEX "candidate_skills_candidateId_idx"         ON "candidate_skills"("candidateId");
CREATE UNIQUE INDEX "candidate_skills_candidateId_name_key" ON "candidate_skills"("candidateId", "name");
CREATE UNIQUE INDEX "candidate_embeddings_candidateId_key"  ON "candidate_embeddings"("candidateId");
CREATE UNIQUE INDEX "job_embeddings_jobId_key"              ON "job_embeddings"("jobId");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- Re-add FKs on applications with CASCADE
ALTER TABLE "applications"
  ADD CONSTRAINT "applications_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "applications"
  ADD CONSTRAINT "applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FKs for new tables (all cascade on user/job delete)
ALTER TABLE "candidate_experiences"
  ADD CONSTRAINT "candidate_experiences_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_education"
  ADD CONSTRAINT "candidate_education_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_certifications"
  ADD CONSTRAINT "candidate_certifications_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_skills"
  ADD CONSTRAINT "candidate_skills_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_embeddings"
  ADD CONSTRAINT "candidate_embeddings_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_embeddings"
  ADD CONSTRAINT "job_embeddings_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
