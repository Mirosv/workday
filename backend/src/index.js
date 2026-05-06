import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter           from './routes/auth.js';
import businessSettingsRouter from './routes/businessSettings.js';
import employeesRouter      from './routes/employees.js';
import bookingsRouter       from './routes/bookings.js';
import stripeRouter         from './routes/stripe.js';
import plaidRouter          from './routes/plaid.js';
import { crudRouter }       from './routes/crud.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));

// ── Stripe webhook needs raw body BEFORE express.json() ──────────────────────
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// ── JSON body parser ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Business Settings (custom router) ─────────────────────────────────────────
app.use('/api/business-settings', businessSettingsRouter);

// ── Employees (custom router with user creation) ──────────────────────────────
app.use('/api/employees', employeesRouter);

// ── Bookings (custom: includes public route) ──────────────────────────────────
app.use('/api/bookings', bookingsRouter);

// ── Integrations ──────────────────────────────────────────────────────────────
app.use('/api/stripe', stripeRouter);
app.use('/api/plaid',  plaidRouter);

// ── CRUD entities (auto-generated, tenant-scoped) ─────────────────────────────
app.use('/api/jobs', crudRouter('jobs', [
  'client_name','client_phone','client_email','job_name','job_address',
  'total_price','grand_total','status','priority','date','follow_up_date',
  'invoice_number','notes','internal_notes','services',
  'labor_rate','labor_hours','overhead_pct','profit_pct','discount',
  'minimum_fee','equipment_wear','equipment_wear_on',
  'materials_consumables','materials_on','disposal_fees','disposal_on',
  'travel_mobilization','travel_on','business_name','business_phone','business_address',
]));

app.use('/api/time-entries', crudRouter('time_entries', [
  'business_owner_email','employee_id','employee_name',
  'clock_in','clock_out','clock_in_lat','clock_in_lng',
  'clock_out_lat','clock_out_lng','clock_in_address','clock_out_address',
  'duration_minutes','status','notes',
], { adminOnly: false }));

app.use('/api/expenses', crudRouter('expenses', [
  'name','amount','date','job_id','job_name',
  'category','tax_category','payment_method','receipt_ref',
]));

app.use('/api/available-slots', crudRouter('available_slots', [
  'date','time_slot','max_bookings','service_label','is_active',
], { publicRead: true }));

app.use('/api/time-off-requests', crudRouter('time_off_requests', [
  'business_owner_email','employee_id','employee_name',
  'start_date','end_date','reason','type','status','admin_notes',
], { adminOnly: false }));

app.use('/api/mileage-logs', crudRouter('mileage_logs', [
  'date','description','from_location','to_location',
  'odometer_start','odometer_end','business_miles','vehicle',
  'job_id','job_name','notes',
]));

app.use('/api/owner-transactions', crudRouter('owner_transactions', [
  'date','transaction_type','amount','description',
  'counterparty_name','counterparty_country','payment_method',
  'reference_number','account','tax_year','notes',
]));

app.use('/api/reconcile-matches', crudRouter('reconcile_matches', [
  'owner_email','plaid_transaction_id','plaid_date','plaid_name',
  'plaid_amount','expense_id','expense_name','status','notes',
]));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WorkDay API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
