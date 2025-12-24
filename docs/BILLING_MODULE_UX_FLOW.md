# 💰 Finako Billing Module - User Flow & Architecture

## 📋 Table of Contents
1. [User Personas](#user-personas)
2. [Complete User Journey](#complete-user-journey)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [UI/UX Flow](#uiux-flow)
6. [API Endpoints](#api-endpoints)
7. [Implementation Plan](#implementation-plan)

---

## 👥 **User Personas**

### **Persona 1: Owner/Admin (Store Owner)**
```
Goal: Setup subscription, track spending, manage team
Needs:
- See subscription status
- Upgrade/downgrade plan
- View invoices & payment history
- Manage team members & limits
- Download invoices
```

### **Persona 2: Customer Support (Internal)**
```
Goal: Manage customer subscriptions manually if needed
Needs:
- Manual subscription creation
- Override payments
- Send payment reminders
- Refund processing
```

---

## 🎯 **Complete User Journey (New Sign-up to Active Subscription)**

### **STAGE 1: Sign Up & Create Store (Day 0)**

```
User Action Sequence:

┌─────────────────────────────────────────────────┐
│ 1. User visits /sign-up                         │
│    - Email & password form                      │
│    - "Create Account" button                    │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 2. System: Create user account                  │
│    - Hash password (bcrypt)                     │
│    - Generate JWT session                       │
│    - Store in DB                                │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 3. User redirected to /onboarding               │
│    - "Create Store" form                        │
│    - Input: Store name, phone, address          │
│    - "Next" button                              │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 4. System: Create Team (Store)                  │
│    - Create team record                         │
│    - Link user as team owner                    │
│    - Generate subscription_id                   │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ 5. User sees: Plan Selection Screen             │
│    - Display 1 active plan (Basic - Rp 39.000)  │
│    - Show 2 locked plans (Coming Soon)          │
│    - Show features per plan                     │
│    - "Start 14-Day Free Trial" button           │
└────────────┬────────────────────────────────────┘
             │
             ↓
         [STAGE 2]
```

### **STAGE 2: Plan Selection & Trial Setup (Day 0)**

```
User Path A: FREE TRIAL (Most users)

┌─────────────────────────────────────────────────┐
│ User clicks "Select Plan" (any plan)            │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ System: Check Trial Eligibility                 │
│ - NEW customer? YES → AUTO APPROVE TRIAL        │
│ - Create subscription record:                   │
│   {                                             │
│     team_id: xyz                                │
│     plan_id: 'basic'  (only available plan)     │
│     status: 'trialing'                          │
│     trial_started: now                          │
│     trial_end: now + 14 days                    │
│     current_period_start: now                   │
│     current_period_end: trial_end               │
│   }                                             │
│ - Create FIRST INVOICE:                         │
│   {                                             │
│     subscription_id: abc123                     │
│     amount: 0 (trial)                           │
│     due_date: trial_end + 1 day                 │
│     status: 'draft' (not yet due)               │
│   }                                             │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ User Redirected: /dashboard/billing             │
│                                                 │
│ Shows:                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎉 Welcome to Basic Plan!                   │ │
│ │                                             │ │
│ │ FREE TRIAL STATUS                           │ │
│ │ ├─ Plan: Basic Plan (Rp 39.000/month)       │ │
│ │ ├─ Trial Ends: Jan 7, 2026 (14 days left)   │ │
│ │ ├─ Max Users: 3                             │ │
│ │ ├─ Max Products: 500                        │ │
│ │ └─ Features: [✓ list]                       │ │
│ │                                             │ │
│ │ NEXT STEPS:                                 │ │
│ │ 1️⃣  Add Payment Method                      │ │
│ │     "Add Card" button                       │ │
│ │     (Optional - before trial ends)          │ │
│ │                                             │ │
│ │ 2️⃣  Invite Team Members                     │ │
│ │     "Invite Team" button                    │ │
│ │                                             │ │
│ │ 3️⃣  Start Using App                         │ │
│ │     "Go to Dashboard" button                │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Subscriptions Table Created:**
```sql
{
  id: 'sub_123abc',
  team_id: 1,
  plan_id: 'basic',  -- Only Basic plan available in MVP
  status: 'trialing',  -- KEY: trialing status
  trial_started_at: '2025-12-24',
  trial_end_date: '2026-01-07',  -- 14 days trial
  current_period_start: '2025-12-24',
  current_period_end: '2026-01-07',
  cancel_at_period_end: false,
  created_at: '2025-12-24'
}
```

---

### **STAGE 3: Trial Period (Days 0-13)**

```
Day 0-13: User Using App for FREE

Timeline:
┌──────────────────────────────────────────┐
│ User actively using app                  │
│ ├─ Create products                       │
│ ├─ Process sales                         │
│ ├─ Invite team members                   │
│ └─ View dashboard                        │
│                                          │
│ Meanwhile (Automatic):                   │
│ ├─ Track feature usage                   │
│ ├─ Monitor team member count             │
│ └─ Check if hitting limits               │
└──────────────────────────────────────────┘

What happens at Day 10:

System Job (Cron - runs daily):
├─ Check all subscriptions with status='trialing'
├─ Calculate days_remaining = trial_end_date - today
└─ IF days_remaining <= 4 (i.e., 4 days left):
   └─ Send EMAIL REMINDER:
      Subject: "Your trial ends in 4 days - Add payment now!"
      Body: 
        "Hi [Name],
         Your Pro Plan trial ends on Jan 7, 2025.
         To keep using Finako after the trial, 
         please add a payment method now.
         
         [ADD PAYMENT METHOD BUTTON]"
```

---

### **STAGE 4: Add Payment Method (Days 0-13, Ideally Day 10)**

```
User Path: Add Payment Before Trial Ends

┌─────────────────────────────────────────────────┐
│ User clicks: "Add Payment Method"               │
│ (or gets email reminder & clicks link)          │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ User Redirected: /dashboard/billing/add-payment │
│                                                 │
│ Shows PAYMENT FORM:                             │
│ ┌──────────────────────────────────────────────┐│
│ │ Add Payment Method                           ││
│ │                                              ││
│ │ Choose Payment Method:                       ││
│ │ ☑ QRIS (Scan code)                          ││
│ │ ○ Bank Transfer (Virtual Account)            ││
│ │ ○ E-Wallet (GoPay, OVO, Dana)                ││
│ │ ○ Card (Credit/Debit)                        ││
│ │                                              ││
│ │ Selected: QRIS                               ││
│ │ Amount: Rp 39.000 (Basic Plan - 1 month)     ││
│ │                                              ││
│ │ [PROCEED TO PAYMENT] button                  ││
│ └──────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ System: Create Payment Record                   │
│ {                                               │
│   id: 'pay_abc123',                             │
│   subscription_id: 'sub_123abc',                │
│   invoice_id: 'inv_001',                        │
│   amount: 99000,                                │
│   currency: 'IDR',                              │
│   payment_method: 'qris',                       │
│   status: 'pending',                            │
│   payment_provider: 'xendit',                   │
│   payment_reference: 'xendit_charge_id',        │
│   created_at: now                               │
│ }                                               │
│                                                 │
│ Call Xendit API: create charge                  │
│ xendit.charge({                                 │
│   external_id: 'pay_abc123',                    │
│   amount: 39000,  -- Basic Plan price          │
│   payment_method: 'qr_code',                    │
│   ...                                           │
│ })                                              │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ User sees: QRIS Code to Scan                    │
│ ┌──────────────────────────────────────────────┐│
│ │ Scan QR Code dengan E-wallet Anda             ││
│ │  ┌────────────────────────┐                   ││
│ │  │ ▀█░ █▄░ ░ █▄░ ▄█░ █▄  │  (QRIS Code)   ││
│ │  │ ░▄░ ░██ █░ ░██ █░░ ██  │                   ││
│ │  │ █▄░ ░██ ░ █░░ █░░ ▀█░  │                   ││
│ │  └────────────────────────┘                   ││
│ │                                              ││
│ │ Atau gunakan:                                ││
│ │ GoPay | OVO | Dana | Transfer Manual         ││
│ │                                              ││
│ │ ⏱ Waiting for payment...                     ││
│ │ (Auto refresh setiap 10 detik)               ││
│ │                                              ││
│ │ Payment expires in: 15 min                    ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
             │
             ↓ (User scans & pays via e-wallet)
             │
         [MIDTRANS WEBHOOK]
```

---

### **STAGE 5: Payment Success (Webhook)**

```
Midtrans sends webhook: transaction.success

┌─────────────────────────────────────────────────┐
│ Our API: POST /api/payments/midtrans/webhook    │
│                                                 │
│ Webhook Payload:                                │
│ {                                               │
│   "order_id": "midtrans_order_id",              │
│   "transaction_id": "pay_abc123",              │
│   "transaction_status": "settlement",           │
│   "gross_amount": "39000",                      │
│   "..." "..."                                  │
│ }                                               │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ System Processing:                              │
│                                                 │
│ 1. Verify webhook signature (security)          │
│ 2. Find payment record by external_id           │
│ 3. Update payment status = 'completed'          │
│ 4. Update subscription:                         │
│    {                                            │
│      status: 'active'  (← trialing → active)    │
│      payment_method_id: 'pm_xyz'                │
│      last_payment_date: now                     │
│      current_period_end: now + 1 month          │
│    }                                            │
│ 5. Update invoice status = 'paid'               │
│ 6. Schedule next invoice:                       │
│    Create new invoice for next month            │
│ 7. Send SUCCESS EMAIL to user                   │
│                                                 │
│ Database Updates:                               │
│ ├─ payments table: status = 'completed'         │
│ ├─ subscriptions table: status = 'active'       │
│ ├─ invoices table: status = 'paid'              │
│ └─ activity_logs: record payment                │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ User Redirected: /dashboard/billing/success     │
│                                                 │
│ Shows:                                          │
│ ┌──────────────────────────────────────────────┐│
│ │ ✅ Payment Successful!                        ││
│ │                                              ││
│ │ Details:                                      ││
│ │ ├─ Amount: Rp 39.000                         ││
│ │ ├─ Plan: Basic Plan                           ││
│ │ ├─ Valid Until: Jan 24, 2026                  ││
│ │ ├─ Next Billing: Jan 24, 2026                 ││
│ │ └─ Transaction ID: pay_abc123                 ││
│ │                                              ││
│ │ Your subscription is now ACTIVE!              ││
│ │ Thank you for choosing Finako.                ││
│ │                                              ││
│ │ [GO TO DASHBOARD]                             ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

### **STAGE 6: Active Subscription (Month 1)**

```
User is now PAYING CUSTOMER

Dashboard shows:

┌────────────────────────────────────────────────────┐
│ BILLING OVERVIEW                                   │
├────────────────────────────────────────────────────┤
│                                                    │
│ Current Plan: Pro Plan                             │
│ Price: Rp 99.000/month                             │
│ Billing Cycle: Dec 24, 2025 - Jan 24, 2026        │
│ Status: ✅ ACTIVE                                  │
│ Days Left: 30/30                                   │
│                                                    │
│ PAYMENT METHOD:                                    │
│ QRIS (GoPay) - ending in ...                       │
│ [Change Payment Method]                            │
│                                                    │
│ ACTIONS:                                           │
│ [Upgrade Plan] [Cancel Subscription]               │
│ [Download Invoice] [View Payment History]          │
│                                                    │
│ RECENT INVOICES:                                   │
│ ┌─────────────────────────────────────────────┐   │
│ │ INV-2025-001  Dec 24, 2025  Rp 99.000  ✅   │   │
│ │ INV-2025-002  Jan 24, 2026  Rp 99.000  ⏳   │   │
│ └─────────────────────────────────────────────┘   │
│                                                    │
└────────────────────────────────────────────────────┘

What happens on Jan 23 (1 day before renewal):

System Job (Cron):
├─ Check subscriptions with renewal date = tomorrow
├─ For each: Create payment reminder
└─ Send PAYMENT REMINDER EMAIL:
   "Your subscription renews tomorrow.
    Amount: Rp 99.000
    [View Details]"
```

---

### **STAGE 7: Auto-Renewal (Month 2+)**

```
Day 24 (Auto-renewal date):

System Job (Cron) - runs at midnight:

1. Check all subscriptions with status='active'
2. Filter by: current_period_end = today
3. For each subscription:
   ├─ Get payment_method
   ├─ Create new invoice for next month
   ├─ Process charge via Midtrans:
   │  midtrans.createTransaction({
   │    external_id: invoice_id,
   │    amount: plan_price,
   │    ...
   │  })
   ├─ Update subscription.current_period_end += 1 month
   └─ Handle success/failure

SCENARIO A: Payment Success
└─ Update invoice status = 'paid'
   Update subscription = 'active'
   Send receipt email

SCENARIO B: Payment Failed
├─ Update invoice status = 'failed'
├─ Update subscription status = 'past_due'
├─ Schedule retry:
│  Retry 1: After 3 days
│  Retry 2: After 7 days
│  Retry 3: After 10 days
└─ Send URGENT EMAIL:
   "Payment failed - Please update payment method"
   [Fix Payment Button]

SCENARIO C: Payment Declined After 3 Retries
├─ Update subscription status = 'suspended'
├─ Features disabled:
│  - Can't create/edit products
│  - Can't process sales
│  - View-only access
└─ Send SUSPENSION EMAIL:
   "Your subscription has been suspended due to 
    failed payments. Please contact support."
```

---

## 🏗️ **System Architecture**

### **High-Level Flow**

```
┌──────────────────────────────────────────────────────┐
│                    FINAKO APP                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Frontend (Next.js)                                  │
│  ├─ /dashboard/billing (Subscription status)        │
│  ├─ /dashboard/billing/plans (Select plan)          │
│  ├─ /dashboard/billing/payment (Add payment)        │
│  ├─ /dashboard/billing/invoices (Invoice list)      │
│  └─ /dashboard/billing/settings (Manage billing)    │
│                                                      │
│  Server Actions (lib/billing/actions.ts)            │
│  ├─ selectPlan()                                    │
│  ├─ updatePaymentMethod()                           │
│  ├─ upgradeSubscription()                           │
│  ├─ cancelSubscription()                            │
│  └─ ...                                             │
│                                                      │
│  API Routes (/api/payments/)                        │
│  ├─ POST /midtrans/charge (Create transaction)     │
│  ├─ POST /midtrans/webhook (Handle callback)       │
│  ├─ POST /invoices (Generate invoice)              │
│  └─ GET /subscriptions (Check status)              │
│                                                      │
│  Cron Jobs (lib/jobs/billing.ts)                    │
│  ├─ Daily: Check trial ends                        │
│  ├─ Daily: Send reminders                          │
│  ├─ Daily: Process auto-renewals                   │
│  └─ Daily: Handle failed payments                  │
│                                                      │
│  Database (PostgreSQL)                              │
│  ├─ subscription_plans                             │
│  ├─ subscriptions                                  │
│  ├─ invoices                                       │
│  ├─ payments                                       │
│  └─ payment_methods                                │
│                                                      │
└───────────────────┬──────────────────────────────────┘
                    │
                    ↓
        ┌───────────────────────┐
        │   Midtrans API        │
        ├───────────────────────┤
        │ Payment Processing    │
        │ - Create charge       │
        │ - Get status          │
        │ - Refund              │
        │ - Webhook callback    │
        └───────────────────────┘
```

---

## 🗄️ **Database Schema**

### **Subscription Plans Table**
```sql
CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY, -- 'basic', 'pro', 'enterprise'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(12,2) NOT NULL,
  price_yearly DECIMAL(12,2),
  max_users INTEGER,
  max_products INTEGER,
  max_outlets INTEGER,
  features JSONB, -- {invoicing: true, reports: true, ...}
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MVP Data (Only Basic Plan Active):
{id: 'basic', name: 'Basic Plan', price_monthly: 39000, max_users: 3, max_products: 500, is_active: true}
{id: 'pro', name: 'Pro Plan', price_monthly: 99000, max_users: 10, max_products: null, is_active: false}
{id: 'enterprise', name: 'Enterprise', price_monthly: 299000, unlimited: true, is_active: false}
```

### **Subscriptions Table** (Most Important)
```sql
CREATE TABLE subscriptions (
  id VARCHAR(50) PRIMARY KEY, -- 'sub_123abc'
  team_id INTEGER NOT NULL REFERENCES teams(id),
  plan_id VARCHAR(50) REFERENCES subscription_plans(id),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL, -- 'trialing', 'active', 'past_due', 'suspended', 'cancelled'
  
  -- Trial info
  trial_started_at TIMESTAMP,
  trial_end_date TIMESTAMP,
  
  -- Billing cycle
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  
  -- Payment method
  payment_method_id VARCHAR(100), -- Reference to payment method
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
```

### **Invoices Table**
```sql
CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY, -- 'inv_2025_001'
  subscription_id VARCHAR(50) REFERENCES subscriptions(id),
  team_id INTEGER REFERENCES teams(id),
  
  -- Amount & tax
  amount DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  
  -- Timeline
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'paid', 'failed', 'void'
  
  -- Items
  line_items JSONB, -- [{plan: 'Pro', quantity: 1, amount: 99000}, ...]
  
  -- Metadata
  invoice_number VARCHAR(20), -- INV-2025-001
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_team_id ON invoices(team_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

### **Payments Table**
```sql
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY, -- 'pay_abc123'
  invoice_id VARCHAR(50) REFERENCES invoices(id),
  subscription_id VARCHAR(50) REFERENCES subscriptions(id),
  
  -- Amount
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  
  -- Payment method
  payment_method VARCHAR(50), -- 'qris', 'bank_transfer', 'card', 'e_wallet'
  payment_provider VARCHAR(50), -- 'midtrans'
  payment_reference VARCHAR(100), -- order_id from Midtrans
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  -- Metadata
  payment_url TEXT, -- Payment link for customer
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
```

### **Payment Methods Table**
```sql
CREATE TABLE payment_methods (
  id VARCHAR(50) PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  
  -- Method info
  type VARCHAR(50), -- 'qris', 'bank_transfer', 'card', 'e_wallet'
  provider VARCHAR(50), -- 'midtrans'
  provider_id VARCHAR(100), -- Reference from Midtrans
  
  -- Masked data (for display)
  display_name VARCHAR(100), -- "GoPay" or "BCA Transfer"
  last_four VARCHAR(10), -- Last 4 digits if card
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 **UI/UX Flow - Detailed Pages**

### **Page 1: /dashboard/billing (Main Billing Dashboard)**

```
┌─────────────────────────────────────────────────────┐
│ 🔙 Dashboard > Billing & Plans                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ CURRENT PLAN                                  │  │
│ │                                               │  │
│ │ Basic Plan                                    │  │
│ │ Rp 39.000/month                               │  │
│ │                                               │  │
│ │ ✅ ACTIVE  • Renews Jan 24, 2026              │  │
│ │ 30 days remaining in billing cycle            │  │
│ │                                               │  │
│ │ Included:                                     │  │
│ │ ✓ Up to 3 team members                        │  │
│ │ ✓ Up to 500 products                          │  │
│ │ ✓ Basic reports                               │  │
│ │ ✓ Email support                               │  │
│ │                                               │  │
│ │ 💡 More plans coming soon!                    │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ PAYMENT METHOD                                │  │
│ │                                               │  │
│ │ 📱 QRIS (GoPay)                               │  │
│ │ Added: Dec 24, 2025                           │  │
│ │ Default: ✓                                    │  │
│ │                                               │  │
│ │ [CHANGE PAYMENT METHOD]                       │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ RECENT INVOICES                               │  │
│ │                                               │  │
│ │ INV-2025-001  Dec 24, 2025  Rp 39.000  ✅    │  │
│ │ [Download PDF]                                │  │
│ │                                               │  │
│ │ INV-2026-002  Jan 24, 2026  Rp 39.000  ⏳    │  │
│ │                                               │  │
│ │ [VIEW ALL INVOICES]                           │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ DANGER ZONE                                   │  │
│ │ [CANCEL SUBSCRIPTION]                         │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Page 2: /dashboard/billing/plans (Select Plan - for upgrade/downgrade)**

```
┌─────────────────────────────────────────────────────┐
│ 🔙 Dashboard > Billing > Change Plan                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Current Plan: Basic Plan (Rp 39.000/month)          │
│                                                     │
│ ┌─────────────┬─────────────┬──────────────────┐   │
│ │   BASIC     │    PRO      │   ENTERPRISE     │   │
│ │ Rp 39.000   │ 🔒 LOCKED   │  🔒 LOCKED       │   │
│ ├─────────────┼─────────────┼──────────────────┤   │
│ │ • 3 users   │ Coming Soon │  Coming Soon     │   │
│ │ • 500 prod  │             │                  │   │
│ │ • 1 outlet  │             │                  │   │
│ │ ✓ CURRENT   │             │                  │   │
│ │             │             │                  │   │
│ │ [ACTIVE]    │ [NOTIFY ME] │ [NOTIFY ME]      │   │
│ └─────────────┴─────────────┴──────────────────┘   │
│                                                     │
│ 💡 More plans launching soon!                       │
│ Enter your email to be notified:                    │
│ [Email input] [NOTIFY ME]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Page 3: /dashboard/billing/invoices (All Invoices)**

```
┌─────────────────────────────────────────────────────┐
│ 🔙 Dashboard > Billing > Invoices                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Invoices                                            │
│ Filter: [All ▼] [Paid] [Pending] [Failed]          │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ INV-2025-002  Jan 24, 2026  Rp 99.000  ⏳   │  │
│ │ Status: Pending | Due: Jan 24, 2026           │  │
│ │ [View] [Download PDF]                         │  │
│ └────────6-002  Jan 24, 2026  Rp 39.000  ⏳   │  │
│ │ Status: Pending | Due: Jan 24, 2026           │  │
│ │ [View] [Download PDF]                         │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ INV-2025-001  Dec 24, 2025  Rp 39.000  ✅   │  │
│ │ Status: Paid | Paid: Dec 24, 2025             │  │
│ │ [View] [Download PDF]                         │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ INV-2025-012  Nov 24, 2025  Rp 3──────────────┘  │
│                                                     │
│                    [LOAD MORE]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Page 4: /dashboard/billing/payment (Add/Change Payment Method)**

```
┌─────────────────────────────────────────────────────┐
│ 🔙 Dashboard > Billing > Payment Method             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Current Payment Method: QRIS (GoPay)               │
│ Added: Dec 24, 2025 | Default: ✓                  │
│ [MAKE DEFAULT] [REMOVE]                            │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Add New Payment Method:                             │
│                                                     │
│ Select Payment Type:                                │
│ ○ QRIS (E-wallet scan)                             │
│ ○ Bank Transfer (Virtual Account)                  │
│ ○ E-Wallet (GoPay, OVO, Dana)                     │
│ ○ Credit/Debit Card                               │
│                                                     │
│ Amount: Rp 39.000 (next billing amount)            │
│                                                     │
│ [CONTINUE TO PAYMENT]                              │
│                                                     │
└─────────────────────────────────────────────────────┘

After selecting, redirected to:
/dashboard/billing/payment-pending
┌─────────────────────────────────────────────────────┐
│                                                     │
│ Scan QR Code:                                       │
│  ┌────────────────────────┐                        │
│  │ ▀█░ █▄░ ░ █▄░ ▄█░ █▄  │  ← QRIS Code          │
│  │ ░▄░ ░██ █░ ░██ █░░ ██  │                        │
│  │ █▄░ ░██ ░ █░░ █░░ ▀█░  │                        │
│  └────────────────────────┘                        │
│                                                     │
│ With GoPay | OVO | Dana | Or manual transfer      │
│                                                     │
│ ⏱ Expires in 15 minutes                            │
│                                                     │
│ [Payment pending... auto-refreshing]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 **API Endpoints**

### **Billing Management Endpoints**

```typescript
// Server Actions (lib/billing/actions.ts)
export async function selectPlan(planId: string) 
  → Creates subscription with trial

export async function upgradePlan(newPlanId: string)
  → Calculate proration
  → Create invoice
  → Process payment

export async function downgradePlan(newPlanId: string)
  → Calculate refund/credit
  → Update subscription
  → Effective next cycle

export async function addPaymentMethod(paymentData)
  → Create payment method
  → Return payment link

export async function cancelSubscription(reason?: string)
  → Set cancel_at_period_end = true
  → Send cancellation email
  → Schedule features shutdown

export async function updateDefaultPaymentMethod(methodId)
  → Update default in payment_methods table

// API Routes (app/api/)
POST /api/payments/xendit/charge
  → Create payment link
  
POST /api/payments/xendit/webhook
  → Handle Xendit callback
  
GET /api/subscriptions/status
  → Get subscription details
  
POST /api/invoices/generate
  → Generate invoice (manual or auto)
  
GET /api/invoices/list
  → Get invoices for team
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Database & Backend (3-4 days)**

**Day 1: Database Setup**
```bash
# Create migrations
pnpm db:generate

# Add tables:
- subscription_plans
- subscriptions
- invoices
- payments
- payment_methods

pnpm db:migrate
```

**Day 2: Database Queries & Schema**
```typescript
// lib/db/queries/billing.ts
- getSubscriptionPlans()
- getUserSubscription()
- getInvoices()
- getPayments()
- etc.
```

**Day 3: Midtrans Integration**
```typescript
// lib/payments/midtrans.ts
- createTransaction()
- createRecurringTransaction()
- getTransactionStatus()
- refund()
```

**Day 4: Server Actions**
```typescript
// app/(dashboard)/billing/actions.ts
- selectPlan()
- upgradePlan()
- cancelSubscription()
- addPaymentMethod()
- etc.
```

### **Phase 2: API Routes & Webhooks (2 days)**

**Day 1: API Endpoints**
```typescript
// app/api/payments/
- midtrans/charge
- midtrans/webhook
- subscriptions/status
- invoices/generate
```

**Day 2: Cron Jobs**
```typescript
// lib/jobs/billing.ts
- checkTrialExpiring() - daily
- procesAutoRenewals() - daily
- sendPaymentReminders() - daily
- retryFailedPayments() - daily
```

### **Phase 3: Frontend UI (3-4 days)**

**Day 1-2: Billing Dashboard**
```typescript
/dashboard/billing/
  - page.tsx (main dashboard)
  - layout.tsx (navigation)
```

**Day 3: Plan Selection & Payment**
```typescript
/dashboard/billing/
  - plans/page.tsx
  - payment/page.tsx
  - payment-pending/page.tsx
```

**Day 4: Invoices & Settings**
```typescript
/dashboard/billing/
  - invoices/page.tsx
  - invoices/[id]/page.tsx
  - settings/page.tsx
```

### **Phase 4: Testing & Polish (2-3 days)**

**Day 1: Unit Tests**
```typescript
__tests__/lib/billing/
- subscriptions.test.ts
- calculations.test.ts
- proration.test.ts
```

**Day 2: Integration Tests**
```typescript
__tests__/api/payments/
- midtrans-webhook.test.ts
- charge.test.ts
```

**Day 3: E2E & Bug Fixes**
```typescript
e2e/billing.spec.ts
- Complete purchase flow
- Upgrade flow
- Cancel flow
```

---

## ✅ **Success Criteria**

### **Core Functionality**
- ✅ Sign up user → Automatic trial subscription
- ✅ Select plan → Create subscription + invoice
- ✅ Payment page → Generate Midtrans transaction
- ✅ Payment success → Update subscription status
- ✅ Auto-renewal → Process next month's charge
- ✅ Upgrade/downgrade → Proration calculation
- ✅ Cancel → Set cancellation date + warning

### **User Experience**
- ✅ Clear plan selection (3 tiers visible)
- ✅ Trial info prominent (days remaining)
- ✅ Payment flow under 5 steps
- ✅ Invoice download works
- ✅ Payment history visible

### **Reliability**
- ✅ Webhook signature validation
- ✅ Idempotent operations (safe retries)
- ✅ Proper error handling & logging
- ✅ Database consistency
- ✅ Email notifications work

### **Performance**
- ✅ Billing page loads < 2 seconds
- ✅ Payment processing < 1 second
- ✅ Invoice generation < 500ms
- ✅ Webhook processing < 1 second

---

## 🎯 **Questions Before We Start**

1. **Pricing Models**: Is 3-tier (Basic/Pro/Enterprise) good?
   - Or you want different pricing?

2. **Trial Duration**: 14 days good?
   - Or different duration?

3. **Billing Cycle**: Monthly only?
   - Or also support yearly?

4. **Auto-cancel Features**: Suspend after 3 failed attempts?
   - Or different strategy?

5. **Currency**: IDR only?
   - Or support multiple currencies?

6. **Invoice Details**: What should appear in invoice?
   - Plan name, amount, period, tax?

7. **Email Templates**: Need custom branding?
   - Or simple template?

---

**Ready to discuss & finalize this before implementation?** 🚀
