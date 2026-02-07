<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Avatar from "$lib/components/ui/avatar";
    import { cn } from "$lib/utils";
    import { Chat } from "@ai-sdk/svelte";
    import { authState, afterCreditsConsumed } from "$lib/stores/auth";
    import {
        AlertCircle,
        Send,
        Bot,
        Sparkles,
        MessageSquare,
        Zap,
        Lightbulb,
        ArrowDown,
        RefreshCw,
        Square,
        WifiOff,
        Loader2,
        CreditCard,
        LogIn,
        Clock,
        ServerCrash,
    } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import { goto } from "$app/navigation";
    import { tick, onMount } from "svelte";
    import { browser } from "$app/environment";

    // 错误类型枚举
    type ErrorType = 'insufficient_credits' | 'unauthorized' | 'rate_limit' | 'network' | 'server' | 'unknown';

    interface ChatError {
        type: ErrorType;
        message: string;
        retryable: boolean;
        action?: {
            label: string;
            href?: string;
        };
    }

    let input = $state("");
    let messagesContainer = $state<HTMLDivElement | null>(null);
    let textareaRef = $state<HTMLTextAreaElement | null>(null);

    // 自动滚动控制
    let shouldAutoScroll = $state(true);
    let showScrollButton = $state(false);

    // 状态管理
    let isSubmitting = $state(false);
    let lastError = $state<ChatError | null>(null);
    let isOnline = $state(true);
    let failedMessage = $state<string | null>(null);

    // 解析错误类型
    function parseError(error: Error | unknown): ChatError {
        const err = error as any;
        const status = err?.status || err?.response?.status;
        const code = err?.code || err?.response?.data?.code;
        const message = err?.message || err?.response?.data?.error || "";

        // 积分不足
        if (status === 402 || code === "INSUFFICIENT_CREDITS" || message.includes("积分不足")) {
            return {
                type: 'insufficient_credits',
                message: "积分不足，请先充值",
                retryable: false,
                action: { label: "去充值", href: "/dashboard/credits" }
            };
        }

        // 未授权
        if (status === 401 || code === "UNAUTHORIZED" || message.includes("未授权")) {
            return {
                type: 'unauthorized',
                message: "请先登录",
                retryable: false,
                action: { label: "去登录", href: "/sign-in" }
            };
        }

        // 请求过于频繁
        if (status === 429 || code === "RATE_LIMIT" || message.includes("频繁")) {
            return {
                type: 'rate_limit',
                message: "请求过于频繁，请稍后再试",
                retryable: true
            };
        }

        // 网络错误
        if (!isOnline || err?.name === "TypeError" || message.includes("network") || message.includes("fetch") || message.includes("Failed to fetch")) {
            return {
                type: 'network',
                message: "网络连接失败，请检查网络",
                retryable: true
            };
        }

        // 服务器错误
        if (status >= 500 || message.includes("服务器")) {
            return {
                type: 'server',
                message: "服务器繁忙，请稍后再试",
                retryable: true
            };
        }

        // 未知错误
        return {
            type: 'unknown',
            message: "发送失败，请重试",
            retryable: true
        };
    }

    // 处理错误
    function handleError(error: Error | unknown) {
        console.error("Chat error:", error);
        lastError = parseError(error);

        // 显示 toast 通知
        if (lastError.action?.href) {
            toast.error(lastError.message, {
                action: {
                    label: lastError.action.label,
                    onClick: () => goto(lastError!.action!.href!),
                },
            });
        } else {
            toast.error(lastError.message);
        }
    }

    // 处理完成（包括错误完成）
    function handleFinish(options: { isError: boolean; isAbort: boolean; isDisconnect: boolean }) {
        isSubmitting = false;

        if (options.isError || options.isDisconnect) {
            // 如果是错误或断开连接，但 onError 没有被调用，设置一个通用错误
            if (!lastError) {
                lastError = options.isDisconnect
                    ? { type: 'network', message: "连接已断开", retryable: true }
                    : { type: 'unknown', message: "请求失败，请重试", retryable: true };
                toast.error(lastError.message);
            }
        } else if (!options.isAbort) {
            // 成功完成，刷新积分
            afterCreditsConsumed();
        }
    }

    const chat = new Chat({
        onError: (error) => {
            handleError(error);
        },
        onFinish: (options) => {
            handleFinish(options);
        },
    });

    // 计算是否正在流式输出
    let isStreaming = $derived(chat.status === "streaming");

    // 获取最后一条消息
    let lastMessage = $derived(chat.messages[chat.messages.length - 1]);

    // 监听网络状态
    onMount(() => {
        if (browser) {
            isOnline = navigator.onLine;

            const handleOnline = () => {
                isOnline = true;
                toast.success("网络已恢复");
            };

            const handleOffline = () => {
                isOnline = false;
                toast.error("网络连接已断开");
            };

            window.addEventListener("online", handleOnline);
            window.addEventListener("offline", handleOffline);

            return () => {
                window.removeEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
            };
        }
    });

    // 获取错误图标
    function getErrorIcon(type: ErrorType) {
        switch (type) {
            case 'insufficient_credits': return CreditCard;
            case 'unauthorized': return LogIn;
            case 'rate_limit': return Clock;
            case 'network': return WifiOff;
            case 'server': return ServerCrash;
            default: return AlertCircle;
        }
    }

    // 检测是否滚动到底部
    function checkScrollPosition() {
        if (!messagesContainer) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceFromBottom <= 100) {
            shouldAutoScroll = true;
            showScrollButton = false;
        } else {
            shouldAutoScroll = false;
            showScrollButton = true;
        }
    }

    // 滚动到底部
    async function scrollToBottom(smooth = true) {
        await tick();
        if (messagesContainer) {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: smooth ? "smooth" : "instant",
            });
            shouldAutoScroll = true;
            showScrollButton = false;
        }
    }

    // 监听消息变化，自动滚动
    $effect(() => {
        const messageCount = chat.messages.length;
        const lastContent = lastMessage?.parts?.[0]?.type === "text"
            ? (lastMessage.parts[0] as any).text
            : "";

        if (messageCount > 0 && shouldAutoScroll) {
            scrollToBottom(false);
        }
    });

    // 自动调整输入框高度
    function autoResize() {
        if (textareaRef) {
            textareaRef.style.height = "auto";
            textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + "px";
        }
    }

    // 处理键盘事件
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    // 判断是否可以发送
    function canSend(): boolean {
        return !!(input.trim() && !isSubmitting && !isStreaming && isOnline);
    }

    // 发送消息（统一逻辑）
    async function sendMessage(message: string) {
        if (!message.trim() || isSubmitting || isStreaming || !isOnline) return;

        // 重置状态
        failedMessage = message;
        lastError = null;
        isSubmitting = true;
        shouldAutoScroll = true;

        // 重置输入框高度
        if (textareaRef) {
            textareaRef.style.height = "auto";
        }

        // 发送消息（错误通过 onError/onFinish 回调处理）
        chat.sendMessage({ text: message });

        // 注意：不在这里 await，因为 sendMessage 不会抛出异常
        // 错误处理通过 onError 和 onFinish 回调完成
    }

    // 提交表单
    function handleSubmit() {
        if (!canSend()) return;
        const message = input.trim();
        input = "";
        sendMessage(message);
    }

    // 重试发送失败的消息
    function retryLastMessage() {
        if (!failedMessage || isSubmitting || isStreaming) return;
        sendMessage(failedMessage);
    }

    // 停止生成
    function stopGeneration() {
        chat.stop();
    }

    // 快捷提示
    const quickPrompts = [
        { icon: Lightbulb, text: "给我一些创意灵感", prompt: "请给我一些有创意的想法或灵感" },
        { icon: Zap, text: "帮我写一段代码", prompt: "请帮我写一段代码" },
        { icon: MessageSquare, text: "解释一个概念", prompt: "请用简单的语言解释" },
    ];

    function useQuickPrompt(prompt: string) {
        input = prompt;
        textareaRef?.focus();
    }

    // 获取用户名首字母
    function getInitials(name?: string | null): string {
        if (!name) return "U";
        return name.charAt(0).toUpperCase();
    }
</script>

<div class="relative flex h-[calc(100vh-4rem)] flex-col">
    <!-- 网络断开提示 -->
    {#if !isOnline}
        <div class="border-b border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-900/20">
            <div class="mx-auto flex max-w-3xl items-center gap-2 text-sm">
                <WifiOff class="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span class="text-red-800 dark:text-red-200">
                    网络连接已断开，请检查网络设置
                </span>
            </div>
        </div>
    {/if}

    <!-- 积分余额警告 -->
    {#if isOnline && $authState.user?.credits !== undefined && $authState.user.credits < 10}
        <div class="border-b border-yellow-200 bg-yellow-50 px-4 py-2 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div class="mx-auto flex max-w-3xl items-center gap-2 text-sm">
                <AlertCircle class="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <span class="text-yellow-800 dark:text-yellow-200">
                    积分余额不足 ({$authState.user.credits} 积分)
                </span>
                <a
                    href="/dashboard/credits"
                    class="ml-auto font-medium text-yellow-700 underline hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
                >
                    立即充值
                </a>
            </div>
        </div>
    {/if}

    <!-- 消息区域 -->
    <div
        bind:this={messagesContainer}
        onscroll={checkScrollPosition}
        class="flex-1 overflow-y-auto"
    >
        {#if chat.messages.length === 0 && !isSubmitting}
            <!-- 空状态欢迎界面 -->
            <div class="flex h-full flex-col items-center justify-center px-4">
                <div class="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles class="h-8 w-8 text-primary" />
                </div>
                <h1 class="mb-2 text-2xl font-semibold text-foreground">
                    你好，有什么可以帮你？
                </h1>
                <p class="mb-8 max-w-md text-center text-muted-foreground">
                    我是你的 AI 助手，可以帮你回答问题、写作、编程等各种任务。
                </p>

                <!-- 快捷提示 -->
                <div class="flex flex-wrap justify-center gap-2">
                    {#each quickPrompts as { icon: Icon, text, prompt }}
                        <button
                            onclick={() => useQuickPrompt(prompt)}
                            disabled={!isOnline}
                            class="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Icon class="h-4 w-4" />
                            {text}
                        </button>
                    {/each}
                </div>
            </div>
        {:else}
            <!-- 消息列表 -->
            <div class="mx-auto max-w-3xl px-4 py-6">
                {#each chat.messages as message, i}
                    {@const isLastAssistantMessage = message.role === "assistant" && i === chat.messages.length - 1}
                    {@const showCursor = isLastAssistantMessage && isStreaming}
                    <div
                        class={cn(
                            "mb-6 flex gap-3",
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        <!-- 头像 -->
                        {#if message.role === "user"}
                            <Avatar.Root class="h-8 w-8 flex-shrink-0">
                                {#if $authState.user?.image}
                                    <Avatar.Image
                                        src={$authState.user.image}
                                        alt={$authState.user.name || "用户"}
                                    />
                                {/if}
                                <Avatar.Fallback class="bg-primary text-primary-foreground text-xs">
                                    {getInitials($authState.user?.name)}
                                </Avatar.Fallback>
                            </Avatar.Root>
                        {:else}
                            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                                <Bot class="h-4 w-4 text-white" />
                            </div>
                        {/if}

                        <!-- 消息内容 -->
                        <div class="flex max-w-[80%] flex-col gap-2">
                            <div
                                class={cn(
                                    "rounded-2xl px-4 py-3",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                {#each message.parts as part}
                                    {#if part.type === "text"}
                                        <div
                                            class={cn(
                                                "prose prose-sm max-w-none dark:prose-invert",
                                                "prose-p:my-1 prose-p:leading-relaxed",
                                                "prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-black/10 dark:prose-pre:bg-white/10",
                                                "prose-code:rounded prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-white/10",
                                                "prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
                                                message.role === "user" && "prose-invert"
                                            )}
                                        >
                                            {#each part.text.split('\n') as line, lineIndex}
                                                {#if lineIndex > 0}<br />{/if}{line}
                                            {/each}
                                            {#if showCursor}
                                                <span class="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-current align-middle"></span>
                                            {/if}
                                        </div>
                                    {/if}
                                {/each}
                            </div>

                            <!-- 流式输出时显示停止按钮 -->
                            {#if showCursor}
                                <button
                                    onclick={stopGeneration}
                                    class="flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                    <Square class="h-3 w-3" />
                                    停止生成
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}

                <!-- 提交中状态：等待 AI 响应 -->
                {#if isSubmitting && !isStreaming}
                    <div class="mb-6 flex gap-3">
                        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                            <Loader2 class="h-4 w-4 animate-spin text-white" />
                        </div>
                        <div class="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                            <span class="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]"></span>
                            <span class="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]"></span>
                            <span class="h-2 w-2 animate-bounce rounded-full bg-foreground/40"></span>
                        </div>
                    </div>
                {/if}

                <!-- 错误状态：在最后一条消息下方显示错误提示 -->
                {#if lastError && !isSubmitting && !isStreaming}
                    {@const ErrorIcon = getErrorIcon(lastError.type)}
                    <div class="mb-6 flex items-center justify-center gap-3">
                        <div class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
                            <ErrorIcon class="h-4 w-4 flex-shrink-0 text-red-500" />
                            <span class="text-sm text-red-600 dark:text-red-400">{lastError.message}</span>
                            {#if lastError.action?.href}
                                <a
                                    href={lastError.action.href}
                                    class="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                                >
                                    {lastError.action.label}
                                </a>
                            {:else if lastError.retryable && isOnline}
                                <button
                                    onclick={retryLastMessage}
                                    class="flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                                >
                                    <RefreshCw class="h-3 w-3" />
                                    重试
                                </button>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- 滚动到底部按钮 -->
    {#if showScrollButton}
        <div class="absolute bottom-32 left-1/2 z-10 -translate-x-1/2">
            <Button
                variant="secondary"
                size="icon"
                class="h-8 w-8 rounded-full shadow-lg"
                onclick={() => scrollToBottom()}
            >
                <ArrowDown class="h-4 w-4" />
            </Button>
        </div>
    {/if}

    <!-- 输入区域 -->
    <div class="border-t bg-background px-4 py-4">
        <form
            class="mx-auto max-w-3xl"
            onsubmit={(e) => {
                e.preventDefault();
                handleSubmit();
            }}
        >
            <div class="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                <Textarea
                    bind:ref={textareaRef}
                    bind:value={input}
                    oninput={autoResize}
                    onkeydown={handleKeydown}
                    placeholder={isOnline ? "输入消息... (Enter 发送, Shift+Enter 换行)" : "网络已断开..."}
                    class="min-h-[44px] max-h-[200px] flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
                    rows={1}
                    disabled={!isOnline || isSubmitting || isStreaming}
                />

                <Button
                    type="submit"
                    size="icon"
                    class="h-10 w-10 flex-shrink-0 rounded-xl"
                    disabled={!canSend()}
                >
                    {#if isSubmitting && !isStreaming}
                        <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                        <Send class="h-4 w-4" />
                    {/if}
                </Button>
            </div>
            <p class="mt-2 text-center text-xs text-muted-foreground">
                AI 可能会产生错误信息，请核实重要内容
            </p>
        </form>
    </div>
</div>
