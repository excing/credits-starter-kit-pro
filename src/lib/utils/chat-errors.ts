import {
	AlertCircle,
	CreditCard,
	LogIn,
	Clock,
	WifiOff,
	ServerCrash,
} from '@lucide/svelte';

export type ErrorType = 'insufficient_credits' | 'unauthorized' | 'rate_limit' | 'network' | 'server' | 'unknown';

export interface ChatError {
	type: ErrorType;
	message: string;
	retryable: boolean;
	action?: {
		label: string;
		href?: string;
	};
}

/**
 * 解析错误为 ChatError 结构
 * 优先使用 HTTP 状态码和错误码，中文字符串匹配作为 fallback
 */
export function parseError(error: Error | unknown, isOnline: boolean): ChatError {
	if (!error || typeof error !== 'object') {
		return { type: 'unknown', message: '发送失败，请重试', retryable: true };
	}

	const err = error as Record<string, unknown>;
	const response = (typeof err.response === 'object' && err.response !== null)
		? err.response as Record<string, unknown>
		: undefined;
	const responseData = (response && typeof response.data === 'object' && response.data !== null)
		? response.data as Record<string, unknown>
		: undefined;

	const status = (err?.status ?? response?.status) as number | undefined;
	const code = (err?.code ?? responseData?.code) as string | undefined;
	const message = ((err?.message ?? responseData?.error) as string) || '';

	// 积分不足
	if (status === 402 || code === 'INSUFFICIENT_CREDITS' || message.includes('积分不足')) {
		return {
			type: 'insufficient_credits',
			message: '积分不足，请先充值',
			retryable: false,
			action: { label: '去充值', href: '/dashboard/credits' },
		};
	}

	// 未授权
	if (status === 401 || code === 'UNAUTHORIZED' || message.includes('未授权')) {
		return {
			type: 'unauthorized',
			message: '请先登录',
			retryable: false,
			action: { label: '去登录', href: '/sign-in' },
		};
	}

	// 请求过于频繁
	if (status === 429 || code === 'RATE_LIMIT' || message.includes('频繁')) {
		return {
			type: 'rate_limit',
			message: '请求过于频繁，请稍后再试',
			retryable: true,
		};
	}

	// 网络错误
	if (!isOnline || err?.name === 'TypeError' || message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
		return {
			type: 'network',
			message: '网络连接失败，请检查网络',
			retryable: true,
		};
	}

	// 服务器错误
	if ((status && status >= 500) || message.includes('服务器')) {
		return {
			type: 'server',
			message: '服务器繁忙，请稍后再试',
			retryable: true,
		};
	}

	// 未知错误
	return {
		type: 'unknown',
		message: '发送失败，请重试',
		retryable: true,
	};
}

/**
 * 根据错误类型返回对应的图标组件
 */
export function getErrorIcon(type: ErrorType) {
	switch (type) {
		case 'insufficient_credits': return CreditCard;
		case 'unauthorized': return LogIn;
		case 'rate_limit': return Clock;
		case 'network': return WifiOff;
		case 'server': return ServerCrash;
		default: return AlertCircle;
	}
}
