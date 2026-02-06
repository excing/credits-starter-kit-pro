import { encoding_for_model } from 'tiktoken';

// ============================================================================
// 类型定义
// ============================================================================

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
        // 统一使用 gpt-5 的 tokenizer (cl100k_base)
        // 这样可以确保所有模型的 token 计数一致
        const encoder = encoding_for_model('gpt-5');
        const tokens = encoder.encode(text);
        const count = tokens.length;
        encoder.free();
        return count;
    } catch (error) {
        // 降级到简单估算
        return Math.ceil(text.length / 3);
    }
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

