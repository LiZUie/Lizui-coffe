import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMenuItem,
  createOrder,
  getMenuItems,
  getTables,
  listOrders,
  resetDbForTests,
  toggleMenuAvailability,
  updateOrderStatus,
} from "../db";
import { buildOrdersCsv, computeAnalytics } from "../analytics";
import { createStaffToken, hasRoleAccess, verifyPin, verifyStaffToken } from "../auth";
import { detectImageExtension, resolveMenuImageSrc } from "../menu-images";

beforeEach(() => {
  process.env.KAFE_DB_PATH = ":memory:";
  resetDbForTests();
});

afterEach(() => {
  resetDbForTests();
});

describe("Cafe POS & Ordering Domain", () => {
  it("creates a customer dine-in order, marks table OCCUPIED, and frees it when completed", () => {
    const order = createOrder({
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M03",
      customerName: "Budi",
      paymentMethod: "QRIS",
      items: [{ menuItemId: "menu-cappucino", variantLabel: "Large", quantity: 2 }],
    });

    expect(order.subtotal).toBe(68000);
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.status).toBe("PENDING");

    const tableAfterOrder = getTables().find((t) => t.code === "M03");
    expect(tableAfterOrder?.status).toBe("OCCUPIED");

    const completed = updateOrderStatus(order.id, { status: "COMPLETED", paymentStatus: "PAID" });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.paymentStatus).toBe("PAID");

    const tableAfterDone = getTables().find((t) => t.code === "M03");
    expect(tableAfterDone?.status).toBe("AVAILABLE");
  });

  it("calculates cashier cash change and rejects insufficient cash or sold-out items", () => {
    const cashierOrder = createOrder({
      source: "CASHIER",
      type: "TAKE_AWAY",
      paymentMethod: "CASH",
      cashReceived: 100000,
      items: [{ menuItemId: "menu-americano", variantLabel: "Small", quantity: 2 }],
    });
    expect(cashierOrder.total).toBe(48000);
    expect(cashierOrder.cashChange).toBe(52000);
    expect(cashierOrder.paymentStatus).toBe("PAID");

    expect(() =>
      createOrder({
        source: "CASHIER",
        type: "TAKE_AWAY",
        paymentMethod: "CASH",
        cashReceived: 10000,
        items: [{ menuItemId: "menu-americano", variantLabel: "Small", quantity: 1 }],
      }),
    ).toThrow(/kurang/i);

    toggleMenuAvailability("menu-v60", false);
    expect(() =>
      createOrder({
        source: "CUSTOMER",
        type: "TAKE_AWAY",
        paymentMethod: "QRIS",
        items: [{ menuItemId: "menu-v60", variantLabel: "Hot", quantity: 1 }],
      }),
    ).toThrow(/habis/i);
  });

  it("computes manager monitoring charts, top-selling menus, and safe CSV export", () => {
    const newItem = createMenuItem({
      name: "=FormulaDrink",
      category: "COFFEE",
      description: "Test formula guard",
      price: 25000,
    });
    createOrder({
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M06",
      customerName: "=SUM(1,2)",
      paymentMethod: "QRIS",
      markPaid: true,
      items: [{ menuItemId: newItem.id, variantLabel: "Regular", quantity: 3 }],
    });

    const summary = computeAnalytics(listOrders(200), getMenuItems(), "7d");
    expect(summary.totalOrders).toBeGreaterThanOrEqual(8);
    expect(summary.trend.length).toBe(7);
    expect(summary.topMenus[0]?.quantitySold).toBeGreaterThanOrEqual(3);

    const csv = buildOrdersCsv(summary);
    expect(csv).toContain("LAPORAN PENJUALAN LIZUI COFFEE");
    expect(csv).toContain("'=SUM(1,2)");
    expect(csv).toContain("'=FormulaDrink");
  });

  it("verifies demo PINs and role access tokens", () => {
    expect(verifyPin("CASHIER", "1234")).toBe(true);
    expect(verifyPin("CASHIER", "0000")).toBe(false);
    expect(verifyPin("MANAGER", "9999")).toBe(true);

    const cashierToken = createStaffToken("CASHIER");
    const managerToken = createStaffToken("MANAGER");
    expect(verifyStaffToken(cashierToken)).toBe("CASHIER");
    expect(hasRoleAccess(verifyStaffToken(cashierToken), "CASHIER")).toBe(true);
    expect(hasRoleAccess(verifyStaffToken(cashierToken), "MANAGER")).toBe(false);
    expect(hasRoleAccess(verifyStaffToken(managerToken), "MANAGER")).toBe(true);
  });

  it("applies extra sugar fee on drinks except tea and supports coffee temperature options", () => {
    const coffeeOrder = createOrder({
      source: "CUSTOMER",
      type: "DINE_IN",
      tableCode: "M04",
      paymentMethod: "QRIS",
      items: [
        {
          menuItemId: "menu-cappucino",
          variantLabel: "Large",
          temperature: "Panas",
          sugarLevel: "Banyak",
          quantity: 1,
        },
      ],
    });
    // Base 28000 + Large 6000 + Gula Banyak 2000 = 36000
    expect(coffeeOrder.total).toBe(36000);
    expect(coffeeOrder.items[0]?.variantLabel).toBe("Large • Panas • Gula Banyak");

    const teaMenu = createMenuItem({
      name: "Es Teh Leci",
      category: "NON_COFFEE",
      description: "Teh melati dingin dengan buah leci.",
      price: 22000,
    });
    expect(teaMenu.variants.map((v) => v.label)).toEqual(["Small", "Large"]);

    const teaOrder = createOrder({
      source: "CUSTOMER",
      type: "TAKE_AWAY",
      paymentMethod: "CASH",
      items: [
        {
          menuItemId: teaMenu.id,
          variantLabel: "Large",
          sugarLevel: "Banyak",
          quantity: 1,
        },
      ],
    });
    // Tea is exempt from extra sugar fee: Base 22000 + Large 6000 + 0 = 28000
    expect(teaOrder.total).toBe(28000);
    expect(teaOrder.items[0]?.variantLabel).toBe("Large • Gula Banyak");
  });

  it("validates preset and uploaded menu image paths safely", () => {
    expect(resolveMenuImageSrc("iced-latte")).toBe("/images/menu/iced-latte.jpg");
    expect(resolveMenuImageSrc("iced-latte", "Panas")).toBe("/images/menu/iced-latte-hot.jpg");
    expect(resolveMenuImageSrc("coffee-latte", "Panas")).toBe("/images/menu/coffee-latte-hot.jpg");
    expect(resolveMenuImageSrc("americano", "Ice")).toBe("/images/menu/americano.jpg");
    expect(resolveMenuImageSrc("americano", "Panas")).toBe("/images/menu/americano-hot.jpg");
    expect(resolveMenuImageSrc("v60", "Ice")).toBe("/images/menu/v60.jpg");
    expect(resolveMenuImageSrc("v60", "Panas")).toBe("/images/menu/v60-hot.jpg");
    expect(resolveMenuImageSrc("chocolate", "Ice")).toBe("/images/menu/chocolate.jpg");
    expect(resolveMenuImageSrc("chocolate", "Panas")).toBe("/images/menu/chocolate-hot.jpg");
    expect(resolveMenuImageSrc("/api/menu/image/123e4567-e89b-12d3-a456-426614174000.png")).toBe(
      "/api/menu/image/123e4567-e89b-12d3-a456-426614174000.png",
    );
    expect(resolveMenuImageSrc("../secret.txt")).toBe("/images/menu/iced-latte.jpg");

    expect(detectImageExtension(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpg");
    expect(detectImageExtension(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("png");
    expect(detectImageExtension(new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});
