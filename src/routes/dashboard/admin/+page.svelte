<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import * as Card from "$lib/components/ui/card";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Table from "$lib/components/ui/table";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Badge } from "$lib/components/ui/badge";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import { ShieldCheck, Gift, Package, Copy, Check, Plus, Edit, Trash2 } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import { Textarea } from "$lib/components/ui/textarea";

    let loading = $state(true);
    let generating = $state(false);
    let generateDialogOpen = $state(false);
    let createPackageDialogOpen = $state(false);
    let editPackageDialogOpen = $state(false);
    let packages = $state<any[]>([]);
    let generatedCodes = $state<string[]>([]);
    let copied = $state(false);
    let codesLoading = $state(true);
    let redemptionCodes = $state<any[]>([]);

    // 表单数据 - 生成兑换码
    let selectedPackageId = $state("");
    let codeCount = $state(1);
    let maxUses = $state(1);
    let codeExpiresInDays = $state(30);

    // 表单数据 - 创建/编辑套餐
    let packageForm = $state({
        id: "",
        name: "",
        description: "",
        credits: 100,
        validityDays: 90,
        price: 0,
        currency: "CNY",
        packageType: "standard",
        isActive: true
    });

    let editingPackage = $state<any>(null);
    let savingPackage = $state(false);

    // 加载套餐列表
    async function loadPackages() {
        loading = true;
        try {
            const res = await fetch("/api/admin/credits/packages");
            if (res.ok) {
                const data = await res.json();
                packages = data.packages;
            } else {
                toast.error("加载套餐失败");
            }
        } catch (error) {
            console.error("加载套餐失败:", error);
            toast.error("加载失败");
        } finally {
            loading = false;
        }
    }

    // 加载兑换码列表
    async function loadRedemptionCodes() {
        codesLoading = true;
        try {
            const res = await fetch("/api/admin/credits/codes");
            if (res.ok) {
                const data = await res.json();
                redemptionCodes = data.codes;
            } else {
                toast.error("加载兑换码失败");
            }
        } catch (error) {
            console.error("加载兑换码失败:", error);
            toast.error("加载失败");
        } finally {
            codesLoading = false;
        }
    }

    // 生成兑换码（支持批量）
    async function handleGenerate() {
        if (!selectedPackageId) {
            toast.error("请选择套餐");
            return;
        }

        if (codeCount < 1 || codeCount > 100) {
            toast.error("生成数量必须在 1-100 之间");
            return;
        }

        generating = true;
        try {
            const res = await fetch("/api/admin/credits/generate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    packageId: selectedPackageId,
                    count: codeCount,
                    maxUses,
                    codeExpiresInDays,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                generatedCodes = data.codes;
                toast.success(`成功生成 ${data.codes.length} 个兑换码！`);
                await loadRedemptionCodes(); // 刷新列表
            } else {
                toast.error(data.error || "生成失败");
            }
        } catch (error) {
            console.error("生成兑换码失败:", error);
            toast.error("生成失败，请重试");
        } finally {
            generating = false;
        }
    }

    // 复制所有兑换码
    async function copyAllCodes() {
        try {
            await navigator.clipboard.writeText(generatedCodes.join('\n'));
            copied = true;
            toast.success("已复制所有兑换码到剪贴板");
            setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (error) {
            toast.error("复制失败");
        }
    }

    // 复制单个兑换码
    async function copySingleCode(code: string) {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("已复制到剪贴板");
        } catch (error) {
            toast.error("复制失败");
        }
    }

    // 重置表单
    function resetForm() {
        selectedPackageId = "";
        codeCount = 1;
        maxUses = 1;
        codeExpiresInDays = 30;
        generatedCodes = [];
        copied = false;
    }

    // 禁用/启用兑换码
    async function toggleCodeStatus(codeId: string, currentStatus: boolean) {
        try {
            const res = await fetch(`/api/admin/credits/codes/${codeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (res.ok) {
                toast.success(currentStatus ? "兑换码已禁用" : "兑换码已启用");
                await loadRedemptionCodes();
            } else {
                const data = await res.json();
                toast.error(data.error || "操作失败");
            }
        } catch (error) {
            console.error("操作失败:", error);
            toast.error("操作失败，请重试");
        }
    }

    // 删除兑换码
    async function deleteCode(codeId: string) {
        if (!confirm("确定要删除这个兑换码吗？此操作不可撤销。")) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/credits/codes/${codeId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("兑换码删除成功！");
                await loadRedemptionCodes();
            } else {
                const data = await res.json();
                toast.error(data.error || "删除失败");
            }
        } catch (error) {
            console.error("删除兑换码失败:", error);
            toast.error("删除失败，请重试");
        }
    }

    // 重置套餐表单
    function resetPackageForm() {
        packageForm = {
            id: "",
            name: "",
            description: "",
            credits: 100,
            validityDays: 90,
            price: 0,
            currency: "CNY",
            packageType: "standard",
            isActive: true
        };
        editingPackage = null;
    }

    // 打开创建套餐对话框
    function openCreatePackageDialog() {
        resetPackageForm();
        createPackageDialogOpen = true;
    }

    // 打开编辑套餐对话框
    function openEditPackageDialog(pkg: any) {
        editingPackage = pkg;
        packageForm = {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description || "",
            credits: pkg.credits,
            validityDays: pkg.validityDays,
            price: pkg.price || 0,
            currency: pkg.currency || "CNY",
            packageType: pkg.packageType,
            isActive: pkg.isActive
        };
        editPackageDialogOpen = true;
    }

    // 创建套餐
    async function handleCreatePackage() {
        if (!packageForm.name || !packageForm.credits || !packageForm.validityDays) {
            toast.error("请填写必填字段");
            return;
        }

        savingPackage = true;
        try {
            const res = await fetch("/api/admin/credits/packages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: packageForm.name,
                    description: packageForm.description,
                    credits: packageForm.credits,
                    validityDays: packageForm.validityDays,
                    price: packageForm.price,
                    currency: packageForm.currency,
                    packageType: packageForm.packageType,
                    isActive: packageForm.isActive
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("套餐创建成功！");
                createPackageDialogOpen = false;
                resetPackageForm();
                await loadPackages();
            } else {
                toast.error(data.error || "创建失败");
            }
        } catch (error) {
            console.error("创建套餐失败:", error);
            toast.error("创建失败，请重试");
        } finally {
            savingPackage = false;
        }
    }

    // 更新套餐
    async function handleUpdatePackage() {
        if (!packageForm.name || !packageForm.credits || !packageForm.validityDays) {
            toast.error("请填写必填字段");
            return;
        }

        savingPackage = true;
        try {
            const res = await fetch(`/api/admin/credits/packages/${packageForm.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: packageForm.name,
                    description: packageForm.description,
                    credits: packageForm.credits,
                    validityDays: packageForm.validityDays,
                    price: packageForm.price,
                    currency: packageForm.currency,
                    packageType: packageForm.packageType,
                    isActive: packageForm.isActive
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("套餐更新成功！");
                editPackageDialogOpen = false;
                resetPackageForm();
                await loadPackages();
            } else {
                toast.error(data.error || "更新失败");
            }
        } catch (error) {
            console.error("更新套餐失败:", error);
            toast.error("更新失败，请重试");
        } finally {
            savingPackage = false;
        }
    }

    // 删除套餐
    async function handleDeletePackage(packageId: string) {
        if (!confirm("确定要删除这个套餐吗？此操作不可撤销。")) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/credits/packages/${packageId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("套餐删除成功！");
                await loadPackages();
            } else {
                const data = await res.json();
                toast.error(data.error || "删除失败");
            }
        } catch (error) {
            console.error("删除套餐失败:", error);
            toast.error("删除失败，请重试");
        }
    }

    onMount(() => {
        loadPackages();
        loadRedemptionCodes();
    });
</script>

<div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold">管理员控制台</h1>
            <p class="text-muted-foreground mt-1">
                管理积分套餐和生成兑换码
            </p>
        </div>
        <div class="flex gap-2">
            <Button onclick={openCreatePackageDialog} variant="outline">
                <Plus class="mr-2 h-4 w-4" />
                创建套餐
            </Button>
            <Button onclick={() => (generateDialogOpen = true)}>
                <Gift class="mr-2 h-4 w-4" />
                生成兑换码
            </Button>
        </div>
    </div>

        <!-- 套餐列表 -->
        <Card.Root>
            <Card.Header>
                <Card.Title class="flex items-center gap-2">
                    <Package class="h-5 w-5" />
                    积分套餐
                </Card.Title>
                <Card.Description>当前可用的积分套餐</Card.Description>
            </Card.Header>
            <Card.Content>
                {#if loading}
                    <div class="space-y-2">
                        <Skeleton class="h-16 w-full" />
                        <Skeleton class="h-16 w-full" />
                        <Skeleton class="h-16 w-full" />
                    </div>
                {:else if packages.length === 0}
                    <p class="text-center text-muted-foreground py-8">
                        暂无套餐
                    </p>
                {:else}
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head>套餐名称</Table.Head>
                                <Table.Head>积分数</Table.Head>
                                <Table.Head>有效期</Table.Head>
                                <Table.Head>价格</Table.Head>
                                <Table.Head>类型</Table.Head>
                                <Table.Head>状态</Table.Head>
                                <Table.Head class="text-right">操作</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each packages as pkg}
                                <Table.Row>
                                    <Table.Cell class="font-medium">
                                        {pkg.name}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="secondary">
                                            {pkg.credits} 积分
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {pkg.validityDays} 天
                                    </Table.Cell>
                                    <Table.Cell>
                                        {pkg.price
                                            ? `¥${(pkg.price / 100).toFixed(2)}`
                                            : "免费"}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge variant="outline">
                                            {pkg.packageType}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge
                                            variant={pkg.isActive
                                                ? "default"
                                                : "secondary"}
                                        >
                                            {pkg.isActive ? "激活" : "停用"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <div class="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onclick={() => openEditPackageDialog(pkg)}
                                            >
                                                <Edit class="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onclick={() => handleDeletePackage(pkg.id)}
                                            >
                                                <Trash2 class="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                {/if}
            </Card.Content>
        </Card.Root>

    <!-- 兑换码列表 -->
    <Card.Root>
        <Card.Header>
            <Card.Title class="flex items-center gap-2">
                <Gift class="h-5 w-5" />
                兑换码管理
            </Card.Title>
            <Card.Description>查看和管理所有兑换码</Card.Description>
        </Card.Header>
        <Card.Content>
            {#if codesLoading}
                <div class="space-y-2">
                    <Skeleton class="h-16 w-full" />
                    <Skeleton class="h-16 w-full" />
                    <Skeleton class="h-16 w-full" />
                </div>
            {:else if redemptionCodes.length === 0}
                <p class="text-center text-muted-foreground py-8">
                    暂无兑换码
                </p>
            {:else}
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
                        {#each redemptionCodes as code}
                            <Table.Row>
                                <Table.Cell class="font-mono text-xs">
                                    <div class="flex items-center gap-2">
                                        <span class="truncate max-w-[200px]">{code.code}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onclick={() => copySingleCode(code.code)}
                                        >
                                            <Copy class="h-3 w-3" />
                                        </Button>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="text-sm">
                                        <div class="font-medium">{code.package?.name || '未知套餐'}</div>
                                        <div class="text-muted-foreground text-xs">
                                            {code.package?.credits || 0} 积分
                                        </div>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="text-sm">
                                        {code.usedCount} / {code.maxUses === -1 ? '∞' : code.maxUses}
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="text-sm">
                                        {new Date(code.expiresAt).toLocaleDateString('zh-CN')}
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge
                                        variant={code.isActive && new Date(code.expiresAt) > new Date()
                                            ? "default"
                                            : "secondary"}
                                    >
                                        {code.isActive
                                            ? (new Date(code.expiresAt) > new Date() ? "有效" : "已过期")
                                            : "已禁用"}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell class="text-right">
                                    <div class="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onclick={() => toggleCodeStatus(code.id, code.isActive)}
                                        >
                                            {code.isActive ? "禁用" : "启用"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onclick={() => deleteCode(code.id)}
                                        >
                                            <Trash2 class="h-3 w-3" />
                                        </Button>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>
            {/if}
        </Card.Content>
    </Card.Root>

        <!-- 使用说明 -->
        <Card.Root>
            <Card.Header>
                <Card.Title>使用说明</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-3 text-sm">
                <div>
                    <p class="font-medium mb-1">1. 生成兑换码</p>
                    <p class="text-muted-foreground">
                        选择套餐、设置使用次数和过期时间，点击"生成兑换码"按钮
                    </p>
                </div>
                <div>
                    <p class="font-medium mb-1">2. 分发兑换码</p>
                    <p class="text-muted-foreground">
                        复制生成的 UUID 兑换码，通过邮件、社交媒体等渠道分发给用户
                    </p>
                </div>
                <div>
                    <p class="font-medium mb-1">3. 用户兑换</p>
                    <p class="text-muted-foreground">
                        用户在 /dashboard/credits 页面输入兑换码即可获得对应的积分套餐
                    </p>
                </div>
                <div>
                    <p class="font-medium mb-1">4. 兑换码规则</p>
                    <p class="text-muted-foreground">
                        • 单次使用：一码一用，兑换后失效<br />
                        • 多次使用：可设置最大使用次数（如3次）<br />
                        • 过期时间：兑换码本身的有效期<br />
                        • 套餐有效期：用户兑换后套餐的有效期（独立计算）
                    </p>
                </div>
            </Card.Content>
        </Card.Root>
</div>

<!-- 生成兑换码对话框 -->
<Dialog.Root bind:open={generateDialogOpen}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>生成兑换码</Dialog.Title>
            <Dialog.Description>
                选择套餐并配置兑换码参数
            </Dialog.Description>
        </Dialog.Header>

        {#if generatedCodes.length > 0}
            <!-- 显示生成的兑换码 -->
            <div class="space-y-4 py-4">
                <div
                    class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                    <p class="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        ✓ 成功生成 {generatedCodes.length} 个兑换码！
                    </p>
                    <div class="space-y-2 max-h-[300px] overflow-y-auto">
                        {#each generatedCodes as code}
                            <div class="flex items-center gap-2">
                                <code
                                    class="flex-1 p-2 bg-white dark:bg-gray-800 border rounded text-xs font-mono break-all"
                                >
                                    {code}
                                </code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onclick={() => copySingleCode(code)}
                                >
                                    <Copy class="h-3 w-3" />
                                </Button>
                            </div>
                        {/each}
                    </div>
                    <div class="mt-3 pt-3 border-t">
                        <Button
                            size="sm"
                            variant="outline"
                            class="w-full"
                            onclick={copyAllCodes}
                        >
                            {#if copied}
                                <Check class="mr-2 h-4 w-4" />
                                已复制
                            {:else}
                                <Copy class="mr-2 h-4 w-4" />
                                复制所有兑换码
                            {/if}
                        </Button>
                    </div>
                </div>
            </div>
            <Dialog.Footer>
                <Button
                    onclick={() => {
                        generateDialogOpen = false;
                        resetForm();
                    }}
                >
                    完成
                </Button>
            </Dialog.Footer>
        {:else}
            <!-- 生成表单 -->
            <div class="space-y-4 py-4">
                <div class="space-y-2">
                    <Label for="package">选择套餐</Label>
                    <select
                        id="package"
                        bind:value={selectedPackageId}
                        class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={generating}
                    >
                        <option value="">请选择套餐</option>
                        {#each packages as pkg}
                            <option value={pkg.id}>
                                {pkg.name} ({pkg.credits}积分, {pkg.validityDays}天)
                            </option>
                        {/each}
                    </select>
                </div>

                <div class="space-y-2">
                    <Label for="codeCount">生成数量</Label>
                    <Input
                        id="codeCount"
                        type="number"
                        bind:value={codeCount}
                        min="1"
                        max="100"
                        disabled={generating}
                    />
                    <p class="text-xs text-muted-foreground">
                        一次最多生成 100 个兑换码
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="maxUses">最大使用次数</Label>
                    <Input
                        id="maxUses"
                        type="number"
                        bind:value={maxUses}
                        min="1"
                        max="1000"
                        disabled={generating}
                    />
                    <p class="text-xs text-muted-foreground">
                        1 = 单次使用，N = 可用 N 次
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="expires">兑换码有效期（天）</Label>
                    <Input
                        id="expires"
                        type="number"
                        bind:value={codeExpiresInDays}
                        min="1"
                        max="365"
                        disabled={generating}
                    />
                    <p class="text-xs text-muted-foreground">
                        兑换码本身的过期时间（与套餐有效期独立）
                    </p>
                </div>
            </div>
            <Dialog.Footer>
                <Button
                    variant="outline"
                    onclick={() => {
                        generateDialogOpen = false;
                        resetForm();
                    }}
                    disabled={generating}
                >
                    取消
                </Button>
                <Button onclick={handleGenerate} disabled={generating}>
                    {generating ? "生成中..." : "生成兑换码"}
                </Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<!-- 创建套餐对话框 -->
<Dialog.Root bind:open={createPackageDialogOpen}>
    <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>创建积分套餐</Dialog.Title>
            <Dialog.Description>
                填写套餐信息以创建新的积分套餐
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-4 py-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="name">套餐名称 *</Label>
                    <Input
                        id="name"
                        bind:value={packageForm.name}
                        placeholder="例如：新手礼包"
                        disabled={savingPackage}
                    />
                </div>
                <div class="space-y-2">
                    <Label for="packageType">套餐类型 *</Label>
                    <Input
                        id="packageType"
                        bind:value={packageForm.packageType}
                        placeholder="例如：welcome, standard, premium"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="space-y-2">
                <Label for="description">套餐描述</Label>
                <Textarea
                    id="description"
                    bind:value={packageForm.description}
                    placeholder="套餐的详细描述..."
                    disabled={savingPackage}
                    rows={3}
                />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="credits">积分数量 *</Label>
                    <Input
                        id="credits"
                        type="number"
                        bind:value={packageForm.credits}
                        min="1"
                        disabled={savingPackage}
                    />
                </div>
                <div class="space-y-2">
                    <Label for="validityDays">有效期（天）*</Label>
                    <Input
                        id="validityDays"
                        type="number"
                        bind:value={packageForm.validityDays}
                        min="1"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="price">价格（分）</Label>
                    <Input
                        id="price"
                        type="number"
                        bind:value={packageForm.price}
                        min="0"
                        placeholder="0 表示免费"
                        disabled={savingPackage}
                    />
                    <p class="text-xs text-muted-foreground">
                        以分为单位，例如 4900 = ¥49.00
                    </p>
                </div>
                <div class="space-y-2">
                    <Label for="currency">货币</Label>
                    <Input
                        id="currency"
                        bind:value={packageForm.currency}
                        placeholder="CNY"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="isActive"
                    bind:checked={packageForm.isActive}
                    disabled={savingPackage}
                    class="h-4 w-4"
                />
                <Label for="isActive">激活套餐</Label>
            </div>
        </div>
        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => {
                    createPackageDialogOpen = false;
                    resetPackageForm();
                }}
                disabled={savingPackage}
            >
                取消
            </Button>
            <Button onclick={handleCreatePackage} disabled={savingPackage}>
                {savingPackage ? "创建中..." : "创建套餐"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- 编辑套餐对话框 -->
<Dialog.Root bind:open={editPackageDialogOpen}>
    <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>编辑积分套餐</Dialog.Title>
            <Dialog.Description>
                修改套餐信息
            </Dialog.Description>
        </Dialog.Header>
        <div class="space-y-4 py-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="edit-name">套餐名称 *</Label>
                    <Input
                        id="edit-name"
                        bind:value={packageForm.name}
                        placeholder="例如：新手礼包"
                        disabled={savingPackage}
                    />
                </div>
                <div class="space-y-2">
                    <Label for="edit-packageType">套餐类型 *</Label>
                    <Input
                        id="edit-packageType"
                        bind:value={packageForm.packageType}
                        placeholder="例如：welcome, standard, premium"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="space-y-2">
                <Label for="edit-description">套餐描述</Label>
                <Textarea
                    id="edit-description"
                    bind:value={packageForm.description}
                    placeholder="套餐的详细描述..."
                    disabled={savingPackage}
                    rows={3}
                />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="edit-credits">积分数量 *</Label>
                    <Input
                        id="edit-credits"
                        type="number"
                        bind:value={packageForm.credits}
                        min="1"
                        disabled={savingPackage}
                    />
                </div>
                <div class="space-y-2">
                    <Label for="edit-validityDays">有效期（天）*</Label>
                    <Input
                        id="edit-validityDays"
                        type="number"
                        bind:value={packageForm.validityDays}
                        min="1"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <Label for="edit-price">价格（分）</Label>
                    <Input
                        id="edit-price"
                        type="number"
                        bind:value={packageForm.price}
                        min="0"
                        placeholder="0 表示免费"
                        disabled={savingPackage}
                    />
                    <p class="text-xs text-muted-foreground">
                        以分为单位，例如 4900 = ¥49.00
                    </p>
                </div>
                <div class="space-y-2">
                    <Label for="edit-currency">货币</Label>
                    <Input
                        id="edit-currency"
                        bind:value={packageForm.currency}
                        placeholder="CNY"
                        disabled={savingPackage}
                    />
                </div>
            </div>

            <div class="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="edit-isActive"
                    bind:checked={packageForm.isActive}
                    disabled={savingPackage}
                    class="h-4 w-4"
                />
                <Label for="edit-isActive">激活套餐</Label>
            </div>
        </div>
        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => {
                    editPackageDialogOpen = false;
                    resetPackageForm();
                }}
                disabled={savingPackage}
            >
                取消
            </Button>
            <Button onclick={handleUpdatePackage} disabled={savingPackage}>
                {savingPackage ? "保存中..." : "保存修改"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
