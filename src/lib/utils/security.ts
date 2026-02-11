/**
 * 安全工具函数
 *
 * 提供 HTML 转义、URL 验证等安全相关的工具函数
 */

/**
 * HTML 转义函数
 *
 * 将特殊字符转换为 HTML 实体，防止 XSS 攻击
 *
 * @param text - 需要转义的文本
 * @returns 转义后的安全文本
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>')
 * // 返回: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string | null | undefined): string {
	if (!text) return '';

	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		'/': '&#x2F;',
	};

	return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * 验证重定向 URL 是否安全
 *
 * 只允许相对路径（以 / 开头且不包含 ://），防止开放重定向攻击
 *
 * @param url - 需要验证的 URL
 * @returns 如果 URL 安全则返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * isValidRedirectUrl('/dashboard')           // true
 * isValidRedirectUrl('/dashboard/settings')  // true
 * isValidRedirectUrl('https://evil.com')     // false
 * isValidRedirectUrl('//evil.com')           // false
 * isValidRedirectUrl('javascript:alert(1)')  // false
 * ```
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
	if (!url) return false;

	// 必须以 / 开头
	if (!url.startsWith('/')) return false;

	// 不能包含 :// (防止 https://evil.com)
	if (url.includes('://')) return false;

	// 不能以 // 开头 (防止 //evil.com)
	if (url.startsWith('//')) return false;

	// 不能包含危险协议
	const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
	const lowerUrl = url.toLowerCase();
	if (dangerousProtocols.some(protocol => lowerUrl.includes(protocol))) {
		return false;
	}

	return true;
}

/**
 * 获取安全的重定向 URL
 *
 * 验证 URL 是否安全，如果不安全则返回默认 URL
 *
 * @param url - 需要验证的 URL
 * @param defaultUrl - 默认 URL（当验证失败时使用）
 * @returns 安全的 URL
 *
 * @example
 * ```typescript
 * getSafeRedirectUrl('/dashboard', '/') // '/dashboard'
 * getSafeRedirectUrl('https://evil.com', '/') // '/'
 * getSafeRedirectUrl(null, '/dashboard') // '/dashboard'
 * ```
 */
export function getSafeRedirectUrl(
	url: string | null | undefined,
	defaultUrl: string = '/dashboard'
): string {
	if (!url || !isValidRedirectUrl(url)) {
		return defaultUrl;
	}
	return url;
}
