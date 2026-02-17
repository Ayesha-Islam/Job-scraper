'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrowseJobs } from '@/components/BrowseJobs';
import { getJobs } from '@/lib/api';
import { Job } from '@/types';
import { FilterOptions } from '@/components/FilterPanel';

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const initialSearch = searchParams.get('search') || '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedJobs');
      if (saved) {
        try {
          const parsedSaved = JSON.parse(saved) as string[];
          setSavedJobs(new Set<string>(parsedSaved));
        } catch (error) {
          console.error('Error parsing saved jobs:', error);
        }
      }
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      setIsLoggedIn(loggedIn);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const filters = (e as CustomEvent<FilterOptions>).detail;
    };
    window.addEventListener("filtersChanged", handler);
    return () => window.removeEventListener("filtersChanged", handler);
  }, []);
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        setError(null);

        const response = await getJobs({
          page: 1,
          limit: 100, 
          search: initialSearch || undefined,
        });

        if (response.success && response.data) {
          setJobs(response.data.data);
        } else {
          setError('Failed to load jobs');
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [initialSearch]);

  const handleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('savedJobs', JSON.stringify(Array.from(newSet)));
      }
      return newSet;
    });
  };

  const handleToggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1421] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B1421] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#15202B] border-2 border-gray-700 rounded-full hover:bg-[#1a2a3a] transition-colors text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowseJobs
      jobs={jobs}
      onSaveJob={handleSaveJob}
      savedJobs={savedJobs}
      onNavigateToSaved={() => router.push('/saved')}
      isLoggedIn={isLoggedIn}
      initialSearch={initialSearch}
      showFilters={showFilters}
      onToggleFilters={handleToggleFilters}
    />
  );
}