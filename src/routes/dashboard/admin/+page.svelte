<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Gift, Plus } from 'lucide-svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import {
		AdminStats,
		AdminPackages,
		AdminDebts,
		AdminCodes,
		AdminDialogs,
		AdminInstructions
	} from '$lib/components/admin';

	onMount(() => {
		adminStore.init();
	});
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">管理员控制台</h1>
			<p class="text-muted-foreground mt-1">管理积分套餐、兑换码和欠费记录</p>
		</div>
		<div class="flex gap-2">
			<Button
				onclick={() => {
					adminStore.resetPackageForm();
					adminStore.createPackageDialogOpen = true;
				}}
				variant="outline"
			>
				<Plus class="mr-2 h-4 w-4" />
				创建套餐
			</Button>
			<Button onclick={() => (adminStore.generateDialogOpen = true)}>
				<Gift class="mr-2 h-4 w-4" />
				生成兑换码
			</Button>
		</div>
	</div>

	<!-- 统计卡片 -->
	<AdminStats />

	<!-- 套餐列表 -->
	<AdminPackages />

	<!-- 欠费管理 -->
	<AdminDebts />

	<!-- 兑换码管理 -->
	<AdminCodes />

	<!-- 使用说明 -->
	<AdminInstructions />
</div>

<!-- 对话框 -->
<AdminDialogs />
