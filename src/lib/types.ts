export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Paid' | 'Cancelled';

export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Chef' | 'Waiter' | 'Receptionist' | 'Housekeeper' | 'Accountant';

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
  roomNumber?: string; // If charged to hotel room folio
  guestName?: string;
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

// ==========================================
// HOTEL MANAGEMENT SYSTEM (HMS) ERP MODULE TYPES
// ==========================================

export type RoomStatus = 'Clean' | 'Dirty' | 'Inspected' | 'Occupied' | 'Out of Service';

export type RoomType = 'Standard Single' | 'Deluxe Double' | 'Executive Suite' | 'Presidential Suite' | 'Family Suite';

export interface Room {
  id: number;
  roomNumber: string;
  type: RoomType;
  floor: number;
  pricePerNight: number;
  capacity: number;
  status: RoomStatus;
  amenities: string[];
  currentGuestName?: string;
  currentReservationId?: number;
}

export interface Guest {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  idPassportNumber: string;
  idType: 'National ID' | 'Passport' | 'Driver License';
  nationality: string;
  vipStatus: boolean;
  totalStays: number;
  totalSpent: number;
  notes?: string;
}

export type ReservationStatus = 'Reserved' | 'Checked-In' | 'Checked-Out' | 'Cancelled' | 'No-Show';

export type BookingSource = 'Direct Walk-in' | 'Hotel Website' | 'Booking.com' | 'Expedia' | 'Agoda' | 'Corporate Partner';

export interface Reservation {
  id: number;
  bookingRef: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  numberOfGuests: number;
  status: ReservationStatus;
  bookingSource: BookingSource;
  nightlyRate: number;
  totalAmount: number;
  depositPaid: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  specialRequests?: string;
  createdAt: string;
}

export type FolioCategory = 
  | 'Room Charge' 
  | 'Restaurant POS' 
  | 'Room Service' 
  | 'Laundry' 
  | 'Minibar' 
  | 'Spa & Wellness' 
  | 'Late Fee' 
  | 'Payment Deposit';

export interface FolioTransaction {
  id: number;
  reservationId: number;
  roomNumber: string;
  guestName: string;
  category: FolioCategory;
  description: string;
  amount: number;
  type: 'Debit' | 'Credit'; // Debit increases balance, Credit reduces balance (payment)
  paymentMethod?: 'Cash' | 'Card' | 'Telebirr' | 'CBE Birr' | 'Bank Transfer' | 'Room Charge';
  timestamp: string;
  postedBy: string;
}

export interface HousekeepingTask {
  id: number;
  roomNumber: string;
  taskType: 'Full Clean' | 'Touch-Up' | 'Deep Clean' | 'Maintenance Repair' | 'Minibar Restock';
  priority: 'Low' | 'Normal' | 'Urgent';
  assignedStaff: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Inspected';
  notes?: string;
  createdAt: string;
}

export interface EventHall {
  id: number;
  name: string;
  capacity: number;
  hourlyRate: number;
  dailyRate: number;
  amenities: string[];
  status: 'Available' | 'Maintenance' | 'Booked';
}

export interface EventBooking {
  id: number;
  bookingRef: string;
  eventTitle: string;
  organizerName: string;
  organizerContact: string;
  hallId: number;
  hallName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedAttendees: number;
  setupFormat: 'Banquet' | 'Theater' | 'Classroom' | 'U-Shape' | 'Cocktail';
  cateringPackage?: string;
  totalAmount: number;
  depositPaid: number;
  status: 'Confirmed' | 'Tentative' | 'Completed' | 'Cancelled';
}

export interface StaffMember {
  id: number;
  name: string;
  department: 'Front Office' | 'Housekeeping' | 'Food & Beverage' | 'Kitchen' | 'Finance' | 'Maintenance';
  role: string;
  shift: 'Morning (06:00-14:00)' | 'Evening (14:00-22:00)' | 'Night (22:00-06:00)' | 'General (08:00-17:00)';
  phone: string;
  status: 'Active' | 'On Leave' | 'Off Duty';
}
