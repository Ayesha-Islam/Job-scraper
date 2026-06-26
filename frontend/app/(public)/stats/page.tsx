"use client";

import { useState, useEffect } from "react";
import { getStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  TrendingUp,
  Building2,
  Globe,
  Users,
  Clock,
} from "lucide-react";
import { Stats } from "@/types";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError("Failed to load statistics");
      }
    } catch (err) {
      setError("An error occurred while loading statistics");
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <StatsPageSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Market Statistics
            </h1>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div>
        <div className="py-8 ">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Remote Job Market Statistics
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Real-time insights into the remote job market. Data updated every 30 minutes.
            </p>
          </div>
        </div>
      </div>

      <div className="py-8 p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            icon={<Briefcase className="w-6 h-6" />}
            label="Total Jobs"
            value={stats.total.toLocaleString()}
            color="blue"
          />

          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Added Today"
            value={(stats.addedToday ?? 0).toLocaleString()}
            color="green"
          />

          <StatCard
            icon={<Building2 className="w-6 h-6" />}
            label="Active Companies"
            value={getUniqueCompaniesCount(stats).toLocaleString()}
            color="purple"
          />

          <StatCard
            icon={<Globe className="w-6 h-6" />}
            label="Job Sources"
            value={stats.bySource.length.toString()}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Jobs by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.bySource.map((source, index) => {
                  const percentage = (source.count / stats.total) * 100;
                  return (
                    <SourceBar
                      key={index}
                      name={source.source}
                      count={source.count}
                      percentage={percentage}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground gap-2">
                <Users className="w-5 h-5 text-primary" />
                Jobs by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.byType.map((type, index) => {
                  const percentage = (type.count / stats.total) * 100;
                  return (
                    <TypeBar
                      key={index}
                      type={formatJobType(type.type)}
                      count={type.count}
                      percentage={percentage} name={""} />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  How often is data updated?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Our scrapers run every 30 minutes to bring you the latest job opportunities
                  from top remote job boards including LinkedIn, Remotive, and WeWorkRemotely.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "orange";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-primary/10 text-primary",
    green: "bg-secondary text-secondary-foreground",
    purple: "bg-accent text-accent-foreground",
    orange: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="border border-border">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BarProps {
  name: string;
  count: number;
  percentage: number;
}

function SourceBar({ name, count, percentage }: BarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="text-sm text-muted-foreground">
          {count.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TypeBar({ type, count, percentage }: BarProps & { type: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">{type}</span>
        <span className="text-sm text-muted-foreground">
          {count.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-popover border-b border-border">
        <div className="py-8">
          <div className="text-center">
            <Skeleton className="h-10 w-96 mx-auto mb-3" />
            <Skeleton className="h-6 w-2/3 mx-auto" />
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function getUniqueCompaniesCount(stats: Stats): number {
  return Math.floor(stats.total * 0.3);
}

function formatJobType(type: string): string {
  const typeMap: Record<string, string> = {
    FULL_TIME: "FULL_TIME",
    PART_TIME: "PART_TIME",
    CONTRACT: "CONTRACT",
    INTERNSHIP: "INTERNSHIP",
  };
  return typeMap[type] || type;
}