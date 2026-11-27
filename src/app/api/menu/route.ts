import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createMenuItem, getMenuItems, toggleMenuAvailability } from "@/lib/db";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import { detectImageExtension, isPresetMenuKey } from "@/lib/menu-images";
import type { MenuCategory } from "@/lib/types";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const VALID_CATEGORIES = new Set<MenuCategory>(["COFFEE", "NON_COFFEE", "FOOD", "SNACK", "DESSERT"]);

export async function GET() {
  return NextResponse.json({ items: getMenuItems() });
}

export async function POST(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Akses khusus Manajer" }, { status: 403 });
  }
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let name = "";
    let category: MenuCategory = "COFFEE";
    let description = "";
    let price = 0;
    let visualKey = "iced-latte";
    let uploadedFile: File | null = null;
    let variants: Array<{ label: string; priceDelta: number }> | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      name = String(form.get("name") ?? "");
      const rawCat = String(form.get("category") ?? "COFFEE") as MenuCategory;
      category = VALID_CATEGORIES.has(rawCat) ? rawCat : "COFFEE";
      description = String(form.get("description") ?? "");
      price = Number(form.get("price") ?? 0);
      const rawVisual = String(form.get("visualKey") ?? "iced-latte");
      visualKey = isPresetMenuKey(rawVisual) ? rawVisual : "iced-latte";
      const fileEntry = form.get("image");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        uploadedFile = fileEntry;
      }
    } else {
      const body = (await req.json()) as {
        name?: string;
        category?: MenuCategory;
        description?: string;
        price?: number;
        visualKey?: string;
        variants?: Array<{ label: string; priceDelta: number }>;
      };
      name = body.name ?? "";
      category = body.category && VALID_CATEGORIES.has(body.category) ? body.category : "COFFEE";
      description = body.description ?? "";
      price = Number(body.price ?? 0);
      visualKey = body.visualKey && isPresetMenuKey(body.visualKey) ? body.visualKey : "iced-latte";
      variants = body.variants;
    }

    if (!name.trim()) {
      return NextResponse.json({ error: "Nama menu wajib diisi" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Harga menu harus lebih dari 0" }, { status: 400 });
    }

    if (uploadedFile) {
      if (uploadedFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Ukuran gambar maksimal 2 MB" }, { status: 400 });
      }
      const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
      const ext = detectImageExtension(bytes);
      if (!ext) {
        return NextResponse.json({ error: "Format gambar harus JPG, PNG, atau WEBP" }, { status: 400 });
      }
      const filename = `${crypto.randomUUID()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "data", "uploads", "menu");
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), bytes);
      visualKey = `/api/menu/image/${filename}`;
    }

    const item = createMenuItem({
      name,
      category,
      description,
      price,
      visualKey,
      variants,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal menambah menu" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "CASHIER") && !hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Login staf diperlukan" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as { id?: string; isAvailable?: boolean };
    if (!body.id || typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    const item = toggleMenuAvailability(body.id, body.isAvailable);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal memperbarui menu" }, { status: 400 });
  }
}
