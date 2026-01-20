"use client";

import { useState, useEffect } from "react";
import { Job, JobFilters as JobFiltersType } from "@/types";
import { getJobs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import JobFilters from "@/components/JobFilters";
import JobGrid from "@/components/JobGrid";
import Pagination from "@/components/Pagination";
import SearchBar from "@/components/SearchBar";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState<JobFiltersType>({
    search: "",
    type: "ALL",
    location: "",
    sortBy: "recent",
  });

  useEffect(() => {
    fetchJobs();
  }, [filters, currentPage]);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getJobs({
        page: currentPage,
        limit: 21,
        search: filters.search || undefined,
        type: filters.type !== "ALL" ? filters.type : undefined,
        location: filters.location || undefined,
        sortBy: filters.sortBy,
      });

      if (response.success && response.data) {
        setJobs(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalJobs(response.data.pagination.total);
      }
    } catch (err) {
      setError("Failed to load jobs. Please try again.");
      console.error("Error fetching jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: JobFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      type: "ALL",
      location: "",
      sortBy: "recent",
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    filters.type !== "ALL" || 
    filters.location !== "" || 
    filters.search !== "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5">
            Remote Job Opportunities
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isLoading ? (
              "Loading jobs..."
            ) : (
              <>
                {totalJobs.toLocaleString()} remote {totalJobs === 1 ? "job" : "jobs"} available
              </>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <SearchBar onSearch={handleSearch} value={filters.search} />
        </div>

        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <p className="text-sm text-gray-600">
            {!isLoading && jobs.length > 0 && (
              <>
                Showing {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalJobs)} of {totalJobs} jobs
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all filters
              </Button>
            )}
            {filters.search && (
              <p className="text-sm text-gray-600 hidden sm:block">
                Search: <strong>"{filters.search}"</strong>
              </p>
            )}
          </div>
        </div>

        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showMobileFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside
            className={`
              w-full lg:w-64 flex-shrink-0
              ${showMobileFilters ? "block" : "hidden lg:block"}
            `}
          >
            <div className="bg-white rounded-lg border border-gray-200 p-5 lg:sticky lg:top-6">
              <JobFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
                <Button
                  variant="outline"
                  onClick={fetchJobs}
                  className="mt-3"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            )}

            {!isLoading && jobs.length === 0 && !error && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600 mb-2">No jobs found matching your criteria</p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  size="sm"
                >
                  Clear filters
                </Button>
              </div>
            )}

            <JobGrid jobs={jobs} isLoading={isLoading} />

            {!isLoading && !error && jobs.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}