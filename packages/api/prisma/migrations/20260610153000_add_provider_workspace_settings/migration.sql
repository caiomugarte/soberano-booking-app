ALTER TABLE "providers"
ADD COLUMN "workspace_start_time" VARCHAR(5) NOT NULL DEFAULT '08:00',
ADD COLUMN "workspace_end_time" VARCHAR(5) NOT NULL DEFAULT '17:00',
ADD COLUMN "default_session_duration_minutes" INTEGER NOT NULL DEFAULT 60;
