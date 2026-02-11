<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { DollarSign, Users, Coins, CalendarDays, TrendingUp } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';

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
	<div class="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-md">
		<div class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10 transition-transform group-hover:scale-150"></div>
		<div class="flex items-center justify-between mb-3">
			<span class="text-sm font-medium text-muted-foreground">现金收入</span>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
				<DollarSign class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
			</div>
		</div>
		{#if loading}
			<Skeleton class="h-8 w-24 mb-2" />
			<Skeleton class="h-4 w-32" />
		{:else}
			<div class="text-2xl font-bold tracking-tight">&yen;{formatCurrency(ov.revenue.total)}</div>
			<div class="mt-1 flex items-center gap-1.5">
				{#if ov.revenue.week > 0}
					<span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
						<TrendingUp class="h-3 w-3" />
						+&yen;{formatCurrency(ov.revenue.week)}
					</span>
				{/if}
				<span class="text-xs text-muted-foreground">本周</span>
			</div>
		{/if}
	</div>

	<!-- 2. 用户统计 -->
	<div class="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-md">
		<div class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 transition-transform group-hover:scale-150"></div>
		<div class="flex items-center justify-between mb-3">
			<span class="text-sm font-medium text-muted-foreground">用户总数</span>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
				<Users class="h-4 w-4 text-blue-600 dark:text-blue-400" />
			</div>
		</div>
		{#if loading}
			<Skeleton class="h-8 w-16 mb-2" />
			<Skeleton class="h-4 w-28" />
		{:else}
			<div class="text-2xl font-bold tracking-tight">{formatNumber(ov.users.total)}</div>
			<div class="mt-1 flex items-center gap-1.5">
				{#if ov.users.week > 0}
					<span class="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
						<TrendingUp class="h-3 w-3" />
						+{formatNumber(ov.users.week)}
					</span>
				{/if}
				<span class="text-xs text-muted-foreground">本周新增</span>
			</div>
		{/if}
	</div>

	<!-- 3. 积分消耗 -->
	<div class="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-md">
		<div class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10 transition-transform group-hover:scale-150"></div>
		<div class="flex items-center justify-between mb-3">
			<span class="text-sm font-medium text-muted-foreground">积分消耗</span>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
				<Coins class="h-4 w-4 text-amber-600 dark:text-amber-400" />
			</div>
		</div>
		{#if loading}
			<Skeleton class="h-8 w-28 mb-2" />
			<Skeleton class="h-4 w-32" />
		{:else}
			<div class="text-2xl font-bold tracking-tight">
				{formatNumber(ov.credits.totalConsumed)}
			</div>
			<div class="mt-2 space-y-1.5">
				<div class="flex items-center justify-between text-xs">
					<span class="text-muted-foreground">消耗率</span>
					<span class="font-medium">{consumePercent}%</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-amber-500 transition-all duration-500"
						style="width: {consumePercent}%"
					></div>
				</div>
				<p class="text-xs text-muted-foreground">
					总发放 {formatNumber(ov.credits.totalGranted)}
				</p>
			</div>
		{/if}
	</div>

	<!-- 4. 本周概览 -->
	<div class="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-md">
		<div class="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-violet-500/10 transition-transform group-hover:scale-150"></div>
		<div class="flex items-center justify-between mb-3">
			<span class="text-sm font-medium text-muted-foreground">本周概览</span>
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
				<CalendarDays class="h-4 w-4 text-violet-600 dark:text-violet-400" />
			</div>
		</div>
		{#if loading}
			<Skeleton class="h-8 w-20 mb-2" />
			<Skeleton class="h-4 w-36" />
		{:else}
			<div class="text-2xl font-bold tracking-tight">+{formatNumber(ov.credits.weekGranted)}</div>
			<div class="mt-1 flex items-center gap-2">
				<span class="text-xs text-muted-foreground">积分发放</span>
				<span class="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
				<span class="text-xs text-muted-foreground">{formatNumber(ov.users.week)} 新用户</span>
			</div>
		{/if}
	</div>
</div>
