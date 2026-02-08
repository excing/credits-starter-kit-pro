/**
 * 管理员控制台概览聚合 API
 * GET /api/admin/credits/overview
 *
 * 将以下 4 个请求合并为 1 个（仅用于页面初始加载）：
 * - /api/admin/credits/packages (套餐列表)
 * - /api/admin/credits/codes (兑换码，固定首页)
 * - /api/admin/credits/debts (欠费，固定首页/未结清)
 * - /api/admin/credits/stats (概览统计)
 *
 * 分页、筛选操作仍由各独立 API 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	user,
	creditPackage,
	userCreditPackage,
	redemptionCode,
	redemptionHistory,
	creditDebt
} from '$lib/server/db/schema';
import { sql, eq, gte, desc, count } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth-utils';

const CODES_LIMIT = 10;
const DEBTS_LIMIT = 20;

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
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
		weekStart.setHours(0, 0, 0, 0);

		const [
			packages,
			codes,
			codesTotal,
			debts,
			debtsTotal,
			revenueResult,
			weekRevenueResult,
			userCountResult,
			weekUserCountResult,
			creditsResult,
			weekCreditsResult
		] = await Promise.all([
			db.select().from(creditPackage).orderBy(creditPackage.credits),

			db
				.select({
					id: redemptionCode.id,
					code: redemptionCode.id,
					packageId: redemptionCode.packageId,
					maxUses: redemptionCode.maxUses,
					usedCount: redemptionCode.currentUses,
					expiresAt: redemptionCode.codeExpiresAt,
					isActive: redemptionCode.isActive,
					createdAt: redemptionCode.createdAt,
					package: {
						id: creditPackage.id,
						name: creditPackage.name,
						credits: creditPackage.credits,
						validityDays: creditPackage.validityDays
					}
				})
				.from(redemptionCode)
				.leftJoin(creditPackage, eq(creditPackage.id, redemptionCode.packageId))
				.limit(CODES_LIMIT)
				.offset(0)
				.orderBy(desc(redemptionCode.createdAt)),

			db
				.select({ count: count() })
				.from(redemptionCode)
				.then((result) => result[0].count),

			db
				.select()
				.from(creditDebt)
				.where(eq(creditDebt.isSettled, false))
				.limit(DEBTS_LIMIT)
				.offset(0)
				.orderBy(desc(creditDebt.createdAt)),

			db
				.select({ count: count() })
				.from(creditDebt)
				.where(eq(creditDebt.isSettled, false))
				.then((result) => result[0].count),

			db
				.select({
					totalRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)`
				})
				.from(redemptionHistory)
				.innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id)),

			db
				.select({
					weekRevenue: sql<number>`COALESCE(SUM(${creditPackage.price}), 0)`
				})
				.from(redemptionHistory)
				.innerJoin(creditPackage, eq(redemptionHistory.packageId, creditPackage.id))
				.where(gte(redemptionHistory.redeemedAt, weekStart)),

			db.select({ count: sql<number>`COUNT(*)` }).from(user),

			db
				.select({ count: sql<number>`COUNT(*)` })
				.from(user)
				.where(gte(user.createdAt, weekStart)),

			db
				.select({
					totalGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)`,
					totalRemaining: sql<number>`COALESCE(SUM(${userCreditPackage.creditsRemaining}), 0)`
				})
				.from(userCreditPackage),

			db
				.select({
					weekGranted: sql<number>`COALESCE(SUM(${userCreditPackage.creditsTotal}), 0)`
				})
				.from(userCreditPackage)
				.where(gte(userCreditPackage.grantedAt, weekStart))
		]);

		const totalGranted = Number(creditsResult[0]?.totalGranted ?? 0);
		const totalRemaining = Number(creditsResult[0]?.totalRemaining ?? 0);

		return json({
			packages,
			codes: {
				items: codes,
				total: codesTotal
			},
			debts: {
				items: debts.map((d) => ({
					...d,
					metadata: d.metadata ? JSON.parse(d.metadata) : null
				})),
				total: debtsTotal
			},
			stats: {
				revenue: {
					total: Number(revenueResult[0]?.totalRevenue ?? 0),
					week: Number(weekRevenueResult[0]?.weekRevenue ?? 0)
				},
				users: {
					total: Number(userCountResult[0]?.count ?? 0),
					week: Number(weekUserCountResult[0]?.count ?? 0)
				},
				credits: {
					totalGranted,
					totalConsumed: totalGranted - totalRemaining,
					totalRemaining,
					weekGranted: Number(weekCreditsResult[0]?.weekGranted ?? 0)
				}
			}
		});
	} catch (error) {
		console.error('获取管理员概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
