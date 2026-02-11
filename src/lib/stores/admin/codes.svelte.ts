/**
 * Admin 兑换码 + 兑换历史 Store
 */

import { toast } from 'svelte-sonner';
import { PaginatedState } from '../pagination.svelte';
import { adminShared } from './shared.svelte';
import { adminPackagesStore } from './packages.svelte';
import type { RedemptionCode, RedemptionHistoryItem } from '$lib/types/admin';

class AdminCodesStore {
	// 兑换码分页状态
	codes = new PaginatedState<RedemptionCode>();

	// 兑换历史分页状态
	history = new PaginatedState<RedemptionHistoryItem>();

	// 兑换码筛选状态（默认显示"有效"状态的兑换码）
	codeStatusFilter = $state<'all' | 'active' | 'used' | 'expired' | 'disabled'>('active');
	codePackageFilter = $state<string>('');

	// 兑换码页面快照计数（进入页面时固定，不随筛选变化）
	codePageSnapshotCounts = $state({ totalCodes: 0, totalRedemptions: 0 });

	// 对话框状态
	generateDialogOpen = $state(false);

	// 生成兑换码表单
	generateForm = $state({
		packageId: '',
		count: 1,
		maxUses: 1,
		expiresInDays: 30
	});
	generatedCodes = $state<string[]>([]);
	generating = $state(false);
	copied = $state(false);

	// Tab 状态
	codesTab = $state<'codes' | 'history'>('codes');

	// ============ 兑换码 API ============

	async loadCodes() {
		this.codes.loading = true;
		try {
			const params = new URLSearchParams({
				limit: this.codes.limit.toString(),
				offset: this.codes.offset.toString()
			});
			if (this.codeStatusFilter !== 'all') {
				params.append('status', this.codeStatusFilter);
			}
			if (this.codePackageFilter) {
				params.append('packageId', this.codePackageFilter);
			}
			const res = await fetch(`/api/admin/credits/codes?${params}`);
			if (res.ok) {
				const data = await res.json();
				this.codes.items = data.codes;
				this.codes.total = data.total;
			} else {
				toast.error('加载兑换码失败');
			}
		} catch (error) {
			console.error('加载兑换码失败:', error);
			toast.error('加载失败');
		} finally {
			this.codes.loading = false;
		}
	}

	setCodeStatusFilter(filter: 'all' | 'active' | 'used' | 'expired' | 'disabled') {
		if (filter !== this.codeStatusFilter) {
			this.codeStatusFilter = filter;
			this.codes.page = 1;
		}
	}

	setCodePackageFilter(packageId: string) {
		if (packageId !== this.codePackageFilter) {
			this.codePackageFilter = packageId;
			this.codes.page = 1;
		}
	}

	async generateCodes() {
		if (!this.generateForm.packageId) {
			toast.error('请选择套餐');
			return false;
		}

		if (this.generateForm.count < 1 || this.generateForm.count > 100) {
			toast.error('生成数量必须在 1-100 之间');
			return false;
		}

		this.generating = true;
		try {
			const res = await fetch('/api/admin/credits/generate-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					packageId: this.generateForm.packageId,
					count: this.generateForm.count,
					maxUses: this.generateForm.maxUses,
					codeExpiresInDays: this.generateForm.expiresInDays
				})
			});

			const data = await res.json();

			if (res.ok) {
				this.generatedCodes = data.codes;
				// 更新快照计数：新增了兑换码
				this.codePageSnapshotCounts = {
					...this.codePageSnapshotCounts,
					totalCodes: this.codePageSnapshotCounts.totalCodes + data.codes.length
				};
				toast.success(`成功生成 ${data.codes.length} 个兑换码！`);
				await this.loadCodes();
				return true;
			} else {
				toast.error(data.error || '生成失败');
				return false;
			}
		} catch (error) {
			console.error('生成兑换码失败:', error);
			toast.error('生成失败，请重试');
			return false;
		} finally {
			this.generating = false;
		}
	}

	async toggleCodeStatus(codeId: string, currentStatus: boolean) {
		adminShared.startOperation(codeId);

		const index = this.codes.items.findIndex((c) => c.id === codeId);
		if (index === -1) {
			adminShared.endOperation(codeId);
			return false;
		}

		const oldStatus = this.codes.items[index].isActive;
		this.codes.items[index].isActive = !currentStatus;

		try {
			const res = await fetch(`/api/admin/credits/codes/${codeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !currentStatus })
			});

			if (res.ok) {
				toast.success(currentStatus ? '兑换码已禁用' : '兑换码已启用');
				return true;
			} else {
				// 回滚
				this.codes.items[index].isActive = oldStatus;
				const data = await res.json();
				toast.error(data.error || '操作失败');
				return false;
			}
		} catch (error) {
			// 回滚
			this.codes.items[index].isActive = oldStatus;
			console.error('操作失败:', error);
			toast.error('操作失败，请重试');
			return false;
		} finally {
			adminShared.endOperation(codeId);
		}
	}

	async deleteCode(codeId: string) {
		if (!confirm('确定要删除这个兑换码吗？此操作不可撤销。')) {
			return false;
		}

		adminShared.startOperation(codeId);

		const index = this.codes.items.findIndex((c) => c.id === codeId);
		if (index === -1) {
			adminShared.endOperation(codeId);
			return false;
		}

		const deletedItem = this.codes.items[index];
		this.codes.items = this.codes.items.filter((c) => c.id !== codeId);
		this.codes.total--;

		try {
			const res = await fetch(`/api/admin/credits/codes/${codeId}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				this.codePageSnapshotCounts = {
					...this.codePageSnapshotCounts,
					totalCodes: Math.max(0, this.codePageSnapshotCounts.totalCodes - 1)
				};
				toast.success('兑换码删除成功！');
				return true;
			} else {
				// 回滚
				this.codes.items = [
					...this.codes.items.slice(0, index),
					deletedItem,
					...this.codes.items.slice(index)
				];
				this.codes.total++;
				const data = await res.json();
				toast.error(data.error || '删除失败');
				return false;
			}
		} catch (error) {
			// 回滚
			this.codes.items = [
				...this.codes.items.slice(0, index),
				deletedItem,
				...this.codes.items.slice(index)
			];
			this.codes.total++;
			console.error('删除兑换码失败:', error);
			toast.error('删除失败，请重试');
			return false;
		} finally {
			adminShared.endOperation(codeId);
		}
	}

	resetGenerateForm() {
		this.generateForm = {
			packageId: '',
			count: 1,
			maxUses: 1,
			expiresInDays: 30
		};
		this.generatedCodes = [];
		this.copied = false;
	}

	async copyAllCodes() {
		try {
			await adminShared.copyToClipboard(this.generatedCodes.join('\n'));
			this.copied = true;
			toast.success('已复制所有兑换码到剪贴板');
			setTimeout(() => {
				this.copied = false;
			}, 2000);
			return true;
		} catch {
			toast.error('复制失败');
			return false;
		}
	}

	// ============ 兑换历史 API ============

	async loadHistory() {
		this.history.loading = true;
		try {
			const res = await fetch(
				`/api/admin/credits/codes/history?limit=${this.history.limit}&offset=${this.history.offset}`
			);
			if (res.ok) {
				const data = await res.json();
				this.history.items = data.history;
				this.history.total = data.total;
			} else {
				toast.error('加载兑换历史失败');
			}
		} catch (error) {
			console.error('加载兑换历史失败:', error);
			toast.error('加载失败');
		} finally {
			this.history.loading = false;
		}
	}

	// ============ 兑换码页面初始化 ============

	async initCodesPage() {
		adminPackagesStore.packagesLoading = true;
		this.codes.loading = true;

		// 重置筛选和分页到默认状态
		this.codeStatusFilter = 'active';
		this.codePackageFilter = '';
		this.codes.page = 1;
		this.codesTab = 'codes';
		// 重置历史状态，确保切换 Tab 时重新加载
		this.history.reset();

		try {
			const res = await fetch('/api/admin/credits/codes/overview');
			if (res.ok) {
				const data = await res.json();
				adminPackagesStore.packages = data.packages;
				this.codes.items = data.codes.items;
				this.codes.total = data.codes.total;
				this.codes.initialized = true;
				this.codePageSnapshotCounts = data.snapshotCounts;
			} else {
				toast.error('加载兑换码数据失败');
			}
		} catch (error) {
			console.error('兑换码页面初始化失败:', error);
			toast.error('加载失败');
		} finally {
			adminPackagesStore.packagesLoading = false;
			this.codes.loading = false;
		}
	}
}

export const adminCodesStore = new AdminCodesStore();
