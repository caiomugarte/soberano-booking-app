import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { AppError } from './shared/errors.js';
import { bookingRoutes } from './http/routes/booking.routes.js';
import { appointmentRoutes } from './http/routes/appointment.routes.js';
import { serviceRoutes } from './http/routes/service.routes.js';
import { barberRoutes } from './http/routes/barber.routes.js';
import { authRoutes } from './http/routes/auth.routes.js';
import { adminRoutes } from './http/routes/admin.routes.js';
import { scheduleRoutes } from './http/routes/schedule.routes.js';
import { startReminderJob } from './infrastructure/jobs/reminder.job.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

await app.register(cors, {
  origin: env.NODE_ENV === 'development' ? true : env.BASE_URL,
  credentials: true,
});

await app.register(cookie);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Error handler
app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.errors[0]?.message ?? 'Dados inválidos.',
    });
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas. Tente novamente em instantes.',
    });
  }

  app.log.error(error);
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor.',
  });
});

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Routes
await app.register(serviceRoutes, { prefix: '/api' });
await app.register(barberRoutes, { prefix: '/api' });
await app.register(bookingRoutes, { prefix: '/api' });
await app.register(appointmentRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api' });
await app.register(adminRoutes, { prefix: '/api' });
await app.register(scheduleRoutes, { prefix: '/api' });

// Start
try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  startReminderJob();
  app.log.info(`Server running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
