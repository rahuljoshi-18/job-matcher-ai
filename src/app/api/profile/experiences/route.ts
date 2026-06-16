import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';
import { generateAndStoreCandidateEmbedding } from '@/lib/ai/embeddings';

/** GET /api/profile/experiences — list candidate's experiences */
export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const experiences = await prisma.candidateExperience.findMany({
        where: { candidateId: user.id },
        orderBy: { startDate: 'desc' },
      });
      return Response.json({ experiences });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/profile/experiences — add a new experience */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const body = await request.json();
      const experience = await prisma.candidateExperience.create({
        data: {
          candidateId: user.id,
          company: body.company,
          role: body.role,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          description: body.description ?? null,
        },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      // Re-generate embedding in background
      generateAndStoreCandidateEmbedding(user.id).catch(() => {});
      return Response.json({ experience }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/profile/experiences — update an experience by id (passed in body) */
export async function PATCH(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const body = await request.json();
      const { id, ...data } = body;
      const experience = await prisma.candidateExperience.update({
        where: { id, candidateId: user.id },
        data: {
          company: data.company,
          role: data.role,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          description: data.description ?? null,
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
      return Response.json({ experience });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/profile/experiences — delete an experience by id (query param) */
export async function DELETE(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return Response.json({ error: 'id query param required' }, { status: 400 });
      await prisma.candidateExperience.delete({ where: { id, candidateId: user.id } });
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
