<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Gift, Plus, Package, ShieldCheck, ArrowRight, Zap } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import { AdminStats, AdminDialogs } from '$lib/components/admin';

	let loading = $derived(adminStore.overviewLoading);

	onMount(() => {
		adminStore.init();
	});

	// 每张卡片对应的色系
	const cardThemes = [
		{ bg: 'bg-blue-500/10', hoverBg: 'hover:border-blue-500/40', iconColor: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-500' },
		{ bg: 'bg-rose-500/10', hoverBg: 'hover:border-rose-500/40', iconColor: 'text-rose-600 dark:text-rose-400', barColor: 'bg-rose-500' },
		{ bg: 'bg-amber-500/10', hoverBg: 'hover:border-amber-500/40', iconColor: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500' },
	];

	// 子页面入口配置
	const adminPages = [
		{
			title: '积分套餐',
			description: '创建和管理积分套餐，设置价格与有效期',
			href: '/dashboard/admin/packages',
			icon: Package,
			stat: () => adminStore.stats.totalPackages,
			statLabel: '个套餐',
			subStat: null as (() => string) | null
		},
		{
			title: '欠费管理',
			description: '查看和处理用户欠费记录',
			href: '/dashboard/admin/debts',
			icon: ShieldCheck,
			stat: () => adminStore.stats.unsettledDebts,
			statLabel: '条待处理',
			subStat: () => `未结清 ${adminStore.stats.unsettledDebtAmount} 积分`
		},
		{
			title: '兑换码管理',
			description: '生成、分发和管理兑换码',
			href: '/dashboard/admin/codes',
			icon: Gift,
			stat: () => adminStore.stats.totalCodes,
			statLabel: '个兑换码',
			subStat: () => `已兑换 ${adminStore.stats.totalRedemptions} 次`
		}
	];

	const quickActions = [
		{ label: '创建套餐', icon: Package, action: () => { adminStore.resetPackageForm(); adminStore.createPackageDialogOpen = true; } },
		{ label: '生成兑换码', icon: Gift, action: () => { adminStore.generateDialogOpen = true; } },
	];
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">管理员控制台</h1>
			<p class="text-muted-foreground mt-1 text-sm">管理积分套餐、兑换码和欠费记录</p>
		</div>
		<div class="flex gap-2">
			<Button
				onclick={() => {
					adminStore.resetPackageForm();
					adminStore.createPackageDialogOpen = true;
				}}
				variant="outline"
				size="sm"
			>
				<Plus class="mr-1.5 h-4 w-4" />
				<span class="hidden sm:inline">创建套餐</span>
				<span class="sm:hidden">套餐</span>
			</Button>
			<Button onclick={() => (adminStore.generateDialogOpen = true)} size="sm">
				<Gift class="mr-1.5 h-4 w-4" />
				<span class="hidden sm:inline">生成兑换码</span>
				<span class="sm:hidden">兑换码</span>
			</Button>
		</div>
	</div>

	<!-- 统计卡片 -->
	<AdminStats />

	<!-- 功能模块 -->
	<div>
		<h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">功能模块</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each adminPages as page, i}
				{@const theme = cardThemes[i % cardThemes.length]}
				<button
					onclick={() => goto(page.href)}
					class="group relative flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-md {theme.hoverBg}"
				>
					<!-- Icon -->
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {theme.bg} transition-colors">
						<page.icon class="h-5 w-5 {theme.iconColor}" />
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between gap-2">
							<h3 class="font-semibold">{page.title}</h3>
							<ArrowRight class="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
						</div>
						<p class="text-sm text-muted-foreground mt-0.5 line-clamp-1">{page.description}</p>

						<!-- Stats -->
						<div class="mt-3 flex items-center gap-3">
							{#if loading}
								<Skeleton class="h-6 w-16" />
							{:else}
								<span class="text-xl font-bold">{page.stat()}</span>
								<span class="text-sm text-muted-foreground">{page.statLabel}</span>
							{/if}
						</div>
						{#if page.subStat}
							{#if loading}
								<Skeleton class="h-3.5 w-28 mt-1.5" />
							{:else}
								<p class="text-xs text-muted-foreground mt-1">{page.subStat()}</p>
							{/if}
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- 快速入门指引 -->
	<div class="rounded-xl border bg-card overflow-hidden">
		<div class="flex items-center gap-2 border-b px-5 py-3.5">
			<Zap class="h-4 w-4 text-amber-500" />
			<h2 class="text-sm font-semibold">快速入门</h2>
		</div>
		<div class="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
			<div class="p-5 flex flex-col">
				<div class="flex items-center gap-2.5 mb-2">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
					<p class="font-medium text-sm">创建积分套餐</p>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed">设置套餐名称、积分数量、有效期和价格</p>
			</div>
			<div class="p-5 flex flex-col">
				<div class="flex items-center gap-2.5 mb-2">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400">2</span>
					<p class="font-medium text-sm">生成兑换码</p>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed">选择套餐并生成兑换码，可设置使用次数和过期时间</p>
			</div>
			<div class="p-5 flex flex-col">
				<div class="flex items-center gap-2.5 mb-2">
					<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">3</span>
					<p class="font-medium text-sm">分发给用户</p>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed">复制兑换码分发给用户，在积分页面兑换即可获得积分</p>
			</div>
		</div>
	</div>
</div>

<!-- 对话框 -->
<AdminDialogs />
