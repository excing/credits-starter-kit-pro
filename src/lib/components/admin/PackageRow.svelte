<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Edit, Trash2, Loader2 } from 'lucide-svelte';
	import { adminStore, type CreditPackage } from '$lib/stores/admin.svelte';

	interface Props {
		pkg: CreditPackage;
	}

	let { pkg }: Props = $props();

	const isOperating = $derived(adminStore.isOperating(pkg.id));
</script>

<Table.Row class={isOperating ? 'opacity-50' : ''}>
	<Table.Cell class="font-medium">{pkg.name}</Table.Cell>
	<Table.Cell>
		<Badge variant="secondary">{pkg.credits} 积分</Badge>
	</Table.Cell>
	<Table.Cell>{pkg.validityDays} 天</Table.Cell>
	<Table.Cell>
		{pkg.price ? `¥${(pkg.price / 100).toFixed(2)}` : '免费'}
	</Table.Cell>
	<Table.Cell>
		<Badge variant="outline">{pkg.packageType}</Badge>
	</Table.Cell>
	<Table.Cell>
		<Badge variant={pkg.isActive ? 'default' : 'secondary'}>
			{pkg.isActive ? '激活' : '停用'}
		</Badge>
	</Table.Cell>
	<Table.Cell class="text-right">
		<div class="flex justify-end gap-2">
			<Button
				size="sm"
				variant="outline"
				onclick={() => adminStore.openEditPackageDialog(pkg)}
				disabled={isOperating}
			>
				<Edit class="h-3 w-3" />
			</Button>
			<Button
				size="sm"
				variant="outline"
				onclick={() => adminStore.deletePackage(pkg.id)}
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
