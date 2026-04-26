import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password.service.js';

function generatePassword(): string {
  return randomBytes(8).toString('hex');
}

const prisma = new PrismaClient();

const BARBERS = [
  {
    slug: 'caio',
    firstName: 'Caio',
    lastName: 'Marques',
    email: 'caio@marques.com.br',
    phone: null,
    avatarUrl: '/caio.png',
    shifts: [1, 2, 3, 4, 5, 6].flatMap((d) => [
      { dayOfWeek: d, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: d, startTime: '14:00', endTime: '19:00' },
    ]),
  },
  {
    slug: 'gabriel',
    firstName: 'Gabriel',
    lastName: 'Marques',
    email: 'gabriel@marques.com.br',
    phone: null,
    avatarUrl: '/gabriel.png',
    shifts: [1, 2, 3, 4, 5, 6].flatMap((d) => [
      { dayOfWeek: d, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: d, startTime: '14:00', endTime: '19:00' },
    ]),
  },
];

const SERVICES = [
  { slug: 'cabelo', name: 'Corte de Cabelo', icon: '✂️', priceCents: 4000, duration: 40, sortOrder: 1 },
  { slug: 'barba', name: 'Barba', icon: '🪒', priceCents: 3500, duration: 30, sortOrder: 2 },
  { slug: 'cabelo_barba', name: 'Cabelo & Barba', icon: '⭐', priceCents: 7000, duration: 70, sortOrder: 3 },
];

async function seed() {
  console.log('Seeding marques tenant...');
  console.log('');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'marques' },
    update: {},
    create: {
      slug: 'marques',
      name: 'Barbearia da Marques',
      type: 'barbershop',
      config: { businessName: 'Barbearia da Marques', providerLabel: 'Barbeiro', bookingUrl: 'http://localhost:5175' },
      isActive: true,
    },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log('');
  console.log('======= BARBER CREDENTIALS =======');

  for (const barber of BARBERS) {
    const { shifts, ...barberData } = barber;
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const record = await prisma.provider.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: barber.slug } },
      update: { firstName: barberData.firstName, lastName: barberData.lastName, avatarUrl: barberData.avatarUrl },
      create: { ...barberData, password: hashedPassword, tenantId: tenant.id },
    });

    const isNew = record.createdAt.getTime() === record.updatedAt.getTime();
    console.log(isNew
      ? `  ${barberData.firstName}: ${barberData.email} / ${plainPassword}`
      : `  ${barberData.firstName}: already exists, password unchanged`
    );

    await prisma.providerShift.deleteMany({ where: { providerId: record.id } });
    await prisma.providerShift.createMany({
      data: shifts.map((s) => ({ ...s, providerId: record.id, tenantId: tenant.id })),
    });
    console.log(`    ${shifts.length} shifts seeded`);
  }

  console.log('');

  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: service.slug } },
      update: { name: service.name, icon: service.icon, priceCents: service.priceCents, duration: service.duration },
      create: { ...service, tenantId: tenant.id },
    });
    console.log(`  Service: ${service.name}`);
  }

  console.log('==================================');
  console.log('');
  console.log('Seed completed!');
}

seed()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
