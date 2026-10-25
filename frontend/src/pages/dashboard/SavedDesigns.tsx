import { Link } from "react-router-dom";
import DesignCard, { DesignGridSkeleton } from "@/components/common/DesignCard";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { useSavedDesigns } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

const SavedDesigns = () => {
  usePageTitle("Saved designs");
  const { data, isLoading, error, refetch } = useSavedDesigns();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Saved designs"
        description="Your shortlist. Show it to your designer during a consultation, or use a look to start an estimate."
        actions={
          <Button asChild variant="outline">
            <Link to="/designs">Browse designs</Link>
          </Button>
        }
      />
      {isLoading ? (
        <DesignGridSkeleton count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the heart on any design in the gallery to add it here."
          action={
            <Button asChild>
              <Link to="/designs">Explore the gallery</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedDesigns;
