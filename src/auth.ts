import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { magicLink } from "better-auth/plugins/magic-link";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),
  advanced: {
    database: {
      generateId: "uuid" as const,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "spotify", "apple"],
    },
  },
  user: {
    additionalFields: {
      avatarUrl: { type: "string", required: false },
      streamingPreference: {
        type: "string",
        required: false,
        defaultValue: "none",
      },
      spotifyAccessToken: { type: "string", required: false },
      spotifyRefreshToken: { type: "string", required: false },
      appleMusicToken: { type: "string", required: false },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "spotify",
          clientId: process.env.AUTH_SPOTIFY_ID!,
          clientSecret: process.env.AUTH_SPOTIFY_SECRET!,
          authorizationUrl: "https://accounts.spotify.com/authorize",
          tokenUrl: "https://accounts.spotify.com/api/token",
          userInfoUrl: "https://api.spotify.com/v1/me",
          scopes: [
            "user-read-email",
            "user-read-private",
            "playlist-modify-public",
            "playlist-modify-private",
          ],
          mapProfileToUser: (profile) => {
            return {
              name: profile.display_name || profile.id,
              email: profile.email,
              image: profile.images?.[0]?.url ?? null,
            };
          },
        },
      ],
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await getResend().emails.send({
          from:
            process.env.EMAIL_FROM ||
            "Music League <noreply@musicleague.app>",
          to: email,
          subject: "Sign in to Music League",
          html: `<p>Click <a href="${url}">here</a> to sign in to Music League.</p>`,
        });
      },
    }),
    nextCookies(),
  ],
});
