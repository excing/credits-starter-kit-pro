<script lang="ts">
	import * as Card from '$lib/components/ui/card';
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>使用说明</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-3 text-sm">
		<div>
			<p class="font-medium mb-1">1. 生成兑换码</p>
			<p class="text-muted-foreground">
				选择套餐、设置使用次数和过期时间，点击"生成兑换码"按钮
			</p>
		</div>
		<div>
			<p class="font-medium mb-1">2. 分发兑换码</p>
			<p class="text-muted-foreground">
				复制生成的 UUID 兑换码，通过邮件、社交媒体等渠道分发给用户
			</p>
		</div>
		<div>
			<p class="font-medium mb-1">3. 用户兑换</p>
			<p class="text-muted-foreground">
				用户在 /dashboard/credits 页面输入兑换码即可获得对应的积分套餐
			</p>
		</div>
		<div>
			<p class="font-medium mb-1">4. 兑换码规则</p>
			<p class="text-muted-foreground">
				• 单次使用：一码一用，兑换后失效<br />
				• 多次使用：可设置最大使用次数（如3次）<br />
				• 过期时间：兑换码本身的有效期<br />
				• 套餐有效期：用户兑换后套餐的有效期（独立计算）
			</p>
		</div>
	</Card.Content>
</Card.Root>
