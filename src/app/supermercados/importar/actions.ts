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

// Google retiró la Places API "clásica" para proyectos nuevos: esto usa
// Places API (New), que habla JSON por POST en vez de query params por GET.
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.displayName,places.formattedAddress,places.location";

type GooglePlaceResult = {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
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

  let body: { error?: { message?: string }; places?: GooglePlaceResult[] };
  try {
    const res = await fetch(TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: searchText, languageCode: "es" }),
    });
    body = await res.json();
    if (!res.ok) {
      return { error: `Google Places respondió: ${body.error?.message ?? `HTTP ${res.status}`}`, results: [] };
    }
  } catch {
    return { error: "No se pudo contactar con Google Maps. Inténtalo de nuevo.", results: [] };
  }

  const raw = (body.places ?? [])
    .slice(0, 20)
    .map((p) => ({
      name: p.displayName?.text?.trim() ?? "",
      address: p.formattedAddress?.trim() ?? "",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
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
