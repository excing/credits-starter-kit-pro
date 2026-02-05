import { encoding_for_model, type TiktokenModel } from 'tiktoken';

// ============================================================================
// 类型定义
// ============================================================================

export interface TokenEstimation {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    method: 'tiktoken' | 'simple' | 'api';
}

export interface MessageTokens {
    role: string;
    content: string;
    tokens: number;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost?: number;
}

// ============================================================================
// 常量配置
// ============================================================================

/**
 * 模型名称映射到 tiktoken 模型
 */
const MODEL_MAPPING: Record<string, TiktokenModel> = {
    'gpt-4': 'gpt-4',
    'gpt-4-turbo': 'gpt-4',
    'gpt-4o': 'gpt-4',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
    'gpt-35-turbo': 'gpt-3.5-turbo',
    'text-embedding-ada-002': 'text-embedding-ada-002',
    'text-embedding-3-small': 'text-embedding-ada-002',
    'text-embedding-3-large': 'text-embedding-ada-002'
};

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
 * @param text - 要估算的文本
 * @param model - 模型名称（可选）
 * @returns token 数量
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens('Hello, world!');
 * console.log(tokens); // 约 4
 * ```
 */
export function estimateTokens(text: string, model?: string): number {
    if (!text) return 0;

    try {
        // 尝试使用 tiktoken 精确计算
        const tiktokenModel = model ? getTiktokenModel(model) : 'gpt-4';
        const encoder = encoding_for_model(tiktokenModel);
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
 * @param messages - 消息数组
 * @param model - 模型名称（可选）
 * @returns TokenEstimation 对象
 *
 * @example
 * ```typescript
 * const messages = [
 *     { role: 'user', content: 'Hello!' },
 *     { role: 'assistant', content: 'Hi there!' }
 * ];
 * const estimation = estimateMessagesTokens(messages);
 * console.log(estimation.totalTokens);
 * ```
 */
export function estimateMessagesTokens(
    messages: Array<{ role?: string; content: string | any }>,
    model?: string
): TokenEstimation {
    let inputTokens = 0;

    // 计算每条消息的 token
    for (const msg of messages) {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        inputTokens += estimateTokens(content, model);
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
 * 估算每条消息的 token 数量（详细版）
 *
 * @param messages - 消息数组
 * @param model - 模型名称（可选）
 * @returns 每条消息的 token 统计
 *
 * @example
 * ```typescript
 * const messages = [
 *     { role: 'user', content: 'Hello!' },
 *     { role: 'assistant', content: 'Hi there!' }
 * ];
 * const breakdown = estimateMessagesTokensDetailed(messages);
 * breakdown.forEach(msg => {
 *     console.log(`${msg.role}: ${msg.tokens} tokens`);
 * });
 * ```
 */
export function estimateMessagesTokensDetailed(
    messages: Array<{ role?: string; content: string | any }>,
    model?: string
): MessageTokens[] {
    return messages.map((msg) => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const tokens = estimateTokens(content, model) + MESSAGE_OVERHEAD_TOKENS;

        return {
            role: msg.role || 'unknown',
            content,
            tokens
        };
    });
}

/**
 * 从 API 响应中提取 token 使用量
 *
 * @param usage - API 返回的 usage 对象
 * @returns TokenUsage 对象
 *
 * @example
 * ```typescript
 * const usage = extractTokenUsage(apiResponse.usage);
 * console.log(`Total tokens: ${usage.totalTokens}`);
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

/**
 * 合并多个 token 使用量
 *
 * @param usages - TokenUsage 数组
 * @returns 合并后的 TokenUsage
 *
 * @example
 * ```typescript
 * const total = mergeTokenUsages([usage1, usage2, usage3]);
 * console.log(`Total: ${total.totalTokens} tokens`);
 * ```
 */
export function mergeTokenUsages(usages: TokenUsage[]): TokenUsage {
    return usages.reduce(
        (acc, usage) => ({
            inputTokens: acc.inputTokens + usage.inputTokens,
            outputTokens: acc.outputTokens + usage.outputTokens,
            totalTokens: acc.totalTokens + usage.totalTokens,
            estimatedCost: (acc.estimatedCost ?? 0) + (usage.estimatedCost ?? 0)
        }),
        { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 }
    );
}

/**
 * 计算 token 费用（基于简单的定价模型）
 *
 * @param tokens - token 数量
 * @param pricePerThousand - 每千 tokens 的价格（美元）
 * @returns 费用（美元）
 *
 * @example
 * ```typescript
 * const cost = calculateTokenCost(1500, 0.002); // GPT-4 输入价格
 * console.log(`Cost: $${cost.toFixed(4)}`);
 * ```
 */
export function calculateTokenCost(tokens: number, pricePerThousand: number): number {
    return (tokens / 1000) * pricePerThousand;
}

/**
 * 计算详细的 token 费用（区分输入和输出）
 *
 * @param usage - TokenUsage 对象
 * @param pricing - 定价配置
 * @returns 总费用（美元）
 *
 * @example
 * ```typescript
 * const cost = calculateDetailedTokenCost(usage, {
 *     inputPricePerThousand: 0.03,   // GPT-4 输入
 *     outputPricePerThousand: 0.06   // GPT-4 输出
 * });
 * console.log(`Total cost: $${cost.toFixed(4)}`);
 * ```
 */
export function calculateDetailedTokenCost(
    usage: TokenUsage,
    pricing: {
        inputPricePerThousand: number;
        outputPricePerThousand: number;
    }
): number {
    const inputCost = calculateTokenCost(usage.inputTokens, pricing.inputPricePerThousand);
    const outputCost = calculateTokenCost(usage.outputTokens, pricing.outputPricePerThousand);
    return inputCost + outputCost;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取 tiktoken 模型名称
 */
function getTiktokenModel(model: string): TiktokenModel {
    // 直接匹配
    if (model in MODEL_MAPPING) {
        return MODEL_MAPPING[model];
    }

    // 模糊匹配
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('gpt-4')) {
        return 'gpt-4';
    }
    if (lowerModel.includes('gpt-3.5') || lowerModel.includes('gpt-35')) {
        return 'gpt-3.5-turbo';
    }
    if (lowerModel.includes('embedding')) {
        return 'text-embedding-ada-002';
    }

    // 默认使用 gpt-4
    return 'gpt-4';
}

/**
 * 格式化 token 数量（添加千位分隔符）
 *
 * @param tokens - token 数量
 * @returns 格式化后的字符串
 *
 * @example
 * ```typescript
 * console.log(formatTokens(1234567)); // "1,234,567"
 * ```
 */
export function formatTokens(tokens: number): string {
    return tokens.toLocaleString('en-US');
}

/**
 * 格式化费用
 *
 * @param cost - 费用（美元）
 * @param decimals - 小数位数（默认 4）
 * @returns 格式化后的字符串
 *
 * @example
 * ```typescript
 * console.log(formatCost(0.001234)); // "$0.0012"
 * ```
 */
export function formatCost(cost: number, decimals: number = 4): string {
    return `$${cost.toFixed(decimals)}`;
}

/**
 * 估算响应的 token 数量（基于输入 token 的比例）
 *
 * @param inputTokens - 输入 token 数量
 * @param ratio - 输出/输入比例（默认 1.5）
 * @returns 估算的输出 token 数量
 *
 * @example
 * ```typescript
 * const outputTokens = estimateOutputTokens(1000, 2.0);
 * console.log(outputTokens); // 2000
 * ```
 */
export function estimateOutputTokens(inputTokens: number, ratio: number = 1.5): number {
    return Math.ceil(inputTokens * ratio);
}

/**
 * 检查 token 数量是否超过模型限制
 *
 * @param tokens - token 数量
 * @param model - 模型名称
 * @returns 是否超过限制
 *
 * @example
 * ```typescript
 * if (isTokenLimitExceeded(150000, 'gpt-4')) {
 *     console.log('Token limit exceeded!');
 * }
 * ```
 */
export function isTokenLimitExceeded(tokens: number, model: string): boolean {
    const limits: Record<string, number> = {
        'gpt-4': 128000,
        'gpt-4-turbo': 128000,
        'gpt-4o': 128000,
        'gpt-3.5-turbo': 16385,
        'gpt-35-turbo': 16385
    };

    const limit = limits[model] ?? 128000; // 默认限制
    return tokens > limit;
}

/**
 * 获取模型的 token 限制
 *
 * @param model - 模型名称
 * @returns token 限制
 *
 * @example
 * ```typescript
 * const limit = getModelTokenLimit('gpt-4');
 * console.log(`Model limit: ${limit} tokens`);
 * ```
 */
export function getModelTokenLimit(model: string): number {
    const limits: Record<string, number> = {
        'gpt-4': 128000,
        'gpt-4-turbo': 128000,
        'gpt-4o': 128000,
        'gpt-3.5-turbo': 16385,
        'gpt-35-turbo': 16385,
        'claude-3-opus': 200000,
        'claude-3-sonnet': 200000,
        'claude-3-haiku': 200000
    };

    return limits[model] ?? 128000;
}

// ============================================================================
// 高级工具函数
// ============================================================================

/**
 * 智能 token 估算器（自动选择最佳方法）
 *
 * @param input - 输入数据（文本或消息数组）
 * @param options - 配置选项
 * @returns TokenEstimation 对象
 *
 * @example
 * ```typescript
 * // 估算文本
 * const est1 = smartEstimateTokens('Hello, world!');
 *
 * // 估算消息
 * const est2 = smartEstimateTokens([
 *     { role: 'user', content: 'Hello!' }
 * ], { model: 'gpt-4' });
 * ```
 */
export function smartEstimateTokens(
    input: string | Array<{ role?: string; content: string | any }>,
    options?: {
        model?: string;
        includeOverhead?: boolean;
    }
): TokenEstimation {
    const model = options?.model;
    const includeOverhead = options?.includeOverhead ?? true;

    if (typeof input === 'string') {
        const tokens = estimateTokens(input, model);
        return {
            inputTokens: tokens,
            outputTokens: 0,
            totalTokens: tokens,
            method: 'tiktoken'
        };
    } else {
        return estimateMessagesTokens(input, model);
    }
}

/**
 * 创建 token 统计报告
 *
 * @param usage - TokenUsage 对象
 * @param options - 配置选项
 * @returns 格式化的报告字符串
 *
 * @example
 * ```typescript
 * const report = createTokenReport(usage, {
 *     model: 'gpt-4',
 *     includeCost: true,
 *     pricing: { inputPricePerThousand: 0.03, outputPricePerThousand: 0.06 }
 * });
 * console.log(report);
 * ```
 */
export function createTokenReport(
    usage: TokenUsage,
    options?: {
        model?: string;
        includeCost?: boolean;
        pricing?: {
            inputPricePerThousand: number;
            outputPricePerThousand: number;
        };
    }
): string {
    const lines: string[] = [];

    lines.push('=== Token Usage Report ===');
    if (options?.model) {
        lines.push(`Model: ${options.model}`);
    }
    lines.push(`Input Tokens:  ${formatTokens(usage.inputTokens)}`);
    lines.push(`Output Tokens: ${formatTokens(usage.outputTokens)}`);
    lines.push(`Total Tokens:  ${formatTokens(usage.totalTokens)}`);

    if (options?.includeCost && options?.pricing) {
        const cost = calculateDetailedTokenCost(usage, options.pricing);
        lines.push(`Estimated Cost: ${formatCost(cost)}`);
    }

    lines.push('========================');

    return lines.join('\n');
}
