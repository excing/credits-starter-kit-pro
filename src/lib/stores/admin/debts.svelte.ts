/**
 * Admin 欠费管理 Store
 */

import { toast } from 'svelte-sonner';
import { PaginatedState } from '../pagination.svelte';
import { adminShared } from './shared.svelte';
import type { CreditDebt } from '$lib/types/admin';

class AdminDebtsStore {
	// 欠费分页状态
	debts = new PaginatedState<CreditDebt>();
	debtFilter = $state<'all' | 'unsettled' | 'settled'>('unsettled');

	// ============ 欠费 API ============

	async loadDebts() {
		this.debts.loading = true;
		try {
			const settled =
				this.debtFilter === 'all'
					? undefined
					: this.debtFilter === 'settled'
						? 'true'
						: 'false';
			const params = new URLSearchParams({
				limit: this.debts.limit.toString(),
				offset: this.debts.offset.toString()
			});
			if (settled) {
				params.append('settled', settled);
			}
			const res = await fetch(`/api/admin/credits/debts?${params}`);
			if (res.ok) {
				const data = await res.json();
				this.debts.items = data.debts;
				this.debts.total = data.total;
			} else {
				toast.error('加载欠费记录失败');
			}
		} catch (error) {
			console.error('加载欠费记录失败:', error);
			toast.error('加载失败');
		} finally {
			this.debts.loading = false;
		}
	}

	async settleDebt(debtId: string) {
		if (!confirm('确定要手动结清这笔欠费吗？')) {
			return false;
		}

		adminShared.startOperation(debtId);

		const index = this.debts.items.findIndex((d) => d.id === debtId);
		if (index === -1) {
			adminShared.endOperation(debtId);
			return false;
		}

		const oldDebt = { ...this.debts.items[index] };
		this.debts.items[index].isSettled = true;
		this.debts.items[index].settledAt = new Date().toISOString();

		try {
			const res = await fetch(`/api/admin/credits/debts/${debtId}/settle`, {
				method: 'POST'
			});

			if (res.ok) {
				toast.success('欠费已结清！');
				return true;
			} else {
				// 回滚
				this.debts.items[index] = oldDebt;
				const data = await res.json();
				toast.error(data.error || '结清失败');
				return false;
			}
		} catch (error) {
			// 回滚
			this.debts.items[index] = oldDebt;
			console.error('结清欠费失败:', error);
			toast.error('结清失败，请重试');
			return false;
		} finally {
			adminShared.endOperation(debtId);
		}
	}

	setDebtFilter(filter: 'all' | 'unsettled' | 'settled') {
		if (filter !== this.debtFilter) {
			this.debtFilter = filter;
			this.debts.page = 1;
		}
	}
}

export const adminDebtsStore = new AdminDebtsStore();
