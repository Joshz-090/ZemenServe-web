export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Paid' | 'Cancelled';

export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Chef';

export interface SystemUser {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
  isActive: boolean;
}

export interface HotelSettings {
  hotelName: string;
  address: string;
  phone: string;
  currency: string;
  vatRate: number;
  lanHostIp: string;
  adminPin: string;
}

export interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  imagePath?: string;
  isActive: boolean;
  recipes?: Recipe[];
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string; // 'kg', 'g', 'L', 'ml', 'pcs', etc.
  costPerUnit: number;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface Recipe {
  id: number;
  menuItemId: number;
  ingredientId: number;
  quantityRequired: number;
}

export interface Waiter {
  id: number;
  name: string;
  isActive: boolean;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  unitPriceAtSale: number;
}

export interface Order {
  id: number;
  createdAt: string;
  status: OrderStatus;
  totalAmount: number;
  cashierNote?: string;
  waiterId?: number;
  waiterName?: string;
  isPaid: boolean;
  orderItems: OrderItem[];
}

export interface InventoryLog {
  id: number;
  ingredientId: number;
  ingredientName?: string;
  changeAmount: number;
  reason: string;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface DailyReportSummary {
  date: string;
  totalRevenue: number;
  totalCogs: number;
  netProfit: number;
  totalOrders: number;
  itemsSold: {
    menuItemId: number;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}
