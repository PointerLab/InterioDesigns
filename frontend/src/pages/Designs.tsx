import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DesignCard, { DesignGridSkeleton } from "@/components/common/DesignCard";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { IconSearch } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDesigns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const ALL = "all";

const Designs = () => {
  usePageTitle("Design gallery");
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const { data, isLoading, error, refetch } = useDesigns(params);

  // Debounce the search box into the URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((params.get("q") ?? "") === search.trim()) return;
      setFilter("q", search.trim());
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const filters = data?.filters;
  const category = params.get("category") ?? ALL;
  const hasFilters = ["category", "room", "style", "q"].some((key) => params.get(key));

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Design gallery"
        title="Find a look you love"
        description="Browse homes, offices and commercial spaces by room and style. Save the ones you like and use them to start an estimate."
      />

      <div className="mt-8 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Category">
          {[{ value: ALL, label: "All spaces" }, ...(filters?.categories ?? [])].map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={category === option.value}
              onClick={() => setFilter("category", option.value)}
              className={cn(
                "whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors",
                category === option.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={params.get("room") ?? ALL} onValueChange={(v) => setFilter("room", v)}>
            <SelectTrigger className="sm:w-44" aria-label="Room">
              <SelectValue>
                {filters?.rooms.find((r) => r.value === params.get("room"))?.label ?? "Any room"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any room</SelectItem>
              {filters?.rooms.map((room) => (
                <SelectItem key={room.value} value={room.value}>
                  {room.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={params.get("style") ?? ALL} onValueChange={(v) => setFilter("style", v)}>
            <SelectTrigger className="sm:w-40" aria-label="Style">
              <SelectValue>
                {filters?.styles.find((st) => st.value === params.get("style"))?.label ?? "Any style"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any style</SelectItem>
              {filters?.styles.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative col-span-2 sm:w-56">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs"
              className="pl-9"
              aria-label="Search designs"
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <DesignGridSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data && data.results.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {data.results.length} {data.results.length === 1 ? "design" : "designs"}
            </p>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {data.results.map((design) => (
                <DesignCard key={design.id} design={design} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No designs match those filters"
            description="Try a different room or style, or clear the filters to see everything."
            action={
              hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setParams({}, { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}
      </div>
    </div>
  );
};

export default Designs;
