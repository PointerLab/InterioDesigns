import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconChat, IconMail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { queryKeys } from "@/lib/queries";
import type { Estimate } from "@/lib/types";

interface ShareDialogProps {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Turn a read-only link to the estimate on or off, and pass it on. */
const ShareDialog = ({ estimate, open, onOpenChange }: ShareDialogProps) => {
  const queryClient = useQueryClient();
  const setToken = (share_token: string | null) =>
    queryClient.setQueryData<Estimate>(queryKeys.estimate(estimate.id), (old) => old && { ...old, share_token });

  const share = useMutation({
    mutationFn: () => api.post<{ share_token: string }>(`/estimates/${estimate.id}/share/`),
    onSuccess: ({ share_token }) => setToken(share_token),
    onError: (err) => toast.error(errorMessage(err)),
  });
  const unshare = useMutation({
    mutationFn: () => api.delete(`/estimates/${estimate.id}/share/`),
    onSuccess: () => {
      setToken(null);
      toast.success("Share link turned off");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const link = estimate.share_token ? `${window.location.origin}/shared/${estimate.share_token}` : "";
  const message = `Here's my interior estimate "${estimate.title}" from INTERIO (${formatINR(estimate.total)}): ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link. Select it and copy it instead.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this estimate</DialogTitle>
          <DialogDescription>
            Anyone with the link can see the estimate and its breakdown. Your name and contact details are not shown.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-5">
            <div className="flex gap-2">
              <Input readOnly value={link} aria-label="Share link" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" onClick={copy}>
                Copy
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                  <IconChat /> Send on WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Interior estimate: ${estimate.title}`)}&body=${encodeURIComponent(message)}`}
                >
                  <IconMail /> Email
                </a>
              </Button>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Turning the link off stops it working for everyone.</p>
              <Button variant="ghost" onClick={() => unshare.mutate()} disabled={unshare.isPending}>
                Turn off link
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => share.mutate()} disabled={share.isPending}>
              {share.isPending ? "Creating link..." : "Create share link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
