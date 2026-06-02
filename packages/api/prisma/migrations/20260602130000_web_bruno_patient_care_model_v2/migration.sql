ALTER TABLE "customers"
ADD COLUMN "neuromodulation_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parents_meeting_status" VARCHAR(20);

UPDATE "customers"
SET "neuromodulation_eligible" = CASE
  WHEN "care_mode" = 'neuromodulation' THEN true
  ELSE false
END;

ALTER TABLE "customers"
DROP COLUMN "care_mode";
