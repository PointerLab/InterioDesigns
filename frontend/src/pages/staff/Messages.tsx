import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { StaffMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const FILTERS = [
  { value: "false", label: "Open" },
  { value: "true", label: "Resolved" },
  { value: "", label: "All" },
];

const Messages = () => {
  usePageTitle("Messages");
  const queryClient = useQueryClient();
  const [resolved, setResolved] = useState("false");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff", "messages", resolved],
    queryFn: () => api.get<StaffMessage[]>(`/staff/messages/${resolved ? `?resolved=${resolved}` : ""}`),
  });

  const toggle = useMutation({
    mutationFn: (message: StaffMessage) =>
      api.patch<StaffMessage>(`/staff/messages/${message.id}/`, { is_resolved: !message.is_resolved }),
    onSuccess: (message) => {
      toast.success(message.is_resolved ? "Marked as resolved" : "Reopened");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Enquiries from the contact form." />

      <div className="flex gap-1">
        {FILTERS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setResolved(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              resolved === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title={resolved === "false" ? "Inbox zero" : "No messages"}
          description="New enquiries will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((message) => (
            <li key={message.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {message.name}
                    {message.is_resolved ? (
                      <Badge variant="neutral">Resolved</Badge>
                    ) : (
                      <Badge variant="warning">Open</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {message.email}
                    {message.phone && ` · ${message.phone}`} · {formatDate(message.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${message.email}?subject=${encodeURIComponent("Re: your message to INTERIO")}`}>
                      Reply
                    </a>
                  </Button>
                  <Button
                    variant={message.is_resolved ? "ghost" : "dark"}
                    size="sm"
                    onClick={() => toggle.mutate(message)}
                    disabled={toggle.isPending}
                  >
                    {message.is_resolved ? "Reopen" : "Mark resolved"}
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Messages;
