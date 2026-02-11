/**
 * 数据库查询性能监控工具
 *
 * 为分页查询等数据库操作添加执行时间监控，
 * 当查询耗时超过阈值时输出警告日志。
 */

import { createLogger } from './logger';

const log = createLogger('query-monitor');
const SLOW_QUERY_THRESHOLD_MS = 500;

/**
 * 包装异步函数，监控执行耗时。
 * 超过阈值时以 console.warn 输出告警，包含查询名称和耗时。
 *
 * @param label  查询标识（用于日志）
 * @param fn     要执行的异步函数
 * @returns      fn 的返回值
 *
 * @example
 * const result = await withQueryMonitor('getUserTransactions', () =>
 *   db.select().from(creditTransaction).where(...)
 * );
 */
export async function withQueryMonitor<T>(
	label: string,
	fn: () => Promise<T>
): Promise<T> {
	const start = performance.now();
	try {
		const result = await fn();
		return result;
	} finally {
		const duration = performance.now() - start;
		if (duration > SLOW_QUERY_THRESHOLD_MS) {
			log.warn(`慢查询: ${label}`, {
				durationMs: Math.round(duration * 10) / 10,
				thresholdMs: SLOW_QUERY_THRESHOLD_MS
			});
		}
	}
}
