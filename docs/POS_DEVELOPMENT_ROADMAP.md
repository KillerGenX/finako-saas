# 🚀 Finako POS SaaS - Development Roadmap

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Schema Design](#database-schema-design)
4. [Development Phases](#development-phases)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)

---

## 🎯 Project Overview

### Vision
Membangun aplikasi SaaS Point of Sale (POS) yang modern, scalable, dan user-friendly untuk UMKM dan retail stores.

### Target Users
- **Owners**: Pemilik toko/bisnis - full access
- **Managers**: Manajer toko - analytics & reports
- **Cashiers**: Kasir - sales transactions only

### Core Value Propositions
- ✅ Cloud-based (access anywhere)
- ✅ Multi-location support
- ✅ Real-time inventory tracking
- ✅ Comprehensive reporting
- ✅ Subscription-based pricing

---

## 🏗️ Architecture & Tech Stack

### Current Foundation (✅ Already Built)
```
Frontend: Next.js 15 (App Router, React 19)
Backend: Next.js API Routes + Server Actions
Database: PostgreSQL (Supabase)
ORM: Drizzle ORM
Auth: JWT (jose) + bcrypt
Payments: Stripe (subscription billing)
UI: Tailwind CSS + shadcn/ui
TypeScript: Full type safety
```

### Additional Technologies (To Add)
```
State Management: Zustand (for POS real-time state)
PDF Generation: react-pdf / jsPDF (receipts)
Barcode: react-barcode / jsbarcode
Charts: recharts (analytics)
Print: browser print API
Real-time: Supabase Realtime (for multi-user sync)
Testing: Vitest + Playwright
```

---

## 🗄️ Database Schema Design

### Existing Tables (✅)
- `users` - User accounts
- `teams` - Store/organization (multi-tenant)
- `team_members` - User-store relationships
- `activity_logs` - Audit trail
- `invitations` - Team member invites

### New Tables for POS (To Build)

#### Phase 2A: Product Management
```sql
-- Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id), -- nested categories
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  category_id INTEGER REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  cost_price DECIMAL(12,2) DEFAULT 0, -- harga modal
  selling_price DECIMAL(12,2) NOT NULL, -- harga jual
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0, -- low stock alert
  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Variants (size, color, etc)
CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL, -- "Size: Large", "Color: Red"
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  price_adjustment DECIMAL(12,2) DEFAULT 0, -- +/- dari base price
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Phase 2B: Sales & Transactions
```sql
-- Sales Transactions
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  user_id INTEGER NOT NULL REFERENCES users(id), -- kasir
  sale_number VARCHAR(50) UNIQUE NOT NULL, -- INV-2025-001
  customer_id INTEGER REFERENCES customers(id),
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- cash, card, qris
  payment_status VARCHAR(20) DEFAULT 'paid', -- paid, pending, refunded
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sales Items (line items)
CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_variant_id INTEGER REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL, -- qty * unit_price - discount
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments (untuk split payment)
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id),
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_number VARCHAR(100), -- for card/qris
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Phase 2C: Customers
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Phase 3A: Inventory Management
```sql
-- Stock Movements
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_variant_id INTEGER REFERENCES product_variants(id),
  movement_type VARCHAR(20) NOT NULL, -- in, out, adjustment, transfer
  quantity INTEGER NOT NULL, -- positive or negative
  reference_type VARCHAR(50), -- sale, purchase, adjustment
  reference_id INTEGER, -- sale_id, purchase_id, etc
  user_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, received, cancelled
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL
);
```

---

## 🎯 Development Phases

## **PHASE 1: Foundation Setup** ✅ COMPLETED
**Duration**: 1 day (DONE!)

### Deliverables
- ✅ Next.js project setup
- ✅ Authentication system
- ✅ Multi-tenancy (teams)
- ✅ Database migrations
- ✅ Basic dashboard
- ✅ Activity logging
- ✅ Stripe billing (skipped for now)

### Testing
- ✅ Login/logout functionality
- ✅ Team member invitation
- ✅ Session management
- ✅ Database connection

---

## **PHASE 2A: Product Management**
**Duration**: 3-4 days
**Priority**: HIGH

### Features to Build
1. **Categories Management**
   - Create/edit/delete categories
   - Nested categories (optional)
   - Category listing

2. **Products CRUD**
   - Add new product
   - Edit product details
   - Set pricing (cost + selling)
   - Upload product image
   - Generate SKU/barcode
   - Set stock quantity
   - Low stock alerts
   - Archive/delete product

3. **Product Variants**
   - Add variants (size, color, etc)
   - Individual SKU per variant
   - Stock per variant

### UI Components Needed
```
/dashboard/products/
  - page.tsx (product list + search)
  - new/page.tsx (add product form)
  - [id]/page.tsx (edit product)
  - [id]/variants/page.tsx (manage variants)

/dashboard/categories/
  - page.tsx (category management)
```

### Implementation Steps

**Step 1: Database Schema**
```bash
# Create migration file
pnpm db:generate

# Add categories, products, product_variants tables
# Run migration
pnpm db:migrate
```

**Step 2: Create Drizzle Schema**
```typescript
// lib/db/schema.ts
export const categories = pgTable('categories', { ... });
export const products = pgTable('products', { ... });
export const productVariants = pgTable('product_variants', { ... });
```

**Step 3: Build Server Actions**
```typescript
// app/(dashboard)/products/actions.ts
export async function createProduct(data) { ... }
export async function updateProduct(id, data) { ... }
export async function deleteProduct(id) { ... }
export async function getProducts(teamId) { ... }
```

**Step 4: Build UI Components**
- Product list with search/filter
- Product form (shadcn/ui components)
- Image upload (Supabase Storage or Cloudinary)
- Barcode display

**Step 5: Add Routes**
```
/dashboard/products           → List
/dashboard/products/new       → Add
/dashboard/products/[id]      → Edit
/dashboard/categories         → Categories
```

### Testing Checklist
```
Product Management Tests:
□ Create new category
□ Create product with all fields
□ Upload product image
□ Generate barcode automatically
□ Edit product details
□ Set stock quantity
□ Create product variants
□ Search products by name/SKU
□ Filter by category
□ Low stock alert shows correctly
□ Soft delete product
□ Restore deleted product
□ Check multi-tenant isolation (product only visible to own team)
```

### Acceptance Criteria
- ✅ Owner/Manager can add products
- ✅ Products organized by categories
- ✅ Stock levels tracked
- ✅ Low stock alerts visible
- ✅ Products searchable by name/SKU/barcode
- ✅ Image upload works
- ✅ Multi-tenant isolation (teams can't see each other's products)

---

## **PHASE 2B: Sales & POS Interface**
**Duration**: 5-7 days
**Priority**: CRITICAL

### Features to Build

1. **POS Sales Screen**
   - Product search (by name, SKU, barcode)
   - Cart management (add, remove, update qty)
   - Quick category buttons
   - Customer selection
   - Discount application
   - Tax calculation
   - Multiple payment methods
   - Print receipt

2. **Sales Management**
   - Sales history
   - View sale details
   - Refund/void transaction
   - Daily sales report

### UI Components Needed
```
/dashboard/pos/
  - page.tsx (main POS interface)
  
/dashboard/sales/
  - page.tsx (sales history)
  - [id]/page.tsx (sale details)
  - [id]/receipt/page.tsx (receipt view)
```

### POS Interface Design
```
┌─────────────────────────────────────────────────────────┐
│  🏪 FINAKO POS                    🔍 Search Product     │
├──────────────────┬──────────────────────────────────────┤
│  Categories      │  Cart                                │
│  ┌────────────┐  │  ┌────────────────────────────────┐ │
│  │ All        │  │  │ Product A      x2    Rp 20.000 │ │
│  │ Foods      │  │  │ Product B      x1    Rp 15.000 │ │
│  │ Drinks     │  │  │                                 │ │
│  │ Snacks     │  │  └────────────────────────────────┘ │
│  └────────────┘  │                                      │
│                  │  Subtotal:           Rp 35.000      │
│  Products        │  Tax (11%):          Rp  3.850      │
│  ┌────┐ ┌────┐  │  Discount:           Rp      0      │
│  │ 🍕 │ │ 🍔 │  │  ─────────────────────────────────  │
│  │A   │ │B   │  │  TOTAL:              Rp 38.850      │
│  └────┘ └────┘  │                                      │
│                  │  [ Cash ] [ Card ] [ QRIS ]         │
│                  │  [ 💳 CHARGE ]                       │
└──────────────────┴──────────────────────────────────────┘
```

### Implementation Steps

**Step 1: Database Schema**
```bash
# Add sales, sale_items, payments, customers tables
pnpm db:generate
pnpm db:migrate
```

**Step 2: Build POS State Management**
```typescript
// lib/stores/pos-store.ts (using Zustand)
interface POSStore {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}
```

**Step 3: Build Server Actions**
```typescript
// app/(dashboard)/pos/actions.ts
export async function createSale(data) { ... }
export async function getSales(teamId) { ... }
export async function getSaleById(id) { ... }
export async function refundSale(id) { ... }
```

**Step 4: Build POS UI**
- Product grid with quick add
- Shopping cart component
- Payment modal
- Receipt printer component
- Barcode scanner integration

**Step 5: Receipt Generation**
```typescript
// lib/receipt/generator.ts
export function generateReceipt(sale: Sale) {
  // Generate PDF or printable HTML
}
```

### Testing Checklist
```
POS Sales Tests:
□ Search product by name
□ Search product by barcode (manual input)
□ Add product to cart
□ Update quantity in cart
□ Remove product from cart
□ Apply discount to item
□ Apply discount to total
□ Select customer
□ Calculate tax correctly
□ Process cash payment
□ Process card payment
□ Process split payment (cash + card)
□ Print receipt
□ View sales history
□ View sale details
□ Stock deducted after sale
□ Refund transaction
□ Multi-user: 2 kasir concurrent sales (no conflict)
```

### Performance Requirements
- Product search: < 200ms
- Add to cart: instant (optimistic update)
- Complete transaction: < 1s
- Receipt print: < 2s

### Acceptance Criteria
- ✅ Kasir can quickly find products
- ✅ Cart updates in real-time
- ✅ Payment processing smooth
- ✅ Receipt prints correctly
- ✅ Stock auto-deducted
- ✅ Sales recorded with correct info
- ✅ Multi-payment method support

---

## **PHASE 2C: Customer Management**
**Duration**: 2-3 days
**Priority**: MEDIUM

### Features to Build
1. **Customer Database**
   - Add customer
   - Edit customer info
   - View purchase history
   - Customer search

2. **Loyalty Program (Basic)**
   - Points per transaction
   - View points balance
   - Redeem points for discount

### UI Components
```
/dashboard/customers/
  - page.tsx (customer list)
  - new/page.tsx (add customer)
  - [id]/page.tsx (customer details + history)
```

### Implementation Steps

**Step 1: Database**
```bash
# Add customers table
pnpm db:generate
pnpm db:migrate
```

**Step 2: Server Actions**
```typescript
// app/(dashboard)/customers/actions.ts
export async function createCustomer(data) { ... }
export async function getCustomers(teamId) { ... }
export async function getCustomerSales(customerId) { ... }
export async function updateLoyaltyPoints(customerId, points) { ... }
```

**Step 3: Integrate with POS**
- Customer selection in POS
- Auto-add points after sale
- Show points balance in receipt

### Testing Checklist
```
Customer Management Tests:
□ Create new customer
□ Edit customer details
□ Search customer by name/phone
□ View customer purchase history
□ Loyalty points added after sale
□ Loyalty points deducted on redemption
□ Customer data multi-tenant isolated
```

### Acceptance Criteria
- ✅ Customer database maintained
- ✅ Purchase history tracked
- ✅ Loyalty points work
- ✅ Quick customer lookup in POS

---

## **PHASE 3A: Inventory Management**
**Duration**: 4-5 days
**Priority**: HIGH

### Features to Build

1. **Stock Movements**
   - View all stock movements
   - Manual stock adjustment
   - Stock transfer between locations (future)

2. **Purchase Orders**
   - Create purchase order
   - Receive stock
   - Update product cost

3. **Inventory Reports**
   - Current stock levels
   - Stock movement history
   - Low stock report
   - Stock value report

### UI Components
```
/dashboard/inventory/
  - page.tsx (stock overview)
  - movements/page.tsx (stock history)
  - adjustment/page.tsx (manual adjustment)
  - low-stock/page.tsx (low stock alerts)

/dashboard/purchases/
  - page.tsx (purchase orders list)
  - new/page.tsx (create PO)
  - [id]/page.tsx (PO details + receive)
```

### Implementation Steps

**Step 1: Database**
```bash
# Add stock_movements, suppliers, purchases tables
pnpm db:generate
pnpm db:migrate
```

**Step 2: Build Stock Movement Logic**
```typescript
// lib/inventory/stock.ts
export async function recordStockMovement({
  productId,
  quantity,
  type, // 'in', 'out', 'adjustment'
  referenceType,
  referenceId
}) {
  // Update product.stock_quantity
  // Create stock_movements record
}
```

**Step 3: Auto Stock Deduction**
```typescript
// Integrate with sales
// After sale is completed:
- Deduct stock from products
- Record stock movement (type: 'out', reference: sale_id)
```

**Step 4: Build UI**
- Stock level dashboard
- Stock movement history table
- Manual adjustment form
- Purchase order form

### Testing Checklist
```
Inventory Tests:
□ Stock deducted automatically after sale
□ Stock movement recorded correctly
□ Manual stock adjustment works
□ Create purchase order
□ Receive purchase order (stock increased)
□ Low stock alert shows
□ Stock value calculated correctly
□ Stock movement history accurate
□ Multi-location stock (if implemented)
```

### Acceptance Criteria
- ✅ Stock levels always accurate
- ✅ All movements tracked
- ✅ Low stock alerts work
- ✅ Purchase orders streamlined
- ✅ Stock reports available

---

## **PHASE 3B: Reporting & Analytics**
**Duration**: 4-5 days
**Priority**: MEDIUM-HIGH

### Features to Build

1. **Sales Reports**
   - Daily sales summary
   - Sales by date range
   - Sales by product
   - Sales by category
   - Sales by cashier
   - Revenue trends (charts)

2. **Product Reports**
   - Top selling products
   - Slow moving products
   - Profit margin analysis

3. **Financial Reports**
   - Revenue vs cost
   - Profit/loss
   - Tax reports

4. **Dashboard Analytics**
   - Real-time sales today
   - Revenue graph (7/30 days)
   - Top products widget
   - Low stock alerts

### UI Components
```
/dashboard/reports/
  - page.tsx (reports hub)
  - sales/page.tsx (sales reports)
  - products/page.tsx (product reports)
  - financial/page.tsx (financial reports)
  
/dashboard/ (main dashboard)
  - Enhanced with analytics widgets
```

### Implementation Steps

**Step 1: Build Queries**
```typescript
// lib/db/reports.ts
export async function getSalesByDateRange(teamId, startDate, endDate) { ... }
export async function getTopProducts(teamId, limit) { ... }
export async function getRevenueByDay(teamId, days) { ... }
export async function getProfitMargin(teamId) { ... }
```

**Step 2: Add Charts**
```bash
npm install recharts
```

**Step 3: Build Report Pages**
- Date range picker
- Export to CSV/PDF
- Charts & graphs
- Summary cards

**Step 4: Dashboard Widgets**
```typescript
// Dashboard components
- TodaySalesCard
- RevenueChart (7 days)
- TopProductsTable
- LowStockAlerts
```

### Testing Checklist
```
Reporting Tests:
□ Sales report shows correct totals
□ Date range filter works
□ Charts render correctly
□ Top products accurate
□ Profit calculation correct
□ Export to CSV works
□ Dashboard loads in < 2s
□ Real-time updates work
□ Multi-tenant report isolation
```

### Acceptance Criteria
- ✅ Comprehensive sales reports
- ✅ Visual analytics (charts)
- ✅ Export functionality
- ✅ Real-time dashboard
- ✅ Accurate calculations

---

## **PHASE 4: Advanced Features**
**Duration**: 6-8 days
**Priority**: LOW-MEDIUM

### Features to Build (Pick based on priority)

1. **Multi-Location Support**
   - Store/outlet management
   - Stock per location
   - Inter-store transfers
   - Consolidated reporting

2. **Hardware Integration**
   - Receipt printer API
   - Barcode scanner
   - Cash drawer
   - Customer display

3. **Employee Management**
   - Extended roles (manager, supervisor)
   - Shift management
   - Employee performance reports
   - Commission calculation

4. **Advanced Loyalty**
   - Tier-based loyalty
   - Special promotions
   - Birthday rewards
   - Referral program

5. **Mobile App**
   - React Native / PWA
   - Mobile POS
   - Inventory checker
   - Sales dashboard

---

## 🧪 Testing Strategy

### Unit Testing
```bash
# Setup Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Test files location
__tests__/
  - lib/
    - inventory.test.ts
    - calculations.test.ts
  - components/
    - pos-cart.test.tsx
    - product-form.test.tsx
```

### Example Unit Tests
```typescript
// __tests__/lib/calculations.test.ts
import { calculateTotal, calculateTax } from '@/lib/pos/calculations';

describe('POS Calculations', () => {
  it('should calculate correct total', () => {
    const items = [
      { price: 10000, quantity: 2 },
      { price: 5000, quantity: 1 }
    ];
    expect(calculateTotal(items)).toBe(25000);
  });

  it('should calculate tax correctly', () => {
    expect(calculateTax(100000, 11)).toBe(11000);
  });
});
```

### Integration Testing
```bash
# Setup Playwright
npm install -D @playwright/test

# E2E tests location
e2e/
  - auth.spec.ts
  - products.spec.ts
  - pos.spec.ts
  - sales.spec.ts
```

### Example E2E Test
```typescript
// e2e/pos.spec.ts
import { test, expect } from '@playwright/test';

test('complete sale flow', async ({ page }) => {
  // Login
  await page.goto('/sign-in');
  await page.fill('[name="email"]', 'test@test.com');
  await page.fill('[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Go to POS
  await page.goto('/dashboard/pos');

  // Add product to cart
  await page.click('[data-testid="product-1"]');
  
  // Verify cart
  await expect(page.locator('[data-testid="cart"]')).toContainText('Product A');

  // Complete sale
  await page.click('[data-testid="payment-cash"]');
  await page.click('[data-testid="charge-button"]');

  // Verify success
  await expect(page.locator('[data-testid="receipt"]')).toBeVisible();
});
```

### Testing Checklist per Phase

**Phase 2A (Products): 15 tests**
- CRUD operations
- Search/filter
- Multi-tenant isolation
- Validation

**Phase 2B (POS): 20 tests**
- Cart operations
- Payment processing
- Receipt generation
- Stock deduction
- Multi-user concurrent sales

**Phase 2C (Customers): 10 tests**
- CRUD operations
- Loyalty points
- Purchase history

**Phase 3A (Inventory): 15 tests**
- Stock movements
- Purchase orders
- Stock calculations
- Alerts

**Phase 3B (Reports): 12 tests**
- Report accuracy
- Date filters
- Chart rendering
- Export functionality

**Total: ~72 automated tests**

---

## 🚀 Deployment Plan

### Development Environment
```
Platform: GitHub Codespaces
Database: Supabase (Development)
Domain: *.app.github.dev
```

### Staging Environment
```
Platform: Vercel (Preview deployments)
Database: Supabase (Staging)
Domain: finako-staging.vercel.app
```

### Production Environment
```
Platform: Google Cloud Run
Database: Supabase (Production - Pooler)
CDN: Cloudflare
Domain: finako.app (custom domain)
```

### Deployment Steps

**1. Setup Cloud Run**
```bash
# Build Docker image
docker build -t gcr.io/PROJECT_ID/finako-pos .

# Push to Container Registry
docker push gcr.io/PROJECT_ID/finako-pos

# Deploy to Cloud Run
gcloud run deploy finako-pos \
  --image gcr.io/PROJECT_ID/finako-pos \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated
```

**2. Environment Variables**
```bash
# Set in Cloud Run
POSTGRES_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=https://finako.app
AUTH_SECRET=...
NODE_ENV=production
```

**3. Database Migration**
```bash
# Run migrations on production
pnpm db:migrate
```

**4. SSL & Domain**
- Setup custom domain in Cloud Run
- Configure Cloudflare DNS
- Enable SSL/TLS

---

## 📊 Success Metrics

### Phase 2 (Core POS)
- ✅ Product CRUD works flawlessly
- ✅ POS transaction time < 30 seconds
- ✅ Zero stock calculation errors
- ✅ Receipt prints successfully

### Phase 3 (Inventory & Reports)
- ✅ Stock accuracy 100%
- ✅ Reports load < 2 seconds
- ✅ Zero data inconsistencies

### Production
- ✅ 99.9% uptime
- ✅ Response time < 500ms (p95)
- ✅ Handle 50 concurrent users per store
- ✅ Zero data loss

---

## 🎯 Timeline Summary

```
Phase 1: Foundation          [✅ DONE]      1 day
Phase 2A: Products          [NEXT]         3-4 days
Phase 2B: POS Interface     [CRITICAL]     5-7 days
Phase 2C: Customers         [AFTER 2B]     2-3 days
Phase 3A: Inventory         [HIGH]         4-5 days
Phase 3B: Reports           [MEDIUM]       4-5 days
Phase 4: Advanced           [OPTIONAL]     6-8 days

Testing (parallel)                         Ongoing
Deployment Setup                           2 days

TOTAL ESTIMATED: 4-6 weeks for MVP
```

---

## ✅ Next Immediate Actions

### Week 1 (Starting Tomorrow)
1. **Day 1-2**: Setup database schema untuk products & categories
2. **Day 3-4**: Build product management UI
3. **Day 4-5**: Test & fix product features

### Week 2
1. **Day 1-3**: Build POS interface
2. **Day 4-5**: Implement payment processing
3. **Day 6-7**: Test & fix POS flow

### Week 3
1. **Day 1-2**: Customer management
2. **Day 3-5**: Inventory tracking
3. **Day 6-7**: Testing

### Week 4
1. **Day 1-3**: Reports & analytics
2. **Day 4-5**: Bug fixes & polish
3. **Day 6-7**: Deployment prep

---

## 📝 Notes & Considerations

### Security
- ✅ All API routes protected with authentication
- ✅ Multi-tenant isolation enforced
- ✅ Input validation with Zod
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ XSS prevention (React auto-escape)

### Performance
- ✅ Database indexes on frequently queried fields
- ✅ Pagination for large lists
- ✅ Image optimization (Next.js Image)
- ✅ Caching strategy (SWR)
- ✅ Code splitting (Next.js automatic)

### Scalability
- ✅ Stateless architecture (Cloud Run)
- ✅ Database connection pooling (Supabase)
- ✅ CDN for static assets
- ✅ Horizontal scaling ready

---

## 📞 Questions Before Starting Phase 2?

Before we start building Phase 2A (Products), konfirmasi:
1. Apakah struktur database sudah sesuai?
2. Ada fitur tambahan untuk product management?
3. Butuh demo/prototype UI dulu?
4. Timeline 4-6 weeks realistic?

**Ready to start? Let's build! 🚀**
