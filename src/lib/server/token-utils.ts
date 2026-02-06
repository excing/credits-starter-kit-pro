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
 * @returns token 数量
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens('Hello, world!');
 * console.log(tokens); // 约 4
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
 * @param messages - 消息数组
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
