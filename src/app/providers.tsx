'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

function AuthStateSync({ children }: ProvidersProps) {
  const { isLoaded, userId, sessionId } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const previousAuthKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const currentAuthKey = userId && sessionId ? `${userId}:${sessionId}` : 'signed-out';

    if (previousAuthKeyRef.current === null) {
      previousAuthKeyRef.current = currentAuthKey;
      return;
    }

    if (previousAuthKeyRef.current !== currentAuthKey) {
      previousAuthKeyRef.current = currentAuthKey;
      queryClient.clear();
      router.refresh();
    }
  }, [isLoaded, queryClient, router, sessionId, userId]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  const { resolvedTheme } = useTheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthStateSync>{children}</AuthStateSync>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </ClerkProvider>
  );
}
