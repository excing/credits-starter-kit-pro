import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditPackage } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth-utils';

// 更新套餐
export const PUT: RequestHandler = async ({ locals, params, request }) => {
    const userEmail = locals.session?.user?.email;

    if (!isAdmin(userEmail)) {
        return json({ error: '需要管理员权限' }, { status: 403 });
    }

    const packageId = params.id;
    if (!packageId) {
        return json({ error: '套餐ID不能为空' }, { status: 400 });
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

        // 更新套餐
        const [updatedPackage] = await db
            .update(creditPackage)
            .set({
                name,
                description: description || null,
                credits: Number(credits),
                validityDays: Number(validityDays),
                price: price ? Number(price) : null,
                currency: currency || 'CNY',
                packageType,
                isActive: Boolean(isActive),
                updatedAt: new Date()
            })
            .where(eq(creditPackage.id, packageId))
            .returning();

        if (!updatedPackage) {
            return json({ error: '套餐不存在' }, { status: 404 });
        }

        return json({
            success: true,
            package: updatedPackage
        });
    } catch (error) {
        console.error('更新套餐失败:', error);
        return json({ error: '更新套餐失败' }, { status: 500 });
    }
};

// 删除套餐
export const DELETE: RequestHandler = async ({ locals, params }) => {
    const userEmail = locals.session?.user?.email;

    if (!isAdmin(userEmail)) {
        return json({ error: '需要管理员权限' }, { status: 403 });
    }

    const packageId = params.id;
    if (!packageId) {
        return json({ error: '套餐ID不能为空' }, { status: 400 });
    }

    try {
        // 删除套餐
        const [deletedPackage] = await db
            .delete(creditPackage)
            .where(eq(creditPackage.id, packageId))
            .returning();

        if (!deletedPackage) {
            return json({ error: '套餐不存在' }, { status: 404 });
        }

        return json({
            success: true,
            message: '套餐删除成功'
        });
    } catch (error) {
        console.error('删除套餐失败:', error);
        return json({ error: '删除套餐失败' }, { status: 500 });
    }
};
