import { Job } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Building2,
} from "lucide-react";
import { formatJobType, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Card className="h-full flex flex-col hover:bg-blue-100 transition-shadow duration-200 border border-gray-200 gap-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3.5rem]">
            {job.position || "Position Title"}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-base font-medium text-blue-600 truncate">
              {job.company}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pt-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">
                {job.location || "Remote"}
              </span>
            </div>

            {job.salary && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{job.salary}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                {formatJobType(job.type)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatRelativeTime(job.createdAt)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Source:</span>
              <Badge
                variant="outline"
                className="text-xs font-normal border-gray-300 text-gray-600"
              >
                {job.source}
              </Badge>
            </div>
          </div>

          <div className="w-full flex gap-2">
            <Link href={`/jobs/${job.id}`} className="flex-1">
              <Button variant="outline" className="w-full text-sm h-9 cursor-pointer" size="sm">
                View Details
              </Button>
            </Link>

            <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full text-sm h-9 gap-1.5 cursor-pointer" size="sm">
                Apply Now
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </CardFooter>
    </Card>
  );
}
