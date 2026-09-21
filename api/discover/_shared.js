const ALLOWED_SORT_VALUES = new Set([
  "popularity.asc",
  "popularity.desc",
  "vote_average.asc",
  "vote_average.desc",
  "vote_count.asc",
  "vote_count.desc",
  "primary_release_date.asc",
  "primary_release_date.desc",
  "release_date.asc",
  "release_date.desc",
  "first_air_date.asc",
  "first_air_date.desc"
]);

const ALLOWED_MONETIZATION_TYPES = new Set(["flatrate", "free", "ads", "rent", "buy"]);

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanString(value) {
  const raw = firstQueryValue(value);
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  return text.length > 0 ? text : undefined;
}

function cleanInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const text = cleanString(value);
  if (!text || !/^\d+$/.test(text)) return undefined;
  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, min), max);
}

function cleanDecimal(value, { min = 0, max = 10 } = {}) {
  const text = cleanString(value);
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return undefined;
  const parsed = Number.parseFloat(text);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, min), max);
}

function cleanDate(value) {
  const text = cleanString(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  return text;
}

function cleanLanguage(value) {
  const text = cleanString(value);
  if (!text || !/^[a-z]{2}(-[A-Z]{2})?$/.test(text)) return undefined;
  return text;
}

function cleanRegion(value) {
  const text = cleanString(value);
  if (!text || !/^[A-Z]{2}$/.test(text)) return undefined;
  return text;
}

function cleanProviderList(value) {
  const text = cleanString(value);
  if (!text || !/^\d+(\|\d+)*$/.test(text)) return undefined;
  return text;
}

function cleanMonetizationTypes(value) {
  const text = cleanString(value);
  if (!text) return undefined;
  const parts = text.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => !ALLOWED_MONETIZATION_TYPES.has(part))) {
    return undefined;
  }
  return parts.join("|");
}

function appendIfPresent(params, name, value) {
  if (value !== undefined) {
    params.set(name, String(value));
  }
}

export async function handleDiscover(req, res, mediaType) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const page = cleanInteger(req.query.page, { min: 1, max: 500 }) ?? 1;
  const sortBy = cleanString(req.query.sort_by);
  const safeSortBy = sortBy && ALLOWED_SORT_VALUES.has(sortBy) ? sortBy : undefined;

  const params = new URLSearchParams({
    api_key: apiKey,
    language: "en-US",
    include_adult: "false",
    page: String(page)
  });

  appendIfPresent(params, "sort_by", safeSortBy);
  appendIfPresent(params, "vote_count.gte", cleanInteger(req.query["vote_count.gte"]));
  appendIfPresent(params, "vote_average.gte", cleanDecimal(req.query["vote_average.gte"]));
  appendIfPresent(params, "with_genres", cleanInteger(req.query.with_genres));
  appendIfPresent(params, "with_original_language", cleanLanguage(req.query.with_original_language));
  appendIfPresent(params, "watch_region", cleanRegion(req.query.watch_region));
  appendIfPresent(params, "with_watch_providers", cleanProviderList(req.query.with_watch_providers));
  appendIfPresent(params, "with_watch_monetization_types", cleanMonetizationTypes(req.query.with_watch_monetization_types));

  if (mediaType === "movie") {
    appendIfPresent(params, "primary_release_date.gte", cleanDate(req.query["primary_release_date.gte"]));
    appendIfPresent(params, "primary_release_date.lte", cleanDate(req.query["primary_release_date.lte"]));
  } else {
    appendIfPresent(params, "first_air_date.gte", cleanDate(req.query["first_air_date.gte"]));
    appendIfPresent(params, "first_air_date.lte", cleanDate(req.query["first_air_date.lte"]));
  }

  const url = `https://api.themoviedb.org/3/discover/${mediaType}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    return res.status(response.status).json({ error: "TMDB request failed" });
  }

  const data = await response.json();
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).json({
    ...data,
    results: (data.results ?? []).map((item) => ({
      ...item,
      media_type: mediaType
    }))
  });
}
