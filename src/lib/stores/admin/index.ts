/**
 * Admin Store — barrel re-export
 *
 * 提供统一的 adminStore 门面对象，保持现有消费者的 API 兼容性。
 * 内部已拆分为独立的领域模块。
 */

export { adminShared } from './shared.svelte';
export { adminPackagesStore } from './packages.svelte';
export { adminCodesStore } from './codes.svelte';
export { adminDebtsStore } from './debts.svelte';
export { adminOverviewStore } from './overview.svelte';

// Re-export types for backward compatibility
export type {
	CreditPackage,
	RedemptionCode,
	RedemptionHistoryItem,
	CreditDebt,
	OverviewStats,
	PackageFormData,
} from '$lib/types/admin';

// ============ 统一门面（向后兼容） ============

import { adminShared } from './shared.svelte';
import { adminPackagesStore } from './packages.svelte';
import { adminCodesStore } from './codes.svelte';
import { adminDebtsStore } from './debts.svelte';
import { adminOverviewStore } from './overview.svelte';

/**
 * 统一 adminStore 门面
 *
 * 将所有子 store 的属性和方法代理到一个对象上，
 * 让现有消费者的 `adminStore.xxx` 调用无需修改。
 *
 * 新代码建议直接使用各子 store：
 * - adminPackagesStore — 套餐管理
 * - adminCodesStore — 兑换码 + 兑换历史
 * - adminDebtsStore — 欠费管理
 * - adminOverviewStore — 概览统计
 * - adminShared — 操作状态 + 剪贴板
 */
export const adminStore = {
	// ---- Overview ----
	get overviewStats() { return adminOverviewStore.overviewStats; },
	set overviewStats(v) { adminOverviewStore.overviewStats = v; },
	get overviewLoading() { return adminOverviewStore.overviewLoading; },
	set overviewLoading(v) { adminOverviewStore.overviewLoading = v; },
	get overviewCounts() { return adminOverviewStore.overviewCounts; },
	set overviewCounts(v) { adminOverviewStore.overviewCounts = v; },
	get stats() { return adminOverviewStore.stats; },
	loadOverviewStats: () => adminOverviewStore.loadOverviewStats(),
	init: () => adminOverviewStore.init(),

	// ---- Packages ----
	get packages() { return adminPackagesStore.packages; },
	set packages(v) { adminPackagesStore.packages = v; },
	get packagesLoading() { return adminPackagesStore.packagesLoading; },
	set packagesLoading(v) { adminPackagesStore.packagesLoading = v; },
	get createPackageDialogOpen() { return adminPackagesStore.createPackageDialogOpen; },
	set createPackageDialogOpen(v) { adminPackagesStore.createPackageDialogOpen = v; },
	get editPackageDialogOpen() { return adminPackagesStore.editPackageDialogOpen; },
	set editPackageDialogOpen(v) { adminPackagesStore.editPackageDialogOpen = v; },
	get packageForm() { return adminPackagesStore.packageForm; },
	set packageForm(v) { adminPackagesStore.packageForm = v; },
	get savingPackage() { return adminPackagesStore.savingPackage; },
	set savingPackage(v) { adminPackagesStore.savingPackage = v; },
	loadPackages: () => adminPackagesStore.loadPackages(),
	createPackage: () => adminPackagesStore.createPackage(),
	updatePackage: () => adminPackagesStore.updatePackage(),
	deletePackage: (id: string) => adminPackagesStore.deletePackage(id),
	openEditPackageDialog: (...args: Parameters<typeof adminPackagesStore.openEditPackageDialog>) =>
		adminPackagesStore.openEditPackageDialog(...args),
	resetPackageForm: () => adminPackagesStore.resetPackageForm(),

	// ---- Codes ----
	get codes() { return adminCodesStore.codes; },
	get history() { return adminCodesStore.history; },
	get codeStatusFilter() { return adminCodesStore.codeStatusFilter; },
	set codeStatusFilter(v) { adminCodesStore.codeStatusFilter = v; },
	get codePackageFilter() { return adminCodesStore.codePackageFilter; },
	set codePackageFilter(v) { adminCodesStore.codePackageFilter = v; },
	get codePageSnapshotCounts() { return adminCodesStore.codePageSnapshotCounts; },
	set codePageSnapshotCounts(v) { adminCodesStore.codePageSnapshotCounts = v; },
	get generateDialogOpen() { return adminCodesStore.generateDialogOpen; },
	set generateDialogOpen(v) { adminCodesStore.generateDialogOpen = v; },
	get generateForm() { return adminCodesStore.generateForm; },
	set generateForm(v) { adminCodesStore.generateForm = v; },
	get generatedCodes() { return adminCodesStore.generatedCodes; },
	set generatedCodes(v) { adminCodesStore.generatedCodes = v; },
	get generating() { return adminCodesStore.generating; },
	set generating(v) { adminCodesStore.generating = v; },
	get copied() { return adminCodesStore.copied; },
	set copied(v) { adminCodesStore.copied = v; },
	get codesTab() { return adminCodesStore.codesTab; },
	set codesTab(v) { adminCodesStore.codesTab = v; },
	loadCodes: () => adminCodesStore.loadCodes(),
	setCodeStatusFilter: (...args: Parameters<typeof adminCodesStore.setCodeStatusFilter>) =>
		adminCodesStore.setCodeStatusFilter(...args),
	setCodePackageFilter: (...args: Parameters<typeof adminCodesStore.setCodePackageFilter>) =>
		adminCodesStore.setCodePackageFilter(...args),
	generateCodes: () => adminCodesStore.generateCodes(),
	toggleCodeStatus: (...args: Parameters<typeof adminCodesStore.toggleCodeStatus>) =>
		adminCodesStore.toggleCodeStatus(...args),
	deleteCode: (id: string) => adminCodesStore.deleteCode(id),
	resetGenerateForm: () => adminCodesStore.resetGenerateForm(),
	copyCode: (code: string) => adminShared.copyCode(code),
	copyAllCodes: () => adminCodesStore.copyAllCodes(),
	loadHistory: () => adminCodesStore.loadHistory(),
	initCodesPage: () => adminCodesStore.initCodesPage(),

	// ---- Debts ----
	get debts() { return adminDebtsStore.debts; },
	get debtFilter() { return adminDebtsStore.debtFilter; },
	set debtFilter(v) { adminDebtsStore.debtFilter = v; },
	loadDebts: () => adminDebtsStore.loadDebts(),
	settleDebt: (id: string) => adminDebtsStore.settleDebt(id),
	setDebtFilter: (...args: Parameters<typeof adminDebtsStore.setDebtFilter>) =>
		adminDebtsStore.setDebtFilter(...args),

	// ---- Shared ----
	get operatingItems() { return adminShared.operatingItems; },
	set operatingItems(v) { adminShared.operatingItems = v; },
	isOperating: (id: string) => adminShared.isOperating(id),
};
