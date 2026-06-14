// Standard Care Schedules Configuration based on AVMA best practices
import { CareScheduleTemplate } from '@/types';

export const CARE_SCHEDULE_TEMPLATES: Record<'dog' | 'cat', { 
  pet_type: string; 
  schedules: CareScheduleTemplate[] 
}> = {
  dog: {
    pet_type: 'dog',
    schedules: [
      {
        id: 'dog-dhpp-puppy',
        name: 'DHPP 疫苗系列（幼犬）',
        description: '犬瘟热、肝炎、细小病毒、犬副流感疫苗系列',
        pet_type: 'dog',
        event_type: 'vaccination',
        start_condition: { age_months: 2 },
        recurrence: { interval: 3, unit: 'weeks', conditions: { age_max_months: 4 } },
        end_condition: { age_months: 4 },
        priority: 'high',
        source: 'AVMA 犬类疫苗指南',
      },
      {
        id: 'dog-dhpp-annual',
        name: 'DHPP 年度加强针',
        description: '犬瘟热、肝炎、细小病毒、犬副流感年度加强针',
        pet_type: 'dog',
        event_type: 'vaccination',
        start_condition: { age_months: 15 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 犬类疫苗指南',
      },
      {
        id: 'dog-rabies',
        name: '狂犬病疫苗',
        description: '狂犬病疫苗接种',
        pet_type: 'dog',
        event_type: 'vaccination',
        start_condition: { age_months: 4 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 犬类疫苗指南',
      },
      {
        id: 'dog-wellness-annual',
        name: '年度体检',
        description: '全面的年度健康检查',
        pet_type: 'dog',
        event_type: 'wellness_exam',
        start_condition: { age_months: 12 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 预防保健指南',
      },
      {
        id: 'dog-heartworm',
        name: '心丝虫预防',
        description: '每月心丝虫预防用药',
        pet_type: 'dog',
        event_type: 'parasite_prevention',
        start_condition: { age_months: 2 },
        recurrence: { interval: 1, unit: 'months' },
        priority: 'high',
        source: '美国心丝虫协会指南',
      },
      {
        id: 'dog-deworming-internal',
        name: '内驱虫',
        description: '每3个月进行一次体内驱虫',
        pet_type: 'dog',
        event_type: 'parasite_prevention',
        start_condition: { age_months: 2 },
        recurrence: { interval: 3, unit: 'months' },
        priority: 'high',
        source: 'AVMA 寄生虫控制指南',
      },
      {
        id: 'dog-deworming-external',
        name: '外驱虫',
        description: '每月进行一次体外驱虫',
        pet_type: 'dog',
        event_type: 'parasite_prevention',
        start_condition: { age_months: 2 },
        recurrence: { interval: 1, unit: 'months' },
        priority: 'high',
        source: 'AVMA 寄生虫控制指南',
      },
      {
        id: 'dog-dental',
        name: '牙齿检查与清洁',
        description: '专业牙齿检查和清洁',
        pet_type: 'dog',
        event_type: 'dental_care',
        start_condition: { age_months: 24 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'medium',
        source: 'AVMA 牙齿护理指南',
      },
    ],
  },
  cat: {
    pet_type: 'cat',
    schedules: [
      {
        id: 'cat-fvrcp-kitten',
        name: 'FVRCP 疫苗系列（幼猫）',
        description: '猫病毒性鼻气管炎、杯状病毒、白细胞减少症疫苗系列',
        pet_type: 'cat',
        event_type: 'vaccination',
        start_condition: { age_months: 2 },
        recurrence: { interval: 3, unit: 'weeks', conditions: { age_max_months: 4 } },
        end_condition: { age_months: 4 },
        priority: 'high',
        source: 'AVMA 猫类疫苗指南',
      },
      {
        id: 'cat-fvrcp-annual',
        name: 'FVRCP 年度加强针',
        description: '猫三联年度加强针',
        pet_type: 'cat',
        event_type: 'vaccination',
        start_condition: { age_months: 15 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 猫类疫苗指南',
      },
      {
        id: 'cat-rabies',
        name: '狂犬病疫苗',
        description: '狂犬病疫苗接种',
        pet_type: 'cat',
        event_type: 'vaccination',
        start_condition: { age_months: 4 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 猫类疫苗指南',
      },
      {
        id: 'cat-wellness-annual',
        name: '年度体检',
        description: '全面的年度健康检查',
        pet_type: 'cat',
        event_type: 'wellness_exam',
        start_condition: { age_months: 12 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'high',
        source: 'AVMA 预防保健指南',
      },
      {
        id: 'cat-parasite',
        name: '寄生虫预防',
        description: '每月跳蚤、蜱虫和体内寄生虫预防',
        pet_type: 'cat',
        event_type: 'parasite_prevention',
        start_condition: { age_months: 2 },
        recurrence: { interval: 1, unit: 'months' },
        priority: 'medium',
        source: 'AVMA 寄生虫控制指南',
      },
      {
        id: 'cat-dental',
        name: '牙齿检查与清洁',
        description: '专业牙齿检查和清洁',
        pet_type: 'cat',
        event_type: 'dental_care',
        start_condition: { age_months: 24 },
        recurrence: { interval: 1, unit: 'years' },
        priority: 'medium',
        source: 'AVMA 牙齿护理指南',
      },
    ],
  },
};

export function getCareSchedulesForPetType(petType: 'dog' | 'cat') {
  return CARE_SCHEDULE_TEMPLATES[petType].schedules;
}

export function getAllCareScheduleRules(): CareScheduleTemplate[] {
  return [
    ...CARE_SCHEDULE_TEMPLATES.dog.schedules,
    ...CARE_SCHEDULE_TEMPLATES.cat.schedules,
  ];
}

// 计算下次到期日期
export function calculateNextDueDate(
  schedule: CareScheduleTemplate,
  petDateOfBirth: string,
  lastEventDate?: string
): Date {
  const now = new Date();
  let baseDate: Date;

  if (lastEventDate) {
    baseDate = new Date(lastEventDate);
  } else {
    const startAgeMonths = schedule.start_condition.age_months || 0;
    baseDate = new Date(petDateOfBirth);
    baseDate.setMonth(baseDate.getMonth() + startAgeMonths);
    
    // 如果计算出的日期在当前日期之前，从现在开始计算
    if (baseDate < now) {
      baseDate = new Date(now);
    }
  }

  const nextDate = new Date(baseDate);
  switch (schedule.recurrence.unit) {
    case 'days':
      nextDate.setDate(nextDate.getDate() + schedule.recurrence.interval);
      break;
    case 'weeks':
      nextDate.setDate(nextDate.getDate() + schedule.recurrence.interval * 7);
      break;
    case 'months':
      nextDate.setMonth(nextDate.getMonth() + schedule.recurrence.interval);
      break;
    case 'years':
      nextDate.setFullYear(nextDate.getFullYear() + schedule.recurrence.interval);
      break;
  }

  return nextDate;
}

// 计算宠物年龄（月）
export function calculateAgeInMonths(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

// 获取宠物适合的护理计划
export function getApplicableSchedules(petType: 'dog' | 'cat', petAgeMonths: number) {
  const schedules = getCareSchedulesForPetType(petType);
  return schedules.filter((schedule) => {
    const minAge = schedule.start_condition.age_months || 0;
    if (petAgeMonths < minAge) return false;
    
    if (schedule.end_condition?.age_months && petAgeMonths > schedule.end_condition.age_months) {
      return false;
    }
    
    if (schedule.recurrence.conditions?.age_max_months && 
        petAgeMonths > schedule.recurrence.conditions.age_max_months) {
      return false;
    }
    
    return true;
  });
}
