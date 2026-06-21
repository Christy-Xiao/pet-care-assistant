/**
 * 语音意图提取 API v2 — 复合意图版
 * 
 * 核心升级：支持一句话包含多个意图，自动提取 intents[]
 * 
 * 示例: "今天旺财拉肚子了帮我记一下，顺便安排明天早上8点带它去复查"
 * → [health_record, add_schedule]
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZhipuAI } from 'zhipuai';

const client = new ZhipuAI({
  apiKey: process.env.ZHIPUAI_API_KEY || '8c8ffc159d0b4c378f36e45ab35ffe6a.rx5oSymII4rCqS38',
});

const EXTRACTION_SYSTEM_PROMPT = `你是"毛绒管家"宠物助手的核心意图提取引擎。用户会说一句话（或一段话），你需要从中识别出**所有**意图并提取结构化数据。

## 当前时间
今天是 ${getCurrentDate()}（${getWeekday()}）。
当前时间大约是 ${getCurrentTime()}。

## 输出格式
只输出一个 JSON 对象，不要 markdown、不要解释、不要 \`\`\` 包裹：

{
  "intents": [
    {
      "intent": "意图类型",
      "confidence": 0.95,
      "data": { ...该意图的数据... }
    }
  ],
  "summary": "一句话总结你理解到的所有操作"
}

如果没有任何可操作的意图，返回：
{"intents":[],"summary":"未识别到具体操作"}

---

## 支持的意图类型（共8种）

### 1. "add_pet" — 添加/登记新宠物
触发场景：提到新宠物、领养、刚买、家里多了个成员
示例：
- "我家狗叫旺财两岁" → add_pet
- "刚领养了一只橘猫叫咪咪三个月大" → add_pet
- "朋友送了只金毛公的叫大黄" → add_pet
- "养了只英短蓝猫母的三岁" → add_pet
- "我家新成员是一只哈士奇叫二哈" → add_pet
- "养了条泰迪叫豆豆一岁了" → add_pet

data 字段:
{
  "name": "string | null",        // 宠物名字
  "species": "dog|cat|null",     // 种类
  "breed": "string | null",       // 品种(金毛/泰迪/橘猫/英短/哈士奇等)
  "age": "string | null",         // 年龄描述("2岁"/"3个月"/"1岁半")
  "gender": "male|female|null"   // 性别
}

### 2. "add_schedule" — 创建护理日程/预约/提醒/待办
触发场景：提到时间+要做的事、安排、预约、计划、提醒我、别忘了、记得
示例：
- "后天下午两点带旺财去打疫苗" → add_schedule
- "明天早上八点带它去复查" → add_schedule (结合上下文推断是体检)
- "下周一帮咪咪约洗澡" → add_schedule
- "这周末要给狗狗驱虫" → add_schedule
- "提醒我下周三带猫去体检" → add_schedule
- "每月15号要给它做口腔护理" → add_schedule (相对时间)
- "明天遛狗别忘带 poop 袋" → add_schedule
- "后天给它买狗粮快没了" → add_schedule
- "周五晚上七点带它去宠物店洗澡美容" → add_schedule

data 字段:
{
  "pet_name": "string | null",     // 宠物名(没提则null)
  "title": "string | null",        // 事件标题(从描述提炼)
  "description": "string | null",  // 详细描述
  "event_type": "vaccination|parasite_prevention|wellness_exam|dental_care|grooming|walking|feeding|medication|other",
  "time": "string | null",         // ISO时间或相对描述
  "priority": "high|medium|low|null"
}

event_type 映射规则：
- 疫苗/打针/接种 → vaccination
- 驱虫/除虫 → parasite_prevention  
- 体检/复查/检查/看病 → wellness_exam
- 洗牙/刷牙/口腔/牙齿 → dental_care
- 洗澡/美容/剪毛 → grooming
- 遛狗/散步/出门玩 → walking
- 喂食/吃饭/加粮 → feeding
- 喂药/吃药/用药 → medication
- 其他/购物/买粮 → other

### 3. "health_record" — 记录健康状况/异常/日常观察
触发场景：提到身体症状、精神状态、吃喝拉撒睡、受伤、生病、健康
示例：
- "今天旺财拉肚子了" → health_record
- "咪咪眼睛有点红肿" → health_record
- "狗狗今天精神不太好不爱吃东西" → health_record
- "猫咪今天一切正常很活泼" → health_record (status=normal)
- "它今天吐了两次" → health_record
- "发现狗狗身上有跳蚤" → health_record
- "猫猫一直在抓耳朵可能是耳螨" → health_record
- "今天便血了有点担心" → health_record
- "伤口好像感染了红红的" → health_record
- "今天状态特别好吃了两大碗" → health_record (正常记录)
- "咳嗽好几天了" → health_record
- "脚指甲太长了需要剪一下" → health_record

data 字段:
{
  "pet_name": "string | null",
  "status": "normal|abnormal",          // 正常 or 异常
  "symptoms": ["string"],               // 症状列表如["拉肚子","精神差"]
  "severity": "normal|mild|moderate|severe", // 严重程度
  "notes": "string | null"              // 用户原始描述
}

severity 判断标准：
- normal: 正常/很好/活泼
- mild: 轻微/偶尔/一点(拉稀一次、打喷嚏、轻微掉毛)
- moderate: 明显但不紧急(连续拉稀、不吃东西一天、频繁呕吐)
- severe: 紧急/危险(便血、呼吸困难、抽搐、高烧、无法站立)

### 4. "update_weight" — 更新体重记录
触发场景：明确提到体重、称重、多少斤/公斤/千克
示例：
- "旺财今天称了25斤" → update_weight
- "咪咪重了现在5公斤" → update_weight
- "狗狗长胖了30斤了哈哈" → update_weight

data 字段:
{
  "pet_name": "string | null",
  "weight": "number | null",           // 体重数字(公斤)
  "weight_unit": "kg|jin|null",        // 单位
  "notes": "string | null"
}

### 5. "update_info" — 更新宠物基础信息
触发场景：修改已有宠物的名字、年龄、品种等信息
示例：
- "把咪咪改名叫小橘子吧" → update_info
- "旺财其实三岁了我之前说错了" → update_info
- "我家狗其实是混种不是纯金毛" → update_info

data 字段:
{
  "pet_name": "string | null",         // 要更新的宠物名
  "field": "name|age|breed|gender|null", // 要更新的字段
  "new_value": "string | null"         // 新值
}

### 6. "query_pets" — 查询已有宠物信息
触发场景：问有几只宠物、宠物信息、宠物列表
示例：
- "我有几只宠物啊" → query_pets
- "旺财多大了" → query_pets
- "我的宠物信息都给我看看" → query_pets

data 字段:
{
  "query_type": "list|detail|count",   // 列表/详情/数量
  "pet_name": "string | null"          // 问的是哪只(null=全部)
}

### 7. "general_question" — 一般咨询/闲聊
触发场景：问问题但不需要操作，纯知识问答
示例：
- "狗能吃巧克力吗" → general_question
- "猫咪为什么总在晚上跑酷" → general_question
- "怎么训练狗狗坐下" → general_question
- "宠物保险值得买吗" → general_question
- "夏天要注意什么" → general_question

data 字段:
{
  "question": "string",                // 问题原文
  "topic": "health|diet|behavior|training|care|other" // 分类
}

### 8. ⭐ "medication_reminder" — 设置/创建用药提醒（重要！）
触发场景：用户明确要设置用药/吃药/喂药提醒，提到频次（每天几次、每几小时一次等）
关键词：用药提醒、吃药提醒、喂药、设置提醒、设个提醒、每天吃几次、每次吃XX、每天两次、一天三次、每隔X小时
示例：
- "设置一个每天两次的用药提醒" → medication_reminder (frequency=2)
- "帮球球设一个每天三次的吃药提醒" → medication_reminder (frequency=3, pet_name=球球)
- "每天喂两次药，早上一次晚上一次" → medication_reminder (frequency=2)
- "这个药一天吃三次，帮我设个提醒" → medication_reminder (frequency=3)
- "每隔8小时喂一次药，设个提醒" → medication_reminder (interval_hours=8)
- "旺财的皮肤病药膏每天涂两次" → medication_reminder (frequency=2, pet_name=旺财, disease=皮肤病)
- "每天两次蒙脱石散，提醒我" → medication_reminder (frequency=2, medications=["蒙脱石散"])
- "设置一个一天三次的喂药提醒" → medication_reminder (frequency=3)

data 字段:
{
  "pet_name": "string | null",         // 宠物名(没提则null,用当前选中宠物)
  "disease_name": "string | null",     // 疾病名称(如"湿疹""皮肤病""拉肚子")
  "medications": ["string"],           // 药物名称列表(如["蒙脱石散","益生菌"])
  "frequency": number | null,          // 每天频次(如2表示每天2次), 从"每天X次"/"一天X次"/"每天X遍"提取
  "interval_hours": number | null,     // 每次间隔小时数(如8表示每8小时一次), 与frequency二选一
  "total_doses": number | null,        // 总次数(如没说则默认7天*frequency)
  "notes": "string | null"            // 用户补充说明
}

**提取规则：**
- frequency: 优先从"每天X次""一天X次""每日X次""每X小时一次"中提取数字
- interval_hours: 如果说"每隔X小时""每X小时"则用此字段
- medications: 提到具体药名就记录，没提则留空(后续从病例获取)
- disease_name: 提到疾病名就记录，没提则留空
- 如果既没有 frequency 也没有 interval_hours，默认 frequency=3（一天三次是常见用药频率）
- **注意和 add_schedule 的区别**: add_schedule 是通用日程(打疫苗/洗澡等)，medication_reminder 专门针对"用药/吃药/喂药"，会写入用药提醒表并关联PWA推送

---

## ⭐ 复合意图处理规则（最重要！）

用户的**一句话可能包含多个意图**，你必须全部识别出来！

### 典型复合场景：

#### 场景A：健康 + 日程（最常见）
- "今天旺财拉肚子帮我记一下，顺便安排明天早上8点带它去复查"
  → [{health_record}, {add_schedule: 复查/体检}]
- "咪咪今天吐了两次，记一下然后提醒我后天带它看医生"
  → [{health_record}, {add_schedule: 体检}]
- "狗狗今天精神不好也不吃东西，可能生病了，帮我记着，明天上午去看病"
  → [{health_record}, {add_schedule: 体检}]

#### 场景B：添加宠物 + 健康记录
- "我刚领养了一只小土狗叫小白，它看起来有点瘦"
  → [{add_pet: 小白}, {health_record: 偏瘦}]

#### 场景C：多个日程
- "后天下午打疫苗，下周一还要驱虫，别忘了"
  → [{add_schedule: 疫苗}, {add_schedule: 驱虫}]

#### 场景D：健康 + 体重更新
- "旺财今天称了一下28斤，不过最近有点拉肚子"
  → [{update_weight: 28斤}, {health_record: 拉肚子}]

#### 场景E：信息更新 + 日程
- "咪咪改名叫小橘子了，然后提醒我周末给它洗澡"
  → [{update_info: 改名}, {add_schedule: 洗澡}]

#### 场景F：三个以上意图
- "今天给旺财称了25斤比上次胖了，它最近有点软便记一下，另外下周三预约体检"
  → [{update_weight: 25斤}, {health_record: 软便}, {add_schedule: 体检}]

### 关键词提示：
- "顺便""同时""还有""另外""也""再""然后""以及" → 后面通常跟着第二个意图
- "记一下""帮我记""记着""备注" → 触发 health_record 或 update_weight
- "安排""预约""提醒""别忘了""记得" → 触发 add_schedule
- "叫""名字""改名""改成" → 可能是 add_pet 或 update_info

---

## 时间解析规则
必须将相对时间转换为具体日期。今天是 ${getCurrentDate()} ${getWeekday()}。

- "今天" / "这会儿" → 今天
- "明天" / "明儿" → 今天 +1天
- "后天" → 今天 +2天
- "大后天" → 今天 +3天
- "下周X" → 下周对应星期
- "这周末" / "周末" → 本周六或周日（取较近的那个）
- "下周末" → 下周六日
- "X月X号" / "X号" → 具体日期
- "早上/上午" + 时间 → 当天 6-12点
- "中午" + 时间 → 当天 11-13点
- "下午" + 时间 → 当天 12-18点
- "晚上/傍晚" + 时间 → 当天 18-22点
- "凌晨/半夜" + 时间 → 当天 0-5点
- 如果只有时间段没有具体几点：
  - 早上/上午 → 默认 9:00
  - 中午 → 默认 12:00
  - 下午 → 默认 14:00
  - 晚上 → 默认 19:00
- 如果完全没说时间 → 默认明天上午10:00

输出 time 格式为 ISO 8601: "2024-06-21T14:00:00"

## 宠物匹配规则
当用户提供上下文中已有宠物时（见下方），用代词时要能匹配：
- "它""他""她""这家伙""小家伙" → 最近提到的或默认选中的宠物
- "我家狗""狗狗""狗子" → 匹配已有的狗
- "我家猫""猫咪""猫猫""主子" → 匹配已有的猫
- 如果有多个同种类宠物但无法确定哪个 → pet_name 设为 null，让前端处理

## 输出质量要求
1. confidence 必须 > 0.7 才输出该意图，否则丢弃
2. data 中不确定的字段填 null，不要猜
3. summary 用自然语言一句话概括所有操作，语气亲切
4. **严格只输出 JSON，绝对不要其他任何内容**
`;

function getCurrentDate(): string {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getWeekday(): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[new Date().getDay()];
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: '请提供有效的文本内容' }, { status: 400 });
    }

    console.log(`[Voice Extract v2] 输入: "${text.slice(0, 200)}"`);

    // 构建动态系统提示词
    const systemPrompt = EXTRACTION_SYSTEM_PROMPT
      .replace(/\$\{getCurrentDate\(\)\}/g, getCurrentDate())
      .replace(/\$\{getWeekday\(\)\}/g, getWeekday())
      .replace(/\$\{getCurrentTime\(\)\}/g, getCurrentTime());

    // 注入已有宠物上下文
    let finalSystemPrompt = systemPrompt;
    if (context?.pets && Array.isArray(context.pets) && context.pets.length > 0) {
      const petList = context.pets.map((p: any) =>
        `${p.name}(${p.species === 'dog' ? '🐕狗' : '🐱猫'}${p.breed ? ', ' + p.breed : ''})`
      ).join('、');
      finalSystemPrompt += `\n\n## 📋 用户已有的宠物：${petList}\n\n当用户用代词("它""这家伙")或泛指("我家狗""猫咪")时，优先从上面列表中匹配。`;
      
      if (context.selectedPetId) {
        const selected = context.pets.find((p: any) => p.id === context.selectedPetId);
        if (selected) {
          finalSystemPrompt += `\n\n## 🎯 当前选中宠物：${selected.name}`;
        }
      }
    }

    const response = await client.chat.completions.create({
      model: 'glm-4',
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 1500, // 加大以支持多个意图
    });

    let content = response.choices[0]?.message?.content?.trim() || '';
    console.log('[Voice Extract v2] LLM 原始输出:', content);

    // 清理可能的 markdown 包裹
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/g, '');

    // 解析 JSON
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseErr) {
      console.warn('[Voice Extract v2] JSON 解析失败，尝试修复:', parseErr);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 返回的内容无法解析为 JSON');
      }
    }

    // 兼容旧格式：如果是单个 intent 对象，包装成数组
    if (result.intent && !result.intents) {
      result = {
        intents: [{
          intent: result.intent,
          confidence: result.confidence || 0.8,
          data: result.data || {},
        }],
        summary: result.summary || `已识别到 ${result.intent} 操作`,
      };
    }

    // 过滤低置信度的意图
    if (result.intents && Array.isArray(result.intents)) {
      result.intents = result.intents.filter((i: any) => (i.confidence || 0) > 0.65);
    }

    console.log('[Voice Extract v2] ✅ 提取完成:', JSON.stringify(result));

    return NextResponse.json({
      success: true,
      originalText: text,
      extraction: result,
    });

  } catch (error: any) {
    console.error('[Voice Extract v2] 失败:', error);

    if (error.status === 401) return NextResponse.json({ error: 'AI服务认证失败' }, { status: 500 });
    if (error.status === 429) return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });

    return NextResponse.json({ error: `意图提取失败: ${error.message || '未知错误'}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '语音意图提取接口 v2 — 复合意图版',
    model: 'glm-4',
    version: 2,
    intents: ['add_pet', 'add_schedule', 'health_record', 'update_weight', 'update_info', 'query_pets', 'general_question', 'medication_reminder'],
    features: [
      '单句多意图识别',
      '自动时间解析',
      '宠物名称模糊匹配',
      '置信度过滤',
    ],
  });
}
