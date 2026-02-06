<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import {
        TrendingUp,
        Activity,
        Coins,
        Package,
    } from "lucide-svelte";
    import { currentUser, userStats, statsLoading } from "$lib/stores/auth";

    const cards = $derived([
        {
            title: "可用积分",
            value: $currentUser?.credits?.toString() ?? "0",
            change: "查看详情",
            trending: "up",
            icon: Coins,
            href: "/dashboard/credits",
        },
        {
            title: "有效套餐",
            value: $currentUser?.activePackages?.toString() ?? "0",
            change: "个套餐",
            trending: "neutral",
            icon: Package,
            href: "/dashboard/credits",
        },
        {
            title: "总消费",
            value: $userStats?.totalSpent?.toString() ?? "0",
            change: "积分",
            trending: "neutral",
            icon: Activity,
        },
        {
            title: "总获得",
            value: $userStats?.totalEarned?.toString() ?? "0",
            change: "积分",
            trending: "neutral",
            icon: TrendingUp,
        },
    ]);
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {#if $statsLoading}
                    <div class="h-8 w-24 bg-muted animate-pulse rounded"></div>
                {:else}
                    <div class="text-2xl font-bold">{card.value}</div>
                {/if}
                <div class="text-muted-foreground flex items-center text-xs mt-1">
                    {#if card.href}
                        <a href={card.href} class="text-primary hover:underline">
                            {card.change} →
                        </a>
                    {:else}
                        <span>{card.change}</span>
                    {/if}
                </div>
            </Card.Content>
        </Card.Root>
    {/each}
</div>
