<script lang="ts">
	import * as PaginationUI from '$lib/components/ui/pagination';

	interface Props {
		/** 数据总条数 */
		count: number;
		/** 每页条数 */
		perPage: number;
		/** 当前页码（1-based, bindable） */
		page: number;
		/** 页码变化回调 */
		onPageChange?: (page: number) => void;
		/** 额外 class */
		class?: string;
	}

	let {
		count,
		perPage,
		page = $bindable(1),
		onPageChange,
		class: className = ''
	}: Props = $props();

	let start = $derived(count === 0 ? 0 : (page - 1) * perPage + 1);
	let end = $derived(Math.min(page * perPage, count));
</script>

<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between {className}">
	<div class="text-sm text-muted-foreground whitespace-nowrap">
		显示 {start} - {end} 条，共 {count} 条
	</div>
	<PaginationUI.Root
		class="mx-0 w-auto"
		{count}
		{perPage}
		bind:page
		onPageChange={(p) => onPageChange?.(p)}
	>
		{#snippet children({ pages, currentPage })}
			<PaginationUI.Content>
				<PaginationUI.Item>
					<PaginationUI.Previous />
				</PaginationUI.Item>
				{#each pages as p (p.key)}
					{#if p.type === 'ellipsis'}
						<PaginationUI.Item>
							<PaginationUI.Ellipsis />
						</PaginationUI.Item>
					{:else}
						<PaginationUI.Item>
							<PaginationUI.Link page={p} isActive={currentPage === p.value}>
								{p.value}
							</PaginationUI.Link>
						</PaginationUI.Item>
					{/if}
				{/each}
				<PaginationUI.Item>
					<PaginationUI.Next />
				</PaginationUI.Item>
			</PaginationUI.Content>
		{/snippet}
	</PaginationUI.Root>
</div>
