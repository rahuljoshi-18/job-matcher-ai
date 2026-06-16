import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { generateAndStoreCandidateEmbedding } from '@/lib/ai/embeddings';

export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const education = await prisma.candidateEducation.findMany({
        where: { candidateId: user.id },
        orderBy: { graduationYear: 'desc' },
      });
      return Response.json({ education });
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
      const education = await prisma.candidateEducation.create({
        data: {
          candidateId: user.id,
          institution: body.institution,
          degree: body.degree ?? null,
          field: body.field ?? null,
          graduationYear: body.graduationYear ?? null,
        },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      generateAndStoreCandidateEmbedding(user.id).catch(() => {});
      return Response.json({ education }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const body = await request.json();
      const { id, ...data } = body;
      const education = await prisma.candidateEducation.update({
        where: { id, candidateId: user.id },
        data: {
          institution: data.institution,
          degree: data.degree ?? null,
          field: data.field ?? null,
          graduationYear: data.graduationYear ?? null,
        },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      generateAndStoreCandidateEmbedding(user.id).catch(() => {});
      return Response.json({ education });
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
      if (!id) return Response.json({ error: 'id query param required' }, { status: 400 });
      await prisma.candidateEducation.delete({ where: { id, candidateId: user.id } });
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
