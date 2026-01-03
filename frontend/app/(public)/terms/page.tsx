import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-gray-100">
      {/* Header */}
      <div className="">
        <div className="py-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Last updated: December 28, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-6">
        <div className="shadow-sm bg-gray-150 border border-gray-200 max-w-4xl mx-auto">
          <div className="p-8 md:p-12">
            {/* Agreement to Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Agreement to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing or using JobScraper ("the Service"), you agree to be bound by
                these Terms of Service ("Terms"). If you disagree with any part of these
                terms, you may not access the Service. These Terms apply to all visitors,
                users, and others who access or use the Service.
              </p>
            </section>

            {/* Use License */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Use License</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Permission is granted to temporarily access and use JobScraper for personal,
                non-commercial job searching purposes only. This license does not include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Modifying or copying the materials or software</li>
                <li>Using the materials for any commercial purpose</li>
                <li>Attempting to reverse engineer any software on the platform</li>
                <li>Removing any copyright or proprietary notations from materials</li>
                <li>Scraping, harvesting, or extracting data without written permission</li>
                <li>Transferring the materials to another person or server</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you create an account with us, you must provide accurate, complete, and
                current information. You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Maintaining the security of your account and password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Ensuring your account information remains up to date</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We reserve the right to refuse service, terminate accounts, or remove content
                at our sole discretion.
              </p>
            </section>

            {/* Job Listings */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Job Listings Disclaimer
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                JobScraper aggregates job listings from third-party sources. We do not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Guarantee the accuracy, completeness, or currency of job listings</li>
                <li>Endorse any employer, company, or job posting</li>
                <li>Process job applications on behalf of employers</li>
                <li>Guarantee employment, interviews, or job offers</li>
                <li>Verify the legitimacy of every job posting</li>
                <li>Act as an employment agency or recruiter</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                You apply for jobs at your own risk. We recommend conducting your own
                research before applying to any position.
              </p>
            </section>

            {/* Prohibited Uses */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to use JobScraper to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Violate any local, state, national, or international law</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Transmit viruses, malware, or any other harmful code</li>
                <li>Harass, abuse, threaten, or harm other users</li>
                <li>Send spam, unsolicited messages, or bulk communications</li>
                <li>Scrape, crawl, or automatically extract data from the platform</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Circumvent security features or access restrictions</li>
                <li>Use the Service for any unauthorized commercial purpose</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Intellectual Property
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are owned
                by JobScraper and are protected by international copyright, trademark,
                patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Our trademarks and trade dress may not be used in connection with any product
                or service without our prior written consent. Job listings remain the
                property of their respective copyright holders.
              </p>
            </section>

            {/* User Content */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Content</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By submitting content to the Service (such as profile information or saved
                searches), you grant us a non-exclusive, worldwide, royalty-free license to
                use, reproduce, and display such content for the purpose of operating and
                improving the Service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You retain all ownership rights to your content. You are responsible for
                ensuring you have the right to submit any content you provide.
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Third-Party Links and Services
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Our Service may contain links to third-party websites, job boards, or
                services that are not owned or controlled by JobScraper. We have no control
                over, and assume no responsibility for, the content, privacy policies, or
                practices of any third-party websites or services. You acknowledge and agree
                that we shall not be liable for any damage or loss caused by your use of any
                third-party content or services.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Disclaimer of Warranties
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties of non-infringement</li>
                <li>Warranties that the Service will be error-free or uninterrupted</li>
                <li>Warranties regarding the accuracy or reliability of job listings</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL JOBSCRAPER, ITS
                DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>
                  Damages resulting from your use or inability to use the Service
                </li>
                <li>Damages resulting from any third-party content or conduct</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                Some jurisdictions do not allow the exclusion of certain warranties or
                limitations on liability, so some of the above limitations may not apply to
                you.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify, defend, and hold harmless JobScraper and its
                affiliates, officers, directors, employees, and agents from any claims,
                liabilities, damages, losses, and expenses arising out of or related to your
                use of the Service or violation of these Terms.
              </p>
            </section>

            {/* Termination */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We may terminate or suspend your account and access to the Service
                immediately, without prior notice or liability, for any reason, including but
                not limited to breach of these Terms. Upon termination, your right to use the
                Service will immediately cease. All provisions of these Terms that by their
                nature should survive termination shall survive, including ownership
                provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of
                [Your Jurisdiction], without regard to its conflict of law provisions. Any
                disputes arising from these Terms or the Service shall be resolved in the
                courts of [Your Jurisdiction].
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time at our sole
                discretion. We will provide notice of any material changes by posting the new
                Terms on this page and updating the "Last updated" date. Your continued use
                of the Service after such modifications constitutes acceptance of the updated
                Terms.
              </p>
            </section>

            {/* Severability */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Severability</h2>
              <p className="text-gray-700 leading-relaxed">
                If any provision of these Terms is held to be unenforceable or invalid, such
                provision will be changed and interpreted to accomplish the objectives of
                such provision to the greatest extent possible under applicable law, and the
                remaining provisions will continue in full force and effect.
              </p>
            </section>

            {/* Contact Us */}
            <section className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:legal@jobscraper.com"
                    className="text-blue-600 hover:underline"
                  >
                    legal@jobscraper.com
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
