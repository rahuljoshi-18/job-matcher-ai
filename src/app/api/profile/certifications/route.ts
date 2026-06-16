import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      if (user.role !== Role.CANDIDATE) throw new AuthorizationError('Candidates only');
      const certifications = await prisma.candidateCertification.findMany({
        where: { candidateId: user.id },
        orderBy: { year: 'desc' },
      });
      return Response.json({ certifications });
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
      const certification = await prisma.candidateCertification.create({
        data: {
          candidateId: user.id,
          name: body.name,
          issuer: body.issuer ?? null,
          year: body.year ?? null,
        },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      return Response.json({ certification }, { status: 201 });
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
      const certification = await prisma.candidateCertification.update({
        where: { id, candidateId: user.id },
        data: {
          name: data.name,
          issuer: data.issuer ?? null,
          year: data.year ?? null,
        },
      });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      return Response.json({ certification });
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
      await prisma.candidateCertification.delete({ where: { id, candidateId: user.id } });
      await prisma.application.updateMany({
        where: { 
          userId: user.id,
          status: { not: 'ACCEPTED' }
        },
        data: { matchingScore: null, aiReasoning: null },
      });
      return Response.json({ success: true });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
