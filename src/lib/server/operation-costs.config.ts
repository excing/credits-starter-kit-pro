/**
 * 操作计费配置
 *
 * 注意：修改此文件后需要重新构建和部署
 *
 * 计费类型说明：
 * - fixed: 固定费用，每次操作消耗 costAmount 积分
 * - per_token: 按 token 计费，公式：Math.ceil((tokens / costPer) * costAmount)
 * - per_unit: 按单位计费，公式：Math.ceil((units / costPer) * costAmount)
 *
 * 优势：
 * - 零运行时开销（编译时内联）
 * - 类型安全（TypeScript 编译时检查）
 * - 完美适配无服务器环境（无需文件 I/O 或数据库查询）
 * - 冷启动 0ms 额外开销
 */

export interface OperationCostConfig {
    readonly operationType: string;
    readonly costType: 'fixed' | 'per_token' | 'per_unit';
    readonly costAmount: number;
    readonly costPer: number;
    readonly isActive: boolean;
    readonly metadata?: Readonly<Record<string, any>>;
}

/**
 * 操作计费配置映射
 * 使用 as const 确保类型安全和编译时优化
 */
export const OPERATION_COSTS = {

    /**
     * 默认计费
     * 固定 1 积分/次
     */
    default_usage: {
        operationType: 'default_usage',
        costType: 'fixed',
        costAmount: 1,
        costPer: 1,
        isActive: true,
        metadata: {
            note: 'Default operation cost'
        }
    },

    /**
     * AI 聊天计费
     * 1 积分 / 1000 tokens
     */
    chat_usage: {
        operationType: 'chat_usage',
        costType: 'per_token',
        costAmount: 1,
        costPer: 1000,
        isActive: true,
        metadata: {
            model: 'default',
            note: 'Standard chat pricing',
            minCharge: 1
        }
    },

    /**
     * 图片生成计费
     * 固定 5 积分/张
     */
    image_generation: {
        operationType: 'image_generation',
        costType: 'fixed',
        costAmount: 5,
        costPer: 1,
        isActive: true,
        metadata: {
            resolution: '1024x1024',
            note: 'Standard image generation'
        }
    },

    /**
     * 文件处理计费
     * 2 积分/文件
     */
    file_processing: {
        operationType: 'file_processing',
        costType: 'per_unit',
        costAmount: 2,
        costPer: 1,
        isActive: true,
        metadata: {
            maxSizeMb: 10,
            note: 'Per file processing'
        }
    },

    /**
     * 示例操作（用于测试）
     */
    example_operation: {
        operationType: 'example_operation',
        costType: 'per_unit',
        costAmount: 2,
        costPer: 1,
        isActive: true,
        metadata: {
            note: 'Example operation for testing'
        }
    }
} as const satisfies Record<string, OperationCostConfig>;

/**
 * 操作类型枚举（类型安全）
 */
export type OperationType = keyof typeof OPERATION_COSTS;

/**
 * 获取操作计费配置
 *
 * @param operationType - 操作类型
 * @returns 计费配置，如果不存在或未启用则返回 null
 *
 * @example
 * ```typescript
 * import { getOperationCost } from './operation-costs.config';
 * import { calculateTokenCost } from './token-utils';
 *
 * const config = getOperationCost('chat_usage');
 * if (config) {
 *   const cost = calculateTokenCost(1500, config);
 * }
 * ```
 */
export function getOperationCost(
    operationType: string
): OperationCostConfig | null {
    const config = OPERATION_COSTS[operationType as OperationType];

    if (!config || !config.isActive) {
        return null;
    }

    return config;
}

/**
 * 获取所有启用的操作类型
 */
export function getActiveOperationTypes(): OperationType[] {
    return Object.keys(OPERATION_COSTS).filter(
        key => OPERATION_COSTS[key as OperationType].isActive
    ) as OperationType[];
}

/**
 * 检查操作类型是否存在且启用
 */
export function isOperationActive(operationType: string): boolean {
    const config = OPERATION_COSTS[operationType as OperationType];
    return config?.isActive ?? false;
}

/**
 * 获取操作的元数据
 */
export function getOperationMetadata(
    operationType: string
): Record<string, any> | undefined {
    return OPERATION_COSTS[operationType as OperationType]?.metadata;
}

/**
 * 获取所有配置（用于调试和管理）
 */
export function getAllOperationCosts(): Record<string, OperationCostConfig> {
    return { ...OPERATION_COSTS };
}
