"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PlaceCandidate = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  alreadyExists: boolean;
};

export type SearchState = { error: string | null; results: PlaceCandidate[] };

type GooglePlaceResult = {
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
};

export async function searchGooglePlaces(city: string, query: string): Promise<SearchState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Debes iniciar sesión para importar supermercados.", results: [] };
  if (!city.trim()) return { error: "Indica una ciudad.", results: [] };

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      error: "Falta configurar GOOGLE_MAPS_API_KEY en el servidor (variable de entorno, no NEXT_PUBLIC_).",
      results: [],
    };
  }

  const searchText = `${query.trim() || "supermercado"} en ${city.trim()}`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchText)}&key=${apiKey}`;

  let body: { status: string; error_message?: string; results?: GooglePlaceResult[] };
  try {
    const res = await fetch(url);
    body = await res.json();
  } catch {
    return { error: "No se pudo contactar con Google Maps. Inténtalo de nuevo.", results: [] };
  }

  if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
    return { error: `Google Places respondió: ${body.status}${body.error_message ? ` (${body.error_message})` : ""}`, results: [] };
  }

  const raw = (body.results ?? [])
    .slice(0, 20)
    .map((p) => ({
      name: p.name?.trim() ?? "",
      address: p.formatted_address?.trim() ?? "",
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
    }))
    .filter(
      (p): p is { name: string; address: string; lat: number; lng: number } =>
        Boolean(p.name) && Boolean(p.address) && typeof p.lat === "number" && typeof p.lng === "number"
    );

  if (raw.length === 0) return { error: null, results: [] };

  const { data: existing } = await supabase
    .from("supermarkets")
    .select("name, address")
    .in(
      "name",
      raw.map((r) => r.name)
    );
  const existingKeys = new Set((existing ?? []).map((e) => `${e.name}::${e.address}`));

  const results: PlaceCandidate[] = raw.map((r) => ({
    ...r,
    alreadyExists: existingKeys.has(`${r.name}::${r.address}`),
  }));

  return { error: null, results };
}

export type ImportState = { error: string | null; created: number };

export async function importSelectedPlaces(city: string, places: PlaceCandidate[]): Promise<ImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Debes iniciar sesión para importar supermercados.", created: 0 };

  const toInsert = places
    .filter((p) => !p.alreadyExists)
    .map((p) => ({
      name: p.name,
      chain: null,
      address: p.address,
      city: city.trim(),
      lat: p.lat,
      lng: p.lng,
      created_by: user.id,
    }));

  if (toInsert.length === 0) return { error: null, created: 0 };

  const { error } = await supabase.from("supermarkets").insert(toInsert);
  if (error) return { error: "No se pudieron guardar los supermercados seleccionados.", created: 0 };

  revalidatePath("/supermercados");
  return { error: null, created: toInsert.length };
}
