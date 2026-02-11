import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { fetchTrackMetadata, fetchTrackFromUrl } from "@/lib/services/music";

export const musicRouter = router({
	lookupByUrl: protectedProcedure
		.input(z.object({ url: z.string().min(1) }))
		.query(async ({ input }) => {
			return fetchTrackFromUrl(input.url);
		}),

	lookupById: protectedProcedure
		.input(
			z.object({
				provider: z.enum(["spotify", "apple"]),
				trackId: z.string().min(1),
				storefront: z.string().optional(),
			})
		)
		.query(async ({ input }) => {
			return fetchTrackMetadata(input.provider, input.trackId, {
				storefront: input.storefront,
			});
		}),
});
