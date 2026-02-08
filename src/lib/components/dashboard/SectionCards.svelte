<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import {
        TrendingUp,
        Activity,
        Coins,
        Package,
    } from "lucide-svelte";
    import { authState, statsState } from "$lib/stores/auth";

    // 前两张卡片依赖 authState，后两张依赖 statsState
    let authLoading = $derived(!$authState.loaded);
    let statsLoading = $derived($statsState.loading);

    const cards = $derived([
        {
            title: "可用积分",
            value: $authState.user?.credits?.toString() ?? "0",
            change: "查看详情",
            trending: "up",
            icon: Coins,
            href: "/dashboard/credits",
            loading: authLoading,
        },
        {
            title: "有效套餐",
            value: $authState.user?.activePackages?.toString() ?? "0",
            change: "个套餐",
            trending: "neutral",
            icon: Package,
            href: "/dashboard/credits",
            loading: authLoading,
        },
        {
            title: "总消费",
            value: $statsState.data?.totalSpent?.toString() ?? "0",
            change: "积分",
            trending: "neutral",
            icon: Activity,
            loading: statsLoading,
        },
        {
            title: "总获得",
            value: $statsState.data?.totalEarned?.toString() ?? "0",
            change: "积分",
            trending: "neutral",
            icon: TrendingUp,
            loading: statsLoading,
        },
    ]);
</script>

<div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
    {#each cards as card}
        <Card.Root>
            <Card.Header
                class="flex flex-row items-center justify-between space-y-0 pb-2"
            >
                <Card.Title class="text-sm font-medium">{card.title}</Card.Title
                >
                <card.icon class="text-muted-foreground h-4 w-4" />
            </Card.Header>
            <Card.Content>
                {#if card.loading}
                    <Skeleton class="h-8 w-24 mb-1" />
                    <Skeleton class="h-3 w-16" />
                {:else}
                    <div class="text-2xl font-bold">{card.value}</div>
                    <div class="text-muted-foreground flex items-center text-xs mt-1">
                        {#if card.href}
                            <a href={card.href} class="text-primary hover:underline">
                                {card.change} →
                            </a>
                        {:else}
                            <span>{card.change}</span>
                        {/if}
                    </div>
                {/if}
            </Card.Content>
        </Card.Root>
    {/each}
</div>
