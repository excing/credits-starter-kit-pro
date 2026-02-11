import {
    boolean,
    integer,
    bigint,
    index,
    pgTable,
    text,
    timestamp,
    jsonb,
} from 'drizzle-orm/pg-core';

// Better Auth Tables
export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    deletedAt: timestamp('deletedAt')
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const rateLimit = pgTable("rate_limit", {
    id: text("id").primaryKey(),
    key: text("key"),
    count: integer("count"),
    lastRequest: bigint("last_request", { mode: "number" }),
}, (table) => [
    index('idx_rate_limit_key').on(table.key),
]);

// Credits System Tables

// 1. Credit Package - 积分套餐表（核心表）
export const creditPackage = pgTable('credit_package', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    credits: integer('credits').notNull(),
    validityDays: integer('validity_days').notNull(),
    price: integer('price'),
    currency: text('currency').default('CNY'),
    packageType: text('package_type').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
});

// 2. User Credit Package - 用户拥有的积分套餐表
export const userCreditPackage = pgTable('user_credit_package', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    packageId: text('package_id').notNull()
        .references(() => creditPackage.id, { onDelete: 'cascade' }),
    // 套餐快照：记录购买/兑换时的套餐信息，不受后续套餐修改影响
    packageName: text('package_name').notNull(),
    creditsTotal: integer('credits_total').notNull(),
    creditsRemaining: integer('credits_remaining').notNull(),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    source: text('source').notNull(),
    sourceId: text('source_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow()
});

// 3. Credit Transaction - 积分交易记录表
export const creditTransaction = pgTable('credit_transaction', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    userPackageId: text('user_package_id')
        .references(() => userCreditPackage.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    amount: integer('amount').notNull(),
    balanceBefore: integer('balance_before').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: text('description'),
    metadata: text('metadata'),
    relatedId: text('related_id'),
    operationId: text('operation_id'),
    createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => [
    index('idx_credit_transaction_operation_id').on(table.operationId),
    index('idx_credit_transaction_user_created').on(table.userId, table.createdAt),
]);

// 5. Redemption Code - 兑换码表
export const redemptionCode = pgTable('redemption_code', {
    id: text('id').primaryKey(),
    packageId: text('package_id').notNull()
        .references(() => creditPackage.id, { onDelete: 'cascade' }),
    maxUses: integer('max_uses').notNull().default(1),
    currentUses: integer('current_uses').notNull().default(0),
    codeExpiresAt: timestamp('code_expires_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
});

// 6. Redemption History - 兑换历史表
export const redemptionHistory = pgTable('redemption_history', {
    id: text('id').primaryKey(),
    codeId: text('code_id').notNull()
        .references(() => redemptionCode.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    packageId: text('package_id').notNull()
        .references(() => creditPackage.id, { onDelete: 'cascade' }),
    userPackageId: text('user_package_id').notNull()
        .references(() => userCreditPackage.id, { onDelete: 'cascade' }),
    creditsGranted: integer('credits_granted').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    redeemedAt: timestamp('redeemed_at').notNull().defaultNow()
});

// 7. Credit Debt - 积分欠费表
export const creditDebt = pgTable('credit_debt', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // 欠费金额（正数）
    operationType: text('operation_type').notNull(), // 操作类型
    metadata: text('metadata'), // 元数据（JSON字符串）
    relatedId: text('related_id'), // 关联ID
    isSettled: boolean('is_settled').notNull().default(false), // 是否已结清
    settledAt: timestamp('settled_at'), // 结清时间
    settledTransactionId: text('settled_transaction_id'), // 结清交易ID
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => [
    index('idx_credit_debt_user_settled').on(table.userId, table.isSettled),
]);
