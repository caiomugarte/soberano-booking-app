import bcrypt from 'bcryptjs';

const password = process.argv[2];
const hash = process.argv[3];

if (!password || !hash) {
  console.error("Usage: npm run check:password-hash -- <password> '<hash>'");
  process.exit(1);
}

const matches = await bcrypt.compare(password, hash);
console.log(matches ? 'MATCH' : 'NO_MATCH');
