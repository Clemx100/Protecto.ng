'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, ChevronDown, ChevronRight } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>(['1'])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const privacySections = [
    {
      id: '1',
      title: '1. Introduction',
      content: `Protector.Ng ("we," "our," or "us") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our executive protection and security services platform.

Scope of Policy:
• This policy applies to all users of Protector.Ng services
• It covers information collected through our website, mobile application, and services
• It applies to both clients and security operators using our platform

Your Consent:
By using our services, you consent to the collection and use of your information as described in this Privacy Policy. If you do not agree with this policy, please do not use our services.

Last Updated: January 2025
Effective Date: January 2025`
    },
    {
      id: '2',
      title: '2. Information We Collect',
      content: `We collect information necessary to provide our security services effectively and safely. This includes:

Personal Information:
• Name, email address, phone number, and contact details
• Physical address and location information
• Identification documents (for verification purposes)
• Profile information and preferences
• Emergency contact information

Financial Information:
• Payment method details (processed securely through third-party payment processors)
• Billing address and transaction history
• Bank account details (only when required for payments)

Service Information:
• Booking and service request details
• Location data during active services
• Communication logs with security personnel
• Service preferences and special requirements
• Feedback and ratings

Technical Information:
• Device information (type, model, operating system)
• IP address and network information
• Browser type and version
• App usage data and analytics
• Cookies and tracking technologies

Operational Information:
• Communication records (calls, messages, chat logs)
• Safety incident reports
• Service completion records
• Operator assignment and scheduling information`
    },
    {
      id: '3',
      title: '3. How We Use Your Information',
      content: `We use the collected information for the following purposes:

Service Delivery:
• Processing and fulfilling service requests
• Connecting clients with security operators
• Managing bookings and schedules
• Facilitating real-time communication
• Processing payments and transactions
• Delivering emergency response services

Safety and Security:
• Ensuring service quality and safety
• Monitoring service delivery in real-time
• Responding to emergencies and incidents
• Verifying operator and client identities
• Maintaining service records for safety compliance

Communication:
• Sending service confirmations and updates
• Providing customer support
• Sending important safety and security alerts
• Responding to inquiries and requests
• Notifying about service changes or updates

Platform Improvement:
• Analyzing service usage patterns
• Improving our services and features
• Conducting research and analytics
• Testing new features and functionality
• Enhancing user experience

Legal and Compliance:
• Complying with legal obligations
• Protecting our rights and interests
• Preventing fraud and abuse
• Responding to legal requests
• Enforcing our terms of service`
    },
    {
      id: '4',
      title: '4. Data Storage and Security',
      content: `We implement comprehensive security measures to protect your information:

Security Measures:
• Encryption of data in transit (SSL/TLS protocols)
• Encryption of sensitive data at rest
• Secure cloud storage with industry-leading providers
• Regular security audits and assessments
• Access controls and authentication systems
• Firewall and intrusion detection systems

Data Storage:
• Data is stored on secure servers located in trusted data centers
• We use reputable cloud service providers with strong security certifications
• Regular backups ensure data availability and recovery
• Data retention follows applicable legal requirements

Access Controls:
• Limited access on a need-to-know basis
• Regular review of access permissions
• Employee training on data protection
• Secure authentication for all system access

Incident Response:
• Immediate response to security incidents
• Notification procedures for data breaches
• Regular security updates and patches
• Continuous monitoring for vulnerabilities

While we implement strong security measures, no system is 100% secure. We cannot guarantee absolute security but are committed to protecting your information to the best of our ability.`
    },
    {
      id: '5',
      title: '5. Data Sharing and Disclosure',
      content: `We do not sell your personal information. We may share information in the following circumstances:

Service Providers:
• Payment processors for transaction processing
• Cloud storage providers for data hosting
• Communication service providers for messaging and calls
• Analytics providers for service improvement (anonymized data)
• All service providers are bound by confidentiality agreements

Security Operators:
• Necessary information shared with assigned security personnel
• Limited to information required for service delivery
• Location data shared only during active services
• Contact information for coordination purposes

Legal Requirements:
• Compliance with court orders, subpoenas, or legal processes
• Response to government or law enforcement requests
• Protection of rights, property, or safety
• Enforcement of our terms and policies
• Investigation of potential violations

Business Transfers:
• Information may be transferred in merger, acquisition, or sale scenarios
• New owners will be bound by this Privacy Policy
• Users will be notified of significant ownership changes

With Your Consent:
• We may share information when you explicitly consent
• You can revoke consent at any time
• Some sharing may be necessary for service delivery`

    },
    {
      id: '6',
      title: '6. Your Rights and Choices',
      content: `You have several rights regarding your personal information:

Access Rights:
• Request access to your personal information
• Obtain a copy of data we hold about you
• Review how your information is being used

Correction Rights:
• Update or correct inaccurate information
• Modify your profile and preferences
• Change contact and payment information

Deletion Rights:
• Request deletion of your account and data
• Remove information no longer necessary
• Note: Some information may be retained for legal compliance

Opt-Out Rights:
• Opt-out of marketing communications
• Disable location tracking (may affect service quality)
• Disable analytics and tracking cookies
• Control data collection preferences

Data Portability:
• Request your data in a portable format
• Transfer your information to another service
• Export your service history and records

How to Exercise Your Rights:
• Contact us at support@protector.ng
• Use account settings for preference changes
• Submit formal requests through our support system
• We will respond within 30 days of receiving your request

Limitations:
• Some rights may be limited by legal obligations
• Service delivery may require certain information
• We may retain information for legal or safety purposes`
    },
    {
      id: '7',
      title: '7. Cookies and Tracking Technologies',
      content: `We use cookies and similar technologies to enhance your experience:

Types of Cookies:
• Essential Cookies: Required for basic platform functionality
• Performance Cookies: Help us understand how users interact with our platform
• Functionality Cookies: Remember your preferences and settings
• Analytics Cookies: Provide insights into usage patterns

How We Use Cookies:
• Maintaining user sessions
• Remembering login credentials (with your consent)
• Storing user preferences
• Analyzing website and app usage
• Improving platform performance

Third-Party Cookies:
• Payment processors may set cookies for transaction processing
• Analytics providers may use cookies for data collection
• Advertising partners (if applicable) may use cookies

Managing Cookies:
• Browser settings allow you to control cookies
• You can delete cookies at any time
• Disabling cookies may affect platform functionality
• Mobile app settings control app-based tracking

Do Not Track:
• We respect Do Not Track signals
• Some features may require tracking for functionality
• You can opt-out through your account settings`
    },
    {
      id: '8',
      title: '8. Third-Party Services',
      content: `Our platform integrates with third-party services:

Payment Processors:
• We use Paystack and other secure payment processors
• Payment information is processed by third-party providers
• We do not store full credit card numbers
• Payment processors have their own privacy policies

Cloud Services:
• Data storage through reputable cloud providers
• Communication services for messaging and calls
• Analytics services for platform improvement
• All providers meet strict security standards

Communication Services:
• SMS and email delivery services
• Push notification services
• Video and voice call services
• All communications are encrypted

Important Notes:
• Third-party services have their own privacy policies
• We are not responsible for third-party privacy practices
• We carefully select partners committed to data protection
• Links to third-party privacy policies are available upon request

We recommend reviewing third-party privacy policies to understand their practices.`
    },
    {
      id: '9',
      title: '9. Location Data',
      content: `Location data is critical for our security services:

Why We Collect Location Data:
• Real-time tracking during active services
• Emergency response and rapid deployment
• Route optimization for security operators
• Service delivery verification
• Safety monitoring and incident response

How We Use Location Data:
• Shared with assigned security personnel during active services
• Used for emergency response coordination
• Stored for service records and incident reports
• Used to improve service delivery

Location Data Controls:
• You can disable location tracking in app settings
• Note: Some services may require location data
• Emergency services always use location when available
• Historical location data is stored securely

Location Data Sharing:
• Shared only with assigned security operators
• Used for service delivery and safety purposes
• Not shared with third parties except as required by law
• Deleted according to our data retention policy

Your Rights:
• Request access to location data we have collected
• Request deletion of location data
• Opt-out of non-essential location tracking
• Understand how location data is being used`
    },
    {
      id: '10',
      title: '10. Children\'s Privacy',
      content: `Protector.Ng services are intended for users 18 years and older:

Age Requirement:
• Our services are designed for adults (18+)
• We do not knowingly collect information from children
• Accounts require age verification
• Services may be booked for minors but must be done by adults

If You Are a Parent or Guardian:
• You can request information about data collected about minors
• You can request deletion of a minor's information
• You can revoke consent for data collection
• Contact us immediately if you believe we have collected a child's data

Protection Measures:
• Age verification during registration
• Monitoring for underage account creation
• Immediate action upon discovering minor accounts
• Compliance with applicable child protection laws

For questions about children's privacy, contact us at support@protector.ng`
    },
    {
      id: '11',
      title: '11. Data Retention',
      content: `We retain your information for as long as necessary:

Retention Periods:
• Active Account Data: Retained while your account is active
• Service Records: Retained for 7 years for legal and safety purposes
• Financial Records: Retained as required by financial regulations
• Communication Logs: Retained for 2 years after service completion
• Location Data: Retained for 1 year after service completion

Deletion Criteria:
• Information is deleted when no longer needed
• Upon account deletion request (subject to legal requirements)
• After expiration of retention periods
• When required by applicable laws

Retention Exceptions:
• Information may be retained longer for legal compliance
• Safety incident records may be retained indefinitely
• Financial records subject to regulatory requirements
• Information needed for dispute resolution

Your Rights:
• Request early deletion of your information
• Understand our retention policies
• Access retained information
• Request data export before deletion`
    },
    {
      id: '12',
      title: '12. International Data Transfers',
      content: `Your information may be transferred and processed outside Nigeria:

Transfer Locations:
• Data may be stored on servers outside Nigeria
• Third-party service providers may process data internationally
• Cloud services may use global data centers
• We ensure appropriate safeguards are in place

Safeguards:
• Data protection agreements with service providers
• Standard contractual clauses for international transfers
• Compliance with applicable data protection laws
• Regular security assessments of international providers

Your Rights:
• You consent to international data transfers by using our services
• You can request information about transfer locations
• We maintain high standards regardless of location
• Your rights remain protected under this policy

If you have concerns about international transfers, please contact us.`
    },
    {
      id: '13',
      title: '13. Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time:

Notification of Changes:
• Significant changes will be communicated via email
• Notifications will appear in the app
• Updated policy will be posted on our website
• Effective date will be clearly indicated

Reviewing Changes:
• "Last Updated" date indicates the latest revision
• Previous versions will be archived
• Changes become effective 30 days after notification
• Continued use constitutes acceptance of changes

Your Options:
• Review the updated policy before continuing use
• Contact us with questions about changes
• Opt-out or delete account if you disagree with changes
• Existing bookings will be honored under original terms

We encourage you to review this policy periodically to stay informed about how we protect your information.`
    },
    {
      id: '14',
      title: '14. Contact Us',
      content: `For questions, concerns, or requests regarding this Privacy Policy:

Protector.Ng Security Services
Address: No 3 Balogu street Anifowoshe, Ikeja, Lagos, Nigeria
Phone: +234 712 000 5328
Email: support@protector.ng
Privacy Email: privacy@protector.ng
Website: www.protector.ng

Customer Service Hours:
• General Inquiries: 24/7
• Privacy Requests: Monday-Friday, 9 AM - 5 PM
• Emergency Services: 24/7

How to Contact Us:
• Email for privacy-related inquiries
• Phone for urgent privacy concerns
• In-app support for account-related questions
• Written requests can be sent to our address

Response Times:
• General inquiries: Within 48 hours
• Privacy requests: Within 30 days (as required by law)
• Urgent concerns: Within 24 hours
• Data access requests: Within 30 days

We are committed to addressing your privacy concerns promptly and thoroughly.`
    }
  ]

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Shield className="h-5 w-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Introduction */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-6 w-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Protector.Ng Privacy Policy</h2>
          </div>
          <p className="text-gray-300 leading-relaxed mb-4">
            Your privacy is important to us. This Privacy Policy explains how Protector.Ng collects, 
            uses, discloses, and protects your personal information when you use our executive 
            protection and security services platform.
          </p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Important:</strong> Please read this Privacy Policy carefully. By using our 
              services, you agree to the collection and use of your information as described in 
              this policy.
            </p>
          </div>
          <div className="mt-4 flex items-center space-x-3 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Last Updated: January 2025</span>
          </div>
        </div>

        {/* Privacy Policy Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Privacy Policy Details</h2>
          
          {privacySections.map((section) => (
            <div key={section.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <h3 className="font-semibold text-white text-left pr-2">{section.title}</h3>
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

        {/* Summary */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Your Privacy Rights Summary</h3>
          <div className="space-y-3 text-gray-300">
            <p className="leading-relaxed">
              This Privacy Policy outlines your rights regarding your personal information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Right to access your personal information</li>
              <li>Right to correct inaccurate information</li>
              <li>Right to delete your data</li>
              <li>Right to opt-out of certain data collection</li>
              <li>Right to data portability</li>
              <li>Right to file complaints about data handling</li>
            </ul>
            <p className="leading-relaxed mt-4">
              For more information about exercising these rights, please contact us at privacy@protector.ng
            </p>
          </div>
        </div>

        {/* Contact for Questions */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Questions About Privacy?</h3>
          <p className="text-gray-300 mb-4 leading-relaxed">
            If you have questions about this Privacy Policy, how we handle your information, or 
            want to exercise your privacy rights, please contact our privacy team.
          </p>
          <div className="space-y-2 mb-4 text-sm text-gray-300">
            <p><strong>Email:</strong> privacy@protector.ng</p>
            <p><strong>Phone:</strong> +234 712 000 5328</p>
            <p><strong>Support:</strong> support@protector.ng</p>
          </div>
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

