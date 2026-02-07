<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { DollarSign, Users, Coins, CalendarDays } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';

	let ov = $derived(adminStore.overviewStats);
	let loading = $derived(adminStore.overviewLoading);

	function formatCurrency(amount: number): string {
		return (amount / 100).toLocaleString('zh-CN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function formatNumber(n: number): string {
		return n.toLocaleString('zh-CN');
	}

	let consumePercent = $derived(
		ov.credits.totalGranted > 0
			? Math.round((ov.credits.totalConsumed / ov.credits.totalGranted) * 100)
			: 0
	);
</script>

<div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
	<!-- 1. 现金收入 -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">现金收入</Card.Title>
			<DollarSign class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-8 w-24 mb-1" />
				<Skeleton class="h-3 w-32" />
			{:else}
				<div class="text-2xl font-bold">&yen;{formatCurrency(ov.revenue.total)}</div>
				<p class="text-xs text-muted-foreground">
					本周 +&yen;{formatCurrency(ov.revenue.week)}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- 2. 用户统计 -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">用户总数</Card.Title>
			<Users class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-8 w-16 mb-1" />
				<Skeleton class="h-3 w-28" />
			{:else}
				<div class="text-2xl font-bold">{formatNumber(ov.users.total)}</div>
				<p class="text-xs text-muted-foreground">
					本周新增 +{formatNumber(ov.users.week)}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- 3. 积分消耗 / 总发放 -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">积分消耗</Card.Title>
			<Coins class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-8 w-28 mb-1" />
				<Skeleton class="h-3 w-32" />
			{:else}
				<div class="text-2xl font-bold">
					{formatNumber(ov.credits.totalConsumed)}<span class="text-sm font-normal text-muted-foreground">/{formatNumber(ov.credits.totalGranted)}</span>
				</div>
				<p class="text-xs text-muted-foreground">
					消耗率 {consumePercent}%
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- 4. 本周概览 -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">本周概览</Card.Title>
			<CalendarDays class="h-4 w-4 text-muted-foreground" />
		</Card.Header>
		<Card.Content>
			{#if loading}
				<Skeleton class="h-8 w-20 mb-1" />
				<Skeleton class="h-3 w-36" />
			{:else}
				<div class="text-2xl font-bold">+{formatNumber(ov.credits.weekGranted)}</div>
				<p class="text-xs text-muted-foreground">
					积分发放 | {formatNumber(ov.users.week)} 新用户
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
