import { auth } from '$lib/server/auth';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth-utils';

export const handle: Handle = async ({ event, resolve }) => {
    // Get session from Better Auth
    const session = await auth.api.getSession({ headers: event.request.headers });
    event.locals.session = session;

    const { pathname } = event.url;

    // Redirect authenticated users away from auth pages
    if (session?.user && ['/sign-in', '/sign-up'].includes(pathname)) {
        throw redirect(302, '/dashboard');
    }

    // Protect dashboard routes
    if (!session?.user && pathname.startsWith('/dashboard')) {
        throw redirect(302, '/sign-in');
    }

    // 集中式 Admin API 鉴权：所有 /api/admin 路由的管理员权限在此统一检查。
    // 各 admin API 路由文件无需再重复检查 isAdmin()，直接处理业务逻辑即可。
    if (pathname.startsWith('/api/admin')) {
        if (!session?.user) {
            return json({ error: '未授权' }, { status: 401 });
        }
        if (!isAdmin(session.user.email)) {
            return json({ error: '需要管理员权限' }, { status: 403 });
        }
    }

    const response = await resolve(event);

    // 添加安全响应头
    // X-Frame-Options: 防止点击劫持攻击
    response.headers.set('X-Frame-Options', 'DENY');

    // X-Content-Type-Options: 防止 MIME 类型嗅探
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Referrer-Policy: 控制 Referrer 信息泄露
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy: 限制浏览器功能访问
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Content-Security-Policy: 防止 XSS 和数据注入攻击
    // 注意：这是一个基础配置，可能需要根据实际需求调整
    response.headers.set(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Svelte 需要 unsafe-inline 和 unsafe-eval
            "style-src 'self' 'unsafe-inline'", // Tailwind 需要 unsafe-inline
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.openai.com https://*.r2.cloudflarestorage.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ')
    );

    // Strict-Transport-Security: 强制使用 HTTPS（仅在生产环境启用）
    if (event.url.protocol === 'https:') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response;
};
