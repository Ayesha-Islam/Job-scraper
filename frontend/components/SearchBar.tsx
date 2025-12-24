"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { debounce } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search jobs by title, company, or keywords...",
  defaultValue = "",
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(defaultValue);

  useEffect(() => {
    const debouncedSearch = debounce((value: string) => {
      onSearch(value);
    }, 500);

    if (searchValue !== defaultValue) {
      debouncedSearch(searchValue);
    }
  }, [searchValue, onSearch, defaultValue]);

  const handleClear = () => {
    setSearchValue("");
    onSearch("");
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />

      <Input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-11 pr-11 h-10 text-base border-gray-300 focus:border-primary focus:ring-primary"
      />

      {searchValue && (
        <button
          onClick={handleClear}
          className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          aria-label="Clear search"
          type="button"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  );
}