/**
 * Admin 概览统计 Store
 */

import { toast } from 'svelte-sonner';
import type { OverviewStats } from '$lib/types/admin';

class AdminOverviewStore {
	// 概览统计
	overviewStats = $state<OverviewStats>({
		revenue: { total: 0, week: 0 },
		users: { total: 0, week: 0 },
		credits: { totalGranted: 0, totalConsumed: 0, totalRemaining: 0, weekGranted: 0 }
	});
	overviewLoading = $state(true);

	// 概览页面卡片计数（轻量级，从服务端获取）
	overviewCounts = $state({
		totalPackages: 0,
		totalCodes: 0,
		totalRedemptions: 0,
		unsettledDebts: 0,
		unsettledDebtAmount: 0,
		totalProxies: 0,
		totalAssignments: 0
	});

	/** 概览页面卡片使用的计数（来自服务端轻量查询） */
	get stats() {
		return this.overviewCounts;
	}

	// ============ 概览统计 API ============

	async loadOverviewStats() {
		this.overviewLoading = true;
		try {
			const res = await fetch('/api/admin/credits/stats');
			if (res.ok) {
				const data = await res.json();
				this.overviewStats = data;
			} else {
				toast.error('加载概览统计失败');
			}
		} catch (error) {
			console.error('加载概览统计失败:', error);
			toast.error('加载统计失败');
		} finally {
			this.overviewLoading = false;
		}
	}

	/**
	 * 概览页面初始化：仅加载统计数据和汇总计数（轻量级）
	 * 不加载具体的套餐/兑换码/欠费数据，各子页面自行加载。
	 */
	async init() {
		this.overviewLoading = true;

		try {
			const res = await fetch('/api/admin/credits/overview');
			if (res.ok) {
				const data = await res.json();
				this.overviewStats = data.stats;
				this.overviewCounts = data.counts;
			} else {
				toast.error('加载管理数据失败');
			}
		} catch (error) {
			console.error('管理数据初始化失败:', error);
			toast.error('加载失败');
		} finally {
			this.overviewLoading = false;
		}
	}
}

export const adminOverviewStore = new AdminOverviewStore();
