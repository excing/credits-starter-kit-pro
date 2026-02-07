/**
 * 操作计费配置
 *
 * 注意：修改此文件后需要重新构建和部署
 *
 * 统一计费模型：
 * - 所有操作都使用 per_unit 模型
 * - 计费公式：Math.ceil((amount / costPer) * costAmount)
 * - 固定费用：设置 costPer = 1，amount 传任意值即可
 * - 按量计费：设置 costPer 为单位量（如 1000 tokens）
 *
 * 示例：
 * - 固定 5 积分：costPer = 1, costAmount = 5, amount 传任意值
 * - 1 积分/1000 tokens：costPer = 1000, costAmount = 1, amount 传 token 数量
 * - 2 积分/文件：costPer = 1, costAmount = 2, amount 传文件数量
 *
 * 优势：
 * - 零运行时开销（编译时内联）
 * - 类型安全（TypeScript 编译时检查）
 * - 完美适配无服务器环境（无需文件 I/O 或数据库查询）
 * - 冷启动 0ms 额外开销
 * - 统一的计费模型，简化代码逻辑
 */

export interface OperationCostConfig {
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
        costAmount: 2,
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
 * import { calculateCost } from './token-utils';
 *
 * const config = getOperationCost('chat_usage');
 * if (config) {
 *   const cost = calculateCost(1500, 'chat_usage');
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

// ============================================================================
// 计费相关函数
// ============================================================================

/**
 * 统一的费用计算函数
 *
 * 根据操作类型自动计算费用，使用统一的 per_unit 计费模型。
 * 计费公式：Math.ceil((amount / costPer) * costAmount)
 *
 * @param amount - 数量（token 数量、单位数量等）
 *   - 对于固定费用（costPer = 1），传任意值即可（建议传 1）
 *   - 对于按量计费，传实际数量（如 token 数量、文件数量等）
 * @param operationType - 操作类型标识符（如 'chat_usage'、'image_generation' 等）
 * @returns 需要扣除的积分数量（非负整数），如果配置不存在则返回 0
 *
 * @example
 * ```typescript
 * import { calculateCost } from '$server/token-utils';
 *
 * // 按 token 计费：AI 聊天（1 积分/1000 tokens）
 * const cost1 = calculateCost(1500, 'chat_usage');
 * console.log(cost1); // 2（1500/1000 = 1.5，向上取整为 2）
 *
 * // 固定费用：图片生成（固定 5 积分）
 * const cost2 = calculateCost(1, 'image_generation');
 * console.log(cost2); // 5
 *
 * // 按单位计费：文件处理（2 积分/文件）
 * const cost3 = calculateCost(3, 'file_processing');
 * console.log(cost3); // 6（3 * 2）
 *
 * // 不存在的操作类型
 * const cost4 = calculateCost(1000, 'invalid_type');
 * console.log(cost4); // 0
 * ```
 */
export function calculateCost(amount: number, operationType: string): number {
    const costConfig = getOperationCost(operationType);

    if (!costConfig) {
        console.warn(`⚠️ 未找到操作类型 '${operationType}' 的计费配置，返回 0`);
        return 0;
    }

    // 统一的计费公式
    return Math.ceil((amount / costConfig.costPer) * costConfig.costAmount);
}
