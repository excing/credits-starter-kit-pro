<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { cn } from "$lib/utils";
    import UserProfile from "$lib/components/UserProfile.svelte";
    import {
        Home,
        MessageCircle,
        Upload,
        Settings,
        Coins,
        ShieldCheck,
    } from "lucide-svelte";
    import { currentUser } from "$lib/stores/auth";

    interface NavItem {
        label: string;
        href: string;
        icon: typeof Home;
    }

    const navItems: NavItem[] = [
        {
            label: "Overview",
            href: "/dashboard",
            icon: Home,
        },
        {
            label: "Chat",
            href: "/dashboard/chat",
            icon: MessageCircle,
        },
        {
            label: "Upload",
            href: "/dashboard/upload",
            icon: Upload,
        },
        {
            label: "Credits",
            href: "/dashboard/credits",
            icon: Coins,
        },
    ];

    const pathname = $derived($page.url.pathname);

    // 从服务端获取管理员状态
    const isAdmin = $derived($page.data.isAdmin ?? false);
</script>

<div class="bg-background hidden h-full w-64 border-r min-[1024px]:block">
    <div class="flex h-full flex-col">
        <div class="flex h-[3.45rem] items-center border-b px-4">
            <a
                class="flex items-center font-semibold hover:cursor-pointer"
                href="/"
            >
                <span>SvelteKit Starter Kit</span>
            </a>
        </div>

        <nav
            class="flex h-full w-full flex-col items-start justify-between space-y-1"
        >
            <div class="w-full space-y-1 p-4">
                {#each navItems as item}
                    <button
                        onclick={() => goto(item.href)}
                        class={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                            pathname === item.href
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <item.icon class="h-4 w-4" />
                        {item.label}
                    </button>
                {/each}

                <!-- 管理员入口 -->
                {#if isAdmin}
                    <button
                        onclick={() => goto("/dashboard/admin")}
                        class={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                            pathname === "/dashboard/admin"
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <ShieldCheck class="h-4 w-4" />
                        Admin
                    </button>
                {/if}
            </div>

            <div class="flex w-full flex-col gap-2">
                <!-- 积分显示 -->
                <div class="px-4">
                    <a
                        href="/dashboard/credits"
                        class="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                        <div class="flex items-center gap-2">
                            <Coins class="h-4 w-4 text-primary" />
                            <span class="text-sm font-medium">积分余额</span>
                        </div>
                        <span class="text-sm font-bold text-primary">{$currentUser?.credits ?? 0}</span>
                    </a>
                </div>
                <div class="px-4">
                    <button
                        onclick={() => goto("/dashboard/settings")}
                        class={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                            pathname === "/dashboard/settings"
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        <Settings class="h-4 w-4" />
                        Settings
                    </button>
                </div>
                <UserProfile />
            </div>
        </nav>
    </div>
</div>
