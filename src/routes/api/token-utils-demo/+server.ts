import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import {
    estimateTokens,
    estimateMessagesTokens,
    estimateMessagesTokensDetailed,
    extractTokenUsage,
    mergeTokenUsages,
    calculateDetailedTokenCost,
    formatTokens,
    formatCost,
    isTokenLimitExceeded,
    getModelTokenLimit,
    createTokenReport,
    smartEstimateTokens
} from '$lib/server/token-utils';

/**
 * Token 工具示例 API
 *
 * 展示了 token-utils 模块的各种功能：
 * 1. 文本 token 估算
 * 2. 消息 token 估算
 * 3. 详细的消息 token 统计
 * 4. Token 使用量提取
 * 5. Token 使用量合并
 * 6. 费用计算
 * 7. Token 限制检查
 * 8. Token 报告生成
 */
export const POST: RequestHandler = async ({ request }) => {
    const { action, data } = await request.json();

    switch (action) {
        case 'estimate_text':
            return handleEstimateText(data);

        case 'estimate_messages':
            return handleEstimateMessages(data);

        case 'estimate_detailed':
            return handleEstimateDetailed(data);

        case 'extract_usage':
            return handleExtractUsage(data);

        case 'merge_usages':
            return handleMergeUsages(data);

        case 'calculate_cost':
            return handleCalculateCost(data);

        case 'check_limit':
            return handleCheckLimit(data);

        case 'generate_report':
            return handleGenerateReport(data);

        case 'smart_estimate':
            return handleSmartEstimate(data);

        default:
            return json({ error: '未知的操作类型' }, { status: 400 });
    }
};

/**
 * 示例 1：估算文本的 token 数量
 */
function handleEstimateText(data: { text: string; model?: string }) {
    const { text } = data;

    const tokens = estimateTokens(text);

    return json({
        success: true,
        result: {
            text,
            model: 'gpt-4',
            tokens,
            formatted: formatTokens(tokens)
        }
    });
}

/**
 * 示例 2：估算消息数组的 token 数量
 */
function handleEstimateMessages(data: { messages: any[]; model?: string }) {
    const { messages } = data;

    const estimation = estimateMessagesTokens(messages);

    return json({
        success: true,
        result: {
            messages,
            model: 'gpt-4',
            estimation,
            formatted: {
                inputTokens: formatTokens(estimation.inputTokens),
                totalTokens: formatTokens(estimation.totalTokens)
            }
        }
    });
}

/**
 * 示例 3：详细的消息 token 统计
 */
function handleEstimateDetailed(data: { messages: any[]; model?: string }) {
    const { messages } = data;

    const breakdown = estimateMessagesTokensDetailed(messages);
    const total = breakdown.reduce((sum, msg) => sum + msg.tokens, 0);

    return json({
        success: true,
        result: {
            breakdown,
            total,
            formatted: formatTokens(total)
        }
    });
}

/**
 * 示例 4：从 API 响应提取 token 使用量
 */
function handleExtractUsage(data: { usage: any }) {
    const { usage } = data;

    const extracted = extractTokenUsage(usage);

    return json({
        success: true,
        result: {
            original: usage,
            extracted,
            formatted: {
                inputTokens: formatTokens(extracted.inputTokens),
                outputTokens: formatTokens(extracted.outputTokens),
                totalTokens: formatTokens(extracted.totalTokens)
            }
        }
    });
}

/**
 * 示例 5：合并多个 token 使用量
 */
function handleMergeUsages(data: { usages: any[] }) {
    const { usages } = data;

    const merged = mergeTokenUsages(usages);

    return json({
        success: true,
        result: {
            usages,
            merged,
            formatted: {
                inputTokens: formatTokens(merged.inputTokens),
                outputTokens: formatTokens(merged.outputTokens),
                totalTokens: formatTokens(merged.totalTokens)
            }
        }
    });
}

/**
 * 示例 6：计算费用
 */
function handleCalculateCost(data: {
    usage: any;
    pricing: {
        inputPricePerThousand: number;
        outputPricePerThousand: number;
    };
}) {
    const { usage, pricing } = data;

    const cost = calculateDetailedTokenCost(usage, pricing);

    return json({
        success: true,
        result: {
            usage,
            pricing,
            cost,
            formatted: formatCost(cost)
        }
    });
}

/**
 * 示例 7：检查 token 限制
 */
function handleCheckLimit(data: { tokens: number; model: string }) {
    const { tokens, model } = data;

    const limit = getModelTokenLimit(model);
    const exceeded = isTokenLimitExceeded(tokens, model);
    const remaining = limit - tokens;
    const percentage = (tokens / limit * 100).toFixed(2);

    return json({
        success: true,
        result: {
            tokens,
            model,
            limit,
            exceeded,
            remaining,
            percentage: `${percentage}%`,
            formatted: {
                tokens: formatTokens(tokens),
                limit: formatTokens(limit),
                remaining: formatTokens(remaining)
            }
        }
    });
}

/**
 * 示例 8：生成 token 报告
 */
function handleGenerateReport(data: {
    usage: any;
    model?: string;
    includeCost?: boolean;
    pricing?: {
        inputPricePerThousand: number;
        outputPricePerThousand: number;
    };
}) {
    const { usage, model, includeCost, pricing } = data;

    const report = createTokenReport(usage, {
        model,
        includeCost,
        pricing
    });

    return json({
        success: true,
        result: {
            usage,
            report
        }
    });
}

/**
 * 示例 9：智能估算器
 */
function handleSmartEstimate(data: { input: string | any[]; model?: string }) {
    const { input } = data;

    const estimation = smartEstimateTokens(input);

    return json({
        success: true,
        result: {
            input: typeof input === 'string' ? input : `${input.length} messages`,
            model: 'gpt-4',
            estimation,
            formatted: {
                inputTokens: formatTokens(estimation.inputTokens),
                totalTokens: formatTokens(estimation.totalTokens)
            }
        }
    });
}

/**
 * GET 请求：返回使用示例
 */
export const GET: RequestHandler = async () => {
    const examples = {
        estimate_text: {
            description: '估算文本的 token 数量',
            request: {
                action: 'estimate_text',
                data: {
                    text: 'Hello, world!',
                    model: 'gpt-4'
                }
            }
        },
        estimate_messages: {
            description: '估算消息数组的 token 数量',
            request: {
                action: 'estimate_messages',
                data: {
                    messages: [
                        { role: 'user', content: 'Hello!' },
                        { role: 'assistant', content: 'Hi there!' }
                    ],
                    model: 'gpt-4'
                }
            }
        },
        estimate_detailed: {
            description: '详细的消息 token 统计',
            request: {
                action: 'estimate_detailed',
                data: {
                    messages: [
                        { role: 'user', content: 'Hello!' },
                        { role: 'assistant', content: 'Hi there!' }
                    ],
                    model: 'gpt-4'
                }
            }
        },
        extract_usage: {
            description: '从 API 响应提取 token 使用量',
            request: {
                action: 'extract_usage',
                data: {
                    usage: {
                        prompt_tokens: 100,
                        completion_tokens: 50,
                        total_tokens: 150
                    }
                }
            }
        },
        merge_usages: {
            description: '合并多个 token 使用量',
            request: {
                action: 'merge_usages',
                data: {
                    usages: [
                        { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
                        { inputTokens: 200, outputTokens: 100, totalTokens: 300 }
                    ]
                }
            }
        },
        calculate_cost: {
            description: '计算费用',
            request: {
                action: 'calculate_cost',
                data: {
                    usage: {
                        inputTokens: 1000,
                        outputTokens: 500,
                        totalTokens: 1500
                    },
                    pricing: {
                        inputPricePerThousand: 0.03,
                        outputPricePerThousand: 0.06
                    }
                }
            }
        },
        check_limit: {
            description: '检查 token 限制',
            request: {
                action: 'check_limit',
                data: {
                    tokens: 100000,
                    model: 'gpt-4'
                }
            }
        },
        generate_report: {
            description: '生成 token 报告',
            request: {
                action: 'generate_report',
                data: {
                    usage: {
                        inputTokens: 1000,
                        outputTokens: 500,
                        totalTokens: 1500
                    },
                    model: 'gpt-4',
                    includeCost: true,
                    pricing: {
                        inputPricePerThousand: 0.03,
                        outputPricePerThousand: 0.06
                    }
                }
            }
        },
        smart_estimate: {
            description: '智能估算器',
            request: {
                action: 'smart_estimate',
                data: {
                    input: 'Hello, world!',
                    model: 'gpt-4'
                }
            }
        }
    };

    return json({
        message: 'Token 工具示例 API',
        usage: '发送 POST 请求到此端点，包含 action 和 data 字段',
        examples
    });
};
