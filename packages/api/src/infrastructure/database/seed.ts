import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password.service.js';

function generatePassword(): string {
  return randomBytes(8).toString('hex'); // 16-char hex, e.g. "a3f7c2d1e8b49f20"
}

const prisma = new PrismaClient();

// Days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const WEEKDAYS = [1, 2, 3, 4, 5];

const BARBERS = [
  { slug: 'matheus', firstName: 'Matheus', lastName: 'Kemp', email: 'matheus@soberano.com.br', phone: null, avatarUrl: '/matheus-kemp.jpeg' },
  { slug: 'adenilson', firstName: 'Adenilson', lastName: 'Fogaça', email: 'adenilson@soberano.com.br', phone: null, avatarUrl: '/adenilson.jpeg' },
  { slug: 'vandson', firstName: 'Vandson', lastName: 'Metélo', email: 'vandson@soberano.com.br', phone: null, avatarUrl: '/vandson.jpeg' },
];

// Shifts: each entry = one continuous block. Lunch gap = two separate blocks per day.
const BARBER_SHIFTS: Record<string, { dayOfWeek: number; startTime: string; endTime: string }[]> = {
  matheus: [
    // Mon-Fri: 09-12 and 14-18:30
    ...WEEKDAYS.flatMap((d) => [
      { dayOfWeek: d, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: d, startTime: '14:00', endTime: '18:30' },
    ]),
    // Saturday: 08-12:30
    { dayOfWeek: 6, startTime: '08:00', endTime: '12:30' },
  ],
  vandson: [
    // Mon-Fri: 09-12 and 14-19
    ...WEEKDAYS.flatMap((d) => [
      { dayOfWeek: d, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: d, startTime: '14:00', endTime: '19:00' },
    ]),
    // Saturday: 08-16
    { dayOfWeek: 6, startTime: '08:00', endTime: '16:00' },
  ],
  adenilson: [
    // Mon-Fri: 08-12 and 14-19
    ...WEEKDAYS.flatMap((d) => [
      { dayOfWeek: d, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: d, startTime: '14:00', endTime: '19:00' },
    ]),
    // Saturday: 08-16
    { dayOfWeek: 6, startTime: '08:00', endTime: '16:00' },
  ],
};

const SERVICES = [
  { slug: 'cabelo', name: 'Cabelo', icon: '✂️', priceCents: 5000, sortOrder: 1 },
  { slug: 'barba', name: 'Barba', icon: '🪒', priceCents: 5000, sortOrder: 2 },
  { slug: 'cabelo_barba', name: 'Cabelo e Barba', icon: '⭐', priceCents: 8000, sortOrder: 3 },
  { slug: 'cabelo_dep', name: 'Cabelo e Depilação (nariz e orelha)', icon: '✨', priceCents: 7000, sortOrder: 4 },
  { slug: 'barba_dep', name: 'Barba e Depilação (nariz e orelha)', icon: '💎', priceCents: 7000, sortOrder: 5 },
  { slug: 'cabelo_barba_dep', name: 'Cabelo, Barba e Depilação (nariz e orelha)', icon: '👑', priceCents: 10000, sortOrder: 6 },
  { slug: 'novo_de_novo', name: 'Novo de Novo! (Cabelo, Barba, Sobrancelha, Dep. nariz e orelha)', icon: '🔥', priceCents: 12000, sortOrder: 7 },
  { slug: 'cabelo_sob', name: 'Cabelo e Sobrancelha', icon: '🎯', priceCents: 7000, sortOrder: 8 },
  { slug: 'barba_sob', name: 'Barba e Sobrancelha', icon: '🪄', priceCents: 7000, sortOrder: 9 },
];

const SUPER_ADMIN_EMAIL = 'caio@altion.com.br';

async function seed() {
  console.log('Seeding database...');
  console.log('');

  // Super admin
  const existingAdmin = await prisma.superAdmin.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!existingAdmin) {
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);
    await prisma.superAdmin.create({ data: { email: SUPER_ADMIN_EMAIL, password: hashedPassword } });
    console.log('======= SUPER ADMIN CREDENTIALS =======');
    console.log(`  ${SUPER_ADMIN_EMAIL} / ${plainPassword}`);
    console.log('=======================================');
    console.log('');
  }

  // Get Soberano client (required for tenant-scoped upserts)
  const soberano = await prisma.client.findUnique({ where: { slug: 'soberano' } });
  if (!soberano) {
    console.error('Client "soberano" not found — run seed-tenant-soberano.ts first');
    process.exit(1);
  }

  console.log('======= BARBER CREDENTIALS =======');

  // Upsert barbers + shifts
  for (const barber of BARBERS) {
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const record = await prisma.barber.upsert({
      where: { clientId_slug: { clientId: soberano.id, slug: barber.slug } },
      update: { firstName: barber.firstName, lastName: barber.lastName, phone: barber.phone, avatarUrl: barber.avatarUrl },
      create: { ...barber, password: hashedPassword, clientId: soberano.id },
    });

    const isNew = record.createdAt.getTime() === record.updatedAt.getTime();
    if (isNew) {
      console.log(`  ${barber.firstName}: ${barber.email} / ${plainPassword}`);
    } else {
      console.log(`  ${barber.firstName}: already exists, password unchanged`);
    }

    // Replace shifts: delete existing and recreate
    await prisma.barberShift.deleteMany({ where: { barberId: record.id } });
    const shifts = BARBER_SHIFTS[barber.slug] ?? [];
    await prisma.barberShift.createMany({
      data: shifts.map((s) => ({ ...s, barberId: record.id })),
    });
    console.log(`    ${shifts.length} shifts seeded`);
  }

  // Upsert services
  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { clientId_slug: { clientId: soberano.id, slug: service.slug } },
      update: { name: service.name, icon: service.icon, priceCents: service.priceCents, sortOrder: service.sortOrder },
      create: { ...service, duration: 30, clientId: soberano.id },
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
