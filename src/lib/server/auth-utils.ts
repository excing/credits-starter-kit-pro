import { env } from '$env/dynamic/private';

/**
 * 检查用户是否是管理员
 * @param userEmail 用户邮箱
 * @returns 是否是管理员
 */
export function isAdmin(userEmail: string | undefined): boolean {
	if (!userEmail) return false;
	const adminEmails = env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
	return adminEmails.includes(userEmail);
}
