import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditPackage } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { errorResponse, ValidationError, NotFoundError } from '$lib/server/errors';

// 更新套餐
export const PUT: RequestHandler = async ({ params, request }) => {
    const packageId = params.id;
    if (!packageId) {
        return errorResponse(new ValidationError('套餐ID不能为空'));
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
            return errorResponse(new ValidationError('请填写所有必填字段'));
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
            .where(and(eq(creditPackage.id, packageId), isNull(creditPackage.deletedAt)))
            .returning();

        if (!updatedPackage) {
            return errorResponse(new NotFoundError('套餐不存在'));
        }

        return json({
            success: true,
            package: updatedPackage
        });
    } catch (error) {
        return errorResponse(error, '更新套餐失败');
    }
};

// 删除套餐
export const DELETE: RequestHandler = async ({ params }) => {
    const packageId = params.id;
    if (!packageId) {
        return errorResponse(new ValidationError('套餐ID不能为空'));
    }

    try {
        // 软删除套餐（标记 deletedAt，保留数据完整性）
        const [deletedPackage] = await db
            .update(creditPackage)
            .set({ deletedAt: new Date() })
            .where(and(eq(creditPackage.id, packageId), isNull(creditPackage.deletedAt)))
            .returning();

        if (!deletedPackage) {
            return errorResponse(new NotFoundError('套餐不存在'));
        }

        return json({
            success: true,
            message: '套餐删除成功'
        });
    } catch (error) {
        return errorResponse(error, '删除套餐失败');
    }
};
