<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { authClient } from "$lib/auth-client";
	import { Settings2 } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import {
        authLoaded,
        currentUser,
        patchCurrentUser,
    } from "$lib/stores/auth";

    interface User {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    }

    let user = $derived($currentUser as User | null);
    let loading = $derived(!$authLoaded);
    // Profile form states
    let name = $state("");
    let email = $state("");
    let didInitForm = $state(false);

    // Profile picture upload states
    let imagePreview = $state<string | null>(null);
    let uploadingImage = $state(false);

    $effect(() => {
        if (!$authLoaded || didInitForm) return;
        if ($currentUser) {
            name = ($currentUser as any)?.name || "";
            email = ($currentUser as any)?.email || "";
            didInitForm = true;
        }
    });

    async function handleUpdateProfile() {
        try {
            await authClient.updateUser({ name });
            patchCurrentUser({ name });
            toast.success("Profile updated successfully");
        } catch {
            toast.error("Failed to update profile");
        }
    }
</script>

{#if loading}
    <div class="flex flex-col gap-6 p-6">
        <div>
            <Skeleton class="mb-2 h-9 w-32 bg-gray-200 dark:bg-gray-800" />
            <Skeleton class="h-5 w-80 bg-gray-200 dark:bg-gray-800" />
        </div>
    </div>
{:else}
    <div class="flex flex-col gap-6 p-6">
        <div>
            <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>
            <p class="text-muted-foreground mt-2">
                Manage your account settings and preferences
            </p>
        </div>

	        <Card.Root class="w-full max-w-4xl">
	            <Card.Header>
	                <Card.Title class="flex items-center gap-2">
	                    <Settings2 class="h-5 w-5" />
	                    Profile Information
	                </Card.Title>
	                <Card.Description>
	                    Update your personal information and profile settings
	                </Card.Description>
	            </Card.Header>
	            <Card.Content class="space-y-6">
	                <div class="flex items-center gap-4">
	                    <Avatar.Root class="h-20 w-20">
	                        {#if imagePreview || user?.image}
	                            <Avatar.Image
	                                src={imagePreview || user?.image || ""}
	                            />
	                        {:else}
	                            <Avatar.Fallback>
	                                {name
	                                    .split(" ")
	                                    .map((n) => n[0])
	                                    .join("")}
	                            </Avatar.Fallback>
	                        {/if}
	                    </Avatar.Root>
	                    <div class="space-y-2">
	                        <Button
	                            variant="outline"
	                            size="sm"
	                            disabled={uploadingImage}
	                        >
	                            {uploadingImage
	                                ? "Uploading..."
	                                : "Change Photo"}
	                        </Button>
	                        <p class="text-muted-foreground text-sm">
	                            JPG, GIF or PNG. 1MB max.
	                        </p>
	                    </div>
	                </div>

	                <div class="grid grid-cols-2 gap-4">
	                    <div class="space-y-2">
	                        <Label for="name">Full Name</Label>
	                        <Input
	                            id="name"
	                            bind:value={name}
	                            placeholder="Enter your full name"
	                        />
	                    </div>
	                    <div class="space-y-2">
	                        <Label for="email">Email</Label>
	                        <Input
	                            id="email"
	                            type="email"
	                            bind:value={email}
	                            placeholder="Enter your email"
	                            disabled
	                        />
	                    </div>
	                </div>

	                <Button onclick={handleUpdateProfile}>Save Changes</Button>
	            </Card.Content>
	        </Card.Root>
    </div>
{/if}
