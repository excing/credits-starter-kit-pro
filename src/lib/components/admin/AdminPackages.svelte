<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Package } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import PackageRow from './PackageRow.svelte';
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Package class="h-5 w-5" />
			积分套餐
		</Card.Title>
		<Card.Description>当前可用的积分套餐</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if adminStore.packagesLoading}
			<div class="space-y-2">
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
				<Skeleton class="h-16 w-full" />
			</div>
		{:else if adminStore.packages.length === 0}
			<p class="text-center text-muted-foreground py-8">暂无套餐</p>
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
