import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateRedemptionCodes } from '$lib/server/credits';
import { errorResponse, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ locals, request }) => {
    const userId = locals.session?.user?.id;

    try {
        const { packageId, count = 1, maxUses, codeExpiresInDays } = await request.json();

        // 验证参数
        if (!packageId || typeof packageId !== 'string') {
            return errorResponse(new ValidationError('无效的套餐ID'));
        }

        if (!count || count <= 0 || count > 100) {
            return errorResponse(new ValidationError('生成数量必须在 1-100 之间'));
        }

        if (!maxUses || maxUses <= 0 || maxUses > 1000) {
            return errorResponse(new ValidationError('使用次数必须在 1-1000 之间'));
        }

        if (!codeExpiresInDays || codeExpiresInDays <= 0 || codeExpiresInDays > 365) {
            return errorResponse(new ValidationError('过期天数必须在 1-365 之间'));
        }

        // 批量生成兑换码（单次数据库插入）
        const codes = await generateRedemptionCodes(
            packageId,
            count,
            maxUses,
            codeExpiresInDays,
            userId
        );

        return json({
            success: true,
            codes,
            count: codes.length,
            packageId,
            maxUses,
            codeExpiresInDays
        });
    } catch (error) {
        return errorResponse(error, '生成失败');
    }
};
