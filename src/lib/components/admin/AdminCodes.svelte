<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Gift, History, Copy, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import CodeRow from './CodeRow.svelte';

	// 当 Tab 切换到历史时，初始化并加载数据
	function handleTabChange(value: string) {
		if (value === 'history' && !adminStore.history.initialized) {
			adminStore.history.initialized = true;
			adminStore.loadHistory();
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Gift class="h-5 w-5" />
			兑换码管理
		</Card.Title>
		<Card.Description>查看和管理所有兑换码及兑换历史</Card.Description>
	</Card.Header>
	<Card.Content>
		<Tabs.Root bind:value={adminStore.codesTab} onValueChange={handleTabChange}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="codes">
					<Gift class="mr-2 h-4 w-4" />
					兑换码列表
				</Tabs.Trigger>
				<Tabs.Trigger value="history">
					<History class="mr-2 h-4 w-4" />
					兑换历史
				</Tabs.Trigger>
			</Tabs.List>

			<!-- 兑换码列表 Tab -->
			<Tabs.Content value="codes" class="mt-4">
				{#if adminStore.codes.loading}
					<div class="space-y-2">
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-16 w-full" />
					</div>
				{:else if adminStore.codes.items.length === 0}
					<p class="text-center text-muted-foreground py-8">暂无兑换码</p>
				{:else}
					<div class="space-y-4">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>兑换码</Table.Head>
									<Table.Head>套餐</Table.Head>
									<Table.Head>使用情况</Table.Head>
									<Table.Head>过期时间</Table.Head>
									<Table.Head>状态</Table.Head>
									<Table.Head class="text-right">操作</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each adminStore.codes.items as code (code.id)}
									<CodeRow {code} />
								{/each}
							</Table.Body>
						</Table.Root>

						<!-- 分页控件 -->
						{#if adminStore.codes.total > adminStore.codes.limit}
							{@const pageInfo = adminStore.codes.pageInfo}
							<div class="flex items-center justify-between">
								<div class="text-sm text-muted-foreground">
									显示 {pageInfo.start} - {pageInfo.end} 条，共 {pageInfo.total} 条
								</div>
								<div class="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={!adminStore.codes.hasPrev}
										onclick={() => {
											adminStore.codes.page--;
											adminStore.loadCodes();
										}}
									>
										<ChevronLeft class="h-4 w-4" />
										上一页
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={!adminStore.codes.hasMore}
										onclick={() => {
											adminStore.codes.page++;
											adminStore.loadCodes();
										}}
									>
										下一页
										<ChevronRight class="h-4 w-4" />
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</Tabs.Content>

			<!-- 兑换历史 Tab -->
			<Tabs.Content value="history" class="mt-4">
				{#if adminStore.history.loading}
					<div class="space-y-2">
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-16 w-full" />
						<Skeleton class="h-16 w-full" />
					</div>
				{:else if adminStore.history.items.length === 0}
					<p class="text-center text-muted-foreground py-8">暂无兑换历史</p>
				{:else}
					<div class="space-y-4">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>兑换码</Table.Head>
									<Table.Head>用户</Table.Head>
									<Table.Head>套餐</Table.Head>
									<Table.Head>获得积分</Table.Head>
									<Table.Head>兑换时间</Table.Head>
									<Table.Head>过期时间</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each adminStore.history.items as history (history.id)}
									<Table.Row>
										<Table.Cell class="font-mono text-xs">
											<div class="flex items-center gap-2">
												<span class="truncate max-w-[150px]">{history.codeId}</span>
												<Button
													size="sm"
													variant="ghost"
													onclick={() => adminStore.copyCode(history.codeId)}
												>
													<Copy class="h-3 w-3" />
												</Button>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-sm">
												<div class="font-medium">{history.user?.name || '未知用户'}</div>
												<div class="text-muted-foreground text-xs">
													{history.user?.email || '-'}
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-sm">
												<div class="font-medium">{history.package?.name || '未知套餐'}</div>
												<div class="text-muted-foreground text-xs">
													{history.package?.validityDays || 0} 天有效期
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="secondary">{history.creditsGranted} 积分</Badge>
										</Table.Cell>
										<Table.Cell>
											<div class="text-sm">
												{new Date(history.redeemedAt).toLocaleString('zh-CN')}
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-sm">
												{new Date(history.expiresAt).toLocaleDateString('zh-CN')}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>

						<!-- 分页控件 -->
						{#if adminStore.history.total > adminStore.history.limit}
							{@const pageInfo = adminStore.history.pageInfo}
							<div class="flex items-center justify-between">
								<div class="text-sm text-muted-foreground">
									显示 {pageInfo.start} - {pageInfo.end} 条，共 {pageInfo.total} 条
								</div>
								<div class="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={!adminStore.history.hasPrev}
										onclick={() => {
											adminStore.history.page--;
											adminStore.loadHistory();
										}}
									>
										<ChevronLeft class="h-4 w-4" />
										上一页
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={!adminStore.history.hasMore}
										onclick={() => {
											adminStore.history.page++;
											adminStore.loadHistory();
										}}
									>
										下一页
										<ChevronRight class="h-4 w-4" />
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</Card.Content>
</Card.Root>
