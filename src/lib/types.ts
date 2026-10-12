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

export interface RoomDailySale {
  reservationId: number;
  bookingRef: string;
  roomNumber: string;
  roomType: string;
  guestName: string;
  guestPhone?: string;
  idNumber?: string;
  idType?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rate: number;
  total: number;
  depositPaid: number;
  balanceDue: number;
  mealPlan?: MealPlan | string;
  paymentStatus: string;
  status: string;
}

export interface DailyReportSummary {
  date: string;
  totalRevenue: number;
  totalCogs: number;
  netProfit: number;
  totalOrders: number;
  roomRevenue: number;
  foodRevenue: number;
  otherRevenue: number;
  totalLodgingBookings: number;
  roomSales: RoomDailySale[];
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

export type RoomType =
  | 'Standard Single'
  | 'Deluxe Double'
  | 'King Size Deluxe'
  | 'Executive Suite'
  | 'Presidential Suite'
  | 'Family Suite'
  | 'Twin Bedroom'
  | 'Studio Suite'
  | string;

export interface Room {
  id: number;
  roomNumber: string;
  type: string;
  floor: number;
  pricePerNight: number;
  capacity: number;
  status: RoomStatus;
  amenities: string[];
  currentGuestName?: string;
  currentGuestPhone?: string;
  currentGuestIdNumber?: string;
  currentGuestIdType?: string;
  currentIdImageUrl?: string;
  currentCheckIn?: string;
  currentCheckOut?: string;
  currentReservationId?: number;
}

export type MealPlan =
  | 'Room Only'
  | 'Bed & Breakfast (BB)'
  | 'Half Board (HB)'
  | 'Full Board (FB)'
  | 'All-Inclusive';

export interface HotelContract {
  id: number;
  contractNumber: string;
  name?: string;
  clientName: string;
  clientType: 'Corporate' | 'Airline' | 'Government / NGO' | 'Travel Agency' | 'VIP Client' | 'NGO / UN' | 'Long-term Lodging';
  contactPerson: string;
  phone: string;
  email?: string;
  roomType: string;
  agreedRate: number;
  mealPlan: MealPlan;
  includedAmenities: string[];
  discountPercentage?: number;
  startDate: string;
  endDate: string;
  notes?: string;
  status: 'Active' | 'Expired' | 'Terminated';
  createdBy?: string;
  createdAt?: string;
}

export interface Guest {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  idPassportNumber: string;
  idType: 'National ID (Fayda / FIN)' | 'National ID' | 'Passport' | 'Driver License' | 'Kebele Resident ID' | string;
  dateOfBirth?: string;
  idImageUrl?: string;
  nationality: string;
  vipStatus: boolean;
  totalStays: number;
  totalSpent: number;
  notes?: string;
}

export type ReservationStatus = 'Reserved' | 'Checked-In' | 'Checked-Out' | 'Cancelled' | 'No-Show';

export type BookingSource =
  | 'Direct Walk-in'
  | 'Hotel Website'
  | 'Booking.com'
  | 'Expedia'
  | 'Agoda'
  | 'Corporate Partner'
  | 'Special Contract';

export interface Reservation {
  id: number;
  bookingRef: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  idNumber?: string;
  idType?: string;
  idImageUrl?: string;
  dateOfBirth?: string;
  nationality?: string;
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
  contractId?: number;
  contractName?: string;
  mealPlan?: MealPlan;
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

export type EventHallType = 
  | 'Grand Ballroom'
  | 'Executive Boardroom'
  | 'Conference Hall'
  | 'Banquet Venue'
  | 'Meeting Room'
  | 'Outdoor / Garden Pavilion'
  | 'Auditorium'
  | 'VIP Lounge';

export interface EventHall {
  id: number;
  name: string;
  hallType?: EventHallType | string;
  capacity: number;
  hourlyRate: number;
  dailyRate: number;
  location?: string;
  amenities: string[];
  description?: string;
  status: 'Available' | 'Maintenance' | 'Booked';
  createdAt?: string;
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
  department: string;
  role: string;
  shift: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Off Duty' | 'Suspended' | 'Terminated';
}

export type EmployeeType = 'Full-time' | 'Part-time' | 'Casual' | 'Contract' | 'Intern';
export type EmploymentStatus = 'Active' | 'On Leave' | 'Suspended' | 'Terminated';

export interface Employee {
  id: number;
  staffCode: string;
  fullName: string;
  photoUrl?: string;
  nationality: string;
  phone: string;
  altPhone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  department: string;
  jobTitle: string;
  employeeType: EmployeeType;
  startDate: string;
  contractEndDate?: string;
  status: EmploymentStatus;
  supervisorName?: string;
  location: string;
  normalWeeklyHours: number;
  salary?: number;
  notes?: string;
  idType?: string;
  idNumberDoc?: string;
  idExpiryDate?: string;
  workPermitNumber?: string;
  createdAt: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  managerName?: string;
  description: string;
  minStaffPerShift: {
    morning: number;
    evening: number;
    night: number;
    general: number;
  };
  isActive: boolean;
  createdAt: string;
}

export interface ShiftStaff {
  employeeId: number;
  staffCode: string;
  name: string;
  role: string;
}

export interface Shift {
  id: number;
  shiftCode: string;
  shiftName: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  assignedStaff: ShiftStaff[];
  supervisorName?: string;
  location: string;
  relatedEventId?: number;
  relatedEventTitle?: string;
  status: 'Draft' | 'Published' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export interface DutyAssignment {
  id: number;
  dutyCode: string;
  title: string;
  instructions: string;
  department: string;
  employeeId?: number;
  employeeName: string;
  date: string;
  time?: string;
  location: string;
  shiftId?: number;
  relatedEventId?: number;
  relatedEventTitle?: string;
  supervisor: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  completionNotes?: string;
  createdAt: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Late'
  | 'Early Departure'
  | 'Absent'
  | 'On Leave'
  | 'Missed Clock-Out'
  | 'Overtime';

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  department: string;
  date: string;
  shiftId?: number;
  clockInTime?: string;
  clockOutTime?: string;
  breakMinutes: number;
  scheduledHours: number;
  actualHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isManuallyCorrected: boolean;
  correctionReason?: string;
  correctedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

export type LeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Emergency Leave'
  | 'Unpaid Leave'
  | 'Maternity / Paternity'
  | 'Compensatory Off';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  id: number;
  requestCode: string;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewDate?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface Qualification {
  id: number;
  _id?: string;
  employeeId: number;
  staffCode: string;
  employeeName: string;
  title: string;
  category: string;
  issuingBody: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  verificationStatus: 'Verified' | 'Pending Verification' | 'Expired';
  notes?: string;
  createdAt: string;
}

export interface HrReminder {
  id: number;
  title: string;
  description: string;
  category: 'Operational' | 'Staff Meeting' | 'Event Prep' | 'Compliance' | 'Maintenance' | 'General';
  date: string;
  time?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  targetDepartment?: string;
  assignedToName?: string;
  isCompleted: boolean;
  relatedEventId?: number;
  relatedEventTitle?: string;
  createdBy: string;
  createdAt: string;
}
