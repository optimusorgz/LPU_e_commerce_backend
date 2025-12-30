# Campus Marketplace Backend

Node.js + Express backend API with Drizzle ORM, Supabase PostgreSQL, Cloudflare R2 storage, and Razorpay payments.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Generate and run database migrations:
```bash
npm run db:generate
npm run db:migrate
```

## Development

```bash
npm run dev
```

Server runs on http://localhost:5000

## API Documentation

### Auth
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/me` - Update profile

### Products
- POST `/api/products` - Create product
- GET `/api/products` - List products (with filters)
- GET `/api/products/:id` - Get product details
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product

### Orders
- POST `/api/orders` - Create order
- GET `/api/orders` - Get user orders
- GET `/api/orders/:id` - Get order details

### Payments
- POST `/api/payments/create-order` - Create Razorpay order
- POST `/api/payments/verify` - Verify payment
- POST `/api/payments/webhook` - Razorpay webhook

### Admin (requires admin role)
- GET `/api/admin/stats` - Dashboard statistics
- GET `/api/admin/users` - List all users
- PUT `/api/admin/users/:userId/toggle-block` - Block/unblock user
- GET `/api/admin/products` - List all products
- PUT `/api/admin/products/:productId/approve` - Approve/reject product
- GET `/api/admin/orders` - List all orders
- PUT `/api/admin/orders/:orderId/status` - Update order status
- GET `/api/admin/reports` - List all reports
- PUT `/api/admin/reports/:reportId/resolve` - Resolve report

## Database Schema

See `src/db/schema.ts` for complete schema definitions.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Drizzle Studio
