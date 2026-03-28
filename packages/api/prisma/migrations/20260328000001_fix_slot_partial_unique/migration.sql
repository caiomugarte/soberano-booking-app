-- Drop the full unique constraint (blocks re-booking of no_show/cancelled slots)
DROP INDEX IF EXISTS "appointments_barber_id_date_start_time_key";

-- Create a regular index for query performance
CREATE INDEX IF NOT EXISTS "appointments_barber_id_date_start_time_idx" ON "appointments"("barber_id", "date", "start_time");

-- Partial unique index: only confirmed appointments block a slot
CREATE UNIQUE INDEX "appointments_barber_slot_confirmed_unique"
ON "appointments"("barber_id", "date", "start_time")
WHERE status = 'confirmed';
