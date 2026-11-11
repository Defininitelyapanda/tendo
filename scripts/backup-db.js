const fs = require('fs');
const path = require('path');
const { dbConfig } = require('../backend/db');

const now = new Date();
const stamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0'),
].join('-');

const backupDir = path.join(__dirname, '..', 'backend', 'data', 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const sourcePath = dbConfig.databasePath;
const targetPath = path.join(backupDir, `${path.basename(sourcePath, path.extname(sourcePath))}-${stamp}.db`);

if (!fs.existsSync(sourcePath)) {
  console.error(`Database file not found at ${sourcePath}`);
  process.exit(1);
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`Backup created for ${dbConfig.environment} data classification (${dbConfig.dataClassification}) at ${targetPath}`);
