export type PropertyType = "residential" | "commercial" | "office";
export type ProjectType = "new" | "renovation";
export type Scope = "full" | "kitchen" | "wardrobe";
export type PackageTier = "basic" | "standard" | "premium";

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  is_staff: boolean;
  date_joined: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface Package {
  id: number;
  tier: PackageTier;
  title: string;
  tagline: string;
  description: string;
  rate_per_sqft: number;
  furniture_multiplier: number;
  inclusions: string[];
  base_timeline_weeks: number;
  warranty_years: number;
}

export interface FurnitureItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price_type: "unit" | "sqft";
  unit_price: number;
  compatible_packages: PackageTier[];
  property_types: PropertyType[];
  is_ready_made: boolean;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  category: "civil" | "electrical" | "plumbing";
  price_type: "unit" | "sqft";
  unit_price: number;
  enabled_for_project_types: ProjectType[];
}

export interface City {
  id: number;
  city: string;
  multiplier: number;
}

export interface SpacePreset {
  id: string;
  label: string;
  area: number;
  rooms: number;
}

export interface Catalog {
  packages: Package[];
  furniture_items: FurnitureItem[];
  services: Service[];
  cities: City[];
  space_presets: Record<PropertyType, SpacePreset[]>;
  scope_presets: Record<Scope, string>;
}

export interface Selection {
  id: number;
  quantity: number;
}

export interface EstimateInput {
  title?: string;
  property_type: PropertyType;
  property_subtype: string;
  project_type: ProjectType;
  scope: Scope;
  area_sqft: number;
  room_count: number;
  package_tier: PackageTier;
  city: string;
  furniture: Selection[];
  services: Selection[];
}

export interface EstimateLine {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: "unit" | "sq.ft";
  unit_price: number;
  amount: number;
}

export interface EstimateResult {
  currency: "INR";
  package: { tier: PackageTier; title: string; rate_per_sqft: number; furniture_multiplier: number };
  area_sqft: number;
  room_count: number;
  base: { label: string; rate: number; area: number; amount: number };
  furniture: { items: EstimateLine[]; amount: number };
  services: { items: EstimateLine[]; amount: number };
  subtotal: number;
  location: { city: string; multiplier: number; adjustment: number };
  gst: { rate: number; amount: number };
  total: number;
  range: { low: number; high: number };
  categories: { key: string; label: string; amount: number }[];
  timeline: { weeks: number; phases: { name: string; weeks: number }[] };
  notes: string[];
  disclaimer: string;
}

export interface EstimateSummary {
  id: number;
  reference: string;
  title: string;
  property_type: PropertyType;
  property_type_label: string;
  property_subtype: string;
  project_type: ProjectType;
  project_type_label: string;
  scope: Scope;
  scope_label: string;
  area_sqft: number;
  room_count: number;
  package_tier: PackageTier;
  package_title: string;
  city: string;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface Estimate extends EstimateSummary {
  selections: { furniture: Selection[]; services: Selection[] };
  result: EstimateResult;
}

export interface Option {
  value: string;
  label: string;
}

export interface Design {
  id: number;
  slug: string;
  title: string;
  category: PropertyType;
  category_label: string;
  room: string;
  room_label: string;
  style: string;
  style_label: string;
  description: string;
  highlights: string[];
  image: string;
  budget_min: number;
  budget_max: number;
  package_tier: PackageTier;
  is_featured: boolean;
  is_saved: boolean;
}

export interface DesignListResponse {
  results: Design[];
  filters: { categories: Option[]; rooms: Option[]; styles: Option[] };
}

export type ConsultationStatus = "requested" | "confirmed" | "completed" | "cancelled";
export type ConsultationMode = "studio" | "video" | "site";

export interface Consultation {
  id: number;
  estimate: number | null;
  estimate_reference: string | null;
  estimate_title: string | null;
  date: string;
  time_slot: string;
  mode: ConsultationMode;
  mode_label: string;
  address: string;
  notes: string;
  status: ConsultationStatus;
  status_label: string;
  staff_note: string;
  created_at: string;
}

export interface SlotAvailability {
  date: string;
  closed_reason: string | null;
  slots: { time: string; available: boolean }[];
}

export interface Customer {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export type StaffEstimate = EstimateSummary & Customer;
export type StaffEstimateDetail = Estimate & Customer;

export interface StaffConsultation extends Customer {
  id: number;
  estimate: number | null;
  estimate_reference: string | null;
  estimate_total: number | null;
  date: string;
  time_slot: string;
  mode: ConsultationMode;
  mode_label: string;
  address: string;
  notes: string;
  status: ConsultationStatus;
  status_label: string;
  staff_note: string;
  created_at: string;
}

export interface StaffMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export interface StaffOverview {
  customers: number;
  new_customers_30d: number;
  estimates: number;
  estimates_30d: number;
  pipeline_value_30d: number;
  consultations: Record<ConsultationStatus, number>;
  open_messages: number;
  by_package: { package: string; count: number; value: number }[];
  by_city: { city: string; count: number }[];
  upcoming_consultations: StaffConsultation[];
  latest_estimates: StaffEstimate[];
}
