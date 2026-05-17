import type {
  CreateMomentCommentInput,
  CreateMomentInput,
  CreateTripInput,
  Moment,
  MomentComment,
  Trip,
  TripRecord,
  CrumbsUser,
  UpdateMomentInput,
  UpdateTripSettingsInput,
} from "@/types/crumbs";

export interface TripRepository {
  mode: "demo" | "supabase";
  getSessionUser(): Promise<CrumbsUser | null>;
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
  listMomentComments(momentId: string): Promise<MomentComment[]>;
  createMomentComment(input: CreateMomentCommentInput): Promise<MomentComment>;
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
