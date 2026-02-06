<script lang="ts">
    import { Button } from "$lib/components/ui/button";
	    import {
	        authState,
	        ensureCurrentUserLoaded,
	    } from "$lib/stores/auth";
    import { goto } from "$app/navigation";
    import type { Snippet } from "svelte";

    let {
        href = undefined,
        onclick = undefined,
        children,
        class: className = undefined,
        ...rest
    } = $props<{
        href?: string;
        onclick?: (e: MouseEvent) => void;
        children?: Snippet;
        class?: string;
        [key: string]: any;
    }>();

	    let isAuthenticated = $derived($authState.loaded ? !!$authState.user : null);

	    async function handleClick(e: MouseEvent) {
	        if (!$authState.loaded) {
	            // If the user clicks before layout data initializes, resolve once.
	            await ensureCurrentUserLoaded();
	        }

	        if (!$authState.user) {
            e.preventDefault();
            goto("/sign-in");
            return;
        }

        if (onclick) {
            onclick(e);
        }
    }
</script>

<Button
    {...rest}
    class={className}
    href={isAuthenticated === false ? "/sign-in" : href}
    onclick={handleClick}
>
    {#if isAuthenticated === false}
        Sign In to Get Started
    {:else}
        {@render children?.()}
    {/if}
</Button>
