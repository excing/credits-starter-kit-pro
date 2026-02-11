<script lang="ts">
    import SectionCards from "$lib/components/dashboard/SectionCards.svelte";
    import ChartInteractive from "$lib/components/dashboard/ChartInteractive.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { ShieldCheck, Gift } from "@lucide/svelte";
    import { goto } from "$app/navigation";

    let { data } = $props();
</script>

<section class="flex w-full flex-col items-start justify-start p-6">
    <div class="w-full">
        <div class="flex flex-col items-start justify-center gap-2">
            <h1 class="text-3xl font-semibold tracking-tight">
                控制台概览
            </h1>
            <p class="text-muted-foreground">
                数据概览与积分消费统计
            </p>
        </div>
        <div class="@container/main flex flex-1 flex-col gap-2">
            <div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />

                <!-- 管理员快捷入口 -->
                {#if data.isAdmin }
                    <Card.Root class="border-primary/20 bg-primary/5">
                        <Card.Header>
                            <Card.Title class="flex items-center gap-2">
                                <ShieldCheck class="h-5 w-5 text-primary" />
                                管理员控制台
                            </Card.Title>
                            <Card.Description>
                                管理积分套餐和生成兑换码
                            </Card.Description>
                        </Card.Header>
                        <Card.Content class="flex gap-3">
                            <Button onclick={() => goto('/dashboard/admin')} variant="default">
                                <ShieldCheck class="mr-2 h-4 w-4" />
                                进入管理后台
                            </Button>
                            <Button onclick={() => goto('/dashboard/admin')} variant="outline">
                                <Gift class="mr-2 h-4 w-4" />
                                生成兑换码
                            </Button>
                        </Card.Content>
                    </Card.Root>
                {/if}

                <ChartInteractive />
            </div>
        </div>
    </div>
</section>
