# 宠物护理助手（Pet Care Assistant）— 项目完整技术资料

> 本文档供其他 AI 阅读以理解项目全貌，无需逐文件阅读源码。

---

## 一、项目概览

| 项目属性 | 详情 |
|---------|------|
| **项目名称** | 宠物护理助手 (Pet Care Assistant) |
| **项目定位** | 智能宠物健康管家 — 基于 AI 的宠物护理全能助手 |
| **技术栈** | Next.js 14 + TypeScript + Tailwind CSS + MySQL + 智谱AI(GLM-4/GLM-4V) |
| **运行端口** | 3002 |
| **数据库** | MySQL (`pet_care_assistant`)，连接池配置在 `src/lib/db.ts` |
| **核心外部数据源** | ① **智谱AI GLM-4/GLM-4V**（文本对话+图像分析）② **和风天气API QWeather**（实时天气+预报+预警）③ **高德地图 API**（公园绿地搜索、IP定位） |
| **前端UI库** | Lucide React（图标）、Framer Motion（动画）、Tailwind CSS |

### 项目特色功能
1. **AI 对话系统**：15种意图识别，自然语言操控全系统
2. **AI 图像分析**：皮肤/眼睛/耳朵/粪便 四类健康视觉诊断
3. **异常检测引擎**：体重阈值(>2%临床显著性)、症状8类×4级分类、过敏自动提取
4. **主动关怀引擎**：季节关怀 + 天气关怀 + 节日问候 + 季节食谱推荐
5. **双向闭环**：检测 → 通知 → 建议 → 执行 → 验证（PDCA）
6. **四级降级方案**：智谱GLM-4-flash → GLM-4 → 规则匹配 → 缓存 → 默认值
7. **自动周报**：多维度聚合（运动/体重/饮食/排泄/用药/就医）
8. **双层记忆系统**：短期会话记忆(chat_memory) + 长期关键记忆(user_long_term_memory)

---

## 二、目录结构

```
pet-care-assistant/
├── src/
│   ├── app/                          # Next.js App Router 页面和API
│   │   ├── (main)/                   # 主布局下的页面组
│   │   │   ├── page.tsx              # 🏠 首页（仪表盘）
│   │   │   ├── chat/                 # 💬 AI 对话页
│   │   │   │   └── page.tsx
│   │   │   ├── health-monitor/       # 📊 健康监测页
│   │   │   │   └── page.tsx
│   │   │   ├── health/               # 🏥 健康记录管理
│   │   │   │   └── page.tsx
│   │   │   ├── map/                  # 🗺️ 公园地图页
│   │   │   │   └── page.tsx
│   │   │   ├── pets/                 # 🐾 宠物档案管理
│   │   │   │   └── page.tsx
│   │   │   ├── records/              # 📝 记录中心（饮食/体重/排泄/运动）
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/             # 📅 护理日程
│   │   │   │   └── page.tsx
│   │   │   ├── settings/             # ⚙️ 设置
│   │   │   │   └── page.tsx
│   │   │   └── weekly-report/        # 📈 每周报告
│   │   │       └── page.tsx          # 自动周报展示页（~480行）
│   │   ├── api/                      # 后端 API 路由（共18个端点）
│   │   │   ├── chat/route.ts         # ⭐ 核心！AI对话入口（~2400行）
│   │   │   ├── analyze/route.ts      # AI 图像分析（133行）
│   │   │   ├── pets/route.ts         # 宠物 CRUD
│   │   │   ├── schedules/route.ts    # 日程 CRUD
│   │   │   ├── health-records/       # 健康记录 CRUD
│   │   │   ├── medical-records/      # 病例记录 CRUD
│   │   │   ├── weight-records/       # 体重记录 CRUD
│   │   │   ├── diet-records/         # 饮食记录 CRUD
│   │   │   ├── bathroom-records/     # 排泄记录 CRUD
│   │   │   ├── exercise-records/     # 运动记录 CRUD
│   │   │   ├── medication-reminders/ # 用药提醒 CRUD
│   │   │   ├── weather/route.ts      # 天气数据接口
│   │   │   ├── parks/route.ts        # 公园绿地搜索
│   │   │   ├── auth/                 # 认证
│   │   │   ├── push/                 # 推送通知
│   │   │   └── init-db/              # 数据库初始化
│   │   ├── login/                    # 登录页
│   │   ├── layout.tsx                # 根布局
│   │   └── globals.css               # 全局样式
│   ├── services/                     # 外部服务封装
│   │   ├── zhipu-ai.ts               # ⭐ 智谱 AI 服务（152行）
│   │   └── weather.ts                # ⭐ 和风天气服务（272行）
│   ├── lib/                          # 核心业务逻辑库
│   │   ├── db.ts                     # 数据库连接池（mysql2/promise）
│   │   ├── care-engine.ts            # ⭐ 主动关怀引擎（389行）
│   │   ├── chatMemory.ts             # ⭐ 双层记忆系统（424行）
│   │   └── types.ts                  # 全局类型定义
│   ├── store/
│   │   └── AppContext.tsx            # 全局状态管理（useReducer + Context, ~652行）
│   ├── config/
│   │   └── care-schedules.ts         # 护理日程配置规则
│   └── components/                   # UI 组件
├── database/
│   └── schema.sql                    # 数据库建表脚本（含示例数据）
├── .env.local                        # 环境变量配置
├── package.json
├── next.config.js
└── tailwind.config.js
```

---

## 三、数据库设计

数据库名: `pet_care_assistant`，字符集 `utf8mb4`。

### 表清单（共11张表）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| **pets** | 宠物档案 | id, name, species(dog/cat), breed, gender, age, weight, allergies(JSON), medical_history(JSON) |
| **care_schedules** | 护理日程 | id, pet_id(FK→pets), title, event_type(vaccination/deworming/grooming/checkup/medication/other), due_date, status(pending/completed/cancelled), priority |
| **health_records** | 健康记录 | id, pet_id(FK), type(analysis/medical/vaccination/other), title, result(JSON), medications(JSON), image_url |
| **medical_records** | 病例记录 | id, pet_id(FK), disease_name, severity(normal/mild/moderate/severe), medications(JSON), treatment_plan(JSON)【含day1/day2/followUp/notes详细步骤】, detected_date, status(active/recovered/chronic) |
| **notifications** | 通知告警 | id, pet_id, title, message, type(reminder/alert/info), is_read |
| **medication_reminders** | 用药提醒 | id, pet_id(FK), record_id(FK→medical_records), disease_name, medications(JSON), frequency, next_dose_time, remaining_doses, status(active/paused/completed) |
| **park_locations** | 绿地位置 | id, name, address, lat/lon, features(JSON), rating |
| **weight_records** | 体重记录 | id, pet_id, weight, recorded_at |
| **diet_records** | 饮食记录 | id, pet_id, food_name, meal_type(breakfast/lunch/dinner/snack), record_date |
| **bathroom_records** | 排泄记录 | id, pet_id, type(solid/liquid/both), size(small/medium/large), record_date |
| **chat_memory** | 会话记忆 | id, user_id, session_id, role(user/assistant), content, created_at |
| **user_long_term_memory** | 长期记忆 | id, user_id, pet_id, memory_type(allergy/preference/health/behavior/other), memory_content |

### 核心关联关系
```
pets (1) ←→ (N) care_schedules
pets (1) ←→ (N) health_records
pets (1) ←→ (N) medical_records
pets (1) ←→ (N) medication_reminders  [通过 medical_records 关联]
medical_records (1) ←→ (N) medication_reminders
users (隐式通过user_id) ←→ (N) chat_memory
users ←→ (N) user_long_term_memory
```

---

## 四、核心外部数据源详解

### 数据源一：智谱AI (ZhipuAI / GLM-4)

**接入方式**: REST API 调用（`zhipuai` SDK）

**文件**: `src/services/zhipu-ai.ts`

**两个核心调用函数**:

#### (1) `chatWithAI(messages, systemPrompt?)` — 文本对话
- 使用模型: **GLM-4-Flash**
- 参数: temperature=0.7, max_tokens=1000
- 用途: AI 助手对话、健康咨询、日程理解等
- 错误处理分级:
  - 401 → "认证失败"
  - 429 → "请求频繁"
  - code 1301 → "余额不足"
  - 其他 → 通用错误信息

#### (2) `chatWithImage(prompt, imageBase64, systemPrompt?)` — 图像分析
- 使用模型: **GLM-4V**（视觉模型）
- 参数: temperature=0.7, max_tokens=1500
- 输入: base64 编码图片 + 文字 prompt
- 支持的分析类型:
  - **skin** (皮肤): 红肿/发炎/皮疹/脱毛/寄生虫/伤口
  - **eye** (眼睛): 清澈度/血丝/分泌物/浑浊
  - **feces** (粪便): 形态/颜色/血丝/消化程度
  - **ear** (耳朵): 分泌物/红肿/耳螨
- 特殊处理: 对已知测试图片(OIP-C/OIP-E/OPI-D)返回预设结果

**两个系统提示词常量**:
- `PET_HEALTH_SYSTEM_PROMPT`: "你是专业的宠物健康助手，名字叫'宠宠'"
- `IMAGE_ANALYSIS_SYSTEM_PROMPT`: 专业宠物健康视觉分析助手

---

### 数据源二：和风天气 API (QWeather)

**接入方式**: HTTP GET 请求（定时拉取）

**文件**: `src/services/weather.ts`

**四个数据获取函数**:

| 函数 | 接口 | 返回数据 | 缓存 |
|------|------|---------|------|
| `getPublicIP()` | ipify.org | 用户公网 IP | 30分钟 |
| `getLocationByIP(ip)` | ip-api.com | 经纬度+城市名 | 24小时 |
| `getCurrentWeather(lat, lon)` | v7/weather/now | 当前温度/体感/湿度/风速/天气文字/降水量/气压/能见度/云量 | 30分钟 |
| `getHourlyForecast(lat, lon)` | v7/weather/24h | 24小时逐时预报 | 30分钟 |
| `getWeatherAlerts(lat, lon)` | v7/warning/now | 天气预警列表 | 30分钟 |

**核心智能函数**: `getWalkSuggestion(weather, alerts)` — 遛狗建议引擎

输入: 当前天气对象 + 预警列表  
输出: WalkSuggestion { suitable(boolean), level(5级), message(string), tips(string[]), duration(string) }

**遛狗等级判定规则**:
| 等级(level) | 温度条件 | duration | 场景 |
|------------|---------|----------|------|
| excellent | 10°C ≤ temp < 25°C | 30-60min | 最佳遛狗时机 |
| good | 25°C ≤ temp < 30°C | 20-30min | 注意防暑 |
| fair | 5°C ≤ temp < 10°C | 20-30min | 适量运动 |
| poor | temp < 5°C 或 30°C ≤ temp < 35°C | 10-15min | 谨慎外出 |
| bad | temp < 0°C 或 temp ≥ 35°C 或雷暴 | 0-5min或不出门 | 禁止外出 |
| unknown | 无法获取天气 | - | 检查网络 |

额外判断维度: 天气状况(雨/雪/冰/雷)、风速(>40km/h禁止, >20km/h警告)、降水量(>10mm禁止)、预警类型(TB/TS/TY等暴风类预警直接禁止)

---

## 五、AI 对话系统核心架构

**文件**: `src/app/api/chat/route.ts` (~2400行，最核心的文件)

### 5.1 整体流程

```
用户消息 POST /api/chat
    ↓
[1] 初始化记忆表 (initChatMemoryTable + initUserLongTermMemoryTable)
    ↓
[2] 过敏检测 (detectAndUpdatePetAllergy) — 从消息中自动提取过敏信息并持久化
    ↓
[3] 加载长期记忆摘要 (getUserMemorySummary) — 构建用户画像
    ↓
[4] 加载最近会话记忆 (getChatMemory, 最近5条)
    ↓
[5] 构建 System Prompt (buildUserContext):
    ├─ 宠物档案（品种/性别/年龄/体重/过敏史）
    ├─ 病例历史 + 详细治疗方案(day1/day2/followUp)
    ├─ 当前用药提醒（含剩余次数）
    ├─ 即将到期日程（3天内）
    ├─ 历史长期记忆（过敏/偏好/健康/行为）
    └─ 最近对话上下文
    ↓
[6] 调用智谱AI GLM-4-Flash 生成回复
    ↓
[7] 意图检测与响应（按优先级互斥执行）:
    ├─ 户外活动推荐 → 天气+公园推荐卡片
    ├─ 日程创建确认 → 提取宠物/日期/类型/重复规则
    ├─ 宠物档案查看 → 单只/全部宠物详情
    ├─ 日程查看 → 待执行日程列表
    ├─ 宠物生病检测 → 症状分类+药物推荐
    ├─ 用药提醒创建 → 从病例自动创建
    ├─ 添加宠物确认 → 提取名/种/品
    ├─ 体重记录 → 自动提取数值+单位转换(斤→公斤)
    ├─ 排便记录确认 → 类型+量级选择
    ├─ 健康分析引导 → 引导上传照片
    └─ 健康报告生成 → generateHealthReport()
    ↓
[8] 保存对话到记忆 (saveChatMemory + extractKeyMemories)
    ↓
[9] 返回 JSON { reply, contextUsed, sessionId, ...各种intent标记... }
```

### 5.2 15种意图识别关键词表

| # | 意图 | 关键词示例 | 触发函数 | 返回字段 |
|---|------|-----------|---------|----------|
| 1 | **户外活动推荐** | 带*出去玩/去玩/去哪/去公园 | hasOutdoorActivityRecommendIntent() | outdoorActivityRecommend |
| 2 | **日程创建** | 要带*/预约/安排*/提醒我/计划/*疫苗/*驱虫/*体检 | hasScheduleIntent() | scheduleConfirmation |
| 3 | **查看宠物档案** | 查看档案/宠物信息/我的宠物/长什么样 | hasViewPetProfileIntent() | petProfileView |
| 4 | **查看日程** | 查看日程/日程安排/有哪些日程 | hasViewScheduleIntent() | scheduleView |
| 5 | **宠物生病** | 拉肚子/呕吐/不吃/没精神/不舒服/生病/*皮肤/*眼睛/*耳朵 | hasSickPetIntent() | sickPetConfirmation |
| 6 | **用药提醒** | 开启提醒/提醒用药/吃药提醒 | hasMedicationReminderIntent() | medicationReminderCreated |
| 7 | **添加宠物** | 添加宠物/新宠物/领养/想养/多了/新来了 | hasAddPetIntent() | petConfirmation |
| 8 | **记录体重** | 体重/称了/多少斤/胖了/瘦了/重了/轻了 | hasRecordWeightIntent() | weightRecorded |
| 9 | **排便记录** | 大便/便便/排便/拉了/尿尿/小便 | hasRecordBowelIntent() | bowelConfirmation |
| 10 | **健康分析** | 拍照/分析/识别/帮我看/检查有没有问题 | hasHealthAnalysisIntent() | healthAnalysisNeeded |
| 11 | **健康报告** | 健康分析/周报/周总结/趋势/完整分析/7天/一周 | hasHealthReportIntent() | healthReportData |
| 12 | **户外活动(旧)** | 郊外/户外/公园/散步/遛狗 | hasOutdoorIntent() | parkRecommendation |
| 13 | **宠物相关问题** | 宠物/狗狗/猫咪/*怎么/为什么/能不能 | isPetRelated() | (融入system prompt) |
| 14 | **湿疹/皮肤** | 湿疹/皮肤病/皮肤/挠痒/红肿/痒 | skinDiseaseKeywords | (强化治疗方案展示) |
| 15 | **图片分析** | imageData 非空 | (imageContext注入prompt) | (走chatWithImage) |

**注意**: 意图之间存在**互斥机制**。例如"户外活动推荐"(#1)触发后，(#2)日程创建、(#5)生病检测、(#7)添加宠物、(#8)体重、(#9)排便、(#10)分析等意图都会被跳过，避免冲突。

### 5.3 症状分类系统 (8大类)

```typescript
const symptomCategories = {
  'digestive':   ['拉肚子','拉稀','腹泻','呕吐','吐了','肚子','肠胃','消化','便便','大便','不吃','没食欲','食欲'],
  'respiratory': ['感冒','发烧','咳嗽','流鼻涕','打喷嚏','呼吸'],
  'skin':        ['皮肤','掉毛','脱毛','挠痒','抓痒','痒','疹子','红肿','湿疹','过敏','癣'],
  'eyes':        ['眼睛','眼屎','流泪','红眼'],
  'ears':        ['耳朵','耳螨','甩头','挠耳朵'],
  'mobility':    ['腿','脚','走路','跳','站','瘸','瘫痪','无力'],
  'urinary':     ['尿','喝水','多饮','多尿'],
  'general':     ['不舒服','生病','病了','没精神','蔫了','没力气','不对劲','异常','反常','精神']
}
```
每个分类对应推荐的常用药物（最多5个），如消化系→蒙脱石散/益生菌/肠胃宝；呼吸系→果根素/多西环素；皮肤系→碘伏/恩诺沙星/地塞米松软膏。

### 5.4 日程解析引擎

从自然语言中提取:
- **相对日期**: 今天/明天/后天/X天后/下周/周末/过几天/过一阵子
- **具体日期**: "X月X日"格式
- **日程类型映射**: 疫苗→vaccination, 驱虫→parasite_prevention, 洗澡→grooming, 体检→wellness_exam 等13种
- **重复间隔**: 隔X个星期/每X天/每X周/每隔X月 + 提取重复次数
- **户外标记**: 含"郊外/户外/公园"自动标记 isOutdoor=true

### 5.5 体重提取

支持格式: "XX公斤"/"XXkg"/"XX千克"/"XX斤"，自动进行单位判断和斤→公斤转换。

### 5.6 排便提取

自动识别: 宠物名 + 时间(今天/昨天/前天) + 类型(小便/大便/都有)。

---

## 六、主动关怀引擎

**文件**: `src/lib/care-engine.ts`

### 6.1 季节关怀 (SEASONAL_CARE)

按月份划分四季，每季4-6条关怀语:
- 春季(3-5月): 换毛梳毛/驱虫/温差保暖/踏青防草丛
- 夏季(6-8月): 补水防中暑/洗澡频率/皮肤病预防/剃毛误区
- 秋季(9-11月): 控制食量/驱虫/花粉过敏/毛球症/润肺食物
- 冬季(12-2月): 保暖窝/不剃毛/小衣服/减少食量/关节保暖/加湿器

### 6.2 护理小知识 (CARE_TIPS)

10条通用护理知识随机推送: 牙龈清洁/耳螨预防/指甲修剪/社交/刷牙/玩具消毒/驱虫/毛发检查/睡眠/定时喂食。

### 6.3 天气关怀 (WEATHER_CARE)

按天气代码分6类: sunny/cloudy/rainy/hot/cold/snowy，每类2-3条关怀语。

### 6.4 节日系统 (FESTIVALS)

22个中国法定+传统节日，支持:
- 精确日期匹配 (如元旦1月1日)
- 日期范围匹配 (如清明节4月4-6日)
- 农历节日标记 (isLunar: 春节/元宵/龙抬头/端午/七夕/中秋/重阳)
- 星期计算节日 (isSunday+week: 母亲节第2周日/父亲节第3周日)
- 节气标记 (isSolarTerm: 清明)

### 6.5 季节食谱

- 夏季消暑食谱(5款): 鸡胸肉西瓜冰/香蕉酸奶冰棍/西瓜肉丁/肉汤冰块/黄瓜冰条
- 冬季暖心食谱(4款): 暖心鸡肉粥/羊肉炖萝卜/鸡蛋南瓜泥/牛肉胡萝卜汤

### 6.6 输出函数

| 函数 | 用途 |
|------|------|
| `getSeasonalCareTip()` | 随机获取一条季节关怀语 |
| `getCareTip()` | 随机获取通用护理知识 |
| `getWeatherCare(weatherCode)` | 根据天气获取关怀语 |
| `getTodayFestival()` / `getTomorrowFestival()` | 检测今天/明天是否是节日 |
| `getSeasonalRecipe()` | 获取季节食谱(仅夏/冬有) |
| `generateCareMessage(weatherInfo)` | 任务完成后关怀语组合(天气+季节+食谱) |
| `generateDailyBriefing(weatherInfo)` | 每日健康播报(季节+天气+节日+食谱+护理知识) |
| `generateWeeklyReport(data)` | ⭐ 每周健康周报Markdown生成 |

---

## 七、双层记忆系统

**文件**: `src/lib/chatMemory.ts`

### 7.1 短期记忆 (chat_memory 表)

- 存储每次对话的 user/assistant 消息
- 按 session_id 区分会话
- 获取最近 N 条（默认20条）用于构建对话上下文
- 用于 AI 回复时参考最近聊了什么

### 7.2 长期记忆 (user_long_term_memory 表)

**5种记忆类型**:
| 类型 | 说明 | 示例 |
|------|------|------|
| allergy | 过敏信息 | "对虾仁过敏" |
| preference | 偏好信息 | "喜欢出去玩" |
| health | 健康状态 | "九万拉肚子了" |
| behavior | 行为活动 | "今天带球球遛弯了2小时" |
| other | 其他 | - |

**自动提取机制** (`extractKeyMemories`):
- 从最近30天的用户消息中用正则模式匹配
- 支持10+种过敏表达模式: "对XX过敏"/"过敏是XX"/"医生说对XX过敏"/"确诊XX过敏"/"不能吃XX"等
- 匹配到后自动保存到长期记忆表，同时关联宠物ID和名称
- 去重: 相同内容不重复存储

**过敏专项增强** (`detectAndUpdatePetAllergy`):
- 12种过敏模式匹配（比 extractKeyMemories 更全面）
- 直接更新 pets 表的 allergies 字段
- 同时写入长期记忆
- 支持常见食物过敏词直接匹配: 虾仁/鸡肉/牛肉/鱼/羊肉/玉米/小麦/大豆/海鲜

**记忆摘要输出** (`getUserMemorySummary`):
- 优先使用长期记忆表（按类型分组展示: 🔴过敏/💡偏好/🏥健康/🎾行为）
- 如果长期记忆不足(<3条)，补充最近7天的对话片段
- 注入 AI 系统 Prompt 中作为「历史对话记忆」

---

## 八、健康报告生成引擎

**文件**: `src/app/api/chat/route.ts` 内的 `generateHealthReport()` 函数 (第158-465行)

### 输入数据来源（7天内）

| 数据源 | 表 | 内容 |
|--------|-----|------|
| 体重记录 | weight_records | 体重变化趋势 |
| 饮食记录 | diet_records | 餐次分布/食物种类/规律性 |
| 排泄记录 | bathroom_records | 类型/量级/规律性 |
| 病例历史 | medical_records | 活跃疾病/用药情况/严重程度 |
| 就医记录 | health_records(type=other/medication/checkup/surgery) | 就医明细 |

### 分析模块（4大块）

1. **阶段概览**: 数据覆盖天数 + 各类记录数 + 异常标记
2. **体重趋势分析**:
   - 计算7天体重差值和百分比
   - **临床显著性判断**: \|Δ%\| ≥ 2% → 临床显著下降/上升（兽医标准）
   - 分级: <2%正常 / 2-3%略大 / ≥5%需关注
3. **饮食分析**: 餐次分布(早午晚零食)/主要食物种类/规律性评估
4. **排泄分析**: 大小便次数/排便量级分布(大中小)/规律性评估
5. **就医情况**: 合并 medical_records + health_records 按时间排序展示

### 综合评估逻辑

- 无问题且各数据充足 → ✅ 平稳无异常
- 有活跃疾病或体重变化≥5% → ⚠️ 需密切关注
- 数据不足 → 📊 建议加强记录
- 生成下一周期建议（基于当前数据动态生成）

---

## 九、图像分析系统

**文件**: `src/app/api/analyze/route.ts`

### 流程

```
POST /api/analyze { imageUrl(base64), analysisType }
    ↓
根据 analysisType 选择提示词模板:
    ├─ skin  → 皮肤6项检查(颜色/光泽/红肿/皮疹/脱毛/寄生虫/伤口)
    ├─ eye   → 眼睛6项检查(清澈度/血丝/分泌物/眼白/浑浊)
    ├─ feces → 粪便6项检查(形态/颜色/血丝/黏液/消化/饮食建议)
    ├─ ear   → 耳朵5项检查(洁净度/分泌物/红肿/异味/耳螨)
    └─ 默认  → 整体外观/精神状态/毛发/皮肤/异常
    ↓
特殊处理: 已知测试图片(OIP-C/E=湿疹, OPI-D=细菌感染)返回预设专业回复
    ↓
调用 chatWithImage(prompt, imageUrl, IMAGE_ANALYSIS_SYSTEM_PROMPT)
    ↓
返回 { content, analysisType, success }
```

---

## 十、全局状态管理

**文件**: `src/store/AppContext.tsx`

使用 React useReducer + Context 模式。

### State 结构

```typescript
interface AppState {
  pets: Pet[];                    // 宠物列表
  selectedPetId: string | null;    // 当前选中宠物ID
  careSchedules: CareSchedule[];   // 护理日程
  healthAnalyses: HealthAnalysis[];// 健康分析记录
  notifications: Notification[];   // 通知列表
  parks: ParkLocation[];           // 公园列表
  weather: Weather | null;         // 天气数据
  isLoading: boolean;
}
```

### Action 类型（16种）

SET_PETS / ADD_PET / UPDATE_PET / DELETE_PET / SELECT_PET /
SET_SCHEDULES / ADD_SCHEDULE / UPDATE_SCHEDULE / COMPLETE_SCHEDULE /
ADD_HEALTH_ANALYSIS /
SET_NOTIFICATIONS / ADD_NOTIFICATION / MARK_NOTIFICATION_READ /
SET_PARKS / SET_WEATHER / SET_LOADING

### 自定义 Hook: `useApp()` 提供

- `selectedPet`: 当前选中的宠物对象
- `dispatch`: action 分发
- 所有 state 字段

---

## 十一、环境变量

```env
# 高德地图 API Key
NEXT_PUBLIC_AMAP_KEY=50c608acfc894c6dec9af287947d7faa

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=4123vipabc
DB_NAME=pet_care_assistant

# 智谱AI API Key
ZHIPUAI_API_KEY=8c8ffc159d0b4c378f36e45ab35ffe6a.rx5oSymII4rCqS38
```

---

## 十二、异常检测规则（L2 层级）

### 规则1: 体重异常检测
- **条件**: 7天体重变化率 |Δ%| ≥ 2%
- **临床标准**: 兽医学认为一周内体重变化2%-3%属于临床显著
- **下降方向** → "暗示基础性疾病或摄入严重不足"
- **上升方向** → "需要关注食物摄入量是否过多"
- **响应**: 在健康报告中标记⚠️并给出具体建议
- **分级**: <2%正常 / 2-3%关注 / >5%需就医

### 规则2: 症状分类检测
- **8大类 × 4级严重度**: digestive/respiratory/skin/eyes/ears/mobility/urinary/general × normal/mild/moderate/severe
- **条件**: 用户消息命中症状关键词
- **响应**: 
  1. 分类显示症状类别
  2. 推荐3-5种对应药物（含用法用量说明）
  3. 询问是否需要创建病历/设用药提醒
  4. 严重症状主动提醒就医

### 规则3: 过敏自动识别与持久化
- **条件**: 12种正则模式匹配过敏表述
- **响应**: 
  1. 实时更新 pets.allergies 字段
  2. 写入 user_long_term_memory (type=allergy)
  3. 后续对话自动引用过敏信息（避免推荐致敏食物）
  4. 向用户反馈"已记录XX对YY过敏"

### 规则4: 天气异常预警（weather.ts）
- **温度**: ≥35°C高温预警 / ≤5°C低温警告 / <0°C禁止外出
- **降水**: >10mm大雨不建议外出 / >25mm暴雨禁止
- **风力**: >6级风小型犬受惊警告 / >40km/h禁止外出
- **官方预警**: TB台风/TS雷暴/TY龙卷风/HC寒潮/HD高温/SS沙尘暴 → 最高优先级禁止

---

## 十三、联动规则（L3 层级）

### 规则1: 天气 → 遛狗计划动态调整
- **触发**: 用户查询天气/户外活动/带宠物出去玩
- **数据流**: getCurrentWeather() → getWalkSuggestion() → 返回level+duration+tips
- **调整行为**: 
  - excellent(10-25°C) → 30-60min散步 + "绝佳时机"
  - good(25-30°C) → 20-30min + 早晚出行 + 带水
  - fair(5-10°C) → 20-30min + 注意保暖
  - poor(<5°C or 30-35°C) → 10-15min + 特殊防护
  - bad(<0°C or ≥35°C or 雷暴) → 取消外出 + 室内替代方案

### 规则2: 季节 → 关怀内容切换
- **触发**: 每次任务完成 / 每日播报 / 周报生成
- **数据流**: getCurrentSeason() → SEASONAL_CARE[season] → 随机选取
- **夏季额外联动**: 天气hot → 叠加消暑食谱推荐
- **冬季额外联动**: 天气cold → 叠加暖心食谱推荐

### 规则3: 体重数据 → 饮食+运动建议
- **触发**: 生成健康报告时
- **数据流**: weightRecords趋势分析 → 综合评估 → 下一周期建议
- **调整行为**:
  - 体重上升≥5% → 建议控制食量+关注原因
  - 体重下降≥5% → 建议补充营养+咨询兽医
  - 无体重记录 → 建议建立体重跟踪习惯

### 规则4: 病历数据 → 用药提醒自动化
- **触发**: 用户说"开启用药提醒"
- **数据流**: medical_records → 最新活跃记录 → 提取medications → 创建medication_reminder
- **自动计算**: frequency(默认3次/天) → interval_hours(8h) → total_doses(21次=7天疗程) → next_dose_time

---

## 十四、降级策略（四级容错）

### 第一级: GLM-4-Flash (主用)
- chat/route.ts 中实际使用的模型
- 快速、成本低

### 第二级: GLM-4 (备用)
- zhipu-ai.ts 中 chatWithAI 默认模型
- 更强大的推理能力

### 第三级: 规则匹配 (离线降级)
- 症状分类、体重提取、日程解析等全部基于正则/关键词
- 不依赖 AI 也能完成基本意图识别
- 例如: "球球拉肚子" → 不需要 AI 也能匹配到 digestive 类别

### 第四级: 缓存/默认值 (最终兜底)
- 天气: getWalkSuggestion 中 weather=null 时返回 level='unknown'
- 公园: searchNearbyParksByIP 失败时返回 getDefaultParks()（珠江公园/华南植物园/白云山3个默认绿地）
- AI: zhipu-ai.ts 中所有错误都有友好中文 fallback 消息

---

## 十五、自动周报系统

**触发入口**: 对话说"健康报告"/"周报"/"周总结"/"分析一下最近7天"

**数据聚合维度** (weekly-report/page.tsx + care-engine.ts):

| 维度 | 数据源 | 指标 |
|------|-------|------|
| 运动 | exercise-records | 运动天数/总里程/周环比趋势(%) |
| 体重 | weight_records | 变化kg / 变化百分比 / 是否临床显著 |
| 用药 | medication_reminders | 用药次数 |
| 就医 | health_records+medical_records | 就医记录数 |
| 分析 | health_records(type=analysis) | 分析次数 |

**输出格式**: Markdown 格式周报，包含:
1. 运动情况（天数/总距离/趋势箭头📈📉➡️）
2. 体重变化（具体数值+百分比+正常范围±2-3%/周）
3. 健康记录汇总（用药/就医/分析）
4. 当季护理建议（从 care-engine 随机取）
5. 鼓励语

---

## 十六、API 端点清单

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/chat` | AI对话（15种意图识别+异常检测+联动响应） |
| POST | `/api/analyze` | AI图像分析（皮肤/眼/粪/耳） |
| GET/POST | `/api/pets` | 宠物CRUD |
| GET/POST | `/api/schedules` | 日程CRUD |
| GET/POST | `/api/health-records` | 健康记录CRUD |
| GET/POST | `/api/medical-records` | 病例记录CRUD |
| GET/POST | `/api/weight-records` | 体重记录CRUD |
| GET/POST | `/api/diet-records` | 饮食记录CRUD |
| GET/POST | `/api/bathroom-records` | 排泄记录CRUD |
| GET/POST | `/api/exercise-records` | 运动记录CRUD |
| GET/POST | `/api/medication-reminders` | 用药提醒CRUD |
| GET | `/api/weather` | 当前天气+预报+预警+遛狗建议 |
| GET | `/api/parks` | 公园绿地搜索 |
| POST | `/api/auth` | 用户认证 |
| POST | `/api/push` | 推送通知 |
| POST | `/api/init-db` | 数据库初始化 |

---

## 十七、页面导航结构

```
首页 (/)                     — 仪表盘: 天气+宠物卡片+日程+用药提醒+快捷操作
AI对话 (/chat)               — 与"毛绒管家"对话，支持文字+图片
健康监测 (/health-monitor)   — 健康数据可视化
健康记录 (/health)           — 就诊/分析/疫苗记录管理
公园地图 (/map)              — 附近绿地搜索+高德地图集成
宠物档案 (/pets)             — 宠物增删改查
记录中心 (/records)          — 饮食/体重/排泄/运动记录
护理日程 (/schedule)        — 日程管理
每周报告 (/weekly-report)    — 自动生成的多维度周报
设置 (/settings)             — 用户设置
登录 (/login)                — 登录页
```

---

## 十八、关键技术实现细节

### 18.1 AI System Prompt 构建策略 (route.ts 第1575-1658行)

System Prompt 由以下层次动态组装：
1. **角色定义**: "毛绒管家" — 友善专业的宠物健康助手
2. **风格要求**: 简洁/亲切/主动关心/记住对话/引用过敏信息/主动提病例和用药
3. **宠物档案**: 通过 buildUserContext() 异步构建（品种/性别/年龄/体重/过敏/病史/治疗方案/用药提醒/即将到期日程）
4. **长期记忆**: getUserMemorySummary() 返回的关键信息
5. **图片上下文**: 如有图片上传则注入分析指令
6. **近期对话**: 最近3条聊天记录
7. **功能能力说明**: 告知AI可以自动完成的6类操作
8. **重要提醒规则**: 皮肤问题强制详细步骤/用药提醒剩余次数/疗程结束复查提醒
9. **回复示例**: 正面✅/反面❌范例

### 18.2 图片上传对话流程
1. 前端上传图片 → 转 base64
2. POST /api/chat 时携带 imageData 字段
3. route.ts 检测到 imageData → 在 system prompt 中注入图片分析指令
4. 同时返回 healthAnalysisNeeded 标志
5. 前端检测到此标志 → 弹出拍照引导界面
6. 用户确认后 → POST /api/analyze { imageUrl, analysisType }
7. analyze/route.ts → chatWithImage() → GLM-4V → 返回分析结果

### 18.3 意图互斥机制
- `isOutdoorRecommendIntent` 作为最高优先级标志位
- 一旦户外推荐意图被触发，后续所有其他意图检测都加上 `&& !isOutdoorRecommendIntent` 条件
- 这避免了"带球球出去公园玩"同时触发户外推荐+日程创建+体重记录等冲突

### 18.4 日程重复解析
支持自然语言描述重复性日程：
- "隔1个星期驱虫" → week, value=1, repeatCount=3(默认)
- "每3天喂维生素" → day, value=3
- "每个月体检，做5次" → month, value=1, repeatCount=5
- 自动计算最大重复次数（一年上限）

---

## 十九、测试数据

### 数据库预置示例数据 (schema.sql)
- **宠物**: 球球（金毛, 公, 3岁, 30.5kg）
- **日程**: 狂犬疫苗加强针(6月15日, high), 体内驱虫(4月20日), 年度体检(12月1日)
- **健康记录**: 皮肤问题分析（肚皮发红疑似湿疹）
- **公园**: 世纪公园(2.5km, 4.5星), 滨江绿地(3.8km, 4.2星)

### 测试场景矩阵

| 场景 | 用户输入 | 期望行为 |
|------|---------|---------|
| 正常对话 | "球球今天吃什么好" | AI结合球球档案+过敏信息回答 |
| 异常-高温 | (天气38°C时)问"能遛狗吗" | 返回bad级别+取消建议+室内替代 |
| 异常-暴雨 | (降水25mm时)问"出去玩" | 返回bad+禁止外出+雷暴警告 |
| 异常-体重骤降 | "球球上周25kg现在23kg" | 记录体重+Δ%=8%→临床显著↓→建议就医 |
| 过敏检测 | "球球吃了虾仁呕吐了" | 自动提取"虾仁过敏"→更新档案+长期记忆 |
| 日程创建 | "下周三带球球打疫苗" | 返回日程确认卡片(日期+类型) |
| 生病检测 | "球球一直在拉肚子还呕吐" | 分类digestive+推荐蒙脱石散/益生菌+询问是否建病历 |
| 图片分析 | 上传皮肤照片+说"帮我看看" | 走GLM-4V→返回皮肤分析报告 |
| 周报生成 | "看看球球本周健康报告" | 聚合7天数据→生成Markdown多维度周报 |
| 边界-无宠物 | "添加宠物"+"养了一只叫旺财的猫" | 提取名/种/品→返回确认卡片 |
| 边界-模糊输入 | "那个...好像不太舒服" | 匹配general类症状→询问详细信息 |

---

## 二十、注意事项

1. **AI 模型差异**: route.ts 实际使用 `glm-4-flash`（快速版），而 zhipu-ai.ts 默认导出函数用 `glm-4`（标准版）。flash 版本用于在线对话（更快更便宜），standard 版本用于独立调用。
2. **数据库连接池**: 最大5连接，超时60秒，适合中小规模应用。
3. **天气缓存**: Next.js 的 `revalidate: 1800`（30分钟缓存），避免频繁调用和风 API。
4. **图片大小限制**: base64 编码后可能很大，生产环境应在前端压缩后再传。
5. **密码敏感信息**: .env.local 包含数据库密码和 API Key，不应提交到 Git。
6. **MySQL vs PostgreSQL**: 项目使用的是 **MySQL**（mysql2 驱动），不是 PostgreSQL。
