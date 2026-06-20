import { Bookmark, MapPin, Briefcase, DollarSign, Clock, Building2 } from 'lucide-react';
import { Job } from '@/types';
import { formatJobType, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
  compact?: boolean;
}

export function JobCard({ job, isSaved, onSave, onClick, compact = false }: JobCardProps) {


  return (
    <Card
      onClick={onClick}
      className={`relative bg-[#15202B] border-none hover:shadow-2xl hover:scale-[1.02] hover:border-gray-800 transition-all duration-300 cursor-pointer group flex flex-col ${compact ? 'h-full' : ''
        }`}
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 hover:bg-white/10 rounded-full"
      >
        <Bookmark
          className={`w-5 h-5 transition-all ${isSaved ? 'fill-white stroke-white' : 'stroke-white hover:fill-white/50'
            }`}
        />
      </Button>

      <CardHeader className="pb-3">
        {!compact && (
          <div className="pr-12">
            <h3 className="font-bold text-lg text-[#FFFFFF] leading-tight mb-1">{job.position}</h3>
            <div className="flex items-center gap-1 text-xs text-[#FFFFFF]">
              <Building2 className="w-4 h-4" />
              <p>{job.company}</p>
            </div>
          </div>
        )}

        {compact && (
          <div className="pr-12">
            <h3 className="font-bold text-sm mb-1 line-clamp-2 text-[#FFFFFF]">{job.position}</h3>
            <p className="text-xs text-[#FFFFFF] flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#FFFFFF]" />
              {job.company}
            </p>
          </div>
        )}
      </CardHeader>

      {!compact && (
        <>
          <CardContent className="space-y-3">
            {/* Job Details Badges */}
            <div className="flex flex-wrap gap-2">
              {job.location && (
                <Badge variant="outline" className="bg-white border-black">
                  <MapPin className="w-3 h-3 mr-1" />
                  {job.location}
                </Badge>
              )}

              {job.type && (
                <Badge variant="outline" className="bg-white border-black">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {formatJobType(job.type)}
                </Badge>
              )}

              {job.salary && (
                <Badge variant="outline" className="bg-white border-black">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {job.salary}
                </Badge>
              )}

              {job.scrapedAt && (
                <Badge variant="outline" className="bg-white border-black">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(job.scrapedAt)}
                </Badge>
              )}
            </div>

            {job.description && (
              <p className="text-sm text-white line-clamp-2 leading-relaxed">
                {job.description}
              </p>
            )}

            {job.source && (
              <Badge variant="secondary" className="bg-[#FFFFFF] border border-black">
                Source: {job.source}
              </Badge>
            )}
          </CardContent>

          <CardFooter className="pt-2 pb-4 mt-auto">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (job.url) {
                  window.open(job.url, '_blank');
                }
              }}
              className="w-full bg-[#0B1421] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-black transition-colors"
            >
              Quick Apply
            </Button>
          </CardFooter>
        </>
      )}

      {compact && (
        <CardContent className="pt-0">
          {job.location && (
            <Badge variant="outline" className="bg-white border-black">
              <MapPin className="w-3 h-3 mr-1" />
              {job.location}
            </Badge>
          )}
        </CardContent>
      )}
    </Card>
  );
}