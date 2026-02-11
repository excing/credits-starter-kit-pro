// Barrel re-export — 保持 import { ... } from '$lib/server/credits' 兼容
// Types
export { InsufficientCreditsError, InvalidRedemptionCodeError, PackageExpiredError } from './types';
export type { TransactionType, OperationCostConfig } from './types';

// Balance
export { getUserBalance, calcBalanceFromPackages, getUserActivePackages, getUserInactivePackages, checkSufficientCredits } from './balance';

// Deduction
export { deductCredits } from './deduction';

// Debt
export { getUserDebts, getUserTotalDebt } from './debt';

// Packages
export { grantPackageToUser, expireOldPackages, initializeUserCredits, getAllPackages } from './packages';

// Redemption
export { redeemCode, generateRedemptionCodes } from './redemption';

// Transactions
export { getUserTransactions } from './transactions';

// Admin Stats
export { getUserCreditStats, getUserMonthlySpending, getRedemptionCodes, getAdminDebts, getAdminOverviewStats, getAdminOverviewCounts, getCodePageCounts } from './admin-stats';
export type { UserCreditStats, AdminOverviewStats } from './admin-stats';
