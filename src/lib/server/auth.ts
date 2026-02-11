import { db } from '$lib/server/db';
import { account, session, user, verification, rateLimit } from '$lib/server/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { resend, RESEND_FROM_EMAIL } from './email';
import { AUTH } from '$lib/config/constants';
import { escapeHtml } from '$lib/utils/security';

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET!;

const APP_URL = publicEnv.PUBLIC_APP_URL ?? 'http://localhost:3000';

export const auth = betterAuth({
	    trustedOrigins: [APP_URL],
	    allowedDevOrigins: [APP_URL],
    cookieCache: {
        enabled: true,
        maxAge: parseInt(env.SESSION_CACHE_TTL || '') || AUTH.SESSION_CACHE_TTL
    },
    rateLimit: {
        enabled: true,
        window: AUTH.RATE_LIMIT_WINDOW,
        max: AUTH.RATE_LIMIT_MAX,
        storage: "database",
        customRules: {
            "/send-verification-email": {
                window: AUTH.EMAIL_VERIFICATION_WINDOW,
                max: 1
            }
        }
    },
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user,
            session,
            account,
            verification,
            rateLimit
        }
    }),
    socialProviders: {
        google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET
        }
    },
    emailAndPassword: {
        enabled: true,
        minPasswordLength: AUTH.PASSWORD_MIN_LENGTH,
        maxPasswordLength: AUTH.PASSWORD_MAX_LENGTH,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            console.log('Sending reset password email to:', user.email);
            const result = await resend.emails.send({
                from: RESEND_FROM_EMAIL,
                to: user.email,
                subject: '重置密码 - SvelteKit Starter Kit',
                html: `
                    <h2>重置密码</h2>
                    <p>您好 ${escapeHtml(user.name)}，</p>
                    <p>点击下面的链接重置您的密码：</p>
                    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:6px;">重置密码</a>
                    <p>如果您没有请求重置密码，请忽略此邮件。</p>
                `,
            });
            if (result.error) {
                console.error('Failed to send reset password email:', result.error);
                throw new Error(result.error.message);
            }
        },
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            console.log('Sending verification email to:', user.email);
            const result = await resend.emails.send({
                from: RESEND_FROM_EMAIL,
                to: user.email,
                subject: '验证您的邮箱 - SvelteKit Starter Kit',
                html: `
                    <h2>验证邮箱</h2>
                    <p>您好 ${escapeHtml(user.name)}，</p>
                    <p>点击下面的链接验证您的邮箱：</p>
                    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:white;text-decoration:none;border-radius:6px;">验证邮箱</a>
                `,
            });
            if (result.error) {
                console.error('Failed to send verification email:', result.error);
                throw new Error(result.error.message);
            }
        },
    },
});

export type Session = typeof auth.$Infer.Session;
