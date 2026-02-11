'use client';

import {
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../server/api/root';
import { ThemeProvider } from '../components/ThemeProvider';
import { Toaster } from '../components/ui/sonner';

// Create tRPC client
export const trpc = createTRPCReact<AppRouter>({});

export function Providers({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: '/api/trpc',
					transformer: superjson,
				}),
			],
		})
	);

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
		>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					{children}
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</trpc.Provider>
			<Toaster richColors position="bottom-right" />
		</ThemeProvider>
	);
}
