<script lang="ts">
    import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button";
    import { AlertCircle } from "@lucide/svelte";
</script>

<div class="flex h-screen w-full flex-col items-center justify-center px-4">
    <div class="flex flex-col items-center gap-6 text-center">
        <div class="rounded-full bg-destructive/10 p-4">
            <AlertCircle class="h-10 w-10 text-destructive" />
        </div>

        <div class="space-y-2">
            <h1 class="text-4xl font-bold tracking-tight">
                {$page.status}
            </h1>
            <p class="max-w-md text-muted-foreground">
                {#if $page.status === 404}
                    页面不存在，请检查地址是否正确。
                {:else if $page.status === 403}
                    您没有权限访问此页面。
                {:else if $page.status >= 500}
                    服务器遇到了问题，请稍后再试。
                {:else}
                    {$page.error?.message || "发生了未知错误"}
                {/if}
            </p>
        </div>

        <div class="flex gap-3">
            <Button variant="outline" onclick={() => history.back()}>
                返回上一页
            </Button>
            <Button href="/">
                回到首页
            </Button>
        </div>
    </div>
</div>
