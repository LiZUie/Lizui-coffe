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
    expect(csv).toContain("LAPORAN PENJUALAN PURR'COFFEE");
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
});
