'use client'

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Grid3x3, LayoutGrid, MapPin } from 'lucide-react';
import { Job } from '@/types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { FilterPanel, FilterOptions } from './FilterPanel';
import { getJobs } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface BrowseJobsProps {
  jobs: Job[];
  onSaveJob: (jobId: string) => void;
  savedJobs: Set<string>;
  onNavigateToSaved: () => void;
  isLoggedIn: boolean;
  initialSearch?: string;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function BrowseJobs({
  jobs: initialJobs,
  onSaveJob,
  savedJobs,
  initialSearch = '',
  showFilters,
  onToggleFilters
}: BrowseJobsProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [locationQuery, setLocationQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    jobTypes: [],
    remote: null,
    salaryRange: 'any',
    experience: [],
  });
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  useEffect(() => {
    if (initialJobs && initialJobs.length > 0) {
      setJobs(initialJobs);
    } else {
      fetchFilteredJobs(1);
    }
  }, [initialJobs]);

  const fetchFilteredJobs = async (page: number = 1) => {
    try {
      setLoading(true);

      const response = await getJobs({
        page,
        limit: 50,
        search: searchQuery || undefined,
        location: locationQuery || undefined,
        type: filters.jobTypes.length > 0 ? filters.jobTypes[0] : undefined,
      });

      if (response.success && response.data) {
        setJobs(response.data.data);
        setCurrentPage(response.data.pagination.page);
        setTotalPages(response.data.pagination.totalPages);
        setTotalJobs(response.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== initialSearch || locationQuery) {
        fetchFilteredJobs(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, locationQuery]);

  const filteredJobs = (jobs || []).filter(job => {
    const matchesJobType = filters.jobTypes.length === 0 || filters.jobTypes.includes(job.type);
    return matchesJobType;
  });

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    fetchFilteredJobs(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchFilteredJobs(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeFilterCount = filters.jobTypes.length + (filters.remote !== null ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#0B1421] pt-24">
      <div className="mx-auto max-w-7xl p-8">
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <h1 className="text-6xl text-[#FFFFFF] font-bold mb-2">Browse All Jobs</h1>
            <p className="text-sm text-[#FFFFFF]">
              Explore all available roles or discover curated AI recommendations
            </p>
            {totalJobs > 0 && (
              <Badge variant="secondary" className="mt-2 bg-[#15202B] text-white hover:bg-gray-800">
                {jobs.length} of {totalJobs} jobs
              </Badge>
            )}
          </div>

          <Card className="transition-colors border-none shadow-none bg-[#15202B]">
            <CardContent>
              <div className="flex items-center justify-center gap-3 pt-4">
                <div className="flex-1 flex items-center gap-3 bg-[#0B1421] border border-gray-700 shadow-sm hover:shadow-md transition-shadow py-1.5 px-2 rounded-md">
                  <div className="flex items-center flex-1 group">
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors ml-1" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Job title, keywords, or company"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-700 placeholder:text-gray-500 h-11"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchFilteredJobs(1);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center flex-1 group">
                    <MapPin className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors ml-1" />
                    <Input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Location"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-700 h-11"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchFilteredJobs(1);
                        }
                      }}
                    />
                  </div>

                  <Button
                    onClick={() => fetchFilteredJobs(1)}
                    className="bg-gray-800 hover:bg-black text-white font-semibold h-9 px-8 transition-colors"
                    size="sm"
                  >
                    Search
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={`h-11 w-11  ${viewMode === 'grid' ? 'bg-[#0B1421] text-[#FFFFFF]  hover:bg-gray-800' : 'hover:bg-gray-100 '}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'masonry' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('masonry')}
                    className={`h-11 w-11 ${viewMode === 'masonry' ? 'bg-[#0B1421]  text-[#FFFFFF] hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showFilters && (
          <FilterPanel
            onClose={onToggleFilters}
            onApplyFilters={handleApplyFilters}
          />
        )}

        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            isSaved={savedJobs.has(selectedJob.id)}
            onSave={() => onSaveJob(selectedJob.id)}
            onClose={() => setSelectedJob(null)}
          />
        )}

        <main className="px-6 py-8">
          {activeFilterCount > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium">Active filters:</span>
              {filters.jobTypes.map(type => (
                <Badge key={type} variant="secondary" className="bg-black text-white hover:bg-gray-800">
                  {type.toLowerCase().replace('_', ' ')}
                </Badge>
              ))}
              {filters.remote !== null && (
                <Badge variant="secondary" className="bg-black text-white hover:bg-gray-800">
                  {filters.remote ? 'Remote' : 'On-site'}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApplyFilters({ jobTypes: [], remote: null, salaryRange: 'any', experience: [] })}
                className="hover:bg-gray-100"
              >
                Clear all
              </Button>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="break-inside-avoid">
                      <JobCard
                        job={job}
                        isSaved={savedJobs.has(job.id)}
                        onSave={() => onSaveJob(job.id)}
                        onClick={() => setSelectedJob(job)}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}

              {filteredJobs.length === 0 && !loading && (
                <Card className="mt-12 border-2 border-gray-200">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search criteria or filters
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setLocationQuery('');
                        handleApplyFilters({ jobTypes: [], remote: null, salaryRange: 'any', experience: [] });
                      }}
                      className="hover:bg-gray-100"
                    >
                      Clear all filters
                    </Button>
                  </CardContent>
                </Card>
              )}

              {totalPages > 1 && (
                <div className="mt-12">
                  <Separator className="mb-6" />
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="hover:bg-gray-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-10 h-10 ${currentPage === pageNum
                              ? 'bg-gray-800 text-[#FFFFFF] hover:bg-gray-800'
                              : 'hover:bg-gray-100'
                              }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="hover:bg-gray-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-center text-[#FFFFFF]  text-sm mt-4">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}