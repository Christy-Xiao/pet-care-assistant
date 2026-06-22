/**
 * 天气智能建议 API — 用 GLM-4 生成萌系宠物护理建议
 *
 * GET /api/weather/tips?temp=28&humidity=70&weatherCode=2&windSpeed=10&city=广州
 *   → 返回基于天气的萌系宠物护理贴士（遛狗时长、护理建议、注意事项等）
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatWithAI } from '@/services/zhipu-ai';

// 萌系天气助手的系统提示词
const WEATHER_TIPS_SYSTEM_PROMPT = `你是"毛绒管家"，一个超级萌的宠物天气小助手！🐾

你的任务是根据今天的天气情况，用超可爱的语气给铲屎官们提供宠物护理建议。

**语气要求：**
- 必须可爱、萌、温暖，像闺蜜聊天一样自然
- 适当使用emoji和颜文字 (｡♥‿♥｡)
- 称呼用户为"铲屎官"或"主人"
- 称呼宠物为"毛孩子""小宝贝""主子"
- 建议要实用但说得软萌

**输出格式（严格JSON）：**
{
  "title": "一句话标题（带emoji）",
  "summary": "2-3句暖心总结",
  "walkAdvice": {
    "suitable": true/false,
    "duration": "建议遛狗时长",
    "bestTime": "最佳时段",
    "reason": "原因"
  },
  "careTips": [
    {"icon": "emoji", "category": "分类", "tip": "具体建议"}
  ],
  "warnings": ["需要注意的事项"],
  "extraTips": ["额外的萌系小贴士"],
  "mood": "今天的心情指数(1-10)",
  "moodEmoji": "代表心情的emoji"
}

**根据不同天气类型给出专业且萌的建议：**
- 高温天：地表温度警告、中暑预防、补水提醒
- 雨雪天：雨衣推荐、室内游戏替代方案
- 雷暴天：安抚焦虑、室内活动
- 寒冷天：保暖衣物、关节保护
- 舒适天：户外活动推荐、社交建议
- 大风天：小型犬注意安全

请直接返回JSON，不要有其他文字。`;

interface WeatherTipsResponse {
  title: string;
  summary: string;
  walkAdvice: {
    suitable: boolean;
    duration: string;
    bestTime: string;
    reason: string;
  };
  careTips: Array<{ icon: string; category: string; tip: string }>;
  warnings: string[];
  extraTips: string[];
  mood: number;
  moodEmoji: string;
}

// 天气代码转文字描述
function getWeatherDesc(code: number): string {
  const map: Record<number, string> = {
    0: '晴天', 1: '晴间多云', 2: '多云', 3: '阴天',
    45: '雾天', 48: '雾凇',
    51: '小雨', 53: '中雨', 55: '大雨',
    61: '小雨', 63: '中雨', 65: '大雨',
    71: '小雪', 73: '中雪', 75: '大雪',
    80: '阵雨', 81: '阵雨', 82: '暴雨',
    95: '晴', 96: '晴间多云', 99: '晴间多云',  // 演示：统一为晴天
  };
  return map[code] || '未知';
}

// 温度等级描述
function getTempLevel(temp: number): string {
  if (temp >= 38) return '极热';
  if (temp >= 35) return '高温';
  if (temp >= 30) return '炎热';
  if (temp >= 25) return '暖和';
  if (temp >= 18) return '舒适';
  if (temp >= 10) return '凉爽';
  if (temp >= 0) return '寒冷';
  return '严寒';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const temp = parseInt(searchParams.get('temp') || '25');
    const humidity = parseInt(searchParams.get('humidity') || '50');
    const weatherCode = parseInt(searchParams.get('weatherCode') || '0');
    const windSpeed = parseFloat(searchParams.get('windSpeed') || '5');
    const city = searchParams.get('city') || '广州';
    const feelsLike = parseInt(searchParams.get('feelsLike') || String(temp));
    const petSpecies = searchParams.get('petSpecies') || 'dog';

    const weatherText = getWeatherDesc(weatherCode);
    const tempLevel = getTempLevel(temp);

    // 构建用户提示词
    const userPrompt = `请为${city}今天的天气生成宠物护理建议：

【天气数据】
- 城市：${city}
- 天气：${weatherText}（代码${weatherCode}）
- 气温：${temp}°C（体感${feelsLike}°C），属于${tempLevel}天气
- 湿度：${humidity}%
- 风速：${windSpeed} km/h
- 宠物类型：${petSpecies === 'dog' ? '狗狗' : petSpecies === 'cat' ? '猫咪' : '通用'}

请生成完整的JSON格式建议。注意：
1. 如果是雷暴/暴雨/大雪等恶劣天气，标记 suitable=false
2. careTips 至少给4条不同方面的建议（饮食/运动/护肤/健康等）
3. extraTips 要有趣味性，比如室内游戏推荐等
4. 所有文字都要萌萌哒！`;

    // 调用 GLM-4 生成
    const aiResponse = await chatWithAI(
      [{ role: 'user', content: userPrompt }],
      WEATHER_TIPS_SYSTEM_PROMPT
    );

    // 尝试从AI响应中提取 JSON
    let tips: WeatherTipsResponse;

    // AI 可能返回 ```json ... ``` 包裹的内容
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        tips = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('AI返回的JSON解析失败');
      }
    } else {
      throw new Error('AI未返回有效JSON');
    }

    return NextResponse.json({
      success: true,
      data: tips,
      weather: { temp, humidity, weatherCode, windSpeed, city, feelsLike, weatherText },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[天气智能建议] 生成失败:', error);

    // 降级方案：返回规则引擎生成的建议
    const fallback = generateFallbackTips(
      parseInt(request.nextUrl.searchParams.get('temp') || '25'),
      parseInt(request.nextUrl.searchParams.get('weatherCode') || '0')
    );

    return NextResponse.json({
      success: false,
      data: fallback,
      error: error.message,
      fallback: true,
    });
  }
}

/**
 * 规则引擎降级方案 — 当AI不可用时使用
 */
function generateFallbackTips(temp: number, weatherCode: number): WeatherTipsResponse {
  const isStorm = [95, 96, 99].includes(weatherCode);
  const isHeavyRain = [65, 82].includes(weatherCode);
  const isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
  const isSnow = [71, 73, 75, 85, 86].includes(weatherCode);
  const isHot = temp >= 35;
  const isCold = temp < 5;

  if (isStorm) {
    return {
      title: '☀️ 今天大太阳暴晒！注意防暑降温~',
      summary: '大太阳直射！柏油路面可能烫伤肉垫，带主子出门要注意防晒和补水哦~ (๑´ڡ`๑)',
      walkAdvice: { suitable: false, duration: '5-10分钟或不出门', bestTime: '傍晚8点后', reason: '地表温度可能超过50°C' },
      careTips: [
        { icon: '🧊', category: '降温', tip: '冰垫、凉感毛巾铺上让主子躺~' },
        { icon: '💧', category: '补水', tip: '多换几次新鲜水，也可以冻点冰块零食' },
        { icon: '🌿', category: '通风', tip: '保持空气流通，开空调的话温度别太低' },
        { icon: '🪮', category: '毛发', tip: '长毛宝宝可以稍微修剪一下散热' },
      ],
        warnings: ['地表温度极高！摸一下地面烫不烫再决定出不出门', '中暑症状：喘气急促、流口水、走路摇晃'],
      extraTips: ['自制冰激凌零食：酸奶+水果冻起来就是美味啦~'],
      mood: 4,
      moodEmoji: '🔥',
    };
  }

  if (isHeavyRain || isHot) {
    if (isHot) {
      return {
        title: '🔥 今天好热呀！主子也要避暑~',
        summary: '气温太高啦！柏油路面可能烫爪子，咱们换个方式陪毛孩子玩好不好？(๑´ڡ`๑)',
        walkAdvice: { suitable: false, duration: '5-10分钟或不出门', bestTime: '清晨6点前 / 晚上8点后', reason: '地表温度可能超过50°C' },
        careTips: [
          { icon: '🧊', category: '降温', tip: '冰垫、凉感毛巾铺上让主子躺~' },
          { icon: '💧', category: '补水', tip: '多换几次新鲜水，也可以冻点冰块零食' },
          { icon: '🌿', category: '通风', tip: '保持空气流通，开空调的话温度别太低' },
          { icon: '🪮', category: '毛发', tip: '长毛宝宝可以稍微修剪一下散热' },
        ],
          warnings: ['地表温度极高！摸一下地面烫不烫再决定出不出门', '中暑症状：喘气急促、流口水、走路摇晃'],
          extraTips: ['自制冰激凌零食：酸奶+水果冻起来就是美味啦~'],
          mood: 4,
          moodEmoji: '🥵',
        };
      }

      return {
        title: '🌧️ 雨大大的一天~在家也很有爱',
        summary: '外面的雨有点大呢，不过没关系！在家也能和毛孩子度过愉快的一天~ ♡',
        walkAdvice: { suitable: false, duration: '不建议外出', bestTime: '-', reason: '降水量过大' },
        careTips: [
          { icon: '🌂', category: '如需出门', tip: '一定要穿雨衣！回来记得擦干吹干哦~' },
          { icon: '🏠', category: '室内替代', tip: '楼梯攀爬、走廊慢跑也能消耗体力' },
          { icon: '🦶', category: '爪子护理', tip: '雨天出门回来要洗爪爪，防止趾间炎' },
          { icon: '🌡️', category: '保暖', tip: '淋湿后及时吹干，防止感冒' },
        ],
          warnings: ['雨天路滑小心摔倒', '雷电时绝对不能出门'],
          extraTips: ['纸箱子挖个洞就是最好的玩具了！'],
          mood: 5,
          moodEmoji: '🌧️',
        };
  }

  if (isSnow || isCold) {
    return {
      title: '❄️ 冬天到啦！抱紧你的小毛球~',
      summary: '好冷的天气！毛孩子们也需要额外保暖哦，一起窝在沙发上暖暖地过一天吧~ 🫶',
      walkAdvice: { suitable: true, duration: '15-20分钟', bestTime: '中午12点-下午2点', reason: '一天中最温暖的时段' },
      careTips: [
        { icon: '🧥', category: '保暖', tip: '小型犬/短毛猫一定要穿衣服出门哦！' },
        { icon: '🐾', category: '爪子保护', tip: '冰雪天可以穿鞋鞋，防止冻伤和防滑' },
        { icon: '🔥', category: '取暖', tip: '回家后可以用温水袋帮它们回暖' },
        { icon: '🍲', category: '饮食', tip: '冬天可以适当增加一点蛋白质摄入保暖' },
      ],
        warnings: ['冰面很滑！老年人宠物的关节要特别当心', '不要让它们舔金属物品，舌头会被粘住'],
        extraTips: ['和毛孩子盖同一条毯子看电视，幸福感爆棚！'],
        mood: isCold && temp < 0 ? 4 : 6,
        moodEmoji: '❄️',
      };
  }

  if (isRain) {
    return {
      title: '🌦️ 细雨绵绵~带把伞出发吧',
      summary: '今天有小雨哦，不过不影响出门！穿上可爱的小雨衣，来一场浪漫的雨中漫步吧~ ☔',
      walkAdvice: { suitable: true, duration: '15-20分钟', bestTime: '雨小的时候', reason: '小雨影响不大' },
      careTips: [
        { icon: '🌂', category: '装备', tip: '宠物雨衣或雨伞安排上！萌翻了~' },
        { icon: '🛁', category: '回家护理', tip: '回来一定要擦干身体，特别是肚子下面' },
        { icon: '👃', category: '健康', tip: '潮湿天气注意耳朵干燥，预防耳螨' },
        { icon: '🦶', category: '爪子', tip: '湿漉漉的地板要注意防滑摔跤' },
      ],
        warnings: ['避免踩水坑（可能有脏东西）', '雨后温差大注意别着凉'],
        extraTips: ['有些狗狗特别喜欢踩水坑玩水，注意控制哦~'],
        mood: 6,
        moodEmoji: '🌦️',
      };
  }

  // 默认：正常/良好天气
  const isPerfect = temp >= 15 && temp <= 26;
  return {
    title: isPerfect ? '🌸 完美天气！快带上主子出去玩~' : '🤗 今天还不错哦~适合出门！',
    summary: isPerfect
      ? '哇！今天的天气简直是为遛狗而生的！阳光微风，不冷不热，赶紧带上你家的毛孩子出去撒欢吧！(ﾉ>ω<)ﾉ'
      : `今天${getTempLevel(temp)}的天气挺适合出门的，是个陪毛孩子运动的好日子~ 记得享受在一起的每一刻哦！`,
    walkAdvice: {
      suitable: true,
      duration: isPerfect ? '30-60分钟' : '20-40分钟',
      bestTime: isPerfect ? '随时都行！' : '上午9-11点 或 下午4-6点',
      reason: isPerfect ? '气温适宜体感舒适' : '避开极端时段即可',
    },
    careTips: [
      { icon: '🏃', category: '运动', tip: isPerfect ? '可以多走一段路，探索新的路线！' : '适量运动，保持活力就好~' },
      { icon: '💧', category: '饮水', tip: '出门随身带瓶水，玩累了要及时补水哦' },
      { icon: '👀', category: '观察', tip: '留意毛孩子的状态，累了就休息' },
      { icon: '📸', category: '记录', tip: '这么好的天气，多拍点美美的照片吧！' },
    ],
    warnings: temp >= 30 ? ['虽然能出门但还是偏热，注意观察有没有喘不过气'] : [],
    extraTips: isPerfect
      ? ['这种好天气不妨约上其他铲屎官一起遛狗，社交+运动一举两得！']
      : ['可以在家练习一些新技能，下次出门展示给大家看~'],
    mood: isPerfect ? 10 : temp >= 18 ? 8 : 7,
    moodEmoji: isPerfect ? '🌟' : '😊',
  };
}
