<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import DebtRow from './DebtRow.svelte';
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<ShieldCheck class="h-5 w-5" />
					欠费管理
				</Card.Title>
				<Card.Description>查看和管理用户欠费记录</Card.Description>
			</div>
			<div class="flex gap-2">
				<Button
					size="sm"
					variant={adminStore.debtFilter === 'unsettled' ? 'default' : 'outline'}
					onclick={() => adminStore.setDebtFilter('unsettled')}
				>
					未结清
				</Button>
				<Button
					size="sm"
					variant={adminStore.debtFilter === 'settled' ? 'default' : 'outline'}
					onclick={() => adminStore.setDebtFilter('settled')}
				>
					已结清
				</Button>
				<Button
					size="sm"
					variant={adminStore.debtFilter === 'all' ? 'default' : 'outline'}
					onclick={() => adminStore.setDebtFilter('all')}
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
			<p class="text-center text-muted-foreground py-8">
				{adminStore.debtFilter === 'unsettled'
					? '暂无未结清欠费'
					: adminStore.debtFilter === 'settled'
						? '暂无已结清欠费'
						: '暂无欠费记录'}
			</p>
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
			{@const pageInfo = adminStore.debts.pageInfo}
			<div class="flex items-center justify-between mt-4">
				<div class="text-sm text-muted-foreground">
					显示 {pageInfo.start} - {pageInfo.end} 条，共 {pageInfo.total} 条
				</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={!adminStore.debts.hasPrev}
						onclick={() => {
							adminStore.debts.page--;
							adminStore.loadDebts();
						}}
					>
						<ChevronLeft class="h-4 w-4" />
						上一页
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!adminStore.debts.hasMore}
						onclick={() => {
							adminStore.debts.page++;
							adminStore.loadDebts();
						}}
					>
						下一页
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
