const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { DatabaseSync } = require('node:sqlite');

const dbDir = path.join(__dirname, 'data');
fs.mkdirSync(dbDir, { recursive: true });

const environment = (process.env.TENDO_ENV || process.env.NODE_ENV || 'development').toLowerCase();
const envVarClassification = (process.env.TENDO_DATA_CLASSIFICATION || '').toLowerCase();
const dataClassification = envVarClassification || (environment === 'production' ? 'production' : environment === 'staging' ? 'staging' : 'demo');
const dbFileName = environment === 'production' ? 'tendo.production.db' : environment === 'staging' ? 'tendo.staging.db' : 'tendo.development.db';
const databasePath = process.env.TENDO_DB_PATH || path.join(dbDir, dbFileName);
const dbConfig = {
  environment,
  databasePath,
  dataClassification,
  isProduction: environment === 'production',
  isStaging: environment === 'staging',
  isDemo: dataClassification === 'demo',
};

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON;');

const writeAllowed = () => {
  if (dbConfig.isProduction && process.env.TENDO_ALLOW_PRODUCTION_WRITE !== 'true') {
    return false;
  }
  return true;
};

const assertWriteAllowed = () => {
  if (!writeAllowed()) {
    throw new Error('Production database writes are blocked. Set TENDO_ALLOW_PRODUCTION_WRITE=true only after backup verification and staging validation.');
  }
};

const addDataClassificationColumn = (tableName) => {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN data_classification TEXT NOT NULL DEFAULT '${dataClassification}'`);
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    created_by TEXT NOT NULL,
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    permissions TEXT NOT NULL DEFAULT '{}',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, workspace_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT DEFAULT '',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE INDEX IF NOT EXISTS idx_customers_workspace ON customers(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_customers_lookup ON customers(workspace_id, email, phone, name);

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    customer_id TEXT,
    status TEXT NOT NULL DEFAULT 'posted',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE INDEX IF NOT EXISTS idx_entries_workspace ON entries(workspace_id, created_at);

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    paid_cents INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    created_by TEXT NOT NULL,
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id, status, created_at);

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'settled',
    created_by TEXT NOT NULL,
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id, created_at);

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    vendor TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    created_by TEXT NOT NULL,
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_products (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    cost_price_cents INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS integration_connections (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    data_classification TEXT NOT NULL DEFAULT '${dataClassification}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

['users', 'workspaces', 'workspace_members', 'customers', 'entries', 'invoices', 'invoice_items', 'payments', 'expenses', 'inventory_products', 'integration_connections', 'audit_logs'].forEach(addDataClassificationColumn);
['users', 'workspaces', 'workspace_members', 'customers', 'entries', 'invoices', 'invoice_items', 'payments', 'expenses', 'inventory_products', 'integration_connections', 'audit_logs'].forEach((tableName) => {
  db.exec(`UPDATE ${tableName} SET data_classification = '${dataClassification}' WHERE data_classification IS NULL OR data_classification = ''`);
});

module.exports = { db, dbConfig, assertWriteAllowed, writeAllowed };
