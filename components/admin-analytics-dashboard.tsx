"use client"

import { useState, useEffect } from "react"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminAnalyticsAPI } from "@/lib/api/admin-analytics"

export default function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [activeChart, setActiveChart] = useState('overview')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await AdminAnalyticsAPI.getDashboardAnalytics()
      if (data && !error) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBookingAnalytics = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await AdminAnalyticsAPI.getBookingAnalytics(
        dateRange.start,
        dateRange.end
      )
      if (data && !error) {
        setAnalytics(prev => ({ ...prev, bookingAnalytics: data }))
      }
    } catch (error) {
      console.error('Failed to load booking analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFinancialAnalytics = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await AdminAnalyticsAPI.getFinancialAnalytics(
        dateRange.start,
        dateRange.end
      )
      if (data && !error) {
        setAnalytics(prev => ({ ...prev, financialAnalytics: data }))
      }
    } catch (error) {
      console.error('Failed to load financial analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async (dataType: string) => {
    try {
      const { data, error } = await AdminAnalyticsAPI.exportData(
        dataType as any,
        dateRange.start,
        dateRange.end
      )
      if (data && !error) {
        // Create download link
        const link = document.createElement('a')
        link.href = data.download_url
        link.download = `${dataType}_export_${dateRange.start}_to_${dateRange.end}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  if (isLoading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-gray-300">Comprehensive insights into your security service operations</p>
          </div>
          <div className="flex space-x-4">
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              />
            </div>
            <Button
              onClick={loadAnalytics}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Chart Navigation */}
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'agents', label: 'Agents', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveChart(id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                activeChart === id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Chart */}
      {activeChart === 'overview' && analytics && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">
                    ₦{analytics.overview?.revenue_this_month?.toLocaleString() || 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Active Bookings</p>
                  <p className="text-3xl font-bold text-white">
                    {analytics.overview?.active_bookings || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Total Agents</p>
                  <p className="text-3xl font-bold text-white">
                    {analytics.overview?.total_agents || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Emergency Alerts</p>
                  <p className="text-3xl font-bold text-white">
                    {analytics.overview?.emergency_alerts_today || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bookings Trend */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Bookings Trend</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.trends?.bookings_trend?.slice(-7).map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t w-full"
                      style={{ height: `${(item.count / Math.max(...analytics.trends.bookings_trend.map(t => t.count))) * 200}px` }}
                    ></div>
                    <span className="text-white text-xs mt-2">{item.count}</span>
                    <span className="text-gray-300 text-xs">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
              <div className="h-64 flex items-end space-x-2">
                {analytics.trends?.revenue_trend?.slice(-7).map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-green-500 rounded-t w-full"
                      style={{ height: `${(item.amount / Math.max(...analytics.trends.revenue_trend.map(t => t.amount))) * 200}px` }}
                    ></div>
                    <span className="text-white text-xs mt-2">₦{item.amount.toLocaleString()}</span>
                    <span className="text-gray-300 text-xs">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Agents</h3>
            <div className="space-y-4">
              {analytics.trends?.agent_performance?.slice(0, 5).map((agent, index) => (
                <div key={agent.agent_id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{agent.name}</p>
                      <p className="text-gray-300 text-sm">{agent.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white font-semibold">{agent.rating.toFixed(1)}</p>
                      <p className="text-gray-300 text-sm">Rating</p>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-sm ${
                            i < Math.floor(agent.rating) ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Emergencies */}
          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Emergency Alerts</h3>
            <div className="space-y-3">
              {analytics.alerts?.recent_emergencies?.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                    <div>
                      <p className="text-white font-medium">{alert.client_name}</p>
                      <p className="text-gray-300 text-sm">{alert.alert_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">{new Date(alert.created_at).toLocaleString()}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'active' ? 'bg-red-500/20 text-red-300' :
                      alert.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bookings Chart */}
      {activeChart === 'bookings' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Booking Analytics</h2>
            <div className="flex space-x-2">
              <Button
                onClick={loadBookingAnalytics}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </Button>
              <Button
                onClick={() => exportData('bookings')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {analytics?.bookingAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Booking Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Bookings:</span>
                    <span className="text-white font-semibold">{analytics.bookingAnalytics.summary.total_bookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Completed:</span>
                    <span className="text-green-400 font-semibold">{analytics.bookingAnalytics.summary.completed_bookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Cancelled:</span>
                    <span className="text-red-400 font-semibold">{analytics.bookingAnalytics.summary.cancelled_bookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Completion Rate:</span>
                    <span className="text-white font-semibold">{analytics.bookingAnalytics.summary.completion_rate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Service Types</h3>
                <div className="space-y-3">
                  {analytics.bookingAnalytics.by_service_type?.map((service, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{service.service_type.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-white">{service.count}</span>
                        <span className="text-blue-400">₦{service.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Chart */}
      {activeChart === 'financial' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Financial Analytics</h2>
            <div className="flex space-x-2">
              <Button
                onClick={loadFinancialAnalytics}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </Button>
              <Button
                onClick={() => exportData('payments')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {analytics?.financialAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Revenue:</span>
                    <span className="text-white font-semibold">₦{analytics.financialAnalytics.revenue_summary.total_revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Net Revenue:</span>
                    <span className="text-green-400 font-semibold">₦{analytics.financialAnalytics.revenue_summary.net_revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Refunds:</span>
                    <span className="text-red-400 font-semibold">₦{analytics.financialAnalytics.revenue_summary.refunds.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Avg Transaction:</span>
                    <span className="text-white font-semibold">₦{analytics.financialAnalytics.revenue_summary.average_transaction_value.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  {analytics.financialAnalytics.payment_methods?.map((method, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300 capitalize">{method.method.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-white">{method.count}</span>
                        <span className="text-blue-400">₦{method.amount.toLocaleString()}</span>
                        <span className="text-gray-300 text-sm">({method.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agents Chart */}
      {activeChart === 'agents' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Agent Performance</h2>
            <div className="flex space-x-2">
              <Button
                onClick={() => exportData('agents')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Agent Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{analytics?.overview?.total_agents || 0}</p>
                <p className="text-gray-300">Total Agents</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">4.8</p>
                <p className="text-gray-300">Avg Rating</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">95%</p>
                <p className="text-gray-300">Availability</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">98%</p>
                <p className="text-gray-300">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

