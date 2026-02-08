/**
 * Admin 模块状态管理
 * 使用 Svelte 5 Runes 模式
 */

import { toast } from 'svelte-sonner';

// ============ 类型定义 ============

export interface CreditPackage {
	id: string;
	name: string;
	description: string | null;
	credits: number;
	validityDays: number;
	price: number | null;
	currency: string;
	packageType: string;
	isActive: boolean;
	createdAt: string;
}

export interface RedemptionCode {
	id: string;
	code: string;
	packageId: string;
	package?: CreditPackage;
	maxUses: number;
	usedCount: number;
	expiresAt: string;
	isActive: boolean;
	createdAt: string;
}

export interface RedemptionHistoryItem {
	id: string;
	codeId: string;
	userId: string;
	user?: { name: string | null; email: string };
	packageId: string;
	package?: CreditPackage;
	creditsGranted: number;
	redeemedAt: string;
	expiresAt: string;
}

export interface CreditDebt {
	id: string;
	userId: string;
	amount: number;
	operationType: string;
	isSettled: boolean;
	settledAt: string | null;
	createdAt: string;
}

export interface OverviewStats {
	revenue: { total: number; week: number };
	users: { total: number; week: number };
	credits: { totalGranted: number; totalConsumed: number; totalRemaining: number; weekGranted: number };
}

export interface PackageFormData {
	id: string;
	name: string;
	description: string;
	credits: number;
	validityDays: number;
	price: number;
	currency: string;
	packageType: string;
	isActive: boolean;
}

// ============ 分页状态类 ============

class PaginatedState<T> {
	items = $state<T[]>([]);
	loading = $state(false);
	initialized = $state(false);
	page = $state(1);
	limit: number;
	total = $state(0);

	constructor(limit: number = 10) {
		this.limit = limit;
	}

	get offset() {
		return (this.page - 1) * this.limit;
	}

	get hasMore() {
		return this.page * this.limit < this.total;
	}

	get hasPrev() {
		return this.page > 1;
	}

	get pageInfo() {
		const start = this.offset + 1;
		const end = Math.min(this.page * this.limit, this.total);
		return { start, end, total: this.total };
	}

	reset() {
		this.items = [];
		this.page = 1;
		this.total = 0;
		this.initialized = false;
	}
}

// ============ Admin Store 类 ============

class AdminStore {
	// 概览统计
	overviewStats = $state<OverviewStats>({
		revenue: { total: 0, week: 0 },
		users: { total: 0, week: 0 },
		credits: { totalGranted: 0, totalConsumed: 0, totalRemaining: 0, weekGranted: 0 }
	});
	overviewLoading = $state(true);

	// 套餐状态
	packages = $state<CreditPackage[]>([]);
	packagesLoading = $state(true);

	// 兑换码分页状态
	codes = new PaginatedState<RedemptionCode>(10);

	// 兑换历史分页状态
	history = new PaginatedState<RedemptionHistoryItem>(20);

	// 欠费分页状态
	debts = new PaginatedState<CreditDebt>(20);
	debtFilter = $state<'all' | 'unsettled' | 'settled'>('unsettled');

	// 单项操作状态：记录正在操作的 item id
	operatingItems = $state<Set<string>>(new Set());

	// 对话框状态
	generateDialogOpen = $state(false);
	createPackageDialogOpen = $state(false);
	editPackageDialogOpen = $state(false);

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

	// 套餐表单
	packageForm = $state<PackageFormData>({
		id: '',
		name: '',
		description: '',
		credits: 100,
		validityDays: 90,
		price: 0,
		currency: 'CNY',
		packageType: 'standard',
		isActive: true
	});
	savingPackage = $state(false);

	// Tab 状态
	codesTab = $state<'codes' | 'history'>('codes');

	// ============ 派生状态 ============

	get stats() {
		return {
			totalPackages: this.packages.length,
			totalCodes: this.codes.total,
			totalDebts: this.debts.items
				.filter((d) => !d.isSettled)
				.reduce((sum, d) => sum + d.amount, 0),
			unsettledDebts: this.debts.items.filter((d) => !d.isSettled).length
		};
	}

	// ============ 操作状态管理 ============

	isOperating(id: string): boolean {
		return this.operatingItems.has(id);
	}

	private startOperation(id: string) {
		this.operatingItems = new Set([...this.operatingItems, id]);
	}

	private endOperation(id: string) {
		const newSet = new Set(this.operatingItems);
		newSet.delete(id);
		this.operatingItems = newSet;
	}

	// ============ 套餐 API ============

	async loadPackages() {
		this.packagesLoading = true;
		try {
			const res = await fetch('/api/admin/credits/packages');
			if (res.ok) {
				const data = await res.json();
				this.packages = data.packages;
			} else {
				toast.error('加载套餐失败');
			}
		} catch (error) {
			console.error('加载套餐失败:', error);
			toast.error('加载失败');
		} finally {
			this.packagesLoading = false;
		}
	}

	async createPackage() {
		if (!this.packageForm.name || !this.packageForm.credits || !this.packageForm.validityDays) {
			toast.error('请填写必填字段');
			return false;
		}

		this.savingPackage = true;
		try {
			const res = await fetch('/api/admin/credits/packages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: this.packageForm.name,
					description: this.packageForm.description,
					credits: this.packageForm.credits,
					validityDays: this.packageForm.validityDays,
					price: this.packageForm.price,
					currency: this.packageForm.currency,
					packageType: this.packageForm.packageType,
					isActive: this.packageForm.isActive
				})
			});

			if (res.ok) {
				toast.success('套餐创建成功！');
				this.createPackageDialogOpen = false;
				this.resetPackageForm();
				await this.loadPackages();
				return true;
			} else {
				const data = await res.json();
				toast.error(data.error || '创建失败');
				return false;
			}
		} catch (error) {
			console.error('创建套餐失败:', error);
			toast.error('创建失败，请重试');
			return false;
		} finally {
			this.savingPackage = false;
		}
	}

	async updatePackage() {
		if (!this.packageForm.name || !this.packageForm.credits || !this.packageForm.validityDays) {
			toast.error('请填写必填字段');
			return false;
		}

		// 乐观更新：立即更新本地状态
		const index = this.packages.findIndex((p) => p.id === this.packageForm.id);
		if (index === -1) return false;

		const oldPackage = { ...this.packages[index] };
		this.packages[index] = {
			...this.packages[index],
			name: this.packageForm.name,
			description: this.packageForm.description,
			credits: this.packageForm.credits,
			validityDays: this.packageForm.validityDays,
			price: this.packageForm.price,
			currency: this.packageForm.currency,
			packageType: this.packageForm.packageType,
			isActive: this.packageForm.isActive
		};

		this.savingPackage = true;
		try {
			const res = await fetch(`/api/admin/credits/packages/${this.packageForm.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: this.packageForm.name,
					description: this.packageForm.description,
					credits: this.packageForm.credits,
					validityDays: this.packageForm.validityDays,
					price: this.packageForm.price,
					currency: this.packageForm.currency,
					packageType: this.packageForm.packageType,
					isActive: this.packageForm.isActive
				})
			});

			if (res.ok) {
				toast.success('套餐更新成功！');
				this.editPackageDialogOpen = false;
				this.resetPackageForm();
				return true;
			} else {
				// 回滚
				this.packages[index] = oldPackage;
				const data = await res.json();
				toast.error(data.error || '更新失败');
				return false;
			}
		} catch (error) {
			// 回滚
			this.packages[index] = oldPackage;
			console.error('更新套餐失败:', error);
			toast.error('更新失败，请重试');
			return false;
		} finally {
			this.savingPackage = false;
		}
	}

	async deletePackage(packageId: string) {
		if (!confirm('确定要删除这个套餐吗？此操作不可撤销。')) {
			return false;
		}

		// 开始操作，显示 loading
		this.startOperation(packageId);

		// 乐观更新：立即从列表中移除
		const index = this.packages.findIndex((p) => p.id === packageId);
		if (index === -1) {
			this.endOperation(packageId);
			return false;
		}

		const deletedItem = this.packages[index];
		this.packages = this.packages.filter((p) => p.id !== packageId);

		try {
			const res = await fetch(`/api/admin/credits/packages/${packageId}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				toast.success('套餐删除成功！');
				return true;
			} else {
				// 回滚
				this.packages = [
					...this.packages.slice(0, index),
					deletedItem,
					...this.packages.slice(index)
				];
				const data = await res.json();
				toast.error(data.error || '删除失败');
				return false;
			}
		} catch (error) {
			// 回滚
			this.packages = [
				...this.packages.slice(0, index),
				deletedItem,
				...this.packages.slice(index)
			];
			console.error('删除套餐失败:', error);
			toast.error('删除失败，请重试');
			return false;
		} finally {
			this.endOperation(packageId);
		}
	}

	openEditPackageDialog(pkg: CreditPackage) {
		this.packageForm = {
			id: pkg.id,
			name: pkg.name,
			description: pkg.description || '',
			credits: pkg.credits,
			validityDays: pkg.validityDays,
			price: pkg.price || 0,
			currency: pkg.currency || 'CNY',
			packageType: pkg.packageType,
			isActive: pkg.isActive
		};
		this.editPackageDialogOpen = true;
	}

	resetPackageForm() {
		this.packageForm = {
			id: '',
			name: '',
			description: '',
			credits: 100,
			validityDays: 90,
			price: 0,
			currency: 'CNY',
			packageType: 'standard',
			isActive: true
		};
	}

	// ============ 兑换码 API ============

	async loadCodes() {
		this.codes.loading = true;
		try {
			const res = await fetch(
				`/api/admin/credits/codes?limit=${this.codes.limit}&offset=${this.codes.offset}`
			);
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
		// 开始操作，显示 loading
		this.startOperation(codeId);

		// 乐观更新：立即更新本地状态
		const index = this.codes.items.findIndex((c) => c.id === codeId);
		if (index === -1) {
			this.endOperation(codeId);
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
			this.endOperation(codeId);
		}
	}

	async deleteCode(codeId: string) {
		if (!confirm('确定要删除这个兑换码吗？此操作不可撤销。')) {
			return false;
		}

		// 开始操作，显示 loading
		this.startOperation(codeId);

		// 乐观更新：立即从列表中移除
		const index = this.codes.items.findIndex((c) => c.id === codeId);
		if (index === -1) {
			this.endOperation(codeId);
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
			this.endOperation(codeId);
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

	async copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			toast.success('已复制到剪贴板');
			return true;
		} catch {
			toast.error('复制失败');
			return false;
		}
	}

	async copyAllCodes() {
		try {
			await navigator.clipboard.writeText(this.generatedCodes.join('\n'));
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

		// 开始操作，显示 loading
		this.startOperation(debtId);

		// 乐观更新：立即更新本地状态
		const index = this.debts.items.findIndex((d) => d.id === debtId);
		if (index === -1) {
			this.endOperation(debtId);
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
			this.endOperation(debtId);
		}
	}

	setDebtFilter(filter: 'all' | 'unsettled' | 'settled') {
		if (filter !== this.debtFilter) {
			this.debtFilter = filter;
			this.debts.page = 1;
		}
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

	// ============ 初始化 ============

	async init() {
		// 使用聚合 API 一次性加载所有数据（4个请求 -> 1个请求）
		this.packagesLoading = true;
		this.codes.loading = true;
		this.debts.loading = true;
		this.overviewLoading = true;

		try {
			const res = await fetch('/api/admin/credits/overview');
			if (res.ok) {
				const data = await res.json();
				this.packages = data.packages;
				this.codes.items = data.codes.items;
				this.codes.total = data.codes.total;
				this.codes.initialized = true;
				this.debts.items = data.debts.items;
				this.debts.total = data.debts.total;
				this.debts.initialized = true;
				this.overviewStats = data.stats;
			} else {
				toast.error('加载管理数据失败');
			}
		} catch (error) {
			console.error('管理数据初始化失败:', error);
			toast.error('加载失败');
		} finally {
			this.packagesLoading = false;
			this.codes.loading = false;
			this.debts.loading = false;
			this.overviewLoading = false;
		}
	}

	/**
	 * 兑换码页面初始化：聚合加载套餐+兑换码（2个请求 -> 1个请求）
	 */
	async initCodesPage() {
		this.packagesLoading = true;
		this.codes.loading = true;

		try {
			const res = await fetch('/api/admin/credits/codes/overview');
			if (res.ok) {
				const data = await res.json();
				this.packages = data.packages;
				this.codes.items = data.codes.items;
				this.codes.total = data.codes.total;
				this.codes.initialized = true;
			} else {
				toast.error('加载兑换码数据失败');
			}
		} catch (error) {
			console.error('兑换码页面初始化失败:', error);
			toast.error('加载失败');
		} finally {
			this.packagesLoading = false;
			this.codes.loading = false;
		}
	}
}

// 导出单例
export const adminStore = new AdminStore();
