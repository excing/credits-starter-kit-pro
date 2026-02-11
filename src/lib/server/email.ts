import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createLogger } from './logger';
import { escapeHtml } from '$lib/utils/security';

const log = createLogger('email');

const RESEND_API_KEY = env.RESEND_API_KEY!;
export const RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || 'noreply@example.com';

const APP_URL = publicEnv.PUBLIC_APP_URL ?? 'http://localhost:3000';

export const resend = new Resend(RESEND_API_KEY);

/**
 * 发送低余额提醒邮件
 *
 * 仅在余额从高于阈值变为低于阈值时调用，天然防重。
 * 失败只打日志，不抛异常。
 */
export async function sendLowBalanceEmail(
    to: string,
    userName: string,
    balance: number
): Promise<void> {
    try {
        const result = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to,
            subject: '积分余额不足提醒 - SvelteKit Starter Kit',
            html: `
                <h2>积分余额不足</h2>
                <p>您好 ${escapeHtml(userName) || '用户'}，</p>
                <p>您的积分余额已降至 <strong>${balance}</strong>，可能影响后续使用。</p>
                <p>请及时充值以确保服务不受影响。</p>
                <a href="${APP_URL}/dashboard/credits" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:6px;">查看积分</a>
            `,
        });
        if (result.error) {
            log.error('低余额提醒邮件发送失败', undefined, { error: String(result.error) });
        }
    } catch (error) {
        log.error('低余额提醒邮件发送异常', error instanceof Error ? error : new Error(String(error)));
    }
}
