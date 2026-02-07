<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Copy, Check } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
</script>

<!-- 生成兑换码对话框 -->
<Dialog.Root bind:open={adminStore.generateDialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>生成兑换码</Dialog.Title>
			<Dialog.Description>选择套餐并配置兑换码参数</Dialog.Description>
		</Dialog.Header>

		{#if adminStore.generatedCodes.length > 0}
			<!-- 显示生成的兑换码 -->
			<div class="space-y-4 py-4">
				<div
					class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
				>
					<p class="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
						✓ 成功生成 {adminStore.generatedCodes.length} 个兑换码！
					</p>
					<div class="space-y-2 max-h-[300px] overflow-y-auto">
						{#each adminStore.generatedCodes as code}
							<div class="flex items-center gap-2">
								<code
									class="flex-1 p-2 bg-white dark:bg-gray-800 border rounded text-xs font-mono break-all"
								>
									{code}
								</code>
								<Button size="sm" variant="ghost" onclick={() => adminStore.copyCode(code)}>
									<Copy class="h-3 w-3" />
								</Button>
							</div>
						{/each}
					</div>
					<div class="mt-3 pt-3 border-t">
						<Button size="sm" variant="outline" class="w-full" onclick={() => adminStore.copyAllCodes()}>
							{#if adminStore.copied}
								<Check class="mr-2 h-4 w-4" />
								已复制
							{:else}
								<Copy class="mr-2 h-4 w-4" />
								复制所有兑换码
							{/if}
						</Button>
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button
					onclick={() => {
						adminStore.generateDialogOpen = false;
						adminStore.resetGenerateForm();
					}}
				>
					完成
				</Button>
			</Dialog.Footer>
		{:else}
			<!-- 生成表单 -->
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="package">选择套餐</Label>
					<select
						id="package"
						bind:value={adminStore.generateForm.packageId}
						class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
						disabled={adminStore.generating}
					>
						<option value="">请选择套餐</option>
						{#each adminStore.packages as pkg}
							<option value={pkg.id}>
								{pkg.name} ({pkg.credits}积分, {pkg.validityDays}天)
							</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<Label for="codeCount">生成数量</Label>
					<Input
						id="codeCount"
						type="number"
						bind:value={adminStore.generateForm.count}
						min="1"
						max="100"
						disabled={adminStore.generating}
					/>
					<p class="text-xs text-muted-foreground">一次最多生成 100 个兑换码</p>
				</div>

				<div class="space-y-2">
					<Label for="maxUses">最大使用次数</Label>
					<Input
						id="maxUses"
						type="number"
						bind:value={adminStore.generateForm.maxUses}
						min="1"
						max="1000"
						disabled={adminStore.generating}
					/>
					<p class="text-xs text-muted-foreground">1 = 单次使用，N = 可用 N 次</p>
				</div>

				<div class="space-y-2">
					<Label for="expires">兑换码有效期（天）</Label>
					<Input
						id="expires"
						type="number"
						bind:value={adminStore.generateForm.expiresInDays}
						min="1"
						max="365"
						disabled={adminStore.generating}
					/>
					<p class="text-xs text-muted-foreground">兑换码本身的过期时间（与套餐有效期独立）</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => {
						adminStore.generateDialogOpen = false;
						adminStore.resetGenerateForm();
					}}
					disabled={adminStore.generating}
				>
					取消
				</Button>
				<Button onclick={() => adminStore.generateCodes()} disabled={adminStore.generating}>
					{adminStore.generating ? '生成中...' : '生成兑换码'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- 创建套餐对话框 -->
<Dialog.Root bind:open={adminStore.createPackageDialogOpen}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>创建积分套餐</Dialog.Title>
			<Dialog.Description>填写套餐信息以创建新的积分套餐</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="name">套餐名称 *</Label>
					<Input
						id="name"
						bind:value={adminStore.packageForm.name}
						placeholder="例如：新手礼包"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="packageType">套餐类型 *</Label>
					<Input
						id="packageType"
						bind:value={adminStore.packageForm.packageType}
						placeholder="例如：welcome, standard, premium"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="description">套餐描述</Label>
				<Textarea
					id="description"
					bind:value={adminStore.packageForm.description}
					placeholder="套餐的详细描述..."
					disabled={adminStore.savingPackage}
					rows={3}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="credits">积分数量 *</Label>
					<Input
						id="credits"
						type="number"
						bind:value={adminStore.packageForm.credits}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="validityDays">有效期（天）*</Label>
					<Input
						id="validityDays"
						type="number"
						bind:value={adminStore.packageForm.validityDays}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="price">价格（分）</Label>
					<Input
						id="price"
						type="number"
						bind:value={adminStore.packageForm.price}
						min="0"
						placeholder="0 表示免费"
						disabled={adminStore.savingPackage}
					/>
					<p class="text-xs text-muted-foreground">以分为单位，例如 4900 = ¥49.00</p>
				</div>
				<div class="space-y-2">
					<Label for="currency">货币</Label>
					<Input
						id="currency"
						bind:value={adminStore.packageForm.currency}
						placeholder="CNY"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="isActive"
					bind:checked={adminStore.packageForm.isActive}
					disabled={adminStore.savingPackage}
					class="h-4 w-4"
				/>
				<Label for="isActive">激活套餐</Label>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					adminStore.createPackageDialogOpen = false;
					adminStore.resetPackageForm();
				}}
				disabled={adminStore.savingPackage}
			>
				取消
			</Button>
			<Button onclick={() => adminStore.createPackage()} disabled={adminStore.savingPackage}>
				{adminStore.savingPackage ? '创建中...' : '创建套餐'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- 编辑套餐对话框 -->
<Dialog.Root bind:open={adminStore.editPackageDialogOpen}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>编辑积分套餐</Dialog.Title>
			<Dialog.Description>修改套餐信息</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="edit-name">套餐名称 *</Label>
					<Input
						id="edit-name"
						bind:value={adminStore.packageForm.name}
						placeholder="例如：新手礼包"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="edit-packageType">套餐类型 *</Label>
					<Input
						id="edit-packageType"
						bind:value={adminStore.packageForm.packageType}
						placeholder="例如：welcome, standard, premium"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="edit-description">套餐描述</Label>
				<Textarea
					id="edit-description"
					bind:value={adminStore.packageForm.description}
					placeholder="套餐的详细描述..."
					disabled={adminStore.savingPackage}
					rows={3}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="edit-credits">积分数量 *</Label>
					<Input
						id="edit-credits"
						type="number"
						bind:value={adminStore.packageForm.credits}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
				<div class="space-y-2">
					<Label for="edit-validityDays">有效期（天）*</Label>
					<Input
						id="edit-validityDays"
						type="number"
						bind:value={adminStore.packageForm.validityDays}
						min="1"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="edit-price">价格（分）</Label>
					<Input
						id="edit-price"
						type="number"
						bind:value={adminStore.packageForm.price}
						min="0"
						placeholder="0 表示免费"
						disabled={adminStore.savingPackage}
					/>
					<p class="text-xs text-muted-foreground">以分为单位，例如 4900 = ¥49.00</p>
				</div>
				<div class="space-y-2">
					<Label for="edit-currency">货币</Label>
					<Input
						id="edit-currency"
						bind:value={adminStore.packageForm.currency}
						placeholder="CNY"
						disabled={adminStore.savingPackage}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<input
					type="checkbox"
					id="edit-isActive"
					bind:checked={adminStore.packageForm.isActive}
					disabled={adminStore.savingPackage}
					class="h-4 w-4"
				/>
				<Label for="edit-isActive">激活套餐</Label>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					adminStore.editPackageDialogOpen = false;
					adminStore.resetPackageForm();
				}}
				disabled={adminStore.savingPackage}
			>
				取消
			</Button>
			<Button onclick={() => adminStore.updatePackage()} disabled={adminStore.savingPackage}>
				{adminStore.savingPackage ? '保存中...' : '保存修改'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
