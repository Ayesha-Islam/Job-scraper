import { X, Bookmark, MapPin, DollarSign, Briefcase, Globe, ExternalLink } from 'lucide-react';
import { Job } from '@/types';
import { formatJobType, formatRelativeTime } from '@/lib/utils';

interface JobDetailModalProps {
  job: Job;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function JobDetailModal({ job, isSaved, onSave, onClose }: JobDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#d4c4bb] border-2 border-black rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#d4c4bb] border-b-2 border-black p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold mb-2">{job.title}</h2>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="p-2 hover:bg-black/5 rounded-full"
            >
              <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-black' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-[#c8b8e8] border border-black rounded-full text-sm">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#c8b8e8] border border-black rounded-full text-sm">
              <Briefcase className="w-4 h-4" />
              {formatJobType(job.type)}
            </div>
            {job.salary && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-[#b8a8d8] border border-black rounded-full text-sm">
                <DollarSign className="w-4 h-4" />
                {job.salary}
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-[#b8a8d8] border border-black rounded-full text-sm">
              <Globe className="w-4 h-4" />
              {job.source}
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-bold text-lg mb-3">Job Description</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {/* Posted Date */}
          <div className="text-sm text-gray-600">
            Posted: {formatRelativeTime(job.scrapedAt)}
          </div>

          {/* Apply Button */}
          <a 
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#b8a8d8] border-2 border-black rounded-full hover:bg-[#a898c8] transition-colors font-medium flex items-center justify-center gap-2"
          >
            Apply Now
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}