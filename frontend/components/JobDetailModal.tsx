import { Bookmark, MapPin, DollarSign, Briefcase, Globe, ExternalLink, Building2, Clock } from 'lucide-react';
import { Job } from '@/types';
import { formatJobType, formatRelativeTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface JobDetailModalProps {
  job: Job;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function JobDetailModal({ job, isSaved, onSave, onClose }: JobDetailModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-[#0B1421] border border-gray-700">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold mb-2 text-[#FFFFFF]">
                {job.position}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-base text-gray-700">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{job.company}</span>
              </DialogDescription>
            </div>
            <Button
              variant={isSaved ? "default" : "outline"}
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className={isSaved
                ? "bg-gray-800 hover:bg-gray-700"
                : "hover:bg-gray-100 border-gray-300"
              }
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {job.location && (
                <Badge variant="secondary" className="bg-white border border-gray-300">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {job.location}
                </Badge>
              )}

              <Badge variant="secondary" className="bg-white border border-gray-300">
                <Briefcase className="w-4 h-4 mr-1.5" />
                {formatJobType(job.type)}
              </Badge>

              {job.salary && (
                <Badge variant="secondary" className="bg-black text-white border-black">
                  <DollarSign className="w-4 h-4 mr-1.5" />
                  {job.salary}
                </Badge>
              )}

              {job.source && (
                <Badge variant="secondary" className="bg-white border border-gray-300">
                  <Globe className="w-4 h-4 mr-1.5" />
                  {job.source}
                </Badge>
              )}

              {job.scrapedAt && (
                <Badge variant="outline" className="text-[#FFFFFF] border-gray-300">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatRelativeTime(job.scrapedAt)}
                </Badge>
              )}
            </div>

            <Separator />

            {job.description && (
              <div>
                <h3 className="font-bold text-lg mb-3 text-black">Job Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>
            )}

            {!job.description && (
              <div className="text-center py-8">
                <p className="text-gray-300">No detailed description available</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4">
          <Button
            asChild
            className="w-full bg-[#15202B] hover:bg-gray-800 text-white"
            size="lg"
          >
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              Apply Now
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}