'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Footprints,
  X,
  Play,
  Square,
  RotateCcw,
  PawPrint,
  CloudSun,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import { useWalkTracker, type GpsPoint } from '@/hooks/useWalkTracker';
import { useApp } from '@/store/AppContext';
import { getWalkSuggestion } from '@/services/weather';

// Leaflet 延迟初始化（避免 SSR 崩溃）
let L: any = null;
let leafletCssLoaded = false;

async function getLeaflet() {
  if (!L) {
    const mod = await import('leaflet');
    L = mod.default;
    
    // 只在客户端加载CSS和设置默认图标
    if (typeof window !== 'undefined' && !leafletCssLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      leafletCssLoaded = true;
      
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;
    }
  }
  return L;
}

interface WalkTrackerModalProps {
  open: boolean;
  onClose: () => void;
}

// ============ 确认面板 ============
function ConfirmPanel({
  suggestedMinutes,
  onConfirm,
  onCancel,
}: {
  suggestedMinutes: number;
  onConfirm: (minutes: number, selectedPetIds: string[]) => void;
  onCancel: () => void;
}) {
  const { selectedPet, state: appState } = useApp();
  const [minutes, setMinutes] = useState(suggestedMinutes);
  const [weather, setWeather] = useState<any>(null);
  // 多宠选择
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
    selectedPet ? [selectedPet.id] : []
  );

  useEffect(() => {
    // 当外部 selectedPet 变化时同步更新
    if (selectedPet && !selectedPetIds.includes(selectedPet.id)) {
      setSelectedPetIds([selectedPet.id]);
    }
  }, [selectedPet?.id]);

  useEffect(() => {
    // 获取天气数据
    const weatherStr = localStorage.getItem('weatherData');
    if (weatherStr) {
      try {
        const data = JSON.parse(weatherStr);
        setWeather(data);
      } catch {}
    }
  }, []);

  const suggestion = weather ? getWalkSuggestion(weather.current || weather, weather.alerts || []) : null;

  const togglePet = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId]
    );
  };

  return (
    <div className="space-y-4">
      {/* 宠物信息 */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl shadow-lg mb-2">
          🐕
        </div>
        <h3 className="text-lg font-bold text-gray-800">带毛孩子去散步？</h3>
        <p className="text-xs text-gray-500 mt-0.5">记录轨迹 · 统计步数 · 智能提醒</p>
      </div>

      {/* 🆕 多宠选择 */}
      {appState.pets.length > 1 && (
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <PawPrint className="w-4 h-4" />
            今天带谁出门？（可多选）
          </label>
          <div className="grid grid-cols-2 gap-2">
            {appState.pets.map((pet: any) => (
              <button
                key={pet.id}
                onClick={() => togglePet(pet.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  selectedPetIds.includes(pet.id)
                    ? 'border-green-400 bg-green-50 text-green-700 shadow-sm'
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <span className="text-base">{pet.avatar || '🐾'}</span>
                <span>{pet.name}</span>
                {selectedPetIds.includes(pet.id) && (
                  <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />
                )}
              </button>
            ))}
          </div>
          {selectedPetIds.length === 0 && (
            <p className="text-[11px] text-red-400 mt-1">⚠️ 请至少选一只宠物</p>
          )}
        </div>
      )}

      {/* 天气建议卡片 */}
      {suggestion && (
        <div
          className={`rounded-xl p-3 flex items-center gap-3 ${
            suggestion.level === 'excellent'
              ? 'bg-green-50 border border-green-200'
              : suggestion.level === 'good'
              ? 'bg-blue-50 border border-blue-200'
              : suggestion.level === 'poor'
              ? 'bg-amber-50 border border-amber-200'
              : suggestion.level === 'bad'
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <CloudSun className="w-8 h-8 shrink-0 opacity-70" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{suggestion.message}</p>
            <p className="text-xs text-gray-500 mt-0.5">📋 推荐时长：{suggestion.duration}</p>
          </div>
        </div>
      )}

      {/* 时长选择 */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4" />
          计划遛多久？
        </label>

        {/* 快捷按钮 — 含5秒演示选项 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* 🆕 5秒演示按钮（醒目样式） */}
          <button
            onClick={() => setMinutes(0.083)} // 5秒 ≈ 0.083分钟，hook内部会特殊处理
            className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
              minutes <= 0.1
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md shadow-purple-300/30'
                : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <Timer className="w-3.5 h-3.5 mx-auto mb-0.5" />
            5秒演示
          </button>
          {[10, 20, 30, 45].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`py-2 rounded-xl text-sm font-medium transition-all ${
                minutes >= m - 0.5 && minutes <= m + 0.5 && minutes > 0.1
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m}分
            </button>
          ))}
          <button
            onClick={() => setMinutes(60)}
            className={`py-2 rounded-xl text-sm font-medium transition-all ${
              minutes >= 59 && minutes <= 61
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            60分
          </button>
        </div>

        {/* 自定义滑块（非演示模式时显示） */}
        {minutes > 0.1 && (
          <>
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-gray-400 w-6">5</span>
              <input
                type="range"
                min="5"
                max="120"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value))}
                className="flex-1 accent-primary-500"
              />
              <span className="text-xs text-gray-400 w-8">120</span>
            </div>
            <p className="text-center text-sm font-semibold text-primary-600 mt-1">{Math.round(minutes)} 分钟</p>
          </>
        )}

        {/* 演示模式提示 */}
        {minutes <= 0.1 && (
          <div className="text-center py-1.5 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-sm font-bold text-purple-600">🎬 演示模式：5秒后自动结束 + 推送通知</p>
            <p className="text-[10px] text-purple-400 mt-0.5">用于快速测试 PWA 推送功能</p>
          </div>
        )}
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={() =>
            selectedPetIds.length > 0
              ? onConfirm(minutes, selectedPetIds)
              : null
          }
          disabled={selectedPetIds.length === 0}
          className={`flex-1 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 ${
            selectedPetIds.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'from-green-500 to-emerald-500 text-white shadow-green-300/30 hover:shadow-lg bg-gradient-to-r'
          }`}
        >
          <Play className="w-4 h-4" fill="white" />
          开始{minutes <= 0.1 ? '演示' : '遛狗'}！
        </button>
      </div>
    </div>
  );
}

// ============ 追踪中面板（含地图）============
function TrackingPanel({
  state,
  remainingTimeStr,
  progressPercent,
  onFinish,
}: {
  state: ReturnType<typeof useWalkTracker>['state'];
  remainingTimeStr: string;
  progressPercent: number;
  onFinish: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathLayerRef = useRef<any>(null);

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (typeof window === 'undefined') return;

    let map: any = null;
    let cleanupFn: (() => void) | null = null;

    (async () => {
      try {
        const Leaflet = await getLeaflet();
        if (!mapContainerRef.current) return;

        map = Leaflet.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true,
        }).setView([23.1291, 113.2644], 15);

        // 高德瓦片（国内快）
        Leaflet.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
          subdomains: ['1', '2', '3', '4'],
          maxZoom: 18,
        }).addTo(map);

        pathLayerRef.current = Leaflet.layerGroup().addTo(map);
        mapRef.current = map;

        cleanupFn = () => {
          if (map) { map.remove(); mapRef.current = null; }
        };
      } catch (e) {
        console.error('[WalkTracker] Map init failed:', e);
      }
    })();

    return () => { cleanupFn?.(); };
  }, []);

  // 轨迹更新
  useEffect(() => {
    async function updatePath() {
      const Leaflet = await getLeaflet().catch(() => null);
      if (!Leaflet || !mapRef.current || !pathLayerRef.current || state.path.length === 0) return;

      const map = mapRef.current;
      const layer = pathLayerRef.current;
      layer.clearLayers();

      // 画轨迹线
      if (state.path.length >= 2) {
        const latLngs = state.path.map((p) => [p.lat, p.lng] as [number, number]);
        polylineRef.current = Leaflet.polyline(latLngs, {
          color: '#22c55e',
          weight: 4,
          opacity: 0.85,
          lineJoin: 'round',
          smoothFactor: 1.5,
        }).addTo(layer);
      }

      // 当前位置标记
      if (state.currentPoint) {
        const dogIcon = Leaflet.divIcon({
          html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;">🐾</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        markerRef.current = Leaflet.marker(
          [state.currentPoint.lat, state.currentPoint.lng],
          { icon: dogIcon }
        ).addTo(layer);

        map.panTo([state.currentPoint.lat, state.currentPoint.lng], { animate: true, duration: 0.5 });
      }

      // 自适应视野到轨迹范围
      if (state.path.length > 1 && polylineRef.current) {
        const bounds = polylineRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.3), { animate: true, duration: 0.5, maxZoom: 17 });
        }
      }
    }
    updatePath();
  }, [state.path, state.currentPoint]);

  // 首次定位时居中
  useEffect(() => {
    if (
      mapRef.current &&
      state.currentPoint &&
      state.path.length === 1 &&
      !polylineRef.current
    ) {
      mapRef.current.setView(
        [state.currentPoint.lat, state.currentPoint.lng],
        17,
        { animate: true }
      );
    }
  }, [state.currentPoint, state.path.length]);

  const distanceKm = state.totalDistance / 1000;
  const circumference = 2 * Math.PI * 54; // r=54 for SVG circle
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-3">
      {/* 顶部统计条 */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-500 -mx-4 -mt-4 px-4 py-3 text-white rounded-t-2xl">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-white/70 uppercase tracking-wider">已走</p>
            <p className="text-lg font-bold leading-tight">
              {distanceKm < 1 ? `${Math.round(state.totalDistance)}m` : `${distanceKm.toFixed(2)}km`}
            </p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-[10px] text-white/70 uppercase tracking-wider">配速</p>
            <p className="text-sm font-bold leading-tight">
              {state.speed > 0 ? `${state.speed.toFixed(1)}km/h` : '--'}
            </p>
          </div>
        </div>

        {/* 圆形进度环 */}
        <div className="relative w-14 h-14">
          <svg width="56" height="56" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 倒计时大字 */}
      <div className="text-center py-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">剩余时间</p>
        <p className={`text-4xl font-mono font-bold tracking-wider ${
          parseInt(remainingTimeStr.split(':')[0]) <= 2
            ? 'text-red-500 animate-pulse'
            : 'text-gray-800'
        }`}>
          {remainingTimeStr}
        </p>
        {state.error && (
          <p className="text-[11px] text-amber-600 mt-1">{state.error}</p>
        )}
      </div>

      {/* 地图容器 */}
      <div
        ref={mapContainerRef}
        className="w-full h-52 sm:h-64 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative bg-gray-100"
      >
        {!state.currentPoint && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] bg-white/80 backdrop-blur-[1px]">
            <div className="text-center">
              <Navigation className="w-8 h-8 text-primary-500 animate-pulse mx-auto mb-2" />
              <p className="text-xs text-gray-500">正在获取位置...</p>
            </div>
          </div>
        )}

        {/* 地图上叠加的距离标签 */}
        {state.path.length > 1 && (
          <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-1.5 pointer-events-none">
            <Footprints className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-700">
              {distanceKm < 1 ? `${Math.round(state.totalDistance)}米` : `${distanceKm.toFixed(2)}公里`}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{state.path.length} 个采样点</span>
          </div>
        )}
      </div>

      {/* 结束按钮 */}
      <button
        onClick={onFinish}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold shadow-md shadow-red-300/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Square className="w-4 h-4" fill="white" />
        结束遛狗
      </button>
    </div>
  );
}

// ============ 完成总结面板 ============
function SummaryPanel({
  state,
  petNames,
  onSaveAndClose,
  onDiscard,
}: {
  state: ReturnType<typeof useWalkTracker>['state'];
  petNames: string; // 🆕 参与的宠物名字
  onSaveAndClose: () => void;
  onDiscard: () => void;
}) {
  const distanceKm = state.totalDistance / 1000;
  const minutes = Math.floor(state.elapsedSeconds / 60);
  const seconds = state.elapsedSeconds % 60;

  return (
    <div className="space-y-4 text-center">
      {/* 成功图标动画 */}
      <div className="relative w-24 h-24 mx-auto">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-300/40">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-lg">
          🐕
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800">遛狗完成！</h3>
      <p className="text-sm text-gray-500">
        {petNames}今天也是负责任的好主人 🎉
      </p>

      {/* 数据卡片 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-xl p-3">
          <Footprints className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-700">
            {distanceKm < 1 ? `${Math.round(state.totalDistance)}m` : `${distanceKm.toFixed(2)}km`}
          </p>
          <p className="text-[10px] text-blue-400">总距离</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-purple-700">
            {minutes}′{String(seconds).padStart(2, '0')}″
          </p>
          <p className="text-[10px] text-purple-400">总时长</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <PawPrint className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-700">
            {distanceKm > 0 && minutes > 0
              ? `${((distanceKm / (minutes / 60)).toFixed(1))}`
              : '--'}
          </p>
          <p className="text-[10px] text-green-400">km/h</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onDiscard}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors"
        >
          不保存
        </button>
        <button
          onClick={onSaveAndClose}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          保存记录
        </button>
      </div>
    </div>
  );
}

// ============ 主组件 ============
export default function WalkTrackerModal({ open, onClose }: WalkTrackerModalProps) {
  const { selectedPet } = useApp();
  const [showModal, setShowModal] = useState(false);
  // 🆕 多宠选择
  const [walkPetIds, setWalkPetIds] = useState<string[]>([]);

  // 动画延迟打开
  useEffect(() => {
    if (open) {
      // 小延迟让弹窗动画更自然
      requestAnimationFrame(() => setShowModal(true));
    } else {
      setShowModal(false);
    }
  }, [open]);

  // 从天气推荐获取建议时长
  const getSuggestedMinutes = (): number => {
    try {
      const weatherStr = localStorage.getItem('weatherData');
      if (weatherStr) {
        const data = JSON.parse(weatherStr);
        const suggestion = getWalkSuggestion(data.current || data, data.alerts || []);
        const dur = suggestion.duration.match(/(\d+)/);
        if (dur) {
          const num = parseInt(dur[1]);
          if (num >= 5) return Math.min(num, 60);
        }
      }
    } catch {}
    return 30;
  };

  // 获取选中宠物名字列表（用于推送通知）
  const getSelectedPetNames = (): string => {
    const { state: appState } = useApp();
    const names = walkPetIds
      .map((id) => appState.pets.find((p: any) => p.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join('、') : selectedPet?.name || '毛孩子';
  };

  // 🆕 保存运动记录 — 为每个选中的宠物各存一条
  const handleSaveRecord = async (result: {
    distance: number;
    durationSeconds: number;
    path: GpsPoint[];
  }) => {
    if (walkPetIds.length === 0 && !selectedPet) return;

    const targetPetIds = walkPetIds.length > 0 ? walkPetIds : [selectedPet!.id];
    const petNames = getSelectedPetNames();

    try {
      // 为每只宠物分别保存记录
      await Promise.all(
        targetPetIds.map((petId) =>
          fetch('/api/exercise-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pet_id: petId,
              activity_type: 'walk',
              duration: result.durationSeconds,
              distance: result.distance,
              date: new Date().toISOString().split('T')[0],
              notes: `开遛自动记录 · ${petNames} · ${Math.round(result.distance)}米`,
            }),
          }).catch((e) => console.log('[WalkModal] 保存失败:', e))
        )
      );

      console.log(`[WalkModal] 已为 ${targetPetIds.length} 只宠物保存运动记录`);
    } catch (e) {
      console.log('[WalkModal] 保存失败:', e);
    }
  };

  const {
    state,
    startConfirm,
    startTracking,
    finishTracking,
    reset,
    remainingTimeStr,
    progressPercent,
  } = useWalkTracker({
    petId: selectedPet?.id,
    petName: getSelectedPetNames(),
    onFinished: handleSaveRecord,
  });

  // 🆕 演示模式完成时：客户端直发PWA推送（不依赖后端定时器！）
  useEffect(() => {
    if (state.phase === 'finished' && state.plannedMinutes <= 0.1) {
      const petNames = getSelectedPetNames();
      console.log('[WalkModal] 🎬 演示模式完成，发送客户端PWA推送...');
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 今日遛狗时间已经充足',
          body: `演示模式完成！${petNames}今天运动达标啦，继续保持好习惯~ 🐾💚`,
          icon: '/icons/icon-192x192.png',
          url: '/',
          tag: `walk-demo-client-${Date.now()}`,
          broadcast: true,
        }),
      }).then(r => r.json()).then(res => {
        console.log(`[WalkModal] ✅ 客户端推送已发送! sentCount=${res.sentCount}`);
      }).catch(e => {
        console.log('[WalkModal] 客端推送失败（可能无订阅）:', e);
      });
    }
  }, [state.phase, state.plannedMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  // 打开时进入确认阶段
  useEffect(() => {
    if (open && state.phase === 'idle') {
      startConfirm(getSuggestedMinutes());
    }
  }, [open]);

  // 🆕 开始追踪时记录选中的宠物
  const handleStartTracking = (minutes: number, petIds: string[]) => {
    setWalkPetIds(petIds);
    startTracking(minutes, petIds);
  };

  const handleClose = () => {
    if (state.phase === 'tracking') {
      if (confirm('正在追踪中，确定要结束吗？')) {
        finishTracking();
      }
    } else {
      reset();
      onClose();
    }
  };

  const handleSaveAndClose = () => {
    reset();
    onClose();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部拖拽条 + 关闭按钮 */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors ml-auto -mt-1"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-2">
          {state.phase === 'confirming' && (
            <ConfirmPanel
              suggestedMinutes={getSuggestedMinutes()}
              onConfirm={handleStartTracking}
              onCancel={() => {
                reset();
                onClose();
              }}
            />
          )}

          {state.phase === 'tracking' && (
            <TrackingPanel
              state={state}
              remainingTimeStr={remainingTimeStr}
              progressPercent={progressPercent}
              onFinish={() => finishTracking()}
            />
          )}

          {state.phase === 'finished' && (
            <SummaryPanel
              state={state}
              petNames={getSelectedPetNames()}
              onSaveAndClose={handleSaveAndClose}
              onDiscard={() => {
                reset();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
