<script lang="ts">
	import "../app.css";
	import { Toaster } from "$lib/components/ui/sonner";
	import { ModeWatcher } from "mode-watcher";
	import { authStore } from "$lib/stores/auth.svelte";

	let { data, children } = $props();

	$effect(() => {
		authStore.initAuthFromLayout(data?.session);
	});
</script>

<svelte:head>
	<title>SvelteKit Starter Kit - Launch Your SAAS</title>
</svelte:head>

<ModeWatcher defaultMode="light" />
{@render children()}
<Toaster />
