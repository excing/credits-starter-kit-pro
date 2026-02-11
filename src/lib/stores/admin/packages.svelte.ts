/**
 * Admin 套餐管理 Store
 */

import { toast } from 'svelte-sonner';
import { adminShared } from './shared.svelte';
import type { CreditPackage, PackageFormData } from '$lib/types/admin';
import { CURRENCY, PACKAGE_TYPE } from '$lib/config/constants';

class AdminPackagesStore {
	// 套餐状态
	packages = $state<CreditPackage[]>([]);
	packagesLoading = $state(true);

	// 对话框状态
	createPackageDialogOpen = $state(false);
	editPackageDialogOpen = $state(false);

	// 套餐表单
	packageForm = $state<PackageFormData>({
		id: '',
		name: '',
		description: '',
		credits: 100,
		validityDays: 90,
		price: 0,
		currency: CURRENCY.CNY,
		packageType: PACKAGE_TYPE.STANDARD,
		isActive: true
	});
	savingPackage = $state(false);

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
		if (!confirm('确定要删除这个套餐吗？已关联的兑换码和兑换历史将保留。')) {
			return false;
		}

		adminShared.startOperation(packageId);

		const index = this.packages.findIndex((p) => p.id === packageId);
		if (index === -1) {
			adminShared.endOperation(packageId);
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
			adminShared.endOperation(packageId);
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
			currency: CURRENCY.CNY,
			packageType: PACKAGE_TYPE.STANDARD,
			isActive: true
		};
	}
}

export const adminPackagesStore = new AdminPackagesStore();
