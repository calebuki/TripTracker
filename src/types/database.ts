export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          timezone: string;
          share_slug: string;
          share_code: string;
          viewer_passcode_hash: string | null;
          privacy_mode: "private_link" | "invite_only";
          location_privacy_mode: "exact" | "delayed";
          publish_delay_hours: number;
          cover_location_name: string | null;
          cover_latitude: number | null;
          cover_longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          timezone?: string;
          share_slug: string;
          share_code: string;
          viewer_passcode_hash?: string | null;
          privacy_mode?: "private_link" | "invite_only";
          location_privacy_mode?: "exact" | "delayed";
          publish_delay_hours?: number;
          cover_location_name?: string | null;
          cover_latitude?: number | null;
          cover_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          timezone?: string;
          share_slug?: string;
          share_code?: string;
          viewer_passcode_hash?: string | null;
          privacy_mode?: "private_link" | "invite_only";
          location_privacy_mode?: "exact" | "delayed";
          publish_delay_hours?: number;
          cover_location_name?: string | null;
          cover_latitude?: number | null;
          cover_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string | null;
          role: "owner" | "viewer";
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id?: string | null;
          role: "owner" | "viewer";
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          user_id?: string | null;
          role?: "owner" | "viewer";
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      moments: {
        Row: {
          id: string;
          trip_id: string;
          author_id: string;
          type: "photo" | "thought";
          caption: string | null;
          thought_text: string | null;
          image_url: string | null;
          image_storage_path: string | null;
          latitude: number | null;
          longitude: number | null;
          place_name: string | null;
          location_source: "exif" | "browser_gps" | "manual" | "none";
          accuracy_meters: number | null;
          taken_at: string | null;
          posted_at: string;
          timezone: string;
          visibility: "visible" | "hidden";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          author_id: string;
          type: "photo" | "thought";
          caption?: string | null;
          thought_text?: string | null;
          image_url?: string | null;
          image_storage_path?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          place_name?: string | null;
          location_source: "exif" | "browser_gps" | "manual" | "none";
          accuracy_meters?: number | null;
          taken_at?: string | null;
          posted_at?: string;
          timezone?: string;
          visibility?: "visible" | "hidden";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          author_id?: string;
          type?: "photo" | "thought";
          caption?: string | null;
          thought_text?: string | null;
          image_url?: string | null;
          image_storage_path?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          place_name?: string | null;
          location_source?: "exif" | "browser_gps" | "manual" | "none";
          accuracy_meters?: number | null;
          taken_at?: string | null;
          posted_at?: string;
          timezone?: string;
          visibility?: "visible" | "hidden";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_watches: {
        Row: {
          trip_id: string;
          user_id: string;
          created_at: string;
          last_viewed_at: string;
        };
        Insert: {
          trip_id: string;
          user_id: string;
          created_at?: string;
          last_viewed_at?: string;
        };
        Update: {
          trip_id?: string;
          user_id?: string;
          created_at?: string;
          last_viewed_at?: string;
        };
        Relationships: [];
      };
      trip_commenters: {
        Row: {
          id: string;
          trip_id: string;
          token_hash: string;
          display_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          token_hash: string;
          display_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          token_hash?: string;
          display_number?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      moment_comments: {
        Row: {
          id: string;
          trip_id: string;
          moment_id: string;
          commenter_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          moment_id: string;
          commenter_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          trip_id?: string;
          moment_id?: string;
          commenter_id?: string | null;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
