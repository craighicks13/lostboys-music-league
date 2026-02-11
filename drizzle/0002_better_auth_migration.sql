-- Better Auth migration: drop and recreate auth tables
-- This is a clean-slate migration for dev/staging environments

-- Drop old auth tables (order matters for FK constraints)
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verificationToken" CASCADE;

-- Recreate session table with Better Auth structure
CREATE TABLE "session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamp NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Recreate account table with Better Auth structure
CREATE TABLE "account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "accessToken" text,
  "refreshToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "idToken" text,
  "password" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Create verification table (replaces verificationToken)
CREATE TABLE "verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Update user table: change emailVerified from timestamp to boolean
ALTER TABLE "user" ALTER COLUMN "emailVerified" TYPE boolean USING CASE WHEN "emailVerified" IS NOT NULL THEN true ELSE false END;
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET DEFAULT false;
ALTER TABLE "user" ALTER COLUMN "emailVerified" SET NOT NULL;

-- Rename user timestamp columns to camelCase (if they were snake_case)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'created_at') THEN
    ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updated_at') THEN
    ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt";
  END IF;
END $$;
