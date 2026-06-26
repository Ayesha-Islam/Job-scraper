import { useState } from 'react';
import { JobType } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Briefcase, MapPin, DollarSign, BarChart2, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
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
  { value: '0-50k', label: '$0 – $50k' },
  { value: '50k-100k', label: '$50k – $100k' },
  { value: '100k-150k', label: '$100k – $150k' },
  { value: '150k-200k', label: '$150k – $200k' },
  { value: '200k+', label: '$200k+' },
];

const EMPTY_FILTERS: FilterOptions = {
  jobTypes: [],
  remote: null,
  salaryRange: '',
  experience: [],
};

type SectionKey = 'jobType' | 'location' | 'salary' | 'experience';

interface AccordionSectionProps {
  id: SectionKey;
  label: string;
  icon: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: (id: SectionKey) => void;
  children: React.ReactNode;
}

function AccordionSection({
  id,
  label,
  icon,
  count,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left group"
      >
        <span className="flex items-center gap-2.5 text-sm text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </span>
        <span className="flex items-center gap-2">
          {count !== undefined && count > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-0 rounded-full"
            >
              {count}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </span>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-5 pb-4 pt-1 bg-muted/10 space-y-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FilterPanel({ onClose, onApplyFilters }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterOptions>(EMPTY_FILTERS);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(['jobType', 'location'])
  );

  const toggleSection = (id: SectionKey) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  const locationLabel =
    filters.remote === null ? null
      : filters.remote ? 'Remote only'
        : 'On-site only';

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xs flex flex-col p-0 overflow-hidden bg-background border-border text-foreground">

        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-0 rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </SheetTitle>
            {activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset all
              </button>
            )}
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">
            Refine your job search with these filters
          </SheetDescription>
        </SheetHeader>

        {/* Accordion body */}
        <div className="flex-1 overflow-y-auto divide-y-0">

          <AccordionSection
            id="jobType"
            label="Job type"
            icon={<Briefcase className="h-3.5 w-3.5" />}
            count={filters.jobTypes.length}
            isOpen={openSections.has('jobType')}
            onToggle={toggleSection}
          >
            {JOB_TYPES.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`jt-${value}`}
                  checked={filters.jobTypes.includes(value)}
                  onCheckedChange={() => toggleJobType(value)}
                  className="h-3.5 w-3.5 rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor={`jt-${value}`}
                  className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  {label}
                </Label>
              </div>
            ))}
          </AccordionSection>

          <AccordionSection
            id="salary"
            label="Salary range"
            icon={<DollarSign className="h-3.5 w-3.5" />}
            count={filters.salaryRange ? 1 : 0}
            isOpen={openSections.has('salary')}
            onToggle={toggleSection}
          >
            <RadioGroup
              value={filters.salaryRange || 'any'}
              onValueChange={value =>
                setFilters(prev => ({
                  ...prev,
                  salaryRange: value === 'any' ? '' : value,
                }))
              }
              className="space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <RadioGroupItem value="any" id="sal-any" className="h-3.5 w-3.5 border-border/60 text-primary" />
                <Label htmlFor="sal-any" className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Any
                </Label>
              </div>
              {SALARY_RANGES.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2.5">
                  <RadioGroupItem value={value} id={`sal-${value}`} className="h-3.5 w-3.5 border-border/60 text-primary" />
                  <Label htmlFor={`sal-${value}`} className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </AccordionSection>

          <AccordionSection
            id="experience"
            label="Experience level"
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            count={filters.experience.length}
            isOpen={openSections.has('experience')}
            onToggle={toggleSection}
          >
            {EXPERIENCE_LEVELS.map(level => (
              <div key={level} className="flex items-center gap-2.5">
                <Checkbox
                  id={`exp-${level}`}
                  checked={filters.experience.includes(level)}
                  onCheckedChange={() => toggleExperience(level)}
                  className="h-3.5 w-3.5 rounded border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor={`exp-${level}`}
                  className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  {level}
                </Label>
              </div>
            ))}
          </AccordionSection>

        </div>

        {/* Active filter summary */}
        {activeFilterCount > 0 && (
          <div className="px-5 py-3 border-t border-border/40 shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Active</p>
            <div className="flex flex-wrap gap-1.5">
              {filters.jobTypes.map(t => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 bg-muted/60 text-foreground border-0 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleJobType(t)}
                >
                  {JOB_TYPES.find(j => j.value === t)?.label} ×
                </Badge>
              ))}
              {locationLabel && (
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 bg-muted/60 text-foreground border-0 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setFilters(p => ({ ...p, remote: null }))}
                >
                  {locationLabel} ×
                </Badge>
              )}
              {filters.salaryRange && (
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 bg-muted/60 text-foreground border-0 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setFilters(p => ({ ...p, salaryRange: '' }))}
                >
                  {SALARY_RANGES.find(r => r.value === filters.salaryRange)?.label} ×
                </Badge>
              )}
              {filters.experience.map(level => (
                <Badge
                  key={level}
                  variant="secondary"
                  className="text-[11px] px-2 py-0.5 bg-muted/60 text-foreground border-0 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleExperience(level)}
                >
                  {level} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <SheetFooter className="px-5 py-4 border-t border-border/40 shrink-0 flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-9 text-sm bg-transparent border-border/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
          >
            Reset all
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 h-9 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 opacity-75">({activeFilterCount})</span>
            )}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}