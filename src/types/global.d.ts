// src/types/global.d.ts
import type { PrismaClient } from '@/generated/prisma/client';

declare global {
  var prisma: PrismaClient | undefined;

  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
  }
}
