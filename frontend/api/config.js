export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  
  const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || "";
  
  res.status(200).json({
    BACKEND_URL: backendUrl,
    status: "ok"
  });
}
