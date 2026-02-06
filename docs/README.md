# 文档目录

本目录包含项目的所有技术文档。

## 📚 文档列表

### 核心文档

1. **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)** - 状态管理完整文档
   - API 参考
   - 使用指南
   - 最佳实践
   - 常见问题
   - 569 行

2. **[MIGRATION_STATE_MANAGEMENT.md](./MIGRATION_STATE_MANAGEMENT.md)** - 状态管理迁移指南
   - 快速迁移检查清单
   - 详细迁移步骤
   - 代码示例
   - 自动化脚本
   - 常见问题

### 项目文档

3. **[../CHANGELOG.md](../CHANGELOG.md)** - 更新日志
   - 2026-02-06: 状态管理架构重构
   - 2026-02-05: 计费配置迁移到 TypeScript
   - 详细的变更记录和迁移指南

4. **[../CLAUDE.md](../CLAUDE.md)** - 项目概述
   - 技术栈
   - 项目结构
   - 开发指南
   - 环境变量配置

5. **[../README.md](../README.md)** - 项目说明
   - 快速开始
   - 功能特性
   - 部署指南

## 🎯 快速导航

### 我想...

#### 了解状态管理
→ 阅读 [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)

#### 迁移到新的状态管理
→ 阅读 [MIGRATION_STATE_MANAGEMENT.md](./MIGRATION_STATE_MANAGEMENT.md)

#### 查看最新变更
→ 阅读 [CHANGELOG.md](../CHANGELOG.md)

#### 了解项目结构
→ 阅读 [CLAUDE.md](../CLAUDE.md)

#### 开始开发
→ 阅读 [README.md](../README.md)

## 📖 文档结构

```
credits-starter-kit/
├── docs/                                    # 文档目录
│   ├── README.md                           # 本文件
│   ├── STATE_MANAGEMENT.md                 # 状态管理文档
│   └── MIGRATION_STATE_MANAGEMENT.md       # 迁移指南
├── CHANGELOG.md                            # 更新日志
├── CLAUDE.md                               # 项目概述
└── README.md                               # 项目说明
```

## 🔍 按主题查找

### 状态管理
- [状态管理完整文档](./STATE_MANAGEMENT.md)
- [迁移指南](./MIGRATION_STATE_MANAGEMENT.md)
- [CHANGELOG - 状态管理重构](../CHANGELOG.md#2026-02-06---状态管理架构重构)

### 积分系统
- [CLAUDE.md - Credits 管理](../CLAUDE.md#credits-管理)
- [CHANGELOG - 计费配置](../CHANGELOG.md#2026-02-05---重大架构优化)

### 认证系统
- [CLAUDE.md - Authentication Flow](../CLAUDE.md#authentication-flow)
- [STATE_MANAGEMENT.md - AuthState](./STATE_MANAGEMENT.md#authstate)

### API 端点
- [CLAUDE.md - API Endpoints](../CLAUDE.md#api-endpoints)

### 数据库
- [CLAUDE.md - Database Schema](../CLAUDE.md#database-schema)

## 📝 文档贡献

### 添加新文档

1. 在 `docs/` 目录创建新的 `.md` 文件
2. 更新本 README 添加链接
3. 在 CHANGELOG 中记录变更

### 更新现有文档

1. 直接编辑对应的 `.md` 文件
2. 在 CHANGELOG 中记录变更
3. 更新文档版本号（如果需要）

### 文档规范

- 使用 Markdown 格式
- 包含清晰的标题层次
- 提供代码示例
- 添加目录（长文档）
- 使用表格和图表（如果需要）

## 🎨 文档风格指南

### 标题

```markdown
# H1 - 文档标题（每个文档只有一个）
## H2 - 主要章节
### H3 - 子章节
#### H4 - 详细内容
```

### 代码块

````markdown
```typescript
// TypeScript 代码
const example = "示例";
```

```svelte
<!-- Svelte 组件 -->
<script>
  let count = 0;
</script>
```
````

### 提示框

```markdown
✅ 正确做法
❌ 错误做法
⚠️ 注意事项
💡 提示
📝 说明
```

### 链接

```markdown
[相对链接](./OTHER_DOC.md)
[绝对链接](https://example.com)
[锚点链接](#section-name)
```

## 📊 文档统计

| 文档 | 行数 | 主题 |
|------|------|------|
| STATE_MANAGEMENT.md | 569 | 状态管理 |
| MIGRATION_STATE_MANAGEMENT.md | ~400 | 迁移指南 |
| CHANGELOG.md | 798 | 更新日志 |
| CLAUDE.md | ~300 | 项目概述 |
| README.md | ~200 | 项目说明 |

**总计**: ~2,267 行文档

## 🔄 最近更新

### 2026-02-06
- ✅ 新增 `STATE_MANAGEMENT.md` - 完整的状态管理文档
- ✅ 新增 `MIGRATION_STATE_MANAGEMENT.md` - 迁移指南
- ✅ 更新 `CHANGELOG.md` - 添加状态管理重构记录
- ✅ 新增 `docs/README.md` - 本文件

### 2026-02-05
- ✅ 更新 `CHANGELOG.md` - 添加计费配置迁移记录
- ✅ 更新 `CLAUDE.md` - 更新项目结构说明

## 🚀 下一步

### 计划中的文档

- [ ] API 端点详细文档
- [ ] 数据库设计文档
- [ ] 部署指南
- [ ] 性能优化指南
- [ ] 安全最佳实践
- [ ] 测试指南

### 改进建议

如果你有文档改进建议，请：
1. 提交 Issue
2. 创建 Pull Request
3. 联系团队

## 📞 获取帮助

如果你在阅读文档时遇到问题：

1. 检查 [常见问题](./STATE_MANAGEMENT.md#常见问题)
2. 搜索 [CHANGELOG](../CHANGELOG.md)
3. 查看 [项目概述](../CLAUDE.md)
4. 提交 Issue

---

**文档维护**: Claude Code  
**最后更新**: 2026-02-06  
**文档版本**: 1.0.0
