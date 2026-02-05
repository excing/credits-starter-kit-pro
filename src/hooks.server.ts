import { auth } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';
import { initializeUserCredits } from '$lib/server/credits';

export const handle: Handle = async ({ event, resolve }) => {
    // Get session from Better Auth
    const session = await auth.api.getSession({ headers: event.request.headers });
    event.locals.session = session;

    const { pathname } = event.url;

    // Initialize credits for new users
    if (session?.user?.id) {
        try {
            await initializeUserCredits(session.user.id);
        } catch (error) {
            console.error('Failed to initialize user credits:', error);
        }
    }

    // Redirect authenticated users away from auth pages
    if (session?.user && ['/sign-in', '/sign-up'].includes(pathname)) {
        throw redirect(302, '/dashboard');
    }

    // Protect dashboard routes
    if (!session?.user && pathname.startsWith('/dashboard')) {
        throw redirect(302, '/sign-in');
    }

    return resolve(event);
};
