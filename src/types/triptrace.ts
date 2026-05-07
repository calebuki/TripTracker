export type TripPrivacyMode = "private_link" | "invite_only";
export type TripLocationPrivacyMode = "exact" | "delayed";
export type MomentType = "photo" | "thought";
export type MomentVisibility = "visible" | "hidden";
export type LocationSource = "exif" | "browser_gps" | "manual" | "none";
export type RouteRole = "owner" | "viewer";

export interface TripTraceUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  timezone: string;
  shareSlug: string;
  shareCode: string;
  viewerPasscodeHash: string | null;
  privacyMode: TripPrivacyMode;
  locationPrivacyMode: TripLocationPrivacyMode;
  publishDelayHours: number;
  coverLocationName: string | null;
  coverLatitude: number | null;
  coverLongitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Moment {
  id: string;
  tripId: string;
  authorId: string;
  type: MomentType;
  caption: string | null;
  thoughtText: string | null;
  imageUrl: string | null;
  imageStoragePath: string | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  locationSource: LocationSource;
  accuracyMeters: number | null;
  takenAt: string | null;
  postedAt: string;
  timezone: string;
  visibility: MomentVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface TripRecord {
  trip: Trip;
  moments: Moment[];
}

export interface CreateTripInput {
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  timezone: string;
  coverLocationName?: string | null;
  coverLatitude?: number | null;
  coverLongitude?: number | null;
  privacyMode: TripPrivacyMode;
  passcode?: string | null;
  locationPrivacyMode: TripLocationPrivacyMode;
  publishDelayHours: number;
}

export interface UpdateTripSettingsInput {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  timezone?: string;
  coverLocationName?: string | null;
  privacyMode?: TripPrivacyMode;
  passcode?: string | null;
  locationPrivacyMode?: TripLocationPrivacyMode;
  publishDelayHours?: number;
}

export interface CreateMomentInput {
  tripId: string;
  type: MomentType;
  caption?: string | null;
  thoughtText?: string | null;
  file?: File | null;
  imagePreviewUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
  locationSource: LocationSource;
  accuracyMeters?: number | null;
  takenAt?: string | null;
  timezone: string;
}

export interface UpdateMomentInput {
  caption?: string | null;
  thoughtText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
  locationSource?: LocationSource;
  accuracyMeters?: number | null;
  takenAt?: string | null;
}

export interface LocationDraft {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  placeName?: string | null;
  locationSource: LocationSource;
}

export interface DayOption {
  kind: "today" | "yesterday" | "all" | "date";
  label: string;
  value?: string;
}

export interface DayFilter {
  kind: DayOption["kind"];
  value?: string;
}
