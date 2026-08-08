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

  return res.status(200).json(data);
}
