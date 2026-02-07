'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrowseJobs } from '@/components/BrowseJobs';

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const initialSearch = searchParams.get('search') || '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedJobs');
      if (saved) {
        setSavedJobs(new Set(JSON.parse(saved)));
      }
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      setIsLoggedIn(loggedIn);
    }
  }, []);

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

  return (
    <BrowseJobs
      jobs={[]}
      onSaveJob={handleSaveJob}
      savedJobs={savedJobs}
      onNavigateToSaved={() => router.push('/saved')}
      isLoggedIn={isLoggedIn}
      initialSearch={initialSearch}
    />
  );
}