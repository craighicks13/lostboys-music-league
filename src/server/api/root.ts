import { router } from './trpc';
import { spotifyRouter } from './routers/spotify';

export const appRouter = router({
	spotify: spotifyRouter,
});

export type AppRouter = typeof appRouter;
