import { Job } from "@/types";
import JobCard from "./JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface JobGridProps {
  jobs: Job[];
  isLoading?: boolean;
}

export default function JobGrid({ jobs, isLoading = false }: JobGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-5">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No jobs found
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Try adjusting your search or filters to find more opportunities
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}


function JobCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="mb-4">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        <div className="space-y-2.5 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/6" />
        </div>

        <div className="mt-auto pt-4">
          <Skeleton className="h-6 w-24 mb-3" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}