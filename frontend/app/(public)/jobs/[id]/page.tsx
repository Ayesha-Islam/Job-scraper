"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Job } from "@/types";
import { getJobById } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  ExternalLink,
  ArrowLeft,
  Share2,
  Bookmark,
} from "lucide-react";
import { formatJobType, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getJobById(jobId);

      if (response.success && response.data) {
        setJob(response.data);
      } else {
        setError(response.error || "Failed to load job details");
      }
    } catch (err) {
      setError("An error occurred while loading job details");
      console.error("Error fetching job details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <JobDetailsSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Job Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "The job you're looking for doesn't exist or has been removed."}
            </p>
            <Link href="/jobs">
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/jobs">
            <Button variant="ghost" className="mb-4 -ml-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {job.title}
              </h1>

              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-medium text-blue-600">
                  {job.company}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location || "Remote"}
                </div>
                {job.salary && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {job.salary}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatRelativeTime(job.createdAt)}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="w-4 h-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>

          <div className="flex sm:hidden gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1 gap-2">
              <Bookmark className="w-4 h-4" />
              Save
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Job Type:</span>
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700"
                  >
                    {formatJobType(job.type)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Source:</span>
                  <Badge variant="outline">{job.source}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                {job.description ? (
                  <div className="prose prose-sm max-w-none">
                    <div
                      className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: job.description }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600 italic">
                    No description available for this job.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full gap-2" size="lg">
                    Apply Now
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>

                <p className="text-xs text-gray-500 text-center mt-3">
                  You will be redirected to the original job posting
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Company</p>
                  <p className="font-medium text-gray-900">{job.company}</p>
                </div>

                {job.location && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <p className="font-medium text-gray-900">{job.location}</p>
                  </div>
                )}

                {job.salary && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Salary</p>
                    <p className="font-medium text-gray-900">{job.salary}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Job Type</p>
                  <p className="font-medium text-gray-900">
                    {formatJobType(job.type)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Posted</p>
                  <p className="font-medium text-gray-900">
                    {formatRelativeTime(job.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-10 w-32 mb-4" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-6 w-1/2 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}