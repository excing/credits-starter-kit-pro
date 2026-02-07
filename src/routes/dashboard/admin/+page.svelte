<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Gift, Plus, Package, ShieldCheck, ArrowRight, History } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import { AdminStats, AdminDialogs } from '$lib/components/admin';

	onMount(() => {
		adminStore.init();
	});

	// 子页面入口配置
	const adminPages = [
		{
			title: '积分套餐',
			description: '创建和管理积分套餐，设置价格、有效期等',
			href: '/dashboard/admin/packages',
			icon: Package,
			stat: () => adminStore.stats.totalPackages,
			statLabel: '个套餐'
		},
		{
			title: '欠费管理',
			description: '查看和处理用户欠费记录，手动结清欠费',
			href: '/dashboard/admin/debts',
			icon: ShieldCheck,
			stat: () => adminStore.stats.unsettledDebts,
			statLabel: '条未结清'
		},
		{
			title: '兑换码管理',
			description: '生成、分发和管理兑换码，查看兑换历史',
			href: '/dashboard/admin/codes',
			icon: Gift,
			stat: () => adminStore.stats.totalCodes,
			statLabel: '个兑换码'
		}
	];
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold sm:text-3xl">管理员控制台</h1>
			<p class="text-muted-foreground mt-1 text-sm sm:text-base">管理积分套餐、兑换码和欠费记录</p>
		</div>
		<div class="flex gap-2">
			<Button
				onclick={() => {
					adminStore.resetPackageForm();
					adminStore.createPackageDialogOpen = true;
				}}
				variant="outline"
				size="sm"
				class="sm:size-default"
			>
				<Plus class="mr-1.5 h-4 w-4 sm:mr-2" />
				创建套餐
			</Button>
			<Button onclick={() => (adminStore.generateDialogOpen = true)} size="sm" class="sm:size-default">
				<Gift class="mr-1.5 h-4 w-4 sm:mr-2" />
				生成兑换码
			</Button>
		</div>
	</div>

	<!-- 统计卡片 -->
	<AdminStats />

	<!-- 子页面入口 -->
	<div class="grid gap-4 md:grid-cols-3">
		{#each adminPages as page}
			<Card.Root class="hover:border-primary/50 transition-colors cursor-pointer group" onclick={() => goto(page.href)}>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<page.icon class="h-5 w-5 text-primary" />
							</div>
							<div>
								<Card.Title class="text-lg">{page.title}</Card.Title>
							</div>
						</div>
						<ArrowRight class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground mb-3">{page.description}</p>
					<div class="flex items-center gap-2">
						<span class="text-2xl font-bold">{page.stat()}</span>
						<span class="text-sm text-muted-foreground">{page.statLabel}</span>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- 快捷操作提示 -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<History class="h-5 w-5" />
				快速入门
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3 text-sm">
			<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
				<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
				<div>
					<p class="font-medium mb-1">创建积分套餐</p>
					<p class="text-muted-foreground">
						点击"创建套餐"按钮，设置套餐名称、积分数量、有效期和价格
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
				<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
				<div>
					<p class="font-medium mb-1">生成兑换码</p>
					<p class="text-muted-foreground">
						选择套餐并生成兑换码，可设置使用次数和过期时间
					</p>
				</div>
			</div>
			<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
				<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
				<div>
					<p class="font-medium mb-1">分发给用户</p>
					<p class="text-muted-foreground">
						复制兑换码通过邮件或社交媒体分发，用户在积分页面兑换即可获得积分
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- 对话框 -->
<AdminDialogs />
