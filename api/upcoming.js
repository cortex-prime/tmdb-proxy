export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const page = req.query.page || "1";

  const movieUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&page=${page}`;
  const tvUrl = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}&page=${page}`;

  const [movieResponse, tvResponse] = await Promise.all([
    fetch(movieUrl),
    fetch(tvUrl)
  ]);

  if (!movieResponse.ok) {
    return res.status(movieResponse.status).json({ error: "TMDB movie request failed" });
  }

  if (!tvResponse.ok) {
    return res.status(tvResponse.status).json({ error: "TMDB TV request failed" });
  }

  const movieData = await movieResponse.json();
  const tvData = await tvResponse.json();

  const movieResults = (movieData.results || []).map(item => ({
    ...item,
    media_type: "movie"
  }));

  const tvResults = (tvData.results || []).map(item => ({
    ...item,
    media_type: "tv"
  }));

  return res.status(200).json({
    page: Number(page),
    results: [...movieResults, ...tvResults],
    total_pages: Math.max(movieData.total_pages || 1, tvData.total_pages || 1),
    total_results: (movieData.total_results || 0) + (tvData.total_results || 0)
  });
}
