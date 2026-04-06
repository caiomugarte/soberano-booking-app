import { prisma } from '../../config/database.js';
import { PLAN_FEATURES } from '../../shared/features.js';

async function main() {
  console.log('Creating Soberano tenant and backfilling clientId...');

  await prisma.$transaction(async (tx) => {
    // 1. Create the Soberano client record
    const soberano = await tx.client.create({
      data: {
        slug: 'soberano',
        name: 'Soberano Barbearia',
        baseUrl: process.env.BASE_URL ?? 'https://soberano.altion.com.br',
        timezone: 'America/Campo_Grande',
        enabledFeatures: PLAN_FEATURES['ai'],
        theme: {
          primaryColor: '#1a1a2e',
          primaryColorHover: '#16213e',
          logoUrl: null,
        },
        isActive: true,
        chatwootBaseUrl: process.env.CHATWOOT_BASE_URL ?? null,
        chatwootToken: process.env.CHATWOOT_API_TOKEN ?? null,
        chatwootAccountId: process.env.CHATWOOT_ACCOUNT_ID
          ? parseInt(process.env.CHATWOOT_ACCOUNT_ID)
          : null,
        chatwootInboxId: process.env.CHATWOOT_INBOX_ID
          ? parseInt(process.env.CHATWOOT_INBOX_ID)
          : null,
      },
    });

    console.log(`Created client: ${soberano.name} (id=${soberano.id})`);

    // 2. Backfill clientId on all existing rows
    const [barbers, services, customers, appointments] = await Promise.all([
      tx.barber.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } }),
      tx.service.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } }),
      tx.customer.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } }),
      tx.appointment.updateMany({ where: { clientId: null }, data: { clientId: soberano.id } }),
    ]);

    console.log(`Backfilled: ${barbers.count} barbers, ${services.count} services, ${customers.count} customers, ${appointments.count} appointments`);
  });

  console.log('Done! Now make clientId NOT NULL by running:');
  console.log('  npx prisma migrate dev --name make_clientId_required');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
