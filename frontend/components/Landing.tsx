import { Search } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onBrowseJobs: () => void;
}

export function Landing({}: LandingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full h-screen bg-[#d4c4bb] shadow-lg p-8 border-2 border-black flex flex-col mb-8">

        {/* Search Bar */}
        <div className="relative mt-32 mb-6 max-w-2xl mx-auto w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 bg-[#b8a8d8] border border-black rounded-full placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <h2 className="text-3xl font-bold pt-8">JOBHUB</h2>
          <p className="text-sm leading-relaxed">
            Create an account or sign in to get<br />
            your personalized job recommendations.
          </p>
          <button 
            onClick={() => window.location.href = '/jobs'}
            className="px-8 py-2 bg-[#b8a8d8] border-2 border-black rounded-full hover:bg-[#a898c8] transition-colors"
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}