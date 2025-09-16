import Link from "next/link"
import { Shield, Users, Settings } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/app"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Client App
              </Link>
              <Link 
                href="/operator"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Operator Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Executive Protection Services
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Premium on-demand private security services for Nigeria's elite. 
            Professional protection with real-time tracking and secure payments.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/app"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Shield className="h-6 w-6" />
              <span>Request Protection</span>
            </Link>
            <Link 
              href="/operator"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Users className="h-6 w-6" />
              <span>Operator Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <Shield className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Armed Protection</h3>
            <p className="text-gray-300">
              Professional armed security personnel with tactical training and experience.
            </p>
          </div>
          
          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <Settings className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Real-time Tracking</h3>
            <p className="text-gray-300">
              Live GPS tracking and instant communication with your protection team.
            </p>
          </div>
          
          <div className="bg-white/10 rounded-xl p-6 border border-white/20">
            <Users className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">24/7 Support</h3>
            <p className="text-gray-300">
              Round-the-clock support and emergency response capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}