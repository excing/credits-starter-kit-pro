# 积分扣费系统 - 完整测试用例

## 测试环境准备

### 1. 创建测试用户
```typescript
const testUserId = 'test-user-001';
```

### 2. 创建测试套餐
```typescript
// 套餐1: 100积分，30天有效期
const package1 = await db.insert(creditPackage).values({
    id: 'pkg-test-100',
    name: '测试套餐100',
    credits: 100,
    validityDays: 30,
    packageType: 'test',
    isActive: true
});

// 套餐2: 50积分，30天有效期
const package2 = await db.insert(creditPackage).values({
    id: 'pkg-test-50',
    name: '测试套餐50',
    credits: 50,
    validityDays: 30,
    packageType: 'test',
    isActive: true
});
```

---

## 测试用例

### 测试组1: 余额充足场景

#### 测试1.1: 完全扣除（余额充足）
```typescript
describe('完全扣除 - 余额充足', () => {
    beforeEach(async () => {
        // 给用户发放100积分
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');
    });

    it('应该成功扣除80积分，剩余20积分', async () => {
        // 执行扣费
        await deductCredits(testUserId, 80, 'chat_usage', {
            model: 'gpt-4',
            tokens: 1000
        });

        // 验证余额
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(20);

        // 验证无欠费
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(0);

        // 验证交易记录
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const deductTransaction = transactions.find(t => t.amount < 0);
        expect(deductTransaction.amount).toBe(-80);
        expect(deductTransaction.type).toBe('chat_usage');
    });
});
```

#### 测试1.2: 完全扣除（刚好用完）
```typescript
describe('完全扣除 - 刚好用完', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');
    });

    it('应该成功扣除100积分，余额为0', async () => {
        await deductCredits(testUserId, 100, 'chat_usage');

        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(0);
    });
});
```

---

### 测试组2: 余额不足场景

#### 测试2.1: 部分扣除（余额不足）
```typescript
describe('部分扣除 - 余额不足', () => {
    beforeEach(async () => {
        // 给用户发放50积分
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');
    });

    it('应该扣除50积分，记录50积分欠费', async () => {
        try {
            await deductCredits(testUserId, 100, 'chat_usage');
            fail('应该抛出 InsufficientCreditsError');
        } catch (error) {
            expect(error).toBeInstanceOf(InsufficientCreditsError);
            expect(error.message).toContain('需要: 100');
            expect(error.message).toContain('可用: 50');
        }

        // 验证余额已扣除
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(50); // 仅不足部分
        expect(debts[0].operationType).toBe('chat_usage');
        expect(debts[0].isSettled).toBe(false);

        // 验证交易记录（已扣除的50积分）
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const deductTransaction = transactions.find(t => t.amount < 0);
        expect(deductTransaction.amount).toBe(-50);
    });
});
```

#### 测试2.2: 余额为0（全额欠费）
```typescript
describe('余额为0 - 全额欠费', () => {
    it('应该记录100积分欠费，余额保持0', async () => {
        try {
            await deductCredits(testUserId, 100, 'chat_usage');
            fail('应该抛出 InsufficientCreditsError');
        } catch (error) {
            expect(error).toBeInstanceOf(InsufficientCreditsError);
        }

        // 验证余额仍为0
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(100); // 全额欠费

        // 验证无交易记录（因为没有可扣除的余额）
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const deductTransactions = transactions.filter(t => t.amount < 0);
        expect(deductTransactions.length).toBe(0);
    });
});
```

---

### 测试组3: 多套餐扣除场景

#### 测试3.1: 跨多个套餐扣除（余额充足）
```typescript
describe('跨多个套餐扣除 - 余额充足', () => {
    beforeEach(async () => {
        // 发放3个套餐：30 + 20 + 50 = 100积分
        await grantPackageToUser(testUserId, 'pkg-test-30', 'admin');
        await grantPackageToUser(testUserId, 'pkg-test-20', 'admin');
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');
    });

    it('应该按过期时间顺序扣除，总计80积分', async () => {
        await deductCredits(testUserId, 80, 'chat_usage');

        // 验证余额
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(20);

        // 验证交易记录（应该有3条扣除记录）
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const deductTransactions = transactions.filter(t => t.amount < 0);
        expect(deductTransactions.length).toBe(3);

        // 验证扣除顺序（按过期时间）
        expect(deductTransactions[0].amount).toBe(-30); // 第1个套餐全部扣除
        expect(deductTransactions[1].amount).toBe(-20); // 第2个套餐全部扣除
        expect(deductTransactions[2].amount).toBe(-30); // 第3个套餐部分扣除
    });
});
```

#### 测试3.2: 跨多个套餐扣除（余额不足）
```typescript
describe('跨多个套餐扣除 - 余额不足', () => {
    beforeEach(async () => {
        // 发放3个套餐：30 + 20 + 10 = 60积分
        await grantPackageToUser(testUserId, 'pkg-test-30', 'admin');
        await grantPackageToUser(testUserId, 'pkg-test-20', 'admin');
        await grantPackageToUser(testUserId, 'pkg-test-10', 'admin');
    });

    it('应该扣除所有60积分，记录40积分欠费', async () => {
        try {
            await deductCredits(testUserId, 100, 'chat_usage');
            fail('应该抛出 InsufficientCreditsError');
        } catch (error) {
            expect(error).toBeInstanceOf(InsufficientCreditsError);
        }

        // 验证余额已全部扣除
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(40); // 仅不足部分

        // 验证交易记录（应该有3条扣除记录）
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const deductTransactions = transactions.filter(t => t.amount < 0);
        expect(deductTransactions.length).toBe(3);
        expect(deductTransactions[0].amount).toBe(-30);
        expect(deductTransactions[1].amount).toBe(-20);
        expect(deductTransactions[2].amount).toBe(-10);
    });
});
```

---

### 测试组4: 重试机制测试

#### 测试4.1: 临时故障后重试成功
```typescript
describe('重试机制 - 临时故障后成功', () => {
    let attemptCount = 0;

    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');
        attemptCount = 0;

        // Mock数据库操作，前2次失败，第3次成功
        jest.spyOn(db, 'transaction').mockImplementation(async (callback) => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error('Database connection error');
            }
            return callback(db);
        });
    });

    it('应该在第3次尝试时成功扣除', async () => {
        const startTime = Date.now();

        await deductCredits(testUserId, 50, 'chat_usage');

        const endTime = Date.now();
        const duration = endTime - startTime;

        // 验证重试时间（5秒 + 10秒 = 15秒左右）
        expect(duration).toBeGreaterThan(15000);
        expect(duration).toBeLessThan(16000);

        // 验证余额
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(50);

        // 验证无欠费
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(0);
    });
});
```

#### 测试4.2: 所有重试失败后记录欠费
```typescript
describe('重试机制 - 所有重试失败', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');

        // Mock数据库操作，所有尝试都失败
        jest.spyOn(db, 'transaction').mockRejectedValue(
            new Error('Database connection error')
        );
    });

    it('应该在4次尝试后记录欠费', async () => {
        try {
            await deductCredits(testUserId, 50, 'chat_usage');
            fail('应该抛出错误');
        } catch (error) {
            expect(error.message).toBe('Database connection error');
        }

        // 验证欠费记录（全额）
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(50);
    });
});
```

#### 测试4.3: 余额不足不重试
```typescript
describe('重试机制 - 余额不足不重试', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');
    });

    it('应该立即抛出错误，不重试', async () => {
        const startTime = Date.now();

        try {
            await deductCredits(testUserId, 100, 'chat_usage');
            fail('应该抛出 InsufficientCreditsError');
        } catch (error) {
            expect(error).toBeInstanceOf(InsufficientCreditsError);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // 验证没有重试（耗时应该很短）
        expect(duration).toBeLessThan(1000);

        // 验证余额已扣除
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(50);
    });
});
```

---

### 测试组5: 欠费结算测试

#### 测试5.1: 充值后完全结清欠费
```typescript
describe('欠费结算 - 完全结清', () => {
    beforeEach(async () => {
        // 创建欠费：用户有50积分，扣除100积分
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');
        try {
            await deductCredits(testUserId, 100, 'chat_usage');
        } catch (error) {
            // 预期会失败
        }
    });

    it('应该在充值后自动结清欠费', async () => {
        // 验证初始状态
        let balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        let debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(50);
        expect(debts[0].isSettled).toBe(false);

        // 用户充值100积分
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');

        // 验证欠费已结清
        debts = await getUserDebts(testUserId);
        const settledDebt = debts.find(d => d.isSettled);
        expect(settledDebt).toBeDefined();
        expect(settledDebt.amount).toBe(50);

        // 验证余额（100 - 50 = 50）
        balance = await getUserBalance(testUserId);
        expect(balance).toBe(50);

        // 验证交易记录（应该有结算记录）
        const transactions = await getUserTransactions(testUserId, 10, 0);
        const settlementTransaction = transactions.find(
            t => t.description.includes('结算欠费')
        );
        expect(settlementTransaction).toBeDefined();
        expect(settlementTransaction.amount).toBe(-50);
    });
});
```

#### 测试5.2: 充值后部分结清欠费
```typescript
describe('欠费结算 - 部分结清', () => {
    beforeEach(async () => {
        // 创建欠费：用户有0积分，扣除100积分
        try {
            await deductCredits(testUserId, 100, 'chat_usage');
        } catch (error) {
            // 预期会失败
        }
    });

    it('应该在充值后部分结清欠费', async () => {
        // 验证初始欠费
        let debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(100);

        // 用户充值50积分（不足以完全结清）
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');

        // 验证欠费部分结清
        debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(1);
        expect(debts[0].amount).toBe(50); // 剩余50积分欠费
        expect(debts[0].isSettled).toBe(false);

        // 验证余额为0（全部用于结算欠费）
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);
    });
});
```

#### 测试5.3: 多笔欠费按顺序结算
```typescript
describe('欠费结算 - 多笔欠费', () => {
    beforeEach(async () => {
        // 创建3笔欠费
        try {
            await deductCredits(testUserId, 30, 'chat_usage');
        } catch (error) {}

        try {
            await deductCredits(testUserId, 20, 'image_generation');
        } catch (error) {}

        try {
            await deductCredits(testUserId, 50, 'file_processing');
        } catch (error) {}
    });

    it('应该按创建时间顺序结算欠费', async () => {
        // 验证初始欠费
        let debts = await getUserDebts(testUserId);
        expect(debts.length).toBe(3);
        expect(debts[0].amount).toBe(30);
        expect(debts[1].amount).toBe(20);
        expect(debts[2].amount).toBe(50);

        // 用户充值60积分
        await grantPackageToUser(testUserId, 'pkg-test-60', 'admin');

        // 验证结算结果
        debts = await getUserDebts(testUserId, true); // 包含已结清的

        // 第1笔欠费应该完全结清
        expect(debts[0].isSettled).toBe(true);
        expect(debts[0].amount).toBe(30);

        // 第2笔欠费应该完全结清
        expect(debts[1].isSettled).toBe(true);
        expect(debts[1].amount).toBe(20);

        // 第3笔欠费应该部分结清
        expect(debts[2].isSettled).toBe(false);
        expect(debts[2].amount).toBe(40); // 50 - 10 = 40

        // 验证余额为0
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);
    });
});
```

---

### 测试组6: 并发测试

#### 测试6.1: 并发扣费（事务隔离）
```typescript
describe('并发扣费 - 事务隔离', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');
    });

    it('应该正确处理并发扣费请求', async () => {
        // 同时发起10个扣费请求，每个10积分
        const promises = Array(10).fill(null).map(() =>
            deductCredits(testUserId, 10, 'chat_usage')
        );

        await Promise.all(promises);

        // 验证余额（100 - 100 = 0）
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证交易记录（应该有10条）
        const transactions = await getUserTransactions(testUserId, 20, 0);
        const deductTransactions = transactions.filter(t => t.amount < 0);
        expect(deductTransactions.length).toBe(10);
    });
});
```

#### 测试6.2: 并发扣费（余额不足）
```typescript
describe('并发扣费 - 余额不足', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-50', 'admin');
    });

    it('应该正确处理并发扣费和欠费', async () => {
        // 同时发起10个扣费请求，每个10积分
        const promises = Array(10).fill(null).map(() =>
            deductCredits(testUserId, 10, 'chat_usage').catch(e => e)
        );

        const results = await Promise.all(promises);

        // 验证余额为0
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证有欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts.length).toBeGreaterThan(0);

        // 验证总欠费金额（应该是50积分）
        const totalDebt = await getUserTotalDebt(testUserId);
        expect(totalDebt).toBe(50);
    });
});
```

---

### 测试组7: 边界条件测试

#### 测试7.1: 扣除0积分
```typescript
describe('边界条件 - 扣除0积分', () => {
    it('应该抛出错误', async () => {
        try {
            await deductCredits(testUserId, 0, 'chat_usage');
            fail('应该抛出错误');
        } catch (error) {
            expect(error.message).toBe('扣除金额必须大于0');
        }
    });
});
```

#### 测试7.2: 扣除负数积分
```typescript
describe('边界条件 - 扣除负数积分', () => {
    it('应该抛出错误', async () => {
        try {
            await deductCredits(testUserId, -10, 'chat_usage');
            fail('应该抛出错误');
        } catch (error) {
            expect(error.message).toBe('扣除金额必须大于0');
        }
    });
});
```

#### 测试7.3: 扣除极大金额
```typescript
describe('边界条件 - 扣除极大金额', () => {
    beforeEach(async () => {
        await grantPackageToUser(testUserId, 'pkg-test-100', 'admin');
    });

    it('应该正确处理极大金额的欠费', async () => {
        try {
            await deductCredits(testUserId, 1000000, 'chat_usage');
            fail('应该抛出 InsufficientCreditsError');
        } catch (error) {
            expect(error).toBeInstanceOf(InsufficientCreditsError);
        }

        // 验证余额已扣除
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(0);

        // 验证欠费记录
        const debts = await getUserDebts(testUserId);
        expect(debts[0].amount).toBe(999900); // 1000000 - 100
    });
});
```

---

## 性能测试

### 测试8.1: 大量套餐扣除性能
```typescript
describe('性能测试 - 大量套餐', () => {
    beforeEach(async () => {
        // 创建100个套餐，每个10积分
        for (let i = 0; i < 100; i++) {
            await grantPackageToUser(testUserId, 'pkg-test-10', 'admin');
        }
    });

    it('应该在合理时间内完成扣除', async () => {
        const startTime = Date.now();

        await deductCredits(testUserId, 500, 'chat_usage');

        const endTime = Date.now();
        const duration = endTime - startTime;

        // 验证耗时（应该在5秒内完成）
        expect(duration).toBeLessThan(5000);

        // 验证余额
        const balance = await getUserBalance(testUserId);
        expect(balance).toBe(500); // 1000 - 500
    });
});
```

---

## 测试总结

### 测试覆盖率
- ✅ 余额充足场景
- ✅ 余额不足场景
- ✅ 多套餐扣除场景
- ✅ 重试机制测试
- ✅ 欠费结算测试
- ✅ 并发测试
- ✅ 边界条件测试
- ✅ 性能测试

### 关键验证点
- ✅ 余额正确扣除
- ✅ 欠费金额准确（仅不足部分）
- ✅ 交易记录完整
- ✅ 重试机制正常工作
- ✅ 欠费自动结算
- ✅ 事务隔离性
- ✅ 边界条件处理

---

**测试框架**: Jest / Vitest
**测试日期**: 2026-02-06
**版本**: v1.1.0
