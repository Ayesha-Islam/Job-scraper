"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search jobs by title, company, or keywords...",
  value = "",
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onSearch(searchValue.trim());
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchValue]);

  const handleClear = () => {
    setSearchValue("");
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />

      <Input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-11 pr-11 h-10 text-base border-input focus:border-primary focus:ring-primary"
      />

      {searchValue && (
        <button
          onClick={handleClear}
          className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-accent"
          aria-label="Clear search"
          type="button"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  );
}