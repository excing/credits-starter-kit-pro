<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Package, Gift, AlertCircle, DollarSign } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
</script>

<div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">积分套餐</Card.Title>
			<Package class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{adminStore.stats.totalPackages}</div>
			<p class="text-xs text-muted-foreground">当前可用套餐数量</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">兑换码</Card.Title>
			<Gift class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{adminStore.stats.totalCodes}</div>
			<p class="text-xs text-muted-foreground">已生成兑换码数量</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">未结清欠费</Card.Title>
			<AlertCircle class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{adminStore.stats.unsettledDebts}</div>
			<p class="text-xs text-muted-foreground">待处理欠费记录</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">欠费总额</Card.Title>
			<DollarSign class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{adminStore.stats.totalDebts}</div>
			<p class="text-xs text-muted-foreground">未结清积分总额</p>
		</Card.Content>
	</Card.Root>
</div>
