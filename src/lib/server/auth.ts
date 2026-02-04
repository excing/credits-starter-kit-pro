import { db } from '$lib/server/db';
import { account, session, user, verification, rateLimit } from '$lib/server/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { Resend } from 'resend';

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET!;
const RESEND_API_KEY = env.RESEND_API_KEY!;
const RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || 'noreply@example.com';

const APP_URL = publicEnv.PUBLIC_APP_URL ?? 'http://localhost:3000';

const resend = new Resend(RESEND_API_KEY);

export const auth = betterAuth({
	    trustedOrigins: [APP_URL],
	    allowedDevOrigins: [APP_URL],
    cookieCache: {
        enabled: true,
        maxAge: 5 * 60 // Cache duration in seconds
    },
    rateLimit: {
        enabled: true, // 生产环境默认开启，开发环境需手动开启进行测试
        window: 60, // 默认 60 秒窗口
        max: 100,   // 默认最多 100 次请求
        storage: "database", // 使用数据库存储，适合 serverless 环境
        // modelName: "rateLimit", //optional by default "rateLimit" is used
        customRules: {
            "/send-verification-email": {
                window: 90, // 发送验证邮件：90 秒窗口
                max: 1      // 最多 1 次请求
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
        minPasswordLength: 8,
        maxPasswordLength: 128,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            console.log('Sending reset password email to:', user.email);
            const result = await resend.emails.send({
                from: RESEND_FROM_EMAIL,
                to: user.email,
                subject: '重置密码 - SvelteKit Starter Kit',
                html: `
                    <h2>重置密码</h2>
                    <p>您好 ${user.name}，</p>
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
                    <p>您好 ${user.name}，</p>
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
