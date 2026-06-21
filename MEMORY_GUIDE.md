# 🧠 长期记忆功能 — 完整实施指南

> **答辩演示用** — 三大场景全覆盖

---

## ✅ 已完成的功能清单

### 场景一：AI 驱动的记忆提取（替代正则匹配）

**问题**：原来靠正则表达式提取记忆（`/对(.+?)过敏/i`），只能覆盖固定句式，漏抓率高。

**解决方案**：每次用户发送消息后，后端把消息丢给智谱 AI (glm-4-flash)，让它返回结构化 JSON 记忆。

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `src/lib/chatMemory.ts` | 新增 `extractMemoriesWithAI()` 函数，支持 7 种记忆类型 |
| `src/app/api/chat/route.ts` | 消息保存处改为调用 AI 提取 + 正则降级 |

**记忆类型**：
```
🔴 allergy  - 过敏/不耐受（"九万吃芒果起红疹" → 对芒果过敏）
⚡ fear     - 恐惧/害怕（"打雷时吓得发抖" → 怕打雷声）
🎾 behavior - 行为习惯（"每天晚上8点遛狗45分钟" → 遛狗规律）  
📊 baseline - 行为基准线（系统自动计算平均值）
🏥 health   - 健康状况
💡 preference- 偏好
📝 other   - 其他
```

---

### 场景二：天气联动恐惧记忆推送

**触发流程**：
1. 用户说 "九万特别怕打雷" → AI 提取为 `fear` 类型记忆存入数据库
2. 系统每天检查天气时发现**雷暴预警**
3. 自动查询该用户的 `fear` 类型记忆
4. 找到 "怕打雷" 记忆 → 发送**个性化 PWA 推送**：
   > ⛈️ 雷暴预警！你的毛孩子可能需要你
   > 九万害怕打雷声；害怕鞭炮/烟花声。气象台预警有雷暴/暴雨，请提前安抚宠物...

**无恐惧记忆时**：走通用雷暴提醒（和之前一样）

**涉及文件**：
| 文件 | 改动 |
|------|------|
| `src/store/AppContext.tsx` | `checkWeatherNotifications()` 新增恐惧记忆查询+个性化推送 |
| `src/app/api/memories/route.ts` | **新增** GET `/api/memories?type=fear` 接口 |

---

### 场景三：行为基线异常预警

**原理**：
1. 系统自动统计最近 14 天的运动/饮食/体重数据
2. 计算平均值作为「基线」
3. 最近 3 天数据与基线对比，偏离 >40% 触发异常预警
4. 异常信息写入 `baseline` 类型长期记忆 + 推送给用户

**检测指标**：
- 🏃 **运动量**：exercise 类型日程完成率（14天均值 vs 近3天）
- 🍽️ **进食次数**：diet_records 表记录数（7天均值 vs 近2天）
- ⚖️ **体重变化**：weight_records 表前后半段对比（>5% 显著）

**API**：`GET /api/baseline` 返回每只宠物的基线报告

**涉及文件**：
| 文件 | 说明 |
|------|------|
| `src/app/api/baseline/route.ts` | **新增** 基线检查 API |
| `src/lib/chatMemory.ts` | 新增 `updateBaselineMemory()` 函数 |

---

## 📂 数据库改动

### 执行 SQL（在 Supabase SQL Editor 或 MySQL 中运行）

```sql
-- 文件位置: database/add-memory-types.sql
ALTER TABLE user_long_term_memory 
  MODIFY COLUMN memory_type ENUM(
    'allergy', 'preference', 'health', 'behavior',
    'fear',       -- ← 新增
    'baseline',   -- ← 新增
    'other'
  ) NOT NULL;
```

### 可选：插入演示数据（答辩用）

```sql
INSERT INTO user_long_term_memory (user_id, pet_id, pet_name, memory_type, memory_content) VALUES
(1, 'pet_xxx', '九万', 'fear',     '害怕打雷声，打雷时会发抖躲在床底'),
(1, 'pet_xxx', '九万', 'fear',     '害怕鞭炮/烟花声'),
(1, 'pet_xxx', '九万', 'allergy',  '对芒果过敏，吃了会起红疹'),
(1, 'pet_xxx', '九万', 'behavior', '每天晚上8点遛狗，时长约45分钟'),
(1, 'pet_xxx', '九万', 'baseline', '每日运动量基线：平均1次/天');
```

---

## 🎨 前端展示 — 记忆档案页面

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/components/MemoryArchive.tsx` | 记忆档案组件（卡片网格+分类筛选+删除） |
| `src/app/(main)/memory/page.tsx` | 记忆档案页面路由 |

### 如何访问

方式一：直接访问 `/memory` 路由（需要添加侧边栏导航入口）

方式二：在宠物详情页嵌入 `<MemoryArchive />` 组件：

```tsx
import MemoryArchive from '@/components/MemoryArchive';

// 在宠物档案页中添加
<MemoryArchive />
```

### 组件功能

1. **顶部统计栏** — 7 种记忆类型的数量徽章，点击可筛选
2. **记忆卡片列表** — 每条记忆显示类型图标、宠物名、内容、时间
3. **行为基线面板** — 点击按钮加载基线分析报告（运动/进食/体重）
4. **删除功能** — 每条记忆右侧可单独删除
5. **空状态提示** — 引导用户通过对话积累记忆

---

## 🔬 答辩演示步骤

### 场景一演示（过敏主动规避）

```
第1步：对 AI 说 "九万昨天偷吃芒果，身上起了红疹"
      → 看到回复提到过敏 ✓
      → 打开 /memory 页面看到 🔴 过敏卡片 "对芒果过敏" ✓

第2步（过一会儿）：问 AI "今天给九万推荐个零食"
      → AI 回复："考虑到九万对芒果过敏，我推荐鸡肉干..." ✓ （主动规避！）
```

### 场景二演示（天气+恐惧）

```
第1步：对 AI 说 "九万特别怕打雷，一打雷就躲床底发抖"
      → 打开 /memory 看到 ⚡ 恐惧卡片 ✓

第2步：（等待或模拟）天气有雷暴
      → 收到 PWA 推送："⛈️ 雷暴预警！九万害怕打雷声..." ✓
      （如果当天没雷雨，可手动在浏览器执行测试：
       fetch('/api/push/send',{method:'POST',
         body:JSON.stringify({title:'⛈️ 测试-雷暴预警',
           body:'九万害怕打雷声...'})}))
```

### 场景三演示（行为基线）

```
第1步：打开 /memory 页面，点击 "查看行为基线分析"
      → 显示运动量/进食/体重的基线报告 ✓

第2步：如果有异常数据显示
      → 看到 ⚠️ 异常标记和偏离百分比 ✓
      
第3步（如果没有足够数据）：说明系统会自动计算14天数据
      → 可以在 /memory 页面看到 baseline 类型的记忆条目 ✓
```

---

## 📁 完整文件清单

### 修改的文件（5个）
1. `database/add-memory-types.sql` — **新增** 数据库迁移脚本
2. `src/lib/chatMemory.ts` — AI提取函数 + 新类型支持 + 基线计算
3. `src/app/api/chat/route.ts` — 接入AI记忆提取
4. `src/store/AppContext.tsx` — 天气+恐惧记忆联动推送
5. `src/components/ChatLayout.tsx` — （如有侧边栏需加 /memory 入口）

### 新增的文件（4个）
1. `src/app/api/memories/route.ts` — 记忆 CRUD API
2. `src/app/api/baseline/route.ts` — 行为基线检查 API
3. `src/components/MemoryArchive.tsx` — 记忆档案 UI 组件
4. `src/app/(main)/memory/page.tsx` — 记忆档案页面

---

## ⚙️ 启动前检查清单

- [ ] 在 Supabase SQL Editor 中执行 `add-memory-types.sql`
- [ ] （可选）插入演示数据让记忆页面不为空
- [ ] `npm run dev` 启动项目
- [ ] 浏览器打开 `http://localhost:3001/memory` 查看记忆档案
- [ ] 对 AI 说一句话测试记忆提取（如 "九万怕打雷"）
- [ ] 刷新记忆页面确认新记忆出现
