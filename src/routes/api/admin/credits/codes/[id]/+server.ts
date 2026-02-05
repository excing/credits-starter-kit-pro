import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redemptionCode } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { eq } from 'drizzle-orm';

// 更新兑换码状态（启用/禁用）
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	const codeId = params.id;
	if (!codeId) {
		return json({ error: '兑换码ID不能为空' }, { status: 400 });
	}

	try {
		const { isActive } = await request.json();

		if (typeof isActive !== 'boolean') {
			return json({ error: '无效的状态值' }, { status: 400 });
		}

		const [updatedCode] = await db
			.update(redemptionCode)
			.set({ isActive })
			.where(eq(redemptionCode.id, codeId))
			.returning();

		if (!updatedCode) {
			return json({ error: '兑换码不存在' }, { status: 404 });
		}

		return json({
			success: true,
			code: updatedCode
		});
	} catch (error) {
		console.error('更新兑换码失败:', error);
		return json({ error: '更新失败' }, { status: 500 });
	}
};

// 删除兑换码
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const userEmail = locals.session?.user?.email;

	if (!isAdmin(userEmail)) {
		return json({ error: '需要管理员权限' }, { status: 403 });
	}

	const codeId = params.id;
	if (!codeId) {
		return json({ error: '兑换码ID不能为空' }, { status: 400 });
	}

	try {
		const [deletedCode] = await db
			.delete(redemptionCode)
			.where(eq(redemptionCode.id, codeId))
			.returning();

		if (!deletedCode) {
			return json({ error: '兑换码不存在' }, { status: 404 });
		}

		return json({
			success: true,
			message: '兑换码删除成功'
		});
	} catch (error) {
		console.error('删除兑换码失败:', error);
		return json({ error: '删除失败' }, { status: 500 });
	}
};
