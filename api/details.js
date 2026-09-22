export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const type = req.query.type === "tv" ? "tv" : "movie";
  const id = req.query.id;

  if (!id || String(id).trim() === "") {
    return res.status(400).json({
      error: "Missing required query parameter: id"
    });
  }

  const resource = req.query.resource === "images" ? "images" : "details";
  const url =
    resource === "images"
      ? `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${apiKey}`
      : `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    return res.status(response.status).json({ error: "TMDB request failed" });
  }

  const data = await response.json();

  if (resource === "images") {
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ posters: data.posters ?? [] });
  }

  // Trailer metadata is supplementary: a videos failure must never prevent an
  // existing detail request from succeeding.
  let trailer = null;
  try {
    const videosResponse = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${apiKey}&language=en-US`
    );
    if (videosResponse.ok) {
      const results = (await videosResponse.json()).results ?? [];
      const trailers = results.filter((video) =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        typeof video.key === "string" &&
        /^[A-Za-z0-9_-]{6,32}$/.test(video.key)
      );
      const selected = trailers.find((video) => video.official) ?? trailers[0];
      if (selected) {
        trailer = {
          key: selected.key,
          name: selected.name ?? "Trailer",
          official: selected.official === true
        };
      }
    }
  } catch {
    // Keep the detail payload backward compatible when TMDB video lookup fails.
  }

  return res.status(200).json({ ...data, trailer });
}
