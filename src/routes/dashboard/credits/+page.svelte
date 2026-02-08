<script lang="ts">
    import { onMount } from "svelte";
    import { authState, statsState, patchCurrentUser, setStatsData } from "$lib/stores/auth";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Table from "$lib/components/ui/table";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Badge } from "$lib/components/ui/badge";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { Coins, Gift, History, AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Clock, ChevronDown, Package, Archive } from "lucide-svelte";
    import { toast } from "svelte-sonner";

    let loading = $state(true);
    let redeeming = $state(false);
    let redeemDialogOpen = $state(false);
    let redeemCode = $state("");
    let transactions = $state<any[]>([]);
    let packages = $state<any[]>([]);
    let inactivePackages = $state<any[]>([]);
    let inactiveExpanded = $state(false);
    let debts = $state<any[]>([]);
    let debtsLoading = $state(true);

    // 使用聚合 API 加载所有页面数据（5个请求 -> 1个请求）
    async function loadPageData() {
        loading = true;
        try {
            const res = await fetch("/api/user/credits/overview");
            if (res.ok) {
                const data = await res.json();
                transactions = data.transactions;
                packages = data.packages;
                inactivePackages = data.inactivePackages || [];
                debts = data.debts;
                // 同时更新 auth store 中的余额和统计数据
                patchCurrentUser({
                    credits: data.balance,
                    activePackages: data.activePackages
                });
                // 更新统计数据到 store（用于显示即将过期等信息）
                if (data.stats) {
                    setStatsData(data.stats);
                }
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
                // overview API 一次性刷新所有数据（余额+统计+历史+套餐+欠费）
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

    // 获取失效套餐的状态
    function getInactiveStatus(pkg: any): { label: string; color: string } {
        const now = new Date();
        if (new Date(pkg.expiresAt) <= now) {
            return { label: "已过期", color: "text-orange-600 dark:text-orange-400" };
        }
        if (pkg.creditsRemaining <= 0) {
            return { label: "已用完", color: "text-muted-foreground" };
        }
        return { label: "已停用", color: "text-red-600 dark:text-red-400" };
    }

    // 计算积分使用百分比
    function usagePercent(credits: number, total: number): number {
        if (!total || total <= 0) return 0;
        return Math.round((credits / total) * 100);
    }

    onMount(() => {
        // 聚合 API 一次性加载所有数据（余额+统计+历史+套餐+欠费）
        loadPageData();
    });
</script>

<div class="flex flex-col gap-6 p-4 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <h1 class="text-2xl font-bold sm:text-3xl">积分管理</h1>
            <p class="text-muted-foreground mt-1 text-sm sm:text-base">查看余额、兑换积分和交易历史</p>
        </div>
    </div>

    <!-- 积分余额卡片 - 重新设计 -->
    <div class="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 sm:p-8">
        <!-- 装饰性背景元素 -->
        <div class="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-2xl"></div>
        <div class="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>

        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <!-- 左侧：余额信息 -->
            <div class="flex-1 space-y-4">
                <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Coins class="h-4 w-4" />
                    可用积分
                </div>
                {#if loading}
                    <Skeleton class="h-14 w-40" />
                    <Skeleton class="h-4 w-24 mt-2" />
                {:else}
                    <div class="flex items-baseline gap-2">
                        <span class="text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">
                            {$authState.user?.credits ?? 0}
                        </span>
                        <span class="text-lg text-muted-foreground">积分</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Package class="h-3.5 w-3.5" />
                        <span>来自 {$authState.user?.activePackages ?? 0} 个有效套餐</span>
                    </div>
                {/if}

                <!-- 统计摘要 -->
                {#if !loading && $statsState.data && !$statsState.loading}
                    <div class="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                        <div class="flex items-center gap-1.5">
                            <TrendingUp class="h-3.5 w-3.5 text-green-600" />
                            <span class="text-sm font-medium text-green-600">+{$statsState.data.totalEarned}</span>
                            <span class="text-xs text-muted-foreground">总获得</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <TrendingDown class="h-3.5 w-3.5 text-red-600" />
                            <span class="text-sm font-medium text-red-600">-{$statsState.data.totalSpent}</span>
                            <span class="text-xs text-muted-foreground">总消费</span>
                        </div>
                        {#if $statsState.data.totalExpired > 0}
                            <div class="flex items-center gap-1.5">
                                <Clock class="h-3.5 w-3.5 text-orange-600" />
                                <span class="text-sm font-medium text-orange-600">{$statsState.data.totalExpired}</span>
                                <span class="text-xs text-muted-foreground">已过期</span>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            <!-- 右侧：兑换按钮 -->
            <div class="flex flex-col items-stretch gap-3 sm:items-end sm:min-w-[160px]">
                <Button
                    onclick={() => (redeemDialogOpen = true)}
                    size="lg"
                    class="gap-2"
                >
                    <Gift class="h-4 w-4" />
                    兑换积分
                </Button>
                <div class="text-center sm:text-right">
                    <p class="text-xs text-muted-foreground leading-relaxed">
                        输入兑换码获取积分套餐
                    </p>
                </div>
            </div>
        </div>

        <!-- 使用说明 - 折叠在底部 -->
        <div class="relative mt-4 pt-4 border-t border-border/50">
            <div class="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>  AI 聊天按 token 数量计费（1 积分/1000 tokens）</p>
                <p>  图片生成固定计费（5 积分/张）</p>
                <p>  积分套餐有有效期，请及时使用</p>
                <p>  优先消耗即将过期的套餐积分</p>
            </div>
        </div>
    </div>

    <!-- 即将过期提醒 -->
    {#if $statsState.data && $statsState.data.expiringPackages.length > 0}
        <Card.Root class="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
            <Card.Header>
                <Card.Title class="flex items-center gap-2 text-orange-800 dark:text-orange-400">
                    <AlertCircle class="h-5 w-5" />
                    即将过期提醒
                </Card.Title>
                <Card.Description>以下套餐将在 7 天内过期</Card.Description>
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

    <!-- 失效套餐（默认折叠） -->
    {#if !loading && inactivePackages.length > 0}
        <div class="rounded-lg border">
            <button
                type="button"
                onclick={() => (inactiveExpanded = !inactiveExpanded)}
                class="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
            >
                <div class="flex items-center gap-2">
                    <Archive class="h-4 w-4 text-muted-foreground" />
                    <span class="font-medium">失效套餐</span>
                    <Badge variant="secondary" class="text-xs">{inactivePackages.length}</Badge>
                </div>
                <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform duration-200 {inactiveExpanded ? 'rotate-180' : ''}" />
            </button>
            {#if inactiveExpanded}
                <div class="border-t px-4 pb-4 pt-3">
                    <p class="text-xs text-muted-foreground mb-3">已使用完毕或已过期的套餐</p>
                    <div class="space-y-2">
                        {#each inactivePackages as pkg}
                            {@const status = getInactiveStatus(pkg)}
                            <div class="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-medium text-muted-foreground">
                                            {pkg.creditsRemaining} / {pkg.creditsTotal} 积分
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-3 mt-1">
                                        <p class="text-xs text-muted-foreground">
                                            过期时间: {formatDate(pkg.expiresAt)}
                                        </p>
                                        <span class="text-xs text-muted-foreground">
                                            已使用 {usagePercent(pkg.creditsTotal - pkg.creditsRemaining, pkg.creditsTotal)}%
                                        </span>
                                    </div>
                                    <!-- 使用量进度条 -->
                                    <div class="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            class="h-full rounded-full bg-muted-foreground/30 transition-all"
                                            style="width: {usagePercent(pkg.creditsTotal - pkg.creditsRemaining, pkg.creditsTotal)}%"
                                        ></div>
                                    </div>
                                </div>
                                <div class="ml-3 flex flex-col items-end gap-1">
                                    <span class="text-xs font-medium {status.color}">{status.label}</span>
                                    <Badge variant="outline" class="text-xs">
                                        {pkg.source === "redemption"
                                            ? "兑换"
                                            : pkg.source === "purchase"
                                              ? "购买"
                                              : "赠送"}
                                    </Badge>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
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
                <div class="overflow-x-auto -mx-6">
                    <div class="min-w-[500px] px-6">
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
                    </div>
                </div>
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
