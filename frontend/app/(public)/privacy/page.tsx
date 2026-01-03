import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-gray-200">
        <div className="py-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Last updated: December 28, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="rounded-lg shadow-smborder-gray-200">
          <div className="p-8 md:p-12">
            {/* Introduction */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                JobScraper ("we," "our," or "us") respects your privacy and is committed to
                protecting your personal data. This privacy policy explains how we collect,
                use, and safeguard your information when you use our platform.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of
                any changes by posting the new policy on this page.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Information We Collect
              </h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Information You Provide
              </h3>
              <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
                <li>Account information (name, email, password)</li>
                <li>Profile information and preferences</li>
                <li>Job search preferences and saved jobs</li>
                <li>Communication with our support team</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Automatically Collected Information
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Device information (browser type, operating system)</li>
                <li>IP address and approximate location</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>To provide and maintain our services</li>
                <li>To personalize your job search experience</li>
                <li>To send you relevant job alerts and updates</li>
                <li>To improve our platform and develop new features</li>
                <li>To communicate with you about your account</li>
                <li>To ensure platform security and prevent fraud</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Data Sharing and Disclosure
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>We do not sell your personal information.</strong> We may share your
                data only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Service Providers:</strong> Third-party companies that help us
                  operate our platform (hosting, analytics, email services)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or
                  government regulation
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger,
                  acquisition, or sale of assets
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you explicitly agree to share
                  your information
                </li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal data
                </li>
                <li>
                  <strong>Opt-Out:</strong> Unsubscribe from marketing communications
                </li>
                <li>
                  <strong>Data Portability:</strong> Export your data in a machine-readable
                  format
                </li>
                <li>
                  <strong>Object:</strong> Object to processing of your personal data
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise any of these rights, please contact us at{" "}
                <a
                  href="mailto:privacy@jobscraper.com"
                  className="text-blue-600 hover:underline"
                >
                  privacy@jobscraper.com
                </a>
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data,
                including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure servers with regular security updates</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection practices</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. While
                we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal data only for as long as necessary to provide our
                services and fulfill the purposes described in this policy. When you delete
                your account, we will delete or anonymize your personal data within 30 days,
                except where we are required to retain it for legal or regulatory purposes.
              </p>
            </section>

            {/* Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Cookies and Tracking
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your experience
                and collect usage data. You can control cookies through your browser
                settings.
              </p>
              <p className="text-gray-700 leading-relaxed">
                For more information about our use of cookies, please see our{" "}
                <a href="/cookies" className="text-blue-600 hover:underline">
                  Cookie Policy
                </a>
                .
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Third-Party Links
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Our platform contains links to third-party websites and job postings. We are
                not responsible for the privacy practices of these external sites. We
                encourage you to review their privacy policies before providing any personal
                information.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not
                knowingly collect personal information from children. If you believe we have
                collected information from a child, please contact us immediately.
              </p>
            </section>

            {/* International Users */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                International Data Transfers
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Your information may be transferred to and processed in countries other than
                your own. We ensure appropriate safeguards are in place to protect your data
                in accordance with this privacy policy and applicable data protection laws.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this privacy policy from time to time to reflect changes in our
                practices or legal requirements. We will notify you of any material changes
                by posting the updated policy on this page and updating the "Last updated"
                date. We encourage you to review this policy periodically.
              </p>
            </section>

            {/* Contact Us */}
            <section className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this privacy
                policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:privacy@jobscraper.com"
                    className="text-blue-600 hover:underline"
                  >
                    privacy@jobscraper.com
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Support:</strong>{" "}
                  <a
                    href="mailto:support@jobscraper.com"
                    className="text-blue-600 hover:underline"
                  >
                    support@jobscraper.com
                  </a>
                </p>
                <p className="text-gray-700">
                  <strong>Contact Page:</strong>{" "}
                  <a href="/contact" className="text-blue-600 hover:underline">
                    jobscraper.com/contact
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}