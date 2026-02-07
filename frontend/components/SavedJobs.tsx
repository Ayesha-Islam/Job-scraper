import { useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { Job } from '../types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';

interface SavedJobsProps {
  savedJobs: Set<string>;
  onNavigateToBrowse: () => void;
  onUnsaveJob: (jobId: string) => void;
}

const mockJobs: Job[] = [
  { 
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    type: 'FULL_TIME',
    salary: '$120k-$160k',
    url: 'https://example.com/job/1',
    source: 'LinkedIn',
    description: 'We are looking for an experienced frontend developer to join our team. You will be responsible for building scalable web applications using modern frameworks and best practices.',
    hash: 'hash1',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '2',
    title: 'Product Designer',
    company: 'DesignHub',
    location: 'New York, NY',
    type: 'FULL_TIME',
    salary: '$100k-$140k',
    url: 'https://example.com/job/2',
    source: 'Indeed',
    description: 'Join our design team to create beautiful and intuitive user experiences. Work closely with product managers and engineers to bring ideas to life.',
    hash: 'hash2',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '3',
    title: 'Backend Engineer',
    company: 'DataSystems',
    location: 'Austin, TX',
    type: 'FULL_TIME',
    salary: '$130k-$170k',
    url: 'https://example.com/job/3',
    source: 'LinkedIn',
    description: 'Build and maintain robust backend systems that power our data platform. Experience with distributed systems and microservices architecture required.',
    hash: 'hash3',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '4',
    title: 'UX Researcher',
    company: 'UserFirst',
    location: 'Seattle, WA',
    type: 'CONTRACT',
    salary: '$90k-$120k',
    url: 'https://example.com/job/4',
    source: 'Glassdoor',
    description: 'Conduct user research to inform product decisions. Plan and execute studies, analyze data, and present insights to stakeholders.',
    hash: 'hash4',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '5',
    title: 'DevOps Engineer',
    company: 'CloudTech',
    location: 'Boston, MA',
    type: 'FULL_TIME',
    salary: '$140k-$180k',
    url: 'https://example.com/job/5',
    source: 'LinkedIn',
    description: 'Manage and optimize our cloud infrastructure. Automate deployment processes and ensure system reliability and performance.',
    hash: 'hash5',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '6',
    title: 'Mobile Developer',
    company: 'AppWorks',
    location: 'Los Angeles, CA',
    type: 'FULL_TIME',
    salary: '$110k-$150k',
    url: 'https://example.com/job/6',
    source: 'Indeed',
    description: 'Develop native mobile applications for iOS and Android. Work with cross-functional teams to deliver high-quality user experiences.',
    hash: 'hash6',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '7',
    title: 'Data Scientist',
    company: 'AI Labs',
    location: 'Chicago, IL',
    type: 'FULL_TIME',
    salary: '$130k-$170k',
    url: 'https://example.com/job/7',
    source: 'LinkedIn',
    description: 'Apply machine learning and statistical analysis to solve complex business problems. Build predictive models and data pipelines.',
    hash: 'hash7',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '8',
    title: 'Marketing Manager',
    company: 'BrandCo',
    location: 'Miami, FL',
    type: 'FULL_TIME',
    salary: '$90k-$130k',
    url: 'https://example.com/job/8',
    source: 'Glassdoor',
    description: 'Lead marketing initiatives to grow our brand presence. Develop strategies, manage campaigns, and analyze performance metrics.',
    hash: 'hash8',
    isActive: true,
    scrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function SavedJobs({ savedJobs, onNavigateToBrowse, onUnsaveJob }: SavedJobsProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const savedJobsList = mockJobs.filter(job => savedJobs.has(job.id));

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onNavigateToBrowse}
            className="p-2 hover:bg-black/5 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-4">
            <span className="font-bold">Ayesha Lalan</span>
            <button className="p-2 hover:bg-black/5 rounded-full">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#d4c4bb] rounded-3xl border-2 border-black p-8">
          <h1 className="text-3xl font-bold mb-8">Saved Jobs</h1>

          {savedJobsList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No saved jobs yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedJobsList.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={true}
                  onSave={() => onUnsaveJob(job.id)}
                  onClick={() => setSelectedJob(job)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Job Detail Modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            isSaved={savedJobs.has(selectedJob.id)}
            onSave={() => onUnsaveJob(selectedJob.id)}
            onClose={() => setSelectedJob(null)}
          />
        )}
      </div>
    </div>
  );
}