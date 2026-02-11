import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redemptionHistory, redemptionCode, creditPackage, user } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { desc, eq, count } from 'drizzle-orm';
import { parsePagination } from '$lib/config/constants';
import { errorResponse, ForbiddenError } from '$lib/server/errors';

/**
 * 管理员查看兑换历史记录
 * GET /api/admin/credits/codes/history?limit=30&offset=0
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return errorResponse(new ForbiddenError());
	}

	try {
		const { limit, offset } = parsePagination(url);

		// 获取兑换历史列表和总数
		const [history, totalCount] = await Promise.all([
			db
				.select({
					id: redemptionHistory.id,
					codeId: redemptionHistory.codeId,
					userId: redemptionHistory.userId,
					packageId: redemptionHistory.packageId,
					userPackageId: redemptionHistory.userPackageId,
					creditsGranted: redemptionHistory.creditsGranted,
					expiresAt: redemptionHistory.expiresAt,
					redeemedAt: redemptionHistory.redeemedAt,
					code: {
						id: redemptionCode.id,
						code: redemptionCode.id,
						maxUses: redemptionCode.maxUses,
						currentUses: redemptionCode.currentUses
					},
					package: {
						id: creditPackage.id,
						name: creditPackage.name,
						credits: creditPackage.credits,
						validityDays: creditPackage.validityDays
					},
					user: {
						id: user.id,
						name: user.name,
						email: user.email
					}
				})
				.from(redemptionHistory)
				.leftJoin(redemptionCode, eq(redemptionCode.id, redemptionHistory.codeId))
				.leftJoin(creditPackage, eq(creditPackage.id, redemptionHistory.packageId))
				.leftJoin(user, eq(user.id, redemptionHistory.userId))
				.limit(limit)
				.offset(offset)
				.orderBy(desc(redemptionHistory.redeemedAt)),
			db
				.select({ count: count() })
				.from(redemptionHistory)
				.then(result => result[0].count)
		]);

		return json({
			history,
			total: totalCount,
			limit,
			offset
		});
	} catch (error) {
		return errorResponse(error, '获取失败');
	}
};
