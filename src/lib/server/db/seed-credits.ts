import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { creditPackage, operationCost } from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export async function seedCreditsData() {
    console.log('Seeding credits data...');

    // 1. 创建积分套餐
    await db.insert(creditPackage).values([
        {
            id: 'pkg-welcome',
            name: '新手礼包',
            description: '注册即送100积分，3个月有效',
            credits: 100,
            validityDays: 90,
            packageType: 'redemption',
            isActive: true
        },
        {
            id: 'pkg-basic',
            name: '基础套餐',
            description: '500积分，6个月有效',
            credits: 500,
            validityDays: 180,
            price: 4900, // ¥49
            packageType: 'redemption',
            isActive: true
        },
        {
            id: 'pkg-pro',
            name: '专业套餐',
            description: '2000积分，12个月有效',
            credits: 2000,
            validityDays: 365,
            price: 19900, // ¥199
            packageType: 'redemption',
            isActive: true
        }
    ]).onConflictDoNothing();

    console.log('✓ Credit packages created');

    // 2. 初始化操作计费配置
    await db.insert(operationCost).values([
        {
            id: 'chat-token-based',
            operationType: 'chat',
            costType: 'per_token',
            costAmount: 1,
            costPer: 1000,
            isActive: true,
            metadata: JSON.stringify({ model: 'nvidia/kimi-k2-thinking' })
        },
        {
            id: 'image-generation-fixed',
            operationType: 'image_generation',
            costType: 'fixed',
            costAmount: 5,
            costPer: 1,
            isActive: true
        }
    ]).onConflictDoNothing();

    console.log('✓ Operation costs configured');
    console.log('Seeding completed successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedCreditsData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}
