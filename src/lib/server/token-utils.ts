import { encoding_for_model } from 'tiktoken';
import { getOperationCost, type OperationCostConfig } from './operation-costs.config';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Token 估算结果
 *
 * 用于表示 token 估算的详细信息，包括输入、输出和总 token 数量
 */
export interface TokenEstimation {
    /** 输入 token 数量（用户发送的消息） */
    inputTokens: number;
    /** 输出 token 数量（AI 生成的响应） */
    outputTokens: number;
    /** 总 token 数量（输入 + 输出） */
    totalTokens: number;
    /** 估算方法：tiktoken（精确）、simple（简单估算）、api（API 返回） */
    method: 'tiktoken' | 'simple' | 'api';
}

/**
 * 单条消息的 token 信息
 *
 * 用于记录消息级别的 token 统计
 */
export interface MessageTokens {
    /** 消息角色（user、assistant、system 等） */
    role: string;
    /** 消息内容 */
    content: string;
    /** 该消息的 token 数量 */
    tokens: number;
}

/**
 * Token 使用量统计
 *
 * 用于表示 API 调用的实际 token 使用情况
 */
export interface TokenUsage {
    /** 输入 token 数量（prompt tokens） */
    inputTokens: number;
    /** 输出 token 数量（completion tokens） */
    outputTokens: number;
    /** 总 token 数量 */
    totalTokens: number;
    /** 可选：估算的积分费用 */
    estimatedCost?: number;
}

// ============================================================================
// 常量配置
// ============================================================================

/**
 * 默认的 token 估算比例
 * - 英文：约 4 字符 = 1 token
 * - 中文：约 1.5 字符 = 1 token
 * - 保守估算：平均 3 字符 = 1 token
 */
const DEFAULT_CHARS_PER_TOKEN = 3;

/**
 * 消息格式开销（每条消息）
 */
const MESSAGE_OVERHEAD_TOKENS = 4;

/**
 * 请求基础开销
 */
const REQUEST_OVERHEAD_TOKENS = 3;

// ============================================================================
// 核心工具函数
// ============================================================================

/**
 * 估算文本的 token 数量
 *
 * 使用 tiktoken 库（GPT-4 的 cl100k_base 编码器）精确计算 token 数量。
 * 如果 tiktoken 失败，则降级到简单的字符数估算。
 *
 * @param text - 要估算的文本内容
 * @returns token 数量（非负整数）
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens('Hello, world!');
 * console.log(tokens); // 约 4
 *
 * const chineseTokens = estimateTokens('你好，世界！');
 * console.log(chineseTokens); // 约 6
 * ```
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;

    try {
        // 统一使用 gpt-4 的 tokenizer (cl100k_base)
        // 这样可以确保所有模型的 token 计数一致
        const encoder = encoding_for_model('gpt-4');
        const tokens = encoder.encode(text);
        const count = tokens.length;
        encoder.free();
        return count;
    } catch (error) {
        // 降级到简单估算
        return Math.ceil(text.length / DEFAULT_CHARS_PER_TOKEN);
    }
}

/**
 * 估算消息数组的 token 数量
 *
 * 计算整个对话历史的 token 使用量，包括：
 * - 每条消息的内容 token
 * - 每条消息的格式开销（4 tokens）
 * - 请求基础开销（3 tokens）
 *
 * @param messages - 消息数组，每条消息包含 role 和 content
 * @param messages[].role - 可选，消息角色（user、assistant、system 等）
 * @param messages[].content - 消息内容（字符串或对象）
 * @returns TokenEstimation 对象，包含详细的 token 统计信息
 *
 * @example
 * ```typescript
 * const messages = [
 *     { role: 'user', content: 'Hello!' },
 *     { role: 'assistant', content: 'Hi there!' }
 * ];
 * const estimation = estimateMessagesTokens(messages);
 * console.log(estimation.totalTokens); // 约 15（内容 + 格式开销）
 * console.log(estimation.method); // 'tiktoken'
 * ```
 */
export function estimateMessagesTokens(
    messages: Array<{ role?: string; content: string | any }>
): TokenEstimation {
    let inputTokens = 0;

    // 统一使用 gpt-4 计数
    // 计算每条消息的 token
    for (const msg of messages) {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        inputTokens += estimateTokens(content);
        // 每条消息的格式开销
        inputTokens += MESSAGE_OVERHEAD_TOKENS;
    }

    // 请求基础开销
    inputTokens += REQUEST_OVERHEAD_TOKENS;

    return {
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        method: 'tiktoken'
    };
}

/**
 * 从 API 响应中提取 token 使用量
 *
 * 兼容多种 API 响应格式（OpenAI、Anthropic 等），自动识别并提取 token 使用信息。
 * 支持的字段名称：
 * - OpenAI 格式：prompt_tokens、completion_tokens、total_tokens
 * - 标准格式：inputTokens、outputTokens、totalTokens
 *
 * @param usage - 可选，API 返回的 usage 对象
 * @param usage.prompt_tokens - 可选，输入 token 数量（OpenAI 格式）
 * @param usage.completion_tokens - 可选，输出 token 数量（OpenAI 格式）
 * @param usage.total_tokens - 可选，总 token 数量（OpenAI 格式）
 * @param usage.inputTokens - 可选，输入 token 数量（标准格式）
 * @param usage.outputTokens - 可选，输出 token 数量（标准格式）
 * @param usage.totalTokens - 可选，总 token 数量（标准格式）
 * @returns TokenUsage 对象，如果 usage 为空则返回全 0 的对象
 *
 * @example
 * ```typescript
 * // OpenAI 格式
 * const usage1 = extractTokenUsage({
 *     prompt_tokens: 100,
 *     completion_tokens: 50,
 *     total_tokens: 150
 * });
 * console.log(usage1.totalTokens); // 150
 *
 * // 标准格式
 * const usage2 = extractTokenUsage({
 *     inputTokens: 100,
 *     outputTokens: 50
 * });
 * console.log(usage2.totalTokens); // 150
 *
 * // 空值处理
 * const usage3 = extractTokenUsage();
 * console.log(usage3.totalTokens); // 0
 * ```
 */
export function extractTokenUsage(usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}): TokenUsage {
    if (!usage) {
        return {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0
        };
    }

    // 支持不同的字段名称
    const inputTokens = usage.inputTokens ?? usage.prompt_tokens ?? 0;
    const outputTokens = usage.outputTokens ?? usage.completion_tokens ?? 0;
    const totalTokens = usage.totalTokens ?? usage.total_tokens ?? inputTokens + outputTokens;

    return {
        inputTokens,
        outputTokens,
        totalTokens
    };
}

// ============================================================================
// Token 计费相关函数
// ============================================================================

/**
 * 根据 token 数量计算积分费用
 *
 * 支持两种调用方式：
 * 1. 传入操作类型字符串：自动获取配置并计算费用
 * 2. 传入配置对象：直接根据配置计算费用
 *
 * @param tokens - token 数量（必须为非负整数）
 * @param operationTypeOrConfig - 操作类型标识符（如 'chat_usage'）或配置对象
 * @returns 需要扣除的积分数量（非负整数），如果配置不存在或类型不匹配则返回 0
 *
 * @example
 * ```typescript
 * import { calculateTokenCost } from '$server/token-utils';
 *
 * // 方式1：传入操作类型字符串
 * const creditsToDeduct = calculateTokenCost(1500, 'chat_usage');
 * console.log(creditsToDeduct); // 例如：15（假设 100 tokens = 1 积分）
 *
 * // 方式2：传入配置对象
 * const config = getOperationCost('chat_usage');
 * if (config) {
 *     const creditsToDeduct = calculateTokenCost(1500, config);
 *     console.log(creditsToDeduct); // 15
 * }
 *
 * // 不存在的操作类型
 * const invalid = calculateTokenCost(1000, 'invalid_type');
 * console.log(invalid); // 0
 *
 * // 非 per_token 类型
 * const fixed = calculateTokenCost(1000, 'image_generation');
 * console.log(fixed); // 0（因为 image_generation 是 fixed 类型）
 * ```
 */
export function calculateTokenCost(tokens: number, operationType: string): number;
export function calculateTokenCost(tokens: number, costConfig: OperationCostConfig): number;
export function calculateTokenCost(
    tokens: number,
    operationTypeOrConfig: string | OperationCostConfig
): number {
    // 如果传入的是字符串，先获取配置
    let costConfig: OperationCostConfig | null;

    if (typeof operationTypeOrConfig === 'string') {
        costConfig = getOperationCost(operationTypeOrConfig);

        if (!costConfig) {
            console.warn(`⚠️ 未找到操作类型 '${operationTypeOrConfig}' 的计费配置，返回 0`);
            return 0;
        }

        if (costConfig.costType !== 'per_token') {
            console.warn(
                `⚠️ 操作类型 '${operationTypeOrConfig}' 不是 per_token 计费类型，返回 0`
            );
            return 0;
        }
    } else {
        costConfig = operationTypeOrConfig;
    }

    // 统一的计算逻辑
    if (costConfig.costType === 'fixed') {
        return costConfig.costAmount;
    }

    if (costConfig.costType === 'per_token' || costConfig.costType === 'per_unit') {
        // 向上取整，确保即使是部分块也收费
        return Math.ceil((tokens / costConfig.costPer) * costConfig.costAmount);
    }

    return 0;
}

/**
 * 根据固定费用操作类型获取积分费用
 *
 * 从计费配置中获取 fixed 类型的固定费用。
 * 如果操作类型不存在或不是 fixed 计费类型，则返回 0。
 *
 * **注意**：此函数使用动态导入 credits 模块以避免循环依赖。
 *
 * @param operationType - 操作类型标识符（如 'image_generation'、'file_upload' 等）
 * @returns 需要扣除的积分数量（非负整数），如果配置不存在或类型不匹配则返回 0
 *
 * @example
 * ```typescript
 * import { getFixedCost } from '$server/token-utils';
 *
 * // 获取图片生成的固定费用
 * const creditsToDeduct = getFixedCost('image_generation');
 * console.log(creditsToDeduct); // 例如：10（固定 10 积分）
 *
 * // 不存在的操作类型
 * const invalid = getFixedCost('invalid_type');
 * console.log(invalid); // 0
 *
 * // 非 fixed 类型
 * const perToken = getFixedCost('chat_usage');
 * console.log(perToken); // 0（因为 chat_usage 是 per_token 类型）
 * ```
 */
export function getFixedCost(operationType: string): number {
    const costConfig = getOperationCost(operationType);

    if (!costConfig) {
        console.warn(`⚠️ 未找到操作类型 '${operationType}' 的计费配置，返回 0`);
        return 0;
    }

    if (costConfig.costType !== 'fixed') {
        console.warn(
            `⚠️ 操作类型 '${operationType}' 不是 fixed 计费类型，返回 0`
        );
        return 0;
    }

    return costConfig.costAmount;
}

/**
 * 根据单位数量计算积分费用
 *
 * 从计费配置中获取 per_unit 类型的费率，并计算实际需要扣除的积分数量。
 * 计算公式：Math.ceil((units / costPer) * costAmount)
 * 如果操作类型不存在或不是 per_unit 计费类型，则返回 0。
 *
 * **注意**：此函数使用动态导入 credits 模块以避免循环依赖。
 *
 * @param units - 单位数量（必须为非负数）
 * @param operationType - 操作类型标识符（如 'api_calls'、'storage_gb' 等）
 * @returns 需要扣除的积分数量（非负整数，向上取整），如果配置不存在或类型不匹配则返回 0
 *
 * @example
 * ```typescript
 * import { calculateUnitCost } from '$server/token-utils';
 *
 * // 计算 5 次 API 调用的费用（假设每 10 次调用 = 1 积分）
 * const creditsToDeduct = calculateUnitCost(5, 'api_calls');
 * console.log(creditsToDeduct); // 1（向上取整）
 *
 * // 计算 15 次调用的费用
 * const credits15 = calculateUnitCost(15, 'api_calls');
 * console.log(credits15); // 2（15/10 = 1.5，向上取整为 2）
 *
 * // 不存在的操作类型
 * const invalid = calculateUnitCost(100, 'invalid_type');
 * console.log(invalid); // 0
 *
 * // 非 per_unit 类型
 * const fixed = calculateUnitCost(100, 'image_generation');
 * console.log(fixed); // 0（因为 image_generation 是 fixed 类型）
 * ```
 */
export function calculateUnitCost(units: number, operationType: string): number {
    const costConfig = getOperationCost(operationType);

    if (!costConfig) {
        console.warn(`⚠️ 未找到操作类型 '${operationType}' 的计费配置，返回 0`);
        return 0;
    }

    if (costConfig.costType !== 'per_unit') {
        console.warn(
            `⚠️ 操作类型 '${operationType}' 不是 per_unit 计费类型，返回 0`
        );
        return 0;
    }

    return Math.ceil((units / costConfig.costPer) * costConfig.costAmount);
}
