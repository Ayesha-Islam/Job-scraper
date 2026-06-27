'use client';

import { useRouter } from 'next/navigation';
import { Landing } from '@/components/Landing';

export default function HomePage() {
  const router = useRouter();

  return (
    <Landing
      onGetStarted={() => router.push('/login')}
      onBrowseJobs={() => router.push('/jobs')}
    />
  );
}