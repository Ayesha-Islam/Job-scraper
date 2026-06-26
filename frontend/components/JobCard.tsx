import { Bookmark, MapPin, Briefcase, DollarSign, Clock, Building2 } from 'lucide-react';
import { Job } from '@/types';
import { formatJobType, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


function stripStaleHtml(raw: string | null | undefined): string {
  if (!raw) return '';

  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|section|article|ul|ol|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getDescriptionPreview(raw: string | null | undefined): string {
  return stripStaleHtml(raw).replace(/^##\s+/gm, '').replace(/\n+/g, ' ').replace(/ +/g, ' ').trim();
}

interface JobCardProps {
  job: Job;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
  compact?: boolean;
}

export function JobCard({ job, isSaved, onSave, onClick, compact = false }: JobCardProps) {
  const descriptionPreview = getDescriptionPreview(job.description);
  const relativeTimeSource = job.postedAt || job.scrapedAt;

  return (
    <Card
      onClick={onClick}
      className={`relative bg-card border-none hover:shadow-2xl hover:scale-[1.02] hover:border-border transition-all duration-300 cursor-pointer group flex flex-col ${compact ? 'h-full' : ''
        }`}
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 hover:bg-popover/10 rounded-full"
      >
        <Bookmark
          className={`w-5 h-5 transition-all ${isSaved ? 'fill-primary stroke-primary' : 'stroke-primary hover:fill-primary/50'
            }`}
        />
      </Button>

      <CardHeader className="pb-3">
        {!compact && (
          <div className="pr-12">
            <h3 className="font-bold text-lg text-foreground leading-tight mb-1">{job.position}</h3>
            <div className="flex items-center gap-1 text-xs text-foreground">
              <Building2 className="w-4 h-4" />
              <p>{job.company}</p>
            </div>
          </div>
        )}

        {compact && (
          <div className="pr-12">
            <h3 className="font-bold text-sm mb-1 line-clamp-2 text-foreground">{job.position}</h3>
            <p className="text-xs text-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3 text-foreground" />
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
                <Badge variant="outline" className="bg-popover border-border">
                  <MapPin className="w-3 h-3 mr-1" />
                  {job.location}
                </Badge>
              )}

              {job.type && (
                <Badge variant="outline" className="bg-popover border-border">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {formatJobType(job.type)}
                </Badge>
              )}

              {job.salary && (
                <Badge variant="outline" className="bg-popover border-border">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {job.salary}
                </Badge>
              )}

              {relativeTimeSource && (
                <Badge variant="outline" className="bg-popover border-border">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(relativeTimeSource)}
                </Badge>
              )}
            </div>

            {descriptionPreview && (
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                {descriptionPreview}
              </p>
            )}

            {job.source && (
              <Badge variant="secondary" className="bg-popover border border-border">
                Source: {job.source}
              </Badge>
            )}
          </CardContent>

          <CardFooter className=" pb-4 mt-auto">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (job.url) {
                  window.open(job.url, '_blank');
                }
              }}
              className="w-full bg-background text-foreground hover:bg-popover hover:text-primary-foreground transition-colors"
            >
              Quick Apply
            </Button>
          </CardFooter>
        </>
      )}

      {compact && (
        <CardContent className="pt-0">
          {job.location && (
            <Badge variant="outline" className="bg-popover border-border">
              <MapPin className="w-3 h-3 mr-1" />
              {job.location}
            </Badge>
          )}
        </CardContent>
      )}
    </Card>
  );
}