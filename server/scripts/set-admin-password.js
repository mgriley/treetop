#!/usr/bin/env node
// Usage: node scripts/set-admin-password.js <password>
// Hashes the given password and writes it to the admin hash file.
// Must be run before starting the server for the first time.

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/set-admin-password.js <password>');
  process.exit(1);
}

const hashPath = path.join(process.env.DATA_ROOT ?? '/treetop-data', 'admin.hash');
const hash = bcrypt.hashSync(password, 12);
fs.writeFileSync(hashPath, hash, 'utf8');
console.log(`Admin password set (hash written to ${hashPath})`);
