import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { creditPackage } from '$lib/server/db/schema';
import { getAllPackages } from '$lib/server/credits';
import { parsePagination } from '$lib/config/constants';
import { errorResponse, ValidationError } from '$lib/server/errors';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const { limit, offset } = parsePagination(url);
        const { packages, total } = await getAllPackages(limit, offset);
        return json({ packages, total, limit, offset });
    } catch (error) {
        return errorResponse(error, '获取失败');
    }
};

// 创建套餐
export const POST: RequestHandler = async ({ request }) => {
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

        // 验证 packageType 只包含安全字符（字母、数字、下划线、连字符）
        if (!/^[a-zA-Z0-9_-]+$/.test(packageType)) {
            return errorResponse(new ValidationError('套餐类型只能包含字母、数字、下划线和连字符'));
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
        return errorResponse(error, '创建套餐失败');
    }
};
