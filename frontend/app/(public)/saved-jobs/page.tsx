'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SavedJobs } from '@/components/SavedJobs';
import { getSavedJobs, unsaveJob } from '@/lib/api';
import { Job } from '@/types';

type SessionWithBackendToken = {
  backendToken?: string;
};

export default function SavedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const savedJobIds = useMemo(() => {
    return new Set(jobs.map(job => job.id));
  }, [jobs]);

  useEffect(() => {
    setSavedJobs(savedJobIds);
  }, [savedJobIds]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const token = (session as SessionWithBackendToken | null)?.backendToken;

    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchSavedJobs(authToken: string) {
      try {
        setLoading(true);

        const response = await getSavedJobs(authToken);

        if (response.success && response.data) {
          setJobs(response.data);
        }
      } catch (error) {
        console.error('Error fetching saved jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedJobs(token);
  }, [session, status, router]);

  const handleUnsaveJob = async (jobId: string) => {
    const token = (session as SessionWithBackendToken | null)?.backendToken;

    if (!token) {
      router.push('/login');
      return;
    }

    const previousJobs = jobs;

    setJobs(currentJobs => currentJobs.filter(job => job.id !== jobId));

    setSavedJobs(currentSavedJobs => {
      const nextSavedJobs = new Set(currentSavedJobs);
      nextSavedJobs.delete(jobId);
      return nextSavedJobs;
    });

    try {
      await unsaveJob(jobId, token);
    } catch (error) {
      console.error('Error removing saved job:', error);
      setJobs(previousJobs);
      setSavedJobs(new Set(previousJobs.map(job => job.id)));
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto mb-4" />
          <p className="text-foreground">Loading saved jobs...</p>
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