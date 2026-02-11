import { json } from '@sveltejs/kit';
import { createLogger } from './logger';

const log = createLogger('errors');

// ============================================================================
// 统一错误基类
// ============================================================================

export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public httpStatus: number = 500
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = '资源不存在', code: string = 'NOT_FOUND') {
        super(message, code, 404);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string = '请求参数无效', code: string = 'VALIDATION_ERROR') {
        super(message, code, 400);
        this.name = 'ValidationError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = '未授权', code: string = 'UNAUTHORIZED') {
        super(message, code, 401);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = '需要管理员权限', code: string = 'FORBIDDEN') {
        super(message, code, 403);
        this.name = 'ForbiddenError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = '请求过于频繁，请稍后再试', code: string = 'RATE_LIMIT') {
        super(message, code, 429);
        this.name = 'RateLimitError';
    }
}

// ============================================================================
// 统一错误响应
// ============================================================================

/**
 * 将任意错误转为标准 JSON Response
 *
 * - AppError 子类：使用自身 httpStatus / code / message
 * - 其他 Error：500 + INTERNAL_ERROR
 * - 非 Error：500 + UNKNOWN_ERROR
 */
export function errorResponse(error: unknown, fallbackMessage: string = '操作失败'): Response {
    if (error instanceof AppError) {
        return json(
            { error: error.message, code: error.code },
            { status: error.httpStatus }
        );
    }

    if (error instanceof Error) {
        log.error(error.message, error);
        return json(
            { error: fallbackMessage, code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }

    log.error('Unknown error', undefined, { error: String(error) });
    return json(
        { error: fallbackMessage, code: 'UNKNOWN_ERROR' },
        { status: 500 }
    );
}
