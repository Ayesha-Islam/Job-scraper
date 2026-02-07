import { useState } from 'react';
import { X } from 'lucide-react';
import { JobType } from '@/types';

export interface FilterOptions {
  jobTypes: JobType[];
  remote: boolean | null;
  salaryRange: string;
  experience: string[];
}

interface FilterPanelProps {
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}

export function FilterPanel({ onClose, onApplyFilters }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    jobTypes: [],
    remote: null,
    salaryRange: '',
    experience: [],
  });

  const handleJobTypeToggle = (type: JobType) => {
    setFilters(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter(t => t !== type)
        : [...prev.jobTypes, type]
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      jobTypes: [],
      remote: null,
      salaryRange: '',
      experience: [],
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-2 border-black rounded-3xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Job Type */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Job Type</h3>
          <div className="space-y-2">
            {(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] as JobType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.jobTypes.includes(type)}
                  onChange={() => handleJobTypeToggle(type)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm capitalize">
                  {type.toLowerCase().replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Remote Work */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Work Location</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="remote"
                checked={filters.remote === null}
                onChange={() => setFilters(prev => ({ ...prev, remote: null }))}
                className="w-4 h-4"
              />
              <span className="text-sm">All</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="remote"
                checked={filters.remote === true}
                onChange={() => setFilters(prev => ({ ...prev, remote: true }))}
                className="w-4 h-4"
              />
              <span className="text-sm">Remote</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="remote"
                checked={filters.remote === false}
                onChange={() => setFilters(prev => ({ ...prev, remote: false }))}
                className="w-4 h-4"
              />
              <span className="text-sm">On-site</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2 px-4 border-2 border-black rounded-full hover:bg-gray-50 transition-colors font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 px-4 bg-[#b8a8d8] border-2 border-black rounded-full hover:bg-[#a898c8] transition-colors font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}