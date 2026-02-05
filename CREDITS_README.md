# 积分系统使用指南

## 快速开始

### 1. 初始化数据库

运行种子数据脚本，创建默认的积分套餐和计费配置：

```bash
npx tsx src/lib/server/db/seed-credits.ts
```

这将创建：
- **新手礼包**：100积分，90天有效
- **基础套餐**：500积分，180天有效，¥49
- **专业套餐**：2000积分，365天有效，¥199

以及计费配置：
- **AI 聊天**：1 积分/1000 tokens
- **图片生成**：5 积分/张

### 2. 配置管理员

在 `.env` 文件中设置管理员邮箱：

```env
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### 3. 生成兑换码

使用脚本生成兑换码：

```bash
npx tsx src/lib/server/db/generate-code.ts
```

这将生成 3 个示例兑换码（UUID 格式），复制后可以分发给用户。

### 4. 用户使用流程

1. **注册账号** → 自动获得 100 积分（90天有效）
2. **查看余额** → 访问 `/dashboard/credits` 或查看导航栏
3. **兑换积分** → 在积分管理页面输入兑换码
4. **使用功能** → AI 聊天会自动扣除积分
5. **查看历史** → 在积分管理页面查看交易记录

## 功能说明

### 套餐模型

本系统采用**套餐模型**而非直接积分模型：

- 用户通过兑换码获得**积分套餐**
- 每个套餐有独立的**积分数**和**过期时间**
- 用户可以拥有**多个套餐**
- 总余额 = 所有未过期套餐的剩余积分之和

**优势**：
- 精确的过期管理
- 灵活的商业模式
- 清晰的审计追踪
- 防止滥用

### 智能扣费策略（FIFO）

当用户消费积分时：
1. 查询所有未过期且有余额的套餐
2. 按过期时间排序（最早过期的优先）
3. 从第一个套餐扣除，不足则继续下一个
4. 记录每笔扣费来自哪个套餐

**示例**：
- 用户有套餐A（剩余50积分，30天后过期）
- 用户有套餐B（剩余100积分，90天后过期）
- 消费60积分时：先从A扣50，再从B扣10
- 结果：A余额0，B余额90

### 计费配置

系统支持灵活的计费配置，存储在 `operation_cost` 表中：

**AI 聊天**：
- 类型：`per_token`（按 token 计费）
- 费用：1 积分/1000 tokens
- 在聊天完成后根据实际消耗扣费

**图片生成**：
- 类型：`fixed`（固定计费）
- 费用：5 积分/张
- 在操作前预扣费

可以通过修改数据库来调整计费规则。

## API 端点

### 用户端点

#### 获取积分余额
```http
GET /api/user/credits
Authorization: Required (session)

Response:
{
  "balance": 150,
  "activePackages": 2
}
```

#### 获取用户套餐列表
```http
GET /api/user/credits/packages
Authorization: Required (session)

Response:
{
  "packages": [
    {
      "id": "uuid",
      "creditsTotal": 100,
      "creditsRemaining": 50,
      "expiresAt": "2026-05-01T00:00:00Z",
      "source": "redemption"
    }
  ]
}
```

#### 获取交易历史
```http
GET /api/user/credits/history?limit=50&offset=0
Authorization: Required (session)

Response:
{
  "transactions": [
    {
      "id": "uuid",
      "type": "chat_usage",
      "amount": -10,
      "description": "chat_usage 消费",
      "createdAt": "2026-02-04T12:00:00Z"
    }
  ]
}
```

#### 兑换积分
```http
POST /api/user/credits/redeem
Authorization: Required (session)
Content-Type: application/json

Body:
{
  "code": "550e8400-e29b-41d4-a716-446655440000"
}

Response:
{
  "success": true,
  "credits": 100,
  "packageName": "新手礼包",
  "expiresAt": "2026-05-01T00:00:00Z",
  "message": "成功兑换 100 积分！"
}
```

### 管理员端点

#### 获取所有套餐
```http
GET /api/admin/credits/packages
Authorization: Required (admin)

Response:
{
  "packages": [
    {
      "id": "pkg-welcome",
      "name": "新手礼包",
      "credits": 100,
      "validityDays": 90,
      "isActive": true
    }
  ]
}
```

#### 生成兑换码
```http
POST /api/admin/credits/generate-code
Authorization: Required (admin)
Content-Type: application/json

Body:
{
  "packageId": "pkg-welcome",
  "maxUses": 1,
  "codeExpiresInDays": 30
}

Response:
{
  "success": true,
  "code": "550e8400-e29b-41d4-a716-446655440000",
  "packageId": "pkg-welcome",
  "maxUses": 1,
  "codeExpiresInDays": 30
}
```

## 数据库表结构

### credit_package（积分套餐表）
- `id` - 套餐ID
- `name` - 套餐名称
- `credits` - 积分数
- `validityDays` - 有效期天数
- `price` - 价格（分）
- `packageType` - 类型（redemption/purchase/subscription）

### user_credit_package（用户套餐表）
- `id` - 记录ID
- `userId` - 用户ID
- `packageId` - 套餐ID
- `creditsTotal` - 总积分
- `creditsRemaining` - 剩余积分
- `expiresAt` - 过期时间
- `source` - 来源（redemption/purchase/admin）

### credit_transaction（交易记录表）
- `id` - 交易ID
- `userId` - 用户ID
- `userPackageId` - 套餐ID
- `type` - 类型（redemption/chat_usage/etc）
- `amount` - 金额（正数=增加，负数=扣除）
- `balanceBefore` - 操作前余额
- `balanceAfter` - 操作后余额
- `description` - 描述
- `metadata` - 元数据（JSON）

### redemption_code（兑换码表）
- `id` - 兑换码（UUID）
- `packageId` - 关联套餐ID
- `maxUses` - 最大使用次数
- `currentUses` - 当前使用次数
- `codeExpiresAt` - 兑换码过期时间
- `isActive` - 是否激活

### redemption_history（兑换历史表）
- `id` - 记录ID
- `codeId` - 兑换码ID
- `userId` - 用户ID
- `packageId` - 套餐ID
- `userPackageId` - 生成的用户套餐ID
- `creditsGranted` - 获得的积分
- `expiresAt` - 套餐过期时间

### operation_cost（计费配置表）
- `id` - 配置ID
- `operationType` - 操作类型（chat/image_generation）
- `costType` - 计费类型（fixed/per_token）
- `costAmount` - 费用金额
- `costPer` - 计费单位（如 1000 tokens）

## 安全特性

### 1. 防止双花攻击
- 使用数据库事务
- 行级锁（`FOR UPDATE`）
- 原子性操作确保余额一致性

### 2. 兑换码安全
- UUID 格式（128位随机性）
- 过期时间强制检查
- 使用次数限制
- 用户级别去重（同一用户不能重复兑换同一码）
- 速率限制（5次/分钟）

### 3. 管理员权限
- 通过环境变量 `ADMIN_EMAILS` 控制
- 未来可扩展为基于角色的访问控制（RBAC）

### 4. 审计日志
- 所有交易不可变（`credit_transaction` 表）
- 记录 balanceBefore/balanceAfter
- 元数据记录详细信息（tokens、model 等）

## 常见问题

### Q: 如何修改计费规则？

直接修改数据库中的 `operation_cost` 表：

```sql
UPDATE operation_cost
SET cost_amount = 2, cost_per = 1000
WHERE operation_type = 'chat';
```

### Q: 如何手动给用户发放积分？

使用 `grantPackageToUser` 函数：

```typescript
import { grantPackageToUser } from '$lib/server/credits';

await grantPackageToUser(
  'user-id',
  'pkg-welcome',
  'admin',
  'manual-grant'
);
```

### Q: 如何查看用户的积分使用情况？

查询 `credit_transaction` 表：

```sql
SELECT * FROM credit_transaction
WHERE user_id = 'user-id'
ORDER BY created_at DESC;
```

### Q: 如何批量生成兑换码？

修改 `generate-code.ts` 脚本，使用循环生成：

```typescript
for (let i = 0; i < 100; i++) {
  const code = await generateRedemptionCode('pkg-basic', 1, 30);
  console.log(code);
}
```

### Q: 套餐过期后积分会怎样？

套餐过期后：
- 剩余积分自动失效
- 不计入用户总余额
- 交易记录保留（审计用途）

### Q: 如何实现积分退款？

使用 `addCredits` 函数，类型设为 `refund`：

```typescript
import { addCredits } from '$lib/server/credits';

await addCredits({
  userId: 'user-id',
  type: 'refund',
  amount: 50,
  description: '退款',
  relatedId: 'original-transaction-id'
});
```

## 扩展建议

### 短期优化
- [ ] 添加积分消费统计图表
- [ ] 实现套餐过期提醒（邮件/通知）
- [ ] 添加积分充值记录导出功能
- [ ] 优化移动端显示

### 中期扩展
- [ ] 集成支付网关（Stripe/支付宝/微信支付）
- [ ] 实现订阅功能（月度/年度自动发放积分）
- [ ] 添加积分礼品卡功能
- [ ] 实现积分转赠功能

### 长期规划
- [ ] 积分商城（用积分兑换商品/服务）
- [ ] 会员等级系统
- [ ] 积分任务系统（签到、分享等获得积分）
- [ ] 推荐奖励机制

## 故障排查

### 问题：用户余额显示为 0

**可能原因**：
1. 套餐已过期
2. 数据库连接问题
3. 前端未刷新积分

**解决方案**：
```typescript
// 检查用户套餐
const packages = await getUserActivePackages(userId);
console.log('Active packages:', packages);

// 手动刷新前端积分
import { refreshUserCredits } from '$lib/stores/auth';
await refreshUserCredits();
```

### 问题：兑换码无法使用

**可能原因**：
1. 兑换码已过期
2. 已达到最大使用次数
3. 用户已兑换过此码
4. 速率限制

**解决方案**：
```sql
-- 检查兑换码状态
SELECT * FROM redemption_code WHERE id = 'code-uuid';

-- 检查兑换历史
SELECT * FROM redemption_history WHERE code_id = 'code-uuid';
```

### 问题：积分扣除失败

**可能原因**：
1. 余额不足
2. 数据库事务失败
3. 并发冲突

**解决方案**：
- 检查服务器日志
- 查看 `credit_transaction` 表是否有记录
- 确认数据库连接正常

## 技术支持

如有问题，请查看：
- 完整实现文档：`CREDITS_IMPLEMENTATION.md`
- 项目文档：`CLAUDE.md`
- 数据库 schema：`src/lib/server/db/schema.ts`

或联系开发团队。
