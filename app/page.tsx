"use client"

// Force dynamic rendering by disabling static generation
export const dynamic = 'force-dynamic'

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { 
  Shield, 
  Settings, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle, 
  Star,
  Car,
  UserCheck,
  Globe,
  Menu,
  X,
  Truck,
  DollarSign,
  FileText,
  Users
} from "lucide-react"

function HomePageContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle redirect after authentication
  useEffect(() => {
    const redirectPath = searchParams.get('redirect')
    if (redirectPath) {
      // Store the redirect path in sessionStorage for after authentication
      sessionStorage.setItem('redirectAfterAuth', redirectPath)
      // Remove the redirect parameter from URL to clean it up
      const url = new URL(window.location.href)
      url.searchParams.delete('redirect')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
              <a href="#vehicle-owners" className="text-gray-300 hover:text-white transition-colors">Vehicle Owners</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                id="downloadBtn"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download App</span>
              </button>
              <Link 
                href="/client"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Request Protection
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/10 bg-black/30 backdrop-blur-lg">
              <nav className="flex flex-col space-y-4 px-4">
                <a href="#services" className="text-gray-300 hover:text-white transition-colors py-2">Services</a>
                <a href="#about" className="text-gray-300 hover:text-white transition-colors py-2">About</a>
                <a href="#vehicle-owners" className="text-gray-300 hover:text-white transition-colors py-2">Vehicle Owners</a>
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors py-2">Contact</a>
                <button
                  id="mobileDownloadBtn"
                  className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-center flex items-center justify-center space-x-2 mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download App</span>
                </button>
                <Link 
                  href="/client"
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-center"
                >
                  Request Protection
                </Link>
                <Link 
                  href="/history"
                  className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-center"
                >
                  Booking History
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Executive Protection{' '}
            <span className="block text-blue-400">Services</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Premium on-demand private security services for Nigeria's elite. 
            Professional armed protection with real-time tracking, secure payments, 
            and 24/7 emergency response capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 items-center">
            <Link 
              href="/client"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
            >
              <Shield className="h-6 w-6" />
              <span>Request Protection</span>
            </Link>
            <button
              id="heroDownloadBtn"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/25"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download App</span>
            </button>
            <a 
              href="#services"
              className="px-8 py-4 bg-transparent border-2 border-white/30 hover:border-white text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="h-6 w-6" />
              <span>Learn More</span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">25+</div>
              <div className="text-gray-300 text-sm">Successful Missions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">24/7</div>
              <div className="text-gray-300 text-sm">Emergency Response</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">8+</div>
              <div className="text-gray-300 text-sm">Trained Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">98%</div>
              <div className="text-gray-300 text-sm">Client Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-white/5 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Services</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Comprehensive security solutions tailored to your specific needs and requirements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-blue-400/50 transition-colors">
              <Shield className="h-12 w-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Armed Protection</h3>
              <p className="text-gray-300 mb-4">
                Professional armed security personnel with tactical training, weapons certification, 
                and extensive experience in executive protection.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Licensed firearms</li>
                <li>• Tactical training</li>
                <li>• Threat assessment</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-green-400/50 transition-colors">
              <Car className="h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Armored Vehicles</h3>
              <p className="text-gray-300 mb-4">
                Luxury armored vehicles with bulletproof protection, advanced security features, 
                and professional drivers.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Bulletproof protection</li>
                <li>• Luxury interiors</li>
                <li>• Professional drivers</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-colors">
              <MapPin className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Real-time Tracking</h3>
              <p className="text-gray-300 mb-4">
                Live GPS tracking, instant communication, and real-time status updates 
                through our secure mobile platform.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Live GPS tracking</li>
                <li>• Instant messaging</li>
                <li>• Status updates</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-yellow-400/50 transition-colors">
              <Clock className="h-12 w-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">24/7 Support</h3>
              <p className="text-gray-300 mb-4">
                Round-the-clock support, emergency response, and immediate assistance 
                whenever you need it.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Emergency hotline</li>
                <li>• Rapid response</li>
                <li>• Crisis management</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-red-400/50 transition-colors">
              <UserCheck className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Event Security</h3>
              <p className="text-gray-300 mb-4">
                Comprehensive security for corporate events, private parties, and special occasions 
                with crowd control and access management.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Crowd control</li>
                <li>• Access management</li>
                <li>• Risk assessment</li>
              </ul>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-cyan-400/50 transition-colors">
              <Globe className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">Travel Security</h3>
              <p className="text-gray-300 mb-4">
                International travel protection with local expertise, cultural awareness, 
                and seamless coordination across borders.
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• International coverage</li>
                <li>• Local expertise</li>
                <li>• Travel coordination</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Why Choose Protector.Ng?</h2>
              <p className="text-lg text-gray-300 mb-8">
                We are Nigeria's premier executive protection service, combining cutting-edge technology 
                with world-class security expertise to deliver unmatched protection for our clients.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Licensed & Certified</h3>
                    <p className="text-gray-300">All our agents are fully licensed, certified, and undergo rigorous background checks.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Advanced Technology</h3>
                    <p className="text-gray-300">State-of-the-art tracking, communication, and security systems for maximum protection.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Discretion & Privacy</h3>
                    <p className="text-gray-300">Complete confidentiality and discretion in all our operations and client interactions.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Our Process</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                  <span className="text-white">Request protection through our app</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                  <span className="text-white">We assign your dedicated team</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                  <span className="text-white">Real-time tracking and communication</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <span className="text-white">Secure payment and service completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicle Owner Onboarding Section */}
      <section id="vehicle-owners" className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Own a Bulletproof Vehicle?
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Partner with Protector.Ng and earn money by providing your armored vehicle for our premium protection services. 
              Join our network of trusted vehicle owners and start earning today.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Benefits */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Why Partner With Us?</h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <DollarSign className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Premium Earnings</h4>
                    <p className="text-gray-300">Earn ₦250,000 - ₦700,000 and above per mission depending on vehicle type and duration.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Users className="h-6 w-6 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Elite Clientele</h4>
                    <p className="text-gray-300">Serve high-profile clients including executives, celebrities, and VIPs.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Shield className="h-6 w-6 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Insurance Coverage</h4>
                    <p className="text-gray-300">Full insurance coverage and liability protection for all missions.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-yellow-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Flexible Schedule</h4>
                    <p className="text-gray-300">Choose your availability and work around your schedule.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements & CTA */}
            <div className="bg-white/10 rounded-xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Vehicle Requirements</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">B6/B7 Level bulletproof protection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Valid insurance and registration</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Professional driver with security training</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">GPS tracking system</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Communication equipment</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Regular maintenance records</span>
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
                  <div className="flex items-center justify-center space-x-2">
                    <Truck className="h-5 w-5" />
                    <span>Register Your Vehicle</span>
                  </div>
                </button>
                
                <button className="w-full bg-transparent border-2 border-white/30 hover:border-white text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Download Requirements PDF</span>
                  </div>
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  Have questions? Call us at{" "}
                  <a href="tel:+2347120005328" className="text-blue-400 hover:text-blue-300 font-medium">
                    +234 712 000 5328
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Earnings Calculator */}
          <div className="mt-16 bg-white/5 rounded-xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Earnings Calculator</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-green-500/20 rounded-lg p-4 mb-4">
                  <Car className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h4 className="text-lg font-semibold text-white">Standard SUV</h4>
                </div>
                <p className="text-gray-300 mb-2">₦250,000 - ₦400,000</p>
                <p className="text-sm text-gray-400">Per 8-hour mission</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-500/20 rounded-lg p-4 mb-4">
                  <Truck className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h4 className="text-lg font-semibold text-white">Armored Sedan</h4>
                </div>
                <p className="text-gray-300 mb-2">₦400,000 - ₦550,000</p>
                <p className="text-sm text-gray-400">Per 8-hour mission</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-500/20 rounded-lg p-4 mb-4">
                  <Shield className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <h4 className="text-lg font-semibold text-white">VIP Limousine</h4>
                </div>
                <p className="text-gray-300 mb-2">₦550,000 - ₦700,000+</p>
                <p className="text-sm text-gray-400">Per 8-hour mission</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Get In Touch</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Ready to experience premium protection? Contact us today for a consultation 
              or emergency assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Phone className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Emergency Hotline</h3>
              <p className="text-gray-300 mb-2">+234 712 000 5328</p>
              <p className="text-sm text-gray-400">24/7 Emergency Response</p>
            </div>
            
            <div className="text-center">
              <MapPin className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Headquarters</h3>
              <p className="text-gray-300 mb-2">No 3 Balogu street Anifowoshe, Ikeja</p>
              <p className="text-sm text-gray-400">Lagos, Nigeria</p>
            </div>
            
            <div className="text-center">
              <Clock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Business Hours</h3>
              <p className="text-gray-300 mb-2">24/7 Operations</p>
              <p className="text-sm text-gray-400">Always Available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-8 w-8 text-blue-400" />
                <h3 className="text-xl font-bold text-white">Protector.Ng</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Nigeria's premier executive protection service, delivering world-class security 
                with cutting-edge technology.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Armed Protection</li>
                <li>Armored Vehicles</li>
                <li>Event Security</li>
                <li>Travel Security</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>About Us</li>
                <li>Contact</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Access</h4>
              <div className="space-y-2">
                <Link href="/client" className="block text-sm text-gray-300 hover:text-white transition-colors">
                  Request Protection
                </Link>
                <Link href="/operator" className="block text-sm text-gray-300 hover:text-white transition-colors">
                  Operator Dashboard
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Protector.Ng. All rights reserved. | Licensed Security Services
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function HomePageWithSearchParams() {
  return <HomePageContent />
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading PROTECTOR.NG...</p>
        </div>
      </div>
    }>
      <HomePageWithSearchParams />
    </Suspense>
  )
}