export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const rawPage = Number.parseInt(req.query.page || "1", 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), 500) : 1;

  const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) return res.status(response.status).json({ error: "TMDB request failed" });
  const data = await response.json();
  return res.status(200).json(data);
}
