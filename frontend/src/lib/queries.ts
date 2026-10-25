import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { useAuth } from "./auth";
import type { Catalog, Consultation, Design, DesignListResponse, Estimate, EstimateSummary } from "./types";

export const queryKeys = {
  catalog: ["catalog"] as const,
  designs: (params: string) => ["designs", params] as const,
  design: (slug: string) => ["design", slug] as const,
  savedDesigns: ["saved-designs"] as const,
  estimates: ["estimates"] as const,
  estimate: (id: number) => ["estimate", id] as const,
  consultations: ["consultations"] as const,
};

export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: () => api.get<Catalog>("/catalog/"),
    staleTime: 5 * 60_000,
  });
}

export function useDesigns(params: URLSearchParams | string = "") {
  const query = params.toString();
  return useQuery({
    queryKey: queryKeys.designs(query),
    queryFn: () => api.get<DesignListResponse>(`/designs/${query ? `?${query}` : ""}`),
  });
}

export function useSavedDesigns(enabled = true) {
  return useQuery({
    queryKey: queryKeys.savedDesigns,
    queryFn: () => api.get<Design[]>("/designs/saved/"),
    enabled,
  });
}

export function useEstimates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.estimates,
    queryFn: () => api.get<EstimateSummary[]>("/estimates/"),
    enabled,
  });
}

export function useEstimate(id: number | null) {
  return useQuery({
    queryKey: queryKeys.estimate(id ?? 0),
    queryFn: () => api.get<Estimate>(`/estimates/${id}/`),
    enabled: Boolean(id),
  });
}

export function useConsultations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.consultations,
    queryFn: () => api.get<Consultation[]>("/consultations/"),
    enabled,
  });
}

/** Save or unsave a design. Sends anonymous users to sign in first. */
export function useToggleSave() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (design: Design) =>
      design.is_saved
        ? api.delete<{ is_saved: boolean }>(`/designs/${design.slug}/save/`)
        : api.post<{ is_saved: boolean }>(`/designs/${design.slug}/save/`),
    onSuccess: (data, design) => {
      toast.success(data.is_saved ? `Saved "${design.title}"` : `Removed "${design.title}" from saved designs`);
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.design(design.slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedDesigns });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return {
    isPending: mutation.isPending,
    toggle(design: Design) {
      if (!user) {
        toast("Sign in to save designs", { description: "Your saved designs appear in your dashboard." });
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      mutation.mutate(design);
    },
  };
}
