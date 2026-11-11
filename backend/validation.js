const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().min(2).max(80).optional(),
  timezone: z.string().trim().max(80).optional(),
});

const customerSchema = z.object({
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(40).optional().default(''),
  email: z.string().trim().email().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().default(''),
});

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().min(0).max(1000000),
  unit_price_cents: z.number().int().min(0),
});

const invoiceSchema = z.object({
  customer_id: z.string().trim().optional(),
  customer: customerSchema.optional(),
  due_date: z.string().trim().optional(),
  status: z.enum(['draft', 'pending', 'paid', 'overdue']).optional().default('draft'),
  items: z.array(invoiceItemSchema).min(1),
});

const paymentSchema = z.object({
  invoice_id: z.string().trim().min(1),
  amount_cents: z.number().int().min(1),
  method: z.enum(['mpesa', 'bank_transfer', 'cash', 'card']).default('mpesa'),
  status: z.enum(['pending', 'settled', 'failed']).default('settled'),
});

const expenseSchema = z.object({
  vendor: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(250),
  category: z.string().trim().min(2).max(80),
  amount_cents: z.number().int().min(1),
  status: z.enum(['recorded', 'pending', 'paid']).default('recorded'),
});

const entrySchema = z.object({
  type: z.enum(['invoice', 'expense', 'payment', 'adjustment']),
  description: z.string().trim().min(1).max(250),
  amount_cents: z.number().int().min(0),
  customer_id: z.string().trim().optional(),
  status: z.enum(['pending', 'posted']).default('posted'),
});

const inventorySchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(2).max(80),
  category: z.string().trim().min(1).max(80),
  stock_quantity: z.number().int().min(0),
  unit_price_cents: z.number().int().min(0),
  cost_price_cents: z.number().int().min(0),
  notes: z.string().trim().max(500).optional().default(''),
});

module.exports = {
  registerSchema,
  loginSchema,
  workspaceSchema,
  customerSchema,
  invoiceSchema,
  paymentSchema,
  expenseSchema,
  entrySchema,
  inventorySchema,
};
