import path from "path";
import fs from "fs";

export async function getLogoBase64(): Promise<string | null> {
  const logoPath = path.join(process.cwd(), "public", "logo.jpg");
  if (fs.existsSync(logoPath)) {
    return `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  }
  // En Vercel serverless, public/ puede no estar en el filesystem; se obtiene del CDN
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return null;
  try {
    const res = await fetch(`https://${vercelUrl}/logo.jpg`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}
