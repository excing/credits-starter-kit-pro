<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { cn } from "$lib/utils";
    import { Chat } from "@ai-sdk/svelte";
    import { currentUser } from "$lib/stores/auth";
    import { AlertCircle } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";

    const chat = new Chat({});

    let input = $state("");

    async function handleSubmit() {
        if (!input) return;

        try {
            await chat.sendMessage({ text: input });
            input = "";
        } catch (error: any) {
            console.error("发送消息失败:", error);

            // 处理积分不足错误
            if (error?.status === 402 || error?.code === 'INSUFFICIENT_CREDITS') {
                toast.error("积分不足，请先充值", {
                    action: {
                        label: "去充值",
                        onClick: () => goto("/dashboard/credits"),
                    },
                });
            } else if (error?.status === 401) {
                toast.error("请先登录");
            } else {
                toast.error("发送失败，请重试");
            }
        }
    }
</script>

<div class="flex w-full flex-col items-center justify-center py-24">
    <!-- 积分余额提示 -->
    {#if $currentUser?.credits !== undefined && $currentUser.credits < 10}
        <div class="mb-4 w-full max-w-xl">
            <div
                class="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
            >
                <AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div class="flex-1">
                    <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        积分余额不足
                    </p>
                    <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        当前余额: {$currentUser.credits} 积分。
                        <a
                            href="/dashboard/credits"
                            class="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-100"
                        >
                            立即充值
                        </a>
                    </p>
                </div>
            </div>
        </div>
    {/if}

    <div class="mb-20 w-full max-w-xl space-y-4">
        {#each chat.messages as message}
            <div
                class={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                )}
            >
                <div
                    class={cn(
                        "max-w-[65%] px-3 py-1.5 text-sm shadow-sm",
                        message.role === "user"
                            ? "rounded-2xl rounded-br-sm bg-[#0B93F6] text-white"
                            : "rounded-2xl rounded-bl-sm bg-[#E9E9EB] text-black",
                    )}
                >
                    {#each message.parts as part}
                        {#if part.type === "text"}
                            <div
                                class="prose-sm prose-p:my-0.5 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1"
                            >
                                {part.text}
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/each}
    </div>

    <form
        class="fixed bottom-0 flex w-full items-center justify-center gap-2"
        onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
        }}
    >
        <div
            class="mb-8 flex w-full max-w-xl flex-col items-start justify-center gap-2 rounded-lg border bg-white p-2"
        >
            <Input
                class="w-full border-0 shadow-none !ring-transparent"
                bind:value={input}
                placeholder="Say something..."
            />
            <div class="flex w-full items-center justify-end gap-3">
                <Button size="sm" class="text-xs" type="submit">Send</Button>
            </div>
        </div>
    </form>
</div>
