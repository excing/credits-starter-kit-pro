<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2 } from 'lucide-svelte';
	import { adminStore, type CreditDebt } from '$lib/stores/admin.svelte';

	interface Props {
		debt: CreditDebt;
	}

	let { debt }: Props = $props();

	const isOperating = $derived(adminStore.isOperating(debt.id));
</script>

<Table.Row class={isOperating ? 'opacity-50' : ''}>
	<Table.Cell class="font-mono text-xs">
		{debt.userId.substring(0, 8)}...
	</Table.Cell>
	<Table.Cell>
		<Badge variant="destructive">{debt.amount} 积分</Badge>
	</Table.Cell>
	<Table.Cell>
		<Badge variant="outline">{debt.operationType}</Badge>
	</Table.Cell>
	<Table.Cell>
		<div class="text-sm">
			{new Date(debt.createdAt).toLocaleString('zh-CN')}
		</div>
	</Table.Cell>
	<Table.Cell>
		<Badge variant={debt.isSettled ? 'default' : 'secondary'}>
			{debt.isSettled ? '已结清' : '未结清'}
		</Badge>
	</Table.Cell>
	<Table.Cell>
		<div class="text-sm">
			{debt.settledAt ? new Date(debt.settledAt).toLocaleString('zh-CN') : '-'}
		</div>
	</Table.Cell>
	<Table.Cell class="text-right">
		{#if !debt.isSettled}
			<Button
				size="sm"
				variant="outline"
				onclick={() => adminStore.settleDebt(debt.id)}
				disabled={isOperating}
			>
				{#if isOperating}
					<Loader2 class="h-3 w-3 animate-spin mr-1" />
				{/if}
				手动结清
			</Button>
		{:else}
			<span class="text-sm text-muted-foreground">-</span>
		{/if}
	</Table.Cell>
</Table.Row>
