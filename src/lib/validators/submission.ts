import { z } from "zod";

export const createSubmissionSchema = z.object({
  roundId: z.string().uuid(),
  provider: z.enum(["spotify", "apple"]),
  providerTrackId: z.string().min(1).max(100),
  trackName: z.string().min(1).max(300),
  artist: z.string().min(1).max(300),
  album: z.string().max(300).optional(),
  artworkUrl: z.string().url().nullable().optional(),
  duration: z.number().int().positive().optional(),
  previewUrl: z.string().url().nullable().optional(),
  note: z.string().max(500).optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const updateSubmissionSchema = z.object({
  id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
