<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, Trash2, Loader2 } from 'lucide-svelte';
	import { adminStore, type RedemptionCode } from '$lib/stores/admin.svelte';

	interface Props {
		code: RedemptionCode;
	}

	let { code }: Props = $props();

	const isOperating = $derived(adminStore.isOperating(code.id));
	const isExpired = $derived(new Date(code.expiresAt) <= new Date());
	const statusText = $derived(
		code.isActive ? (isExpired ? '已过期' : '有效') : '已禁用'
	);
</script>

<Table.Row class={isOperating ? 'opacity-50' : ''}>
	<Table.Cell class="font-mono text-xs">
		<div class="flex items-center gap-2">
			<span class="truncate max-w-[200px]">{code.code}</span>
			<Button
				size="sm"
				variant="ghost"
				onclick={() => adminStore.copyCode(code.code)}
				disabled={isOperating}
			>
				<Copy class="h-3 w-3" />
			</Button>
		</div>
	</Table.Cell>
	<Table.Cell>
		<div class="text-sm">
			<div class="font-medium">{code.package?.name || '未知套餐'}</div>
			<div class="text-muted-foreground text-xs">
				{code.package?.credits || 0} 积分
			</div>
		</div>
	</Table.Cell>
	<Table.Cell>
		<div class="text-sm">
			{code.usedCount} / {code.maxUses === -1 ? '∞' : code.maxUses}
		</div>
	</Table.Cell>
	<Table.Cell>
		<div class="text-sm">
			{new Date(code.expiresAt).toLocaleDateString('zh-CN')}
		</div>
	</Table.Cell>
	<Table.Cell>
		<Badge variant={code.isActive && !isExpired ? 'default' : 'secondary'}>
			{statusText}
		</Badge>
	</Table.Cell>
	<Table.Cell class="text-right">
		<div class="flex justify-end gap-2">
			<Button
				size="sm"
				variant="outline"
				onclick={() => adminStore.toggleCodeStatus(code.id, code.isActive)}
				disabled={isOperating}
			>
				{#if isOperating}
					<Loader2 class="h-3 w-3 animate-spin mr-1" />
				{/if}
				{code.isActive ? '禁用' : '启用'}
			</Button>
			<Button
				size="sm"
				variant="outline"
				onclick={() => adminStore.deleteCode(code.id)}
				disabled={isOperating}
			>
				{#if isOperating}
					<Loader2 class="h-3 w-3 animate-spin" />
				{:else}
					<Trash2 class="h-3 w-3" />
				{/if}
			</Button>
		</div>
	</Table.Cell>
</Table.Row>
