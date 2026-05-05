import { hasSupabase } from "@/lib/env";
import { createDemoRepository } from "@/lib/repositories/demo-repository";
import { createSupabaseRepository } from "@/lib/repositories/supabase-repository";
import type { TripRepository } from "@/lib/repositories/types";

let repository: TripRepository | null = null;

export function getTripRepository() {
  if (!repository) {
    repository = hasSupabase
      ? createSupabaseRepository()
      : createDemoRepository();
  }

  return repository;
}
