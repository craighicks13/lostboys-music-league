import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { db } from '@/server/db';
import { auth } from '@/auth';
import { headers } from 'next/headers';

export const createTRPCContext = async () => {
	const result = await auth.api.getSession({ headers: await headers() });
	const session = result ? { user: result.user } : null;
	return { db, session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session?.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}
	return next({
		ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } },
	});
});
