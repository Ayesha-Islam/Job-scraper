'use client';

import { useState } from 'react';
import { ArrowLeft, Bookmark, Search } from 'lucide-react';
import { Job } from '@/types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';

interface SavedJobsProps {
  jobs: Job[];
  savedJobs: Set<string>;
  onNavigateToBrowse: () => void;
  onUnsaveJob: (jobId: string) => void;
}

export function SavedJobs({ jobs, savedJobs, onNavigateToBrowse, onUnsaveJob }: SavedJobsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filter jobs by search query
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.position.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      (job.location && job.location.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={onNavigateToBrowse}
            className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Browse Jobs</span>
          </button>

          <div className="text-center text-foreground mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Bookmark className="w-8 h-8 fill-primary text-primary" />
              <h1 className="text-4xl font-bold">Saved Jobs</h1>
            </div>
            <p className="text-muted-foreground">
              {jobs.length === 0
                ? "You haven't saved any jobs yet"
                : `You have ${jobs.length} saved job${jobs.length === 1 ? '' : 's'}`
              }
            </p>
          </div>

          {jobs.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved jobs..."
                  className="w-full pl-12 pr-4 py-3 bg-background border-2 border-input rounded-full placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isSaved={savedJobs.has(selectedJob.id)}
          onSave={() => onUnsaveJob(selectedJob.id)}
          onClose={() => setSelectedJob(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Bookmark className="w-24 h-24 mx-auto text-muted-foreground stroke-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">No Saved Jobs Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start browsing jobs and save the ones you're interested in!
            </p>
            <button
              onClick={onNavigateToBrowse}
              className="px-8 py-3 bg-primary text-primary-foreground border-2 border-border rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Browse All Jobs
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No jobs match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
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
    </div>
  );
}