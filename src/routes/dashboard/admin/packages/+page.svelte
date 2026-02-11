<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Package, Plus, ArrowLeft } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import { AdminDialogs, PackageRow } from '$lib/components/admin';

	onMount(() => {
		if (adminStore.packages.length === 0) {
			adminStore.loadPackages();
		}
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
					<Package class="h-6 w-6 shrink-0 sm:h-8 sm:w-8" />
					<span class="truncate">积分套餐管理</span>
				</h1>
				<p class="text-muted-foreground mt-1 text-sm sm:text-base truncate">创建和管理积分套餐，设置价格、有效期等</p>
			</div>
		</div>
		<Button
			class="self-start sm:self-auto shrink-0"
			onclick={() => {
				adminStore.resetPackageForm();
				adminStore.createPackageDialogOpen = true;
			}}
		>
			<Plus class="mr-2 h-4 w-4" />
			创建套餐
		</Button>
	</div>

	<!-- 套餐列表 -->
	<Card.Root>
		<Card.Header>
			<Card.Title>所有套餐</Card.Title>
			<Card.Description>当前系统中的所有积分套餐</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if adminStore.packagesLoading}
				<div class="space-y-2">
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
					<Skeleton class="h-16 w-full" />
				</div>
			{:else if adminStore.packages.length === 0}
				<div class="text-center py-12">
					<Package class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
					<h3 class="text-lg font-medium mb-2">暂无套餐</h3>
					<p class="text-muted-foreground mb-4">点击上方按钮创建第一个积分套餐</p>
					<Button
						onclick={() => {
							adminStore.resetPackageForm();
							adminStore.createPackageDialogOpen = true;
						}}
					>
						<Plus class="mr-2 h-4 w-4" />
						创建套餐
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>套餐名称</Table.Head>
							<Table.Head>积分数</Table.Head>
							<Table.Head>有效期</Table.Head>
							<Table.Head>价格</Table.Head>
							<Table.Head>类型</Table.Head>
							<Table.Head>状态</Table.Head>
							<Table.Head class="text-right">操作</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each adminStore.packages as pkg (pkg.id)}
							<PackageRow {pkg} />
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- 使用说明 -->
	<Card.Root>
		<Card.Header>
			<Card.Title>套餐说明</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3 text-sm">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">套餐类型</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• <strong>welcome</strong>: 新用户欢迎礼包</li>
						<li>• <strong>standard</strong>: 标准套餐</li>
						<li>• <strong>premium</strong>: 高级套餐</li>
						<li>• 可自定义其他类型</li>
					</ul>
				</div>
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">价格设置</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• 价格以分为单位存储</li>
						<li>• 0 表示免费套餐</li>
						<li>• 例如：4900 = ¥49.00</li>
						<li>• 支持多币种（CNY、USD等）</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- 对话框 -->
<AdminDialogs />
