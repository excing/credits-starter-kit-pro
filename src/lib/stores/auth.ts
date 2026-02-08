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

// 封装的状态对象
type AuthState = {
	user: AuthUser | null;
	loaded: boolean;
	loading: boolean;
};

type StatsState = {
	data: UserStats | null;
	loaded: boolean;
	loading: boolean;
	error: string | null;
};

// 内部状态管理
const _authState = writable<AuthState>({
	user: null,
	loaded: false,
	loading: false
});

const _statsState = writable<StatsState>({
	data: null,
	loaded: false,
	loading: false,
	error: null
});

let inFlight: Promise<AuthUser | null> | null = null;

// 导出完整的状态对象
export const authState = { subscribe: _authState.subscribe };
export const statsState = { subscribe: _statsState.subscribe };

export function setCurrentUser(user: AuthUser | null) {
	_authState.update((state) => ({
		...state,
		user,
		loaded: true
	}));
}

/**
 * Initialize auth state from SvelteKit layout data.
 * `session` comes from `src/routes/+layout.server.ts`.
 */
export function initAuthFromLayout(session: unknown) {
	const sessionUser = (session as any)?.user ?? null;
	const state = get(_authState);

	// First initialization: trust the server session.
	if (!state.loaded) {
		setCurrentUser(sessionUser);
		return;
	}

	// If server says "no session", clear local user.
	if (!sessionUser) {
		if (state.user) setCurrentUser(null);
		else _authState.update((s) => ({ ...s, loaded: true }));
		return;
	}

	// If user changed (login as different user), replace.
	if (!state.user || state.user.id !== sessionUser.id) {
		setCurrentUser(sessionUser);
		return;
	}

	// Same user: merge in a way that preserves local patches (existing wins).
	_authState.update((s) => ({
		...s,
		user: { ...(sessionUser as any), ...(s.user as any) },
		loaded: true
	}));
}

export function patchCurrentUser(patch: Partial<AuthUser>) {
	_authState.update((state) => ({
		...state,
		user: state.user ? ({ ...state.user, ...patch } as AuthUser) : state.user
	}));
}

export function clearAuthState() {
	// After sign-out we know the user is null
	setCurrentUser(null);
}

export function setStatsData(stats: UserStats) {
	_statsState.update((s) => ({
		...s,
		data: stats,
		loaded: true,
		loading: false,
		error: null
	}));
}

export async function refreshCurrentUser(): Promise<AuthUser | null> {
	_authState.update((state) => ({ ...state, loading: true }));
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
		_authState.update((state) => ({ ...state, loading: false }));
	}
}

export async function ensureCurrentUserLoaded(): Promise<AuthUser | null> {
	const state = get(_authState);
	if (state.loaded) return state.user;
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
	const state = get(_authState);
	if (!state.user) return;

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
	const state = get(_authState);
	if (!state.user) return null;

	_statsState.update((s) => ({ ...s, loading: true, error: null }));
	try {
		const response = await fetch('/api/user/credits/stats');
		if (response.ok) {
			const stats = await response.json();
			_statsState.update((s) => ({
				...s,
				data: stats,
				loaded: true,
				loading: false
			}));
			return stats;
		}
		_statsState.update((s) => ({
			...s,
			loading: false,
			error: 'Failed to load stats'
		}));
		return null;
	} catch (error) {
		console.error('Failed to refresh stats:', error);
		_statsState.update((s) => ({
			...s,
			loading: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}));
		return null;
	}
}

/**
 * 初始化 Dashboard 完整数据（积分余额 + 统计数据）
 * 首次进入 dashboard 时调用，使用聚合 API 减少请求数
 */
export async function initDashboardData(): Promise<void> {
	const state = get(_authState);
	if (!state.user) return;

	try {
		const response = await fetch('/api/user/credits/overview');
		if (response.ok) {
			const data = await response.json();
			// 更新余额
			patchCurrentUser({
				credits: data.balance,
				activePackages: data.activePackages
			});
			// 更新统计
			_statsState.update((s) => ({
				...s,
				data: data.stats,
				loaded: true,
				loading: false
			}));
		}
	} catch (error) {
		console.error('Failed to init dashboard data:', error);
		// 降级：回退到分开请求
		await Promise.all([
			refreshUserCredits(),
			refreshUserStats()
		]);
	}
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
