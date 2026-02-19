'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, ChevronDown, ChevronRight } from 'lucide-react'

export default function PrivacyPolicyPage() {
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

By using our services, you agree to the collection and use of information in accordance with this policy. Please read this Privacy Policy carefully before using our services.

Last Updated: January 2025`
    },
    {
      id: '2',
      title: '2. Information We Collect',
      content: `We collect several types of information to provide and improve our services:

Personal Information:
• Name, email address, phone number, and postal address
• Date of birth and identification documents (for security verification)
• Payment information and billing address
• Emergency contact information

Service-Related Information:
• Booking details including dates, times, locations, and service preferences
• Travel itineraries and destination information
• Special requirements or instructions for security services
• Communication history with our operators and support team

Technical Information:
• Device information and IP address
• Browser type and version
• Operating system
• Usage data and analytics
• Cookies and similar tracking technologies

Location Data:
• Real-time location data (with your permission) for service delivery
• Pickup and destination locations
• Historical location data related to completed services`
    },
    {
      id: '3',
      title: '3. How We Use Your Information',
      content: `We use the collected information for various purposes:

Service Delivery:
• To process and manage your bookings
• To coordinate security services and deployments
• To communicate with you about your bookings
• To provide customer support and respond to inquiries
• To verify your identity and ensure security compliance

Platform Improvement:
• To analyze usage patterns and improve our services
• To develop new features and functionality
• To personalize your experience
• To monitor and prevent technical issues

Business Operations:
• To process payments and manage billing
• To send service-related notifications and updates
• To comply with legal obligations
• To enforce our Terms of Service
• To detect and prevent fraud or abuse

Marketing (with your consent):
• To send promotional communications
• To inform you about new services or features
• To share security tips and industry updates`
    },
    {
      id: '4',
      title: '4. Information Sharing and Disclosure',
      content: `We do not sell your personal information. We may share your information only in the following circumstances:

Service Providers:
• We may share information with trusted third-party service providers who assist us in operating our platform, conducting business, or serving our users
• These providers are bound by confidentiality agreements and are only authorized to use your information as necessary to provide services to us

Security Personnel:
• We may share necessary information with assigned security operators and personnel to deliver services
• This includes location data, contact information, and service requirements relevant to your bookings

Legal Requirements:
• We may disclose information if required by law, court order, or government regulation
• We may disclose information to protect our rights, property, or safety, or that of our users or others
• We may share information in connection with an investigation of suspected fraud or other illegal activity

Business Transfers:
• In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity
• We will notify you of any such change in ownership or control of your personal information

With Your Consent:
• We may share information with third parties when you explicitly consent to such sharing`
    },
    {
      id: '5',
      title: '5. Data Security',
      content: `We implement appropriate technical and organizational security measures to protect your personal information:

Security Measures:
• Encryption of sensitive data in transit and at rest
• Secure servers and databases protected by firewalls
• Regular security assessments and vulnerability testing
• Access controls and authentication requirements
• Employee training on data protection and confidentiality

However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.

Your Responsibility:
• Keep your account credentials confidential
• Use strong, unique passwords
• Log out after using shared devices
• Report any suspected security breaches immediately`
    },
    {
      id: '6',
      title: '6. Your Privacy Rights',
      content: `You have the following rights regarding your personal information:

Access Rights:
• Request access to the personal information we hold about you
• Receive a copy of your personal data in a portable format
• Know what information we have collected about you

Correction Rights:
• Request correction of inaccurate or incomplete information
• Update your profile and account information at any time
• Request deletion of incorrect information

Deletion Rights:
• Request deletion of your personal information
• Close your account and request data removal
• Note: Some information may be retained for legal or operational purposes

Opt-Out Rights:
• Opt-out of marketing communications
• Disable location tracking (may affect service quality)
• Adjust cookie preferences and tracking settings

Data Portability:
• Request your data in a structured, machine-readable format
• Transfer your data to another service provider

To exercise these rights, please contact us at support@protector.ng or through your account settings.`
    },
    {
      id: '7',
      title: '7. Cookies and Tracking Technologies',
      content: `We use cookies and similar tracking technologies to track activity on our platform and store certain information:

Types of Cookies:
• Essential Cookies: Required for basic platform functionality
• Performance Cookies: Help us understand how visitors interact with our platform
• Functionality Cookies: Remember your preferences and choices
• Targeting Cookies: Used to deliver relevant advertisements

Managing Cookies:
• You can control cookies through your browser settings
• Most browsers allow you to refuse or delete cookies
• Note: Disabling cookies may affect platform functionality

Third-Party Tracking:
• We may use third-party analytics services (e.g., Google Analytics)
• These services may use cookies and tracking technologies
• We do not control third-party tracking technologies`
    },
    {
      id: '8',
      title: '8. Children\'s Privacy',
      content: `Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.

If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately.

If we discover that we have collected information from a child without parental consent, we will delete that information promptly.`
    },
    {
      id: '9',
      title: '9. Data Retention',
      content: `We retain your personal information only for as long as necessary:

Active Accounts:
• We retain information for as long as your account is active
• Information is retained to provide ongoing services

Inactive Accounts:
• Account data is retained for a reasonable period after account closure
• This allows for account reactivation and dispute resolution

Legal Requirements:
• Some information may be retained longer for legal compliance
• Financial records are retained as required by law
• Security logs may be retained for security and fraud prevention

After retention periods expire, we securely delete or anonymize your information.`
    },
    {
      id: '10',
      title: '10. International Data Transfers',
      content: `Your information may be transferred to and processed in countries other than your country of residence:

Data Processing:
• Our servers may be located in different countries
• Service providers may process data in various jurisdictions
• We ensure appropriate safeguards are in place for international transfers

Protection Standards:
• We maintain the same level of data protection regardless of location
• We comply with applicable data protection laws
• We use standard contractual clauses where appropriate`
    },
    {
      id: '11',
      title: '11. Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time:

Notification of Changes:
• We will notify you of significant changes via email or platform notification
• Minor changes may be posted without notice
• Continued use constitutes acceptance of updated policy

Review Policy:
• We encourage you to review this policy periodically
• The "Last Updated" date indicates when changes were made
• Previous versions will be archived for reference

Your Rights:
• You may close your account if you disagree with policy changes
• You can request deletion of your information at any time`
    },
    {
      id: '12',
      title: '12. Contact Information',
      content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

Protector.Ng Security Services
Address: No 3 Balogu street Anifowoshe, Ikeja, Lagos, Nigeria
Phone: +234 712 000 5328
Email: support@protector.ng
Privacy Email: privacy@protector.ng
Website: www.protector.ng

Data Protection Officer:
For privacy-specific inquiries, please contact our Data Protection Officer at privacy@protector.ng

Response Time:
We aim to respond to privacy inquiries within 30 days.

Last Updated: January 2025
Version: 2.0`
    }
  ]

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white page-transition">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <Link 
            href="/app?tab=account"
            prefetch={true}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all duration-200 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
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
          <p className="text-gray-300 leading-relaxed">
            Your privacy is important to us. This Privacy Policy explains how we collect, use, 
            and protect your personal information when you use our executive protection and security services platform.
          </p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Important:</strong> By using our services, you agree to the collection and use of information 
              as described in this Privacy Policy. If you do not agree with any part of this policy, please do not use our services.
            </p>
          </div>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Privacy Policy Details</h2>
          
          {privacySections.map((section) => (
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

        {/* Summary */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Your Privacy Matters</h3>
          <p className="text-gray-300 leading-relaxed mb-4">
            We are committed to protecting your privacy and personal information. This Privacy Policy outlines 
            our practices and your rights regarding your data. If you have any questions or concerns, please 
            don't hesitate to contact us.
          </p>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Last Updated: January 2025</span>
          </div>
        </div>

        {/* Contact for Questions */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Questions About Privacy?</h3>
          <p className="text-gray-300 mb-4">
            If you have any questions about this Privacy Policy or wish to exercise your privacy rights, 
            please contact our support team.
          </p>
          <Link
            href="/account/support"
            prefetch={true}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  )
}



