'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SavedJobs } from '@/components/SavedJobs';
import { getJobs } from '@/lib/api';
import { Job } from '@/types';

export default function SavedPage() {
  const router = useRouter();
  const { status } = useSession();
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedJobs');
      if (saved) {
        try {
          const parsedSaved = JSON.parse(saved) as string[];
          const savedIds = new Set<string>(parsedSaved);
          setSavedJobs(savedIds);

          if (savedIds.size > 0) {
            fetchSavedJobs(savedIds);
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error parsing saved jobs:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  }, [status, router]);

  const fetchSavedJobs = async (savedIds: Set<string>) => {
    try {
      setLoading(true);

      const response = await getJobs({
        page: 1,
        limit: 1000,
      });

      if (response.success && response.data) {
        const savedJobsData = response.data.data.filter((job: Job) =>
          savedIds.has(job.id)
        );
        setJobs(savedJobsData);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set<string>(prev);
      newSet.delete(jobId);

      if (typeof window !== 'undefined') {
        localStorage.setItem('savedJobs', JSON.stringify(Array.from(newSet)));
      }

      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));

      return newSet;
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#d4c4bb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-700">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <SavedJobs
      jobs={jobs}
      savedJobs={savedJobs}
      onNavigateToBrowse={() => router.push('/jobs')}
      onUnsaveJob={handleUnsaveJob}
    />
  );
}