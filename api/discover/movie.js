import { handleDiscover } from "./_shared.js";

export default async function handler(req, res) {
  return handleDiscover(req, res, "movie");
}
