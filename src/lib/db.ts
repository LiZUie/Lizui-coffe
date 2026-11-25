import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  CafeTable,
  MenuCategory,
  MenuItem,
  MenuVariant,
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  TableStatus,
} from "./types";

let cachedDb: DatabaseSync | null = null;
let cachedDbPath: string | null = null;

function resolveDbPath(): string {
  return process.env.KAFE_DB_PATH || path.join(process.cwd(), "data", "kafe.db");
}

export function resetDbForTests(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
    cachedDbPath = null;
  }
}

export function getDb(): DatabaseSync {
  const dbPath = resolveDbPath();
  if (cachedDb && cachedDbPath === dbPath) return cachedDb;

  if (cachedDb) {
    cachedDb.close();
  }

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      visual_key TEXT NOT NULL,
      variants_json TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cafe_tables (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      area TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      table_code TEXT,
      customer_name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      cash_received INTEGER NOT NULL DEFAULT 0,
      cash_change INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      line_total INTEGER NOT NULL
    );
  `);

  seedIfEmpty(db);

  cachedDb = db;
  cachedDbPath = dbPath;
  return db;
}

function seedIfEmpty(db: DatabaseSync): void {
  const menuCount = (db.prepare("SELECT COUNT(*) AS count FROM menu_items").get() as { count: number }).count;
  if (menuCount === 0) {
    const now = new Date().toISOString();
    const seedMenus: Array<Omit<MenuItem, "isAvailable" | "createdAt">> = [
      {
        id: "menu-cappucino",
        name: "Cappucino",
        category: "COFFEE",
        description: "Espresso house blend dengan susu creamy dan gula aren ringan.",
        price: 28000,
        visualKey: "iced-latte",
        variants: [
          { label: "Small", priceDelta: 0 },
          { label: "Large", priceDelta: 6000 },
        ],
      },
      {
        id: "menu-coffee-latte",
        name: "Coffee Latte",
        category: "COFFEE",
        description: "Single shot arabika seimbang dengan steamed milk lembut.",
        price: 30000,
        visualKey: "coffee-latte",
        variants: [
          { label: "Small", priceDelta: 0 },
          { label: "Large", priceDelta: 6000 },
        ],
      },
      {
        id: "menu-americano",
        name: "Americano",
        category: "COFFEE",
        description: "Double espresso diseduh dengan air mineral dingin atau panas.",
        price: 24000,
        visualKey: "americano",
        variants: [
          { label: "Small", priceDelta: 0 },
          { label: "Large", priceDelta: 5000 },
        ],
      },
      {
        id: "menu-v60",
        name: "V60 Manual Brew",
        category: "COFFEE",
        description: "Seduhan manual single-origin Gayo dengan karakter bersih dan floral.",
        price: 32000,
        visualKey: "v60",
        variants: [
          { label: "Hot", priceDelta: 0 },
          { label: "Iced", priceDelta: 3000 },
        ],
      },
      {
        id: "menu-matcha",
        name: "Uji Matcha Latte",
        category: "NON_COFFEE",
        description: "Bubuk matcha Kyoto dipadukan dengan susu segar dingin.",
        price: 34000,
        visualKey: "matcha",
        variants: [
          { label: "Small", priceDelta: 0 },
          { label: "Large", priceDelta: 6000 },
        ],
      },
      {
        id: "menu-choco",
        name: "Dark Chocolate",
        category: "NON_COFFEE",
        description: "Cokelat hitam 70% hangat atau dingin tanpa pemanis berlebih.",
        price: 30000,
        visualKey: "chocolate",
        variants: [
          { label: "Small", priceDelta: 0 },
          { label: "Large", priceDelta: 5000 },
        ],
      },
      {
        id: "menu-katsu",
        name: "Chicken Katsu Bowl",
        category: "FOOD",
        description: "Nasi hangat dengan ayam katsu renyah dan saus wijen sangrai.",
        price: 42000,
        visualKey: "rice-bowl",
        variants: [
          { label: "Regular", priceDelta: 0 },
          { label: "Extra Egg", priceDelta: 5000 },
        ],
      },
      {
        id: "menu-aglio",
        name: "Spaghetti Aglio Olio",
        category: "FOOD",
        description: "Pasta tumis bawang putih, cabai kering, dan irisan ayam panggang.",
        price: 45000,
        visualKey: "pasta",
        variants: [
          { label: "Original", priceDelta: 0 },
          { label: "Extra Chicken", priceDelta: 8000 },
        ],
      },
      {
        id: "menu-fries",
        name: "Truffle Fries",
        category: "SNACK",
        description: "Kentang goreng renyah dengan minyak truffle dan taburan keju.",
        price: 26000,
        visualKey: "fries",
        variants: [
          { label: "Share", priceDelta: 0 },
          { label: "Large", priceDelta: 8000 },
        ],
      },
      {
        id: "menu-croissant",
        name: "Butter Croissant",
        category: "DESSERT",
        description: "Pastry berlapis mentega panggang hangat setiap pagi.",
        price: 25000,
        visualKey: "croissant",
        variants: [
          { label: "Plain", priceDelta: 0 },
          { label: "Almond", priceDelta: 7000 },
        ],
      },
      {
        id: "menu-tiramisu",
        name: "Espresso Tiramisu",
        category: "DESSERT",
        description: "Mascarpone lembut berlapis biskuit celup espresso house blend.",
        price: 36000,
        visualKey: "cake",
        variants: [{ label: "Slice", priceDelta: 0 }],
      },
    ];

    const insertMenu = db.prepare(`
      INSERT INTO menu_items (id, name, category, description, price, visual_key, variants_json, is_available, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    for (const item of seedMenus) {
      insertMenu.run(
        item.id,
        item.name,
        item.category,
        item.description,
        item.price,
        item.visualKey,
        JSON.stringify(item.variants),
        now,
      );
    }
  }

  const tableCount = (db.prepare("SELECT COUNT(*) AS count FROM cafe_tables").get() as { count: number }).count;
  if (tableCount === 0) {
    const insertTable = db.prepare(`
      INSERT INTO cafe_tables (id, code, area, capacity, status) VALUES (?, ?, ?, ?, ?)
    `);
    for (let i = 1; i <= 10; i++) {
      const code = `M${String(i).padStart(2, "0")}`;
      const area = i <= 6 ? "Indoor" : "Outdoor";
      const capacity = i % 3 === 0 ? 4 : 2;
      const status = i === 2 ? "OCCUPIED" : "AVAILABLE";
      insertTable.run(`table-${code.toLowerCase()}`, code, area, capacity, status);
    }
  }

  const orderCount = (db.prepare("SELECT COUNT(*) AS count FROM orders").get() as { count: number }).count;
  if (orderCount === 0) {
    seedHistoricalOrders(db);
  }
}

function seedHistoricalOrders(db: DatabaseSync): void {
  const now = new Date();
  const sampleSpecs: Array<{
    daysAgo: number;
    hour: number;
    source: OrderSource;
    type: OrderType;
    tableCode: string | null;
    customerName: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    items: Array<{ menuId: string; name: string; variant: string; qty: number; unitPrice: number }>;
  }> = [
    {
      daysAgo: 5,
      hour: 9,
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M01",
      customerName: "Rani",
      paymentMethod: "QRIS",
      status: "COMPLETED",
      items: [
        { menuId: "menu-cappucino", name: "Cappucino", variant: "Small", qty: 2, unitPrice: 28000 },
        { menuId: "menu-croissant", name: "Butter Croissant", variant: "Plain", qty: 1, unitPrice: 25000 },
      ],
    },
    {
      daysAgo: 4,
      hour: 13,
      source: "CASHIER",
      type: "TAKE_AWAY",
      tableCode: null,
      customerName: "Bima",
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: [
        { menuId: "menu-coffee-latte", name: "Coffee Latte", variant: "Large", qty: 2, unitPrice: 36000 },
        { menuId: "menu-fries", name: "Truffle Fries", variant: "Share", qty: 1, unitPrice: 26000 },
      ],
    },
    {
      daysAgo: 3,
      hour: 15,
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M04",
      customerName: "Nadia",
      paymentMethod: "QRIS",
      status: "COMPLETED",
      items: [
        { menuId: "menu-matcha", name: "Uji Matcha Latte", variant: "Large", qty: 2, unitPrice: 40000 },
        { menuId: "menu-tiramisu", name: "Espresso Tiramisu", variant: "Slice", qty: 1, unitPrice: 36000 },
      ],
    },
    {
      daysAgo: 2,
      hour: 11,
      source: "CASHIER",
      type: "DINE_IN",
      tableCode: "M05",
      customerName: "Dimas",
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: [
        { menuId: "menu-cappucino", name: "Cappucino", variant: "Large", qty: 3, unitPrice: 34000 },
        { menuId: "menu-katsu", name: "Chicken Katsu Bowl", variant: "Regular", qty: 2, unitPrice: 42000 },
      ],
    },
    {
      daysAgo: 1,
      hour: 16,
      source: "CUSTOMER",
      type: "TAKE_AWAY",
      tableCode: null,
      customerName: "Sinta",
      paymentMethod: "QRIS",
      status: "COMPLETED",
      items: [
        { menuId: "menu-americano", name: "Americano", variant: "Large", qty: 2, unitPrice: 29000 },
        { menuId: "menu-croissant", name: "Butter Croissant", variant: "Almond", qty: 2, unitPrice: 32000 },
      ],
    },
    {
      daysAgo: 0,
      hour: Math.max(8, now.getHours() - 2),
      source: "CASHIER",
      type: "TAKE_AWAY",
      tableCode: null,
      customerName: "Fajar",
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: [
        { menuId: "menu-cappucino", name: "Cappucino", variant: "Small", qty: 2, unitPrice: 28000 },
        { menuId: "menu-v60", name: "V60 Manual Brew", variant: "Hot", qty: 1, unitPrice: 32000 },
      ],
    },
    {
      daysAgo: 0,
      hour: Math.max(8, now.getHours() - 1),
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M02",
      customerName: "Alya",
      paymentMethod: "QRIS",
      status: "PREPARING",
      items: [
        { menuId: "menu-coffee-latte", name: "Coffee Latte", variant: "Small", qty: 1, unitPrice: 30000 },
        { menuId: "menu-aglio", name: "Spaghetti Aglio Olio", variant: "Original", qty: 1, unitPrice: 45000 },
      ],
    },
  ];

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, source, type, table_code, customer_name, notes,
      status, payment_method, payment_status, cash_received, cash_change,
      subtotal, discount, total, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 'PAID', ?, ?, ?, 0, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, item_name, variant_label, quantity, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleSpecs.forEach((spec, idx) => {
    const dt = new Date(now);
    dt.setDate(now.getDate() - spec.daysAgo);
    dt.setHours(spec.hour, 15 + idx * 5, 0, 0);
    const orderId = `seed-order-${idx + 1}`;
    const orderNumber = `ORD-${1001 + idx}`;
    const subtotal = spec.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    const cashReceived = spec.paymentMethod === "CASH" ? subtotal : 0;

    insertOrder.run(
      orderId,
      orderNumber,
      spec.source,
      spec.type,
      spec.tableCode,
      spec.customerName,
      spec.status,
      spec.paymentMethod,
      cashReceived,
      0,
      subtotal,
      subtotal,
      dt.toISOString(),
    );

    spec.items.forEach((it, j) => {
      insertItem.run(
        `seed-item-${idx + 1}-${j + 1}`,
        orderId,
        it.menuId,
        it.name,
        it.variant,
        it.qty,
        it.unitPrice,
        it.qty * it.unitPrice,
      );
    });
  });
}

function mapMenuRow(row: Record<string, unknown>): MenuItem {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as MenuCategory,
    description: String(row.description),
    price: Number(row.price),
    visualKey: String(row.visual_key),
    variants: JSON.parse(String(row.variants_json)) as MenuVariant[],
    isAvailable: Number(row.is_available) === 1,
    createdAt: String(row.created_at),
  };
}

export function getMenuItems(): MenuItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM menu_items ORDER BY category, name").all() as Array<Record<string, unknown>>;
  return rows.map(mapMenuRow);
}

export function createMenuItem(input: {
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  visualKey?: string;
  variants?: MenuVariant[];
}): MenuItem {
  const db = getDb();
  const name = input.name.trim();
  if (!name) throw new Error("Nama menu wajib diisi");
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error("Harga menu harus lebih dari 0");

  const id = `menu-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const variants = input.variants?.length ? input.variants : [{ label: "Regular", priceDelta: 0 }];
  const visualKey = input.visualKey || "iced-latte";

  db.prepare(`
    INSERT INTO menu_items (id, name, category, description, price, visual_key, variants_json, is_available, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id,
    name,
    input.category,
    input.description.trim() || "Menu racikan terbaru Purr'Coffee.",
    Math.round(input.price),
    visualKey,
    JSON.stringify(variants),
    now,
  );

  const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(id) as Record<string, unknown>;
  return mapMenuRow(row);
}

export function toggleMenuAvailability(id: string, isAvailable: boolean): MenuItem {
  const db = getDb();
  const res = db.prepare("UPDATE menu_items SET is_available = ? WHERE id = ?").run(isAvailable ? 1 : 0, id);
  if (res.changes === 0) throw new Error("Menu tidak ditemukan");
  const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(id) as Record<string, unknown>;
  return mapMenuRow(row);
}

export function getTables(): CafeTable[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM cafe_tables ORDER BY code").all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    area: row.area as "Indoor" | "Outdoor",
    capacity: Number(row.capacity),
    status: row.status as TableStatus,
  }));
}

export function setTableStatus(code: string, status: TableStatus): CafeTable {
  const db = getDb();
  const res = db.prepare("UPDATE cafe_tables SET status = ? WHERE code = ?").run(status, code);
  if (res.changes === 0) throw new Error(`Meja ${code} tidak ditemukan`);
  const row = db.prepare("SELECT * FROM cafe_tables WHERE code = ?").get(code) as Record<string, unknown>;
  return {
    id: String(row.id),
    code: String(row.code),
    area: row.area as "Indoor" | "Outdoor",
    capacity: Number(row.capacity),
    status: row.status as TableStatus,
  };
}

function hydrateOrders(db: DatabaseSync, orderRows: Array<Record<string, unknown>>): Order[] {
  if (orderRows.length === 0) return [];
  const itemRows = db
    .prepare("SELECT * FROM order_items WHERE order_id IN (" + orderRows.map(() => "?").join(",") + ")")
    .all(...orderRows.map((r) => String(r.id))) as Array<Record<string, unknown>>;

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const row of itemRows) {
    const orderId = String(row.order_id);
    const list = itemsByOrder.get(orderId) ?? [];
    list.push({
      id: String(row.id),
      orderId,
      menuItemId: String(row.menu_item_id),
      itemName: String(row.item_name),
      variantLabel: String(row.variant_label),
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.line_total),
    });
    itemsByOrder.set(orderId, list);
  }

  return orderRows.map((row) => ({
    id: String(row.id),
    orderNumber: String(row.order_number),
    source: row.source as OrderSource,
    type: row.type as OrderType,
    tableCode: row.table_code ? String(row.table_code) : null,
    customerName: String(row.customer_name),
    notes: String(row.notes ?? ""),
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as PaymentStatus,
    cashReceived: Number(row.cash_received),
    cashChange: Number(row.cash_change),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    createdAt: String(row.created_at),
    items: itemsByOrder.get(String(row.id)) ?? [],
  }));
}

export function listOrders(limit = 100): Order[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Array<Record<string, unknown>>;
  return hydrateOrders(db, rows);
}

export function getOrderById(id: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateOrders(db, [row])[0] ?? null;
}

export interface CreateOrderInput {
  source: OrderSource;
  type: OrderType;
  tableCode?: string | null;
  customerName?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  markPaid?: boolean;
  discount?: number;
  items: Array<{
    menuItemId: string;
    variantLabel: string;
    quantity: number;
  }>;
}

export function createOrder(input: CreateOrderInput): Order {
  const db = getDb();
  if (!input.items || input.items.length === 0) {
    throw new Error("Keranjang pesanan masih kosong");
  }

  const tableCode = input.type === "DINE_IN" ? (input.tableCode ?? "").trim().toUpperCase() : null;
  if (input.type === "DINE_IN") {
    if (!tableCode) throw new Error("Pilih nomor meja untuk pesanan Dine-in");
    const tableRow = db.prepare("SELECT * FROM cafe_tables WHERE code = ?").get(tableCode);
    if (!tableRow) throw new Error(`Meja ${tableCode} tidak ditemukan`);
  }

  const resolvedItems: Array<{
    menuItemId: string;
    itemName: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  for (const reqItem of input.items) {
    if (!Number.isInteger(reqItem.quantity) || reqItem.quantity <= 0) {
      throw new Error("Jumlah item harus minimal 1");
    }
    const row = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(reqItem.menuItemId) as
      | Record<string, unknown>
      | undefined;
    if (!row) throw new Error("Menu tidak ditemukan");
    const menu = mapMenuRow(row);
    if (!menu.isAvailable) {
      throw new Error(`Menu ${menu.name} sedang habis`);
    }
    const variant = menu.variants.find((v) => v.label === reqItem.variantLabel) ?? menu.variants[0];
    const unitPrice = menu.price + (variant?.priceDelta ?? 0);
    resolvedItems.push({
      menuItemId: menu.id,
      itemName: menu.name,
      variantLabel: variant?.label ?? "Regular",
      quantity: reqItem.quantity,
      unitPrice,
      lineTotal: unitPrice * reqItem.quantity,
    });
  }

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = Math.max(0, Math.min(subtotal, Math.round(input.discount ?? 0)));
  const total = subtotal - discount;

  const isPaid = Boolean(input.markPaid ?? input.source === "CASHIER");
  let cashReceived = 0;
  let cashChange = 0;
  if (isPaid && input.paymentMethod === "CASH") {
    cashReceived = Math.round(input.cashReceived ?? total);
    if (cashReceived < total) {
      throw new Error("Uang tunai diterima kurang dari total tagihan");
    }
    cashChange = cashReceived - total;
  }

  const id = `ord-${crypto.randomUUID().slice(0, 8)}`;
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM orders").get() as { count: number };
  const orderNumber = `ORD-${1001 + countRow.count}`;
  const now = new Date().toISOString();
  const initialStatus: OrderStatus = isPaid && input.source === "CASHIER" ? "PREPARING" : "PENDING";
  const customerName = input.customerName?.trim() || (tableCode ? `Meja ${tableCode}` : "Pelanggan Take Away");

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO orders (
        id, order_number, source, type, table_code, customer_name, notes,
        status, payment_method, payment_status, cash_received, cash_change,
        subtotal, discount, total, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      orderNumber,
      input.source,
      input.type,
      tableCode,
      customerName,
      (input.notes ?? "").trim(),
      initialStatus,
      input.paymentMethod,
      isPaid ? "PAID" : "UNPAID",
      cashReceived,
      cashChange,
      subtotal,
      discount,
      total,
      now,
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, menu_item_id, item_name, variant_label, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of resolvedItems) {
      insertItem.run(
        `oi-${crypto.randomUUID().slice(0, 8)}`,
        id,
        item.menuItemId,
        item.itemName,
        item.variantLabel,
        item.quantity,
        item.unitPrice,
        item.lineTotal,
      );
    }

    if (tableCode) {
      db.prepare("UPDATE cafe_tables SET status = 'OCCUPIED' WHERE code = ?").run(tableCode);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return getOrderById(id)!;
}

export function updateOrderStatus(
  id: string,
  updates: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    cashReceived?: number;
  },
): Order {
  const db = getDb();
  const existing = getOrderById(id);
  if (!existing) throw new Error("Pesanan tidak ditemukan");

  const nextPaymentStatus = updates.paymentStatus ?? existing.paymentStatus;
  let nextCashReceived = existing.cashReceived;
  let nextCashChange = existing.cashChange;

  if (nextPaymentStatus === "PAID" && existing.paymentMethod === "CASH") {
    const received = Math.round(updates.cashReceived ?? (existing.cashReceived || existing.total));
    if (received < existing.total) {
      throw new Error("Uang tunai diterima kurang dari total tagihan");
    }
    nextCashReceived = received;
    nextCashChange = received - existing.total;
  }

  const nextStatus = updates.status ?? existing.status;

  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE orders
      SET status = ?, payment_status = ?, cash_received = ?, cash_change = ?
      WHERE id = ?
    `).run(nextStatus, nextPaymentStatus, nextCashReceived, nextCashChange, id);

    // Free table automatically when the last active dine-in order on that table finishes.
    if (existing.tableCode && (nextStatus === "COMPLETED" || nextStatus === "CANCELLED")) {
      const stillActive = db
        .prepare(
          "SELECT COUNT(*) AS count FROM orders WHERE table_code = ? AND id != ? AND status IN ('PENDING', 'PREPARING', 'READY')",
        )
        .get(existing.tableCode, id) as { count: number };
      if (stillActive.count === 0) {
        db.prepare("UPDATE cafe_tables SET status = 'AVAILABLE' WHERE code = ?").run(existing.tableCode);
      }
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return getOrderById(id)!;
}
