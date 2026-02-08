<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Sheet from "$lib/components/ui/sheet";
    import { Separator } from "$lib/components/ui/separator";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import UserProfile from "$lib/components/UserProfile.svelte";
    import {
        Home,
        Brush,
        MonitorSmartphone,
        GitBranch,
        Menu,
        Coins,
        ShieldCheck,
    } from "lucide-svelte";
    import { authState } from "$lib/stores/auth";
    import { page } from "$app/stores";

    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
    let sheetOpen = $state(false);

    // 从服务端获取管理员状态
    const isAdmin = $derived($page.data.isAdmin ?? false);
</script>

<div class="flex flex-col">
    <header class="flex h-14 items-center gap-4 border-b px-3 lg:h-[52px]">
        <!-- Mobile menu trigger -->
        <Sheet.Root bind:open={sheetOpen}>
            <Sheet.Trigger class="p-2 transition min-[1024px]:hidden">
                <Menu class="h-5 w-5" />
                <span class="sr-only">Menu</span>
            </Sheet.Trigger>
            <Sheet.Content side="left">
                <Sheet.Header>
                    <a href="/">
                        <Sheet.Title>SvelteKit Starter Kit</Sheet.Title>
                    </a>
                </Sheet.Header>
                <div class="mt-4 flex flex-col space-y-3">
                    <a href="/dashboard" onclick={() => (sheetOpen = false)}>
                        <Button variant="outline" class="w-full">
                            <Home class="mr-2 h-4 w-4" />
                            Overview
                        </Button>
                    </a>
                    <a
                        href="/dashboard/chat"
                        onclick={() => (sheetOpen = false)}
                    >
                        <Button variant="outline" class="w-full">
                            <Brush class="mr-2 h-4 w-4" />
                            Chat
                        </Button>
                    </a>
                    <a
                        href="/dashboard/upload"
                        onclick={() => (sheetOpen = false)}
                    >
                        <Button variant="outline" class="w-full">
                            <MonitorSmartphone class="mr-2 h-4 w-4" />
                            Upload
                        </Button>
                    </a>
                    <a
                        href="/dashboard/credits"
                        onclick={() => (sheetOpen = false)}
                    >
                        <Button variant="outline" class="w-full">
                            <Coins class="mr-2 h-4 w-4" />
                            Credits
                        </Button>
                    </a>
                    <Separator class="my-3" />
                    {#if isAdmin}
                        <a
                            href="/dashboard/admin"
                            onclick={() => (sheetOpen = false)}
                        >
                            <Button variant="outline" class="w-full">
                                <ShieldCheck class="mr-2 h-4 w-4" />
                                Admin
                            </Button>
                        </a>
                    {/if}
                    <a
                        href="/dashboard/settings"
                        onclick={() => (sheetOpen = false)}
                    >
                        <Button variant="outline" class="w-full">
                            <GitBranch class="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </a>
                </div>
            </Sheet.Content>
        </Sheet.Root>
        <div class="ml-auto flex items-center justify-center gap-2">
            <!-- 积分显示 -->
            <a
                href="/dashboard/credits"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
                <Coins class="h-4 w-4 text-primary" />
                {#if !$authState.loaded}
                    <Skeleton class="h-4 w-8" />
                {:else}
                    <span class="text-sm font-medium">{$authState.user?.credits ?? 0}</span>
                {/if}
            </a>
            <UserProfile mini={true} />
        </div>
    </header>
    {@render children()}
</div>
