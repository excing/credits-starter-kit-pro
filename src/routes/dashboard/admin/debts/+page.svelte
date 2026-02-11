<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ShieldCheck, ArrowLeft, AlertCircle, DollarSign } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import { DebtRow } from '$lib/components/admin';
	import Pagination from '$lib/components/common/Pagination.svelte';

	onMount(() => {
		// 每次进入/返回页面都重新加载，确保数据最新
		adminStore.debtFilter = 'unsettled';
		adminStore.debts.page = 1;
		adminStore.debts.initialized = true;
		adminStore.loadDebts();
	});
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6">
	<!-- 页面标题 -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3 sm:gap-4">
			<Button variant="ghost" size="icon" class="shrink-0" onclick={() => goto('/dashboard/admin')}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div class="min-w-0">
				<h1 class="text-2xl font-bold flex items-center gap-2 sm:text-3xl sm:gap-3">
					<ShieldCheck class="h-6 w-6 shrink-0 sm:h-8 sm:w-8" />
					<span class="truncate">欠费管理</span>
				</h1>
				<p class="text-muted-foreground mt-1 text-sm sm:text-base truncate">查看和处理用户欠费记录</p>
			</div>
		</div>
	</div>

	<!-- 统计卡片 -->
	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">未结清欠费</Card.Title>
				<AlertCircle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				{#if adminStore.debts.loading}
					<Skeleton class="h-8 w-16 mb-1" />
					<Skeleton class="h-3 w-24" />
				{:else}
					<div class="text-2xl font-bold">{adminStore.debts.items.filter((d) => !d.isSettled).length}</div>
					<p class="text-xs text-muted-foreground">待处理欠费记录</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">欠费总额</Card.Title>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				{#if adminStore.debts.loading}
					<Skeleton class="h-8 w-20 mb-1" />
					<Skeleton class="h-3 w-24" />
				{:else}
					<div class="text-2xl font-bold">{adminStore.debts.items.filter((d) => !d.isSettled).reduce((sum, d) => sum + d.amount, 0)}</div>
					<p class="text-xs text-muted-foreground">未结清积分总额</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- 欠费列表 -->
	<Card.Root>
		<Card.Header>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<Card.Title>欠费记录</Card.Title>
					<Card.Description>查看和管理用户欠费记录</Card.Description>
				</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant={adminStore.debtFilter === 'unsettled' ? 'default' : 'outline'}
						onclick={() => {
							adminStore.setDebtFilter('unsettled');
							adminStore.loadDebts();
						}}
					>
						未结清
					</Button>
					<Button
						size="sm"
						variant={adminStore.debtFilter === 'settled' ? 'default' : 'outline'}
						onclick={() => {
							adminStore.setDebtFilter('settled');
							adminStore.loadDebts();
						}}
					>
						已结清
					</Button>
					<Button
						size="sm"
						variant={adminStore.debtFilter === 'all' ? 'default' : 'outline'}
						onclick={() => {
							adminStore.setDebtFilter('all');
							adminStore.loadDebts();
						}}
					>
						全部
					</Button>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			{#if adminStore.debts.loading}
				<div class="space-y-2">
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
				</div>
			{:else if adminStore.debts.items.length === 0}
				<div class="text-center py-12">
					<ShieldCheck class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h3 class="text-lg font-medium mb-2">
						{adminStore.debtFilter === 'unsettled'
							? '暂无未结清欠费'
							: adminStore.debtFilter === 'settled'
								? '暂无已结清欠费'
								: '暂无欠费记录'}
					</h3>
					<p class="text-muted-foreground">
						{adminStore.debtFilter === 'unsettled'
							? '所有欠费已结清，太棒了！'
							: '尝试切换筛选条件查看更多'}
					</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>用户ID</Table.Head>
							<Table.Head>欠费金额</Table.Head>
							<Table.Head>操作类型</Table.Head>
							<Table.Head>创建时间</Table.Head>
							<Table.Head>状态</Table.Head>
							<Table.Head>结清时间</Table.Head>
							<Table.Head class="text-right">操作</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each adminStore.debts.items as debt (debt.id)}
							<DebtRow {debt} />
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}

			<!-- 分页控件 -->
			{#if adminStore.debts.total > adminStore.debts.limit}
				<Pagination
					count={adminStore.debts.total}
					perPage={adminStore.debts.limit}
					bind:page={adminStore.debts.page}
					onPageChange={() => adminStore.loadDebts()}
					class="mt-4"
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- 使用说明 -->
	<Card.Root>
		<Card.Header>
			<Card.Title>欠费说明</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3 text-sm">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">欠费产生</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• 用户积分不足时使用服务</li>
						<li>• 系统会记录欠费金额</li>
						<li>• 用户需充值后补缴</li>
					</ul>
				</div>
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">手动结清</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• 管理员可手动结清欠费</li>
						<li>• 适用于特殊情况处理</li>
						<li>• 结清后不可撤销</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
