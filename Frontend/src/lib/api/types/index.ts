/** Backend user object (UserSerializer) */
export interface ApiUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_property_owner: boolean;
  phone: string;
  whatsapp_number: string;
  address: string;
  avatar: string | null;
  account_type: string | null;
  email_verified: boolean;
}

export interface AuthTokenResponse {
  token: string;
  user: ApiUser;
}

export interface OtpInitResponse {
  success?: boolean;
  message?: string;
  otp?: string;
}

export interface ApiPropertyImage {
  id: number;
  image: string;
}

export interface ApiPropertyVideoProcessingStatus {
  id: number;
  video_processing_status?: "processing" | "ready" | "failed" | null;
  property_video_url?: string | null;
  video_thumbnail_url?: string | null;
}

export interface ApiProperty {
  id: number;
  property_for: "rent" | "sell";
  property_ownership?: string;
  contact_name?: string;
  whatsapp_number?: string;
  phone_number?: string;
  email?: string;
  state?: number;
  state_name?: string;
  district?: number;
  district_name?: string;
  city?: number;
  city_name?: string;
  title: string;
  slug?: string;
  price: string | number;
  property_type?: number;
  property_type_name?: string;
  latitude?: string | number;
  longitude?: string | number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  area_unit?: string;
  description?: string;
  features?: number[];
  feature_names?: string[];
  feature_details?: { id: number; name: string }[];
  google_maps_url?: string;
  google_embedded_map_link?: string;
  youtube_video_link?: string;
  property_video_url?: string | null;
  video_thumbnail_url?: string | null;
  video_processing_status?: "processing" | "ready" | "failed" | null;
  nearby_places_data?: { name: string; distance: number }[];
  built_year?: string;
  furnishing?: string;
  project_status?: string;
  floors?: string;
  sighting?: string;
  area_cent?: number;
  parking_spaces?: number;
  is_featured?: boolean;
  moderation_status?: "pending" | "approved" | "rejected";
  moderated_at?: string | null;
  moderated_by_username?: string | null;
  created_by?: number;
  images?: ApiPropertyImage[];
  created_at?: string;
  updated_at?: string;
}

export type FeedItem =
  | { type: "property"; data: ApiProperty }
  | { type: "ad"; data: ApiAdvertisement };

export interface ApiAdvertisement {
  id: number;
  title: string;
  subtitle?: string;
  ad_type?: "property" | "generic";
  media_type: "image" | "video";
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  video_file_url?: string | null;
  video_thumbnail_url?: string | null;
  // Admin (write) serializer returns the raw FileField values under these keys.
  desktop_image?: string | null;
  mobile_image?: string | null;
  video_file?: string | null;
  video_thumbnail?: string | null;
  video_processing_status?: "processing" | "ready" | "failed";
  redirect_type?: "property" | "external_url";
  linked_property?: number | null;
  linked_property_slug?: string | null;
  external_url?: string;
  priority?: number;
  is_active?: boolean;
  placements?: string[];
  state?: number;
  district?: number;
  city?: number;
  city_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  radius_km?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
}

export interface ApiPropertyType {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  has_bedrooms?: boolean;
  has_bathrooms?: boolean;
  has_built_year?: boolean;
  has_parking_spaces?: boolean;
  has_project_status?: boolean;
  has_floors?: boolean;
  has_sighting?: boolean;
  has_area_both?: boolean;
  has_furnishing?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiFeature {
  id: number;
  name: string;
}

export interface ApiState {
  id: number;
  name: string;
  country?: string;
}

export interface ApiDistrict {
  id: number;
  name: string;
  state: number;
  state_name?: string;
}

export interface ApiCity {
  id: number;
  name: string;
  district: number;
  district_name?: string;
}

export interface ApiLocationResult {
  id?: number;
  label?: string;
  location_name?: string;
  city?: string;
  district?: string;
  state?: string;
  latitude?: number | string;
  longitude?: number | string;
}

export interface ApiTestimonial {
  id: number;
  client_name: string;
  client_role?: string;
  testimonial_text: string;
  rating?: number;
  avatar?: string | null;
  initial?: string;
  is_published?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiTestimonialsSection {
  tag?: string;
  heading?: string;
  description?: string;
}

export interface ApiTestimonialsListResponse {
  section?: ApiTestimonialsSection;
  total_count?: number;
  current_page?: number;
  total_pages?: number;
  results: ApiTestimonial[];
}

export interface ApiHeroBanner {
  id: number;
  image?: string;
  created_at?: string;
}

export interface ApiOfferBanner {
  id: number;
  image?: string;
  created_at?: string;
}

export interface ApiAdminImage {
  id: number;
  title: string;
  image?: string;
  image_url?: string;
}

export interface ApiContact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  phone_number?: string;
  subject?: string;
  message?: string;
  budget_range?: string;
  property?: number | null;
  property_title?: string;
  created_at?: string;
  email_sent?: boolean | null;
  notification_recipients?: string[];
}

export interface ApiSiteSettings {
  id?: number;
  filter_radius?: number;
  ad_inject_after_every_n_properties?: number;
  admin_phone?: string;
  admin_whatsapp?: string;
  company_email?: string;
  company_address?: string;
  testimonials_section_tag?: string;
  testimonials_section_heading?: string;
  testimonials_section_description?: string;
}

export interface ApiCompanyContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  admin_phone?: string;
  admin_whatsapp?: string;
  company_email?: string;
  company_address?: string;
}

export interface ApiMobileAppSettings {
  android_app_version?: string;
  android_force_update?: boolean;
  ios_app_version?: string;
  ios_force_update?: boolean;
}

export interface ApiOwner {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  is_active?: boolean;
  date_joined?: string;
  property_count?: number;
  properties_count?: number;
}
