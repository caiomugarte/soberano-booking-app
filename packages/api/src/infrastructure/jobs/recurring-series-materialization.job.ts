import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { createTenantPrisma } from '../../config/tenant-prisma.js';
import { PrismaAppointmentRepository } from '../database/repositories/prisma-appointment.repository.js';
import { PrismaRecurringAppointmentSeriesRepository } from '../database/repositories/prisma-recurring-appointment-series.repository.js';
import { MaterializeRecurringSeriesWindowUseCase } from '../../application/use-cases/booking/materialize-recurring-series-window.js';

export function startRecurringSeriesMaterializationJob(): void {
  cron.schedule('15 2 * * *', async () => {
    const tenants = await prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      try {
        const tenantPrisma = createTenantPrisma(tenant.id);
        const appointmentRepo = new PrismaAppointmentRepository(tenantPrisma);
        const recurringSeriesRepo = new PrismaRecurringAppointmentSeriesRepository(tenantPrisma);
        const useCase = new MaterializeRecurringSeriesWindowUseCase(
          appointmentRepo,
          recurringSeriesRepo,
        );

        const result = await useCase.execute();

        if (result.conflicts.length > 0) {
          for (const conflict of result.conflicts) {
            console.error(
              `[RecurringSeries] Conflict while materializing tenant ${tenant.id}, series ${conflict.seriesId}, date ${conflict.date}, start ${conflict.startTime}`,
            );
          }
        }

        console.log(
          `[RecurringSeries] Tenant ${tenant.id}: processed ${result.processedSeries} series and created ${result.createdAppointments} appointments`,
        );
      } catch (error) {
        console.error(`[RecurringSeries] Failed to materialize tenant ${tenant.id}:`, error);
      }
    }
  });

  console.log('[RecurringSeries] Materialization job started (daily at 02:15)');
}
