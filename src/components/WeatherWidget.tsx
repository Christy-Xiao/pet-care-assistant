'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cloud, Droplets, Wind, Thermometer, AlertTriangle, Dog, MapPin, RefreshCw, Loader2 } from 'lucide-react';

// 使用免费的天气API - Open-Meteo (无需API Key)
// 默认位置 - 广东广州
const DEFAULT_LOCATION = {
  name: '广州市',
  lat: 23.1291,
  lon: 113.2644
};

// 天气代码映射到emoji
const WEATHER_CODES: Record<number, string> = {
  0: '☀️',   // Clear sky
  1: '🌤️',   // Mainly clear
  2: '⛅',   // Partly cloudy
  3: '☁️',   // Overcast
  45: '🌫️',  // Fog
  48: '🌫️',  // Depositing rime fog
  51: '🌦️',  // Light drizzle
  53: '🌧️',  // Moderate drizzle
  55: '🌧️',  // Dense drizzle
  61: '🌧️',  // Slight rain
  63: '🌧️',  // Moderate rain
  65: '🌧️',  // Heavy rain
  71: '🌨️',  // Slight snow
  73: '🌨️',  // Moderate snow
  75: '❄️',  // Heavy snow
  77: '🌨️',  // Snow grains
  80: '🌦️',  // Slight rain showers
  81: '🌧️',  // Moderate rain showers
  82: '⛈️',  // Violent rain showers
  85: '🌨️',  // Slight snow showers
  86: '🌨️',  // Heavy snow showers
  95: '⛈️',  // Thunderstorm
  96: '⛈️',  // Thunderstorm with slight hail
  99: '⛈️',  // Thunderstorm with heavy hail
};

const LEVEL_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  poor: 'bg-orange-100 text-orange-800 border-orange-200',
  bad: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200',
};

interface WeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
}

interface WeatherData {
  location: { name: string; lat: number; lon: number };
  current: {
    temp: string;
    feelsLike: string;
    humidity: string;
    windSpeed: string;
    windScale: string;
    text: string;
    icon: string;
    precip: string;
  };
  suggestion: {
    suitable: boolean;
    level: string;
    message: string;
    tips: string[];
    duration: string;
  };
  alerts: any[];
}

// 获取遛狗建议
const getWalkSuggestion = (temp: number, feelsLike: number, weatherCode: number) => {
  const weatherText = getWeatherText(weatherCode);
  
  // 极端天气
  if (weatherCode >= 95) {
    return {
      suitable: false,
      level: 'bad',
      message: '⚠️ 雷暴天气，禁止外出遛狗',
      tips: ['留在室内最安全', '注意关好门窗'],
      duration: '不建议外出'
    };
  }

  // 暴雨/大雪
  if ([65, 75, 82, 86, 99].includes(weatherCode)) {
    return {
      suitable: false,
      level: 'bad',
      message: `⚠️ ${weatherCode >= 70 ? '降雪' : '降水'}天气，不建议外出`,
      tips: ['等天气好转再出门', '小型犬容易着凉'],
      duration: '10-15分钟'
    };
  }

  // 极端高温
  if (temp > 38 || feelsLike > 40) {
    return {
      suitable: false,
      level: 'bad',
      message: '🔥 高温天气，禁止长时间外出',
      tips: ['地表温度极高会烫伤爪子', '选择清晨或夜晚遛狗'],
      duration: '5-10分钟'
    };
  }

  // 高温
  if (temp > 35 || feelsLike > 37) {
    return {
      suitable: false,
      level: 'poor',
      message: '🌡️ 高温天气，外出需谨慎',
      tips: ['选择清晨或傍晚遛狗', '及时补充水分'],
      duration: '10-15分钟'
    };
  }

  // 较热
  if (temp >= 30) {
    return {
      suitable: true,
      level: 'fair',
      message: '☀️ 较热天气，注意防暑',
      tips: ['选择阴凉处行走', '适当缩短时间'],
      duration: '20-30分钟'
    };
  }

  // 极寒
  if (temp < -10 || feelsLike < -15) {
    return {
      suitable: false,
      level: 'bad',
      message: '❄️ 极寒天气，不建议外出',
      tips: ['小型犬容易冻伤', '注意保暖'],
      duration: '10-15分钟'
    };
  }

  // 寒冷
  if (temp < 0) {
    return {
      suitable: true,
      level: 'fair',
      message: '🥶 寒冷天气，注意保暖',
      tips: ['给宠物穿外套', '选择中午温暖时段'],
      duration: '20-30分钟'
    };
  }

  // 舒适天气
  if (temp >= 15 && temp <= 25) {
    return {
      suitable: true,
      level: 'excellent',
      message: '🌤️ 天气完美，非常适合外出！',
      tips: ['尽情享受户外时光', '注意交通安全'],
      duration: '30-60分钟'
    };
  }

  // 凉爽
  if (temp >= 10 && temp < 15) {
    return {
      suitable: true,
      level: 'good',
      message: '🍃 天气凉爽，适合外出',
      tips: ['注意早晚温差', '适当保暖'],
      duration: '30-45分钟'
    };
  }

  // 微凉
  return {
    suitable: true,
    level: 'good',
    message: '🌬️ 天气不错，可以出门遛狗！',
    tips: ['注意安全', '及时补水'],
    duration: '20-30分钟'
  };
};

const getWeatherText = (code: number): string => {
  const texts: Record<number, string> = {
    0: '晴',
    1: '晴间多云',
    2: '多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '中毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小阵雨',
    81: '中阵雨',
    82: '大阵雨',
    85: '小阵雪',
    86: '大阵雪',
    95: '雷暴',
    96: '雷暴+小冰雹',
    99: '雷暴+大冰雹',
  };
  return texts[code] || '未知';
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { name, lat, lon } = DEFAULT_LOCATION;
      
      // 使用 Open-Meteo 免费API
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m&timezone=Asia%2FShanghai`;
      
      const res = await fetch(url);
      const data: WeatherResponse = await res.json();
      
      if (!data.current) {
        throw new Error('获取天气数据失败');
      }

      const current = data.current;
      const temp = Math.round(current.temperature_2m);
      const feelsLike = Math.round(current.apparent_temperature);
      const weatherCode = current.weather_code;
      const windSpeed = Math.round(current.wind_speed_10m);
      
      const suggestion = getWalkSuggestion(temp, feelsLike, weatherCode);

      const weatherData = {
        location: { name, lat, lon },
        current: {
          temp: temp.toString(),
          feelsLike: feelsLike.toString(),
          humidity: current.relative_humidity_2m.toString(),
          windSpeed: windSpeed.toString(),
          windScale: Math.round(windSpeed / 10).toString(),
          text: getWeatherText(weatherCode),
          icon: weatherCode.toString(),
          precip: '0',
        },
        suggestion,
        alerts: [],
      };
      
      setWeather(weatherData);
      
      // 保存天气数据到 localStorage，供首页和其他组件使用
      localStorage.setItem('weatherData', JSON.stringify(weatherData));

    } catch (err: any) {
      console.error('Weather error:', err);
      setError(err.message || '天气服务暂时不可用');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/90 border border-blue-200 p-4">
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-blue-600 font-medium">获取天气中...</span>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="rounded-2xl bg-white/90 border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-500">
            <Cloud className="w-6 h-6 mb-1" />
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={fetchWeather} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  const icon = weather?.current?.icon || '0';
  const weatherEmoji = WEATHER_CODES[parseInt(icon)] || '🌤️';
  const levelColor = LEVEL_COLORS[weather?.suggestion?.level || 'unknown'];

  return (
    <div className="space-y-3">
      {/* 天气主卡片 */}
      <div className="rounded-2xl bg-white/90 border border-blue-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">{weather?.location?.name}</span>
          </div>
          <button onClick={fetchWeather} className="p-1.5 hover:bg-blue-100 rounded-full transition-colors" title="刷新天气">
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{weatherEmoji}</span>
            <div>
              <div className="text-4xl font-bold text-gray-800">{weather?.current?.temp}°</div>
              <div className="text-sm text-gray-500">{weather?.current?.text}</div>
            </div>
          </div>

          <div className="text-right text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-1 justify-end">
              <Thermometer className="w-4 h-4" />
              <span>体感 {weather?.current?.feelsLike}°</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Droplets className="w-4 h-4" />
              <span>湿度 {weather?.current?.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Wind className="w-4 h-4" />
              <span>{weather?.current?.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 遛狗建议卡片 */}
      <div className={`rounded-2xl border-2 p-4 ${levelColor}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            weather?.suggestion?.level === 'excellent' ? 'bg-green-200' :
            weather?.suggestion?.level === 'good' ? 'bg-blue-200' :
            weather?.suggestion?.level === 'fair' ? 'bg-yellow-200' :
            weather?.suggestion?.level === 'poor' ? 'bg-orange-200' :
            weather?.suggestion?.level === 'bad' ? 'bg-red-200' : 'bg-gray-200'
          }`}>
            <Dog className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">遛狗建议</span>
              <span className="text-sm font-medium px-2 py-0.5 bg-white/50 rounded-full">
                {weather?.suggestion?.duration}
              </span>
            </div>
            <p className="text-sm mb-2">{weather?.suggestion?.message}</p>
            
            {weather?.suggestion?.tips && weather.suggestion.tips.length > 0 && (
              <ul className="text-xs space-y-1">
                {weather.suggestion.tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-xs mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 主动服务提示 */}
      {(() => {
        const weatherCode = parseInt(weather?.current?.icon || '0') || 0;
        const temp = parseInt(weather?.current?.temp || '25') || 25;
        const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
        const isGoodWeather = weather?.suggestion?.suitable && weather?.suggestion?.level !== 'bad';
        
        // 雨天提醒
        if (isRainy) {
          return (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <span className="text-lg">🌧️</span>
                <div>
                  <p className="text-sm font-medium">今日有雨</p>
                  <p className="text-xs text-blue-600">出门记得给宠物带雨具，穿个宠物雨衣也不错哦！</p>
                </div>
              </div>
            </div>
          );
        }
        
        // 好天气推荐绿地
        if (isGoodWeather && weather?.suggestion?.level === 'excellent') {
          return (
            <div className="rounded-xl bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2 text-green-700">
                <span className="text-lg">🌳</span>
                <div>
                  <p className="text-sm font-medium">天气超棒！</p>
                  <p className="text-xs text-green-600">推荐带宠物去户外玩耍，探索附近的绿地公园吧！</p>
                </div>
              </div>
            </div>
          );
        }
        
        // 高温提醒
        if (temp > 35) {
          return (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
              <div className="flex items-center gap-2 text-orange-700">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-sm font-medium">高温预警</p>
                  <p className="text-xs text-orange-600">遛狗时间控制在10-15分钟，选择清晨或傍晚遛弯。</p>
                </div>
              </div>
            </div>
          );
        }
        
        // 低温提醒
        if (temp < 5) {
          return (
            <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-3">
              <div className="flex items-center gap-2 text-cyan-700">
                <span className="text-lg">❄️</span>
                <div>
                  <p className="text-sm font-medium">低温提醒</p>
                  <p className="text-xs text-cyan-600">外出记得给宠物穿保暖衣服，选择中午温暖时段。</p>
                </div>
              </div>
            </div>
          );
        }
        
        return null;
      })()}
    </div>
  );
}
