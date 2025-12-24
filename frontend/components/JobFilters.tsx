"use client";

import { JobFilters as JobFiltersType } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface JobFiltersProps {
  filters: JobFiltersType;
  onFilterChange: (filters: JobFiltersType) => void;
  onClearFilters: () => void;
}

export default function JobFilters({
  filters,
  onFilterChange,
  onClearFilters,
}: JobFiltersProps) {
  const jobTypes = [
    { value: "ALL", label: "All Types" },
    { value: "FULL_TIME", label: "Full-time" },
    { value: "PART_TIME", label: "Part-time" },
    { value: "CONTRACT", label: "Contract" },
    { value: "INTERNSHIP", label: "Internship" },
  ];

  const sortOptions = [
    { value: "recent", label: "Most Recent" },
    { value: "oldest", label: "Oldest First" },
  ];

  const handleTypeChange = (type: string) => {
    onFilterChange({ ...filters, type: type as any });
  };

  const handleLocationChange = (location: string) => {
    onFilterChange({ ...filters, location });
  };

  const handleSortChange = (sortBy: string) => {
    onFilterChange({ ...filters, sortBy: sortBy as any });
  };

  const hasActiveFilters =
    filters.type !== "ALL" || filters.location || filters.sortBy !== "recent";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs text-gray-600 hover:text-gray-900 px-2"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-gray-900">Job Type</Label>
        <div className="space-y-2">
          {jobTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                name="jobType"
                value={type.value}
                checked={filters.type === type.value}
                onChange={() => handleTypeChange(type.value)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200"></div>

      <div className="space-y-2.5">
        <Label htmlFor="location" className="text-sm font-semibold text-gray-900">
          Location
        </Label>
        <Input
          id="location"
          type="text"
          placeholder="e.g., Remote, USA"
          value={filters.location || ""}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full h-9 text-sm"
        />
      </div>

      <div className="border-t border-gray-200"></div>

      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-gray-900">Sort By</Label>
        <div className="space-y-2">
          {sortOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <input
                type="radio"
                name="sortBy"
                value={option.value}
                checked={filters.sortBy === option.value}
                onChange={() => handleSortChange(option.value)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary focus:ring-2 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2.5">
            Active Filters:
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.type !== "ALL" && (
              <FilterChip
                label={jobTypes.find((t) => t.value === filters.type)?.label!}
                onRemove={() => handleTypeChange("ALL")}
              />
            )}
            {filters.location && (
              <FilterChip
                label={filters.location}
                onRemove={() => handleLocationChange("")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
        type="button"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}