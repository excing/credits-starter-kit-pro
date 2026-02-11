import { untrack } from 'svelte';
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
	totalExpired: number;
	expiringPackages: Array<{
		creditsRemaining: number;
		daysUntilExpiry: number;
		expiresAt: string;
	}>;
	monthlySpending?: Array<{
		month: string;
		label: string;
		total: number;
	}>;
};

class AuthStore {
	// Auth state
	user = $state<AuthUser | null>(null);
	loaded = $state(false);
	loading = $state(false);

	// Stats state
	stats = $state<UserStats | null>(null);
	statsLoaded = $state(false);
	statsLoading = $state(false);
	statsError = $state<string | null>(null);

	// 防止重复请求
	private inFlight: Promise<AuthUser | null> | null = null;

	setCurrentUser(user: AuthUser | null) {
		this.user = user;
		this.loaded = true;
	}

	/**
	 * Initialize auth state from SvelteKit layout data.
	 * `session` comes from `src/routes/+layout.server.ts`.
	 */
	initAuthFromLayout(session: unknown) {
		const sessionUser = (session as Record<string, unknown>)?.user as AuthUser | null ?? null;

		// Use untrack to read our own $state without creating reactive
		// dependencies — only changes to the `session` argument (from layout
		// data) should re-trigger the calling $effect.
		untrack(() => {
			// First initialization: trust the server session.
			if (!this.loaded) {
				this.setCurrentUser(sessionUser);
				return;
			}

			// If server says "no session", clear local user.
			if (!sessionUser) {
				if (this.user) this.setCurrentUser(null);
				else this.loaded = true;
				return;
			}

			// If user changed (login as different user), replace.
			if (!this.user || this.user.id !== sessionUser.id) {
				this.setCurrentUser(sessionUser);
				return;
			}

			// Same user: merge in a way that preserves local patches (existing wins).
			this.user = { ...sessionUser, ...this.user } as AuthUser;
			this.loaded = true;
		});
	}

	patchCurrentUser(patch: Partial<AuthUser>) {
		if (this.user) {
			this.user = { ...this.user, ...patch } as AuthUser;
		}
	}

	clearAuthState() {
		this.setCurrentUser(null);
	}

	setStatsData(stats: UserStats) {
		this.stats = stats;
		this.statsLoaded = true;
		this.statsLoading = false;
		this.statsError = null;
	}

	async refreshCurrentUser(): Promise<AuthUser | null> {
		this.loading = true;
		try {
			const result = await authClient.getSession();
			const user = (result as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
			const sessionUser = (user?.user as AuthUser) ?? null;
			this.setCurrentUser(sessionUser);
			return sessionUser;
		} catch (err) {
			console.error('Failed to refresh session:', err);
			this.setCurrentUser(null);
			return null;
		} finally {
			this.loading = false;
		}
	}

	async ensureCurrentUserLoaded(): Promise<AuthUser | null> {
		if (this.loaded) return this.user;
		if (this.inFlight) return this.inFlight;
		this.inFlight = this.refreshCurrentUser().finally(() => {
			this.inFlight = null;
		});
		return this.inFlight;
	}

	/**
	 * 刷新用户积分余额
	 */
	async refreshUserCredits(): Promise<void> {
		if (!this.user) return;

		try {
			const response = await fetch('/api/user/credits');
			if (response.ok) {
				const { balance, activePackages } = await response.json();
				this.patchCurrentUser({
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
	async refreshUserStats(): Promise<UserStats | null> {
		if (!this.user) return null;

		this.statsLoading = true;
		this.statsError = null;
		try {
			const response = await fetch('/api/user/credits/stats');
			if (response.ok) {
				const stats = await response.json();
				this.stats = stats;
				this.statsLoaded = true;
				this.statsLoading = false;
				return stats;
			}
			this.statsLoading = false;
			this.statsError = 'Failed to load stats';
			return null;
		} catch (error) {
			console.error('Failed to refresh stats:', error);
			this.statsLoading = false;
			this.statsError = error instanceof Error ? error.message : 'Unknown error';
			return null;
		}
	}

	/**
	 * 初始化 Dashboard 概览数据（积分余额 + 统计摘要）
	 */
	async initDashboardData(): Promise<void> {
		if (!this.user) return;

		this.statsLoading = true;

		try {
			const response = await fetch('/api/user/credits/dashboard-stats');
			if (response.ok) {
				const data = await response.json();
				this.patchCurrentUser({
					credits: data.balance,
					activePackages: data.activePackages
				});
				this.stats = {
					...data.stats,
					monthlySpending: data.monthlySpending
				};
				this.statsLoaded = true;
				this.statsLoading = false;
			}
		} catch (error) {
			console.error('Failed to init dashboard data:', error);
			await Promise.all([
				this.refreshUserCredits(),
				this.refreshUserStats()
			]);
		}
	}

	/**
	 * 消费积分后刷新（只刷新余额，不刷新统计）
	 */
	async afterCreditsConsumed(): Promise<void> {
		await this.refreshUserCredits();
	}

	/**
	 * 获得积分后刷新（刷新余额和统计）
	 */
	async afterCreditsEarned(): Promise<void> {
		await Promise.all([
			this.refreshUserCredits(),
			this.refreshUserStats()
		]);
	}
}

export const authStore = new AuthStore();
