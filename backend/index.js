const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { db, dbConfig, assertWriteAllowed } = require('./db');
const { issueToken, hashPassword, verifyPassword, requireAuth, requireWorkspaceAccess, requireWorkspaceAdmin } = require('./auth');
const {
  registerSchema,
  loginSchema,
  workspaceSchema,
  customerSchema,
  invoiceSchema,
  paymentSchema,
  expenseSchema,
  entrySchema,
  inventorySchema,
} = require('./validation');

const app = express();
const clientRoot = path.join(__dirname, '..');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.static(clientRoot));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()) && dbConfig.isProduction && process.env.TENDO_ALLOW_PRODUCTION_WRITE !== 'true') {
    return res.status(403).json({
      error: 'Production writes are disabled.',
      reason: 'Use a separate staging or development environment for changes and set TENDO_ALLOW_PRODUCTION_WRITE=true only after a verified backup.',
      environment: dbConfig.environment,
      data_classification: dbConfig.dataClassification,
    });
  }
  return next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(clientRoot, 'index.html'));
});

function normalizePhone(phone = '') {
  return String(phone || '').replace(/\D/g, '').slice(-15);
}

function requireWorkspace(req, res, next) {
  const workspaceId = req.params.workspaceId || req.body.workspace_id || req.query.workspaceId;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace id is required.' });
  }
  return requireWorkspaceAccess(req, res, next);
}

function createAuditLog(workspaceId, userId, action, entity, entityId, details = {}) {
  db.prepare(`
    INSERT INTO audit_logs (id, workspace_id, user_id, action, entity, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `log-${crypto.randomUUID()}`,
    workspaceId,
    userId,
    action,
    entity,
    entityId,
    JSON.stringify(details)
  );
}

function upsertCustomer(workspaceId, payload) {
  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedEmail = (payload.email || '').trim().toLowerCase();
  const existingCustomer = db.prepare(`
    SELECT * FROM customers
    WHERE workspace_id = ?
      AND (
        (? != '' AND email = ?) OR
        (? != '' AND phone = ?) OR
        (LOWER(name) = LOWER(?))
      )
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(
    workspaceId,
    normalizedEmail,
    normalizedEmail,
    normalizedPhone,
    normalizedPhone,
    (payload.name || '').trim()
  );

  if (existingCustomer) {
    const updated = db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, email = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(payload.name.trim(), normalizedPhone || null, normalizedEmail || null, payload.notes || '', existingCustomer.id);
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(existingCustomer.id);
  }

  const customerId = `customer-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO customers (id, workspace_id, name, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(customerId, workspaceId, payload.name.trim(), normalizedPhone || null, normalizedEmail || null, payload.notes || '');
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'tendo-backend',
    timestamp: new Date().toISOString(),
    environment: dbConfig.environment,
    data_classification: dbConfig.dataClassification,
    database_path: dbConfig.databasePath,
    writes_allowed: dbConfig.isProduction ? process.env.TENDO_ALLOW_PRODUCTION_WRITE === 'true' : true,
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid registration payload', details: result.error.flatten() });
    }

    const { name, email, password } = result.data;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const userId = `user-${crypto.randomUUID()}`;
    const { hash } = hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, 'owner')
    `).run(userId, email.toLowerCase(), hash, name);

    const workspaceId = `workspace-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO workspaces (id, name, type, created_by)
      VALUES (?, ?, 'Primary workspace', ?)
    `).run(workspaceId, `${name}'s workspace`, userId);

    db.prepare(`
      INSERT INTO workspace_members (user_id, workspace_id, role, permissions)
      VALUES (?, ?, 'owner', '{"admin":true,"invoices":true,"expenses":true,"customers":true,"inventory":true,"reports":true}')
    `).run(userId, workspaceId);

    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(userId);
    return res.status(201).json({ user, token: issueToken(user), workspaceId });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid login payload', details: result.error.flatten() });
    }

    const { email, password } = result.data;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    return res.json({ user: safeUser, token: issueToken(safeUser) });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed.', details: error.message });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user });
});

app.get('/api/workspaces', requireAuth, (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ?
    ORDER BY w.created_at DESC
  `).all(req.user.id);
  return res.json({ workspaces });
});

app.post('/api/workspaces', requireAuth, (req, res) => {
  try {
    const parsed = workspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid workspace payload', details: parsed.error.flatten() });
    }
    const workspaceId = `workspace-${crypto.randomUUID()}`;
    const { name, type, timezone } = parsed.data;
    db.prepare(`
      INSERT INTO workspaces (id, name, type, timezone, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(workspaceId, name, type || 'Business', timezone || 'Africa/Nairobi', req.user.id);
    db.prepare(`
      INSERT INTO workspace_members (user_id, workspace_id, role, permissions)
      VALUES (?, ?, 'owner', '{"admin":true,"invoices":true,"expenses":true,"customers":true,"inventory":true,"reports":true}')
    `).run(req.user.id, workspaceId);
    createAuditLog(workspaceId, req.user.id, 'workspace_created', 'workspace', workspaceId, { name });
    return res.status(201).json({ workspace: { id: workspaceId, name, type: type || 'Business', timezone: timezone || 'Africa/Nairobi' } });
  } catch (error) {
    return res.status(500).json({ error: 'Workspace creation failed.', details: error.message });
  }
});

app.get('/api/workspaces/:workspaceId/customers', requireAuth, requireWorkspace, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers WHERE workspace_id = ? ORDER BY updated_at DESC').all(req.params.workspaceId);
  return res.json({ customers });
});

app.post('/api/workspaces/:workspaceId/customers', requireAuth, requireWorkspace, (req, res) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid customer payload', details: parsed.error.flatten() });
    }
    const customer = upsertCustomer(req.params.workspaceId, parsed.data);
    createAuditLog(req.params.workspaceId, req.user.id, 'customer_upserted', 'customer', customer.id, { name: customer.name });
    return res.status(201).json({ customer });
  } catch (error) {
    return res.status(500).json({ error: 'Customer save failed.', details: error.message });
  }
});

app.get('/api/workspaces/:workspaceId/entries', requireAuth, requireWorkspace, (req, res) => {
  const entries = db.prepare('SELECT * FROM entries WHERE workspace_id = ? ORDER BY created_at DESC').all(req.params.workspaceId);
  return res.json({ entries });
});

app.post('/api/workspaces/:workspaceId/entries', requireAuth, requireWorkspace, (req, res) => {
  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid entry payload', details: parsed.error.flatten() });
    }
    const entryId = `entry-${crypto.randomUUID()}`;
    const { type, description, amount_cents, customer_id, status } = parsed.data;
    db.prepare(`
      INSERT INTO entries (id, workspace_id, type, description, amount_cents, customer_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(entryId, req.params.workspaceId, type, description, amount_cents, customer_id || null, status);
    createAuditLog(req.params.workspaceId, req.user.id, 'entry_created', 'entry', entryId, { type, amount_cents });
    return res.status(201).json({ entry: { id: entryId, workspace_id: req.params.workspaceId, type, description, amount_cents, customer_id: customer_id || null, status } });
  } catch (error) {
    return res.status(500).json({ error: 'Entry creation failed.', details: error.message });
  }
});

app.get('/api/workspaces/:workspaceId/invoices', requireAuth, requireWorkspace, (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, c.name AS customer_name
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.workspace_id = ?
    ORDER BY i.created_at DESC
  `).all(req.params.workspaceId);
  return res.json({ invoices });
});

app.post('/api/workspaces/:workspaceId/invoices', requireAuth, requireWorkspace, (req, res) => {
  try {
    const parsed = invoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid invoice payload', details: parsed.error.flatten() });
    }

    const workspaceId = req.params.workspaceId;
    const { customer_id, customer, due_date, status, items } = parsed.data;
    let resolvedCustomerId = customer_id || null;

    if (!resolvedCustomerId && customer) {
      const createdCustomer = upsertCustomer(workspaceId, customer);
      resolvedCustomerId = createdCustomer.id;
    }

    if (!resolvedCustomerId) {
      return res.status(400).json({ error: 'A customer id or customer payload is required.' });
    }

    const subtotalCents = items.reduce((sum, item) => sum + (item.quantity * item.unit_price_cents), 0);
    const taxCents = Math.round(subtotalCents * 0.16);
    const totalCents = subtotalCents + taxCents;
    const invoiceId = `invoice-${crypto.randomUUID()}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO invoices (id, workspace_id, customer_id, number, status, subtotal_cents, tax_cents, total_cents, paid_cents, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(invoiceId, workspaceId, resolvedCustomerId, invoiceNumber, status, subtotalCents, taxCents, totalCents, due_date || null, req.user.id);

    items.forEach((item) => {
      const itemId = `invoice-item-${crypto.randomUUID()}`;
      const total = item.quantity * item.unit_price_cents;
      db.prepare(`
        INSERT INTO invoice_items (id, workspace_id, invoice_id, description, quantity, unit_price_cents, total_cents)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, workspaceId, invoiceId, item.description, item.quantity, item.unit_price_cents, total);
    });

    db.prepare(`
      INSERT INTO entries (id, workspace_id, type, description, amount_cents, customer_id, status)
      VALUES (?, ?, 'invoice', ?, ?, ?, 'posted')
    `).run(`entry-${crypto.randomUUID()}`, workspaceId, `Invoice ${invoiceNumber}`, totalCents, resolvedCustomerId);

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    createAuditLog(workspaceId, req.user.id, 'invoice_created', 'invoice', invoiceId, { number: invoiceNumber, total_cents: totalCents });
    return res.status(201).json({ invoice, invoiceItems });
  } catch (error) {
    return res.status(500).json({ error: 'Invoice creation failed.', details: error.message });
  }
});

app.post('/api/workspaces/:workspaceId/invoices/:invoiceId/payments', requireAuth, requireWorkspace, (req, res) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payment payload', details: parsed.error.flatten() });
    }

    const invoiceId = req.params.invoiceId;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND workspace_id = ?').get(invoiceId, req.params.workspaceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in this workspace.' });
    }

    const { amount_cents, method, status } = parsed.data;
    if (amount_cents > invoice.total_cents - invoice.paid_cents) {
      return res.status(400).json({ error: 'Payment exceeds the outstanding invoice balance.' });
    }

    const paymentId = `payment-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO payments (id, workspace_id, invoice_id, customer_id, amount_cents, method, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, req.params.workspaceId, invoiceId, invoice.customer_id, amount_cents, method, status, req.user.id);

    const updatedPaid = invoice.paid_cents + amount_cents;
    const nextStatus = updatedPaid >= invoice.total_cents ? 'paid' : 'pending';
    db.prepare(`
      UPDATE invoices
      SET paid_cents = ?, status = ?
      WHERE id = ?
    `).run(updatedPaid, nextStatus, invoiceId);

    db.prepare(`
      INSERT INTO entries (id, workspace_id, type, description, amount_cents, customer_id, status)
      VALUES (?, ?, 'payment', ?, ?, ?, 'posted')
    `).run(`entry-${crypto.randomUUID()}`, req.params.workspaceId, `Payment received for ${invoice.number}`, amount_cents, invoice.customer_id);

    createAuditLog(req.params.workspaceId, req.user.id, 'payment_recorded', 'payment', paymentId, { amount_cents, method });
    return res.status(201).json({ payment: { id: paymentId, invoice_id: invoiceId, amount_cents, method, status } });
  } catch (error) {
    return res.status(500).json({ error: 'Payment failed.', details: error.message });
  }
});

app.get('/api/workspaces/:workspaceId/expenses', requireAuth, requireWorkspace, (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses WHERE workspace_id = ? ORDER BY created_at DESC').all(req.params.workspaceId);
  return res.json({ expenses });
});

app.post('/api/workspaces/:workspaceId/expenses', requireAuth, requireWorkspace, (req, res) => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid expense payload', details: parsed.error.flatten() });
    }
    const expenseId = `expense-${crypto.randomUUID()}`;
    const { vendor, description, category, amount_cents, status } = parsed.data;
    db.prepare(`
      INSERT INTO expenses (id, workspace_id, vendor, description, category, amount_cents, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expenseId, req.params.workspaceId, vendor, description, category, amount_cents, status, req.user.id);
    db.prepare(`
      INSERT INTO entries (id, workspace_id, type, description, amount_cents, status)
      VALUES (?, ?, 'expense', ?, ?, 'posted')
    `).run(`entry-${crypto.randomUUID()}`, req.params.workspaceId, description, amount_cents);
    createAuditLog(req.params.workspaceId, req.user.id, 'expense_recorded', 'expense', expenseId, { vendor, amount_cents });
    return res.status(201).json({ expense: { id: expenseId, workspace_id: req.params.workspaceId, vendor, description, category, amount_cents, status } });
  } catch (error) {
    return res.status(500).json({ error: 'Expense save failed.', details: error.message });
  }
});

app.get('/api/workspaces/:workspaceId/reports/summary', requireAuth, requireWorkspace, (req, res) => {
  const revenue = db.prepare(`
    SELECT COALESCE(SUM(total_cents), 0) AS total
    FROM invoices
    WHERE workspace_id = ? AND status = 'paid'
  `).get(req.params.workspaceId);

  const outstanding = db.prepare(`
    SELECT COALESCE(SUM(total_cents - paid_cents), 0) AS total
    FROM invoices
    WHERE workspace_id = ? AND status != 'paid'
  `).get(req.params.workspaceId);

  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS total
    FROM expenses
    WHERE workspace_id = ?
  `).get(req.params.workspaceId);

  const customerCount = db.prepare('SELECT COUNT(*) as total FROM customers WHERE workspace_id = ?').get(req.params.workspaceId);
  const invoiceCount = db.prepare('SELECT COUNT(*) as total FROM invoices WHERE workspace_id = ?').get(req.params.workspaceId);

  return res.json({
    summary: {
      revenue_cents: Number(revenue.total || 0),
      outstanding_cents: Number(outstanding.total || 0),
      expense_cents: Number(expenses.total || 0),
      customer_count: Number(customerCount.total || 0),
      invoice_count: Number(invoiceCount.total || 0),
    }
  });
});

app.get('/api/workspaces/:workspaceId/inventory', requireAuth, requireWorkspace, (req, res) => {
  const inventory = db.prepare('SELECT * FROM inventory_products WHERE workspace_id = ? ORDER BY name ASC').all(req.params.workspaceId);
  return res.json({ inventory });
});

app.post('/api/workspaces/:workspaceId/inventory', requireAuth, requireWorkspace, requireWorkspaceAdmin, (req, res) => {
  try {
    const parsed = inventorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid inventory payload', details: parsed.error.flatten() });
    }

    const itemId = `inventory-${crypto.randomUUID()}`;
    const { name, sku, category, stock_quantity, unit_price_cents, cost_price_cents, notes } = parsed.data;
    db.prepare(`
      INSERT INTO inventory_products (id, workspace_id, name, sku, category, stock_quantity, unit_price_cents, cost_price_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, req.params.workspaceId, name, sku, category, stock_quantity, unit_price_cents, cost_price_cents, notes || '');
    createAuditLog(req.params.workspaceId, req.user.id, 'inventory_created', 'inventory', itemId, { name, sku });
    return res.status(201).json({ inventory: { id: itemId, workspace_id: req.params.workspaceId, name, sku, category, stock_quantity, unit_price_cents, cost_price_cents, notes } });
  } catch (error) {
    return res.status(500).json({ error: 'Inventory save failed.', details: error.message });
  }
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  return res.status(500).json({ error: 'Unexpected server error.', details: err.message });
});

module.exports = app;

if (require.main === module) {
  const preferredPort = Number(process.env.PORT || 3100);
  const portsToTry = Array.from({ length: 10 }, (_, index) => preferredPort + index);

  const listenOnNextPort = portIndex => {
    const port = portsToTry[portIndex];
    const server = app.listen(port, () => {
      console.log(`TENDO backend listening on http://localhost:${port}`);
    });

    server.on('error', error => {
      if (error.code === 'EADDRINUSE' && portIndex < portsToTry.length - 1) {
        console.warn(`Port ${port} is busy; retrying on ${portsToTry[portIndex + 1]}.`);
        listenOnNextPort(portIndex + 1);
        return;
      }
      console.error(`Failed to start TENDO backend on port ${port}:`, error.message);
      process.exit(1);
    });
  };

  listenOnNextPort(0);
}
