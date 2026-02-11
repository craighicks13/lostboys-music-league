import { router } from './trpc';
import { leagueRouter } from './routers/league';
import { inviteRouter } from './routers/invite';
import { seasonRouter } from './routers/season';
import { roundRouter } from './routers/round';
import { aiRouter } from './routers/ai';
import { analyticsRouter } from './routers/analytics';
import { musicRouter } from './routers/music';
import { playlistRouter } from './routers/playlist';
import { submissionRouter } from './routers/submission';
import { votingRouter } from './routers/voting';
import { statisticsRouter } from './routers/statistics';
import { chatRouter } from './routers/chat';
import { reactionRouter } from './routers/reaction';
import { commentRouter } from './routers/comment';

export const appRouter = router({
	league: leagueRouter,
	invite: inviteRouter,
	season: seasonRouter,
	round: roundRouter,
	ai: aiRouter,
	analytics: analyticsRouter,
	music: musicRouter,
	playlist: playlistRouter,
	submission: submissionRouter,
	voting: votingRouter,
	statistics: statisticsRouter,
	chat: chatRouter,
	reaction: reactionRouter,
	comment: commentRouter,
});

export type AppRouter = typeof appRouter;
