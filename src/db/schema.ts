import { pgTable, uuid, text, varchar, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    avatarUrl: text('avatar_url'),
    universityId: varchar('university_id', { length: 100 }),
    isAdmin: boolean('is_admin').default(false).notNull(),
    bio: text('bio'),
    isBlocked: boolean('is_blocked').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products Table
export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 300 }).notNull().unique(),
    description: text('description'),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 10 }).default('INR').notNull(),
    category: varchar('category', { length: 100 }),
    condition: varchar('condition', { length: 50 }), // new, like-new, good, fair
    images: jsonb('images').$type<string[]>().default([]),
    location: varchar('location', { length: 255 }),
    status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, available, sold, rejected
    viewsCount: integer('views_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders Table
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    sellerId: uuid('seller_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    status: varchar('status', { length: 50 }).default('placed').notNull(), // placed, confirmed, delivered, cancelled
    totalAmount: integer('total_amount').notNull(),
    paymentStatus: varchar('payment_status', { length: 50 }).default('pending').notNull(), // pending, paid, failed
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Wishlist Table
export const wishlist = pgTable('wishlist', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reports Table
export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 50 }).default('open').notNull(), // open, resolved, rejected
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
});

// Payment Transactions Table
export const paymentTransactions = pgTable('payment_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    razorpayOrderId: varchar('razorpay_order_id', { length: 255 }),
    razorpayPaymentId: varchar('razorpay_payment_id', { length: 255 }),
    amount: integer('amount').notNull(),
    status: varchar('status', { length: 50 }).default('created').notNull(), // created, paid, failed
    signature: text('signature'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    products: many(products),
    orders: many(orders),
    wishlist: many(wishlist),
    reports: many(reports),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
    user: one(users, {
        fields: [products.userId],
        references: [users.id],
    }),
    orders: many(orders),
    wishlist: many(wishlist),
    reports: many(reports),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
    product: one(products, {
        fields: [orders.productId],
        references: [products.id],
    }),
    buyer: one(users, {
        fields: [orders.buyerId],
        references: [users.id],
    }),
    seller: one(users, {
        fields: [orders.sellerId],
        references: [users.id],
    }),
    paymentTransactions: many(paymentTransactions),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
    user: one(users, {
        fields: [wishlist.userId],
        references: [users.id],
    }),
    product: one(products, {
        fields: [wishlist.productId],
        references: [products.id],
    }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
    product: one(products, {
        fields: [reports.productId],
        references: [products.id],
    }),
    reporter: one(users, {
        fields: [reports.reportedBy],
        references: [users.id],
    }),
    resolver: one(users, {
        fields: [reports.resolvedBy],
        references: [users.id],
    }),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
    order: one(orders, {
        fields: [paymentTransactions.orderId],
        references: [orders.id],
    }),
}));
