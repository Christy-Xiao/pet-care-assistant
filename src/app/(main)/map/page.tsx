'use client';

import { useState, useEffect } from 'react';
import { 
  Search, MapPin, PawPrint, Star, Users, 
  Trees, Navigation, RefreshCw, Loader2, Home, MessageCircle,
  Thermometer, AlertTriangle
} from 'lucide-react';

// 广州坐标
const GUANGZHOU_CENTER = {
  lat: 23.1291,
  lon: 113.2644,
  name: '广州市'
};

interface Park {
  id: string;
  name: string;
  address: string;
  distance: number;
  distanceText: string;
  type: string;
  rating: number;
  petFriendly: boolean;
  lawnSize: string;
  crowdLevel: 'low' | 'medium' | 'high';
  crowdText: string;
  features: string[];
  location: { lat: number; lon: number };
}

interface UserLocation {
  lat: number;
  lon: number;
  name: string;
}

interface WeatherData {
  location: string;
  current: {
    temp: number;
    icon: number;
    text: string;
  };
  suggestion: {
    level: string;
    suitable: boolean;
    advice: string;
  };
}

// 智能推荐逻辑
const getSmartRecommendation = (parks: Park[]) => {
  if (parks.length === 0) return null;

  const weights = {
    petFriendly: 3,
    crowdLevel: 2,
    distance: 1,
    rating: 1,
    lawnSize: 1,
  };

  const scoredParks = parks.map(park => {
    let score = 0;
    
    if (park.petFriendly) score += weights.petFriendly * 10;
    if (park.crowdLevel === 'low') score += weights.crowdLevel * 8;
    else if (park.crowdLevel === 'medium') score += weights.crowdLevel * 4;
    
    if (park.distance < 1000) score += weights.distance * 8;
    else if (park.distance < 3000) score += weights.distance * 5;
    else if (park.distance < 5000) score += weights.distance * 2;
    
    score += (park.rating || 4) * weights.rating;
    
    if (park.lawnSize.includes('5000')) score += weights.lawnSize * 5;
    else if (park.lawnSize.includes('3000')) score += weights.lawnSize * 3;
    else if (park.lawnSize.includes('2000')) score += weights.lawnSize * 2;
    else if (park.lawnSize.includes('1000')) score += weights.lawnSize * 1;
    
    return { ...park, score };
  });

  scoredParks.sort((a, b) => b.score - a.score);
  return scoredParks[0];
};

// 生成AI回复
const generateAIResponse = (recommendation: Park | null, allParks: Park[], weather: WeatherData | null) => {
  if (!recommendation) {
    return "抱歉，附近没有找到适合的绿地。";
  }

  const temp = weather?.current?.temp || 25;
  const weatherText = weather?.current?.text || '晴';
  
  const otherParks = allParks.filter(p => p.id !== recommendation.id);
  const crowdedNearby = otherParks.find(p => p.crowdLevel === 'high' && p.distance < recommendation.distance * 1.5);
  
  let response = `📍 **${recommendation.name}**\n`;
  response += `距离您 ${recommendation.distanceText}，${recommendation.petFriendly ? '宠物友好' : '允许带宠物进入'}，`;
  response += `拥有约 ${recommendation.lawnSize} 的公共草坪。\n`;
  
  if (recommendation.crowdLevel === 'low') {
    response += `目前人流量较小，非常适合前往！\n`;
  } else if (recommendation.crowdLevel === 'medium') {
    response += `目前人流量适中，可以前往。\n`;
  }
  
  if (recommendation.features.length > 0) {
    response += `✨ 特色：${recommendation.features.slice(0, 3).join('、')}`;
  }
  
  if (crowdedNearby) {
    response += `\n⚠️ 建议避开：'${crowdedNearby.name}'虽然更近，但人流量较大。`;
  }
  
  return response;
};

// 获取天气注意事项
const getWeatherAdvice = (weather: WeatherData | null) => {
  if (!weather) return [];
  
  const advice: string[] = [];
  const temp = weather.current?.temp || 25;
  
  if (temp > 35) {
    advice.push('高温预警：遛狗时间控制在10-15分钟内，避开中午时段');
  } else if (temp > 30) {
    advice.push('气温较高，外出记得给宠物带水');
  } else if (temp < 5) {
    advice.push('气温较低，外出记得给宠物保暖');
  }
  
  // 天气状况建议
  const weatherCode = weather.current?.icon;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode || 0)) {
    advice.push('有雨，出门记得给宠物带雨具');
  } else if ([200, 201, 202].includes(weatherCode || 0)) {
    advice.push('雷暴天气，建议待在室内');
  }
  
  // 出行建议
  if (weather.suggestion?.suitable === false) {
    advice.push('今日天气不太适合外出');
  } else if (weather.suggestion?.level === 'excellent') {
    advice.push('天气适合外出遛宠');
  }
  
  return advice;
};

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>(GUANGZHOU_CENTER);
  const [parks, setParks] = useState<Park[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recommendation, setRecommendation] = useState<Park | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [searchRadius, setSearchRadius] = useState(10000);
  const [error, setError] = useState<string | null>(null);

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      try {
        // 尝试获取浏览器位置
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 300000
              });
            });
            
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            setUserLocation({ lat, lon, name: '当前位置' });
          } catch {
            setUserLocation(GUANGZHOU_CENTER);
          }
        } else {
          setUserLocation(GUANGZHOU_CENTER);
        }
      } catch (e) {
        console.error('初始化失败:', e);
        setUserLocation(GUANGZHOU_CENTER);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  // 获取天气数据
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather');
        if (response.ok) {
          const data = await response.json();
          setWeather(data);
        }
      } catch (e) {
        console.error('获取天气失败:', e);
      }
    };
    fetchWeather();
  }, []);

  // 搜索绿地
  useEffect(() => {
    if (loading) return;
    
    const searchParks = async () => {
      setSearching(true);
      setError(null);
      
      try {
        // 调用 /api/parks 获取真实绿地数据
        const response = await fetch(`/api/parks?lat=${userLocation.lat}&lon=${userLocation.lon}&radius=${searchRadius}`);
        
        if (response.ok) {
          const data = await response.json();
          const parksData = data.parks || [];
          
          // 转换数据结构
          const transformedParks: Park[] = parksData.map((park: any) => ({
            id: park.id,
            name: park.name,
            address: park.address,
            distance: park.distance,
            distanceText: park.distanceText,
            type: park.type,
            rating: park.rating,
            petFriendly: park.petFriendly,
            lawnSize: park.lawnSize,
            crowdLevel: park.crowdLevel,
            crowdText: park.crowdText,
            features: park.features || [],
            location: { lat: park.lat, lon: park.lon },
          }));
          
          setParks(transformedParks);
          
          // 生成推荐
          const recommended = getSmartRecommendation(transformedParks);
          setRecommendation(recommended);
          setAiResponse(generateAIResponse(recommended, transformedParks, weather));
        } else {
          setError('获取绿地数据失败');
        }
      } catch (e) {
        console.error('搜索失败:', e);
        setError('搜索失败，请重试');
      } finally {
        setSearching(false);
      }
    };
    
    searchParks();
  }, [userLocation, loading, searchRadius, weather]);

  // 当天气数据更新时，重新生成回复
  useEffect(() => {
    if (parks.length > 0) {
      setAiResponse(generateAIResponse(recommendation, parks, weather));
    }
  }, [weather, recommendation, parks]);

  const handleRefresh = () => {
    setLoading(true);
    setUserLocation(GUANGZHOU_CENTER);
    setTimeout(() => setLoading(false), 500);
  };

  const weatherAdvice = getWeatherAdvice(weather);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-green-600" />
            <h1 className="text-lg font-bold text-gray-800">周边绿地搜索</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={searching}
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${searching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* 天气信息 */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{userLocation.name}</span>
            </div>
            <div className="text-sm opacity-90">
              搜索范围: {searchRadius / 1000}公里
            </div>
          </div>
          
          {weather && (
            <div className="bg-white/20 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-5 h-5" />
                  <span className="text-2xl font-bold">{weather.current?.temp}°C</span>
                </div>
                <span className="text-lg">{weather.current?.text}</span>
              </div>
              
              {/* 注意事项 */}
              {weatherAdvice.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {weatherAdvice.map((advice, index) => (
                    <span key={index} className="text-xs bg-white/30 px-2 py-1 rounded-full flex items-center gap-1">
                      {advice.includes('预警') || advice.includes('不太') ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <span>💡</span>
                      )}
                      {advice}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI 智能推荐 */}
        {aiResponse && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-green-800">智能推荐</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AI</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {aiResponse}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 搜索范围选择 */}
        <div className="bg-white px-4 py-3 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Search className="w-4 h-4" />
            <span>调整搜索范围</span>
          </div>
          <div className="flex gap-2">
            {[5000, 10000, 20000, 50000].map((radius) => (
              <button
                key={radius}
                onClick={() => setSearchRadius(radius)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  searchRadius === radius
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {radius / 1000}公里
              </button>
            ))}
          </div>
        </div>

        {/* 加载状态 */}
        {searching && (
          <div className="bg-white px-4 py-8 text-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">正在搜索周边绿地...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 px-4 py-3 m-4 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 绿地列表 */}
        {!searching && !error && parks.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800">
                找到 {parks.length} 处绿地
              </h2>
              <span className="text-sm text-gray-500">
                按距离排序
              </span>
            </div>

            {parks.map((park) => (
              <div
                key={park.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                  park.id === recommendation?.id
                    ? 'border-green-500 shadow-md ring-2 ring-green-400'
                    : 'border-transparent'
                }`}
              >
                {/* 顶部标签 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    park.petFriendly 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {park.petFriendly ? '🐕 宠物友好' : '🐾 允许带宠物'}
                  </span>
                  {park.id === recommendation?.id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      ⭐ 推荐
                    </span>
                  )}
                </div>

                {/* 名称和距离 */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{park.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{park.type}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600">
                      <Navigation className="w-3 h-3" />
                      <span className="font-medium">{park.distanceText}</span>
                    </div>
                  </div>
                </div>

                {/* 地址 */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                  📍 {park.address}
                </p>

                {/* 信息标签 */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full flex items-center gap-1">
                    <Trees className="w-3 h-3" />
                    {park.lawnSize}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    park.crowdLevel === 'low' 
                      ? 'bg-blue-50 text-blue-700' 
                      : park.crowdLevel === 'medium'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <Users className="w-3 h-3" />
                    {park.crowdText}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {park.rating.toFixed(1)}
                  </span>
                </div>

                {/* 特色 */}
                {park.features.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {park.features.slice(0, 3).map((feature, i) => (
                      <span key={i} className="text-xs text-gray-500">
                        ✨ {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 无结果 */}
        {!searching && !error && parks.length === 0 && (
          <div className="p-8 text-center">
            <Trees className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">附近没有找到绿地</p>
            <button
              onClick={() => setSearchRadius(searchRadius >= 20000 ? 50000 : 20000)}
              className="mt-3 text-green-600 font-medium"
            >
              扩大搜索范围至 {searchRadius >= 20000 ? '50' : '20'} 公里
            </button>
          </div>
        )}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <a href="/" className="flex flex-col items-center py-2 px-4 text-gray-500">
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">首页</span>
          </a>
          <div className="flex flex-col items-center py-2 px-4 text-green-600">
            <MapPin className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">周边绿地</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
