/**
 * 应用全局常量配置
 *
 * 将散落在各处的 magic numbers 集中管理，便于维护和调整。
 * 服务端和客户端通用（不含敏感信息）。
 */

// ─── 认证 & 限流 ───────────────────────────────────────────

export const AUTH = {
	/** 会话缓存 TTL（秒），Better Auth cookieCache.maxAge */
	SESSION_CACHE_TTL: 5 * 60,
	/** 默认限流窗口（秒） */
	RATE_LIMIT_WINDOW: 60,
	/** 默认限流最大请求数 */
	RATE_LIMIT_MAX: 100,
	/** 邮箱验证发送间隔（秒） */
	EMAIL_VERIFICATION_WINDOW: 90,
	/** 密码最小长度 */
	PASSWORD_MIN_LENGTH: 8,
	/** 密码最大长度 */
	PASSWORD_MAX_LENGTH: 128,
} as const;

// ─── 文件上传 ───────────────────────────────────────────────

export const UPLOAD = {
	/** 客户端最大文件大小（字节） */
	CLIENT_MAX_SIZE_BYTES: 5 * 1024 * 1024,
	/** 服务端最大文件大小（字节） */
	SERVER_MAX_SIZE_BYTES: 10 * 1024 * 1024,
	/** 客户端最大文件大小（MB，用于展示） */
	CLIENT_MAX_SIZE_MB: 5,
	/** 服务端最大文件大小（MB，用于展示） */
	SERVER_MAX_SIZE_MB: 10,
	/** 进度条模拟上限百分比 */
	PROGRESS_SIMULATION_MAX: 90,
} as const;

// ─── 积分系统 ───────────────────────────────────────────────

export const CREDITS = {
	/** 低余额告警阈值 */
	LOW_BALANCE_WARNING: 10,
	/** 兑换码限流：窗口内最大次数 */
	REDEEM_RATE_LIMIT_MAX: 5,
	/** 兑换码限流：窗口（秒） */
	REDEEM_RATE_LIMIT_WINDOW: 60,
	/** 兑换码默认有效期（天） */
	CODE_EXPIRATION_DAYS: 30,
	/** 套餐即将过期告警天数 */
	PACKAGE_EXPIRY_WARNING_DAYS: 7,
	/** 积分扣减重试延迟（毫秒） */
	DEDUCT_RETRY_DELAYS: [5000, 10000, 20000] as readonly number[],
} as const;

// ─── 分页 ───────────────────────────────────────────────────

export const PAGINATION = {
	/** 统一每页数量 */
	DEFAULT_LIMIT: 20,
	/** 最大每页数量 */
	MAX_LIMIT: 100,
	/** 默认偏移量 */
	DEFAULT_OFFSET: 0,
} as const;

/**
 * 安全解析分页参数，防止 NaN、负数、超大值
 */
export function parsePagination(url: URL): { limit: number; offset: number } {
	const rawLimit = parseInt(url.searchParams.get('limit') || '');
	const rawOffset = parseInt(url.searchParams.get('offset') || '');
	return {
		limit: Number.isNaN(rawLimit) || rawLimit < 1 ? PAGINATION.DEFAULT_LIMIT : Math.min(rawLimit, PAGINATION.MAX_LIMIT),
		offset: Number.isNaN(rawOffset) || rawOffset < 0 ? PAGINATION.DEFAULT_OFFSET : rawOffset,
	};
}

// ─── AI 配置 ────────────────────────────────────────────────

export const AI = {
	/** 聊天最大输出 token 数 */
	CHAT_MAX_TOKENS: 4096,
	/** 默认温度参数 */
	DEFAULT_TEMPERATURE: 0.7,
} as const;

// ─── UI ─────────────────────────────────────────────────────

export const UI = {
	/** 聊天区域自动滚动检测阈值（px） */
	CHAT_SCROLL_THRESHOLD: 100,
	/** 输入框最大高度（px） */
	TEXTAREA_MAX_HEIGHT: 200,
} as const;

// ─── 积分交易类型 ───────────────────────────────────────────

export const TRANSACTION_TYPE = {
	/** 兑换码兑换 */
	REDEMPTION: 'redemption',
	/** 购买 */
	PURCHASE: 'purchase',
	/** 管理员调整 */
	ADMIN_ADJUSTMENT: 'admin_adjustment',
	/** 聊天使用 */
	CHAT_USAGE: 'chat_usage',
	/** 图片生成 */
	IMAGE_GENERATION: 'image_generation',
	/** 订阅 */
	SUBSCRIPTION: 'subscription',
	/** 退款 */
	REFUND: 'refund',
	/** 欠费 */
	DEBT: 'debt',
} as const;

/** 交易类型显示标签 */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
	[TRANSACTION_TYPE.REDEMPTION]: '兑换',
	[TRANSACTION_TYPE.CHAT_USAGE]: '聊天',
	[TRANSACTION_TYPE.IMAGE_GENERATION]: '生图',
	[TRANSACTION_TYPE.PURCHASE]: '购买',
	[TRANSACTION_TYPE.SUBSCRIPTION]: '订阅',
	[TRANSACTION_TYPE.ADMIN_ADJUSTMENT]: '调整',
	[TRANSACTION_TYPE.REFUND]: '退款',
	[TRANSACTION_TYPE.DEBT]: '欠费',
} as const;

// ─── 套餐来源 ───────────────────────────────────────────────

export const PACKAGE_SOURCE = {
	/** 兑换码兑换 */
	REDEMPTION: 'redemption',
	/** 购买 */
	PURCHASE: 'purchase',
	/** 订阅 */
	SUBSCRIPTION: 'subscription',
	/** 管理员发放 */
	ADMIN: 'admin',
} as const;

// ─── 操作类型 ───────────────────────────────────────────────

export const OPERATION_TYPE = {
	/** 图片生成 */
	IMAGE_GENERATION: 'image_generation',
	/** 默认使用 */
	DEFAULT_USAGE: 'default_usage',
	/** 聊天使用 */
	CHAT_USAGE: 'chat_usage',
	/** 免费操作 */
	FREE_OPERATION: 'free_operation',
	/** 获取数据 */
	FETCH_DATA: 'fetch_data',
	/** 语音合成 */
	SPEECH_SYNTHESIS: 'speech_synthesis',
	/** 事件流 */
	EVENT_STREAM: 'event_stream',
	/** 搜索 */
	SEARCH: 'search',
} as const;

// ─── 兑换码状态 ─────────────────────────────────────────────

export const REDEMPTION_CODE_STATUS = {
	/** 激活 */
	ACTIVE: 'active',
	/** 过期 */
	EXPIRED: 'expired',
	/** 已使用 */
	USED: 'used',
	/** 待处理 */
	PENDING: 'pending',
} as const;

// ─── 货币 & 套餐 ────────────────────────────────────────────

export const CURRENCY = {
	/** 人民币 */
	CNY: 'CNY',
} as const;

export const PACKAGE_TYPE = {
	/** 标准套餐 */
	STANDARD: 'standard',
} as const;

// ─── OAuth Provider ─────────────────────────────────────────

export const OAUTH_PROVIDER = {
	/** Google OAuth */
	GOOGLE: 'google',
} as const;
