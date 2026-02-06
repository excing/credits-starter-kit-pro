# 积分扣费逻辑改进 - 重要更新

## 关键逻辑修正

### 问题
之前的实现中，当余额不足时，会直接记录全额欠费而不扣除现有余额。

### 修正后的逻辑
现在的实现会：
1. **先扣除所有可用余额**
2. **只对不足的部分记录欠费**

---

## 修正后的扣费流程

### 场景1：余额充足（100积分，需要80积分）
```
用户有100积分，需要扣除80积分
    ↓
从套餐扣除80积分
    ↓
剩余20积分
    ↓
扣费成功，无欠费
```

### 场景2：余额不足（50积分，需要100积分）
```
用户有50积分，需要扣除100积分
    ↓
从套餐扣除50积分（全部可用余额）
    ↓
还需要50积分
    ↓
记录欠费：50积分（仅不足部分）
    ↓
抛出 InsufficientCreditsError
```

### 场景3：余额为0（0积分，需要100积分）
```
用户有0积分，需要扣除100积分
    ↓
无可用余额可扣除
    ↓
记录欠费：100积分（全额）
    ↓
抛出 InsufficientCreditsError
```

---

## 核心代码逻辑

```typescript
// 从最早过期的套餐开始扣除
for (const pkg of packages) {
    if (remainingAmount <= 0) break;

    const deductFromThis = Math.min(remainingAmount, pkg.creditsRemaining);
    const newBalance = pkg.creditsRemaining - deductFromThis;

    // 更新套餐余额
    await tx.update(userCreditPackage)
        .set({ creditsRemaining: newBalance })
        .where(eq(userCreditPackage.id, pkg.id));

    // 创建交易记录
    await tx.insert(creditTransaction).values({
        id: randomUUID(),
        userId,
        userPackageId: pkg.id,
        type: operationType as TransactionType,
        amount: -deductFromThis,
        balanceBefore: pkg.creditsRemaining,
        balanceAfter: newBalance,
        description: `${operationType} 消费`,
        metadata: metadata ? JSON.stringify(metadata) : null
    });

    remainingAmount -= deductFromThis;
}

// 如果还有剩余未扣除的金额，记录欠费
if (remainingAmount > 0) {
    await recordDebt(userId, remainingAmount, operationType, metadata);
    throw new InsufficientCreditsError(amount, totalBalance);
}
```

---

## 优势

### 1. 更合理的欠费记录
- ✅ 只记录实际不足的部分
- ✅ 充分利用现有余额
- ✅ 减少欠费总额

### 2. 更好的用户体验
- ✅ 用户的现有积分不会被浪费
- ✅ 欠费金额更准确
- ✅ 结算时需要偿还的金额更少

### 3. 更准确的财务记录
- ✅ 交易记录完整（显示已扣除的部分）
- ✅ 欠费记录准确（只记录不足部分）
- ✅ 便于审计和对账

---

## 示例对比

### 修正前（错误）
```
用户余额：50积分
需要扣除：100积分

结果：
- 余额：50积分（未扣除）
- 欠费：100积分（全额记录）
- 问题：用户的50积分被浪费了
```

### 修正后（正确）
```
用户余额：50积分
需要扣除：100积分

结果：
- 余额：0积分（已扣除50积分）
- 欠费：50积分（仅不足部分）
- 优势：充分利用了现有余额
```

---

## 完整流程图

```
用户操作（需要扣除100积分）
    ↓
获取用户所有可用套餐
    ↓
计算总余额（例如：50积分）
    ↓
开始扣除积分
    ↓
套餐1：30积分 → 扣除30积分 → 剩余0积分
    ↓
套餐2：20积分 → 扣除20积分 → 剩余0积分
    ↓
已扣除：50积分
还需要：50积分
    ↓
记录欠费：50积分（仅不足部分）
    ↓
创建交易记录（显示已扣除的50积分）
    ↓
抛出 InsufficientCreditsError(需要100, 可用50)
```

---

## 数据库记录示例

### 交易记录（credit_transaction）
```json
[
  {
    "id": "tx-1",
    "userId": "user-123",
    "userPackageId": "pkg-1",
    "type": "chat_usage",
    "amount": -30,
    "balanceBefore": 30,
    "balanceAfter": 0,
    "description": "chat_usage 消费"
  },
  {
    "id": "tx-2",
    "userId": "user-123",
    "userPackageId": "pkg-2",
    "type": "chat_usage",
    "amount": -20,
    "balanceBefore": 20,
    "balanceAfter": 0,
    "description": "chat_usage 消费"
  }
]
```

### 欠费记录（credit_debt）
```json
{
  "id": "debt-1",
  "userId": "user-123",
  "amount": 50,
  "operationType": "chat_usage",
  "isSettled": false,
  "createdAt": "2026-02-06T10:00:00Z"
}
```

---

## 重试机制说明

### 余额不足（不重试）
```
第1次尝试
    ↓
扣除所有可用余额（50积分）
    ↓
记录欠费（50积分）
    ↓
抛出 InsufficientCreditsError
    ↓
不重试（因为余额确实不足）
```

### 其他错误（重试3次）
```
第1次尝试 → 数据库错误
    ↓
等待5秒
    ↓
第2次尝试 → 数据库错误
    ↓
等待10秒
    ↓
第3次尝试 → 数据库错误
    ↓
等待20秒
    ↓
第4次尝试 → 失败
    ↓
记录欠费（100积分，全额）
    ↓
抛出错误
```

---

## 测试用例

### 测试1：余额充足
```typescript
// 用户有100积分，扣除80积分
await deductCredits(userId, 80, 'chat_usage');

// 预期结果：
// - 余额：20积分
// - 欠费：0积分
// - 无异常
```

### 测试2：余额不足
```typescript
// 用户有50积分，扣除100积分
try {
    await deductCredits(userId, 100, 'chat_usage');
} catch (error) {
    // 预期结果：
    // - 余额：0积分（已扣除50积分）
    // - 欠费：50积分（仅不足部分）
    // - 抛出 InsufficientCreditsError(100, 50)
}
```

### 测试3：余额为0
```typescript
// 用户有0积分，扣除100积分
try {
    await deductCredits(userId, 100, 'chat_usage');
} catch (error) {
    // 预期结果：
    // - 余额：0积分（无变化）
    // - 欠费：100积分（全额）
    // - 抛出 InsufficientCreditsError(100, 0)
}
```

### 测试4：多个套餐部分扣除
```typescript
// 用户有3个套餐：30积分 + 20积分 + 10积分 = 60积分
// 扣除100积分
try {
    await deductCredits(userId, 100, 'chat_usage');
} catch (error) {
    // 预期结果：
    // - 套餐1：0积分（扣除30）
    // - 套餐2：0积分（扣除20）
    // - 套餐3：0积分（扣除10）
    // - 总余额：0积分
    // - 欠费：40积分（仅不足部分）
    // - 交易记录：3条（分别记录每个套餐的扣除）
}
```

---

## 总结

### 修正前的问题
❌ 余额不足时，现有余额未被扣除
❌ 欠费金额不准确（记录全额而非不足部分）
❌ 用户的现有积分被浪费

### 修正后的优势
✅ 先扣除所有可用余额
✅ 只对不足部分记录欠费
✅ 充分利用用户现有积分
✅ 欠费金额更准确
✅ 交易记录完整
✅ 更好的用户体验

---

**更新日期**: 2026-02-06
**版本**: v1.1.0
