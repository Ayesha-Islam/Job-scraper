import {
  Bookmark,
  MapPin,
  DollarSign,
  Briefcase,
  Globe,
  ExternalLink,
  Building2,
  Clock,
  Loader2,
} from 'lucide-react';
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

type DescriptionBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

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

function getDescriptionBlocks(raw: string | null | undefined): DescriptionBlock[] {
  return stripStaleHtml(raw)
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      if (block.startsWith('## ')) {
        return { type: 'heading', text: block.replace(/^##\s+/, '').trim() };
      }

      return { type: 'paragraph', text: block };
    });
}

interface JobDetailModalProps {
  job: Job;
  isSaved?: boolean;
  isSaveLoading?: boolean;
  showSaveButton?: boolean;
  onSave?: () => void;
  onClose: () => void;
}

export function JobDetailModal({
  job,
  isSaved = false,
  isSaveLoading = false,
  showSaveButton = true,
  onSave,
  onClose,
}: JobDetailModalProps) {
  const descriptionBlocks = getDescriptionBlocks(job.description);
  const relativeTimeSource = job.postedAt || job.scrapedAt;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[86vh] bg-background border border-border">
        <DialogHeader className="p-2 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold mb-2 text-foreground">
                {job.position}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-base text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{job.company}</span>
              </DialogDescription>
            </div>

            {showSaveButton && (
              <Button
                variant={isSaved ? 'default' : 'outline'}
                size="icon"
                disabled={isSaveLoading}
                aria-label={isSaved ? 'Unsave job' : 'Save job'}
                title={isSaved ? 'Unsave job' : 'Save job'}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!isSaveLoading) {
                    onSave?.();
                  }
                }}
                className={
                  isSaved
                    ? 'bg-primary hover:bg-muted disabled:opacity-70'
                    : 'hover:bg-accent border-border disabled:opacity-70'
                }
              >
                {isSaveLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {job.location && (
                <Badge variant="secondary" className="bg-popover border border-border hover:text-foreground">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {job.location}
                </Badge>
              )}

              <Badge variant="secondary" className="bg-popover border border-border hover:text-foreground">
                <Briefcase className="w-4 h-4 mr-1.5" />
                {formatJobType(job.type)}
              </Badge>

              {job.salary && (
                <Badge variant="secondary" className="bg-popover border border-border hover:text-foreground">
                  <DollarSign className="w-4 h-4 mr-1.5" />
                  {job.salary}
                </Badge>
              )}

              {job.source && (
                <Badge variant="secondary" className="bg-popover border border-border hover:text-foreground">
                  <Globe className="w-4 h-4 mr-1.5" />
                  {job.source}
                </Badge>
              )}

              {relativeTimeSource && (
                <Badge variant="outline" className="text-foreground border-border hover:text-foreground">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatRelativeTime(relativeTimeSource)}
                </Badge>
              )}
            </div>

            <Separator />

            {descriptionBlocks.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 text-muted-foreground">
                  Job Description
                </h3>
                <div className="space-y-4">
                  {descriptionBlocks.map((block, index) => (
                    block.type === 'heading' ? (
                      <h4 key={index} className="text-foreground font-semibold text-base mt-5 first:mt-0">
                        {block.text}
                      </h4>
                    ) : (
                      <p key={index} className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {block.text}
                      </p>
                    )
                  ))}
                </div>
              </div>
            )}

            {descriptionBlocks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No detailed description available</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 pt-2">
          <Button
            asChild
            className="w-full bg-card hover:bg-primary text-foreground hover:text-background"
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