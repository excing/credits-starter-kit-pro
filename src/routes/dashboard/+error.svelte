<script lang="ts">
    import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button";
    import { AlertCircle, ArrowLeft } from "@lucide/svelte";
</script>

<section class="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6">
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
                <ArrowLeft class="mr-2 h-4 w-4" />
                返回
            </Button>
            <Button href="/dashboard">
                回到控制台
            </Button>
        </div>
    </div>
</section>
