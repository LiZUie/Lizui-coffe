import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const SAFE_FILENAME_RE = /^[a-f0-9-]+\.(jpg|png|webp)$/;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!SAFE_FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "uploads", "menu", filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
  }

  const ext = filename.split(".").pop() ?? "jpg";
  const bytes = fs.readFileSync(filePath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
