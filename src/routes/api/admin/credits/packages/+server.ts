import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditPackage } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/auth-utils';
import { getAllPackages } from '$lib/server/credits';

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
        const packages = await getAllPackages();
        return json({ packages });
    } catch (error) {
        console.error('获取套餐列表失败:', error);
        return json({ error: '获取失败' }, { status: 500 });
    }
};

// 创建套餐
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
        const body = await request.json();
        const {
            name,
            description,
            credits,
            validityDays,
            price,
            currency,
            packageType,
            isActive
        } = body;

        // 验证必填字段
        if (!name || !credits || !validityDays || !packageType) {
            return json({ error: '请填写所有必填字段' }, { status: 400 });
        }

        // 生成套餐ID
        const packageId = `pkg-${packageType}-${Date.now()}`;

        // 创建套餐
        const [newPackage] = await db
            .insert(creditPackage)
            .values({
                id: packageId,
                name,
                description: description || null,
                credits: Number(credits),
                validityDays: Number(validityDays),
                price: price ? Number(price) : null,
                currency: currency || 'CNY',
                packageType,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                metadata: null
            })
            .returning();

        return json({
            success: true,
            package: newPackage
        });
    } catch (error) {
        console.error('创建套餐失败:', error);
        return json({ error: '创建套餐失败' }, { status: 500 });
    }
};
