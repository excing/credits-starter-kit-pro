// 管理端类型定义

// ============ Credits 管理 ============

export interface CreditPackage {
	id: string;
	name: string;
	description: string | null;
	credits: number;
	validityDays: number;
	price: number | null;
	currency: string;
	packageType: string;
	isActive: boolean;
	createdAt: string;
}

export interface RedemptionCode {
	id: string;
	code: string;
	packageId: string;
	package?: CreditPackage;
	maxUses: number;
	usedCount: number;
	expiresAt: string;
	isActive: boolean;
	createdAt: string;
}

export interface RedemptionHistoryItem {
	id: string;
	codeId: string;
	userId: string;
	user?: { name: string | null; email: string };
	packageId: string;
	package?: CreditPackage;
	creditsGranted: number;
	redeemedAt: string;
	expiresAt: string;
}

export interface CreditDebt {
	id: string;
	userId: string;
	amount: number;
	operationType: string;
	isSettled: boolean;
	settledAt: string | null;
	createdAt: string;
}

export interface OverviewStats {
	revenue: { total: number; week: number };
	users: { total: number; week: number };
	credits: { totalGranted: number; totalConsumed: number; totalRemaining: number; weekGranted: number };
}

export interface PackageFormData {
	id: string;
	name: string;
	description: string;
	credits: number;
	validityDays: number;
	price: number;
	currency: string;
	packageType: string;
	isActive: boolean;
}
