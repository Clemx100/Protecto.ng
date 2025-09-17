"use client"

import Link from "next/link"
import { 
  Shield, 
  Users, 
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
  X
} from "lucide-react"
import { useState } from "react"

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
              <a href="#careers" className="text-gray-300 hover:text-white transition-colors">Careers</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
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
            <div className="md:hidden py-4 border-t border-white/10">
              <nav className="flex flex-col space-y-4">
                <a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a>
                <a href="#about" className="text-gray-300 hover:text-white transition-colors">About</a>
                <a href="#careers" className="text-gray-300 hover:text-white transition-colors">Careers</a>
                <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
                <Link 
                  href="/client"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-center"
                >
                  Request Protection
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
            Executive Protection
            <span className="block text-blue-400">Services</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Premium on-demand private security services for Nigeria's elite. 
            Professional armed protection with real-time tracking, secure payments, 
            and 24/7 emergency response capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              href="/client"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
            >
              <Shield className="h-6 w-6" />
              <span>Request Protection</span>
            </Link>
            <a 
              href="#services"
              className="px-8 py-4 bg-transparent border-2 border-white/30 hover:border-white text-white text-lg font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="h-6 w-6" />
              <span>Learn More</span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">500+</div>
              <div className="text-gray-300 text-sm">Successful Missions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">24/7</div>
              <div className="text-gray-300 text-sm">Emergency Response</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">50+</div>
              <div className="text-gray-300 text-sm">Trained Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">100%</div>
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

      {/* Careers Section */}
      <section id="careers" className="bg-white/5 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join Our Team</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Become part of Nigeria's most elite security team. We're looking for dedicated professionals 
              who are committed to excellence and client safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">Security Agent Positions</h3>
              <p className="text-gray-300 mb-6">
                Join our team of highly trained security professionals. We offer competitive packages, 
                comprehensive training, and career advancement opportunities.
              </p>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>• Executive Protection Specialist</li>
                <li>• Tactical Response Team</li>
                <li>• Event Security Coordinator</li>
                <li>• Travel Security Specialist</li>
              </ul>
              <Link 
                href="/operator"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Users className="h-5 w-5" />
                <span>View Operator Dashboard</span>
              </Link>
            </div>
            
            <div className="bg-white/10 rounded-xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">Requirements</h3>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <span>Valid security license and firearms permit</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <span>Minimum 3 years security experience</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <span>Clean criminal record and background check</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <span>Excellent communication and interpersonal skills</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <span>Physical fitness and tactical training</span>
                </li>
              </ul>
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
              <p className="text-gray-300 mb-2">+234 800 PROTECT</p>
              <p className="text-sm text-gray-400">24/7 Emergency Response</p>
            </div>
            
            <div className="text-center">
              <MapPin className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Headquarters</h3>
              <p className="text-gray-300 mb-2">Victoria Island, Lagos</p>
              <p className="text-sm text-gray-400">Nigeria</p>
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
                <li>Careers</li>
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