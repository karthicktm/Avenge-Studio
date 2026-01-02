-- This migration adds the missing tables and columns that were in schema.prisma
-- but not included in the initial migrations that were deployed to Railway

-- CreateTable: users (missing from init migration)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions (missing from init migration)
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workflows (missing from init migration)
CREATE TABLE IF NOT EXISTS "workflows" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Workflow',
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: generated_videos (missing from init migration)
CREATE TABLE IF NOT EXISTS "generated_videos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "aspect_ratio" TEXT NOT NULL,
    "resolution" TEXT,
    "start_image_url" TEXT,
    "end_image_url" TEXT,
    "audio_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_videos_pkey" PRIMARY KEY ("id")
);

-- Add user_id columns to existing tables (missing from init migration)
ALTER TABLE "generated_images" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- CreateIndex for users
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex for sessions
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex for workflows
CREATE INDEX IF NOT EXISTS "workflows_user_id_idx" ON "workflows"("user_id");
CREATE INDEX IF NOT EXISTS "workflows_created_at_idx" ON "workflows"("created_at");
CREATE INDEX IF NOT EXISTS "workflows_user_id_created_at_idx" ON "workflows"("user_id", "created_at");

-- CreateIndex for generated_videos
CREATE INDEX IF NOT EXISTS "generated_videos_user_id_idx" ON "generated_videos"("user_id");
CREATE INDEX IF NOT EXISTS "generated_videos_created_at_idx" ON "generated_videos"("created_at");
CREATE INDEX IF NOT EXISTS "generated_videos_user_id_created_at_idx" ON "generated_videos"("user_id", "created_at");

-- CreateIndex for existing tables with new user_id column
CREATE INDEX IF NOT EXISTS "generated_images_user_id_idx" ON "generated_images"("user_id");
CREATE INDEX IF NOT EXISTS "generated_images_created_at_idx" ON "generated_images"("created_at");
CREATE INDEX IF NOT EXISTS "generated_images_user_id_created_at_idx" ON "generated_images"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "characters_user_id_idx" ON "characters"("user_id");
CREATE INDEX IF NOT EXISTS "products_user_id_idx" ON "products"("user_id");

-- Update api_keys unique constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_service_key') THEN
        ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_service_key";
    END IF;
END $$;

DROP INDEX IF EXISTS "api_keys_service_key";
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_user_id_service_key" ON "api_keys"("user_id", "service");

-- AddForeignKey (only for new tables - existing tables have nullable user_id)
ALTER TABLE "sessions" ADD CONSTRAINT IF NOT EXISTS "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflows" ADD CONSTRAINT IF NOT EXISTS "workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generated_videos" ADD CONSTRAINT IF NOT EXISTS "generated_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Foreign keys for existing tables (generated_images, api_keys, characters, products)
-- are not added because user_id is NULL for existing records.
-- Add these constraints after creating the first user and updating existing records.
