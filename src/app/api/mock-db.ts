import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库 - 生产环境请替换为真实数据库
let pets: any[] = [];
let schedules: any[] = [];
let healthRecords: any[] = [];

// ==================== 宠物档案 API ====================

export async function GET_PETS() {
  return NextResponse.json(pets);
}

export async function POST_PET(request: NextRequest) {
  const pet = await request.json();
  pet.id = Date.now().toString();
  pet.createdAt = new Date().toISOString();
  pets.push(pet);
  return NextResponse.json(pet, { status: 201 });
}

// ==================== 护理日程 API ====================

export async function GET_SCHEDULES() {
  return NextResponse.json(schedules);
}

export async function POST_SCHEDULE(request: NextRequest) {
  const schedule = await request.json();
  schedule.id = Date.now().toString();
  schedules.push(schedule);
  return NextResponse.json(schedule, { status: 201 });
}

export async function PUT_SCHEDULE(request: NextRequest) {
  const { id, ...updates } = await request.json();
  const index = schedules.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    schedules[index] = { ...schedules[index], ...updates };
    return NextResponse.json(schedules[index]);
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// ==================== 健康记录 API ====================

export async function GET_HEALTH_RECORDS() {
  return NextResponse.json(healthRecords);
}

export async function POST_HEALTH_RECORD(request: NextRequest) {
  const record = await request.json();
  record.id = Date.now().toString();
  healthRecords.push(record);
  return NextResponse.json(record, { status: 201 });
}
