import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redemptionCode, creditPackage } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { desc, eq, count } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// 获取兑换码列表和总数
		const [codes, totalCount] = await Promise.all([
			db
				.select({
					id: redemptionCode.id,
					code: redemptionCode.id, // 使用 id 作为 code
					packageId: redemptionCode.packageId,
					maxUses: redemptionCode.maxUses,
					usedCount: redemptionCode.currentUses, // 使用 currentUses
					expiresAt: redemptionCode.codeExpiresAt, // 使用 codeExpiresAt
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
				.limit(limit)
				.offset(offset)
				.orderBy(desc(redemptionCode.createdAt)),
			db
				.select({ count: count() })
				.from(redemptionCode)
				.then(result => result[0].count)
		]);

		return json({
			codes,
			total: totalCount,
			limit,
			offset
		});
	} catch (error) {
		console.error('获取兑换码列表失败:', error);
		return json({ error: '获取失败' }, { status: 500 });
	}
};
