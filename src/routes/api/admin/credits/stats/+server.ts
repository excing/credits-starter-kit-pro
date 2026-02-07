import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	user,
	creditPackage,
	userCreditPackage,
	creditTransaction,
	redemptionHistory
} from '$lib/server/db/schema';
import { sql, and, eq, gt, gte } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth-utils';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.session?.user?.id;
	const userEmail = locals.session?.user?.email;

	if (!userId || !userEmail) {
		return json({ error: '未授权' }, { status: 401 });
	}

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const now = new Date();

		// 本周一 00:00:00
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
		weekStart.setHours(0, 0, 0, 0);

		const [
			revenueResult,
			weekRevenueResult,
			userCountResult,
			weekUserCountResult,
			creditsResult,
			weekCreditsResult
		] = await Promise.all([
			// 1. 现金收入：所有有价格的套餐的兑换总额
			//    通过 redemption_history JOIN credit_package 计算
			db
				.select({
					totalRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)`
				})
				.from(redemptionHistory)
				.innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id)),

			// 1b. 本周现金收入
			db
				.select({
					weekRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)`
				})
				.from(redemptionHistory)
				.innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id))
				.where(gte(redemptionHistory.redeemedAt, weekStart)),

			// 2. 用户总数
			db.select({ count: sql<number>`COUNT(*)` }).from(user),

			// 2b. 本周新注册用户
			db
				.select({ count: sql<number>`COUNT(*)` })
				.from(user)
				.where(gte(user.createdAt, weekStart)),

			// 3. 积分统计：总发放 & 已消耗
			//    总发放 = SUM(credits_total) from user_credit_package
			//    已消耗 = 总发放 - SUM(credits_remaining)
			db
				.select({
					totalGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)`,
					totalRemaining: sql<number>`COALESCE(SUM(${userCreditPackage.creditsRemaining}), 0)`
				})
				.from(userCreditPackage),

			// 3b. 本周发放积分
			db
				.select({
					weekGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)`
				})
				.from(userCreditPackage)
				.where(gte(userCreditPackage.grantedAt, weekStart))
		]);

		const totalRevenue = Number(revenueResult[0]?.totalRevenue ?? 0);
		const weekRevenue = Number(weekRevenueResult[0]?.weekRevenue ?? 0);

		const totalUsers = Number(userCountResult[0]?.count ?? 0);
		const weekNewUsers = Number(weekUserCountResult[0]?.count ?? 0);

		const totalGranted = Number(creditsResult[0]?.totalGranted ?? 0);
		const totalRemaining = Number(creditsResult[0]?.totalRemaining ?? 0);
		const totalConsumed = totalGranted - totalRemaining;
		const weekGranted = Number(weekCreditsResult[0]?.weekGranted ?? 0);

		return json({
			revenue: {
				total: totalRevenue,
				week: weekRevenue
			},
			users: {
				total: totalUsers,
				week: weekNewUsers
			},
			credits: {
				totalGranted,
				totalConsumed,
				totalRemaining,
				weekGranted
			}
		});
	} catch (error) {
		console.error('获取概览统计失败:', error);
		return json({ error: '获取统计失败' }, { status: 500 });
	}
};
