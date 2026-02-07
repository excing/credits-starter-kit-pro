<script lang="ts">
    import { onMount } from "svelte";
    import { authState, statsState, afterCreditsEarned } from "$lib/stores/auth";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Table from "$lib/components/ui/table";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Badge } from "$lib/components/ui/badge";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Coins, Gift, History, AlertCircle, AlertTriangle } from "lucide-svelte";
    import { toast } from "svelte-sonner";

    let loading = $state(true);
    let redeeming = $state(false);
    let redeemDialogOpen = $state(false);
    let redeemCode = $state("");
    let transactions = $state<any[]>([]);
    let packages = $state<any[]>([]);
    let debts = $state<any[]>([]);
    let debtsLoading = $state(true);

    // 加载页面特定数据（交易历史和套餐列表）
    async function loadPageData() {
        loading = true;
        try {
            // 并行获取交易历史、用户套餐和欠费记录
            const [historyRes, packagesRes, debtsRes] = await Promise.all([
                fetch("/api/user/credits/history?limit=20"),
                fetch("/api/user/credits/packages"),
                fetch("/api/user/credits/debts")
            ]);

            if (historyRes.ok) {
                const data = await historyRes.json();
                transactions = data.transactions;
            }

            if (packagesRes.ok) {
                const data = await packagesRes.json();
                packages = data.packages;
            }

            if (debtsRes.ok) {
                const data = await debtsRes.json();
                debts = data.debts;
            }
        } catch (error) {
            console.error("加载数据失败:", error);
            toast.error("加载数据失败");
        } finally {
            loading = false;
            debtsLoading = false;
        }
    }

    // 兑换码
    async function handleRedeem() {
        if (!redeemCode.trim()) {
            toast.error("请输入兑换码");
            return;
        }

        redeeming = true;
        try {
            const res = await fetch("/api/user/credits/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: redeemCode.trim() }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "兑换成功！");
                redeemCode = "";
                redeemDialogOpen = false;
                // 兑换成功后刷新积分和统计数据
                await afterCreditsEarned();
                // 重新加载页面数据
                await loadPageData();
            } else {
                toast.error(data.error || "兑换失败");
            }
        } catch (error) {
            console.error("兑换失败:", error);
            toast.error("兑换失败，请稍后重试");
        } finally {
            redeeming = false;
        }
    }

    // 格式化日期
    function formatDate(date: string) {
        return new Date(date).toLocaleString("zh-CN");
    }

    // 获取交易类型标签
    function getTransactionTypeBadge(type: string) {
        const types: Record<string, { label: string; variant: any }> = {
            redemption: { label: "兑换", variant: "default" },
            chat_usage: { label: "聊天", variant: "secondary" },
            image_generation: { label: "生图", variant: "secondary" },
            purchase: { label: "购买", variant: "default" },
            subscription: { label: "订阅", variant: "default" },
            admin_adjustment: { label: "调整", variant: "outline" },
            refund: { label: "退款", variant: "outline" },
        };
        return types[type] || { label: type, variant: "outline" };
    }

    onMount(() => {
        loadPageData();
    });
</script>

<div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold">积分管理</h1>
            <p class="text-muted-foreground mt-1">查看余额、兑换积分和交易历史</p>
        </div>
    </div>

    <!-- 积分统计卡片 -->
    {#if $statsState.data}
        <div class="grid gap-4 grid-cols-2 md:grid-cols-3">
            <Card.Root>
                <Card.Header>
                    <Card.Title class="text-sm font-medium">总获得</Card.Title>
                </Card.Header>
                <Card.Content>
                    {#if $statsState.loading}
                        <Skeleton class="h-8 w-24" />
                    {:else}
                        <div class="text-2xl font-bold text-green-600">
                            +{$statsState.data.totalEarned}
                        </div>
                        <p class="text-xs text-muted-foreground mt-1">
                            累计获得积分
                        </p>
                    {/if}
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <Card.Title class="text-sm font-medium">总消费</Card.Title>
                </Card.Header>
                <Card.Content>
                    {#if $statsState.loading}
                        <Skeleton class="h-8 w-24" />
                    {:else}
                        <div class="text-2xl font-bold text-red-600">
                            -{$statsState.data.totalSpent}
                        </div>
                        <p class="text-xs text-muted-foreground mt-1">
                            累计消费积分
                        </p>
                    {/if}
                </Card.Content>
            </Card.Root>

            <Card.Root>
                <Card.Header>
                    <Card.Title class="text-sm font-medium">即将过期</Card.Title>
                </Card.Header>
                <Card.Content>
                    {#if $statsState.loading}
                        <Skeleton class="h-8 w-24" />
                    {:else}
                        <div class="text-2xl font-bold text-orange-600">
                            {$statsState.data.expiringPackages.reduce((sum: number, pkg: any) => sum + pkg.creditsRemaining, 0)}
                        </div>
                        <p class="text-xs text-muted-foreground mt-1">
                            30天内过期积分
                        </p>
                    {/if}
                </Card.Content>
            </Card.Root>
        </div>
    {/if}

    <!-- 积分余额卡片 -->
    <div class="grid gap-4 md:grid-cols-2">
        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2">
                    <Coins class="h-5 w-5 text-primary" />
                    可用积分
                </Card.Title>
            </Card.Header>
            <Card.Content>
                {#if loading}
                    <Skeleton class="h-12 w-32" />
                {:else}
                    <div class="text-4xl font-bold text-primary">
                        {$authState.user?.credits ?? 0}
                    </div>
                    <p class="text-sm text-muted-foreground mt-2">
                        来自 {$authState.user?.activePackages ?? 0} 个有效套餐
                    </p>
                {/if}
            </Card.Content>
            <Card.Footer>
                <Button
                    onclick={() => (redeemDialogOpen = true)}
                    class="w-full"
                >
                    <Gift class="mr-2 h-4 w-4" />
                    兑换积分
                </Button>
            </Card.Footer>
        </Card.Root>

        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2">
                    <AlertCircle class="h-5 w-5" />
                    使用说明
                </Card.Title>
            </Card.Header>
            <Card.Content class="space-y-2 text-sm">
                <p>• AI 聊天按 token 数量计费（1 积分/1000 tokens）</p>
                <p>• 图片生成固定计费（5 积分/张）</p>
                <p>• 积分套餐有有效期，请及时使用</p>
                <p>• 优先消耗即将过期的套餐积分</p>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- 即将过期提醒 -->
    {#if $statsState.data && $statsState.data.expiringPackages.length > 0}
        <Card.Root class="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-orange-800 dark:text-orange-400">
                    <AlertCircle class="h-5 w-5" />
                    即将过期提醒
                </Card.Title>
                <Card.Description>以下套餐将在 30 天内过期</Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="space-y-2">
                    {#each $statsState.data.expiringPackages as pkg}
                        <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                            <div>
                                <p class="text-sm font-medium">
                                    {pkg.creditsRemaining} 积分
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    {pkg.daysUntilExpiry} 天后过期
                                </p>
                            </div>
                            <Badge variant="outline" class="text-orange-600">
                                即将过期
                            </Badge>
                        </div>
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- 欠费提醒 -->
    {#if !debtsLoading && debts.length > 0}
        <Card.Root class="border-red-200 bg-red-50 dark:bg-red-900/10">
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertTriangle class="h-5 w-5" />
                    欠费提醒
                </Card.Title>
                <Card.Description>您有未结清的欠费记录，充值后将自动结算</Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="space-y-2">
                    {#each debts as debt}
                        <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                            <div>
                                <p class="text-sm font-medium">
                                    {debt.amount} 积分
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    {debt.operationType} · {formatDate(debt.createdAt)}
                                </p>
                            </div>
                            <Badge variant="destructive">
                                未结清
                            </Badge>
                        </div>
                    {/each}
                </div>
                <div class="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-red-200">
                    <p class="text-sm font-medium text-red-800 dark:text-red-400">
                        欠费总额: {debts.reduce((sum, d) => sum + d.amount, 0)} 积分
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                        充值或兑换积分时将自动扣除欠费
                    </p>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- 我的套餐 -->
    {#if !loading && packages.length > 0}
        <Card.Root>
            <Card.Header>
                <Card.Title>我的套餐</Card.Title>
                <Card.Description>当前拥有的有效积分套餐</Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="space-y-3">
                    {#each packages as pkg}
                        <div
                            class="flex items-center justify-between p-3 border rounded-lg"
                        >
                            <div>
                                <p class="font-medium">
                                    剩余 {pkg.creditsRemaining} / {pkg.creditsTotal} 积分
                                </p>
                                <p class="text-sm text-muted-foreground">
                                    过期时间: {formatDate(pkg.expiresAt)}
                                </p>
                            </div>
                            <Badge variant="outline">
                                {pkg.source === "redemption"
                                    ? "兑换"
                                    : pkg.source === "purchase"
                                      ? "购买"
                                      : "赠送"}
                            </Badge>
                        </div>
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- 交易历史 -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2">
                <History class="h-5 w-5" />
                交易历史
            </Card.Title>
            <Card.Description>最近 20 条交易记录</Card.Description>
        </Card.Header>
        <Card.Content>
            {#if loading}
                <div class="space-y-2">
                    <Skeleton class="h-12 w-full" />
                    <Skeleton class="h-12 w-full" />
                    <Skeleton class="h-12 w-full" />
                </div>
            {:else if transactions.length === 0}
                <p class="text-center text-muted-foreground py-8">
                    暂无交易记录
                </p>
            {:else}
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>类型</Table.Head>
                            <Table.Head>金额</Table.Head>
                            <Table.Head>描述</Table.Head>
                            <Table.Head>时间</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each transactions as tx}
                            <Table.Row>
                                <Table.Cell>
                                    <Badge
                                        variant={getTransactionTypeBadge(tx.type)
                                            .variant}
                                    >
                                        {getTransactionTypeBadge(tx.type).label}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <span
                                        class={tx.amount > 0
                                            ? "text-green-600 font-medium"
                                            : "text-red-600 font-medium"}
                                    >
                                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                                    </span>
                                </Table.Cell>
                                <Table.Cell class="max-w-xs truncate">
                                    {tx.description}
                                </Table.Cell>
                                <Table.Cell class="text-muted-foreground">
                                    {formatDate(tx.createdAt)}
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>
            {/if}
        </Card.Content>
    </Card.Root>
</div>

<!-- 兑换对话框 -->
<Dialog.Root bind:open={redeemDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>兑换积分</Dialog.Title>
            <Dialog.Description>
                输入兑换码以获取积分套餐
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-4 py-4">
            <div class="space-y-2">
                <Label for="code">兑换码</Label>
                <Input
                    id="code"
                    bind:value={redeemCode}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    disabled={redeeming}
                />
                <p class="text-xs text-muted-foreground">
                    请输入 UUID 格式的兑换码
                </p>
            </div>
        </div>
        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (redeemDialogOpen = false)}
                disabled={redeeming}
            >
                取消
            </Button>
            <Button onclick={handleRedeem} disabled={redeeming}>
                {redeeming ? "兑换中..." : "确认兑换"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
