'use client'

import { useState } from 'react';
import { Search, User, Filter } from 'lucide-react';
import { Job } from '@/types';
import { JobCard } from './JobCard';
import { UserMenu } from './UserMenu';
import { JobDetailModal } from './JobDetailModal';
import { FilterPanel, FilterOptions } from './FilterPanel';

interface BrowseJobsProps {
  jobs: (Job[]);
  onSaveJob: (jobId: string) => void;
  savedJobs: Set<string>;
  onNavigateToSaved: () => void;
  isLoggedIn: boolean;
  initialSearch?: string;

}

export function BrowseJobs({jobs, onSaveJob, savedJobs, onNavigateToSaved,  initialSearch = ''
 }: BrowseJobsProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [locationQuery, setLocationQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    jobTypes: [],
    remote: null,
    salaryRange: '',
    experience: [],
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationQuery || (job.location && job.location.toLowerCase().includes(locationQuery.toLowerCase()));

    const matchesJobType = filters.jobTypes.length === 0 || filters.jobTypes.includes(job.type);
    return matchesSearch && matchesLocation && matchesJobType;
  });

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen">
      <div className=" mx-auto">
        {/* Header */}
        <div className="bg-[#d4c4bb] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            {/* <h1 className="text-xl font-bold">JobHub</h1> */}
            <div className="flex items-center space-x-4">
              {/* <button className="text-sm hover:underline">Home</button>
              <button className="text-sm hover:underline">Post Jobs</button>
              <button className="text-sm hover:underline">Browse Startups</button> */}
            </div>
            <div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 hover:bg-black/5 rounded-full relative"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Title and Toggle */}
          <div className="mb-4">
            <div className="space-y-1 flex flex-col items-center justify-center text-center">
              <h2 className="text-4xl font-bold mb-1 ">Browse All Jobs</h2>
              <p className="text-sm text-gray-600">Explore all available roles or discover curated AI recommendations</p>
            </div>
            {/* <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 bg-white border border-black rounded-full text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
                className="px-4 py-2 bg-[#b8a8d8] border border-black rounded-full text-sm hover:bg-[#a898c8]"
              >
                {viewMode === 'grid' ? 'Masonry View' : 'Grid View'}
              </button>
            </div> */}
          </div>

          {/* Search Filters */}
          <div className="flex gap-3 border-2 border-black rounded-full p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role or keyword"
                className="w-full pl-10 pr-4 py-2 bg-[#b8a8d8] border border-black rounded-full placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Location"
              className="w-48 px-4 py-2 bg-white border border-black rounded-full placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <UserMenu
            onNavigateToSaved={onNavigateToSaved}
            onClose={() => setShowUserMenu(false)}
          />
        )}

        {/* Filter Panel */}
        {showFilters && (
          <FilterPanel
            onClose={() => setShowFilters(false)}
            onApplyFilters={handleApplyFilters}
          />
        )}

        {/* Job Detail Modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            isSaved={savedJobs.has(selectedJob.id)}
            onSave={() => onSaveJob(selectedJob.id)}
            onClose={() => setSelectedJob(null)}
          />
        )}

        {/* Jobs Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobs.has(job.id)}
                onSave={() => onSaveJob(job.id)}
                onClick={() => setSelectedJob(job)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" style={{ gridAutoRows: 'min-content' }}>
            {filteredJobs.map((job, index) => {
              const heights = ['h-32', 'h-48', 'h-40', 'h-56', 'h-36', 'h-44', 'h-52', 'h-40'];
              const height = heights[index % heights.length];

              return (
                <div key={job.id} className={height}>
                  <JobCard
                    job={job}
                    isSaved={savedJobs.has(job.id)}
                    onSave={() => onSaveJob(job.id)}
                    onClick={() => setSelectedJob(job)}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}