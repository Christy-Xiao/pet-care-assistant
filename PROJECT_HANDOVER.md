# 🐾 毛绒管家（Pet Care Assistant）— 项目交接文档

> **更新日期**: 2026-06-22  
> **GitHub**: https://github.com/Christy-Xiao/pet-care-assistant  
> **技术栈**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase PostgreSQL  
> **运行环境**: Node.js 18+ / Windows PowerShell

---

## 一、项目概述

这是一个**宠物护理智能助手 Web 应用**，主要功能包括：

| 功能模块 | 页面路径 | 状态 |
|----------|---------|------|
| 首页仪表盘 | `/` | ✅ 完成 |
| 宠物管理 | `/pets` | ✅ 完成 |
| 健康监测 | `/health` | ✅ 完成 |
| 健康记录 | `/health-monitor` | ✅ 完成 |
| AI 智能聊天 | `/chat` | ⚠️ 聊天可用，**历史持久化待验证** |
| 绿地地图 | `/map` | ✅ 完成 |
| 护理日程 | `/schedule` | ✅ 完成 |
| 每周报告 | `/weekly-report` | ✅ 完成 |
| 设置 | `/settings` | ✅ 完成 |
| 登录/注册 | `/login` | ✅ 完成 |

### 底部导航栏
首页 → 宠物 → 健康 → **周报** → **日程** → AI（6个Tab，fixed定位）

---

## 二、外部服务配置（⚠️ 接手必看）

项目依赖以下4个外部服务。**换账号后必须重新配置 `.env.local`**

### 2.1 Supabase 数据库（PostgreSQL）

| 项目 | 值 |
|------|-----|
| 项目URL | `https://rjmtckzejaqhodgjuyrl.supabase.co` |
| 用途 | 所有业务数据存储（用户、宠物、健康记录等） |
| 连接方式 | REST API via `@supabase/supabase-js` |

**`.env.local` 需要的变量：**
```
NEXT_PUBLIC_SUPABASE_URL=https://你的新项目.supabase.co
SUPABASE_SERVICE_KEY=你的service_role_key
```

**已建表清单（需在新项目中执行建表SQL）：**

| 表名 | 文件位置 | 说明 | 是否已建 |
|------|---------|------|---------|
| `users` | 自动生成 | 用户账号表 | ✅ 已有数据 |
| `pets` | `database/schema.sql` | 宠物档案 | ✅ 已有数据 |
| `care_schedules` | `database/schema.sql` | 护理日程 | ✅ 已有数据 |
| `health_records` | `database/schema.sql` | 健康记录 | ✅ |
| `notifications` | `database/schema.sql` | 通知 | ✅ |
| `medical_records` | `database/schema.sql` | 病例记录 | ✅ |
| `medication_reminders` | `database/schema.sql` | 用药提醒 | ✅ |
| `park_locations` | `database/schema.sql` | 绿地位置 | ✅ |
| `chat_conversations` | `database/chat-conversations.sql` | AI对话历史 | ⚠️ **已建但空表(0条)** |
| `push_subscriptions` | `database/push-subscriptions.sql` | PWA推送订阅 | ❓ 待确认 |

**⚠️ 重要：schema.sql 是 MySQL 语法！新建 Supabase 必须转 PG：**

```sql
-- ❌ MySQL写法（不能用）：
ENUM('dog', 'cat') 
ON UPDATE CURRENT_TIMESTAMP
COMMENT '说明'

-- ✅ PostgreSQL 写法：
TEXT CHECK (species IN ('dog', 'cat'))
-- 用触发器替代 ON UPDATE（参考 chat-conversations.sql）
COMMENT ON COLUMN table.column IS '说明';
JSON → JSONB
```

### 2.2 智谱AI（ZhipuAI）大模型

| 项目 | 说明 |
|------|------|
| 用途 | AI 聊天对话、天气建议、宠物咨询 |
| SDK | `zhipuai` npm 包 |
| 当前Key | `8c8ffc159d0b4c378f36e45ab35ffe6a.rx5oSymII4rCqS38`（**可能已过期/额度用尽**） |

**`.env.local` 变量：**
```
ZHIPUAI_API_KEY=你的新key
```
**获取方式**: https://open.bigmodel.cn/ → 注册 → 创建API Key → 选 GLM-4

### 2.3 高德地图 API

| 项目 | 说明 |
|------|------|
| 用途 | 附近绿地搜索、定位 |
| 当前Key | `50c608acfc894c6dec9af287947d7faa` |

```
NEXT_PUBLIC_AMAP_KEY=你的高德key
```
**获取方式**: https://console.amap.com/ → 控制台 → 应用管理 → 创建Key

### 2.4 VAPID 推送通知（PWA Web Push）

| 用途 | 天气推送、日程提醒等系统级通知 |
|------|------|

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=公钥
VAPID_PRIVATE_KEY=私钥
```
**生成方式**: `npx web-push generate-vapid-keys` （可选，不用推送可跳过）

---

## 三、数据库连接架构

```
┌─────────────┐    @supabase/supabase-js     ┌──────────────┐
│  Next.js     │ ──────────────────────────→   │  Supabase     │
│  API Routes  │      (REST API, 无连接池)      │  PostgreSQL   │
└─────────────┘                               └──────────────┘
        │                                             │
        │  src/lib/db.ts 封装了 query/insert/execute   │
        │  兼容层，自动将 SQL 转为 Supabase 调用       │
        └─────────────────────────────────────────────┘
```

**关键文件**: `src/lib/db.ts`
- 导出原始 `supabase` client
- 提供 `query<T>()`, `insert()`, `execute()` 兼容函数
- 内置SQL解析器，将 SELECT/INSERT/UPDATE/DELETE 自动转 Supabase 方法
- ⚠️ 不支持复杂SQL，复杂操作直接用 supabase client

---

## 四、换新环境启动步骤

### 第一步：克隆 + 安装依赖
```bash
git clone https://github.com/Christy-Xiao/pet-care-assistant.git
cd pet-care-assistant
npm install
```

### 第二步：创建 Supabase 项目并建表
1. https://supabase.com 注册/登录 → 新建项目
2. 进入 **SQL Editor**，依次执行：

```sql
-- ① users 表（登录必需）
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ② pets 表（PG语法）
CREATE TABLE IF NOT EXISTS pets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    species TEXT DEFAULT 'dog',
    breed VARCHAR(100),
    gender TEXT DEFAULT 'unknown',
    date_of_birth DATE,
    age INT,
    weight DECIMAL(5, 2),
    avatar TEXT,
    allergies TEXT,
    medical_history TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- 其他表同理...或直接复制 database/chat-conversations.sql 和 push-subscriptions.sql 的风格来写
```

### 第三步：创建 `.env.local`
```env
# 高德地图
NEXT_PUBLIC_AMAP_KEY=你的高德key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...你的service_role_key

# 智谱AI
ZHIPUAI_API_KEY=你的智谱key

# PWA推送（可选）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=公钥
VAPID_PRIVATE_KEY=私钥
```

### 第四步：启动
```bash
npm run dev
# 浏览器打开 http://localhost:3000
```

---

## 五、API 路由总览（28个端点）

| 路径 | 方法 | 功能 | 对应表 |
|------|------|------|--------|
| `/api/auth/login` | POST | 登录 | users |
| `/api/auth/register` | POST | 注册 | users |
| `/api/auth/session` | GET | 检查session | - |
| `/api/auth/logout` | POST | 登出 | - |
| `/api/pets` | GET/POST | 宠物CRUD | pets |
| `/api/chat` | POST | AI对话（调智谱AI） | - |
| `/api/chat-sessions` | GET/DELETE | 会话列表 | chat_conversations |
| `/api/conversations` | GET/POST/DELETE | 对话CRUD | chat_conversations |
| `/api/weather/tips` | GET | AI天气建议 | - |
| `/api/push/send` | POST | 发送推送 | push_subscriptions |
| `/api/push/subscribe` | POST | 订阅推送 | push_subscriptions |
| `/api/schedules` | GET/POST | 日程CRUD | care_schedules |
| `/api/health-records` | GET/POST | 健康记录 | health_records |
| `/api/diet-records` | GET/POST | 饮食记录 | - |
| `/api/exercise-records` | GET/POST | 运动记录 | - |
| `/api/weight-records` | GET/POST | 体重记录 | - |
| `/api/bathroom-records` | GET/POST | 如厕记录 | - |
| `/api/medical-records` | GET/POST | 病例记录 | medical_records |
| `/api/medication-reminders` | GET/POST | 用药提醒 | medication_reminders |
| `/api/parks` | GET | 绿地列表 | park_locations |
| `/api/voice` | POST | 语音识别 | - |
| `/api/init-db` | POST | 初始化数据库 | 多表 |

---

## 六、已知问题 & 待修复

### 🔴 P0 — 必须验证/修复

| # | 问题 | 根因 | 最新修复 | 状态 |
|---|------|------|---------|------|
| 1 | **AI聊天历史不保存到数据库** | AuthContext login() 从未写入 `localStorage.user`，导致 `saveConversations()` 取不到 userId 直接 return | commit `5dfbb8e`: AuthContext 在 login/register/session恢复时都写入 localStorage | **已修代码，待验证** |
| 2 | **侧边栏历史记录显示为空** | ChatLayout.fetchSessions() 调 `/api/chat-sessions` 不传 userId，fallback 到 `'default_user'` 查不到真实用户数据 | commit `554e1cf`: ChatLayout 加了 userId prop，fetchSessions 带 `?userId=` 参数 | **已修代码，待验证** |
| 3 | **智谱AI token 可能耗尽** | 当前 key 额度未知，频繁测试可能用完 | — | **需要换新 key 或充值** |

**验证方法（按顺序）：**
1. 确保 `.env.local` 中 `ZHIPUAI_API_KEY` 有效
2. 打开 http://localhost:3000/login → **重新登录一次**（触发新的 localStorage 写入）
3. 进 AI 聊天页面 → 发一条消息
4. 点左上角 ☰ 菜单按钮 → 看历史记录列表是否出现该对话
5. 刷新页面 → 对话是否还在

### 🟡 P1 — 应该修

| # | 问题 | 描述 |
|---|------|------|
| 4 | 手机端Chat页面滚动困难 | 页面比例问题，上方内容被遮挡，网页端也滑不动 |
| 5 | schema.sql 全是MySQL语法 | 新建Supabase项目不能直接用，需要手动转PostgreSQL |

### 🟢 P2 — 锦上添花

| # | 问题 | 描述 |
|---|------|------|
| 6 | 错误提示不友好 | 部分500错误直接抛给用户 |
| 7 | 未启用RLS | Supabase 行级安全策略未开启，全靠 service key |

---

## 七、核心代码结构

```
src/
├── app/
│   ├── (main)/                  # 主布局组（需登录）
│   │   ├── page.tsx             # 首页仪表盘
│   │   ├── chat/page.tsx        # ⚠️ AI聊天（4427行！最大文件）
│   │   ├── pets/                # 宠物管理
│   │   ├── health/              # 健康主页
│   │   ├── health-monitor/      # 健康记录详情
│   │   ├── schedule/            # 护理日程
│   │   ├── weekly-report/       # 每周报告
│   │   ├── map/                 # 地图
│   │   └── settings/            # 设置
│   ├── api/                     # 后端28个API路由
│   └── login/                   # 登录注册
├── components/
│   ├── ChatLayout.tsx           # 聊天布局+历史侧边栏
│   ├── BottomTabBar.tsx         # 底部导航（6个tab, fixed）
│   ├── AppLayout.tsx            # 全局布局
│   └── WeatherTipWidget.tsx     # 天气提示横幅
├── store/
│   ├── AppContext.tsx            # 全局状态（宠物/日程/通知）
│   └── AuthContext.tsx           # 认证状态（⭐ 关键文件）
├── lib/
│   └── db.ts                    # Supabase封装层
├── services/
│   ├── zhipu-ai.ts              # 智谱AI接口
│   └── weather.ts               # 天气服务
└── hooks/
    ├── useVoiceAssistant.ts     # 语音助手
    └── useNotifications.ts      # 通知hook
```

---

## 八、认证 & 数据流（关键！理解这个才能调试）

```
【登录】
login(email, password)
  → POST /api/auth/login
  → 查 users 表验证
  → setUser(data.user)            ← React state
  → localStorage.setItem('user', JSON.stringify(data.user))  ← ⚠️ 这步之前缺失！

【页面刷新】
useEffect → GET /api/auth/session
  → 有session? setUser(data.user) + localStorage.setItem('user', ...)
  → 无session? 跳转 /login

【聊天保存】
saveConversations(conversations)
  → 先存 localStorage: chatConversations
  → const storedUser = localStorage.getItem('user')
  → JSON.parse → user.id
  → POST /api/conversations { userId, conversationId, title, messages }
  → Supabase upsert 到 chat_conversations 表

【聊天加载】
loadConversationsFromServer(userId)
  → GET /api/conversations?userId=xxx
  → 查 chat_conversations WHERE user_id = xxx
  → 返回 conversations[] → setConversations()

【历史列表】
ChatLayout.fetchSessions()
  → GET /api/chat-sessions?userId=xxx
  → 查 chat_conversations WHERE user_id = xxx
  → 返回 sessions[] → 显示在侧边栏
```

**断链点**：如果第②步 `localStorage.setItem('user', ...)` 缺失，后面整个链条全部断裂。

---

## 九、Git 近期提交记录

| Commit | 内容 | 日期 |
|--------|------|------|
| `65cdd8d` | 快捷按钮改每周报告/护理日程 | - |
| `3477206` | 底部导航栏改周报/日程 + fixed定位 | - |
| `709af7c` | 麦克风移到输入栏左侧固定 | - |
| `d52723d` | 聊天记录数据库持久化功能 | - |
| `6a4b9d9` | 修复新对话按钮 + chat-sessions 500错误 | - |
| `554e1cf` | ChatLayout传userId修复历史为空 | 2026-06-22 |
| `5dfbb8e` | AuthContext写入localStorage.user修复保存失败 | 2026-06-22 |

---

## 十、快速排查命令

```powershell
# 启动
npm run dev

# 测试数据库连接
node -e "const{c}=require('@supabase/supabase-js');s=c(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);s.from('chat_conversations').select('*').then(r=>console.log(r.data?.length||0,'条'))"

# 检查API
curl http://localhost:3000/api/auth/session
curl "http://localhost:3000/api/chat-sessions?userId=1"

# 构建
npm run build && npm start
```

---

## 十一、注意事项

1. **不要直接改 `schema.sql`** — 它是MySQL语法的遗留文件。新建表请参照 `chat-conversations.sql` 的 PG 写法
2. **`chat/page.tsx` 有4427行** — 最大单文件，改的时候务必精准定位
3. **Supabase RLS 未启用** — 所有操作用 service key，生产环境应开启
4. **智谱AI有免费额度限制** — 频繁测试注意控制调用次数
5. **可直接部署到Vercel** — 零配置，只需设置环境变量即可

---

*文档生成时间: 2026-06-22 01:29 | 由 CodeBuddy AI 助手生成*
