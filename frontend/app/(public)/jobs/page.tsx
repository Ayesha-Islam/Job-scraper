'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { BrowseJobs } from '@/components/BrowseJobs';
import {
  getJobs,
  getSavedJobs,
  saveJob,
  unsaveJob,
} from '@/lib/api';
import { Job } from '@/types';

type SessionWithBackendToken = {
  backendToken?: string;
};

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const initialSearch = searchParams.get('search') || '';

  const backendToken =
    (session as SessionWithBackendToken | null)?.backendToken;

  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    async function loadJobs() {
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
          setError('Failed to load jobs.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load jobs.');
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [initialSearch]);

  useEffect(() => {
    if (!backendToken) {
      setSavedJobs(new Set());
      return;
    }

    async function loadSavedJobs(token: string) {
      try {
        const response = await getSavedJobs(token);

        if (response.success && response.data) {
          setSavedJobs(
            new Set(response.data.map((job: Job) => job.id))
          );
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadSavedJobs(backendToken);
  }, [backendToken]);

  const handleSaveJob = async (jobId: string) => {
    if (!backendToken) {
      router.push('/login');
      return;
    }

    const currentlySaved = savedJobs.has(jobId);

    try {
      if (currentlySaved) {
        await unsaveJob(jobId, backendToken);

        setSavedJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        await saveJob(jobId, backendToken);

        setSavedJobs(prev => {
          const next = new Set(prev);
          next.add(jobId);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to update saved job:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading jobs...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-card border border-border rounded-lg hover:bg-accent"
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
      onNavigateToSaved={() => router.push('/saved-jobs')}
      isLoggedIn={isLoggedIn}
      initialSearch={initialSearch}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(prev => !prev)}
    />
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <JobsPageContent />
    </Suspense>
  );
}