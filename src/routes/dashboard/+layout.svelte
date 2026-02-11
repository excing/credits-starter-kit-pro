<script lang="ts">
    import Sidebar from "$lib/components/dashboard/Sidebar.svelte";
    import Navbar from "$lib/components/dashboard/Navbar.svelte";
    import { authStore } from "$lib/stores/auth.svelte";

    let { children } = $props();
    let dataInitialized = $state(false);

    // 响应式初始化：当用户已登录且数据未初始化时，自动加载完整数据
    $effect(() => {
        if (authStore.loaded && authStore.user && !dataInitialized) {
            authStore.initDashboardData();
            dataInitialized = true;
        }
    });
</script>

<div class="flex h-screen w-full overflow-hidden">
    <Sidebar />
    <main class="flex-1 overflow-y-auto">
        <Navbar>
            {@render children()}
        </Navbar>
    </main>
</div>
