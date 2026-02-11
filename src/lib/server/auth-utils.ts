import { env } from '$env/dynamic/private';
import { createLogger } from './logger';

const log = createLogger('auth-utils');
const ADMIN_EMAILS_WARNING_LOGGED = { value: false };

/**
 * 检查用户是否是管理员
 * @param userEmail 用户邮箱
 * @returns 是否是管理员
 */
export function isAdmin(userEmail: string | undefined): boolean {
	if (!userEmail) return false;

	const raw = env.ADMIN_EMAILS;
	if (!raw) {
		if (!ADMIN_EMAILS_WARNING_LOGGED.value) {
			log.warn('ADMIN_EMAILS 环境变量未配置，所有管理员检查将返回 false');
			ADMIN_EMAILS_WARNING_LOGGED.value = true;
		}
		return false;
	}

	const adminEmails = raw.split(',').map((e) => e.trim().toLowerCase());
	return adminEmails.includes(userEmail.toLowerCase());
}
