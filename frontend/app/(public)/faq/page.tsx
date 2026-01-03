"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "General",
    question: "What is JobScraper?",
    answer: "JobScraper is a platform that aggregates remote job listings from multiple top job boards including LinkedIn, Remotive, and WeWorkRemotely. We make it easy to find remote opportunities all in one place.",
  },
  {
    category: "General",
    question: "Is JobScraper free to use?",
    answer: "Yes! JobScraper is completely free for job seekers. There are no hidden fees, subscriptions, or paywalls. Our goal is to make remote job searching accessible to everyone.",
  },
  {
    category: "General",
    question: "How often are job listings updated?",
    answer: "Our automated scrapers run every 30 minutes to fetch the latest job postings. This means you'll always have access to the most up-to-date opportunities as soon as they're posted on our source platforms.",
  },
  
  {
    category: "Using the Platform",
    question: "How do I search for jobs?",
    answer: "You can search for jobs using the search bar on the jobs page. Enter keywords like job titles, company names, or skills. You can also use our filters to narrow down results by job type, location, and posting date.",
  },
  {
    category: "Using the Platform",
    question: "Can I save jobs for later?",
    answer: "Yes! Create a free account to save jobs you're interested in. You can access your saved jobs anytime from your profile page. (Note: This feature is coming soon in Week 4 of development)",
  },
  {
    category: "Using the Platform",
    question: "How do I apply for a job?",
    answer: "Click the 'Apply Now' button on any job card or details page. This will redirect you to the original job posting where you can submit your application directly to the employer.",
  },
  
  {
    category: "Technical",
    question: "What job boards do you scrape from?",
    answer: "Currently, we aggregate jobs from LinkedIn, Remotive, and WeWorkRemotely. We're constantly working to add more high-quality remote job sources to our platform.",
  },
  {
    category: "Technical",
    question: "Why am I being redirected to another site to apply?",
    answer: "We don't host job applications directly. When you click 'Apply Now', you're taken to the original source where the employer posted the job. This ensures you're applying through the employer's preferred method and increases your chances of success.",
  },
  {
    category: "Technical",
    question: "Are the job listings verified?",
    answer: "Yes, all jobs go through our verification process which includes deduplication, format validation, and legitimacy checks. However, we recommend doing your own research on companies before applying.",
  },
  
  {
    category: "Account & Privacy",
    question: "Do I need an account to browse jobs?",
    answer: "No, you can browse and search all job listings without creating an account. An account is only needed if you want to save jobs or set up job alerts.",
  },
  {
    category: "Account & Privacy",
    question: "How is my data protected?",
    answer: "We take your privacy seriously. We use industry-standard encryption and security practices. We never sell your personal information to third parties. See our Privacy Policy for more details.",
  },
  {
    category: "Account & Privacy",
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account at any time from your profile settings. All your personal data and saved jobs will be permanently removed from our system.",
  },
  
  {
    category: "Troubleshooting",
    question: "A job listing seems to be incorrect or outdated",
    answer: "If you notice an issue with a job listing, please contact us through our contact page. Include the job ID and details of the issue. We'll investigate and update or remove the listing if necessary.",
  },
  {
    category: "Troubleshooting",
    question: "The search/filters aren't working",
    answer: "Try clearing your browser cache and cookies. If the issue persists, try using a different browser. If you're still experiencing problems, please contact our support team.",
  },
  {
    category: "Troubleshooting",
    question: "I can't find jobs in my location",
    answer: "Our platform focuses on remote jobs that can be done from anywhere. Try using 'Remote' or 'Worldwide' in the location filter. If you're looking for location-specific remote jobs, try searching for that location in the search bar.",
  },
  
  {
    category: "For Employers",
    question: "Can I post jobs directly on JobScraper?",
    answer: "Currently, we only aggregate jobs from partner platforms. To have your jobs appear on JobScraper, post them on LinkedIn, Remotive, or WeWorkRemotely, and they'll automatically appear here within 30 minutes.",
  },
  {
    category: "For Employers",
    question: "How can I remove my company's listings?",
    answer: "If you need to remove or update a job listing, please contact us directly with your company details and the job ID. We'll process your request within 24 hours.",
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(filteredFAQs.map((faq) => faq.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div >
        <div className="py-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <HelpCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Find answers to common questions about JobScraper
            </p>
          </div>
        </div>
      </div>

      <div>
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="max-w-3xl mx-auto mb-6">
            <p className="text-sm text-gray-600">
              Found {filteredFAQs.length} {filteredFAQs.length === 1 ? "result" : "results"}
            </p>
          </div>
        )}

        {/* FAQ Sections */}
        <div className="max-w-3xl mx-auto space-y-8">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">
                  No results found for "{searchQuery}". Try different keywords or{" "}
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-blue-600 hover:underline"
                  >
                    clear your search
                  </button>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{category}</h2>
                <div className="space-y-3">
                  {filteredFAQs
                    .filter((faq) => faq.category === category)
                    .map((faq, index) => {
                      const globalIndex = faqs.indexOf(faq);
                      return (
                        <FAQAccordion
                          key={globalIndex}
                          question={faq.question}
                          answer={faq.answer}
                          isOpen={openIndex === globalIndex}
                          onToggle={() =>
                            setOpenIndex(openIndex === globalIndex ? null : globalIndex)
                          }
                        />
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Contact CTA */}
        <Card className="max-w-3xl mx-auto my-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Still have questions?
              </h3>
              <p className="text-gray-600 mb-4">
                Can't find what you're looking for? Get in touch with our support team.
              </p>
              <a href="/contact">
                <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                  Contact Us
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// FAQ Accordion Component
interface FAQAccordionProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQAccordion({ question, answer, isOpen, onToggle }: FAQAccordionProps) {
  return (
    <Card className="border-gray-500 hover:shadow-sm transition-shadow">
      <CardContent>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between text-left hover transition-colors"
        >
          <span className="font-semibold text-gray-900 pr-8">{question}</span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-5 pt-2">
            <p className="text-gray-600 leading-relaxed">{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}