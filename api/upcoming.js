export default async function handler(req, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "TMDB_API_KEY not set" });

  const today = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(today.getFullYear() + 1);

  const from = today.toISOString().slice(0, 10);
  const to = nextYear.toISOString().slice(0, 10);

  const pages = [1, 2, 3, 4, 5];

  async function fetchTMDB(url) {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  }

  const movieRequests = pages.map((page) =>
    fetchTMDB(
      `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=primary_release_date.asc&primary_release_date.gte=${from}&primary_release_date.lte=${to}&page=${page}`
    )
  );

  const tvRequests = pages.map((page) =>
    fetchTMDB(
      `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=en-US&sort_by=first_air_date.asc&first_air_date.gte=${from}&first_air_date.lte=${to}&page=${page}`
    )
  );

  const results = await Promise.all([...movieRequests, ...tvRequests]);

  const items = results
    .flat()
    .map((item) => ({
      ...item,
      media_type: item.title ? "movie" : "tv",
    }))
    .filter((item) => item.poster_path || item.backdrop_path)
    .sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || "9999-12-31";
      const dateB = b.release_date || b.first_air_date || "9999-12-31";
      return dateA.localeCompare(dateB);
    });

  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const key = `${item.media_type}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return res.status(200).json({
    page: 1,
    results: unique,
    total_results: unique.length,
    total_pages: 1,
  });
}
