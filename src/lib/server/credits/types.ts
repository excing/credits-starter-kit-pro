import type { OperationCostConfig } from '../operation-costs.config';
import { AppError } from '../errors';

// Types
import type { TransactionType } from '$lib/types/credits';
export type { TransactionType };

// Re-export OperationCostConfig for backward compatibility
export type { OperationCostConfig };

// Error classes
export class InsufficientCreditsError extends AppError {
    constructor(required: number, available: number) {
        super(`积分不足。需要: ${required}，可用: ${available}`, 'INSUFFICIENT_CREDITS', 402);
        this.name = 'InsufficientCreditsError';
    }
}

export class InvalidRedemptionCodeError extends AppError {
    constructor(message: string) {
        super(message, 'INVALID_REDEMPTION_CODE', 400);
        this.name = 'InvalidRedemptionCodeError';
    }
}

export class PackageExpiredError extends AppError {
    constructor(message: string) {
        super(message, 'PACKAGE_EXPIRED', 400);
        this.name = 'PackageExpiredError';
    }
}
