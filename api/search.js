export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) return res.status(response.status).json({ error: "TMDB request failed" });
  const data = await response.json();
  return res.status(200).json(data);
}
