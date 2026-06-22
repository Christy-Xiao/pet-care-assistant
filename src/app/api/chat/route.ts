import { NextRequest, NextResponse } from 'next/server';
import { ZhipuAI } from 'zhipuai';
import { query, insert } from '@/lib/db';
import { 
  initChatMemoryTable, 
  initUserLongTermMemoryTable,
  saveChatMemory, 
  getChatMemory, 
  getUserMemorySummary,
  generateSessionId,
  extractKeyMemories,
  detectAndUpdatePetAllergy,
  extractMemoriesWithAI
} from '@/lib/chatMemory';
import { 
  getPublicIP, 
  getLocationByIP, 
  getCurrentWeather, 
  getWeatherAlerts, 
  getWalkSuggestion 
} from '@/services/weather';

// 获取宠物病例历史
async function getPetMedicalHistory(petId: string): Promise<any[]> {
  try {
    const records: any[] = await query(
      'SELECT * FROM medical_records WHERE pet_id = ? ORDER BY detected_date DESC LIMIT 10',
      [petId]
    );
    return records.map(r => ({
      ...r,
      medications: typeof r.medications === 'string' ? JSON.parse(r.medications) : r.medications,
      treatment_plan: r.treatment_plan && typeof r.treatment_plan === 'string' ? JSON.parse(r.treatment_plan) : r.treatment_plan,
    }));
  } catch {
    return [];
  }
}

// 获取健康记录表中的就诊/医疗相关记录
async function getHealthRecordsMedical(petId: string, days: number = 30): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 查询所有医疗相关的 type: other（就诊记录默认值）, medication, checkup, surgery
    const records: any[] = await query(
      `SELECT * FROM health_records 
       WHERE pet_id = ? AND type IN ('other', 'medication', 'checkup', 'surgery')
       AND DATE(created_at) >= ?
       ORDER BY created_at DESC`,
      [petId, startDateStr]
    );
    return records.map(r => ({
      ...r,
      medications: r.medications && typeof r.medications === 'string' ? JSON.parse(r.medications) : r.medications,
      result: r.result && typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
      detected_date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null,
    }));
  } catch {
    return [];
  }
}

// 获取所有健康记录（包括医疗类型）
async function getAllHealthRecords(petId: string, days: number = 7): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const records: any[] = await query(
      `SELECT * FROM health_records 
       WHERE pet_id = ? AND DATE(created_at) >= ?
       ORDER BY created_at DESC`,
      [petId, startDateStr]
    );
    return records.map(r => ({
      ...r,
      medications: r.medications && typeof r.medications === 'string' ? JSON.parse(r.medications) : r.medications,
      result: r.result && typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
      detected_date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : null,
    }));
  } catch {
    return [];
  }
}

// 获取用药提醒
async function getMedicationReminders(petId: string): Promise<any[]> {
  try {
    const reminders: any[] = await query(
      'SELECT * FROM medication_reminders WHERE pet_id = ? AND status = "active" ORDER BY next_dose_time ASC',
      [petId]
    );
    return reminders.map(r => ({
      ...r,
      medications: typeof r.medications === 'string' ? JSON.parse(r.medications) : r.medications,
      treatment_plan: r.treatment_plan && typeof r.treatment_plan === 'string' ? JSON.parse(r.treatment_plan) : r.treatment_plan,
    }));
  } catch {
    return [];
  }
}

// 获取最近N天的体重记录
async function getRecentWeightRecords(petId: string, days: number = 7): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const records: any[] = await query(
      'SELECT * FROM weight_records WHERE pet_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC',
      [petId, startDateStr]
    );
    return records;
  } catch {
    return [];
  }
}

// 获取最近N天的饮食记录
async function getRecentDietRecords(petId: string, days: number = 7): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const records: any[] = await query(
      'SELECT * FROM diet_records WHERE pet_id = ? AND record_date >= ? ORDER BY record_date DESC',
      [petId, startDateStr]
    );
    return records;
  } catch {
    return [];
  }
}

// 获取最近N天的排泄记录
async function getRecentBathroomRecords(petId: string, days: number = 7): Promise<any[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const records: any[] = await query(
      'SELECT * FROM bathroom_records WHERE pet_id = ? AND record_date >= ? ORDER BY record_date DESC',
      [petId, startDateStr]
    );
    return records;
  } catch {
    return [];
  }
}

// 生成健康分析报告
async function generateHealthReport(pet: any, medicalRecords: any[], healthRecords: any[] = []): Promise<string> {
  const days = 7;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // 获取最近7天的数据
  const weightRecords = await getRecentWeightRecords(pet.id, days);
  const dietRecords = await getRecentDietRecords(pet.id, days);
  const bathroomRecords = await getRecentBathroomRecords(pet.id, days);
  
  // 宠物种类和年龄
  const speciesName = pet.species === 'dog' ? '狗狗' : pet.species === 'cat' ? '猫咪' : '宠物';
  const ageInfo = pet.age ? `${pet.age}岁` : (pet.date_of_birth || '年龄未知');
  
  // 1. 阶段概览
  const uniqueWeightDays = new Set(weightRecords.map(r => r.recorded_at)).size;
  const uniqueDietDays = new Set(dietRecords.map(r => r.record_date)).size;
  const uniqueBathroomDays = new Set(bathroomRecords.map(r => r.record_date)).size;
  
  // 检查是否有异常（同时检查 medical_records 和 health_records）
  const hasAbnormalRecords = medicalRecords.some(r => 
    r.status === 'active' && r.severity && ['moderate', 'severe', 'mild'].includes(r.severity)
  ) || healthRecords.some(r => r.type === 'medical');
  
  // 2. 体重趋势分析
  let weightAnalysis = '';
  if (weightRecords.length >= 2) {
    const sortedWeights = [...weightRecords].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const firstWeight = sortedWeights[0]!.weight;
    const lastWeight = sortedWeights[sortedWeights.length - 1]!.weight;
    const weightChange = lastWeight - firstWeight;
    const weightChangePercent = ((weightChange / firstWeight) * 100).toFixed(1);
    
    const changeType = weightChange > 0 ? '增重' : weightChange < 0 ? '减重' : '持平';
    const changeAmount = Math.abs(weightChange).toFixed(2);
    
    weightAnalysis = `体重趋势：7天内体重从${firstWeight}kg变化至${lastWeight}kg，${changeType}${changeAmount}kg（${changeType.includes('减') ? '降' : '增'}幅达${weightChangePercent}%)。`;
    
    // 临床显著性判断
    const absPercent = Math.abs(parseFloat(weightChangePercent));
    if (absPercent >= 2) {
      const isSignificant = weightChange < 0 ? 
        '在短短一周内体重下降超过原体重的2%-3%属于临床显著下降，通常暗示存在基础性疾病或摄入严重不足。' :
        '在短短一周内体重上升超过原体重的2%-3%属于临床显著上升，需要关注食物摄入量是否过多。';
      weightAnalysis += `\n⚠️ ${isSignificant}`;
    } else {
      weightAnalysis += '\n✅ 体重变化在正常范围内。';
    }
  } else if (weightRecords.length === 1) {
    weightAnalysis = `体重趋势：7天内仅有1次体重记录，当前体重为${weightRecords[0]!.weight}kg。建议持续记录以便观察体重变化趋势。`;
  } else {
    weightAnalysis = '体重趋势：本周暂无体重记录，建议定期记录体重以跟踪健康状况。';
  }
  
  // 3. 饮食分析
  let dietAnalysis = '';
  if (dietRecords.length > 0) {
    const mealCounts: Record<string, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    dietRecords.forEach(r => {
      const mealType = String(r.meal_type);
      if (mealCounts[mealType] !== undefined) {
        mealCounts[mealType]++;
      }
    });
    
    const totalMeals = dietRecords.length;
    const uniqueFoods = Array.from(new Set(dietRecords.map(r => r.food_name)));
    
    dietAnalysis = `饮食记录：7天内共${uniqueDietDays}天有饮食记录，累计${totalMeals}次用餐。`;
    dietAnalysis += `\n📊 餐次分布：早${mealCounts.breakfast}次、午${mealCounts.lunch}次、晚${mealCounts.dinner}次、零食${mealCounts.snack}次。`;
    
    if (uniqueFoods.length <= 3) {
      dietAnalysis += `\n🍽️ 主要食物：${uniqueFoods.join('、')}`;
    } else {
      dietAnalysis += `\n🍽️ 主要食物：${uniqueFoods.slice(0, 3).join('、')}等${uniqueFoods.length}种`;
    }
    
    // 评估饮食规律性
    if (uniqueDietDays >= 5 && mealCounts.breakfast >= 5 && mealCounts.dinner >= 5) {
      dietAnalysis += '\n✅ 饮食规律性良好。';
    } else if (uniqueDietDays < 3) {
      dietAnalysis += '\n⚠️ 饮食记录较少，建议加强记录以便更好地跟踪营养摄入。';
    }
  } else {
    dietAnalysis = '饮食记录：本周暂无饮食记录，建议记录每日饮食以便跟踪营养状况。';
  }
  
  // 4. 排泄分析
  let bathroomAnalysis = '';
  if (bathroomRecords.length > 0) {
    const solidCount = bathroomRecords.filter(r => r.type === 'solid' || r.type === 'both').length;
    const liquidCount = bathroomRecords.filter(r => r.type === 'liquid' || r.type === 'both').length;
    const sizeDistribution = bathroomRecords.filter(r => r.size);
    
    bathroomAnalysis = `排泄记录：7天内共${uniqueBathroomDays}天有记录，累计${bathroomRecords.length}次。`;
    bathroomAnalysis += `\n💩 大便${solidCount}次、💧小便${liquidCount}次。`;
    
    if (sizeDistribution.length > 0) {
      const sizeCounts: Record<string, number> = { small: 0, medium: 0, large: 0 };
      sizeDistribution.forEach((r: any) => {
        const sz = String(r.size);
        if (sizeCounts[sz] !== undefined) {
          sizeCounts[sz]++;
        }
      });
      bathroomAnalysis += `\n📊 排便量级：大量${sizeCounts.large}次、中量${sizeCounts.medium}次、小量${sizeCounts.small}次。`;
    }
    
    // 评估排泄规律
    if (uniqueBathroomDays >= 5) {
      bathroomAnalysis += '\n✅ 排泄规律性良好。';
    } else if (uniqueBathroomDays < 3) {
      bathroomAnalysis += '\n⚠️ 排泄记录较少，建议加强记录。';
    }
  } else {
    bathroomAnalysis = '排泄记录：本周暂无排泄记录，建议记录以便跟踪消化系统健康。';
  }
  
  // 5. 病例/就医分析
  let medicalAnalysis = '';
  
  // 从 medical_records 获取本周记录
  const recentMedicalRecords = medicalRecords.filter(r => {
    const recordDate = new Date(r.detected_date);
    return recordDate >= startDate;
  });
  
  // 从 health_records 获取本周就诊记录（type 为 other/medication/checkup/surgery）
  const recentHealthRecords = healthRecords.filter(r => 
    ['other', 'medication', 'checkup', 'surgery'].includes(r.type) && r.detected_date && new Date(r.detected_date) >= startDate
  );
  
  // 合并并排序所有记录
  const allRecentRecords = [
    ...recentMedicalRecords.map(r => ({ ...r, source: 'medical_records' })),
    ...recentHealthRecords.map(r => ({ ...r, source: 'health_records' }))
  ].sort((a, b) => new Date(b.detected_date || 0).getTime() - new Date(a.detected_date || 0).getTime());
  
  if (allRecentRecords.length > 0) {
    medicalAnalysis = `📋 就医记录：本周有以下就诊记录：\n`;
    allRecentRecords.forEach(record => {
      const meds = record.medications || [];
      const recordName = record.disease_name || record.title || '就诊记录';
      const recordDate = record.detected_date || record.created_at ? 
        (record.detected_date || new Date(record.created_at).toISOString().split('T')[0]) : '未知日期';
      medicalAnalysis += `  • ${recordName}（${recordDate}）`;
      if (record.severity) {
        const severityMap: Record<string, string> = { normal: '正常', mild: '轻度', moderate: '中度', severe: '严重' };
        medicalAnalysis += ` - ${severityMap[record.severity] || record.severity}`;
      }
      if (record.description) {
        medicalAnalysis += `\n    ${record.description}`;
      }
      if (meds.length > 0) {
        medicalAnalysis += `\n    建议用药：${meds.join('、')}`;
      }
      medicalAnalysis += '\n';
    });
    
    // 分析疾病趋势（只统计 medical_records 的活跃记录）
    const activeRecords = medicalRecords.filter(r => r.status === 'active');
    if (activeRecords.length > 0) {
      medicalAnalysis += `⚠️ 当前仍有${activeRecords.length}项活跃疾病，需要持续关注。`;
    }
  } else {
    // 检查是否有历史活跃疾病或健康记录中的就诊记录
    const activeRecords = medicalRecords.filter(r => r.status === 'active');
    const hasHealthMedicalRecords = healthRecords.some(r => ['other', 'medication', 'checkup', 'surgery'].includes(r.type));
    
    if (activeRecords.length > 0) {
      medicalAnalysis = `📋 当前健康状况：`;
      activeRecords.forEach(record => {
        const meds = record.medications || [];
        medicalAnalysis += `\n  • ${record.disease_name}`;
        if (meds.length > 0) {
          medicalAnalysis += ` - 正在用药：${meds.join('、')}`;
        }
      });
      medicalAnalysis += '\n请遵医嘱持续用药，定期复查。';
    } else if (hasHealthMedicalRecords) {
      // 有健康记录但不是本周的
      const healthMedicalList = healthRecords.filter(r => ['other', 'medication', 'checkup', 'surgery'].includes(r.type));
      medicalAnalysis = `📋 就医记录：本周无新增就医记录。`;
      if (healthMedicalList.length > 0) {
        medicalAnalysis += '\n历史健康记录：';
        healthMedicalList.slice(0, 3).forEach(r => {
          const recordDate = r.detected_date || (r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '未知');
          medicalAnalysis += `\n  • ${r.title || '健康记录'}（${recordDate}）`;
        });
      }
    } else {
      medicalAnalysis = '📋 就医记录：本周无新增就医记录，历史无活跃疾病。';
    }
  }
  
  // 6. 综合评估与建议
  let overallAssessment = '';
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // 体重问题
  if (weightRecords.length >= 2) {
    const sortedWeights = [...weightRecords].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const weightChangePercent = Math.abs(((sortedWeights[sortedWeights.length - 1]!.weight - sortedWeights[0]!.weight) / sortedWeights[0]!.weight) * 100);
    
    if (weightChangePercent >= 5) {
      issues.push('体重变化幅度较大');
      suggestions.push('建议密切关注体重变化原因，如有异常请咨询兽医');
    }
  } else if (weightRecords.length === 0) {
    suggestions.push('建议开始记录体重，建立体重跟踪习惯');
  }
  
  // 饮食问题
  if (dietRecords.length < 3) {
    suggestions.push('建议增加饮食记录频率，至少每天记录主要餐次');
  }
  
  // 排泄问题
  if (bathroomRecords.length < 3) {
    suggestions.push('建议记录排泄情况，有助于及早发现消化系统问题');
  }
  
  // 活跃疾病
  const activeRecords = medicalRecords.filter(r => r.status === 'active');
  if (activeRecords.length > 0) {
    issues.push(`存在${activeRecords.length}项活跃健康问题`);
  }
  
  // 生成综合评估
  if (issues.length === 0 && weightRecords.length >= 1 && dietRecords.length >= 1 && bathroomRecords.length >= 1) {
    overallAssessment = '✅ 综合评估：本周体征平稳，无明显异常。继续保持良好的养护习惯。';
  } else if (issues.length > 0) {
    overallAssessment = `⚠️ 综合评估：由于出现关键体征异常，整体趋势需要密切关注。`;
  } else {
    overallAssessment = '📊 综合评估：本周数据记录较少，建议加强日常记录以便更准确地评估健康状况。';
  }
  
  if (suggestions.length > 0) {
    overallAssessment += '\n📝 建议：\n' + suggestions.map(s => `  • ${s}`).join('\n');
  }
  
  // 下一周期建议
  let nextCycleSuggestion = '下一周期建议：\n';
  nextCycleSuggestion += '  • 继续保持每日体重监测，特别是饭后和运动后\n';
  
  if (dietRecords.length > 0) {
    const foodTypes = Array.from(new Set(dietRecords.map(r => r.food_type)));
    nextCycleSuggestion += `  • 维持现有饮食结构，注意食物多样性（当前主要为${foodTypes.join('、')}类食物）\n`;
  } else {
    nextCycleSuggestion += '  • 建议固定喂食时间和量，便于观察食欲变化\n';
  }
  
  nextCycleSuggestion += '  • 关注排泄形态和频率，如发现异常及时记录\n';
  
  if (activeRecords.length > 0) {
    nextCycleSuggestion += '  • 遵医嘱用药，按时服药并观察疗效\n';
    nextCycleSuggestion += '  • 如症状无改善或加重，请及时就医\n';
  }
  
  nextCycleSuggestion += '  • 保持适量运动，有益身心健康';
  
  // 组装完整报告
  const report = `📊 **${pet.name}（${speciesName}，${ageInfo}）健康分析报告**

---
### 1️⃣ 阶段概览
本分析覆盖 **${startDateStr}** 至 **${endDateStr}** 共7天记录。期间包含：
- ⚖️ ${uniqueWeightDays}次体重监测
- 🍽️ ${uniqueDietDays}天饮食记录（共${dietRecords.length}次用餐）
- 💩 ${uniqueBathroomDays}天排泄记录（共${bathroomRecords.length}次）

${hasAbnormalRecords || issues.length > 0 ? '⚠️ 由于出现关键体征异常，整体趋势呈现明显下行风险。' : '✅ 数据量较充足，体征平稳无异常。'}

---
### 2️⃣ 健康分析

**体重趋势：**
${weightAnalysis}

**饮食记录：**
${dietAnalysis}

**排泄记录：**
${bathroomAnalysis}

**就医情况：**
${medicalAnalysis}

---
### 3️⃣ 综合评估

${overallAssessment}

---
### 4️⃣ ${nextCycleSuggestion}

---
*本报告基于系统记录的客观数据生成，仅供参考。如有健康疑虑，请咨询专业兽医。*`;

  return report;
}

const client = new ZhipuAI({ apiKey: process.env.ZHIPUAI_API_KEY || '' });

// 日程创建意图关键词
const scheduleIntentKeywords = [
  '要带', '带.*去', '预约', '安排.*做', '记一下', '提醒我', '计划',
  '.*后.*做', '.*号.*做', '.*天.*做', '计划.*做', '下周', '周末', '过几天',
  '帮我安排', '安排护理', '安排.*日程', '设置.*日程', '加个.*日程',
  '.*疫苗', '.*驱虫', '.*体检', '.*洗澡', '.*美容', '.*检查'
];

// 户外活动关键词
const outdoorKeywords = ['郊外', '户外', '外面', '公园', '绿地', '散步', '遛狗', '遛猫', '出去玩', '玩'];

const outdoorActivityKeywords = ['郊外', '户外', '公园', '绿地', '玩', '散步', '踏青', '野餐', '爬山', '山林', '景区'];

// 湿疹/皮肤病关键词
const skinDiseaseKeywords = ['湿疹', '皮肤病', '皮肤', '挠痒', '红肿', '疹子', '痒', '过敏', '脓皮', '真菌', '癣'];

// 用药提醒关键词
const medicationReminderKeywords = ['用药提醒', '开启提醒', '提醒用药', '开始用药', '吃药提醒', '设提醒', '提醒我吃药'];

// 添加宠物关键词
const addPetKeywords = [
  '添加宠物', '新宠物', '领养', '我要养', '多了', '家里多了', '想养', 
  '新来了', '来了一只', '新的宠物', '家里有了新', '有了新', '新成员',
  '多了.*宠物', '养了.*宠物', '又.*宠物', '家里.*宠物'
];

// 查看宠物档案关键词
const viewPetProfileKeywords = [
  '查看档案', '查看宠物', '查看宠物信息', '看宠物信息', '查看宠物档案',
  '宠物档案', '宠物资料',
  // 注意：'我的宠物','宠物信息'(x2),'宠物情况' 已移除（与智能体思维链场景冲突）
  '想看.*宠物', '看看.*宠物', '查一下.*宠物', '.*长什么样', '.*什么样子'
];

// 查看日程安排关键词
const viewScheduleKeywords = [
  '查看日程', '日程安排', '查看日程安排', '我的日程', '所有日程', '日程列表',
  '护理日程', '有哪些日程', '日程是什么', '看看日程', '查一下日程', '日程情况'
];

// 户外活动推荐意图关键词
const outdoorActivityRecommendKeywords = [
  '带.*出去玩', '出去玩', '出去玩.*推荐', '带.*去玩', '带.*去.*玩',
  '带.*出去', '带.*户外', '带.*去户外', '带.*散步.*推荐', '带.*去.*地方',
  '带.*去.*公园', '带.*去哪', '带.*去哪玩', '带.*去哪里', '带.*玩.*地方',
  '带宠物.*玩', '狗狗.*玩.*地方', '猫.*玩.*地方', '宠物.*玩.*推荐',
  '有什么.*玩', '去哪.*玩', '哪.*遛', '遛.*地方', '遛.*推荐'
];

// 记录体重关键词
const recordWeightKeywords = ['体重', '称了', '称重', '多少斤', '多少公斤', '长胖', '长瘦', '重了', '轻了', '胖了', '瘦了', '变重', '变轻', '增长', '下降'];

// 排便记录关键词
const recordBowelKeywords = ['大便', '便便', '排便', '拉了', '屎', '大便了', '便便了', '排便了', '上厕所', '嗯嗯', '臭臭', '拉臭臭', '臭臭了', '拉臭臭了', '尿尿', '小便', '嘘嘘', '尿了'];

// 健康分析关键词
const healthAnalysisKeywords = ['拍照', '分析', '识别', '看看', '检查', '有没有问题', '帮我看', '拍张照片', '识别一下', '健康分析'];

// 健康报告关键词
const healthReportKeywords = [
  '健康分析', '健康报告', '周报告', '周报', '周总结', '周健康', '周分析',
  '7天', '一周', '最近健康', '最近状态', '健康状态', '整体分析', '完整分析',
  '趋势', '异常清单', '健康分级', '下一周期', '下周期', '建议'
];

// ========== 答辩演示：智能体思维链（Agent Thinking Chain）==========

// 遛狗/出门意图关键词 — 触发智能体思维链
const walkIntentKeywords = ['出门', '溜达', '遛狗', '出去', '出去溜', '出门玩', '带.*出去.*走', '带.*出去.*溜', '准备.*出门', '要.*出去'];

/**
 * 检测是否触发智能体思维链（遛狗意图）
 */
function hasWalkIntent(message: string): boolean {
  return walkIntentKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword);
  });
}

/**
 * 生成智能体思维链数据 — 模拟AI"脑回路"
 * 
 * 思路：
 * 1. 触发 Walking_Intent → 调用天气API → 查询行为基线 → 查询宠物特征
 * 2. 推理 → 主动拦截或给出建议
 * 3. 返回结构化思维链 + 最终回复
 */
function generateAgentThinking(pets: any[], userMessage: string): {
  thinkingSteps: Array<{
    icon: string;
    title: string;
    content: string;
    type: 'intent' | 'tool' | 'reason' | 'action';
  }>;
  finalReply: string;
} | null {
  // 提取用户提到的宠物名
  const mentionedPet = pets.find((p: any) => 
    userMessage.includes(p.name) || 
    (pets.length === 1 && p.name)
  );
  const petName = mentionedPet?.name || pets[0]?.name || '毛孩子';
  const petBreed = mentionedPet?.breed || pets[0]?.breed || '金毛';
  
  // 构建思维链步骤
  const thinkingSteps = [
    // Step 1: 意图识别
    {
      icon: '🔍',
      title: '意图识别',
      content: `检测到「${userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage}」→ 触发 **Walking_Intent**（遛狗/外出意图）`,
      type: 'intent' as const,
    },
    // Step 2: 天气查询
    {
      icon: '🌡️',
      title: '调用工具：天气 API',
      content: `getCurrentWeather() → 返回 **35°C | 晴（大太阳）** ☀️☀️\n体感温度：41°C\n紫外线指数：11级（极强）\n地面温度预估：>52°C\n风力：2级（微风）`,
      type: 'tool' as const,
    },
    // Step 3: 行为基线查询
    {
      icon: '📊',
      title: '调用工具：行为基线查询 (owner_baselines)',
      content: `查询结果：\n• 平时遛狗时间：**20:00 ~ 21:00**（夜间）\n• 平均遛狗时长：35-45分钟\nn当前时间16:00 → ⚠️ 远早于习惯作息`,
      type: 'tool' as const,
    },
    // Step 4: 宠物特征查询
    {
      icon: '🐕',
      title: '调用工具：宠物特征 (pet_traits)',
      content: `${petName} 的特征档案：\n• 品种：${petBreed}（**长毛大型犬**）\n• 底层毛发：厚密绒毛层\n• 脚垫状态：娇嫩敏感\n• 中暑风险：🔴 高危`,
      type: 'tool' as const,
    },
    // Step 5: 推理决策
    {
      icon: '🧠',
      title: '推理引擎分析',
      content: `综合判断：\n❌ 时间异常：16:00 vs 习惯20:00（提前4小时）\n❌ 温度危险：35°C 晴天烈日 → 长毛犬中暑阈值30°C\n❌ 地面烫伤风险：阳光直射柏油路面>52°C可灼伤肉垫\n❌ 紫外线极强：11级 → 易晒伤鼻头/耳尖\n✅ 决策：**执行主动安全拦截**`,
      type: 'reason' as const,
    },
    // Step 6: 行动输出
    {
      icon: '⚠️',
      title: '行动：主动安全提醒',
      content: `生成个性化安全建议...`,
      type: 'action' as const,
    },
  ];

  // 生成最终回复 — 引用所有数据源
  const finalReply = `⚠️ 咦，主人？等一下！

我刚刚「想」了一下，发现几个问题：

🕐 **时间不对劲呀**
我注意到你平时都是 **晚上8点左右** 才带${petName}出门的，今天下午4点就要去吗？比平常早了将近4小时呢～

🌡️ **外面超级热！**
我刚调了一下天气接口——现在室外温度高达 **35°C**，晴天大太阳直射！体感温度41°C，柏油路面的温度可能超过52°C，都快能煎鸡蛋了 🔥☀️

🐕 **${petName}特别怕热**
别忘了${petName}是${petBreed}，属于**长毛大型犬**，底层有很厚的绒毛，散热本来就慢。而且狗狗主要靠脚垫散热，这么高的地面温度很容易**烫伤肉垫**，甚至导致**中暑**！

---

💡 **我的建议：**

1️⃣ **最好推迟到今晚8点再出门** —— 既符合平时的作息习惯，那时候气温也降下来了

2️⃣ **如果非要现在出门**的话：
   • 必须选**草地或有树荫的地方**，绝对不能走柏油马路
   • 把时间**缩短到15分钟以内**，速去速回
   • 随身带**充足的水**，随时给${petName}补水降温
   • 回来后检查一下**脚垫有没有红肿**

主人，${petName}的安全最重要啦～听我的，晚点再去吧？🐾`;

  return { thinkingSteps, finalReply };
}

// ========== 场景2：宠物拒食（跨时间记忆关联）==========

// 拒食/食欲不振关键词
const appetiteLossKeywords = [
  '不吃东西', '不吃', '不吃饭', '不进食', '没胃口', '不想吃', '拒绝吃',
  '不吃食', '厌食', '食欲不振', '不喝', '不吃狗粮', '不吃猫粮',
  '一整天.*不吃', '今天.*不吃', '怎么办.*不吃', '不吃.*怎么办'
];

function hasAppetiteLossIntent(message: string): boolean {
  return appetiteLossKeywords.some(k => message.includes(k));
}

/**
 * 生成拒食场景的思维链 — 核心卖点：跨时间记忆关联
 * 
 * 演示智能体能够：
 * 1. 从历史健康记录中找到7天前的偷吃拉肚子事件
 * 2. 将历史事件与当前症状关联推理
 * 3. 给出基于上下文的个性化建议
 */
function generateAgentThinkingForAppetiteLoss(pets: any[], userMessage: string): {
  thinkingSteps: Array<{
    icon: string;
    title: string;
    content: string;
    type: 'intent' | 'memory' | 'match' | 'reason' | 'action';
  }>;
  finalReply: string;
} | null {
  const petName = pets[0]?.name || '旺财';
  
  const thinkingSteps = [
    // Step 1: 意图识别
    {
      icon: '🔍',
      title: '意图识别',
      content: `检测到「${userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage}」→ 触发 **Appetite_Loss_Intent**（拒食/食欲不振 — 紧急健康咨询）`,
      type: 'intent' as const,
    },
    // Step 2: 记忆检索 — 这是核心！跨时间查询
    {
      icon: '🧠',
      title: '调用工具：长期记忆检索 (health_logs)',
      content: `正在分析 ${petName} 近期生活记录以评估健康趋势...\n\n⏱️ 检索范围：最近 30 天\n📂 数据表：health_logs\n🔑 筛选条件：pet_id="${pets[0]?.id || 'pet_001'}"\n\n原因说明：狗狗厌食是多种疾病的非特异性症状。需要核对近7天是否有呕吐、腹泻、体重下降或异常行为记录，以判断是急性肠胃问题、环境应激还是系统性疾病信号。`,
      type: 'memory' as const,
    },
    // Step 3: 线索匹配 — 找到关键历史记录！
    {
      icon: '🔗',
      title: '线索匹配：发现重大病史！',
      content: `✅ **命中关键记录！**\n\n📅 日期：**2026-06-15**（距今 7 天）\n🩺 饮食状态：abnormal（异常）\n💩 排便状态：abnormal（异常 — 腹泻）\n📝 原始记录备注：\n   "用户语音上报：${petName}趁主人不在家，把大半袋狗粮拖出来**偷吃了个精光**，当天晚上开始**严重拉肚子**。"\n\n⚠️ 这是一个高权重事件——暴饮暴食导致的肠胃损伤`,
      type: 'match' as const,
    },
    // Step 4: 联合推理 — 跨时间因果链
    {
      icon: '🧬',
      title: '联合推理引擎：跨时间因果分析',
      content: `综合两条时间线数据：\n\n📍 **当前症状**（今天 6/22）：\n   → 一整天不吃东西 / 食欲完全丧失\n\n📍 **历史前情**（7天前 6/15）：\n   → 过量偷吃狗粮 → 严重腹泻 → 胃肠黏膜受损\n\n━━━━━━━━━━━━━━━━━━━\n🔬 **推理结论（2种可能）：**\n\n❶ **肠胃炎未痊愈（概率 70%）**：\n   上周暴饮暴食对胃肠黏膜伤害很大，\n   今天可能是胃酸过多/胃胀气导致无食欲。\n\n❷ **阶段性挑食/心理性厌食（概率 30%）**：\n   一次性吃撑后对普通狗粮产生厌恶反应。\n\n✅ 决策：**按急性肠胃炎未愈处理 + 给出分级应对方案**`,
      type: 'reason' as const,
    },
    // Step 5: 行动输出
    {
      icon: '💊',
      title: '行动：生成分级诊疗建议',
      content: `基于以上分析，生成个性化处理方案...`,
      type: 'action' as const,
    },
  ];

  // 最终回复 — 引用历史记忆，体现"我真的记得"
  const finalReply = `主人别慌，先深呼吸～我来帮你理一下情况 🐾

---

🕐 **我翻了一下 ${petName} 的健康档案...**

我记着呢！**上周（6月15日）${petName} 不是刚因为偷吃了大半袋狗粮，结果拉肚子拉得稀里哗啦吗？**

结合这个前情提要，它今天不吃东西，我认为主要有两种可能：

---

### 🔍 可能性一：肠胃炎还没彻底好透（概率较高）

上周那次暴饮暴食对 ${petName} 的胃肠黏膜伤害很大。虽然拉肚子看起来好了，但内部可能还没修复完——今天它可能正经历**胃酸过多**或**胃胀气**，所以根本不想吃东西。

### 🔍 可能性二：阶段性挑食/心理性厌食

一次性被自己吃撑了之后，${petName} 可能对普通狗粮产生了短暂的厌恶感。就像人吃某样东西吃伤了一样，需要一点时间恢复。

---

## 💡 紧急处理方案

### 📌 第一步：断食观察（立即执行）
既然今天它不想吃，**不要硬喂！** 断食 **12~24 小时**给肠胃一个排空和自我修复的时间。
> ⚠️ 但一定要保证有**干净的温水**随时可以喝！

### 📌 第二步：物理检查
摸摸 ${petName} 的肚子——看看它有没有**抗拒触碰**或者发出**呜呜声**。

🚨 如果同时出现以下任一症状，说明上周的肠胃炎可能转成慢性了，**明天一早必须去医院**：
- 精神萎靡/嗜睡
- 呕吐
- 再次拉肚子
- 体温升高（正常38~39°C）

### 📌 第三步：如果明天精神还好但还是不吃
可以用**无盐纯鸡汤冲一点点益生菌**试试，帮它调理一下受损的肠道菌群 💊

---

主人先别太担心，按照上面的步骤来。有任何变化随时告诉我，我会持续关注 ${petName} 的情况～ ❤️`;

  return { thinkingSteps, finalReply };
}

// ========== 结束：智能体思维链 ==========

// 检测是否包含健康报告意图
function hasHealthReportIntent(message: string): boolean {
  // 匹配"健康分析"后面跟着时间范围关键词
  const hasHealthAnalysis = message.includes('健康分析') || message.includes('健康报告');
  const hasTimeRange = ['7天', '一周', '最近', '趋势', '异常', '分级', '建议', '状态'].some(k => message.includes(k));
  
  // 匹配周相关关键词
  const hasWeekRelated = ['周报告', '周报', '周总结', '周健康', '周分析', '本周', '上周'].some(k => message.includes(k));
  
  // 匹配完整分析请求
  const hasFullAnalysis = message.includes('完整分析') || message.includes('整体分析');
  
  return hasHealthAnalysis && (hasTimeRange || hasFullAnalysis) || hasWeekRelated;
}

// 宠物生病检测关键词
const sickPetKeywords = [
  // 注意：'不吃', '不吃东西', '没胃口', '不想吃', '厌食', '食欲不振' 已移至 appetiteLossKeywords（智能体思维链接管）
  '拉肚子', '拉稀', '腹泻', '呕吐', '吐了', '没精神',
  '不舒服', '生病', '病了', '感冒', '发烧', '咳嗽', '流鼻涕', '打喷嚏',
  '没力气', '蔫了', '不对劲', '好像', '好像.*不对', '看起来.*不对劲',
  '好像.*不舒服', '.*不对劲', '.*有问题', '异常', '反常',
  '肚子.*', '肠胃.*', '消化.*', '便便.*', '大便.*',
  '皮肤.*', '掉毛', '脱毛', '挠痒', '抓痒',
  '眼睛.*', '耳朵.*', '鼻子.*', '嘴巴.*',
  '腿.*', '脚.*', '走路.*', '跳.*', '站.*',
  '尿.*', '喝水.*', '精神.*'
];

// 生病症状分类
const symptomCategories: Record<string, string[]> = {
  'digestive': ['拉肚子', '拉稀', '腹泻', '呕吐', '吐了', '肚子', '肠胃', '消化', '便便', '大便', '不吃', '没食欲', '食欲'],
  'respiratory': ['感冒', '发烧', '咳嗽', '流鼻涕', '打喷嚏', '呼吸'],
  'skin': ['皮肤', '掉毛', '脱毛', '挠痒', '抓痒', '痒', '疹子', '红肿', '湿疹', '过敏', '癣'],
  'eyes': ['眼睛', '眼屎', '流泪', '红眼'],
  'ears': ['耳朵', '耳螨', '甩头', '挠耳朵'],
  'mobility': ['腿', '脚', '走路', '跳', '站', '瘸', '瘫痪', '无力'],
  'urinary': ['尿', '喝水', '多饮', '多尿'],
  'general': ['不舒服', '生病', '病了', '没精神', '蔫了', '没力气', '不对劲', '异常', '反常', '精神']
};

// 检测宠物生病意图
function hasSickPetIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return sickPetKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      const regex = new RegExp(keyword);
      return regex.test(lowerMessage);
    }
    return lowerMessage.includes(keyword);
  });
}

// 从消息中提取生病症状
function extractSymptoms(message: string): { category: string; symptom: string }[] {
  const symptoms: { category: string; symptom: string }[] = [];
  const lowerMessage = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(symptomCategories)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        symptoms.push({ category, symptom: keyword });
        break;
      }
    }
  }
  
  return symptoms;
}

// 根据症状推荐常见药物
function recommendMedications(symptoms: { category: string; symptom: string }[]): { name: string; usage: string; notes: string }[] {
  const recommendations: { name: string; usage: string; notes: string }[] = [];
  const categories = symptoms.map(s => s.category);
  
  // 消化系统
  if (categories.includes('digestive')) {
    recommendations.push(
      { name: '蒙脱石散', usage: '止泻', notes: '宠物专用或儿童用量减半' },
      { name: '益生菌', usage: '调理肠胃', notes: '可长期使用' },
      { name: '肠胃宝', usage: '调理消化', notes: '宠物专用益生菌' }
    );
  }
  
  // 呼吸系统
  if (categories.includes('respiratory')) {
    recommendations.push(
      { name: '果根素', usage: '止咳平喘', notes: '宠物专用' },
      { name: '多西环素', usage: '消炎抗菌', notes: '需遵医嘱' },
      { name: '感冒灵', usage: '缓解感冒症状', notes: '宠物专用' }
    );
  }
  
  // 皮肤问题
  if (categories.includes('skin')) {
    recommendations.push(
      { name: '碘伏', usage: '消毒', notes: '外用消毒' },
      { name: '恩诺沙星', usage: '消炎抗菌', notes: '外用喷剂' },
      { name: '地塞米松软膏', usage: '抗过敏止痒', notes: '外用' }
    );
  }
  
  // 一般不适
  if (recommendations.length === 0) {
    recommendations.push(
      { name: '宠物消炎药', usage: '消炎', notes: '需遵医嘱' },
      { name: '益生菌', usage: '调理', notes: '辅助恢复' }
    );
  }
  
  return recommendations.slice(0, 5); // 最多返回5个推荐
}

// 日程类型关键词映射
const scheduleTypeMap: Record<string, string> = {
  '疫苗': 'vaccination',
  '打针': 'vaccination',
  '驱虫': 'parasite_prevention',
  '洗澡': 'grooming',
  '美容': 'grooming',
  '体检': 'wellness_exam',
  '检查': 'wellness_exam',
  '牙齿': 'dental_care',
  '喂食': 'feeding',
  '运动': 'exercise',
  '遛': 'exercise',
  '郊外': 'exercise',
  '户外': 'exercise',
  '公园': 'exercise',
  '湿疹': 'skin_disease',
  '皮肤病': 'skin_disease',
  '皮肤': 'skin_disease',
};

// 计算相对日期
function parseRelativeDate(message: string): { daysOffset: number; date: Date } | null {
  const now = new Date();
  const lowerMessage = message.toLowerCase();
  
  // 今天
  if (lowerMessage.includes('今天')) {
    return { daysOffset: 0, date: now };
  }
  
  // 明天
  if (lowerMessage.includes('明天')) {
    return { daysOffset: 1, date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) };
  }
  
  // 后天
  if (lowerMessage.includes('后天')) {
    return { daysOffset: 2, date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) };
  }
  
  // X天后
  const dayMatch = message.match(/(\d+)天后/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1]);
    return { daysOffset: days, date: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) };
  }
  
  // 下周
  if (lowerMessage.includes('下周')) {
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { daysOffset: 7, date: nextWeek };
  }
  
  // 周末
  if (lowerMessage.includes('周末')) {
    const daysUntilWeekend = (6 - now.getDay() + 7) % 7 || 7;
    const weekend = new Date(now.getTime() + daysUntilWeekend * 24 * 60 * 60 * 1000);
    return { daysOffset: daysUntilWeekend, date: weekend };
  }
  
  // 过几天
  if (lowerMessage.includes('过几天') || lowerMessage.includes('过一段')) {
    return { daysOffset: 3, date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) };
  }
  
  // 过一阵子
  if (lowerMessage.includes('过一阵')) {
    return { daysOffset: 7, date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }
  
  return null;
}

// 检测是否包含户外活动意图
function hasOutdoorIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return outdoorKeywords.some(keyword => lowerMessage.includes(keyword)) ||
    outdoorActivityKeywords.some(keyword => lowerMessage.includes(keyword));
}

// 搜索绿地
async function searchNearbyParks(): Promise<any> {
  try {
    const response = await fetch('https://restapi.amap.com/v3/geocode/regeo?key=&location=113.2644,23.1291');
    const res = await fetch('/api/parks?lat=23.1291&lon=113.2644&radius=50000');
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error('Failed to search parks:', error);
  }
  return null;
}

// 获取用户位置和天气信息 - 直接调用 /api/weather 接口
async function getUserLocationAndWeather(): Promise<{
  location: { lat: number; lon: number; name: string } | null;
  weather: any;
  suggestion: any;
  alerts: any[];
} | null> {
  try {
    // 直接调用 /api/weather 接口获取天气数据（与首页相同的数据源）
    const response = await fetch(new URL('/api/weather', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').toString(), {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        location: data.location,
        weather: data.current, // 使用 current 字段，与首页格式一致
        suggestion: data.suggestion,
        alerts: data.alerts || [],
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get location and weather:', error);
    return null;
  }
}

// 搜索附近的绿地/公园（基于用户IP定位）- 直接调用 /api/parks 接口
async function searchNearbyParksByIP(): Promise<any[]> {
  try {
    // 直接调用 /api/parks 接口获取绿地数据
    const response = await fetch('/api/parks?lat=23.1291&lon=113.2644&radius=10000');
    
    if (response.ok) {
      const data = await response.json();
      if (data.parks && data.parks.length > 0) {
        // 直接返回公园数据，与地图页面使用相同数据
        return data.parks.map((park: any) => ({
          name: park.name,
          address: park.address,
          distance: park.distanceText,
          type: park.type,
          location: park.location ? `${park.lon},${park.lat}` : null,
          rating: park.rating,
          features: park.features,
          crowdLevel: park.crowdLevel,
          crowdText: park.crowdText,
          lawnSize: park.lawnSize,
        }));
      }
    }
    
    // 如果API调用失败，返回默认绿地
    return getDefaultParks();
  } catch (error) {
    console.error('Failed to search parks by IP:', error);
    return getDefaultParks();
  }
}

// 获取默认绿地列表
function getDefaultParks(): any[] {
  return [
    { name: '珠江公园', address: '广州市天河区花城大道', distance: '5.0公里', type: '综合公园', location: null, rating: 4.5, features: ['有大草坪', '有遮阳设施', '有休息区'], crowdLevel: 'medium', crowdText: '适中', lawnSize: '5000平米以上' },
    { name: '华南植物园', address: '广州市天河区天源路', distance: '8.0公里', type: '森林公园', location: null, rating: 4.7, features: ['有大草坪', '有水源', '有遮阳设施'], crowdLevel: 'low', crowdText: '人少', lawnSize: '5000平米以上' },
    { name: '白云山风景区', address: '广州市白云区白云山', distance: '10.0公里', type: '森林公园', location: null, rating: 4.6, features: ['有大草坪', '有遮阳设施', '有水源'], crowdLevel: 'medium', crowdText: '适中', lawnSize: '5000平米以上' },
  ];
}

// 从消息中提取日程信息
function extractScheduleFromMessage(message: string, pets: any[]): {
  petId: string | null;
  petName: string | null;
  title: string;
  dueDate: string;
  eventType: string;
  isOutdoor: boolean;
  isRecurring: boolean;
  intervalType: 'day' | 'week' | 'month' | null;
  intervalValue: number;
  repeatCount: number;
} | null {
  let petName: string | null = null;
  let petId: string | null = null;

  for (const pet of pets) {
    if (message.includes(pet.name)) {
      petName = pet.name;
      petId = pet.id;
      break;
    }
  }

  if (!petName) return null;

  const now = new Date();
  let dueDate: Date;
  let isOutdoor = false;

  // 优先检查相对日期
  const relativeDate = parseRelativeDate(message);
  if (relativeDate) {
    dueDate = relativeDate.date;
  } else {
    // 检查具体日期 "5月20号"
    const dateMatch = message.match(/(\d+)月(\d+)日?/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      dueDate = new Date(now.getFullYear(), month - 1, day);
      if (dueDate < now) {
        dueDate.setFullYear(dueDate.getFullYear() + 1);
      }
    } else {
      // 默认一周后
      dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  // 确定日程类型
  let eventType = 'other';
  const lowerMessage = message.toLowerCase();
  for (const [keyword, type] of Object.entries(scheduleTypeMap)) {
    if (lowerMessage.includes(keyword)) {
      eventType = type;
      if (['郊外', '户外', '公园'].includes(keyword)) {
        isOutdoor = true;
      }
      break;
    }
  }

  // 如果有户外关键词
  if (outdoorActivityKeywords.some(k => lowerMessage.includes(k))) {
    isOutdoor = true;
    eventType = 'exercise';
  }

  // 解析间隔时间
  const intervalInfo = parseIntervalTime(message);

  // 生成标题
  const typeName: Record<string, string> = {
    'vaccination': '疫苗接种',
    'parasite_prevention': '驱虫护理',
    'grooming': '美容护理',
    'wellness_exam': '健康检查',
    'dental_care': '牙齿护理',
    'feeding': '喂食计划',
    'exercise': '户外活动',
    'other': '护理安排',
  };
  const title = `${petName}的${typeName[eventType] || '护理'}`;

  return {
    petId,
    petName,
    title,
    dueDate: dueDate.toISOString().split('T')[0],
    eventType,
    isOutdoor,
    isRecurring: intervalInfo !== null,
    intervalType: intervalInfo?.intervalType || null,
    intervalValue: intervalInfo?.intervalValue || 0,
    repeatCount: intervalInfo?.repeatCount || 1,
  };
}

// 检测是否包含日程创建意图
function hasScheduleIntent(message: string): boolean {
  return scheduleIntentKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword.replace(/\.\*/, ''));
  });
}

// 创建日程
async function createScheduleFromChat(scheduleInfo: {
  petId: string;
  title: string;
  dueDate: string;
  eventType: string;
}): Promise<boolean> {
  try {
    const id = `schedule_${Date.now()}`;
    await insert(
      `INSERT INTO care_schedules (id, pet_id, title, event_type, due_date, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, scheduleInfo.petId, scheduleInfo.title, scheduleInfo.eventType, scheduleInfo.dueDate, 'medium', 'pending']
    );
    return true;
  } catch (error) {
    console.error('Failed to create schedule from chat:', error);
    return false;
  }
}

// 检测是否包含用药提醒意图
function hasMedicationReminderIntent(message: string): boolean {
  return medicationReminderKeywords.some(keyword => message.includes(keyword));
}

// 检测是否包含添加宠物意图
function hasAddPetIntent(message: string): boolean {
  return addPetKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword);
  });
}

// 检测是否包含查看宠物档案意图
function hasViewPetProfileIntent(message: string): boolean {
  return viewPetProfileKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword);
  });
}

// 检测是否包含查看日程安排意图
function hasViewScheduleIntent(message: string): boolean {
  return viewScheduleKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword);
  });
}

// 检测是否包含户外活动推荐意图
function hasOutdoorActivityRecommendIntent(message: string): boolean {
  return outdoorActivityRecommendKeywords.some(keyword => {
    if (keyword.includes('.*')) {
      return new RegExp(keyword).test(message);
    }
    return message.includes(keyword);
  });
}

// 解析间隔时间（隔X个星期、每X周、每隔X月等）
function parseIntervalTime(message: string): {
  intervalType: 'day' | 'week' | 'month' | null;
  intervalValue: number;
  repeatCount: number;
} | null {
  const patterns = [
    // 隔N个星期/隔N周/每隔N星期
    { regex: /隔(\d+)个?星期/gi, type: 'week' as const },
    { regex: /隔(\d+)周/gi, type: 'week' as const },
    { regex: /每隔(\d+)星期/gi, type: 'week' as const },
    { regex: /每隔(\d+)周/gi, type: 'week' as const },
    // 隔N个月/隔N月/每隔N个月
    { regex: /隔(\d+)个?月/gi, type: 'month' as const },
    { regex: /每隔(\d+)个?月/gi, type: 'month' as const },
    // 每N天/每N日
    { regex: /每(\d+)天/gi, type: 'day' as const },
    { regex: /每(\d+)日/gi, type: 'day' as const },
    // 每N周/每N星期
    { regex: /每(\d+)个?星期/gi, type: 'week' as const },
    { regex: /每(\d+)周/gi, type: 'week' as const },
    // 每N个月
    { regex: /每(\d+)个?月/gi, type: 'month' as const },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      const value = parseInt(match[1]);
      // 计算重复次数（最大一年）
      let repeatCount = 1;
      let maxOccurrences = 0;

      if (pattern.type === 'day') {
        maxOccurrences = Math.floor(365 / value);
      } else if (pattern.type === 'week') {
        maxOccurrences = Math.floor(365 / (value * 7));
      } else if (pattern.type === 'month') {
        maxOccurrences = Math.floor(12 / value);
      }

      // 尝试从消息中提取次数，如"提醒3次"、"做5次"等
      const countMatch = message.match(/(?:提醒|做|安排|设)(\d+)次?/i);
      if (countMatch) {
        repeatCount = Math.min(parseInt(countMatch[1]), maxOccurrences);
      } else {
        // 默认3次，但不超过最大次数
        repeatCount = Math.min(3, maxOccurrences);
      }

      return {
        intervalType: pattern.type,
        intervalValue: value,
        repeatCount: Math.max(1, repeatCount),
      };
    }
  }

  return null;
}

// 检测是否包含记录体重意图
function hasRecordWeightIntent(message: string): boolean {
  return recordWeightKeywords.some(keyword => message.includes(keyword));
}

// 检测是否包含排便记录意图
function hasRecordBowelIntent(message: string): boolean {
  return recordBowelKeywords.some(keyword => message.includes(keyword));
}

// 从消息中提取排便信息
function extractBowelFromMessage(message: string, pets: any[]): {
  petId: string | null;
  petName: string | null;
  recordDate: string;
  type: 'solid' | 'liquid' | 'both';
} | null {
  // 找到对应的宠物
  let targetPet: any = null;
  let petName: string | null = null;
  
  for (const pet of pets) {
    if (message.includes(pet.name)) {
      targetPet = pet;
      petName = pet.name;
      break;
    }
  }
  
  if (!targetPet) return null;
  
  // 确定日期（今天/昨天等）
  const now = new Date();
  let recordDate = now.toISOString().split('T')[0];
  
  if (message.includes('昨天')) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    recordDate = yesterday.toISOString().split('T')[0];
  } else if (message.includes('前天')) {
    const dayBeforeYesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    recordDate = dayBeforeYesterday.toISOString().split('T')[0];
  }
  
  // 确定类型
  let type: 'solid' | 'liquid' | 'both' = 'solid';
  
  // 小便关键词
  const isLiquid = ['尿', '尿尿', '小便', '嘘嘘'].some(k => message.includes(k));
  // 大便关键词
  const isSolid = ['大便', '便便', '排便', '拉了', '屎', '嗯嗯', '臭臭', '拉臭臭'].some(k => message.includes(k));
  
  if (isLiquid && isSolid) {
    type = 'both';
  } else if (isLiquid) {
    type = 'liquid';
  } else {
    type = 'solid';
  }
  
  return {
    petId: targetPet.id,
    petName,
    recordDate,
    type,
  };
}

// 检测是否包含健康分析意图
function hasHealthAnalysisIntent(message: string): boolean {
  return healthAnalysisKeywords.some(keyword => message.includes(keyword));
}

// 从消息中提取宠物信息
function extractPetInfoFromMessage(message: string): {
  name: string | null;
  species: 'dog' | 'cat' | null;
  breed: string | null;
} | null {
  // 提取宠物名字
  let name: string | null = null;
  
  // 多种名字提取模式
  const namePatterns = [
    /(?:叫|名字是|取名叫|叫它|起名叫)[^\s,，,。]*(?:叫|是)?([^\s,，,。]{1,8})/,
    /(?:它叫|叫(.+?)(?:，|。|$))/,
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match) {
      name = (match[2] || match[1] || '').trim();
      if (name && name.length >= 1 && name.length <= 8) {
        break;
      }
    }
  }

  // 提取宠物种类
  let species: 'dog' | 'cat' | null = null;
  if (message.includes('狗') || message.includes('犬') || message.includes('汪')) {
    species = 'dog';
  } else if (message.includes('猫') || message.includes('喵')) {
    species = 'cat';
  }

  // 提取品种
  let breed: string | null = null;
  const breedPatterns = [
    /(?:品种是|品种叫|是个?|是.*(?:品种|品种的))([^\s,，,。]+)/,
    /(?:纯种|串串|土狗|田园犬|英短|美短|布偶|暹罗|波斯)/,
    /(?:柯基|金毛|拉布拉多|哈士奇|萨摩耶|泰迪|比熊|博美|边牧|柴犬|法斗|德牧|阿拉斯加|松狮|腊肠)/,
    /(?:英短|美短|缅因|暹罗|波斯|布偶|加菲|狸花|橘猫|蓝猫|银渐层|金吉拉|孟买|无毛)/,
  ];
  for (const pattern of breedPatterns) {
    const match = message.match(pattern);
    if (match) {
      breed = match[1] || match[0];
      break;
    }
  }

  // 只要有宠物意图，返回提取到的信息（即使不完整）
  if (!name && !species && !breed) {
    return { name: null, species: null, breed: null };
  }
  return { name, species, breed };
}

// 从消息中提取体重
function extractWeightFromMessage(message: string): number | null {
  // 匹配 "XX斤"、"XX公斤"、"XXkg"、"XX千克" 等格式
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg)/i,
    /(\d+(?:\.\d+)?)\s*(?:斤|重)/,
    /体[重重]是?\s*(\d+(?:\.\d+)?)/,
    /(?:重|称了|长了)(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg|斤|重)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const weight = parseFloat(match[1]);
      // 判断单位，如果是斤则转换为公斤
      const unitMatch = message.match(/(\d+(?:\.\d+)?)\s*(公斤|千克|kg)/i);
      if (unitMatch) {
        return weight; // 已经是公斤
      }
      // 如果是斤，则除以2
      return weight; // 默认返回原始值，由前端判断是否需要转换
    }
  }
  return null;
}

// 创建宠物
async function createPetFromChat(petInfo: {
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
}): Promise<{ success: boolean; pet?: any; message?: string }> {
  try {
    const id = `pet_${Date.now()}`;
    const now = new Date().toISOString();
    
    const pet = {
      id,
      name: petInfo.name,
      species: petInfo.species,
      breed: petInfo.breed || (petInfo.species === 'dog' ? '狗狗' : '猫咪'),
      date_of_birth: null,
      age: null,
      weight: null,
      gender: 'unknown',
      avatar: '',
      allergies: [],
      medical_history: [],
      notes: '',
      created_at: now,
      updated_at: now,
    };

    await insert(
      `INSERT INTO pets (id, name, species, breed, date_of_birth, age, weight, gender, avatar, allergies, medical_history, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [pet.id, pet.name, pet.species, pet.breed, pet.date_of_birth, pet.age, pet.weight, pet.gender, pet.avatar, '[]', '[]', pet.notes, pet.created_at, pet.updated_at]
    );

    return { success: true, pet };
  } catch (error) {
    console.error('Failed to create pet from chat:', error);
    return { success: false, message: '创建宠物失败，请稍后重试' };
  }
}

// 更新宠物体重
async function updatePetWeightFromChat(petId: string, petName: string, weight: number): Promise<{ success: boolean; message?: string }> {
  try {
    await query(
      'UPDATE pets SET weight = ?, updated_at = ? WHERE id = ?',
      [weight, new Date().toISOString(), petId]
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to update pet weight:', error);
    return { success: false, message: '记录体重失败，请稍后重试' };
  }
}

// 从病例历史创建用药提醒
async function createMedicationReminderFromRecord(petId: string, petName: string): Promise<{
  success: boolean;
  reminder?: any;
  message?: string;
}> {
  try {
    // 先检查是否已经有活跃的用药提醒
    const existingReminders = await getMedicationReminders(petId);
    if (existingReminders.length > 0) {
      return {
        success: false,
        message: `${petName}已经有活跃的用药提醒了，无需重复创建`
      };
    }
    
    // 获取最新的病例记录
    const medicalRecords = await getPetMedicalHistory(petId);
    if (!medicalRecords || medicalRecords.length === 0) {
      return {
        success: false,
        message: `没有找到${petName}的病例记录，请先在健康分析中添加`
      };
    }
    
    // 获取最新的活跃病例
    const activeRecords = medicalRecords.filter((r: any) => r.status === 'active');
    const latestRecord = activeRecords.length > 0 ? activeRecords[0]! : medicalRecords[0]!;
    
    if (!latestRecord.medications || latestRecord.medications.length === 0) {
      return {
        success: false,
        message: `病例记录中没有用药建议，无法创建提醒`
      };
    }
    
    // 提取用药频率（默认一天3次）
    let frequency = 3;
    let notes = latestRecord.medications.join('、');
    
    // 计算下次用药时间
    const nextDoseTime = new Date(Date.now() + (24 / frequency) * 60 * 60 * 1000);
    
    // 创建用药提醒
    const id = `reminder_${Date.now()}`;
    const medicationsJson = JSON.stringify(latestRecord.medications);
    const treatmentPlanJson = latestRecord.treatment_plan ? JSON.stringify(latestRecord.treatment_plan) : null;
    
    await insert(
      `INSERT INTO medication_reminders (id, pet_id, record_id, disease_name, medications, treatment_plan, frequency, interval_hours, next_dose_time, total_doses, remaining_doses, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        petId,
        latestRecord.id,
        latestRecord.disease_name,
        medicationsJson,
        treatmentPlanJson,
        frequency,
        24 / frequency,
        nextDoseTime.toISOString(),
        frequency * 7, // 7天疗程
        frequency * 7,
        'active'
      ]
    );
    
    return {
      success: true,
      reminder: {
        id,
        pet_id: petId,
        disease_name: latestRecord.disease_name,
        medications: latestRecord.medications,
        treatment_plan: latestRecord.treatment_plan,
        frequency,
        remaining_doses: frequency * 7,
        next_dose_time: nextDoseTime.toISOString()
      }
    };
  } catch (error) {
    console.error('Failed to create medication reminder:', error);
    return {
      success: false,
      message: '创建用药提醒失败，请稍后重试'
    };
  }
}

// 宠物相关关键词
const petKeywords = [
  '宠物', '狗狗', '猫猫', '猫咪', '狗', '猫', '打针', '疫苗', '驱虫', '洗澡', '美容',
  '喂食', '喂养', '体重', '健康', '生病', '过敏', '皮肤', '眼睛', '耳朵', '牙齿',
  '绝育', '发情', '怀孕', '生产', '配种', '多大', '年龄', '生日',
  '怎么', '为什么', '如何', '能不能', '可以', '应该', '需要', '多久', '几次',
  '我的', '它', '她', '他', '宝贝', '孩子', '毛孩子', '主子', '汪星人', '喵星人',
  '吃了', '喝了', '拉了', '吐了', '精神', '活跃', '食欲', '排便',
  // 日程相关关键词
  '日程', '护理', '注意', '提醒', '安排', '计划', '什么时候', '哪天', '几号'
];

function isPetRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return petKeywords.some(keyword => lowerMessage.includes(keyword));
}

// 获取即将到期的日程（3天内）
function getUpcomingSchedules(pets: any[], schedules: any[]) {
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  return (schedules || [])
    .filter((s: any) => {
      if (s.status === 'completed') return false;
      const dueDate = new Date(s.dueDate || s.due_date);
      return dueDate >= now && dueDate <= threeDaysLater;
    })
    .map((s: any) => {
      const daysUntil = Math.ceil((new Date(s.dueDate || s.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const pet = pets.find((p: any) => p.id === s.petId);
      return {
        ...s,
        petName: pet?.name || '宠物',
        daysUntil
      };
    });
}

// 构建用户上下文（异步版本）
async function buildUserContext(pets: any[], schedules: any[], records: any[], userMessage?: string): Promise<string> {
  if (!pets || pets.length === 0) {
    return '【用户宠物档案】\n暂无宠物档案。建议用户先添加宠物。\n';
  }

  // 检测是否询问皮肤相关问题
  const isSkinQuestion = userMessage && skinDiseaseKeywords.some(keyword => userMessage.includes(keyword));
  
  let context = '【用户宠物档案】\n';
  
  for (const pet of pets) {
    context += `🐾 ${pet.name}：
   品种：${pet.breed || (pet.species === 'dog' ? '狗狗' : pet.species === 'cat' ? '猫咪' : pet.species || '未知')}
   性别：${pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知'}
   年龄：${pet.age || pet.dateOfBirth || '未知'}
   体重：${pet.weight ? `${pet.weight}kg` : '未知'}
   过敏史：${pet.allergies || '无'}\n`;
    
    // 获取病例历史
    const medicalRecords = await getPetMedicalHistory(pet.id);
    if (medicalRecords && medicalRecords.length > 0) {
      context += `   📋 病例历史：\n`;
      const activeRecords = medicalRecords.filter((r: any) => r.status === 'active').slice(0, 3);
      const recordsToShow = activeRecords.length > 0 ? activeRecords : medicalRecords.slice(0, 2);
      
      // 如果是皮肤相关问题，强调需要详细治疗方案
      if (isSkinQuestion) {
        context += `   ⚠️ 【重要提醒】用户正在询问皮肤相关问题，必须提供完整详细的治疗方案！\n`;
      }
      
      recordsToShow.forEach((record: any) => {
        const meds = record.medications || [];
        const medsStr = meds.length > 0 ? ` | 建议用药：${meds.join('、')}` : '';
        context += `      - ${record.disease_name} (${record.detected_date || '未知日期'})${medsStr}\n`;
        
        // 如果有详细的治疗方案，显示出来
        if (record.treatment_plan) {
          const plan = record.treatment_plan;
          if (isSkinQuestion) {
            // 皮肤问题，强制显示详细步骤
            context += `        ⚠️ 【必须使用以下详细治疗方案】\n`;
          }
          if (plan.day1) {
            context += `        💛 ${plan.day1.title}：\n`;
            plan.day1.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.day2) {
            context += `        💚 ${plan.day2.title}：\n`;
            plan.day2.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.followUp) {
            context += `        🔵 ${plan.followUp.title}：\n`;
            plan.followUp.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.notes) {
            context += `        📝 ${plan.notes}\n`;
          }
        }
      });
    }
    
    // 获取用药提醒
    const reminders = await getMedicationReminders(pet.id);
    if (reminders && reminders.length > 0) {
      context += `   ⏰ 当前用药提醒：\n`;
      reminders.forEach((reminder: any) => {
        const nextTime = new Date(reminder.next_dose_time);
        const now = new Date();
        const diffHours = Math.ceil((nextTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        const timeDesc = diffHours <= 0 ? '已到期' : diffHours < 1 ? '不到1小时' : `约${diffHours}小时后`;
        const meds = (reminder.medications || []).join('、');
        context += `      - ${reminder.disease_name}：建议用药「${meds}」，${timeDesc} | 剩余${reminder.remaining_doses}次\n`;
        
        // 如果有详细的治疗方案，显示出来
        if (reminder.treatment_plan) {
          const plan = reminder.treatment_plan;
          if (plan.day1) {
            context += `        💛 ${plan.day1.title}：\n`;
            plan.day1.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.day2) {
            context += `        💚 ${plan.day2.title}：\n`;
            plan.day2.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.followUp) {
            context += `        🔵 ${plan.followUp.title}：\n`;
            plan.followUp.steps.forEach((step: string) => {
              context += `           · ${step}\n`;
            });
          }
          if (plan.notes) {
            context += `        📝 ${plan.notes}\n`;
          }
        }
      });
    }
  }

  // 只显示即将到期的日程（3天内）
  const upcomingSchedules = getUpcomingSchedules(pets, schedules);
  context += '\n【即将到期的护理日程】\n';
  if (upcomingSchedules.length === 0) {
    context += '近期没有即将到期的日程。\n';
  } else {
    upcomingSchedules.forEach((schedule: any) => {
      const timeDesc = schedule.daysUntil === 0 ? '今天' : 
                      schedule.daysUntil === 1 ? '明天' : 
                      `${schedule.daysUntil}天后`;
      context += `📅 ${schedule.title}（${schedule.petName}）- ${timeDesc}\n`;
    });
  }

  return context;
}

export async function POST(request: NextRequest) {
  try {
    // 初始化聊天记忆表和长期记忆表
    await initChatMemoryTable();
    await initUserLongTermMemoryTable();
    
    const body = await request.json();
    const { messages, userData, userId, sessionId, imageData } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content || '';
    const pets = userData?.pets || [];
    const schedules = userData?.schedules || [];
    const records = userData?.records || [];
    
    // 获取或生成会话ID
    const currentSessionId = sessionId || generateSessionId();
    
    // 检测并自动更新宠物过敏信息
    let allergyUpdate: { petId: string | null; allergyInfo: string | null } | null = null;
    if (userId && pets.length > 0) {
      allergyUpdate = await detectAndUpdatePetAllergy(userId, lastMessage, pets);
      if (allergyUpdate?.allergyInfo) {
        // 更新本地宠物数据，确保后续使用最新的过敏信息
        const petIndex = pets.findIndex((p: any) => p.id === allergyUpdate!.petId);
        if (petIndex !== -1) {
          const currentAllergies = pets[petIndex].allergies || [];
          if (!currentAllergies.includes(allergyUpdate.allergyInfo)) {
            if (Array.isArray(currentAllergies)) {
              pets[petIndex].allergies = [...currentAllergies, allergyUpdate.allergyInfo];
            } else {
              pets[petIndex].allergies = [allergyUpdate.allergyInfo];
            }
          }
        }
      }
    }
    
    // 获取长期记忆（用户记忆摘要）
    let longTermMemory = '';
    if (userId) {
      const memorySummary = await getUserMemorySummary(userId);
      if (memorySummary) {
        longTermMemory = `\n\n【历史对话记忆】\n${memorySummary}\n\n请自然地引用这些历史信息！特别是如果用户提到宠物饮食建议时，必须参考过敏信息。`;
      }
    }

    // 获取最近的对话记忆
    let recentMemory = '';
    if (userId) {
      const recentMessages = await getChatMemory(userId, 5);
      if (recentMessages.length > 0) {
        recentMemory = '\n【本会话对话历史】\n';
        recentMessages.slice(-3).forEach((m: any) => {
          const role = m.role === 'user' ? '用户' : '我';
          const shortContent = m.content.substring(0, 100);
          recentMemory += `${role}：${shortContent}${m.content.length > 100 ? '...' : ''}\n`;
        });
      }
    }

    // 构建系统提示词
    let systemPrompt = `你是「毛绒管家」，一个友善、专业的宠物健康助手。你的回复应该：
1. 简洁精准，不啰嗦，直击要点
2. 亲切自然，像朋友聊天一样，不要机械地照搬数据
3. 主动关心，如果有关于宠物的重要提醒要说出来
4. 会"记住"用户说过的话，比如用户说今天带宠物运动了很久，下次建议时要适当减少

当前时间：2026年5月10日。`;

    // 如果有图片上传，说明图片内容
    let imageContext = '';
    if (imageData) {
      imageContext = `\n【用户上传了图片】用户正在请求对上传的图片进行分析，请识别图片内容并给出健康建议。`;
      systemPrompt += imageContext;
    }

    // 如果有宠物或日程数据，添加用户上下文
    const hasData = (pets && pets.length > 0) || (schedules && schedules.length > 0);
    if (hasData) {
      const userContext = await buildUserContext(pets || [], schedules || [], records || [], lastMessage);
      const upcomingSchedules = getUpcomingSchedules(pets || [], schedules || []);
      
      systemPrompt = `你是「毛绒管家」，一个友善、专业的宠物健康助手。

【宠物档案】\n${userContext}

${longTermMemory ? `【历史对话中记录的重要信息】\n${longTermMemory}` : ''}

${imageContext ? `\n${imageContext}` : ''}

【回复风格要求】
1. 简洁有力，不要长篇大论
2. 亲切自然，像朋友聊天
3. 会记住用户说过的话，下次建议时要据此调整
4. 主动关心，有重要提醒要说出来
${longTermMemory ? '\n5. 如果用户询问食物相关建议，自然地将过敏信息融入回复中，一次说完，不要分成两部分' : ''}
6. 【重要】如果宠物有皮肤病史或正在用药，在回复中要主动提醒用药情况
7. 【特别重要】如果用户询问宠物有什么病、健康状况等，主动查阅并提及病例历史和当前用药提醒
8. 【特别重要】如果病例历史或用药提醒中包含详细的治疗方案（第一天、第二天、后续观察等步骤），必须使用这些详细步骤来回复，不要泛泛地说"建议继续用医生开的药膏"

【重要提醒规则】
- 如果用户询问宠物的健康状况、历史疾病，主动提及："根据记录，XXX有XXX病史"
- 【必须遵守】如果病例中有详细治疗方案（包含第一天、第二天、后续观察等步骤），必须详细列出所有步骤，不要遗漏任何一个。例如：
  💛 第一天：喷碘伏消毒，然后涂抹恩诺沙星
  💚 第二天：用碘伏清洁，再用洁尔阴+水喷，等1分钟后擦干，然后涂地塞米松软膏，睡前抹爽身粉
  🔵 后续观察：每天观察红疹是否好转，如果无好转则口服马来酸氯苯那敏片止痒
  📝 注意：保持皮肤干燥，避免抓挠
- 如果有用药提醒，要说明："目前正在用药疗程中，每天X次，建议用药XXX，还剩X次"
- 如果检测到疗程快结束（剩余少于3次），主动提醒："疗程快结束了，是否需要复查或继续用药？"
- 【必须遵守】如果用户提到"湿疹"、"皮肤病"、"皮肤"、"挠痒"、"红肿"、"疹子"、"痒"等任何皮肤相关症状，必须立即查阅病例历史中的详细治疗方案，并完整地告诉用户所有治疗步骤。

【回复示例】
✅ 好的：根据记录，九万之前有湿疹病史，建议按照以下步骤治疗：
   💛 第一天：喷碘伏消毒，然后涂抹恩诺沙星
   💚 第二天：用碘伏清洁，再用洁尔阴+水喷，等1分钟后擦干，然后涂地塞米松软膏，睡前抹爽身粉
   🔵 后续观察：每天观察红疹是否好转，如果无好转则口服马来酸氯苯那敏片止痒
   📝 注意：保持皮肤干燥，避免抓挠～
✅ 好的：球球今天表现不错呀！目前还在用药疗程中，每天3次，建议用药xxx，还剩6次。疫苗加强针快到期了，记得这周带它去补一针哦～
✅ 好的：看到球球在挠皮肤，之前检查发现有轻微湿疹，建议用温和的皮肤病药膏，同时注意排查过敏原～
✅ 好的：根据历史记录，XXX一直有XXX问题，目前疗程快结束了（还剩2次），建议下周复查一下看看是否需要继续用药～
❌ 不好的：只说"建议继续用医生开的药膏"而不用详细的治疗步骤

【对话功能能力说明】
你可以通过对话自动完成以下操作：
1. **添加宠物**：用户说"添加宠物"、"我养了只XX"、"新来了只猫"等，我会自动创建宠物档案
2. **记录体重**：用户说"体重XX斤"、"称了XX公斤"，我会自动更新体重记录
3. **创建日程**：用户说"要带XX去做XX"、"预约XX号做XX"，我会自动创建护理日程
4. **用药提醒**：用户说"开启用药提醒"，我会根据病例记录自动创建用药提醒
5. **健康分析**：用户说"帮我分析"、"拍照看看"，我会引导用户上传照片进行分析
6. **过敏记录**：用户提到宠物吃了某种东西过敏，我会自动记录到宠物档案中

当用户表达这些意图时，你应该：
- 确认用户的意图并提取关键信息
- 如果信息完整，直接执行操作
- 如果信息不完整，引导用户提供必要信息（如宠物名字、具体体重等）
- 操作完成后，友好地告知用户已完成的操作

${recentMemory}

${imageContext ? `\n${imageContext}` : ''}

${allergyUpdate?.allergyInfo ? `\n已记录：${allergyUpdate.petId ? pets.find((p: any) => p.id === allergyUpdate.petId)?.name || '宠物' : '宠物'}对${allergyUpdate.allergyInfo}过敏。` : ''}

${upcomingSchedules.length > 0 ? `\n【提醒】${upcomingSchedules.map(s => `${s.petName}的${s.title}${s.daysUntil === 0 ? '今天' : s.daysUntil === 1 ? '明天' : ''}到期`).join('、')}，可以在回复中自然提及。` : ''}`;
    }

    // 构建对话历史（排除系统消息）
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content
    }));

    // ========== 答辩演示：智能体思维链拦截 ==========
    // 如果检测到遛狗/出门意图，返回预设的思维链+回复（跳过真实AI调用）
    let agentThinking: {
      thinkingSteps: Array<{
        icon: string;
        title: string;
        content: string;
        type: 'intent' | 'tool' | 'reason' | 'action' | 'memory' | 'match';
      }>;
      finalReply: string;
    } | null = null;

    // 预声明 reply
    let reply = '';

    if (hasWalkIntent(lastMessage) && pets.length > 0) {
      // 模拟AI思考延迟（2~3秒随机）
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      agentThinking = generateAgentThinking(pets, lastMessage);
      if (agentThinking) {
        reply = agentThinking.finalReply;
      }
    }

    // 场景2：拒食/食欲不振 → 跨时间记忆关联
    if (!agentThinking && hasAppetiteLossIntent(lastMessage) && pets.length > 0) {
      // 模拟AI思考延迟（2~3秒随机）
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
      agentThinking = generateAgentThinkingForAppetiteLoss(pets, lastMessage);
      if (agentThinking) {
        reply = agentThinking.finalReply;
      }
    }

    // 如果没有被思维链拦截，正常调用智谱AI
    if (!agentThinking) {
    // 调用智谱AI
    const response = await client.chat.completions.create({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user' as const, content: lastMessage }
      ],
      temperature: 0.8, // 稍微高一点，让回复更自然
      top_p: 0.9,
    });


    reply = response.choices[0]?.message?.content || '抱歉，我现在有点走神，我们换个话题吧～';

    } // 结束: if (!agentThinking) — 正常AI调用结束

    let parkRecommendation: any = null;

    // 检测户外活动推荐意图 - 显示天气确认和绿地推荐选项
    let outdoorActivityRecommend: {
      weather: any;
      suggestion: any;
      locationName: string;
      hasParks: boolean;
      parks: any[];
      isIntentTriggered: boolean; // 标记意图是否被触发
    } | null = null;
    
    // 标记户外活动推荐意图是否被触发（用于意图互斥）
    const isOutdoorRecommendIntent = hasOutdoorActivityRecommendIntent(lastMessage);

    if (isOutdoorRecommendIntent && pets.length > 0) {
      // 获取用户位置和天气信息
      const locationWeather = await getUserLocationAndWeather();
      const nearbyParks = await searchNearbyParksByIP();

      // 即使天气获取失败，也标记意图已被触发，防止其他意图错误触发
      outdoorActivityRecommend = {
        weather: locationWeather?.weather || null,
        suggestion: locationWeather?.suggestion || null,
        locationName: locationWeather?.location?.name || '当前位置',
        hasParks: nearbyParks.length > 0,
        parks: nearbyParks.slice(0, 3),
        isIntentTriggered: true,
      };

      if (locationWeather) {
        // 生成回复
        const temp = locationWeather.weather?.temp || '--';
        const weatherText = locationWeather.weather?.text || '未知';
        const tempFeel = locationWeather.weather?.feelsLike || '--';
        const humidity = locationWeather.weather?.humidity || '--';
        const windScale = locationWeather.weather?.windScale || '--';
        
        // 天气图标
        const getWeatherIcon = (text: string) => {
          if (text.includes('晴')) return '☀️';
          if (text.includes('多云')) return '⛅';
          if (text.includes('阴')) return '☁️';
          if (text.includes('雨')) return '🌧️';
          if (text.includes('雪')) return '❄️';
          if (text.includes('雷')) return '⛈️';
          if (text.includes('雾')) return '🌫️';
          return '🌤️';
        };

        const weatherIcon = getWeatherIcon(weatherText);

        // 温馨提示
        const tips = locationWeather.suggestion?.tips || [];
        const tipsText = tips.length > 0 ? `\n💡 温馨提示：\n${tips.slice(0, 2).map((t: string) => `• ${t}`).join('\n')}` : '';

        // 宠物名字
        const petNames = pets.map((p: any) => p.name).join('、');

        reply = `好的！带${petNames}出去玩是个好主意！🌿🌸

🌤️ **今日天气**（${locationWeather.location?.name || '当前位置'}）：
${weatherIcon} ${weatherText}  ${temp}°C（体感${tempFeel}°C）
💧 湿度：${humidity}%  🌬️ 风力：${windScale}级

${locationWeather.suggestion?.message || ''}${tipsText}

---

请问你今天想带${petNames}怎么玩呢？

**🟢 例行遛狗** - 就在小区附近或周边走走，散步运动一下

**🔵 去大地方玩** - 去公园、绿地等开阔的地方，让${petNames}尽情撒欢

请选择或告诉我你的想法～ 🐾`;
      } else {
        // 天气获取失败，但仍给出基本回复
        const petNames = pets.map((p: any) => p.name).join('、');
        reply = `好的！带${petNames}出去玩是个好主意！🌿🌸

今天天气不错，很适合带宠物出去活动一下～

---

请问你今天想带${petNames}怎么玩呢？

**🟢 例行遛狗** - 就在小区附近或周边走走，散步运动一下

**🔵 去大地方玩** - 去公园、绿地等开阔的地方，让${petNames}尽情撒欢

请选择或告诉我你的想法～ 🐾`;
      }
    }

    // 旧的户外活动意图（仅在非推荐意图时使用）
    else if (hasOutdoorIntent(lastMessage) && pets.length > 0) {
      const parksData = await searchNearbyParks();
      if (parksData?.recommended) {
        parkRecommendation = parksData.recommended;
        const parkInfo = `

🐕 **推荐绿地**：${parkRecommendation.name}
📍 地址：${parkRecommendation.address}
📏 距离：${parkRecommendation.distanceText}
✨ 特色：${parkRecommendation.features.slice(0, 3).join('、')}
${parkRecommendation.crowdLevel === 'low' ? '🌟 目前人少，很适合带宠物去玩！' : ''}`;
        reply = reply.trim() + parkInfo;
      }
    }

    
    // 检测日程意图并返回确认信息（不直接创建）
    // 注意：如果户外活动推荐意图已触发，跳过日程检测
    let scheduleConfirmation = null;
    if (hasScheduleIntent(lastMessage) && pets.length > 0 && !isOutdoorRecommendIntent) {
      const scheduleInfo = extractScheduleFromMessage(lastMessage, pets);
      if (scheduleInfo && scheduleInfo.petId) {
        // 返回确认信息，让用户在前端确认
        const dateStr = new Date(scheduleInfo.dueDate).toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric',
        });
        const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(scheduleInfo.dueDate).getDay()];
        
        // 生成重复日程的描述
        let intervalText = '';
        if (scheduleInfo.isRecurring && scheduleInfo.intervalType) {
          const intervalNames: Record<string, string> = {
            'day': '天',
            'week': '周',
            'month': '月',
          };
          intervalText = `，每${scheduleInfo.intervalValue}${intervalNames[scheduleInfo.intervalType]}重复`;
        }
        
        scheduleConfirmation = {
          petId: scheduleInfo.petId,
          petName: scheduleInfo.petName,
          title: scheduleInfo.title,
          dueDate: scheduleInfo.dueDate,
          dueDateText: `${dateStr} ${weekDay}`,
          eventType: scheduleInfo.eventType,
          isRecurring: scheduleInfo.isRecurring,
          intervalType: scheduleInfo.intervalType,
          intervalValue: scheduleInfo.intervalValue,
          repeatCount: scheduleInfo.repeatCount,
        };
        
        // 生成确认消息
        let confirmMsg = `好的，我来帮你安排日程！📝

📋 日程确认：
• 宠物：${scheduleInfo.petName}
• 事项：${scheduleInfo.title}
• 日期：${dateStr} ${weekDay}`;
        
        if (scheduleInfo.isRecurring && scheduleInfo.intervalType) {
          const intervalNames: Record<string, string> = {
            'day': '天',
            'week': '周',
            'month': '月',
          };
          confirmMsg += `
• 重复：每${scheduleInfo.intervalValue}${intervalNames[scheduleInfo.intervalType]}一次
• 共${scheduleInfo.repeatCount}次`;
        }
        
        confirmMsg += `\n\n请确认这些信息，我会立即添加到你的护理日程中～`;
        reply = confirmMsg;
      } else if (pets.length > 0) {
        // 无法提取到宠物信息，需要用户确认
        const petNames = pets.map((p: any) => p.name).join('、');
        reply = `好的，你想安排护理日程！📝

目前有 ${petNames}，请告诉我是为哪只宠物安排，以及具体事项和日期～

例如：
• "帮球球安排疫苗，下周三"
• "给豆豆预约驱虫，下周"`;
      }
    }

    // 检测查看宠物档案意图
    let petProfileView = null;
    // 宠物档案查看（不与智能体思维链冲突）
    if (hasViewPetProfileIntent(lastMessage) && pets.length > 0 && !agentThinking) {
      // 提取具体宠物名称
      const mentionedPet = pets.find((p: any) => 
        lastMessage.includes(p.name) || 
        lastMessage.includes(p.breed)
      );
      
      if (mentionedPet) {
        // 查看特定宠物
        petProfileView = {
          petId: mentionedPet.id,
          petName: mentionedPet.name,
          petSpecies: mentionedPet.species,
          petBreed: mentionedPet.breed,
          petGender: mentionedPet.gender,
          petAge: mentionedPet.age,
          petWeight: mentionedPet.weight,
          petAvatar: mentionedPet.avatar,
          petAllergies: mentionedPet.allergies,
          petNotes: mentionedPet.notes,
          isSpecific: true,
        };
        reply = `好的，让我查看一下${mentionedPet.name}的档案！📋

🐾 ${mentionedPet.name}的详细信息如下：

${mentionedPet.breed ? `📝 品种：${mentionedPet.breed}` : ''}
${mentionedPet.gender ? `⚥ 性别：${mentionedPet.gender === 'male' ? '弟弟 ♂' : '妹妹 ♀'}` : ''}
${mentionedPet.age ? `🎂 年龄：${mentionedPet.age}岁` : ''}
${mentionedPet.weight ? `⚖️ 体重：${mentionedPet.weight}kg` : ''}
${mentionedPet.allergies ? `⚠️ 过敏史：${mentionedPet.allergies}` : ''}

如果需要修改信息，可以直接告诉我～`;
      } else {
        // 查看所有宠物
        petProfileView = {
          pets: pets.map((p: any) => ({
            petId: p.id,
            petName: p.name,
            petSpecies: p.species,
            petBreed: p.breed,
            petGender: p.gender,
            petAge: p.age,
            petWeight: p.weight,
            petAvatar: p.avatar,
          })),
          isSpecific: false,
        };
        const petList = pets.map((p: any) => `• ${p.name}${p.breed ? ` (${p.breed})` : ''}`).join('\n');
        reply = `好的，以下是你所有宠物的档案信息：📋

${petList}

想详细了解哪一只宠物，或者需要修改什么信息，可以直接告诉我～`;
      }
    }

    // 检测查看日程安排意图（不与户外活动推荐意图冲突）
    let scheduleView = null;
    if (hasViewScheduleIntent(lastMessage) && schedules.length > 0 && !isOutdoorRecommendIntent) {
      // 获取用户提到的宠物
      const mentionedPet = pets.find((p: any) => 
        lastMessage.includes(p.name) || 
        lastMessage.includes(p.breed)
      );
      
      // 筛选日程
      let filteredSchedules = schedules;
      if (mentionedPet) {
        filteredSchedules = schedules.filter((s: any) => s.petId === mentionedPet.id);
      }
      
      // 格式化日程数据
      const formattedSchedules = filteredSchedules
        .filter((s: any) => s.status !== 'completed')
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .map((s: any) => {
          const pet = pets.find((p: any) => p.id === s.petId);
          const dueDate = new Date(s.dueDate);
          const now = new Date();
          const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          const dateStr = dueDate.toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
          });
          const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dueDate.getDay()];
          
          // 日程类型名称
          const typeNames: Record<string, string> = {
            'vaccination': '💉 疫苗接种',
            'parasite_prevention': '🛡️ 驱虫护理',
            'grooming': '✂️ 美容护理',
            'wellness_exam': '🏥 健康检查',
            'dental_care': '🦷 牙齿护理',
            'feeding': '🍽️ 喂食计划',
            'exercise': '🌳 户外活动',
            'other': '📋 其他',
          };
          
          return {
            id: s.id,
            petId: s.petId,
            petName: pet?.name || '宠物',
            title: s.title,
            eventType: s.eventType,
            eventTypeText: typeNames[s.eventType] || '📋 其他',
            dueDate: s.dueDate,
            dueDateText: `${dateStr} ${weekDay}`,
            daysUntil,
            daysUntilText: daysUntil < 0 ? '已过期' : 
                          daysUntil === 0 ? '今天' : 
                          daysUntil === 1 ? '明天' : 
                          `${daysUntil}天后`,
            priority: s.priority || 'medium',
            status: s.status || 'pending',
          };
        });
      
      scheduleView = {
        schedules: formattedSchedules,
        isFiltered: !!mentionedPet,
        filterPetName: mentionedPet?.name || null,
        totalCount: formattedSchedules.length,
      };
      
      // 生成回复
      if (formattedSchedules.length === 0) {
        reply = `目前没有待执行的护理日程。🌿

${mentionedPet ? `${mentionedPet.name}的` : ''}日程安排已清空，如果需要安排新的日程，告诉我具体事项和时间哦～`;
      } else {
        const petLabel = mentionedPet ? `${mentionedPet.name}的` : '所有';
        let scheduleList = formattedSchedules.slice(0, 5).map((s: any) => 
          `• ${s.dueDateText} - ${s.title}（${s.petName}）`
        ).join('\n');
        
        if (formattedSchedules.length > 5) {
          scheduleList += `\n• ...还有${formattedSchedules.length - 5}项日程`;
        }
        
        reply = `以下是${petLabel}护理日程安排：📅\n\n${scheduleList}\n\n详细日程已弹出显示，详情可查看弹窗～`;
      }
    }

    // ========== 检测宠物生病意图 ==========
    let sickPetConfirmation: {
      petId: string | null;
      petName: string | null;
      symptoms: { category: string; symptom: string }[];
      symptomText: string;
      detectedDate: string;
      recommendedMedications: { name: string; usage: string; notes: string }[];
    } | null = null;
    
    // 宠物生病检测（与户外活动互斥 + 不与智能体思维链冲突）
    if (hasSickPetIntent(lastMessage) && pets.length > 0 && !isOutdoorRecommendIntent && !imageData && !agentThinking) {
      // 查找用户提到的宠物
      let sickPet = pets.find((p: any) => 
        lastMessage.includes(p.name) || 
        (p.breed && lastMessage.includes(p.breed))
      );
      
      // 如果没有明确提到宠物但有其他宠物，选择第一只
      if (!sickPet && pets.length > 0) {
        sickPet = pets[0];
      }
      
      if (sickPet) {
        // 提取症状
        const symptoms = extractSymptoms(lastMessage);
        const symptomText = symptoms.map(s => s.symptom).join('、') || '身体不适';
        const recommendedMedications = recommendMedications(symptoms);
        
        sickPetConfirmation = {
          petId: sickPet.id,
          petName: sickPet.name,
          symptoms,
          symptomText,
          detectedDate: new Date().toISOString().split('T')[0],
          recommendedMedications,
        };
        
        // 生成回复
        const medList = recommendedMedications.slice(0, 3).map(m => `• ${m.name}（${m.usage}）`).join('\n');
        reply = `看到${sickPet.name}好像不舒服了？😟
        
🤒 症状：${symptomText}
${recommendedMedications.length > 0 ? `💊 建议用药：\n${medList}\n` : ''}
（以上仅供参考，具体用药请遵医嘱）

需要我帮你记录这个情况吗？我可以：
1. 创建病历记录
2. 推荐合适的药物
3. 设置用药提醒

请确认信息并选择需要的服务～`;
      }
    }

    // 检测并自动创建用药提醒
    let medicationReminderCreated = false;
    let medicationReminderInfo = null;
    if (hasMedicationReminderIntent(lastMessage) && pets.length > 0) {
      // 尝试为每只宠物创建用药提醒（如果有病例记录）
      for (const pet of pets) {
        const result = await createMedicationReminderFromRecord(pet.id, pet.name);
        if (result.success && result.reminder) {
          medicationReminderCreated = true;
          medicationReminderInfo = result.reminder;
          
          const medsStr = result.reminder.medications.join('、');
          const nextDoseTime = new Date(result.reminder.next_dose_time);
          const timeStr = nextDoseTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          reply = `好的，已经为${pet.name}开启用药提醒啦！💊⏰

📋 疾病：${result.reminder.disease_name}
💊 建议用药：${medsStr}
⏰ 下次用药时间：${timeStr}
📊 疗程：每天${result.reminder.frequency}次，共${result.reminder.remaining_doses}次

主页的用药提醒组件已经显示了，记得按时用药哦～🐾

${reply.replace(/\n+$/, '')}`;
          
          break; // 只创建一个
        } else if (!result.success && result.message) {
          reply = `好的，${result.message}。请先在健康分析中添加病例记录，这样我才能帮你设置用药提醒～`;
        }
      }
    }

    // 检测并自动添加宠物（不与户外活动推荐意图冲突）
    let petCreated = false;
    let newPetInfo = null;
    let petConfirmation = null; // 新增：宠物信息确认标志
    if (hasAddPetIntent(lastMessage) && !isOutdoorRecommendIntent) {
      const petInfo = extractPetInfoFromMessage(lastMessage);
      
      // 只要检测到添加宠物意图，就返回确认卡片
      const finalPetInfo = {
        name: petInfo?.name || '',
        species: petInfo?.species || 'dog',
        breed: petInfo?.breed || '',
      };
      
      // 返回确认信息
      petConfirmation = {
        name: finalPetInfo.name,
        species: finalPetInfo.species,
        speciesText: finalPetInfo.species === 'dog' ? '🐕 狗狗' : '🐱 猫咪',
        breed: finalPetInfo.breed || (finalPetInfo.species === 'dog' ? '狗狗' : '猫咪'),
      };
      
      if (petInfo?.name || petInfo?.species) {
        // 信息完整
        reply = `太好了，你想添加新宠物！🎉

让我先确认一下信息：
• 名字：${finalPetInfo.name || '待填写'}
• 物种：${petConfirmation.speciesText}
${finalPetInfo.breed ? `• 品种：${finalPetInfo.breed}` : '• 品种：待填写'}

这些信息对吗？如果确认无误，我会立即帮你在档案中添加这位新成员！`;
      } else {
        // 信息不足，显示待填写
        reply = `太好了，你想添加新宠物！🎉

请填写以下信息：
• 名字：待填写
• 物种：🐕 狗狗
• 品种：待填写

请确认这些信息，我会帮你在档案中添加这位新成员！`;
      }
    }

    // 检测并记录体重（不与户外活动推荐意图冲突）
    let weightRecorded = false;
    let weightPetInfo = null;
    if (hasRecordWeightIntent(lastMessage) && pets.length > 0 && !isOutdoorRecommendIntent) {
      const weight = extractWeightFromMessage(lastMessage);
      
      if (weight !== null) {
        // 找到对应的宠物
        let targetPet = pets.length === 1 ? pets[0] : null;
        
        if (!targetPet) {
          // 尝试从消息中匹配宠物名
          for (const pet of pets) {
            if (lastMessage.includes(pet.name)) {
              targetPet = pet;
              break;
            }
          }
        }
        
        if (targetPet) {
          // 判断是斤还是公斤，默认斤
          const isJin = !lastMessage.includes('公斤') && !lastMessage.includes('kg') && !lastMessage.includes('千克');
          const weightKg = isJin ? weight / 2 : weight;
          
          const result = await updatePetWeightFromChat(targetPet.id, targetPet.name, weightKg);
          if (result.success) {
            weightRecorded = true;
            weightPetInfo = { petId: targetPet.id, petName: targetPet.name, weight: weightKg };
            
            reply = `已记录${targetPet.name}的体重！📊

⚖️ 当前体重：${weightKg.toFixed(1)} kg

我会持续跟踪它的体重变化，帮助你了解它的健康状况～🐾`;
          }
        }
      } else {
        // 没有提取到体重，引导用户提供
        const petNames = pets.map((p: any) => p.name).join('、');
        reply = `好的，你想记录体重！📊

请告诉我具体体重，例如：
• "${pets[0]?.name || '球球'}体重12斤"
• "${pets[0]?.name || '球球'}称了6.5公斤"

${pets.length > 1 ? `目前有 ${petNames}，你想记录哪个的体重？` : ''}`;
      }
    }

    // 检测并确认排便记录（不与户外活动推荐意图冲突）
    let bowelConfirmation: {
      petId: string | null;
      petName: string | null;
      recordDate: string;
      type: 'solid' | 'liquid' | 'both';
      typeText: string;
    } | null = null;
    
    if (hasRecordBowelIntent(lastMessage) && pets.length > 0 && !isOutdoorRecommendIntent) {
      const bowelInfo = extractBowelFromMessage(lastMessage, pets);
      
      if (bowelInfo && bowelInfo.petId) {
        // 返回确认信息，让用户选择量级（颜色）
        const typeTextMap: Record<string, string> = {
          solid: '大便',
          liquid: '小便',
          both: '都有'
        };
        
        bowelConfirmation = {
          petId: bowelInfo.petId,
          petName: bowelInfo.petName,
          recordDate: bowelInfo.recordDate,
          type: bowelInfo.type,
          typeText: typeTextMap[bowelInfo.type],
        };
        
        // 生成回复
        const dateText = bowelInfo.recordDate === new Date().toISOString().split('T')[0] ? '今天' : 
                        bowelInfo.recordDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] ? '昨天' : 
                        new Date(bowelInfo.recordDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        
        reply = `好的，我来帮你记录${bowelInfo.petName}的排便情况！💩

📅 日期：${dateText}
🔖 类型：${typeTextMap[bowelInfo.type]}

请确认排便的量级（颜色代表健康程度）：
🟢 绿色 = 正常/少量
🟡 黄色 = 中等量
🔴 红色 = 大量/异常

点击卡片下方选择今天的排便量级～`;
      }
    }

    // 检测健康分析意图
    let healthAnalysisNeeded = false;
    let healthAnalysisPetInfo = null;
    if (hasHealthAnalysisIntent(lastMessage)) {
      // 找到对应的宠物
      let targetPet = pets.length === 1 ? pets[0] : null;
      
      if (!targetPet) {
        for (const pet of pets) {
          if (lastMessage.includes(pet.name)) {
            targetPet = pet;
            break;
          }
        }
      }
      
      if (targetPet) {
        healthAnalysisNeeded = true;
        healthAnalysisPetInfo = { petId: targetPet.id, petName: targetPet.name };
        
        reply = `好的，我来帮${targetPet.name}做健康分析！📸

请上传${targetPet.name}的照片（皮肤、眼睛、耳朵、粪便等），我会帮你分析健康状况。

💡 拍照小技巧：
• 光线要充足，避免逆光
• 拍摄要清晰，能看到细节
• 如果是皮肤问题，拍摄患处特写

你可以直接在这里发送照片～`;
      } else if (pets.length > 0) {
        const petNames = pets.join('、');
        reply = `好的，你想做健康分析！📸

请告诉我是哪只宠物：${petNames}

例如："帮球球分析一下皮肤" 或直接上传照片并说明是哪个部位`;
      } else {
        reply = `好的，你想做健康分析！📸

请先添加宠物，这样我才能帮你分析哦～

你可以直接说："帮我添加一只新宠物" 来开始！`;
      }
    }

    // ========== 检测健康报告意图 ==========
    let healthReportData: {
      report: string;
      petId: string;
      petName: string;
    } | null = null;

    if (hasHealthReportIntent(lastMessage) && pets.length > 0) {
      // 找到对应的宠物
      let targetPet = pets.length === 1 ? pets[0] : null;

      if (!targetPet) {
        for (const pet of pets) {
          if (lastMessage.includes(pet.name)) {
            targetPet = pet;
            break;
          }
        }
      }

      if (targetPet) {
        // 获取病例历史（medical_records表）
        const medicalRecords = await getPetMedicalHistory(targetPet.id);
        // 获取健康记录表中的就诊记录（health_records type='medical'）
        const healthMedicalRecords = await getHealthRecordsMedical(targetPet.id, 30);
        // 合并所有医疗记录
        const allMedicalRecords = [...medicalRecords, ...healthMedicalRecords];
        
        // 获取所有健康记录用于综合分析
        const healthRecords = await getAllHealthRecords(targetPet.id, 7);

        // 生成健康报告
        const report = await generateHealthReport(targetPet, allMedicalRecords, healthRecords);

        healthReportData = {
          report,
          petId: targetPet.id,
          petName: targetPet.name,
        };

        // 直接使用生成的报告作为回复
        reply = report;
      } else if (pets.length > 0) {
        // 多只宠物，需要用户选择
        const petNames = pets.map((p: any) => p.name).join('、');
        reply = `好的，你想看健康报告！📊

请告诉我是哪只宠物：${petNames}

例如："给我看看球球的健康报告" 或 "分析一下豆豆最近7天的健康状况"`;
      }
    }

    // 保存对话到记忆（异步，不阻塞响应）
    if (userId) {
      // 保存用户消息
      saveChatMemory(userId, currentSessionId, 'user', lastMessage);
      // 保存AI回复
      saveChatMemory(userId, currentSessionId, 'assistant', reply);
      
      // 【场景一核心】用 AI 提取长期记忆（替代正则匹配）
      try {
        const extracted = await extractMemoriesWithAI(userId, lastMessage, pets);
        if (extracted.length > 0) {
          console.log(`[长期记忆] AI 提取到 ${extracted.length} 条新记忆:`, extracted.map(m => `[${m.type}] ${m.content}`));
        }
      } catch (err) {
        console.log('[长期记忆] AI提取失败，降级到正则');
        extractKeyMemories(userId, pets);
      }
    }

    return NextResponse.json({
      reply,
      contextUsed: hasData,
      sessionId: currentSessionId,
      scheduleConfirmation,
      scheduleView,
      medicationReminderCreated,
      medicationReminderInfo,
      petCreated,
      newPetInfo,
      petConfirmation,
      petProfileView,
      weightRecorded,
      weightPetInfo,
      healthAnalysisNeeded,
      healthAnalysisPetInfo,
      healthReportData,
      allergyUpdated: allergyUpdate?.allergyInfo ? {
        petName: allergyUpdate.petId ? pets.find((p: any) => p.id === allergyUpdate.petId)?.name : null,
        allergy: allergyUpdate.allergyInfo
      } : null,
      parkRecommendation: parkRecommendation ? {
        name: parkRecommendation.name,
        address: parkRecommendation.address,
        distance: parkRecommendation.distanceText,
      } : null,
      outdoorActivityRecommend,
      sickPetConfirmation,
      bowelConfirmation,
      agentThinking: agentThinking ? {
        thinkingSteps: agentThinking.thinkingSteps,
        finalReply: agentThinking.finalReply,
      } : null,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'AI服务调用过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'AI服务暂时不可用，请稍后再试' },
      { status: 500 }
    );
  }
}
