import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password.service.js';

const prisma = new PrismaClient();

const PROVIDER = {
  slug: 'bruno',
  firstName: 'Bruno',
  lastName: 'Psicólogo',
  email: 'bruno@brunopsicologo.com.br',
  phone: null,
  avatarUrl: null,
};

const SERVICES = [
  { slug: 'individual', name: 'Sessão Individual', icon: '🧠', priceCents: 20000, duration: 50, sortOrder: 1 },
  { slug: 'casal',      name: 'Sessão de Casal',   icon: '👫', priceCents: 25000, duration: 50, sortOrder: 2 },
  { slug: 'familiar',   name: 'Sessão Familiar',   icon: '👨‍👩‍👧', priceCents: 30000, duration: 50, sortOrder: 3 },
];

async function seed() {
  console.log('Seeding Bruno tenant...\n');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'bruno' },
    update: {},
    create: {
      slug: 'bruno',
      name: 'Bruno Psicólogo',
      type: 'psychology',
      config: { businessName: 'Bruno Psicólogo', providerLabel: 'Psicólogo', bookingUrl: 'http://localhost:5176' },
      isActive: true,
    },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.slug})\n`);
  console.log('======= PROVIDER CREDENTIALS =======');

  const existing = await prisma.provider.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: PROVIDER.slug } },
  });

  let provider;
  let plainPassword: string | null = null;

  if (existing) {
    provider = await prisma.provider.update({
      where: { id: existing.id },
      data: { firstName: PROVIDER.firstName, lastName: PROVIDER.lastName },
    });
  } else {
    plainPassword = randomBytes(8).toString('hex');
    provider = await prisma.provider.create({
      data: { ...PROVIDER, password: await hashPassword(plainPassword), tenantId: tenant.id },
    });
  }

  console.log(plainPassword
    ? `  ${provider.firstName}: ${PROVIDER.email} / ${plainPassword}`
    : `  ${provider.firstName}: already exists, password unchanged`
  );

  console.log('\n');

  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: service.slug } },
      update: { name: service.name, priceCents: service.priceCents, duration: service.duration },
      create: { ...service, tenantId: tenant.id },
    });
    console.log(`  Service: ${service.name}`);
  }

  console.log('=====================================\n');
  console.log('Seed completed!');
}

seed()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
