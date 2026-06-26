'use client'

import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LandingProps {
  onGetStarted: () => void;
  onBrowseJobs: (searchQuery?: string) => void;
}

export function Landing({ onGetStarted, onBrowseJobs }: LandingProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      onBrowseJobs(searchQuery);
    } else {
      onBrowseJobs();
    }
  };

  const handleGetStarted = () => {
    onGetStarted();
    onBrowseJobs();
  };

  return (
    <div className="min-h-screen  bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="bg-transparent border-0 shadow-none">
          <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for jobs, companies, or keywords..."
                  className="pl-12 pr-32 py-6 text-lg bg-popover border border-border rounded-full focus:border-ring focus:ring-ring"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full bg-background hover:bg-primary text-foreground px-6"
                  size="lg"
                >
                  Search
                </Button>
              </div>
            </form>

            <div className="text-center space-y-6">
              <p className="text-foreground text-base">
                Create an account or sign in to get<br />
                your personalized job recommendations
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-card hover:bg-primary text-foreground text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}