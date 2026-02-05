import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { redemptionCode } from './schema';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/**
 * 生成兑换码
 */
async function generateRedemptionCode(
    packageId: string,
    maxUses: number = 1,
    codeExpiresInDays: number = 30,
    createdBy?: string
): Promise<string> {
    const codeId = randomUUID();
    const codeExpiresAt = new Date();
    codeExpiresAt.setDate(codeExpiresAt.getDate() + codeExpiresInDays);

    await db.insert(redemptionCode).values({
        id: codeId,
        packageId,
        maxUses,
        currentUses: 0,
        codeExpiresAt,
        isActive: true,
        createdBy
    });

    return codeId;
}

/**
 * 生成兑换码的示例脚本
 *
 * 使用方法:
 * npx tsx src/lib/server/db/generate-code.ts
 */
async function main() {
    console.log('生成兑换码...\n');

    // 示例1: 生成新手礼包兑换码（单次使用，30天有效）
    const welcomeCode = await generateRedemptionCode(
        'pkg-welcome',  // 套餐ID
        1,              // 最大使用次数
        30,             // 过期天数
        'admin'         // 创建者
    );
    console.log('✓ 新手礼包兑换码 (100积分, 90天有效):');
    console.log(`  ${welcomeCode}\n`);

    // 示例2: 生成基础套餐兑换码（可用3次，60天有效）
    const basicCode = await generateRedemptionCode(
        'pkg-basic',    // 套餐ID
        3,              // 最大使用次数
        60,             // 过期天数
        'admin'         // 创建者
    );
    console.log('✓ 基础套餐兑换码 (500积分, 180天有效, 可用3次):');
    console.log(`  ${basicCode}\n`);

    // 示例3: 生成专业套餐兑换码（单次使用，90天有效）
    const proCode = await generateRedemptionCode(
        'pkg-pro',      // 套餐ID
        1,              // 最大使用次数
        90,             // 过期天数
        'admin'         // 创建者
    );
    console.log('✓ 专业套餐兑换码 (2000积分, 365天有效):');
    console.log(`  ${proCode}\n`);

    console.log('兑换码生成完成！');
    console.log('\n使用说明:');
    console.log('1. 复制上面的 UUID 兑换码');
    console.log('2. 登录应用后访问 /dashboard/credits 页面');
    console.log('3. 点击"兑换积分"按钮');
    console.log('4. 粘贴兑换码并确认兑换');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('生成兑换码失败:', error);
        process.exit(1);
    });
