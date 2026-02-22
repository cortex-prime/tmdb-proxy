export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const { type, id } = req.query;
  if (!type || !id) return res.status(400).json({ error: "Missing type or id" });

  const safeType = type === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${safeType}/${id}/credits?api_key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    return res.status(response.status).json({ error: "TMDB request failed" });
  }

  const data = await response.json();
  return res.status(200).json({ cast: data.cast ?? [] });
}
