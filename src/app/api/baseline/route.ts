import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updateBaselineMemory, saveUserLongTermMemory } from '@/lib/chatMemory';

/**
 * GET /api/baseline - 检查行为基线异常
 * 
 * 场景三：反常指标预警
 * - 查询最近14天的护理日程（exercise类型）计算平均运动量
 * - 查询最近7天的饮食记录计算平均进食次数  
 * - 对比当前值，偏离40%以上则触发预警
 * 
 * 前端可调用此接口获取基线报告，也可由系统定时调用
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const userId = 1; // 默认用户ID

    const results: any[] = [];

    // 1. 获取所有宠物
    const pets: any[] = await query('SELECT id, name FROM pets' + (petId ? ' WHERE id = ?' : ''), petId ? [petId] : []);
    
    if (pets.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有找到宠物',
        anomalies: [],
        baselines: [],
      });
    }

    for (const pet of pets) {
      const petResult: any = {
        petId: pet.id,
        petName: pet.name,
        metrics: {},
        hasAnomaly: false,
      };

      // ===== 运动量基线分析 =====
      // 查询最近14天的 exercise 类日程完成记录
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const dateStr2W = twoWeeksAgo.toISOString().split('T')[0];

      const walkSchedules: any[] = await query(
        `SELECT due_date, status, completed_date 
         FROM care_schedules 
         WHERE pet_id = ? AND event_type = 'exercise' AND DATE(due_date) >= ?
         ORDER BY due_date ASC`,
        [pet.id, dateStr2W]
      );

      if (walkSchedules.length >= 3) {
        // 有足够数据，计算基线
        const completedCount = walkSchedules.filter(s => s.status === 'completed').length;
        const avgDailyWalks = completedCount / 14; // 平均每天完成次数
        
        // 最近3天的数据
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const recentWalks = walkSchedules.filter(s => new Date(s.due_date) >= threeDaysAgo);
        const recentCompleted = recentWalks.filter(s => s.status === 'completed').length;
        const avgRecentWalks = recentCompleted / 3;

        const baselineValue = avgDailyWalks;
        const currentValue = avgRecentWalks;
        const percentChange = baselineValue > 0 ? Math.abs(currentValue - baselineValue) / baselineValue : 0;
        const isAnomaly = percentChange > 0.4 && completedCount > 0;

        petResult.metrics.walk = {
          baseline: `${baselineValue.toFixed(1)}次/天`,
          current: `${currentValue.toFixed(1)}次/天`,
          totalRecent: recentCompleted,
          period: '最近3天 vs 过去14天',
          isAnomaly,
          direction: currentValue < baselineValue ? 'below' : 'above',
          percentChange: Math.round(percentChange * 100),
          dataPoints: walkSchedules.length,
        };

        if (isAnomaly) {
          petResult.hasAnomaly = true;
          
          // 自动写入 baseline 类型记忆
          await updateBaselineMemory(userId, pet.id, pet.name, 'walk_duration', recentCompleted, 14);
          
          // 同时写入一条异常提醒记忆
          if (currentValue < baselineValue) {
            await saveUserLongTermMemory(
              userId, 'baseline',
              `⚠️ ${pet.name}近期运动量明显下降！平均每天${baselineValue.toFixed(1)}次 → 最近3天仅${currentValue.toFixed(1)}次/天。可能原因：天气不好、主人忙碌、宠物身体不适？请关注`,
              pet.id, pet.name
            );
          }
        }
      }

      // ===== 饮食基线分析 =====
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const dateStr1W = oneWeekAgo.toISOString().split('T')[0];

      const dietRecords: any[] = await query(
        `SELECT record_date, COUNT(*) as cnt 
         FROM diet_records 
         WHERE pet_id = ? AND record_date >= ?
         GROUP BY record_date ORDER BY record_date ASC`,
        [pet.id, dateStr1W]
      );

      if (dietRecords.length >= 3) {
        const totalMeals = dietRecords.reduce((sum, r) => sum + r.cnt, 0);
        const avgDailyMeals = totalMeals / dietRecords.length;

        // 最近2天对比
        const recentDiet = dietRecords.slice(-2);
        const recentAvg = recentDiet.reduce((sum, r) => sum + r.cnt, 0) / Math.max(recentDiet.length, 1);
        
        const mealChange = avgDailyMeals > 0 ? Math.abs(recentAvg - avgDailyMeals) / avgDailyMeals : 0;
        const isMealAnomaly = mealChange > 0.5; // 饮食偏离50%算异常

        petResult.metrics.meal = {
          baseline: `${avgDailyMeals.toFixed(1)}次/天`,
          current: `${recentAvg.toFixed(1)}次/天`,
          isAnomaly: isMealAnomaly,
          direction: recentAvg < avgDailyMeals ? 'below' : 'above',
          dataPoints: dietRecords.length,
        };
        
        if (isMealAnomaly) {
          petResult.hasAnomaly = true;
        }
      }

      // ===== 体重基线分析 =====
      const weightRecords: any[] = await query(
        `SELECT weight, recorded_at 
         FROM weight_records 
         WHERE pet_id = ? AND recorded_at >= ?
         ORDER BY recorded_at ASC`,
        [pet.id, dateStr1W]
      );

      if (weightRecords.length >= 2) {
        const weights = weightRecords.map(r => parseFloat(r.weight));
        const firstHalf = weights.slice(0, Math.ceil(weights.length / 2));
        const secondHalf = weights.slice(Math.floor(weights.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const weightChangePercent = Math.abs(avgSecond - avgFirst) / avgFirst;
        const isWeightAnomaly = weightChangePercent > 0.05; // 体重变化5%以上算显著

        petResult.metrics.weight = {
          baseline: `${avgFirst.toFixed(2)}kg`,
          current: `${avgSecond.toFixed(2)}kg`,
          change: `${((avgSecond - avgFirst) * 1000).toFixed(0)}g`,
          changeDirection: avgSecond > avgFirst ? 'gain' : 'loss',
          isAnomaly: isWeightAnomaly,
          dataPoints: weights.length,
        };

        if (isWeightAnomaly) {
          petResult.hasAnomaly = true;
        }
      }

      results.push(petResult);
    }

    const hasAnyAnomaly = results.some((r: any) => r.hasAnomaly);

    return NextResponse.json({
      success: true,
      baselines: results,
      hasAnomaly: hasAnyAnomaly,
      checkedAt: new Date().toISOString(),
      message: hasAnyAnomaly 
        ? '检测到部分宠物的行为数据偏离正常范围，请注意查看详情'
        : '所有宠物行为数据在正常范围内',
    });
  } catch (error: any) {
    console.error('[基线检查] 失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
