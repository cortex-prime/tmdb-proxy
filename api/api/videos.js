export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const type = req.query.type;
  const id = String(req.query.id ?? "").trim();
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: "type must be movie or tv and id must be numeric" });
  }

  const params = new URLSearchParams({ api_key: apiKey, language: "en-US" });
  const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?${params}`);
  if (!response.ok) {
    return res.status(response.status).json({ error: "TMDB request failed" });
  }

  const results = (await response.json()).results ?? [];
  const trailers = results.filter((video) =>
    video.site === "YouTube" &&
    video.type === "Trailer" &&
    typeof video.key === "string" &&
    /^[A-Za-z0-9_-]{6,32}$/.test(video.key)
  );
  const trailer = trailers.find((video) => video.official) ?? trailers[0];

  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  return res.status(200).json({
    trailer: trailer ? {
      key: trailer.key,
      name: trailer.name ?? "Trailer",
      official: trailer.official === true
    } : null
  });
}
