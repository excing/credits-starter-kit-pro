<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { authStore } from "$lib/stores/auth.svelte";

    // 从 store 获取月度消费数据，无数据时使用空数组
    let data = $derived(
        authStore.stats?.monthlySpending ?? []
    );
    let loading = $derived(!authStore.statsLoaded || authStore.statsLoading);
    let maxValue = $derived(
        data.length > 0 ? Math.max(...data.map((d) => d.total), 1) : 1
    );
    let hasData = $derived(data.some((d) => d.total > 0));
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>消费概览</Card.Title>
        <Card.Description>近 6 个月积分消费统计</Card.Description>
    </Card.Header>
    <Card.Content>
        {#if loading}
            <div class="flex h-[300px] items-end justify-between gap-2">
                {#each Array(6) as _}
                    <div class="flex flex-1 flex-col items-center gap-2">
                        <Skeleton class="w-full rounded-t-md" style="height: {80 + Math.random() * 170}px" />
                        <Skeleton class="h-3 w-8" />
                    </div>
                {/each}
            </div>
        {:else if !hasData}
            <div class="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                <p class="text-sm">暂无消费记录</p>
                <p class="mt-1 text-xs">使用 AI 聊天等功能后，消费数据将在此展示</p>
            </div>
        {:else}
            <div class="flex h-[300px] items-end justify-between gap-2">
                {#each data as item}
                    <div class="group flex flex-1 flex-col items-center gap-2">
                        <span class="text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            {item.total}
                        </span>
                        <div
                            class="bg-primary w-full rounded-t-md transition-all hover:opacity-80"
                            style="height: {(item.total / maxValue) * 230}px"
                        ></div>
                        <span class="text-muted-foreground text-xs"
                            >{item.label}</span
                        >
                    </div>
                {/each}
            </div>
        {/if}
    </Card.Content>
</Card.Root>
