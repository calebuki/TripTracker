import type {
  CreateMomentInput,
  CreateTripInput,
  Moment,
  Trip,
  TripRecord,
  TripTraceUser,
  UpdateMomentInput,
  UpdateTripSettingsInput,
} from "@/types/triptrace";

export interface TripRepository {
  mode: "demo" | "supabase";
  getSessionUser(): Promise<TripTraceUser | null>;
  signInWithEmail(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  createTrip(input: CreateTripInput): Promise<Trip>;
  getActiveTripForCurrentUser(): Promise<Trip | null>;
  getLatestOwnedTripForCurrentUser(): Promise<Trip | null>;
  listTripsForCurrentUser(): Promise<Trip[]>;
  getTripById(tripId: string): Promise<TripRecord | null>;
  getTripByShareSlug(shareSlug: string): Promise<TripRecord | null>;
  getTripByShareCode(shareCode: string): Promise<TripRecord | null>;
  getShareSlugByCode(shareCode: string): Promise<string | null>;
  createMoment(input: CreateMomentInput): Promise<Moment>;
  updateMoment(momentId: string, input: UpdateMomentInput): Promise<Moment>;
  updateMomentVisibility(
    momentId: string,
    visibility: Moment["visibility"],
  ): Promise<void>;
  deleteMoment(momentId: string): Promise<void>;
  updateTripSettings(
    tripId: string,
    input: UpdateTripSettingsInput,
  ): Promise<Trip>;
}
