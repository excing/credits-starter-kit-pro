import { writable, get } from 'svelte/store';
import { authClient } from '$lib/auth-client';

export type AuthUser = {
	// Minimal shape used across UI (keep flexible)
	id: string;
	name?: string | null;
	email: string;
	image?: string | null;
	credits?: number; // 总余额
	activePackages?: number; // 有效套餐数量
	[key: string]: unknown;
};

export type UserStats = {
	totalSpent: number;
	totalEarned: number;
	expiringPackages: Array<{
		creditsRemaining: number;
		daysUntilExpiry: number;
		expiresAt: string;
	}>;
};

const _user = writable<AuthUser | null>(null);
const _loaded = writable(false);
const _loading = writable(false);
const _stats = writable<UserStats | null>(null);
const _statsLoading = writable(false);

let inFlight: Promise<AuthUser | null> | null = null;

export const currentUser = { subscribe: _user.subscribe };
export const authLoaded = { subscribe: _loaded.subscribe };
export const authLoading = { subscribe: _loading.subscribe };
export const userStats = { subscribe: _stats.subscribe };
export const statsLoading = { subscribe: _statsLoading.subscribe };

export function setCurrentUser(user: AuthUser | null) {
	_user.set(user);
	_loaded.set(true);
}

/**
 * Initialize auth state from SvelteKit layout data.
 * `session` comes from `src/routes/+layout.server.ts`.
 */
export function initAuthFromLayout(session: unknown) {
	const sessionUser = (session as any)?.user ?? null;
	const loaded = get(_loaded);
	const existing = get(_user);

	// First initialization: trust the server session.
	if (!loaded) {
		setCurrentUser(sessionUser);
		return;
	}

	// If server says "no session", clear local user.
	if (!sessionUser) {
		if (existing) setCurrentUser(null);
		else _loaded.set(true);
		return;
	}

	// If user changed (login as different user), replace.
	if (!existing || existing.id !== sessionUser.id) {
		setCurrentUser(sessionUser);
		return;
	}

	// Same user: merge in a way that preserves local patches (existing wins).
	_user.set({ ...(sessionUser as any), ...(existing as any) });
	_loaded.set(true);
}

export function patchCurrentUser(patch: Partial<AuthUser>) {
	_user.update((u) => (u ? ({ ...u, ...patch } as AuthUser) : u));
}

export function clearAuthState() {
	// After sign-out we know the user is null
	setCurrentUser(null);
}

export async function refreshCurrentUser(): Promise<AuthUser | null> {
	_loading.set(true);
	try {
		const result = await authClient.getSession();
		const user = (result as any)?.data?.user ?? null;
		setCurrentUser(user);
		return user;
	} catch (err) {
		console.error('Failed to refresh session:', err);
		// Still mark as loaded to avoid infinite spinners
		setCurrentUser(null);
		return null;
	} finally {
		_loading.set(false);
	}
}

export async function ensureCurrentUserLoaded(): Promise<AuthUser | null> {
	if (get(_loaded)) return get(_user);
	if (inFlight) return inFlight;
	inFlight = refreshCurrentUser().finally(() => {
		inFlight = null;
	});
	return inFlight;
}

/**
 * 刷新用户积分余额
 */
export async function refreshUserCredits(): Promise<void> {
	const user = get(_user);
	if (!user) return;

	try {
		const response = await fetch('/api/user/credits');
		if (response.ok) {
			const { balance, activePackages } = await response.json();
			patchCurrentUser({
				credits: balance,
				activePackages: activePackages
			});
		}
	} catch (error) {
		console.error('Failed to refresh credits:', error);
	}
}

/**
 * 刷新用户统计数据
 */
export async function refreshUserStats(): Promise<UserStats | null> {
	const user = get(_user);
	if (!user) return null;

	_statsLoading.set(true);
	try {
		const response = await fetch('/api/user/credits/stats');
		if (response.ok) {
			const stats = await response.json();
			_stats.set(stats);
			return stats;
		}
		return null;
	} catch (error) {
		console.error('Failed to refresh stats:', error);
		return null;
	} finally {
		_statsLoading.set(false);
	}
}

/**
 * 初始化 Dashboard 完整数据（积分余额 + 统计数据）
 * 首次进入 dashboard 时调用
 */
export async function initDashboardData(): Promise<void> {
	const user = get(_user);
	if (!user) return;

	// 并行加载积分余额和统计数据
	await Promise.all([
		refreshUserCredits(),
		refreshUserStats()
	]);
}

/**
 * 消费积分后刷新（只刷新余额，不刷新统计）
 */
export async function afterCreditsConsumed(): Promise<void> {
	await refreshUserCredits();
}

/**
 * 获得积分后刷新（刷新余额和统计）
 */
export async function afterCreditsEarned(): Promise<void> {
	await Promise.all([
		refreshUserCredits(),
		refreshUserStats()
	]);
}
