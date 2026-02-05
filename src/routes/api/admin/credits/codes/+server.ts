import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redemptionCode, creditPackage } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { desc, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	try {
		// 获取所有兑换码，并关联套餐信息
		const codes = await db
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
			.orderBy(desc(redemptionCode.createdAt));

		return json({ codes });
	} catch (error) {
		console.error('获取兑换码列表失败:', error);
		return json({ error: '获取失败' }, { status: 500 });
	}
};
