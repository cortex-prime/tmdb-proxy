export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TMDB_API_KEY not set" });
  }

  const type = req.query.type;
  const id = req.query.id;

  if (!id || !type) {
    return res.status(400).json({ error: "Missing id or type" });
  }

  if (type !== "movie" && type !== "tv") {
    return res.status(400).json({ error: "type must be movie or tv" });
  }

  async function fetchTMDB(path) {
    const url = `https://api.themoviedb.org/3/${path}?api_key=${apiKey}&language=en-US&page=1`;
    const response = await fetch(url);

    if (!response.ok) {
      return { results: [] };
    }

    return response.json();
  }

  const [recommendations, similar] = await Promise.all([
    fetchTMDB(`${type}/${id}/recommendations`),
    fetchTMDB(`${type}/${id}/similar`)
  ]);

  const seen = new Set();

  const results = [
    ...(recommendations.results || []),
    ...(similar.results || [])
  ].filter((item) => {
    const mediaType = item.media_type || type;
    const key = `${mediaType}-${item.id}`;

    if (seen.has(key)) return false;
    seen.add(key);

    return item.poster_path || item.backdrop_path;
  }).map((item) => ({
    ...item,
    media_type: item.media_type || type
  }));

  return res.status(200).json({
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length
  });
}
