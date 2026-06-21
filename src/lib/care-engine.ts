/**
 * 主动关怀引擎
 * 根据季节、天气、节日生成关怀内容
 */

// 季节定义（按月份）
const SEASONS = {
  spring: { months: [3, 4, 5], name: '春季' },
  summer: { months: [6, 7, 8], name: '夏季' },
  autumn: { months: [9, 10, 11], name: '秋季' },
  winter: { months: [12, 1, 2], name: '冬季' },
};

// 季节关怀内容
const SEASONAL_CARE: Record<string, string[]> = {
  spring: [
    '春季是宠物换毛季，记得每天给宠物梳毛哦～',
    '春天万物复苏，也是寄生虫活跃的季节，别忘了驱虫！',
    '春季温差大，给宠物准备件小衣服保暖吧～',
    '春天带宠物去踏青是个不错的选择，注意避开草丛深处哦',
  ],
  summer: [
    '夏天要给宠物准备充足干净的饮用水，随时补充水分～',
    '中午高温时段尽量别出门，避免宠物中暑哦',
    '夏天宠物容易有体味，可以增加洗澡频率，但要使用专用沐浴露～',
    '冰垫虽然凉快，但容易引起感冒，建议用亚麻凉席～',
    '夏天是宠物皮肤病高发期，注意保持皮肤干燥～',
    '剃毛不一定能降温，反而容易晒伤，适度修剪就好',
  ],
  autumn: [
    '秋天天气转凉，是贴膘的好时节，注意控制食量哦～',
    '秋季也是驱虫的好时机，别忘了按时驱虫～',
    '秋高气爽，带宠物去户外活动吧！但要注意花粉过敏～',
    '换季时宠物容易掉毛，勤梳毛可以减少毛球症～',
    '秋天干燥，可以给宠物喂点润肺的食物，如梨汁～',
  ],
  winter: [
    '冬天给宠物准备保暖的窝，别让它们直接睡在地上～',
    '冬天不用给宠物剃毛，毛发是天然的保暖层～',
    '带宠物出门可以穿件小衣服，尤其是短毛犬～',
    '冬天宠物活动量减少，可以适当减少食量，避免肥胖～',
    '注意给宠物保暖，尤其是老年宠物的关节～',
    '冬天干燥，给宠物多喝水，室内可以开加湿器～',
  ],
};

// 护理小知识
const CARE_TIPS = [
  '每周用宠物专用纱布擦牙龈 2-3 次，可以预防牙结石哦～',
  '宠物耳朵要定期清理，尤其是垂耳品种，预防耳螨～',
  '定期修剪指甲，过长会影响宠物正常行走～',
  '宠物也需要社交，多带它们出去认识新朋友吧～',
  '给宠物刷牙可以预防口臭和口腔疾病，从小事做起～',
  '宠物玩具要定期清洗消毒，保持卫生～',
  '夏天记得给宠物做好驱虫，草丛里有很多寄生虫～',
  '定期检查宠物的毛发和皮肤，发现异常及时处理～',
  '宠物需要充足的睡眠，每天保证 12-14 小时～',
  '给宠物喂食要定时定量，养成良好的饮食习惯～',
];

// 天气关怀映射
const WEATHER_CARE: Record<string, string[]> = {
  sunny: [
    '今天天气晴朗，很适合带宠物出去玩耍哦～',
    '阳光明媚的好天气，快带宠物去户外运动吧！',
    '这么好的天气，别让宠物错过晒太阳的机会～',
  ],
  cloudy: [
    '今天多云，不冷不热，适合带宠物散步～',
    '阴天很适合户外活动，不会太晒也不会太热～',
  ],
  rainy: [
    '今天有雨，不太适合长时间户外活动，外出记得给宠物穿雨衣哦～',
    '雨天湿气重，注意保持宠物毛发干燥～',
    '下雨天可以在家和宠物玩些室内游戏，消耗它们的精力～',
  ],
  hot: [
    '今天很热！记得给宠物准备充足的饮用水，避免中暑～',
    '高温天气，中午尽量别带宠物出门，可以早晚凉爽时出去～',
    '天热的时候可以在宠物窝里放个冰凉的水垫～',
  ],
  cold: [
    '今天降温了，记得给宠物添加衣物保暖～',
    '天气转冷，别让宠物在室外待太久哦～',
    '冬天带宠物出门，回家后记得擦干爪子和毛发～',
  ],
  snowy: [
    '下雪啦！带宠物出去看雪要注意安全，别让它们喝雪水～',
    '雪天户外要注意保暖，给宠物穿件防水的小衣服吧～',
  ],
};

// 中国法定节日和传统节日
const FESTIVALS = [
  { name: '元旦', month: 1, day: 1, message: '新年的第一天，祝你和宠物新年快乐！' },
  { name: '春节', month: 1, dayRange: [25, 30], message: '春节到啦！给宠物也准备点好吃的年味吧～', isLunar: true },
  { name: '元宵节', month: 1, dayOffset: 15, message: '元宵节快乐！可以给宠物尝尝宠物汤圆哦～', isLunar: true },
  { name: '情人节', month: 2, day: 14, message: '情人节到了，你和宠物之间的爱最纯粹～' },
  { name: '龙抬头', month: 2, dayOffset: 2, message: '龙抬头！带宠物去修整一下毛发吧，新年新气象～', isLunar: true },
  { name: '妇女节', month: 3, day: 8, message: '女神节快乐！感谢家里的"小公主"陪伴～' },
  { name: '植树节', month: 3, day: 12, message: '春天来了，带宠物去户外感受大自然吧～' },
  { name: '清明节', month: 4, dayRange: [4, 6], message: '清明时节，踏青正当时～带宠物去郊外走走吧', isSolarTerm: true },
  { name: '劳动节', month: 5, day: 1, message: '劳动节假期，多陪陪家里的"小劳模"吧～' },
  { name: '青年节', month: 5, day: 4, message: '五四青年节，宠物永远是少年～' },
  { name: '儿童节', month: 6, day: 1, message: '儿童节到啦！宠物也是大朋友，送个小玩具吧～' },
  { name: '端午节', month: 5, dayOffset: 5, message: '端午节安康！记得给宠物准备粽子哦～', isLunar: true },
  { name: '父亲节', month: 6, dayOffset: 3, message: '父亲节快乐！带爸爸和宠物一起出去玩玩吧～', isSunday: true, week: 3 },
  { name: '母亲节', month: 5, dayOffset: 2, message: '母亲节到了，感谢妈妈和宠物的陪伴～', isSunday: true, week: 2 },
  { name: '七夕节', month: 8, day: 14, message: '七夕节，愿你和宠物之间的感情甜甜蜜蜜～' },
  { name: '中秋节', month: 8, dayOffset: 15, message: '中秋节快乐！可以给宠物尝尝宠物月饼哦～', isLunar: true },
  { name: '教师节', month: 9, day: 10, message: '教师节，感谢教会我们爱的宠物～' },
  { name: '国庆节', month: 10, day: 1, message: '国庆节快乐！七天假期带宠物去旅行吧～' },
  { name: '重阳节', month: 9, dayOffset: 9, message: '重阳节，登高望远，别忘了带宠物也动起来～', isLunar: true },
  { name: '万圣节', month: 10, day: 31, message: '万圣节来啦！可以给宠物打扮一下哦～' },
  { name: '感恩节', month: 11, day: 28, message: '感恩节，感谢这一年宠物带来的快乐～' },
  { name: '圣诞节', month: 12, day: 25, message: '圣诞节到啦！给宠物准备一份小礼物吧～' },
  { name: '跨年夜', month: 12, day: 31, message: '明天就是新的一年啦！感谢宠物又一年的陪伴～' },
];

// 消暑食谱
const SUMMER_RECIPES = [
  '🐔 鸡胸肉西瓜冰：把煮熟的鸡胸肉和西瓜肉冷冻后给宠物吃，清凉又营养～',
  '🍌 香蕉酸奶冰棍：把香蕉和酸奶混合冷冻，是夏天的完美零食～',
  '🍉 西瓜肉丁：西瓜去籽切小块，直接喂食或冷冻一下～',
  '🧊 肉汤冰块：用低盐鸡汤冻成冰块，让宠物舔着吃～',
  '🥒 黄瓜冰条：黄瓜切片冷冻，脆脆的口感宠物很喜欢～',
];

// 冬季食谱
const WINTER_RECIPES = [
  '🍲 暖心鸡肉粥：煮熟的鸡胸肉切碎加白粥，温热喂养～',
  '🥩 羊肉炖萝卜：温补的羊肉配上胡萝卜，冬天暖身又营养～',
  '🍳 鸡蛋南瓜泥：蒸熟的南瓜和鸡蛋黄混合，补充能量～',
  '🥩 牛肉胡萝卜汤：温热的牛肉汤可以帮助宠物暖胃～',
];

/**
 * 获取当前季节
 */
export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  for (const [key, season] of Object.entries(SEASONS)) {
    if (season.months.includes(month)) {
      return key;
    }
  }
  return 'spring';
}

/**
 * 获取季节名称
 */
export function getSeasonName(): string {
  return (SEASONS as Record<string, { months: number[]; name: string }>)[getCurrentSeason()].name;
}

/**
 * 随机获取季节关怀语
 */
export function getSeasonalCareTip(): string {
  const tips = SEASONAL_CARE[getCurrentSeason()] || SEASONAL_CARE.spring;
  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * 随机获取护理小知识
 */
export function getCareTip(): string {
  return CARE_TIPS[Math.floor(Math.random() * CARE_TIPS.length)];
}

/**
 * 根据天气代码获取关怀语
 * weatherCode: sunny, cloudy, rainy, hot, cold, snowy
 */
export function getWeatherCare(weatherCode: string): string {
  const cares = WEATHER_CARE[weatherCode] || [];
  if (cares.length === 0) return '';
  return cares[Math.floor(Math.random() * cares.length)];
}

/**
 * 检测今天是否是节日
 */
export function getTodayFestival(): { name: string; message: string } | null {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();

  for (const festival of FESTIVALS) {
    // 精确日期匹配
    if (festival.month === month && festival.day === date) {
      return { name: festival.name, message: festival.message };
    }
    
    // 节日范围匹配（如清明节4月4-6日）
    if (festival.month === month && festival.dayRange && 
        date >= festival.dayRange[0] && date <= festival.dayRange[1]) {
      return { name: festival.name, message: festival.message };
    }
  }

  return null;
}

/**
 * 检测明天是否是节日
 */
export function getTomorrowFestival(): { name: string; message: string } | null {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = tomorrow.getMonth() + 1;
  const date = tomorrow.getDate();

  for (const festival of FESTIVALS) {
    if (festival.month === month && festival.day === date) {
      return { name: festival.name, message: festival.message };
    }
  }

  return null;
}

/**
 * 获取季节食谱推荐
 */
export function getSeasonalRecipe(): string {
  const season = getCurrentSeason();
  
  if (season === 'summer') {
    const recipe = SUMMER_RECIPES[Math.floor(Math.random() * SUMMER_RECIPES.length)];
    return `🍽️ 夏季食谱推荐：\n${recipe}`;
  } else if (season === 'winter') {
    const recipe = WINTER_RECIPES[Math.floor(Math.random() * WINTER_RECIPES.length)];
    return `🍲 冬季暖心食谱：\n${recipe}`;
  }
  
  return '';
}

/**
 * 生成任务完成后的关怀语
 */
export function generateCareMessage(weatherInfo?: { code: string; temp?: number }): string {
  const parts: string[] = [];
  
  // 1. 先加天气关怀
  if (weatherInfo) {
    const weatherCare = getWeatherCare(weatherInfo.code);
    if (weatherCare) {
      parts.push(weatherCare);
    }
  }
  
  // 2. 再加季节小贴士（随机）
  if (Math.random() > 0.5) {
    const seasonalTip = getSeasonalCareTip();
    parts.push(`💡 ${seasonalTip}`);
  }
  
  // 3. 偶尔推送食谱（夏天/冬天且天气热/冷时）
  if (weatherInfo && (weatherInfo.code === 'hot' || weatherInfo.code === 'cold') && Math.random() > 0.6) {
    const recipe = getSeasonalRecipe();
    if (recipe) {
      parts.push(recipe);
    }
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n') : '';
}

/**
 * 生成每日健康播报
 */
export function generateDailyBriefing(weatherInfo?: { code: string; temp?: number; desc?: string }): string {
  const parts: string[] = [];
  const seasonName = getSeasonName();
  
  parts.push(`☀️ 早安！`);
  parts.push(`\n${seasonName}季节，要好好照顾自己和宠物哦～`);
  
  // 天气信息
  if (weatherInfo) {
    const weatherCare = getWeatherCare(weatherInfo.code);
    if (weatherCare) {
      parts.push(`\n${weatherCare}`);
    }
  }
  
  // 今日节日
  const festival = getTodayFestival();
  if (festival) {
    parts.push(`\n🎉 今天是${festival.name}！${festival.message}`);
  }
  
  // 节日预告
  const tomorrowFestival = getTomorrowFestival();
  if (tomorrowFestival) {
    parts.push(`\n📅 明天是${tomorrowFestival.name}哦，记得提前准备～`);
  }
  
  // 季节食谱推荐
  if (weatherInfo && (weatherInfo.code === 'hot' || weatherInfo.code === 'cold')) {
    const recipe = getSeasonalRecipe();
    if (recipe) {
      parts.push(`\n${recipe}`);
    }
  }
  
  // 护理小知识
  parts.push(`\n${getCareTip()}`);
  
  return parts.join('');
}

/**
 * 生成每周健康周报
 */
export function generateWeeklyReport(data: {
  petName: string;
  exerciseDays: number;
  totalExercise: number; // 总时长(分钟)
  exerciseTrend: number; // 百分比，正数表示增加
  totalDistance?: number; // 总距离(km)
  weightChange: number; // 体重变化（kg），正数表示增加
  weightChangePercent?: number; // 体重变化百分比
  weightAlert?: string; // 体重警告信息
  medicationsCount: number;
  healthRecordsCount: number;
  analysisCount: number;
}): string {
  const { petName, exerciseDays, totalExercise, exerciseTrend, weightChange, weightChangePercent = 0, weightAlert, medicationsCount, healthRecordsCount, analysisCount, totalDistance } = data;
  
  const trendEmoji = exerciseTrend > 0 ? '📈' : exerciseTrend < 0 ? '📉' : '➡️';
  const trendText = exerciseTrend > 0 ? '比上周增加' : exerciseTrend < 0 ? '比上周减少' : '与上周持平';
  
  let report = `📊 ${petName} 的每周健康报告\n`;
  report += '━━━━━━━━━━━━━━━━━\n\n';
  
  // 运动数据
  report += `🏃 运动情况\n`;
  report += `   本周运动 ${exerciseDays} 天，共 ${totalExercise} 分钟`;
  if (totalDistance && totalDistance > 0) {
    report += `，累计 ${(totalDistance).toFixed(1)} 公里`;
  }
  report += `\n   ${trendEmoji} ${trendText} ${Math.abs(exerciseTrend)}%\n\n`;
  
  // 体重数据
  report += `⚖️ 体重变化\n`;
  if (weightChangePercent !== 0) {
    const changeStr = weightChange >= 0 ? `+${weightChange.toFixed(2)}kg` : `${weightChange.toFixed(2)}kg`;
    report += `   体重变化：${changeStr} (${weightChangePercent > 0 ? '+' : ''}${weightChangePercent}%)\n`;
    report += `   正常范围：±2-3%/周\n`;
    
    if (weightAlert) {
      // 提取警告信息中的文字（去掉emoji）
      const alertText = weightAlert.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      report += `   ${weightAlert}\n`;
    } else if (Math.abs(weightChangePercent) <= 2) {
      report += `   ✅ 体重稳定，继续保持！\n`;
    } else if (Math.abs(weightChangePercent) <= 3) {
      report += `   📌 体重变化略大，注意观察。\n`;
    }
  } else if (weightChange !== 0 && Math.abs(weightChange) > 0.01) {
    // 有变化量但百分比可能为0（整数kg情况）
    const changeStr = weightChange > 0 ? `+${weightChange.toFixed(2)}kg` : `${weightChange.toFixed(2)}kg`;
    report += `   体重${weightChange > 0 ? '上升' : '下降'}了 ${changeStr}\n`;
  } else {
    report += `   暂无体重对比数据，请记录更多体重数据～\n`;
  }
  report += '\n';
  
  // 健康记录
  if (medicationsCount > 0 || healthRecordsCount > 0 || analysisCount > 0) {
    report += `📋 健康记录\n`;
    if (medicationsCount > 0) report += `   💊 用药提醒 ${medicationsCount} 次\n`;
    if (healthRecordsCount > 0) report += `   🏥 就医记录 ${healthRecordsCount} 条\n`;
    if (analysisCount > 0) report += `   🔍 健康分析 ${analysisCount} 次\n`;
    report += '\n';
  }
  
  // 护理建议
  report += `💡 ${getSeasonalCareTip()}\n\n`;
  
  // 周日结尾
  report += '━━━━━━━━━━━━━━━━━\n';
  report += '🌟 新的一周，继续加油！';
  
  return report;
}
