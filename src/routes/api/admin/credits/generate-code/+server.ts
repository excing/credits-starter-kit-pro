import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateRedemptionCode } from '$lib/server/credits';
import { isAdmin } from '$lib/server/auth-utils';

export const POST: RequestHandler = async ({ locals, request }) => {
    const userId = locals.session?.user?.id;
    const userEmail = locals.session?.user?.email;

    if (!userId || !userEmail) {
        return json({ error: '未授权' }, { status: 401 });
    }

    if (!isAdmin(userEmail)) {
        return json({ error: '需要管理员权限' }, { status: 403 });
    }

    try {
        const { packageId, count = 1, maxUses, codeExpiresInDays } = await request.json();

        // 验证参数
        if (!packageId || typeof packageId !== 'string') {
            return json({ error: '无效的套餐ID' }, { status: 400 });
        }

        if (!count || count <= 0 || count > 100) {
            return json({ error: '生成数量必须在 1-100 之间' }, { status: 400 });
        }

        if (!maxUses || maxUses <= 0 || maxUses > 1000) {
            return json({ error: '使用次数必须在 1-1000 之间' }, { status: 400 });
        }

        if (!codeExpiresInDays || codeExpiresInDays <= 0 || codeExpiresInDays > 365) {
            return json({ error: '过期天数必须在 1-365 之间' }, { status: 400 });
        }

        // 批量生成兑换码
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const code = await generateRedemptionCode(
                packageId,
                maxUses,
                codeExpiresInDays,
                userId
            );
            codes.push(code);
        }

        return json({
            success: true,
            codes,
            count: codes.length,
            packageId,
            maxUses,
            codeExpiresInDays
        });
    } catch (error) {
        console.error('生成兑换码失败:', error);
        return json({ error: '生成失败' }, { status: 500 });
    }
};
