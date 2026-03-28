-- CreateTable
CREATE TABLE "barber_shifts" (
    "id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,

    CONSTRAINT "barber_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_absences" (
    "id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barber_absences_barber_id_date_idx" ON "barber_absences"("barber_id", "date");

-- AddForeignKey
ALTER TABLE "barber_shifts" ADD CONSTRAINT "barber_shifts_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_absences" ADD CONSTRAINT "barber_absences_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
