import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { generateAndStoreCandidateEmbedding } from '@/lib/ai/embeddings';

export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const skills = await prisma.candidateSkill.findMany({
        where: { candidateId: user.id },
        orderBy: { name: 'asc' },
      });
      return Response.json({ skills });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const body = await request.json();
      const { name, level } = body;
      if (!name || typeof name !== 'string') {
        throw new ValidationError('skill name is required');
      }
      const skill = await prisma.candidateSkill.upsert({
        where: { candidateId_name: { candidateId: user.id, name: name.trim() } },
        create: { candidateId: user.id, name: name.trim(), level: level ?? null },
        update: { level: level ?? null },
      });
      // Sync legacy skills array
      const allSkills = await prisma.candidateSkill.findMany({
        where: { candidateId: user.id },
        select: { name: true },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { skills: allSkills.map((s) => s.name) },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      generateAndStoreCandidateEmbedding(user.id).catch(() => {});
      return Response.json({ skill }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      await prisma.candidateSkill.delete({ where: { id, candidateId: user.id } });
      // Sync legacy array
      const remaining = await prisma.candidateSkill.findMany({
        where: { candidateId: user.id },
        select: { name: true },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { skills: remaining.map((s) => s.name) },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      generateAndStoreCandidateEmbedding(user.id).catch(() => {});
      return Response.json({ success: true });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
