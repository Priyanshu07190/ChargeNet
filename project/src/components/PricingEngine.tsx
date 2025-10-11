import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Cloud, 
  Sun, 
  CloudRain, 
  Zap, 
  Clock,
  AlertTriangle,
  Info,
  Battery
} from 'lucide-react';

interface PricingData {
  basePrice: number;
  currentPrice: number;
  weatherMultiplier: number;
  demandMultiplier: number;
  timeMultiplier: number;
  forecast: {
    time: string;
    price: number;
    demand: 'low' | 'medium' | 'high';
    weather: 'sunny' | 'cloudy' | 'rainy';
  }[];
}

interface ChargeCastProps {
  chargerId?: string;
}

const ChargeCast: React.FC<ChargeCastProps> = ({ chargerId }) => {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [weatherCondition, setWeatherCondition] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');
  const [currentDemand, setCurrentDemand] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    // Simulate real-time pricing data
    const generatePricingData = (): PricingData => {
      const basePrice = 8.5;
      const hour = new Date().getHours();
      
      // Weather impact
      const weatherMultipliers = { sunny: 1.0, cloudy: 1.1, rainy: 1.3 };
      const weatherMultiplier = weatherMultipliers[weatherCondition];
      
      // Demand impact
      const demandMultipliers = { low: 0.8, medium: 1.0, high: 1.4 };
      const demandMultiplier = demandMultipliers[currentDemand];
      
      // Time-based pricing (peak hours)
      const timeMultiplier = (hour >= 18 && hour <= 22) || (hour >= 7 && hour <= 9) ? 1.2 : 0.9;
      
      const currentPrice = basePrice * weatherMultiplier * demandMultiplier * timeMultiplier;
      
      // Generate forecast
      const forecast = [];
      for (let i = 0; i < 24; i++) {
        const forecastHour = (hour + i) % 24;
        const timeOfDay = forecastHour >= 7 && forecastHour <= 22 ? 1.1 : 0.9;
        const randomDemand: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        const randomWeather: ('sunny' | 'cloudy' | 'rainy')[] = ['sunny', 'cloudy', 'rainy'];
        
        const demand = randomDemand[Math.floor(Math.random() * 3)];
        const weather = randomWeather[Math.floor(Math.random() * 3)];
        
        forecast.push({
          time: `${forecastHour.toString().padStart(2, '0')}:00`,
          price: basePrice * weatherMultipliers[weather] * demandMultipliers[demand] * timeOfDay,
          demand,
          weather
        });
      }
      
      return {
        basePrice,
        currentPrice,
        weatherMultiplier,
        demandMultiplier,
        timeMultiplier,
        forecast
      };
    };

    setPricingData(generatePricingData());
    
    // Update every 30 seconds
    const interval = setInterval(() => {
      setPricingData(generatePricingData());
    }, 30000);

    return () => clearInterval(interval);
  }, [weatherCondition, currentDemand]);

  useEffect(() => {
    // Simulate weather changes
    const weatherInterval = setInterval(() => {
      const conditions: ('sunny' | 'cloudy' | 'rainy')[] = ['sunny', 'cloudy', 'rainy'];
      setWeatherCondition(conditions[Math.floor(Math.random() * 3)]);
    }, 60000);

    // Simulate demand changes
    const demandInterval = setInterval(() => {
      const demands: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
      setCurrentDemand(demands[Math.floor(Math.random() * 3)]);
    }, 45000);

    return () => {
      clearInterval(weatherInterval);
      clearInterval(demandInterval);
    };
  }, []);

  if (!pricingData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  const priceChange = ((pricingData.currentPrice - pricingData.basePrice) / pricingData.basePrice) * 100;
  const isExpensive = pricingData.currentPrice > pricingData.basePrice * 1.2;

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'cloudy': return <Cloud className="h-4 w-4 text-gray-500" />;
      case 'rainy': return <CloudRain className="h-4 w-4 text-blue-500" />;
      default: return <Sun className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Pricing */}
      <div className={`rounded-2xl shadow-lg p-6 ${
        isExpensive ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-bold text-gray-900">ChargeCast Pricing</h3>
          </div>
          {isExpensive && (
            <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{pricingData.currentPrice.toFixed(2)}
              <span className="text-sm font-normal text-gray-600">/kWh</span>
            </div>
            <div className={`flex items-center space-x-1 text-sm ${
              priceChange > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {priceChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(priceChange).toFixed(1)}% vs base</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Current Conditions</div>
            <div className="flex items-center justify-end space-x-2 mb-1">
              {getWeatherIcon(weatherCondition)}
              <span className="text-sm capitalize">{weatherCondition}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDemandColor(currentDemand)}`}>
              {currentDemand} demand
            </span>
          </div>
        </div>

        {/* Price Factors */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Weather</div>
            <div className="font-semibold text-gray-900">
              {((pricingData.weatherMultiplier - 1) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Demand</div>
            <div className="font-semibold text-gray-900">
              {((pricingData.demandMultiplier - 1) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-white/50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Time</div>
            <div className="font-semibold text-gray-900">
              {((pricingData.timeMultiplier - 1) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Alerts */}
        {isExpensive && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">High Pricing Alert</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Prices are {priceChange.toFixed(0)}% higher due to {weatherCondition === 'rainy' ? 'rain' : 'high demand'}. 
              Consider charging later for better rates.
            </p>
          </div>
        )}
      </div>

      {/* 24-Hour Forecast */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-purple-500" />
          <h4 className="font-semibold text-gray-900">24-Hour Price Forecast</h4>
        </div>

        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {pricingData.forecast.slice(0, 12).map((item, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg text-center ${
                item.price < pricingData.basePrice ? 'bg-green-50' : 
                item.price > pricingData.basePrice * 1.2 ? 'bg-red-50' : 'bg-gray-50'
              }`}
            >
              <div className="text-xs text-gray-600 mb-1">{item.time}</div>
              <div className="text-sm font-semibold text-gray-900">₹{item.price.toFixed(1)}</div>
              <div className="flex items-center justify-center space-x-1 mt-1">
                {getWeatherIcon(item.weather)}
                <span className={`w-2 h-2 rounded-full ${
                  item.demand === 'low' ? 'bg-green-400' :
                  item.demand === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Smart Charging Tip</span>
          </div>
          <p className="text-sm text-blue-700">
            Best charging window: {(() => {
              const cheapest = pricingData.forecast.reduce((min, item) => 
                item.price < min.price ? item : min
              );
              return `${cheapest.time} at ₹${cheapest.price.toFixed(2)}/kWh`;
            })()}
          </p>
        </div>
      </div>

      {/* Energy Mix */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Battery className="h-5 w-5 text-green-500" />
          <h4 className="font-semibold text-gray-900">Current Energy Mix</h4>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Solar Power</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full">
                <div className="w-3/5 h-2 bg-yellow-400 rounded-full"></div>
              </div>
              <span className="text-sm font-medium">60%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Wind Power</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full">
                <div className="w-1/4 h-2 bg-blue-400 rounded-full"></div>
              </div>
              <span className="text-sm font-medium">25%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Grid Power</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full">
                <div className="w-1/8 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <span className="text-sm font-medium">15%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            🌱 85% renewable energy right now! Great time for eco-friendly charging.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChargeCast;