/**
 * 用户积分概览聚合 API
 * GET /api/user/credits/overview
 *
 * 将以下 5 个请求合并为 1 个（仅用于页面初始加载）：
 * - /api/user/credits (余额)
 * - /api/user/credits/stats (统计)
 * - /api/user/credits/history (交易历史，固定前20条)
 * - /api/user/credits/packages (套餐)
 * - /api/user/credits/debts (欠费)
 *
 * 分页操作仍由各独立 API 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditTransaction, userCreditPackage, creditDebt } from '$lib/server/db/schema';
import { eq, and, sql, gt } from 'drizzle-orm';
import { getUserBalance, getUserActivePackages, getUserTransactions, getUserDebts, getUserTotalDebt } from '$lib/server/credits';

const HISTORY_LIMIT = 20;

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;

	if (!userId) {
		return json({ error: '未授权' }, { status: 401 });
	}

	try {
		const now = new Date();
		const thirtyDaysLater = new Date();
		thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

		// 并行执行所有查询
		const [
			balance,
			activePackages,
			transactions,
			debts,
			totalSpentResult,
			totalEarnedResult,
			spendingByType,
			expiringPackages,
			totalDebt,
			debtCountResult
		] = await Promise.all([
			getUserBalance(userId),
			getUserActivePackages(userId),
			getUserTransactions(userId, HISTORY_LIMIT, 0),
			getUserDebts(userId, false),
			db
				.select({
					total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`
				})
				.from(creditTransaction)
				.where(
					and(
						eq(creditTransaction.userId, userId),
						sql`${creditTransaction.amount} < 0`
					)
				),
			db
				.select({
					total: sql<number>`COALESCE(SUM(${creditTransaction.amount}), 0)`
				})
				.from(creditTransaction)
				.where(
					and(
						eq(creditTransaction.userId, userId),
						sql`${creditTransaction.amount} > 0`
					)
				),
			db
				.select({
					type: creditTransaction.type,
					total: sql<number>`COALESCE(SUM(ABS(${creditTransaction.amount})), 0)`,
					count: sql<number>`COUNT(*)`
				})
				.from(creditTransaction)
				.where(
					and(
						eq(creditTransaction.userId, userId),
						sql`${creditTransaction.amount} < 0`
					)
				)
				.groupBy(creditTransaction.type),
			db
				.select()
				.from(userCreditPackage)
				.where(
					and(
						eq(userCreditPackage.userId, userId),
						eq(userCreditPackage.isActive, true),
						gt(userCreditPackage.creditsRemaining, 0),
						gt(userCreditPackage.expiresAt, now),
						sql`${userCreditPackage.expiresAt} <= ${thirtyDaysLater}`
					)
				)
				.orderBy(userCreditPackage.expiresAt),
			getUserTotalDebt(userId),
			db
				.select({
					count: sql<number>`COUNT(*)`
				})
				.from(creditDebt)
				.where(
					and(
						eq(creditDebt.userId, userId),
						eq(creditDebt.isSettled, false)
					)
				)
		]);

		return json({
			balance,
			activePackages: activePackages.length,
			stats: {
				totalSpent: Number(totalSpentResult[0]?.total ?? 0),
				totalEarned: Number(totalEarnedResult[0]?.total ?? 0),
				spendingByType: spendingByType.map((item) => ({
					type: item.type,
					total: Number(item.total),
					count: Number(item.count)
				})),
				expiringPackages: expiringPackages.map((pkg) => ({
					id: pkg.id,
					creditsRemaining: pkg.creditsRemaining,
					expiresAt: pkg.expiresAt,
					daysUntilExpiry: Math.ceil(
						(pkg.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
					)
				})),
				totalDebt,
				debtCount: Number(debtCountResult[0]?.count ?? 0)
			},
			transactions,
			packages: activePackages,
			debts,
			debtsTotal: debts.length,
			debtsUnsettledCount: debts.filter((d) => !d.isSettled).length
		});
	} catch (error) {
		console.error('获取积分概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
