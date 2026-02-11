<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ShieldCheck } from '@lucide/svelte';
	import { adminStore } from '$lib/stores/admin';
	import DebtRow from './DebtRow.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
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
