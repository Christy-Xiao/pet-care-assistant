'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============ Haversine 公式：两点间距离（米）============
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 地球半径(米)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number; // Date.now()
  accuracy?: number;
}

export type WalkPhase = 'idle' | 'confirming' | 'tracking' | 'finished';

export interface WalkState {
  phase: WalkPhase;
  plannedMinutes: number; // 用户计划的遛狗时长
  elapsedSeconds: number; // 已过秒数
  totalDistance: number;   // 总距离(米)
  currentPoint: GpsPoint | null;
  path: GpsPoint[];        // 全部轨迹点
  error: string | null;
  speed: number;           // 当前速度 km/h
}

export interface UseWalkTrackerOptions {
  petId?: string;
  petName?: string;
  onFinished?: (result: { distance: number; durationSeconds: number; path: GpsPoint[] }) => void;
}

// 🆕 内部状态：存储多宠信息 — 改为在hook内部声明
// const walkPetsRef = useRef<string[]>([]); // ❌ 移到函数体内部

export function useWalkTracker(options: UseWalkTrackerOptions = {}) {
  const [state, setState] = useState<WalkState>({
    phase: 'idle',
    plannedMinutes: 30,
    elapsedSeconds: 0,
    totalDistance: 0,
    currentPoint: null,
    path: [],
    error: null,
    speed: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPointRef = useRef<GpsPoint | null>(null);
  const walkPetsRef = useRef<string[]>([]); // ✅ 在hook内部声明

  // 清理所有资源
  const cleanup = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    lastPointRef.current = null;

    // 释放 Wake Lock
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // 请求屏幕常亮 (Wake Lock API)
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[WalkTracker] Wake Lock acquired');
      }
    } catch (e) {
      console.log('[WalkTracker] Wake Lock not supported or failed:', e);
    }
  }, []);

  // 开始确认阶段
  const startConfirm = useCallback((suggestedMinutes: number) => {
    setState((prev) => ({
      ...prev,
      phase: 'confirming',
      plannedMinutes: suggestedMinutes,
      error: null,
    }));
  }, []);

  // 确认并开始追踪
  // 🆕 支持 petIds 参数（多宠）和5秒演示模式
  const startTracking = useCallback(async (minutes: number, petIds?: string[]) => {
    cleanup();

    // 🆕 记录选中的宠物ID列表
    if (petIds && petIds.length > 0) {
      walkPetsRef.current = petIds;
    }

    const isDemoMode = minutes <= 0.1; // 🆕 5秒演示模式

    // 演示模式不需要GPS定位
    if (!isDemoMode) {
      // 检查浏览器是否支持定位
      if (!navigator.geolocation) {
        setState((prev) => ({
          ...prev,
          phase: 'idle',
          error: '您的浏览器不支持定位功能',
        }));
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      phase: 'tracking',
      plannedMinutes: isDemoMode ? (5 / 60) : minutes, // 🆕 演示模式：5秒 = 5/60分钟
      elapsedSeconds: 0,
      totalDistance: 0,
      path: [],
      error: null,
      speed: 0,
      currentPoint: null,
    }));

    // 请求 Wake Lock（演示模式跳过）
    if (!isDemoMode) {
      await requestWakeLock();
    }

    // 启动定时器
    timerRef.current = setInterval(() => {
      setState((prev) => {
        const newElapsed = prev.elapsedSeconds + 1;
        const plannedSec = prev.plannedMinutes * 60;

        // 时间到了 → 自动结束
        if (newElapsed >= plannedSec) {
          setTimeout(() => finishTracking(), 0);
          return { ...prev, elapsedSeconds: newElapsed };
        }

        return { ...prev, elapsedSeconds: newElapsed };
      });
    }, 1000);

    // 注册后端定时推送（前端被杀也能收到）
    try {
      const actualSeconds = isDemoMode ? 5 : minutes * 60; // 🆕 演示模式用5秒
      const endTime = new Date(Date.now() + actualSeconds * 1000).toISOString();

      // 🆕 获取所有选中宠物的名字用于推送通知
      let pushPetName = options.petName || '宠物';
      if (petIds && petIds.length > 1) {
        pushPetName += '们'; // 多只宠物加"们"
      }

      await fetch('/api/walk/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime,
          petName: pushPetName,
          plannedMinutes: isDemoMode ? 5 / 60 : minutes, // 🆕
          petId: options.petId,
          isDemo: isDemoMode, // 🆕 标记演示模式
          petIds: petIds || [], // 🆕 多宠ID列表
        }),
      });
      console.log(`[WalkTracker] 后端推送已注册: ${isDemoMode ? '5秒演示' : endTime}`);
    } catch (e) {
      console.log('[WalkTracker] 后端推送注册失败（不影响使用）:', e);
    }

    // 🆕 演示模式：不启动GPS，模拟一点数据让UI好看点
    if (isDemoMode) {
      console.log('[WalkTracker] 🎬 演示模式：5秒后自动结束');
      return;
    }

    // 启动 GPS 追踪（非演示模式）
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp || Date.now(),
          accuracy: position.coords.accuracy,
        };

        setState((prev) => {
          // 计算距离增量
          let newTotalDistance = prev.totalDistance;
          let newSpeed = 0;

          if (lastPointRef.current && prev.path.length > 0) {
            const segmentDist = haversine(
              lastPointRef.current.lat,
              lastPointRef.current.lng,
              point.lat,
              point.lng,
            );

            const timeDiff = (point.timestamp - lastPointRef.current.timestamp) / 1000; // 秒

            // 过滤异常点：
            // 1. 距离 < 2m（抖动）跳过
            // 2. 速度 > 50km/h（开车了）跳过
            // 3. 精度 > 200m（定位不准）跳过
            if (segmentDist >= 2 && timeDiff > 0 && timeDiff < 300 && (point.accuracy ?? 0) < 200) {
              const speedKmh = (segmentDist / timeDiff) * 3.6;
              if (speedKmh <= 50) {
                newTotalDistance += segmentDist;
                newSpeed = speedKmh;

                // 更新上一个有效点
                lastPointRef.current = point;

                return {
                  ...prev,
                  totalDistance: newTotalDistance,
                  currentPoint: point,
                  path: [...prev.path, point],
                  speed: newSpeed,
                };
              }
            }
          }

          // 第一个点或无效的点 — 只更新当前位置
          if (!lastPointRef.current) {
            lastPointRef.current = point;
          }

          return {
            ...prev,
            currentPoint: point,
            path: prev.path.length === 0 ? [point] : prev.path,
          };
        });
      },
      (error) => {
        console.warn('[WalkTracker] GPS error:', error.message);
        let errorMsg = '定位失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = '请允许位置权限以记录轨迹';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = '无法获取位置信号';
            break;
          case error.TIMEOUT:
            errorMsg = '定位超时，请重试';
            break;
        }
        setState((prev) => ({ ...prev, error: errorMsg }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,       // 接受5秒内的缓存
        timeout: 15000,         // 15秒超时
      }
    );
  }, [options.petId, options.petName, cleanup, requestWakeLock]);

  // 手动结束追踪
  const finishTracking = useCallback(() => {
    cleanup();

    setState((prev) => {
      // 回调通知父组件保存运动记录
      if (options.onFinished) {
        options.onFinished({
          distance: prev.totalDistance,
          durationSeconds: prev.elapsedSeconds,
          path: prev.path,
        });
      }

      return {
        ...prev,
        phase: 'finished',
      };
    });

    // 取消后端的推送任务（如果还没发的话）
    try { fetch('/api/walk/cancel', { method: 'POST' }).catch(() => {}); } catch {}
  }, [cleanup, options.onFinished]);

  // 重置到初始状态
  const reset = useCallback(() => {
    cleanup();
    setState({
      phase: 'idle',
      plannedMinutes: 30,
      elapsedSeconds: 0,
      totalDistance: 0,
      currentPoint: null,
      path: [],
      error: null,
      speed: 0,
    });
  }, [cleanup]);

  // 格式化剩余时间 mm:ss
  const remainingTimeStr = state.phase === 'tracking'
    ? (() => {
        const remain = state.plannedMinutes * 60 - state.elapsedSeconds;
        if (remain <= 0) return '00:00';
        const m = Math.floor(remain / 60);
        const s = remain % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      })()
    : '';

  // 进度百分比
  const progressPercent = state.phase === 'tracking'
    ? Math.min(100, (state.elapsedSeconds / (state.plannedMinutes * 60)) * 100)
    : 0;

  return {
    state,
    startConfirm,
    startTracking,
    finishTracking,
    reset,
    remainingTimeStr,
    progressPercent,
  };
}
