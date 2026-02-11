// 用户侧积分类型定义

export interface UserTransaction {
	id: string;
	type: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	description: string;
	createdAt: string;
	metadata?: Record<string, unknown>;
	operationId?: string;
	relatedId?: string;
}

export interface UserPackage {
	id: string;
	packageId: string;
	packageName: string;
	creditsTotal: number;
	creditsRemaining: number;
	grantedAt: string;
	expiresAt: string;
	source: string;
	sourceId: string | null;
	isActive: boolean;
}

export interface UserDebt {
	id: string;
	userId: string;
	amount: number;
	operationType: string;
	isSettled: boolean;
	settledAt: string | null;
	createdAt: string;
}

export type TransactionType =
	| 'redemption'
	| 'chat_usage'
	| 'image_generation'
	| 'purchase'
	| 'subscription'
	| 'admin_adjustment'
	| 'refund'
	| 'debt';
