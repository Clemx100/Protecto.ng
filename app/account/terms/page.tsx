'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, ChevronDown, ChevronRight } from 'lucide-react'

export default function TermsOfServicePage() {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['1'])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const termsSections = [
    {
      id: '1',
      title: '1. Acceptance of Terms',
      content: `By accessing and using the Protector.Ng platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`
    },
    {
      id: '2',
      title: '2. Description of Service',
      content: `Protector.Ng provides executive protection and security services including but not limited to:
      
• Armed and unarmed security protection
• Executive protection services
• Event security services
• Emergency response services
• Personal security consulting

Our services are provided by licensed and trained security professionals in accordance with Nigerian security regulations.`
    },
    {
      id: '3',
      title: '3. User Responsibilities',
      content: `As a user of our services, you agree to:

• Provide accurate and truthful information during registration and booking
• Comply with all applicable laws and regulations
• Follow the instructions of assigned security personnel
• Pay all fees and charges as agreed upon
• Not misuse or abuse our services
• Maintain confidentiality of security procedures and personnel information
• Report any incidents or concerns promptly to our team

Failure to comply with these responsibilities may result in service termination.`
    },
    {
      id: '4',
      title: '4. Booking and Payment Terms',
      content: `Booking Process:
• All bookings must be made through our official platform
• Booking confirmations will be sent via email and SMS
• Changes or cancellations must be requested at least 24 hours in advance

Payment Terms:
• Payment is required before service delivery
• We accept bank transfers, card payments, and mobile money
• All prices are quoted in Nigerian Naira (NGN)
• Additional charges may apply for extended services or special requests
• Refunds are subject to our cancellation policy

Cancellation Policy:
• 48+ hours notice: Full refund
• 24-48 hours notice: 50% refund
• Less than 24 hours: No refund (except in emergencies)`
    },
    {
      id: '5',
      title: '5. Security and Safety',
      content: `Safety is our top priority. We commit to:

• Deploying only licensed and trained security personnel
• Maintaining strict confidentiality of client information
• Following established security protocols and procedures
• Providing emergency response capabilities
• Maintaining professional standards at all times

Client Safety Responsibilities:
• Cooperate with security personnel
• Provide accurate location and contact information
• Report any security concerns immediately
• Follow safety instructions and protocols

Limitation of Liability:
While we take all reasonable precautions, clients acknowledge that security services involve inherent risks and agree to hold Protector.Ng harmless from liability except in cases of gross negligence.`
    },
    {
      id: '6',
      title: '6. Privacy and Data Protection',
      content: `We are committed to protecting your privacy and personal information:

Data Collection:
• We collect only necessary information for service provision
• Personal data includes contact information, location data, and service preferences
• All data is encrypted and securely stored

Data Usage:
• Information is used solely for service delivery and communication
• We do not sell or share personal data with third parties
• Data may be shared with security personnel for service delivery

Data Rights:
• You have the right to access, modify, or delete your personal data
• You can opt-out of non-essential communications
• Data retention follows applicable privacy laws

For detailed information, please review our Privacy Policy.`
    },
    {
      id: '7',
      title: '7. Prohibited Activities',
      content: `The following activities are strictly prohibited:

• Using our services for illegal activities
• Providing false or misleading information
• Harassment or abuse of security personnel
• Attempting to circumvent security protocols
• Unauthorized access to our systems or data
• Sharing confidential security information
• Using our services in violation of local laws
• Interfering with service delivery

Violation of these terms will result in immediate service termination and may result in legal action.`
    },
    {
      id: '8',
      title: '8. Service Availability',
      content: `Service Availability:
• We strive to provide 24/7 availability for emergency services
• Regular services are available based on scheduling
• Service availability may be affected by weather, security conditions, or other factors beyond our control

Service Modifications:
• We reserve the right to modify or discontinue services with reasonable notice
• Emergency situations may require immediate service modifications
• Clients will be notified of significant changes to service terms

Force Majeure:
• We are not liable for service interruptions due to circumstances beyond our control
• This includes natural disasters, government actions, or security threats`
    },
    {
      id: '9',
      title: '9. Dispute Resolution',
      content: `Dispute Resolution Process:

1. Informal Resolution:
   • Contact our customer service team first
   • We will attempt to resolve issues within 48 hours

2. Formal Complaint:
   • Submit written complaint to support@protector.ng
   • Include booking details and description of issue
   • We will respond within 5 business days

3. Mediation:
   • If informal resolution fails, we may suggest mediation
   • Mediation will be conducted by a neutral third party

4. Arbitration:
   • Final disputes will be resolved through binding arbitration
   • Arbitration will be conducted in Lagos, Nigeria
   • Nigerian law will govern all disputes

Legal Jurisdiction:
All disputes are subject to Nigerian law and jurisdiction.`
    },
    {
      id: '10',
      title: '10. Modifications to Terms',
      content: `We reserve the right to modify these terms at any time:

Notification of Changes:
• Significant changes will be communicated via email and platform notifications
• Minor changes may be posted on our website
• Continued use constitutes acceptance of modified terms

Effective Date:
• Changes become effective 30 days after notification
• Emergency changes may take effect immediately
• Previous versions will be archived for reference

Your Rights:
• You may terminate services if you disagree with changes
• Cancellation must be requested within 30 days of notification
• Existing bookings will be honored under original terms`
    },
    {
      id: '11',
      title: '11. Contact Information',
      content: `For questions about these terms or our services:

Protector.Ng Security Services
Address: No 3 Balogu street Anifowoshe, Ikeja, Lagos, Nigeria
Phone: +234 712 000 5328
Email: support@protector.ng
Website: www.protector.ng

Customer Service Hours:
• General Inquiries: 24/7
• Emergency Services: 24/7
• Business Hours: Monday-Friday, 8 AM - 6 PM

Last Updated: January 2025
Version: 2.0`
    }
  ]

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push('/account')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <FileText className="h-5 w-5 text-yellow-400" />
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Introduction */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="h-6 w-6 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Protector.Ng Terms of Service</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Welcome to Protector.Ng, Nigeria's premier executive protection and security services platform. 
            These terms and conditions govern your use of our services and platform. Please read them carefully 
            before using our services.
          </p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Important:</strong> By using our services, you agree to be bound by these terms. 
              If you do not agree with any part of these terms, please do not use our services.
            </p>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Terms and Conditions</h2>
          
          {termsSections.map((section) => (
            <div key={section.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <h3 className="font-semibold text-white text-left">{section.title}</h3>
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {expandedSections.includes(section.id) && (
                <div className="p-4 border-t border-gray-700">
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Agreement */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Agreement</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            By using Protector.Ng services, you acknowledge that you have read, understood, and agree to be bound 
            by these Terms of Service. These terms constitute a legally binding agreement between you and 
            Protector.Ng Security Services.
          </p>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Last Updated: January 2025</span>
          </div>
        </div>

        {/* Contact for Questions */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Questions About These Terms?</h3>
          <p className="text-gray-300 mb-4">
            If you have any questions about these Terms of Service or need clarification on any section, 
            please don't hesitate to contact our support team.
          </p>
          <button
            onClick={() => router.push('/account/support')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Contact Support
          </button>
        </div>
      </main>
    </div>
  )
}
