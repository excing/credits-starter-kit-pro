/**
 * 管理员兑换码页面聚合 API
 * GET /api/admin/credits/codes/overview
 *
 * 将以下 2 个请求合并为 1 个（仅用于页面初始加载）：
 * - /api/admin/credits/packages (套餐列表，生成兑换码需要)
 * - /api/admin/credits/codes (兑换码列表，固定首页)
 *
 * 分页操作仍由 /api/admin/credits/codes 处理。
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditPackage, redemptionCode } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { desc, eq, count } from 'drizzle-orm';

const CODES_LIMIT = 10;

export const GET: RequestHandler = async ({ locals }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const [packages, codes, codesTotal] = await Promise.all([
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
				.then((result) => result[0].count)
		]);

		return json({
			packages,
			codes: {
				items: codes,
				total: codesTotal
			}
		});
	} catch (error) {
		console.error('获取兑换码概览失败:', error);
		return json({ error: '获取概览失败' }, { status: 500 });
	}
};
