const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./index');

async function withServer(testFn) {
  const server = app.listen(0);
  const port = await new Promise((resolve) => {
    server.once('listening', () => resolve(server.address().port));
  });

  try {
    await testFn(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { status: response.status, json, text };
}

test('invoice numbering stays unique and well formed', () => {
  const first = app.generateInvoiceNumber('workspace-1');
  const second = app.generateInvoiceNumber('workspace-1');

  assert.match(first, /^INV-[A-Z0-9]+-[A-F0-9]+$/);
  assert.match(second, /^INV-[A-Z0-9]+-[A-F0-9]+$/);
  assert.notEqual(first, second);
});

test('security middleware blocks env file access and auth workflow works', async () => {
  await withServer(async (port) => {
    const envResponse = await request(port, '/.env');
    assert.equal(envResponse.status, 403);

    const registerPayload = {
      name: 'Invoice User',
      email: `invoice-${Date.now()}@example.com`,
      password: 'password123',
    };

    const registerResponse = await request(port, '/api/auth/register', {
      method: 'POST',
      body: registerPayload,
    });

    assert.equal(registerResponse.status, 201);
    assert.ok(registerResponse.json.token);

    const workspaceId = registerResponse.json.workspaceId;
    const authHeader = { Authorization: `Bearer ${registerResponse.json.token}` };

    const customerResponse = await request(port, `/api/workspaces/${workspaceId}/customers`, {
      method: 'POST',
      headers: authHeader,
      body: {
        name: 'Northwind Foods',
        phone: '0712345678',
        email: 'northwind@example.com',
        notes: 'Recurring customer',
      },
    });

    assert.equal(customerResponse.status, 201);

    const invoiceResponse = await request(port, `/api/workspaces/${workspaceId}/invoices`, {
      method: 'POST',
      headers: authHeader,
      body: {
        customer_id: customerResponse.json.customer.id,
        items: [{ description: 'Website design', quantity: 2, unit_price_cents: 5000 }],
      },
    });

    assert.equal(invoiceResponse.status, 201);
    assert.match(invoiceResponse.json.invoice.number, /^INV-[A-Z0-9]+-[A-F0-9]+$/);
    assert.ok(invoiceResponse.json.invoice.id);

    const updateCustomerResponse = await request(port, `/api/workspaces/${workspaceId}/customers/${customerResponse.json.customer.id}`, {
      method: 'PATCH',
      headers: authHeader,
      body: {
        name: 'Northwind Foods Ltd',
        phone: '0712345678',
        email: 'northwind@new.example',
        notes: 'Updated account',
      },
    });

    assert.equal(updateCustomerResponse.status, 200);
    assert.equal(updateCustomerResponse.json.customer.name, 'Northwind Foods Ltd');

    const inventoryResponse = await request(port, `/api/workspaces/${workspaceId}/inventory`, {
      method: 'POST',
      headers: authHeader,
      body: {
        name: 'Office Chair',
        sku: 'CHAIR-001',
        category: 'Furniture',
        stock_quantity: 12,
        unit_price_cents: 25000,
        cost_price_cents: 18000,
        notes: 'Ergonomic seat',
      },
    });

    assert.equal(inventoryResponse.status, 201);
    assert.equal(inventoryResponse.json.inventory.name, 'Office Chair');

    const secondUser = {
      name: 'Member User',
      email: `member-${Date.now()}@example.com`,
      password: 'memberpass123',
    };

    const secondRegisterResponse = await request(port, '/api/auth/register', {
      method: 'POST',
      body: secondUser,
    });

    assert.equal(secondRegisterResponse.status, 201);
    const secondToken = secondRegisterResponse.json.token;

    const memberListBefore = await request(port, `/api/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${registerResponse.json.token}` },
    });

    assert.equal(memberListBefore.status, 200);
    assert.ok(memberListBefore.json.members.some(member => member.email === registerPayload.email));

    const addMemberResponse = await request(port, `/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${registerResponse.json.token}` },
      body: {
        email: secondUser.email,
        role: 'member',
        permissions: { invoices: 'approve', expenses: 'view', customers: 'edit', inventory: 'view', reports: 'view', settings: 'none' },
      },
    });

    assert.equal(addMemberResponse.status, 201);
    assert.equal(addMemberResponse.json.member.email, secondUser.email);

    const secondMemberList = await request(port, `/api/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${secondToken}` },
    });

    assert.equal(secondMemberList.status, 200);
    assert.ok(secondMemberList.json.members.some(member => member.email === secondUser.email));

    const updateMemberResponse = await request(port, `/api/workspaces/${workspaceId}/members/${secondRegisterResponse.json.user.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${registerResponse.json.token}` },
      body: {
        role: 'admin',
        permissions: { invoices: 'approve', expenses: 'approve', customers: 'edit', inventory: 'edit', reports: 'view', settings: 'admin' },
      },
    });

    assert.equal(updateMemberResponse.status, 200);
    assert.equal(updateMemberResponse.json.member.role, 'admin');
  });
});
