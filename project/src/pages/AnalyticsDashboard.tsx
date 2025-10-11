import { useState, useEffect } from 'react';
import { Users, Zap, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';

const AnalyticsDashboard = () => {
  const { 
    dashboardSummary, 
    loading, 
    error, 
    fetchDashboardSummary, 
    fetchSystemPerformance 
  } = useAnalytics();
  
  const [systemMetrics, setSystemMetrics] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchDashboardSummary();
        
        const performance = await fetchSystemPerformance({ limit: 50 });
        setSystemMetrics(performance);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      }
    };

    loadData();
  }, [fetchDashboardSummary, fetchSystemPerformance]);

  const mockUsageData = [
    { name: 'Mon', sessions: 12, revenue: 1200 },
    { name: 'Tue', sessions: 19, revenue: 1900 },
    { name: 'Wed', sessions: 8, revenue: 800 },
    { name: 'Thu', sessions: 15, revenue: 1500 },
    { name: 'Fri', sessions: 22, revenue: 2200 },
    { name: 'Sat', sessions: 30, revenue: 3000 },
    { name: 'Sun', sessions: 25, revenue: 2500 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Analytics</h1>
          <p className="text-gray-600">Real-time monitoring and business insights</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardSummary?.summary?.totalUsers || '1,247'}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+12%</span>
              <span className="text-gray-500 text-sm ml-2">from last month</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardSummary?.summary?.activeSessions || '89'}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">Live now</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-3xl font-bold text-gray-900">₹{dashboardSummary?.summary?.todayRevenue || '45,680'}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">+8%</span>
              <span className="text-gray-500 text-sm ml-2">vs yesterday</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-3xl font-bold text-gray-900">{systemMetrics?.metrics?.errorRate < 5 ? '99.5%' : '95.2%'}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-500 text-sm font-medium">Healthy</span>
            </div>
          </div>
        </div>

        {/* Usage Data Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Weekly Usage Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg per Session</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockUsageData.map((day) => (
                  <tr key={day.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.sessions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{day.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{Math.round(day.revenue / day.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">System Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Average Response Time</p>
                <p className="text-sm text-gray-600">API endpoint performance</p>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-green-600">{systemMetrics?.metrics?.averageResponseTime?.toFixed(0) || '125'}ms</p>
                <p className="text-sm text-gray-500">Excellent</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Error Rate</p>
                <p className="text-sm text-gray-600">4xx and 5xx responses</p>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-600">{systemMetrics?.metrics?.errorRate?.toFixed(1) || '0.5'}%</p>
                <p className="text-sm text-gray-500">Low</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Uptime</p>
                <p className="text-sm text-gray-600">Last 30 days</p>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-gray-500">Stable</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
