'use client';

import { useState } from 'react';
import { Landing } from '@/components/Landing';
import { BrowseJobs } from '@/components/BrowseJobs';
import { SavedJobs } from '@/components/SavedJobs';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'signin' | 'browse' | 'saved'>('landing');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // const handleSignIn = () => {
  //   setIsLoggedIn(true);
  //   setCurrentScreen('browse');
  // };

  return (
    <div className="min-h-screen bg-[#e8ddd5]">
      {currentScreen === 'landing' && (
        <Landing
          onGetStarted={() => setCurrentScreen('signin')}
          onBrowseJobs={() => setCurrentScreen('browse')}
        />
      )}
      {/* {currentScreen === 'signin' && (
        <SignIn 
          onSignIn={handleSignIn}
          onBack={() => setCurrentScreen('landing')}
        />
      )} */}
      {currentScreen === 'browse' && (
        <BrowseJobs
          jobs={[]}
          onSaveJob={handleSaveJob}
          savedJobs={savedJobs}
          onNavigateToSaved={() => setCurrentScreen('saved')}
          isLoggedIn={isLoggedIn}
        />
      )}
      {currentScreen === 'saved' && (
        <SavedJobs
          savedJobs={savedJobs}
          onNavigateToBrowse={() => setCurrentScreen('browse')}
          onUnsaveJob={handleSaveJob}
        />
      )}
    </div>
  );
}