import { Bookmark } from 'lucide-react';
import { Job } from '@/types';
import { formatJobType } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
  compact?: boolean;
}

export function JobCard({ job, isSaved, onSave, onClick, compact = false }: JobCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#c8b8e8] border-2 border-black rounded-2xl p-4 hover:shadow-lg transition-shadow relative cursor-pointer ${compact ? 'h-full' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        className="absolute top-3 right-3 p-1 hover:bg-black/5 rounded-full z-10"
      >
        <Bookmark
          className={`w-5 h-5 ${isSaved ? 'fill-black' : ''}`}
        />
      </button>

      {!compact && (
        <div className="space-y-2 pr-8">
          <h3 className="font-bold text-lg">{job.title}</h3>
          <p className="text-xs text-gray-600">{job.company}</p>
          <span>{formatJobType(job.type)}</span>
          <p className="text-sm text-gray-700 line-clamp-2">{job.description}</p>
          <div className="pt-1">
            <span className="inline-block px-3 py-1 bg-[#b8a8d8] border border-black rounded-full text-xs">
              {job.location}
            </span>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex flex-col justify-between h-full pr-8">
          <div>
            <h3 className="font-bold text-sm mb-1">{job.title}</h3>
            <p className="text-xs text-gray-600">{job.company}</p>
          </div>
        </div>
      )}
    </div>
  );
}