import { useState } from 'react';
import { JobType } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export interface FilterOptions {
  jobTypes: JobType[];
  remote: boolean | null;
  salaryRange: string;
  experience: string[];
}

interface FilterPanelProps {
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'FULL_TIME',  label: 'Full-time'  },
  { value: 'PART_TIME',  label: 'Part-time'  },
  { value: 'CONTRACT',   label: 'Contract'   },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EXPERIENCE_LEVELS = [
  'Entry Level',
  'Mid Level',
  'Senior Level',
  'Lead',
  'Executive',
];

const SALARY_RANGES = [
  { value: '0-50k',     label: '$0 – $50k'    },
  { value: '50k-100k',  label: '$50k – $100k'  },
  { value: '100k-150k', label: '$100k – $150k' },
  { value: '150k-200k', label: '$150k – $200k' },
  { value: '200k+',     label: '$200k+'        },
];

const EMPTY_FILTERS: FilterOptions = {
  jobTypes:    [],
  remote:      null,
  salaryRange: '',
  experience:  [],
};

export function FilterPanel({ onClose, onApplyFilters }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterOptions>(EMPTY_FILTERS);

  const toggleJobType = (type: JobType) =>
    setFilters(prev => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter(t => t !== type)
        : [...prev.jobTypes, type],
    }));

  const toggleExperience = (level: string) =>
    setFilters(prev => ({
      ...prev,
      experience: prev.experience.includes(level)
        ? prev.experience.filter(l => l !== level)
        : [...prev.experience, level],
    }));

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    onApplyFilters(EMPTY_FILTERS);
  };

  const activeFilterCount =
    filters.jobTypes.length +
    filters.experience.length +
    (filters.remote !== null ? 1 : 0) +
    (filters.salaryRange ? 1 : 0);

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0B1421] border-white/10 text-white">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-white">
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-white/10 text-white border border-white/20 text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Refine your job search with these filters
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Job Type
            </Label>
            <div className="space-y-2.5">
              {JOB_TYPES.map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2.5">
                  <Checkbox
                    id={`job-type-${value}`}
                    checked={filters.jobTypes.includes(value)}
                    onCheckedChange={() => toggleJobType(value)}
                    className="border-white/30 data-[state=checked]:bg-[#15202B] data-[state=checked]:border-white/40"
                  />
                  <Label
                    htmlFor={`job-type-${value}`}
                    className="text-sm font-normal text-gray-300 cursor-pointer hover:text-white transition-colors"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Work Location
            </Label>
            <RadioGroup
              value={
                filters.remote === null ? 'any'
                : filters.remote ? 'remote'
                : 'onsite'
              }
              onValueChange={(value) =>
                setFilters(prev => ({
                  ...prev,
                  remote: value === 'any' ? null : value === 'remote',
                }))
              }
              className="space-y-2.5"
            >
              {[
                { value: 'any',    label: 'All Locations' },
                { value: 'remote', label: 'Remote Only'   },
                { value: 'onsite', label: 'On-site Only'  },
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2.5">
                  <RadioGroupItem
                    value={value}
                    id={`location-${value}`}
                    className="border-white/30 text-white"
                  />
                  <Label
                    htmlFor={`location-${value}`}
                    className="text-sm font-normal text-gray-300 cursor-pointer hover:text-white transition-colors"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Salary Range
            </Label>
            <Select
              value={filters.salaryRange || 'any'}
              onValueChange={(value) =>
                setFilters(prev => ({
                  ...prev,
                  salaryRange: value === 'any' ? '' : value,
                }))
              }
            >
              <SelectTrigger className="bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 focus:ring-white/20">
                <SelectValue placeholder="Select salary range" />
              </SelectTrigger>
              <SelectContent className="bg-[#16181d] border-white/10 text-gray-300">
                <SelectItem value="any" className="focus:bg-white/10 focus:text-white">
                  Any
                </SelectItem>
                {SALARY_RANGES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="focus:bg-white/10 focus:text-white">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Experience Level
            </Label>
            <div className="space-y-2.5">
              {EXPERIENCE_LEVELS.map((level) => (
                <div key={level} className="flex items-center space-x-2.5">
                  <Checkbox
                    id={`experience-${level}`}
                    checked={filters.experience.includes(level)}
                    onCheckedChange={() => toggleExperience(level)}
                    className="border-white/30 data-[state=checked]:bg-[#15202B] data-[state=checked]:border-white/40"
                  />
                  <Label
                    htmlFor={`experience-${level}`}
                    className="text-sm font-normal text-gray-300 cursor-pointer hover:text-white transition-colors"
                  >
                    {level}
                  </Label>
                </div>
              ))}
            </div>
          </div>

        </div>

        <SheetFooter className="gap-2 pt-2 border-t border-white/10">
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto bg-transparent border-white/20 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Reset All
          </Button>
          <Button
            onClick={handleApply}
            className="w-full sm:w-auto bg-[#15202B] text-white border border-white/20 hover:bg-[#1e2d3d] transition-colors"
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}