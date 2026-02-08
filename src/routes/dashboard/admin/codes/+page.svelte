<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Gift, History, Copy, ChevronLeft, ChevronRight, ArrowLeft, Plus, Filter } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import { AdminDialogs, CodeRow } from '$lib/components/admin';

	onMount(() => {
		// 每次进入/返回页面都重新加载数据，确保最新
		adminStore.initCodesPage();
	});

	// 当 Tab 切换到历史时，懒加载数据
	function handleTabChange(value: string) {
		if (value === 'history' && !adminStore.history.initialized) {
			adminStore.history.initialized = true;
			adminStore.loadHistory();
		}
	}
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
					<Gift class="h-6 w-6 shrink-0 sm:h-8 sm:w-8" />
					<span class="truncate">兑换码管理</span>
				</h1>
				<p class="text-muted-foreground mt-1 text-sm sm:text-base truncate">生成、分发和管理兑换码，查看兑换历史</p>
			</div>
		</div>
		<Button class="self-start sm:self-auto shrink-0" onclick={() => (adminStore.generateDialogOpen = true)}>
			<Plus class="mr-2 h-4 w-4" />
			生成兑换码
		</Button>
	</div>

	<!-- 统计卡片（快照计数，进入页面后固定不变） -->
	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">兑换码总数</Card.Title>
				<Gift class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{adminStore.codePageSnapshotCounts.totalCodes}</div>
				<p class="text-xs text-muted-foreground">已生成兑换码数量</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">兑换历史</Card.Title>
				<History class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{adminStore.codePageSnapshotCounts.totalRedemptions}</div>
				<p class="text-xs text-muted-foreground">总兑换次数</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- 兑换码管理 -->
	<Card.Root>
		<Card.Header>
			<Card.Title>兑换码列表与历史</Card.Title>
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
					<!-- 筛选栏 -->
					<div class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex flex-wrap gap-2">
							<Button
								size="sm"
								variant={adminStore.codeStatusFilter === 'all' ? 'default' : 'outline'}
								onclick={() => {
									adminStore.setCodeStatusFilter('all');
									adminStore.loadCodes();
								}}
							>
								全部
							</Button>
							<Button
								size="sm"
								variant={adminStore.codeStatusFilter === 'active' ? 'default' : 'outline'}
								onclick={() => {
									adminStore.setCodeStatusFilter('active');
									adminStore.loadCodes();
								}}
							>
								有效
							</Button>
							<Button
								size="sm"
								variant={adminStore.codeStatusFilter === 'used' ? 'default' : 'outline'}
								onclick={() => {
									adminStore.setCodeStatusFilter('used');
									adminStore.loadCodes();
								}}
							>
								已使用
							</Button>
							<Button
								size="sm"
								variant={adminStore.codeStatusFilter === 'expired' ? 'default' : 'outline'}
								onclick={() => {
									adminStore.setCodeStatusFilter('expired');
									adminStore.loadCodes();
								}}
							>
								已过期
							</Button>
							<Button
								size="sm"
								variant={adminStore.codeStatusFilter === 'disabled' ? 'default' : 'outline'}
								onclick={() => {
									adminStore.setCodeStatusFilter('disabled');
									adminStore.loadCodes();
								}}
							>
								已禁用
							</Button>
						</div>
						{#if adminStore.packages.length > 0}
							<div class="flex items-center gap-2">
								<Filter class="h-4 w-4 text-muted-foreground shrink-0" />
								<select
									value={adminStore.codePackageFilter}
									onchange={(e) => {
										adminStore.setCodePackageFilter(e.currentTarget.value);
										adminStore.loadCodes();
									}}
									class="flex h-8 w-full sm:w-auto items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								>
									<option value="">全部套餐</option>
									{#each adminStore.packages as pkg}
										<option value={pkg.id}>
											{pkg.name} ({pkg.credits}积分)
										</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>

					{#if adminStore.codes.loading}
						<div class="space-y-2">
							<Skeleton class="h-16 w-full" />
							<Skeleton class="h-16 w-full" />
							<Skeleton class="h-16 w-full" />
						</div>
					{:else if adminStore.codes.items.length === 0}
						<div class="text-center py-12">
							<Gift class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h3 class="text-lg font-medium mb-2">
								{#if adminStore.codeStatusFilter !== 'all' || adminStore.codePackageFilter}
									无匹配的兑换码
								{:else}
									暂无兑换码
								{/if}
							</h3>
							<p class="text-muted-foreground mb-4">
								{#if adminStore.codeStatusFilter !== 'all' || adminStore.codePackageFilter}
									尝试调整筛选条件查看更多
								{:else}
									点击上方按钮生成兑换码
								{/if}
							</p>
							{#if adminStore.codeStatusFilter === 'all' && !adminStore.codePackageFilter}
								<Button onclick={() => (adminStore.generateDialogOpen = true)}>
									<Plus class="mr-2 h-4 w-4" />
									生成兑换码
								</Button>
							{/if}
						</div>
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
						<div class="text-center py-12">
							<History class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h3 class="text-lg font-medium mb-2">暂无兑换历史</h3>
							<p class="text-muted-foreground">用户兑换后将在此显示</p>
						</div>
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

	<!-- 使用说明 -->
	<Card.Root>
		<Card.Header>
			<Card.Title>使用说明</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3 text-sm">
			<div class="grid gap-4 md:grid-cols-2">
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">生成兑换码</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• 选择套餐、设置使用次数和过期时间</li>
						<li>• 一次最多生成 100 个兑换码</li>
						<li>• 复制兑换码分发给用户</li>
					</ul>
				</div>
				<div class="p-4 rounded-lg bg-muted/50">
					<p class="font-medium mb-2">兑换码规则</p>
					<ul class="text-muted-foreground space-y-1">
						<li>• 单次使用：一码一用，兑换后失效</li>
						<li>• 多次使用：可设置最大使用次数</li>
						<li>• 过期时间：兑换码本身的有效期</li>
						<li>• 套餐有效期：用户兑换后独立计算</li>
					</ul>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- 对话框 -->
<AdminDialogs />
