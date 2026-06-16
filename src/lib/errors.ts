export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'AUTHENTICATION_ERROR', message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'AUTHORIZATION_ERROR', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

import { errorResponse } from '@/lib/api/response';

// Global error handler for Route Handlers
export function handleRouteError(error: unknown): Response {
  console.error('Route error:', error);
  
  if (error instanceof AppError) {
    return errorResponse(
      {
        code: error.code,
        message: error.message,
        fields: error.details as Record<string, string[]>, // mapping details to fields if applicable
      },
      error.statusCode
    );
  }
  
  // Prisma errors
  if (error instanceof Error && error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as Error & { code?: string; meta?: unknown };
    if (prismaError.code === 'P2002') {
      return errorResponse(
        {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists',
        },
        400
      );
    }
  }
  
  // Generic server error
  return errorResponse(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    500
  );
}
