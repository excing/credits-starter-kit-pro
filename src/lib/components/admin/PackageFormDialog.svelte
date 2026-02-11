<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { adminStore } from '$lib/stores/admin';

	let { mode, open = $bindable() }: { mode: 'create' | 'edit'; open: boolean } = $props();

	const isEdit = $derived(mode === 'edit');

	function handleSubmit() {
		if (isEdit) {
			adminStore.updatePackage();
		} else {
			adminStore.createPackage();
		}
	}

	function handleClose() {
		open = false;
		adminStore.resetPackageForm();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{isEdit ? '编辑积分套餐' : '创建积分套餐'}</Dialog.Title>
			<Dialog.Description
				>{isEdit ? '修改套餐信息' : '填写套餐信息以创建新的积分套餐'}</Dialog.Description
			>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="pkg-name">套餐名称 *</Label>
					<Input
						id="pkg-name"
						bind:value={adminStore.packageForm.name}
						placeholder="例如：新手礼包"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="pkg-type">套餐类型 *</Label>
					<Input
						id="pkg-type"
						bind:value={adminStore.packageForm.packageType}
						placeholder="例如：welcome, standard, premium"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="pkg-description">套餐描述</Label>
				<Textarea
					id="pkg-description"
					bind:value={adminStore.packageForm.description}
					placeholder="套餐的详细描述..."
					disabled={adminStore.savingPackage}
					rows={3}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="pkg-credits">积分数量 *</Label>
					<Input
						id="pkg-credits"
						type="number"
						bind:value={adminStore.packageForm.credits}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="pkg-validity">有效期（天）*</Label>
					<Input
						id="pkg-validity"
						type="number"
						bind:value={adminStore.packageForm.validityDays}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="pkg-price">价格（分）</Label>
					<Input
						id="pkg-price"
						type="number"
						bind:value={adminStore.packageForm.price}
						min="0"
						placeholder="0 表示免费"
						disabled={adminStore.savingPackage}
					/>
					<p class="text-xs text-muted-foreground">以分为单位，例如 4900 = ¥49.00</p>
				</div>
				<div class="space-y-2">
					<Label for="pkg-currency">货币</Label>
					<Input
						id="pkg-currency"
						bind:value={adminStore.packageForm.currency}
						placeholder="CNY"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<Checkbox
					id="pkg-active"
					bind:checked={adminStore.packageForm.isActive}
					disabled={adminStore.savingPackage}
				/>
				<Label for="pkg-active">激活套餐</Label>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose} disabled={adminStore.savingPackage}>
				取消
			</Button>
			<Button onclick={handleSubmit} disabled={adminStore.savingPackage}>
				{adminStore.savingPackage
					? isEdit
						? '保存中...'
						: '创建中...'
					: isEdit
						? '保存修改'
						: '创建套餐'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
