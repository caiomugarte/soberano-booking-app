import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function printUsage() {
  console.error('Usage: npm run db:create-tenant -- --slug <slug> --name <name> --booking-url <url> --provider-label <label> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --type <type>                     Tenant type (default: barbershop)');
  console.error('  --business-name <name>            Business name (default: --name)');
  console.error('  --is-active <true|false>          Active flag (default: true)');
  console.error('  --chatwoot-base-url <url>         Optional Chatwoot base URL');
  console.error('  --chatwoot-api-token <token>      Optional Chatwoot API token');
  console.error('  --chatwoot-account-id <number>    Optional Chatwoot account ID');
  console.error('  --chatwoot-inbox-id <number>      Optional Chatwoot inbox ID');
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean value "${value}". Use true or false.`);
}

function parseOptionalNumber(value, flagName) {
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for --${flagName}: "${value}"`);
  }

  return parsed;
}

const args = parseArgs(process.argv);
const slug = args.slug;
const name = args.name;
const type = args.type ?? 'barbershop';
const providerLabel = args['provider-label'];
const bookingUrl = args['booking-url'];
const businessName = args['business-name'] ?? name;

if (!slug || !name || !providerLabel || !bookingUrl) {
  printUsage();
  process.exit(1);
}

const isActive = parseBoolean(args['is-active'], true);
const config = {
  businessName,
  providerLabel,
  bookingUrl,
  ...(args['chatwoot-base-url'] ? { chatwootBaseUrl: args['chatwoot-base-url'] } : {}),
  ...(args['chatwoot-api-token'] ? { chatwootApiToken: args['chatwoot-api-token'] } : {}),
  ...(args['chatwoot-account-id'] ? { chatwootAccountId: parseOptionalNumber(args['chatwoot-account-id'], 'chatwoot-account-id') } : {}),
  ...(args['chatwoot-inbox-id'] ? { chatwootInboxId: parseOptionalNumber(args['chatwoot-inbox-id'], 'chatwoot-inbox-id') } : {}),
};

async function main() {
  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {
      name,
      type,
      config,
      isActive,
    },
    create: {
      slug,
      name,
      type,
      config,
      isActive,
    },
  });

  console.log(existing ? 'Tenant updated.' : 'Tenant created.');
  console.log(JSON.stringify({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    type: tenant.type,
    isActive: tenant.isActive,
    config: tenant.config,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to create tenant:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
