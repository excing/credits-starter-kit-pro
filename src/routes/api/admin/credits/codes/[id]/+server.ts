import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redemptionCode } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { errorResponse, ValidationError, NotFoundError } from '$lib/server/errors';

// 更新兑换码状态（启用/禁用）
export const PATCH: RequestHandler = async ({ params, request }) => {
	const codeId = params.id;
	if (!codeId) {
		return errorResponse(new ValidationError('兑换码ID不能为空'));
	}

	try {
		const { isActive } = await request.json();

		if (typeof isActive !== 'boolean') {
			return errorResponse(new ValidationError('无效的状态值'));
		}

		const [updatedCode] = await db
			.update(redemptionCode)
			.set({ isActive })
			.where(and(eq(redemptionCode.id, codeId), isNull(redemptionCode.deletedAt)))
			.returning();

		if (!updatedCode) {
			return errorResponse(new NotFoundError('兑换码不存在'));
		}

		return json({
			success: true,
			code: updatedCode
		});
	} catch (error) {
		return errorResponse(error, '更新失败');
	}
};

// 删除兑换码（软删除）
export const DELETE: RequestHandler = async ({ params }) => {
	const codeId = params.id;
	if (!codeId) {
		return errorResponse(new ValidationError('兑换码ID不能为空'));
	}

	try {
		const [deletedCode] = await db
			.update(redemptionCode)
			.set({ deletedAt: new Date() })
			.where(and(eq(redemptionCode.id, codeId), isNull(redemptionCode.deletedAt)))
			.returning();

		if (!deletedCode) {
			return errorResponse(new NotFoundError('兑换码不存在'));
		}

		return json({
			success: true,
			message: '兑换码删除成功'
		});
	} catch (error) {
		return errorResponse(error, '删除失败');
	}
};
