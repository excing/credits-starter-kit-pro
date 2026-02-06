# 积分扣费系统 - 快速参考指南

## 目录
1. [核心功能](#核心功能)
2. [API接口](#api接口)
3. [数据库表结构](#数据库表结构)
4. [使用示例](#使用示例)
5. [错误处理](#错误处理)

---

## 核心功能

### 1. 重试机制
- **重试次数**: 3次
- **重试间隔**: 5秒 → 10秒 → 20秒
- **不重试场景**: 余额不足（`InsufficientCreditsError`）
- **失败后**: 自动记录欠费

### 2. 欠费管理
- **自动记录**: 扣费失败或余额不足时
- **自动结算**: 用户充值/兑换积分时
- **结算策略**: FIFO（先进先出），优先结清早期欠费
- **支持部分结清**: 积分不足时部分偿还

### 3. 欠费结算流程
```
用户获得积分 → 创建套餐 → 自动结算欠费 → 完成
```

---

## API接口

### 用户接口

#### 1. 获取欠费记录
```http
GET /api/user/credits/debts?includeSettled=false
```

**响应**:
```json
{
  "debts": [
    {
      "id": "uuid",
      "userId": "user-id",
      "amount": 100,
      "operationType": "chat_usage",
      "isSettled": false,
      "createdAt": "2026-02-06T10:00:00Z"
    }
  ],
  "total": 1,
  "unsettledCount": 1
}
```

#### 2. 获取积分统计（含欠费）
```http
GET /api/user/credits/stats
```

**新增字段**:
- `totalDebt`: 总欠费金额
- `debtCount`: 未结清欠费数量

### 管理员接口

#### 1. 查看所有欠费
```http
GET /api/admin/credits/debts?settled=false&limit=50&offset=0
```

**参数**:
- `settled`: `true`（已结清）| `false`（未结清）| 不传（全部）
- `limit`: 每页数量（默认50）
- `offset`: 偏移量（默认0）

#### 2. 手动结清欠费
```http
POST /api/admin/credits/debts/[id]/settle
```

**响应**:
```json
{
  "success": true,
  "message": "欠费已手动结清",
  "debtId": "uuid",
  "amount": 100,
  "operationType": "chat_usage"
}
```

---

## 数据库表结构

### credit_debt（欠费表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键（UUID） |
| userId | text | 用户ID（外键） |
| amount | integer | 欠费金额（正数） |
| operationType | text | 操作类型 |
| metadata | text | 元数据（JSON） |
| relatedId | text | 关联ID |
| isSettled | boolean | 是否已结清 |
| settledAt | timestamp | 结清时间 |
| settledTransactionId | text | 结清交易ID |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |

---

## 使用示例

### 场景1: 扣费失败自动重试

```typescript
import { deductCredits, InsufficientCreditsError } from '$lib/server/credits';

try {
    await deductCredits(userId, 100, 'chat_usage', {
        model: 'gpt-4',
        tokens: 1000
    });
    console.log('扣费成功');
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

### 场景2: 用户充值自动结算欠费

```typescript
import { redeemCode } from '$lib/server/credits';

// 用户兑换积分
const result = await redeemCode(userId, codeId);
// 内部会自动调用 settleDebts()
// 欠费会被自动结算

console.log(`兑换成功，获得 ${result.credits} 积分`);
```

### 场景3: 查询用户欠费

```typescript
import { getUserDebts, getUserTotalDebt } from '$lib/server/credits';

// 获取未结清欠费
const debts = await getUserDebts(userId, false);

// 获取总欠费金额
const totalDebt = await getUserTotalDebt(userId);

console.log(`您有 ${debts.length} 笔欠费，总计 ${totalDebt} 积分`);
```

### 场景4: 管理员手动结清欠费

```typescript
// 前端调用
const response = await fetch(`/api/admin/credits/debts/${debtId}/settle`, {
    method: 'POST'
});

const result = await response.json();
console.log(result.message); // "欠费已手动结清"
```

---

## 错误处理

### 错误类型

#### 1. InsufficientCreditsError
```typescript
class InsufficientCreditsError extends Error {
    constructor(required: number, available: number)
}
```

**触发**: 余额不足
**行为**: 立即记录欠费，不重试

#### 2. 其他错误
**触发**: 数据库错误、网络问题等
**行为**: 重试3次（5s-10s-20s），失败后记录欠费

### 日志记录

所有关键操作都有详细日志：

```typescript
// 重试日志
console.error(`扣费失败 (尝试 ${attempt + 1}/4):`, { userId, amount, error });

// 欠费记录日志
console.log('欠费记录已创建:', { userId, amount, operationType });

// 欠费结清日志
console.log('欠费已结清:', { userId, debtId, amount, operationType });

// 部分结清日志
console.log('欠费部分结清:', {
    userId,
    debtId,
    originalAmount,
    settledAmount,
    remainingAmount
});
```

---

## 工具函数

### 核心函数

| 函数 | 位置 | 说明 |
|------|------|------|
| `deductCredits()` | credits.ts:203 | 扣除积分（带重试） |
| `grantPackageToUser()` | credits.ts:94 | 发放套餐（带结算） |
| `getUserDebts()` | credits.ts:671 | 获取欠费记录 |
| `getUserTotalDebt()` | credits.ts:694 | 获取总欠费 |
| `settleDebts()` | credits.ts:171 | 结算欠费（内部） |
| `recordDebt()` | credits.ts:295 | 记录欠费（内部） |

---

## 配置参数

### 重试配置
```typescript
const retryDelays = [5000, 10000, 20000]; // 毫秒
```

**修改方法**: 编辑 `src/lib/server/credits.ts:178`

### 结算策略
- **排序**: 按 `createdAt` 升序（早期欠费优先）
- **扣除**: 从最早过期的套餐开始

---

## 注意事项

### 1. 事务一致性
✅ 所有操作都在数据库事务中执行
✅ 避免并发问题和数据不一致

### 2. 性能考虑
- 重试会增加响应时间（最多35秒）
- 建议在后台任务中处理大量扣费
- 欠费结算在充值事务中，不影响用户体验

### 3. 安全性
- 管理员接口需要 `ADMIN_EMAIL` 验证
- 所有操作都有用户身份验证
- 欠费记录不可删除，只能标记为已结清

### 4. 监控建议
- 监控重试次数和失败率
- 定期检查未结清欠费总额
- 关注异常的欠费增长

---

## 测试清单

- [ ] 扣费成功（正常流程）
- [ ] 扣费失败重试（模拟临时故障）
- [ ] 余额不足记录欠费
- [ ] 充值自动结算欠费
- [ ] 部分结清欠费
- [ ] 完全结清欠费
- [ ] 管理员查看欠费
- [ ] 管理员手动结清
- [ ] 并发扣费测试
- [ ] 事务回滚测试

---

## 常见问题

### Q1: 为什么余额不足不重试？
**A**: 余额不足是预期的业务逻辑，重试无意义。应该立即记录欠费，等待用户充值。

### Q2: 重试间隔为什么递增？
**A**: 避免频繁请求加重系统负担，递增间隔（5-10-20秒）给系统恢复时间。

### Q3: 欠费会影响用户使用吗？
**A**: 不会。欠费只是记录，不阻止用户继续使用。可以根据业务需求添加限制逻辑。

### Q4: 如何防止恶意欠费？
**A**: 可以在 `preCheckCredits()` 中添加欠费上限检查：
```typescript
const totalDebt = await getUserTotalDebt(userId);
if (totalDebt > MAX_DEBT_LIMIT) {
    return json({ error: '欠费过多，请先充值' }, { status: 402 });
}
```

### Q5: 欠费结算顺序可以改吗？
**A**: 可以。修改 `settleDebts()` 中的 `orderBy` 子句：
```typescript
// 按金额从小到大
.orderBy(creditDebt.amount)

// 按操作类型优先级
.orderBy(sql`CASE WHEN operation_type = 'chat_usage' THEN 1 ELSE 2 END`)
```

---

## 更新日志

### v1.0.0 (2026-02-06)
- ✅ 实现重试机制（3次，5-10-20秒）
- ✅ 创建欠费表（credit_debt）
- ✅ 实现自动欠费结算
- ✅ 新增用户欠费查询接口
- ✅ 新增管理员欠费管理接口
- ✅ 更新积分统计接口（含欠费信息）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `src/lib/server/db/schema.ts` | 数据库表定义 |
| `src/lib/server/credits.ts` | 核心业务逻辑 |
| `src/routes/api/user/credits/debts/+server.ts` | 用户欠费接口 |
| `src/routes/api/user/credits/stats/+server.ts` | 积分统计接口 |
| `src/routes/api/admin/credits/debts/+server.ts` | 管理员欠费列表 |
| `src/routes/api/admin/credits/debts/[id]/settle/+server.ts` | 管理员结清接口 |
| `CREDIT_DEDUCTION_IMPROVEMENTS.md` | 详细实现文档 |

---

## 联系支持

如有问题或建议，请查看详细文档：`CREDIT_DEDUCTION_IMPROVEMENTS.md`
