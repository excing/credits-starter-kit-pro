<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Copy, Check } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import PackageFormDialog from './PackageFormDialog.svelte';
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
					<Label>选择套餐</Label>
					<Select.Root type="single" bind:value={adminStore.generateForm.packageId} disabled={adminStore.generating}>
						<Select.Trigger class="w-full">
							{#if adminStore.generateForm.packageId}
								{@const selected = adminStore.packages.find(p => p.id === adminStore.generateForm.packageId)}
								{selected ? `${selected.name} (${selected.credits}积分, ${selected.validityDays}天)` : '请选择套餐'}
							{:else}
								请选择套餐
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each adminStore.packages as pkg}
								<Select.Item value={pkg.id} label="{pkg.name} ({pkg.credits}积分, {pkg.validityDays}天)" />
							{/each}
						</Select.Content>
					</Select.Root>
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

<PackageFormDialog mode="create" bind:open={adminStore.createPackageDialogOpen} />
<PackageFormDialog mode="edit" bind:open={adminStore.editPackageDialogOpen} />
