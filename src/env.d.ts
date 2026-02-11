declare namespace NodeJS {
	interface ProcessEnv {
		// Existing Spotify API credentials
		NEXT_PUBLIC_SPOTIFY_CLIENT_ID: string;
		SPOTIFY_CLIENT_SECRET: string;

		// Database (Neon)
		DATABASE_URL: string;
		DIRECT_URL: string;

		// Better Auth
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;

		// Google OAuth
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;

		// Spotify OAuth
		AUTH_SPOTIFY_ID: string;
		AUTH_SPOTIFY_SECRET: string;

		// Apple OAuth
		APPLE_CLIENT_ID: string;
		APPLE_CLIENT_SECRET: string;
		APPLE_TEAM_ID: string;
		APPLE_KEY_ID: string;
		APPLE_MUSIC_PRIVATE_KEY: string;

		// Email (Resend)
		RESEND_API_KEY: string;
		EMAIL_FROM: string;

		// AI (Vercel AI SDK)
		OPENAI_API_KEY: string;

		// Storage (Vercel Blob)
		BLOB_READ_WRITE_TOKEN: string;
	}
}
