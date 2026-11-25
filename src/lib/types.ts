export type MenuCategory = "COFFEE" | "NON_COFFEE" | "FOOD" | "SNACK" | "DESSERT";

export type OrderSource = "CUSTOMER" | "CASHIER";
export type OrderType = "DINE_IN" | "TAKE_AWAY";
export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "QRIS";
export type PaymentStatus = "UNPAID" | "PAID";
export type TableStatus = "AVAILABLE" | "OCCUPIED";
export type StaffRole = "CASHIER" | "MANAGER";

export interface MenuVariant {
  label: string;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  visualKey: string;
  variants: MenuVariant[];
  isAvailable: boolean;
  createdAt: string;
}

export interface CafeTable {
  id: string;
  code: string;
  area: "Indoor" | "Outdoor";
  capacity: number;
  status: TableStatus;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  source: OrderSource;
  type: OrderType;
  tableCode: string | null;
  customerName: string;
  notes: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashReceived: number;
  cashChange: number;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopMenuEntry {
  menuItemId: string;
  itemName: string;
  category: MenuCategory;
  topVariant: string;
  quantitySold: number;
  revenue: number;
}

export interface AnalyticsSummary {
  period: "today" | "7d" | "30d";
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dineInCount: number;
  takeAwayCount: number;
  customerSourceCount: number;
  cashierSourceCount: number;
  cashRevenue: number;
  qrisRevenue: number;
  trend: TrendPoint[];
  topMenus: TopMenuEntry[];
  categoryBreakdown: Array<{ category: MenuCategory; quantity: number; revenue: number }>;
  orders: Order[];
}
