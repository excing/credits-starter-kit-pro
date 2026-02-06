# 积分扣费逻辑改进说明

## 概述

本次改进针对积分扣费系统的两个关键问题进行了优化：
1. **扣费失败处理** - 实现了重试机制
2. **欠费管理** - 创建了欠费表和自动结算机制

## 一、数据库变更

### 新增表：credit_debt（积分欠费表）

**位置**: `src/lib/server/db/schema.ts:150-164`

**字段说明**:
- `id` - 主键（UUID）
- `userId` - 用户ID（外键关联user表）
- `amount` - 欠费金额（正数）
- `operationType` - 操作类型（如：chat_usage, image_generation等）
- `metadata` - 元数据（JSON字符串，存储额外信息）
- `relatedId` - 关联ID（可选）
- `isSettled` - 是否已结清（布尔值，默认false）
- `settledAt` - 结清时间（可选）
- `settledTransactionId` - 结清交易ID（可选）
- `createdAt` - 创建时间
- `updatedAt` - 更新时间

## 二、核心功能实现

### 1. 重试机制（Retry Mechanism）

**位置**: `src/lib/server/credits.ts:203-261`

**实现细节**:
```typescript
重试策略：
- 第1次失败 → 等待5秒后重试
- 第2次失败 → 等待10秒后重试
- 第3次失败 → 等待20秒后重试
- 第4次失败 → 记录欠费并抛出错误
```

**重试逻辑**:
1. 使用 `for` 循环实现最多4次尝试（1次初始 + 3次重试）
2. 每次失败后使用 `delay()` 函数等待指定时间
3. 如果是 `InsufficientCreditsError`（余额不足），立即停止重试
4. 其他错误继续重试，直到达到最大重试次数
5. 所有重试失败后，记录欠费并抛出最后一个错误

**关键代码**:
```typescript
const retryDelays = [5000, 10000, 20000]; // 5秒, 10秒, 20秒

for (let attempt = 0; attempt < retryDelays.length + 1; attempt++) {
    try {
        // 执行扣费逻辑
        await db.transaction(async (tx) => { ... });
        return; // 成功则返回
    } catch (error) {
        if (error instanceof InsufficientCreditsError) {
            throw error; // 余额不足不重试
        }

        if (attempt < retryDelays.length) {
            await delay(retryDelays[attempt]); // 等待后重试
        }
    }
}

// 所有重试失败，记录欠费
await recordDebt(userId, amount, operationType, metadata);
```

### 2. 欠费记录（Debt Recording）

**位置**: `src/lib/server/credits.ts:168-198`

**功能**: 当扣费失败或余额不足时，自动记录欠费

**触发场景**:
1. 余额不足（`InsufficientCreditsError`）
2. 重试3次后仍然失败

**实现**:
```typescript
async function recordDebt(
    userId: string,
    amount: number,
    operationType: string,
    metadata?: Record<string, any>
): Promise<void> {
    await db.insert(creditDebt).values({
        id: randomUUID(),
        userId,
        amount,
        operationType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        relatedId: metadata?.relatedId || null,
        isSettled: false
    });
}
```

### 3. 欠费结算（Debt Settlement）

**位置**: `src/lib/server/credits.ts:171-290`

**触发时机**: 用户获得新积分时（兑换码、购买、管理员发放等）

**结算策略**:
1. 按欠费创建时间排序（先结清早期欠费）
2. 从最早过期的套餐开始扣除积分
3. 支持部分结清（积分不足时）
4. 完全结清时标记 `isSettled = true`
5. 部分结清时更新剩余欠费金额

**实现流程**:
```
用户获得积分
    ↓
调用 grantPackageToUser()
    ↓
在事务中调用 settleDebts()
    ↓
查询所有未结清欠费（按创建时间排序）
    ↓
获取用户可用积分
    ↓
逐个结算欠费：
    - 从套餐中扣除积分
    - 创建交易记录
    - 更新欠费状态（完全结清或部分结清）
    ↓
完成
```

**关键代码**:
```typescript
// 完全结清
if (settleAmount >= debt.amount) {
    await tx.update(creditDebt)
        .set({
            isSettled: true,
            settledAt: new Date(),
            updatedAt: new Date()
        })
        .where(eq(creditDebt.id, debt.id));
}
// 部分结清
else {
    await tx.update(creditDebt)
        .set({
            amount: debt.amount - settleAmount,
            updatedAt: new Date()
        })
        .where(eq(creditDebt.id, debt.id));
}
```

## 三、新增API接口

### 1. 获取用户欠费记录

**端点**: `GET /api/user/credits/debts`

**位置**: `src/routes/api/user/credits/debts/+server.ts`

**查询参数**:
- `includeSettled` (可选) - 是否包含已结清的欠费，默认 `false`

**响应示例**:
```json
{
  "debts": [
    {
      "id": "uuid",
      "userId": "user-id",
      "amount": 100,
      "operationType": "chat_usage",
      "metadata": { "model": "gpt-4" },
      "relatedId": null,
      "isSettled": false,
      "settledAt": null,
      "settledTransactionId": null,
      "createdAt": "2026-02-06T10:00:00Z",
      "updatedAt": "2026-02-06T10:00:00Z"
    }
  ],
  "total": 1,
  "unsettledCount": 1
}
```

### 2. 更新积分统计接口

**端点**: `GET /api/user/credits/stats`

**位置**: `src/routes/api/user/credits/stats/+server.ts:77-111`

**新增字段**:
- `totalDebt` - 用户总欠费金额
- `debtCount` - 未结清欠费数量

**响应示例**:
```json
{
  "totalSpent": 5000,
  "totalEarned": 10000,
  "spendingByType": [...],
  "expiringPackages": [...],
  "totalDebt": 150,
  "debtCount": 2
}
```

## 四、新增工具函数

### 1. getUserDebts()

**位置**: `src/lib/server/credits.ts:671-689`

**功能**: 获取用户欠费记录

**参数**:
- `userId` - 用户ID
- `includeSettled` - 是否包含已结清的欠费（默认false）

**返回**: 欠费记录数组（包含解析后的metadata）

### 2. getUserTotalDebt()

**位置**: `src/lib/server/credits.ts:694-708`

**功能**: 获取用户总欠费金额

**参数**:
- `userId` - 用户ID

**返回**: 未结清欠费的总金额（数字）

## 五、修改的现有函数

### 1. deductCredits()

**位置**: `src/lib/server/credits.ts:203-261`

**变更**:
- ✅ 添加重试机制（3次重试，间隔5-10-20秒）
- ✅ 余额不足时记录欠费
- ✅ 所有重试失败后记录欠费
- ✅ 详细的错误日志记录

### 2. grantPackageToUser()

**位置**: `src/lib/server/credits.ts:94-159`

**变更**:
- ✅ 在事务中调用 `settleDebts()` 自动结算欠费
- ✅ 确保用户获得积分时优先偿还欠款

## 六、使用示例

### 场景1：扣费失败自动重试

```typescript
// 用户执行操作，积分不足
try {
    await deductCredits(userId, 100, 'chat_usage', { model: 'gpt-4' });
} catch (error) {
    if (error instanceof InsufficientCreditsError) {
        // 余额不足，已自动记录欠费
        console.log('余额不足，已记录欠费');
    } else {
        // 其他错误，已重试3次并记录欠费
        console.log('扣费失败，已记录欠费');
    }
}
```

### 场景2：用户充值自动结算欠费

```typescript
// 用户兑换积分
await redeemCode(userId, codeId);
// 内部会调用 grantPackageToUser()
// grantPackageToUser() 会自动调用 settleDebts()
// 欠费会被自动结算
```

### 场景3：查询用户欠费

```typescript
// 获取未结清欠费
const debts = await getUserDebts(userId, false);

// 获取总欠费金额
const totalDebt = await getUserTotalDebt(userId);

// 前端显示
console.log(`您有 ${debts.length} 笔欠费，总计 ${totalDebt} 积分`);
```

## 七、数据流程图

### 扣费流程（带重试）

```
用户操作
    ↓
deductCredits() 第1次尝试
    ↓
失败？ → 是 → 等待5秒 → 第2次尝试
    ↓                         ↓
    否                    失败？ → 是 → 等待10秒 → 第3次尝试
    ↓                         ↓                      ↓
成功返回                      否                 失败？ → 是 → 等待20秒 → 第4次尝试
                              ↓                      ↓                      ↓
                          成功返回                   否                 失败？
                                                     ↓                      ↓
                                                 成功返回              记录欠费 + 抛出错误
```

### 欠费结算流程

```
用户获得积分（兑换/购买/管理员发放）
    ↓
grantPackageToUser()
    ↓
创建用户套餐
    ↓
创建交易记录
    ↓
settleDebts() - 在同一事务中
    ↓
查询未结清欠费（按时间排序）
    ↓
有欠费？ → 否 → 完成
    ↓
    是
    ↓
获取可用积分
    ↓
逐个结算欠费：
    - 从套餐扣除积分
    - 创建交易记录
    - 更新欠费状态
    ↓
完成
```

## 八、注意事项

### 1. 事务一致性
- 所有扣费和结算操作都在数据库事务中执行
- 确保数据一致性，避免并发问题

### 2. 重试策略
- 余额不足错误不会重试（立即记录欠费）
- 其他错误（如网络问题、数据库锁等）会重试3次
- 重试间隔递增（5s → 10s → 20s），避免频繁请求

### 3. 欠费结算优先级
- 按欠费创建时间排序（FIFO）
- 从最早过期的套餐开始扣除
- 支持部分结清，不会因积分不足而失败

### 4. 日志记录
- 所有重试、欠费记录、结算操作都有详细日志
- 便于排查问题和审计

### 5. API兼容性
- 现有API接口保持向后兼容
- 新增字段不影响现有功能
- 前端可选择性使用欠费信息

## 九、测试建议

### 1. 重试机制测试
```typescript
// 模拟数据库临时故障
// 验证重试3次后记录欠费
```

### 2. 欠费记录测试
```typescript
// 余额不足场景
// 验证欠费正确记录
```

### 3. 欠费结算测试
```typescript
// 用户充值后
// 验证欠费自动结算
// 验证部分结算和完全结清
```

### 4. 并发测试
```typescript
// 多个操作同时扣费
// 验证事务隔离性
```

## 十、总结

本次改进实现了：
1. ✅ 扣费失败重试机制（3次重试，间隔5-10-20秒）
2. ✅ 欠费记录和管理（新增credit_debt表）
3. ✅ 自动欠费结算（用户充值时自动扣除）
4. ✅ 新增API接口（查询欠费、统计欠费）
5. ✅ 完善的日志记录和错误处理

系统现在能够：
- 自动处理临时性扣费失败（重试机制）
- 记录无法立即扣除的费用（欠费表）
- 在用户充值时自动偿还欠款（自动结算）
- 提供完整的欠费查询和统计功能

所有改动都保持了向后兼容性，不影响现有功能的正常运行。
