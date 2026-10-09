import {
  AuditLog,
  Category,
  HotelSettings,
  Ingredient,
  InventoryLog,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Recipe,
  SystemUser,
  Waiter,
  Room,
  Guest,
  Reservation,
  FolioTransaction,
  HousekeepingTask,
  EventHall,
  EventBooking,
  StaffMember,
  RoomStatus,
} from './types';

// In-Memory Database Store with Seed Data (matches ZemenServe C# specs)
class ZemenServeStore {
  private settings: HotelSettings = {
    hotelName: 'Zemen Grand Hotel & Restaurant',
    address: 'Bole Medhanealem, Addis Ababa, Ethiopia',
    phone: '+251 911 123 456',
    currency: 'ETB',
    vatRate: 15.0,
    lanHostIp: '192.168.1.10:5000',
    adminPin: '1234',
  };

  private systemUsers: SystemUser[] = [
    { id: 1, username: 'admin', name: 'General Manager', role: 'Admin', pin: '1234', isActive: true },
    { id: 2, username: 'supervisor', name: 'Almaz Tadesse', role: 'Manager', pin: '5555', isActive: true },
    { id: 3, username: 'cashier1', name: 'Abebe Kebede', role: 'Cashier', pin: '1111', isActive: true },
    { id: 4, username: 'chef1', name: 'Chef Yonas', role: 'Chef', pin: '2222', isActive: true },
    { id: 5, username: 'reception', name: 'Hiwot Tadesse', role: 'Receptionist', pin: '3333', isActive: true },
    { id: 6, username: 'housekeeper', name: 'Tigist Haile', role: 'Housekeeper', pin: '4444', isActive: true },
    { id: 7, username: 'accountant', name: 'Almaz Tadesse', role: 'Accountant', pin: '5555', isActive: true },
  ];

  private rooms: Room[] = [
    { id: 1, roomNumber: '101', type: 'Standard Single', floor: 1, pricePerNight: 2500, capacity: 1, status: 'Occupied', amenities: ['Free Wi-Fi', 'TV', 'Ensuite Bathroom'], currentGuestName: 'Dawit Yohannes', currentReservationId: 101 },
    { id: 2, roomNumber: '102', type: 'Standard Single', floor: 1, pricePerNight: 2500, capacity: 1, status: 'Clean', amenities: ['Free Wi-Fi', 'TV', 'Ensuite Bathroom'] },
    { id: 3, roomNumber: '103', type: 'Deluxe Double', floor: 1, pricePerNight: 4000, capacity: 2, status: 'Occupied', amenities: ['Free Wi-Fi', '4K Smart TV', 'Balcony', 'MiniBar'], currentGuestName: 'Sarah Jenkins', currentReservationId: 102 },
    { id: 4, roomNumber: '104', type: 'Deluxe Double', floor: 1, pricePerNight: 4000, capacity: 2, status: 'Dirty', amenities: ['Free Wi-Fi', '4K Smart TV', 'Balcony', 'MiniBar'] },
    { id: 5, roomNumber: '201', type: 'Executive Suite', floor: 2, pricePerNight: 8500, capacity: 3, status: 'Occupied', amenities: ['Free Wi-Fi', 'Jacuzzi', 'Living Lounge', 'Espresso Machine', 'City View'], currentGuestName: 'Ato Solomon Bekele', currentReservationId: 103 },
    { id: 6, roomNumber: '202', type: 'Executive Suite', floor: 2, pricePerNight: 8500, capacity: 3, status: 'Inspected', amenities: ['Free Wi-Fi', 'Jacuzzi', 'Living Lounge', 'Espresso Machine', 'City View'] },
    { id: 7, roomNumber: '301', type: 'Presidential Suite', floor: 3, pricePerNight: 18000, capacity: 4, status: 'Clean', amenities: ['24/7 Butler', 'Panoramic View', 'Private Bar', 'Jacuzzi', 'Meeting Area'] },
    { id: 8, roomNumber: '302', type: 'Family Suite', floor: 3, pricePerNight: 7000, capacity: 4, status: 'Out of Service', amenities: ['2 Bedrooms', 'Kitchenette', 'Free Wi-Fi', 'Playstation 5'] },
  ];

  private guests: Guest[] = [
    { id: 1, fullName: 'Dawit Yohannes', email: 'dawit.y@example.com', phone: '+251 911 223 344', idPassportNumber: 'ETH-849204', idType: 'National ID', nationality: 'Ethiopian', vipStatus: true, totalStays: 5, totalSpent: 42500, notes: 'Prefers high floor rooms' },
    { id: 2, fullName: 'Sarah Jenkins', email: 'sarah.j@travel.com', phone: '+1 415 555 0192', idPassportNumber: 'USA-992014', idType: 'Passport', nationality: 'United States', vipStatus: false, totalStays: 2, totalSpent: 18400, notes: 'Allergic to nuts' },
    { id: 3, fullName: 'Ato Solomon Bekele', email: 'solomon@bekelegroup.et', phone: '+251 912 345 678', idPassportNumber: 'ETH-102938', idType: 'National ID', nationality: 'Ethiopian', vipStatus: true, totalStays: 12, totalSpent: 128000, notes: 'Corporate VIP Account' },
  ];

  private reservations: Reservation[] = [
    { id: 101, bookingRef: 'RES-8491', guestId: 1, guestName: 'Dawit Yohannes', guestPhone: '+251 911 223 344', roomId: 1, roomNumber: '101', roomType: 'Standard Single', checkInDate: '2026-10-08', checkOutDate: '2026-10-11', nights: 3, numberOfGuests: 1, status: 'Checked-In', bookingSource: 'Direct Walk-in', nightlyRate: 2500, totalAmount: 7500, depositPaid: 2500, paymentStatus: 'Partial', createdAt: '2026-10-08T10:00:00.000Z' },
    { id: 102, bookingRef: 'RES-8492', guestId: 2, guestName: 'Sarah Jenkins', guestPhone: '+1 415 555 0192', roomId: 3, roomNumber: '103', roomType: 'Deluxe Double', checkInDate: '2026-10-09', checkOutDate: '2026-10-13', nights: 4, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Booking.com', nightlyRate: 4000, totalAmount: 16000, depositPaid: 16000, paymentStatus: 'Paid', createdAt: '2026-10-09T09:30:00.000Z' },
    { id: 103, bookingRef: 'RES-8493', guestId: 3, guestName: 'Ato Solomon Bekele', guestPhone: '+251 912 345 678', roomId: 5, roomNumber: '201', roomType: 'Executive Suite', checkInDate: '2026-10-07', checkOutDate: '2026-10-12', nights: 5, numberOfGuests: 2, status: 'Checked-In', bookingSource: 'Corporate Partner', nightlyRate: 8500, totalAmount: 42500, depositPaid: 20000, paymentStatus: 'Partial', createdAt: '2026-10-07T14:00:00.000Z' },
  ];

  private folioTransactions: FolioTransaction[] = [
    { id: 1, reservationId: 101, roomNumber: '101', guestName: 'Dawit Yohannes', category: 'Room Charge', description: 'Room Charge - 3 Nights @ 2500 ETB/Night', amount: 7500, type: 'Debit', timestamp: '2026-10-08T10:00:00.000Z', postedBy: 'Front Desk' },
    { id: 2, reservationId: 101, roomNumber: '101', guestName: 'Dawit Yohannes', category: 'Payment Deposit', description: 'Advance Deposit Received (Telebirr)', amount: 2500, type: 'Credit', paymentMethod: 'Telebirr', timestamp: '2026-10-08T10:05:00.000Z', postedBy: 'Front Desk' },
    { id: 3, reservationId: 102, roomNumber: '103', guestName: 'Sarah Jenkins', category: 'Room Charge', description: 'Room Charge - 4 Nights @ 4000 ETB/Night', amount: 16000, type: 'Debit', timestamp: '2026-10-09T09:30:00.000Z', postedBy: 'Front Desk' },
    { id: 4, reservationId: 102, roomNumber: '103', guestName: 'Sarah Jenkins', category: 'Payment Deposit', description: 'Full Payment Received (Visa Card)', amount: 16000, type: 'Credit', paymentMethod: 'Card', timestamp: '2026-10-09T09:35:00.000Z', postedBy: 'Front Desk' },
  ];

  private housekeepingTasks: HousekeepingTask[] = [
    { id: 1, roomNumber: '104', taskType: 'Full Clean', priority: 'Urgent', assignedStaff: 'Tigist Haile', status: 'Pending', notes: 'Checkout cleanup needed', createdAt: '2026-10-09T09:00:00.000Z' },
    { id: 2, roomNumber: '202', taskType: 'Touch-Up', priority: 'Normal', assignedStaff: 'Aynalem Wolde', status: 'Completed', notes: 'Inspected and ready for guest', createdAt: '2026-10-09T08:00:00.000Z' },
    { id: 3, roomNumber: '302', taskType: 'Maintenance Repair', priority: 'Urgent', assignedStaff: 'Yonas Technician', status: 'In Progress', notes: 'AC compressor unit check', createdAt: '2026-10-09T07:30:00.000Z' },
  ];

  private eventHalls: EventHall[] = [
    { id: 1, name: 'Lalibela Grand Ballroom', capacity: 350, hourlyRate: 5000, dailyRate: 35000, amenities: ['4K Projector', 'Stage & Sound', 'LED Wall', 'VIP Lounge', 'High Speed Wi-Fi'], status: 'Available' },
    { id: 2, name: 'Axum Executive Conference Hall', capacity: 80, hourlyRate: 2500, dailyRate: 18000, amenities: ['Smart Board', 'Video Conferencing', 'Podium', 'Coffee Station'], status: 'Available' },
    { id: 3, name: 'Simien Boardroom', capacity: 20, hourlyRate: 1200, dailyRate: 8000, amenities: ['Leather Chairs', '65" OLED Display', 'HDMI Hub', 'Mini Fridge'], status: 'Available' },
  ];

  private eventBookings: EventBooking[] = [
    { id: 1, bookingRef: 'EVT-9001', eventTitle: 'Annual Tech Summit 2026', organizerName: 'Fintech Solutions Ltd', organizerContact: '+251 911 887 766', hallId: 1, hallName: 'Lalibela Grand Ballroom', eventDate: '2026-10-15', startTime: '09:00', endTime: '17:00', expectedAttendees: 250, setupFormat: 'Banquet', cateringPackage: 'VIP 3-Course Buffet', totalAmount: 45000, depositPaid: 20000, status: 'Confirmed' }
  ];

  private staffMembers: StaffMember[] = [
    { id: 1, name: 'Tigist Haile', department: 'Housekeeping', role: 'Housekeeper Lead', shift: 'Morning (06:00-14:00)', phone: '+251 911 112 233', status: 'Active' },
    { id: 2, name: 'Abebe Kebede', department: 'Front Office', role: 'Senior Receptionist', shift: 'Morning (06:00-14:00)', phone: '+251 922 334 455', status: 'Active' },
    { id: 3, name: 'Almaz Tadesse', department: 'Finance', role: 'Financial Accountant', shift: 'General (08:00-17:00)', phone: '+251 933 445 566', status: 'Active' },
    { id: 4, name: 'Yonas Technician', department: 'Maintenance', role: 'Chief Engineer', shift: 'General (08:00-17:00)', phone: '+251 944 556 677', status: 'Active' },
  ];

  private auditLogs: AuditLog[] = [];

  private categories: Category[] = [
    { id: 1, name: 'Traditional Dishes', isActive: true },
    { id: 2, name: 'Western / Fast Food', isActive: true },
    { id: 3, name: 'Beverages', isActive: true },
    { id: 4, name: 'Desserts & Snacks', isActive: true },
  ];

  private waiters: Waiter[] = [
    { id: 1, name: 'Abebe Kebede', isActive: true },
    { id: 2, name: 'Tigist Haile', isActive: true },
    { id: 3, name: 'Dawit Yilma', isActive: true },
    { id: 4, name: 'Helen Tadesse', isActive: true },
  ];

  private ingredients: Ingredient[] = [
    { id: 1, name: 'Beef Meat', unit: 'kg', costPerUnit: 450.0, stockQuantity: 25.0, lowStockThreshold: 5.0 },
    { id: 2, name: 'Whole Chicken', unit: 'pcs', costPerUnit: 600.0, stockQuantity: 15.0, lowStockThreshold: 3.0 },
    { id: 3, name: 'Onions', unit: 'kg', costPerUnit: 60.0, stockQuantity: 50.0, lowStockThreshold: 10.0 },
    { id: 4, name: 'Berbere Spice', unit: 'kg', costPerUnit: 350.0, stockQuantity: 10.0, lowStockThreshold: 2.0 },
    { id: 5, name: 'Niter Kibbeh (Clarified Butter)', unit: 'kg', costPerUnit: 700.0, stockQuantity: 8.0, lowStockThreshold: 2.0 },
    { id: 6, name: 'Shiro Powder', unit: 'kg', costPerUnit: 250.0, stockQuantity: 20.0, lowStockThreshold: 4.0 },
    { id: 7, name: 'Burger Buns', unit: 'pcs', costPerUnit: 25.0, stockQuantity: 40.0, lowStockThreshold: 10.0 },
    { id: 8, name: 'Cheese Slices', unit: 'pcs', costPerUnit: 35.0, stockQuantity: 50.0, lowStockThreshold: 10.0 },
    { id: 9, name: 'Ethiopian Roasted Coffee Beans', unit: 'kg', costPerUnit: 500.0, stockQuantity: 12.0, lowStockThreshold: 2.5 },
    { id: 10, name: 'Fresh Milk', unit: 'L', costPerUnit: 75.0, stockQuantity: 30.0, lowStockThreshold: 5.0 },
    { id: 11, name: 'Soft Drink 330ml Bottle', unit: 'pcs', costPerUnit: 30.0, stockQuantity: 120.0, lowStockThreshold: 20.0 },
    { id: 12, name: 'Ambo Mineral Water 500ml', unit: 'pcs', costPerUnit: 25.0, stockQuantity: 100.0, lowStockThreshold: 15.0 },
  ];

  private menuItems: MenuItem[] = [
    { id: 1, name: 'Special Beef Tibs', category: 'Traditional Dishes', price: 480.0, isActive: true },
    { id: 2, name: 'Doro Wot', category: 'Traditional Dishes', price: 550.0, isActive: true },
    { id: 3, name: 'Shiro Tegabeno', category: 'Traditional Dishes', price: 250.0, isActive: true },
    { id: 4, name: 'Veggie Beyaynetu', category: 'Traditional Dishes', price: 280.0, isActive: true },
    { id: 5, name: 'Special Cheese Burger', category: 'Western / Fast Food', price: 380.0, isActive: true },
    { id: 6, name: 'Club Sandwich', category: 'Western / Fast Food', price: 340.0, isActive: true },
    { id: 7, name: 'Ethiopian Coffee (Buna)', category: 'Beverages', price: 35.0, isActive: true },
    { id: 8, name: 'Macchiato', category: 'Beverages', price: 50.0, isActive: true },
    { id: 9, name: 'Coca Cola / Fanta / Sprite', category: 'Beverages', price: 45.0, isActive: true },
    { id: 10, name: 'Ambo Mineral Water', category: 'Beverages', price: 35.0, isActive: true },
  ];

  private recipes: Recipe[] = [
    { id: 1, menuItemId: 1, ingredientId: 1, quantityRequired: 0.35 },
    { id: 2, menuItemId: 1, ingredientId: 3, quantityRequired: 0.10 },
    { id: 3, menuItemId: 1, ingredientId: 5, quantityRequired: 0.05 },
    { id: 4, menuItemId: 2, ingredientId: 2, quantityRequired: 0.25 },
    { id: 5, menuItemId: 2, ingredientId: 3, quantityRequired: 0.20 },
    { id: 6, menuItemId: 2, ingredientId: 4, quantityRequired: 0.04 },
    { id: 7, menuItemId: 2, ingredientId: 5, quantityRequired: 0.04 },
    { id: 8, menuItemId: 3, ingredientId: 6, quantityRequired: 0.12 },
    { id: 9, menuItemId: 3, ingredientId: 3, quantityRequired: 0.05 },
    { id: 10, menuItemId: 3, ingredientId: 5, quantityRequired: 0.03 },
    { id: 11, menuItemId: 5, ingredientId: 1, quantityRequired: 0.20 },
    { id: 12, menuItemId: 5, ingredientId: 7, quantityRequired: 1.0 },
    { id: 13, menuItemId: 5, ingredientId: 8, quantityRequired: 1.0 },
    { id: 14, menuItemId: 7, ingredientId: 9, quantityRequired: 0.02 },
    { id: 15, menuItemId: 8, ingredientId: 9, quantityRequired: 0.02 },
    { id: 16, menuItemId: 8, ingredientId: 10, quantityRequired: 0.15 },
    { id: 17, menuItemId: 9, ingredientId: 11, quantityRequired: 1.0 },
    { id: 18, menuItemId: 10, ingredientId: 12, quantityRequired: 1.0 },
  ];

  private orders: Order[] = [];

  private inventoryLogs: InventoryLog[] = [];

  private nextOrderId = 1;
  private nextInventoryLogId = 1;
  private nextMenuItemId = 11;
  private nextIngredientId = 13;
  private nextAuditLogId = 1;

  private listeners: (() => void)[] = [];

  private lastFetchTime = {
    orders: 0,
    menu: 0,
    ingredients: 0,
    logs: 0,
    audit: 0,
    waiters: 0,
  };
  private readonly CACHE_TTL_MS = 15000; // 15s in-memory cache TTL

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zemenserve_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...this.settings, ...parsed };
        }
      } catch {
        // Fallback to default settings
      }
    }
  }

  // --- ADMIN & SETTINGS METHODS ---
  public getSettings(): HotelSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<HotelSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zemenserve_settings', JSON.stringify(this.settings));
      } catch (err) {
        console.error('Failed to save settings to localStorage:', err);
      }
    }
    this.logAudit('Admin', 'Settings Update', `Updated system configuration & LAN IP ${this.settings.lanHostIp}`);
    this.notify();
  }

  public verifyAdminPin(pin: string): boolean {
    if (!pin) return false;
    return pin.trim() === this.settings.adminPin;
  }

  public getSystemUsers(): SystemUser[] {
    return [...this.systemUsers];
  }

  public addSystemUser(user: Omit<SystemUser, 'id'>): SystemUser {
    const newUser: SystemUser = {
      ...user,
      id: this.systemUsers.length + 1,
    };
    this.systemUsers.push(newUser);
    this.logAudit('Admin', 'Add User', `Created staff account: ${user.name} (${user.role})`);
    this.notify();
    return newUser;
  }

  public toggleUserActive(id: number): void {
    const u = this.systemUsers.find((user) => user.id === id);
    if (u) {
      u.isActive = !u.isActive;
      this.logAudit('Admin', 'User Status Toggle', `Toggled ${u.name} active state to ${u.isActive}`);
      this.notify();
    }
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public logAudit(user: string, action: string, details: string): void {
    const newLog = {
      id: this.nextAuditLogId++,
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
    };
    this.auditLogs.unshift(newLog);

    if (typeof window !== 'undefined') {
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, action, details }),
      }).catch((err) => console.error('Error persisting audit log to database:', err));
    }
  }

  public updateMenuItemPrice(id: number, newPrice: number): void {
    const item = this.menuItems.find((m) => m.id === id);
    if (item) {
      const oldPrice = item.price;
      item.price = newPrice;
      this.logAudit('Admin', 'Price Adjustment', `Changed ${item.name} price from ${oldPrice} to ${newPrice} ETB`);
      this.notify();
    }
  }

  public setIngredientStockDirect(id: number, newStock: number, reason: string): void {
    const ing = this.ingredients.find((i) => i.id === id);
    if (ing) {
      const delta = newStock - ing.stockQuantity;
      ing.stockQuantity = newStock;
      this.inventoryLogs.unshift({
        id: this.nextInventoryLogId++,
        ingredientId: ing.id,
        ingredientName: ing.name,
        changeAmount: delta,
        reason: `[Admin Override] ${reason || 'Manual Inventory Adjustment'}`,
        timestamp: new Date().toISOString(),
      });
      this.logAudit('Admin', 'Stock Correction', `Adjusted ${ing.name} stock to ${newStock} ${ing.unit}`);
      this.notify();
    }
  }

  // --- POS, KITCHEN & INVENTORY METHODS ---
  public getCategories(): Category[] {
    return [...this.categories];
  }

  public addCategory(name: string): Category {
    const trimmed = name.trim();
    const existing = this.categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const newCat: Category = {
      id: this.categories.length + 1,
      name: trimmed,
      isActive: true,
    };
    this.categories.push(newCat);
    this.logAudit('Admin', 'Add Category', `Added category ${trimmed}`);
    this.notify();
    return newCat;
  }

  public updateCategory(id: number, newName: string): void {
    const cat = this.categories.find((c) => c.id === id);
    if (cat) {
      const oldName = cat.name;
      cat.name = newName.trim();
      this.menuItems.forEach((m) => {
        if (m.category === oldName) {
          m.category = cat.name;
        }
      });
      this.logAudit('Admin', 'Update Category', `Renamed category from ${oldName} to ${cat.name}`);
      this.notify();
    }
  }

  public deleteCategory(id: number): void {
    const cat = this.categories.find((c) => c.id === id);
    if (cat) {
      this.categories = this.categories.filter((c) => c.id !== id);
      this.logAudit('Admin', 'Delete Category', `Deleted category ${cat.name}`);
      this.notify();
    }
  }

  public getWaiters(): Waiter[] {
    return [...this.waiters];
  }

  public addWaiter(name: string): Waiter {
    const newWaiter: Waiter = {
      id: this.waiters.length + 1,
      name,
      isActive: true,
    };
    this.waiters.push(newWaiter);
    this.logAudit('Admin', 'Add Waiter', `Added waiter ${name}`);
    this.notify();
    return newWaiter;
  }

  public getMenuItems(): MenuItem[] {
    return this.menuItems.map((item) => ({
      ...item,
      recipes: this.recipes.filter((r) => r.menuItemId === item.id),
    }));
  }

  public addMenuItem(item: Omit<MenuItem, 'id'>, itemRecipes?: { ingredientId: number; quantityRequired: number }[]): MenuItem {
    const newItem: MenuItem = {
      ...item,
      id: this.nextMenuItemId++,
    };
    this.menuItems.push(newItem);

    if (itemRecipes) {
      itemRecipes.forEach((r) => {
        this.recipes.push({
          id: this.recipes.length + 1,
          menuItemId: newItem.id,
          ingredientId: r.ingredientId,
          quantityRequired: r.quantityRequired,
        });
      });
    }

    this.logAudit('Admin', 'Add Menu Item', `Added ${newItem.name} under ${newItem.category}`);
    this.notify();
    return newItem;
  }

  public updateMenuItem(
    id: number,
    updated: Partial<MenuItem>,
    itemRecipes?: { ingredientId: number; quantityRequired: number }[]
  ): void {
    const item = this.menuItems.find((m) => m.id === id);
    if (item) {
      if (updated.name) item.name = updated.name;
      if (updated.category) item.category = updated.category;
      if (updated.price !== undefined) item.price = updated.price;
      if (updated.isActive !== undefined) item.isActive = updated.isActive;

      if (itemRecipes !== undefined) {
        this.recipes = this.recipes.filter((r) => r.menuItemId !== id);
        itemRecipes.forEach((r) => {
          this.recipes.push({
            id: this.recipes.length + 1,
            menuItemId: id,
            ingredientId: r.ingredientId,
            quantityRequired: r.quantityRequired,
          });
        });
      }
      this.logAudit('Admin', 'Update Menu Item', `Updated ${item.name}`);
      this.notify();
    }
  }

  public deleteMenuItem(id: number): void {
    const item = this.menuItems.find((m) => m.id === id);
    if (item) {
      this.menuItems = this.menuItems.filter((m) => m.id !== id);
      this.recipes = this.recipes.filter((r) => r.menuItemId !== id);
      this.logAudit('Admin', 'Delete Menu Item', `Deleted ${item.name}`);
      this.notify();
    }
  }

  public toggleMenuItemActive(id: number): void {
    const item = this.menuItems.find((m) => m.id === id);
    if (item) {
      item.isActive = !item.isActive;
      this.notify();
    }
  }

  public async fetchIngredientsFromDB(force = false): Promise<Ingredient[]> {
    if (typeof window === 'undefined') return [...this.ingredients];
    const now = Date.now();
    if (!force && now - this.lastFetchTime.ingredients < this.CACHE_TTL_MS) {
      return [...this.ingredients];
    }
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) return [...this.ingredients];
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.ingredients)) {
          this.ingredients = data.ingredients;
          this.lastFetchTime.ingredients = now;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: return current in-memory ingredients silently
    }
    return [...this.ingredients];
  }

  public async fetchLogsFromDB(force = false): Promise<InventoryLog[]> {
    if (typeof window === 'undefined') return [...this.inventoryLogs];
    const now = Date.now();
    if (!force && now - this.lastFetchTime.logs < this.CACHE_TTL_MS) {
      return [...this.inventoryLogs];
    }
    try {
      const res = await fetch('/api/inventory/logs');
      if (!res.ok) return [...this.inventoryLogs];
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          this.inventoryLogs = data.logs;
          this.lastFetchTime.logs = now;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: return current in-memory inventory logs silently
    }
    return [...this.inventoryLogs];
  }

  public async fetchOrdersFromDB(force = false): Promise<Order[]> {
    if (typeof window === 'undefined') return [...this.orders];
    const now = Date.now();
    if (!force && now - this.lastFetchTime.orders < this.CACHE_TTL_MS) {
      return [...this.orders];
    }
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return [...this.orders];
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          this.orders = data.orders;
          this.lastFetchTime.orders = now;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: return current in-memory orders silently
    }
    return [...this.orders];
  }

  public async fetchMenuFromDB(force = false): Promise<{ categories: Category[]; menuItems: MenuItem[] }> {
    if (typeof window === 'undefined') return { categories: [...this.categories], menuItems: [...this.menuItems] };
    const now = Date.now();
    if (!force && now - this.lastFetchTime.menu < this.CACHE_TTL_MS) {
      return { categories: [...this.categories], menuItems: [...this.menuItems] };
    }
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) return { categories: [...this.categories], menuItems: [...this.menuItems] };
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            this.categories = data.categories;
          }
          if (Array.isArray(data.menuItems) && data.menuItems.length > 0) {
            this.menuItems = data.menuItems;
            const extractedRecipes: Recipe[] = [];
            data.menuItems.forEach((m: any) => {
              if (Array.isArray(m.recipes)) {
                extractedRecipes.push(...m.recipes);
              }
            });
            if (extractedRecipes.length > 0) {
              this.recipes = extractedRecipes;
            }
          }
          this.lastFetchTime.menu = now;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: return current in-memory menu silently
    }
    return { categories: [...this.categories], menuItems: [...this.menuItems] };
  }

  public async fetchAuditLogsFromDB(force = false): Promise<AuditLog[]> {
    if (typeof window === 'undefined') return [...this.auditLogs];
    const now = Date.now();
    if (!force && now - this.lastFetchTime.audit < this.CACHE_TTL_MS) {
      return [...this.auditLogs];
    }
    try {
      const res = await fetch('/api/audit');
      if (!res.ok) return [...this.auditLogs];
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          this.auditLogs = data.logs;
          this.lastFetchTime.audit = now;
          this.notify();
        }
      }
    } catch {
      // Offline fallback: return current in-memory audit logs silently
    }
    return [...this.auditLogs];
  }

  public getIngredients(): Ingredient[] {
    return [...this.ingredients];
  }

  public addIngredient(ing: Omit<Ingredient, 'id'>): Ingredient {
    const tempId = this.nextIngredientId++;
    const newIng: Ingredient = {
      ...ing,
      id: tempId,
    };
    this.ingredients.push(newIng);
    this.logAudit('Admin', 'Add Ingredient', `Created ingredient ${newIng.name}`);
    this.notify();

    // Persist to database async
    if (typeof window !== 'undefined') {
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.ingredient) {
            const index = this.ingredients.findIndex((i) => i.id === tempId);
            if (index !== -1) {
              this.ingredients[index] = data.ingredient;
              this.notify();
            }
          }
        })
        .catch((err) => console.error('Error persisting ingredient to database:', err));
    }

    return newIng;
  }

  public restockIngredient(id: number, quantity: number, reason: string, newCostPerUnit?: number): void {
    const ing = this.ingredients.find((i) => i.id === id);
    if (ing) {
      ing.stockQuantity += quantity;
      
      let logNote = reason || 'Stock Restock';
      if (newCostPerUnit !== undefined && !isNaN(newCostPerUnit) && newCostPerUnit !== ing.costPerUnit) {
        logNote = `[Cost Adjusted: ${ing.costPerUnit} ➔ ${newCostPerUnit} ETB] ${logNote}`;
        ing.costPerUnit = newCostPerUnit;
      }

      this.inventoryLogs.unshift({
        id: this.nextInventoryLogId++,
        ingredientId: ing.id,
        ingredientName: ing.name,
        changeAmount: quantity,
        reason: logNote,
        timestamp: new Date().toISOString(),
      });
      this.notify();

      // Persist restock to database async
      if (typeof window !== 'undefined') {
        fetch('/api/inventory/restock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, quantity, reason, newCostPerUnit }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.ingredient) {
              const index = this.ingredients.findIndex((i) => i.id === id);
              if (index !== -1) {
                this.ingredients[index] = data.ingredient;
                this.notify();
              }
            }
          })
          .catch((err) => console.error('Error persisting restock to database:', err));
      }
    }
  }

  public updateIngredient(updated: Partial<Ingredient> & { id: number }): void {
    const index = this.ingredients.findIndex((i) => i.id === updated.id);
    if (index !== -1) {
      this.ingredients[index] = { ...this.ingredients[index], ...updated };
      this.logAudit('Admin', 'Update Ingredient', `Updated ${this.ingredients[index].name} details`);
      this.notify();

      if (typeof window !== 'undefined') {
        fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.ingredient) {
              this.ingredients[index] = data.ingredient;
              this.notify();
            }
          })
          .catch((err) => console.error('Error updating ingredient in database:', err));
      }
    }
  }

  public deleteIngredient(id: number): void {
    const ing = this.ingredients.find((i) => i.id === id);
    if (ing) {
      this.ingredients = this.ingredients.filter((i) => i.id !== id);
      this.logAudit('Admin', 'Delete Ingredient', `Deleted ${ing.name}`);
      this.notify();

      if (typeof window !== 'undefined') {
        fetch(`/api/inventory?id=${id}`, { method: 'DELETE' })
          .then((res) => res.json())
          .catch((err) => console.error('Error deleting ingredient from database:', err));
      }
    }
  }

  public getInventoryLogs(): InventoryLog[] {
    return [...this.inventoryLogs];
  }

  public getRecipes(): Recipe[] {
    return [...this.recipes];
  }

  public getItemCost(menuItemId: number): number {
    const itemRecipes = this.recipes.filter((r) => r.menuItemId === menuItemId);
    let totalCost = 0;
    for (const r of itemRecipes) {
      const ing = this.ingredients.find((i) => i.id === r.ingredientId);
      if (ing) {
        totalCost += ing.costPerUnit * r.quantityRequired;
      }
    }
    return totalCost;
  }

  public getOrders(): Order[] {
    return [...this.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: number): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  public getActiveOrders(): Order[] {
    // FIFO sorting: oldest active order first; filter out paid, served, and cancelled orders
    return this.orders
      .filter((o) => !o.isPaid && o.status !== 'Served' && o.status !== 'Cancelled')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async fetchWaitersFromDB(): Promise<Waiter[]> {
    if (typeof window === 'undefined') return [...this.waiters];
    try {
      const res = await fetch('/api/admin/users');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const dbWaiters = data.users
            .filter((u: any) => u.role === 'Waiter' && u.isActive)
            .map((u: any, idx: number) => ({
              id: idx + 1,
              name: u.name,
              isActive: u.isActive,
            }));
          if (dbWaiters.length > 0) {
            this.waiters = dbWaiters;
            this.notify();
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync waiters from database:', err);
    }
    return [...this.waiters];
  }

  public createActiveOrder(
    cartItems: { menuItemId: number; quantity: number }[],
    cashierNote?: string,
    waiterId?: number,
    tableNumber?: string
  ): Order {
    const waiter = this.waiters.find((w) => w.id === waiterId);
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    cartItems.forEach((cartItem, idx) => {
      const menuItem = this.menuItems.find((m) => m.id === cartItem.menuItemId);
      if (!menuItem) return;

      const unitPrice = menuItem.price;
      totalAmount += unitPrice * cartItem.quantity;

      orderItems.push({
        id: idx + 1,
        orderId: this.nextOrderId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: cartItem.quantity,
        unitPriceAtSale: unitPrice,
      });

      // Deduct stock for ordered item ingredients
      const itemRecipes = this.recipes.filter((r) => r.menuItemId === menuItem.id);
      for (const recipe of itemRecipes) {
        const ing = this.ingredients.find((i) => i.id === recipe.ingredientId);
        if (ing) {
          const totalDeduction = recipe.quantityRequired * cartItem.quantity;
          ing.stockQuantity = Math.max(0, ing.stockQuantity - totalDeduction);

          this.inventoryLogs.unshift({
            id: this.nextInventoryLogId++,
            ingredientId: ing.id,
            ingredientName: ing.name,
            changeAmount: -totalDeduction,
            reason: `Active Order #${this.nextOrderId} (${cartItem.quantity}x ${menuItem.name})`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    const newOrder: Order = {
      id: this.nextOrderId++,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      totalAmount,
      cashierNote: cashierNote || (tableNumber ? `Table ${tableNumber}` : 'Dine-In'),
      waiterId: waiter?.id,
      waiterName: waiter?.name || 'Staff',
      isPaid: false,
      orderItems,
    };

    this.orders.unshift(newOrder);
    this.logAudit('Cashier', 'Create Active Order', `Created Active Order #${newOrder.id} (${waiter?.name || 'Waiter'})`);
    this.notify();

    if (typeof window !== 'undefined') {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: orderItems,
          cashierNote: newOrder.cashierNote,
          waiterId: waiter?.id,
          waiterName: waiter?.name || 'Staff',
          tableNumber,
          totalAmount,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            const idx = this.orders.findIndex((o) => o.id === newOrder.id);
            if (idx !== -1) {
              this.orders[idx] = data.order;
              this.notify();
            }
          }
        })
        .catch((err) => console.error('Error persisting order to database:', err));
    }

    return newOrder;
  }

  public appendOrderItems(
    orderId: number,
    newCartItems: { menuItemId: number; quantity: number }[]
  ): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return undefined;

    newCartItems.forEach((cartItem, idx) => {
      const menuItem = this.menuItems.find((m) => m.id === cartItem.menuItemId);
      if (!menuItem) return;

      const unitPrice = menuItem.price;
      order.totalAmount += unitPrice * cartItem.quantity;

      const existingItem = order.orderItems.find((i) => i.menuItemId === menuItem.id);
      if (existingItem) {
        existingItem.quantity += cartItem.quantity;
      } else {
        const maxId = order.orderItems.reduce((max, i) => Math.max(max, i.id || 0), 0);
        order.orderItems.push({
          id: maxId + 1 + idx,
          orderId: order.id,
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          quantity: cartItem.quantity,
          unitPriceAtSale: unitPrice,
        });
      }

      // Deduct stock for newly appended ingredients
      const itemRecipes = this.recipes.filter((r) => r.menuItemId === menuItem.id);
      for (const recipe of itemRecipes) {
        const ing = this.ingredients.find((i) => i.id === recipe.ingredientId);
        if (ing) {
          const totalDeduction = recipe.quantityRequired * cartItem.quantity;
          ing.stockQuantity = Math.max(0, ing.stockQuantity - totalDeduction);

          this.inventoryLogs.unshift({
            id: this.nextInventoryLogId++,
            ingredientId: ing.id,
            ingredientName: ing.name,
            changeAmount: -totalDeduction,
            reason: `Appended Order #${order.id} (+${cartItem.quantity}x ${menuItem.name})`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    if (typeof window !== 'undefined') {
      fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderItems: order.orderItems,
          totalAmount: order.totalAmount,
        }),
      }).catch((err) => console.error('Error persisting appended order items to database:', err));
    }

    this.logAudit('Cashier', 'Append Items to Order', `Appended items to Order #${order.id}`);
    this.notify();
    return order;
  }

  public completeOrderPayment(orderId: number, paymentMethod: string = 'Cash'): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'Served';
      order.isPaid = true;
      (order as any).paymentMethod = paymentMethod;

      // Persist status change to database OrderModel
      if (typeof window !== 'undefined') {
        fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            status: 'Served',
            isPaid: true,
            paymentMethod,
          }),
        }).catch((err) => console.error('Error persisting order payment status to database:', err));

        // Persist stock deduction, inventory logs, and Daily Report to database
        const payloadItems = order.orderItems.map((item) => {
          const menuItem = this.menuItems.find((m) => m.id === item.menuItemId);
          const itemRecipes = menuItem ? this.recipes.filter((r) => r.menuItemId === menuItem.id) : [];
          return {
            menuItemId: item.menuItemId,
            name: item.menuItemName,
            category: menuItem?.category || 'General',
            quantity: item.quantity,
            unitPrice: item.unitPriceAtSale,
            unitCost: menuItem ? this.getItemCost(menuItem.id) : 0,
            recipes: itemRecipes,
          };
        });

        fetch('/api/orders/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            paymentMethod,
            totalAmount: order.totalAmount,
            items: payloadItems,
          }),
        })
          .then((res) => {
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              return res.json();
            }
            return null;
          })
          .then((data) => {
            if (data && data.success) {
              this.fetchIngredientsFromDB();
              this.fetchLogsFromDB();
            }
          })
          .catch((err) => console.error('Error syncing order payment & stock deduction to database:', err));
      }

      this.logAudit('Cashier', 'Order Payment Completed', `Completed payment for Order #${order.id} (${paymentMethod})`);
      this.notify();
    }
    return order;
  }

  public createOrder(cartItems: { menuItemId: number; quantity: number }[], cashierNote?: string, waiterId?: number): Order {
    return this.createActiveOrder(cartItems, cashierNote, waiterId);
  }

  public cancelActiveOrder(orderId: number, reason: string = 'Customer Cancelled'): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return undefined;

    order.status = 'Cancelled';
    order.isPaid = false;
    (order as any).cancelReason = reason;

    // Restore / Refund ingredient stock quantities in memory
    order.orderItems.forEach((item) => {
      const itemRecipes = this.recipes.filter((r) => r.menuItemId === item.menuItemId);
      itemRecipes.forEach((recipe) => {
        const ing = this.ingredients.find((i) => i.id === recipe.ingredientId);
        if (ing) {
          const refundAmount = recipe.quantityRequired * item.quantity;
          ing.stockQuantity += refundAmount;

          this.inventoryLogs.unshift({
            id: this.nextInventoryLogId++,
            ingredientId: ing.id,
            ingredientName: ing.name,
            changeAmount: refundAmount,
            reason: `Order #${order.id} Cancelled Restored (${item.quantity}x ${item.menuItemName})`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Also sync inventory stock refund to database
    if (typeof window !== 'undefined') {
      order.orderItems.forEach((item) => {
        const itemRecipes = this.recipes.filter((r) => r.menuItemId === item.menuItemId);
        itemRecipes.forEach((recipe) => {
          const refundAmount = recipe.quantityRequired * item.quantity;
          fetch('/api/inventory/restock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredientId: recipe.ingredientId,
              addQuantity: refundAmount,
              reason: `Order #${order.id} Cancelled Refund`,
            }),
          }).catch((err) => console.error('Failed to refund inventory on cancel:', err));
        });
      });

      fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status: 'Cancelled', cancelReason: reason }),
      }).catch((err) => console.error('Error persisting order cancellation to database:', err));
    }

    this.logAudit('Cashier', 'Cancel Active Order', `Cancelled Order #${order.id} (Reason: ${reason})`);
    this.notify();
    return order;
  }

  public updateOrderStatus(orderId: number, status: OrderStatus): void {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      this.notify();

      if (typeof window !== 'undefined') {
        fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status }),
        }).catch((err) => console.error('Error updating order status in database:', err));
      }
    }
  }

  public getDailyReportSummary(targetDateStr?: string): {
    totalRevenue: number;
    totalCogs: number;
    netProfit: number;
    totalOrders: number;
    itemsSold: { menuItemId: number; name: string; category: string; quantity: number; revenue: number; cost: number; profit: number }[];
  } {
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOrders = 0;

    const itemSalesMap = new Map<
      number,
      { menuItemId: number; name: string; category: string; quantity: number; revenue: number; unitCost: number }
    >();

    for (const order of this.orders) {
      // STRICT FINANCIAL RULE: Only include orders where customer HAS PAID and status is NOT Cancelled
      if (!order.isPaid || order.status === 'Cancelled') continue;

      // Filter by target date if specified ('YYYY-MM-DD')
      if (targetDateStr) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDate !== targetDateStr) continue;
      }

      totalOrders++;
      totalRevenue += order.totalAmount;

      for (const item of order.orderItems) {
        const menuItem = this.menuItems.find((m) => m.id === item.menuItemId);
        const name = item.menuItemName || (menuItem ? menuItem.name : 'Unknown Item');
        const category = menuItem ? menuItem.category : 'General';
        const itemUnitCost = this.getItemCost(item.menuItemId);
        const itemCogs = itemUnitCost * item.quantity;
        totalCogs += itemCogs;

        const existing = itemSalesMap.get(item.menuItemId) || {
          menuItemId: item.menuItemId,
          name,
          category,
          quantity: 0,
          revenue: 0,
          unitCost: itemUnitCost,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.unitPriceAtSale * item.quantity;
        itemSalesMap.set(item.menuItemId, existing);
      }
    }

    const itemsSold = Array.from(itemSalesMap.values()).map((val) => {
      const cost = val.unitCost * val.quantity;
      return {
        menuItemId: val.menuItemId,
        name: val.name,
        category: val.category,
        quantity: val.quantity,
        revenue: val.revenue,
        cost,
        profit: val.revenue - cost,
      };
    });

    return {
      totalRevenue,
      totalCogs,
      netProfit: totalRevenue - totalCogs,
      totalOrders,
      itemsSold: itemsSold.sort((a, b) => b.quantity - a.quantity),
    };
  }

  // ==========================================
  // HMS ROOMS MANAGEMENT METHODS
  // ==========================================
  public getRooms(): Room[] {
    return [...this.rooms];
  }

  public updateRoomStatus(roomId: number, status: RoomStatus): void {
    const room = this.rooms.find((r) => r.id === roomId);
    if (room) {
      room.status = status;
      if (status !== 'Occupied' && !room.currentReservationId) {
        room.currentGuestName = undefined;
      }
      this.logAudit('Staff', 'Update Room Status', `Room #${room.roomNumber} set to ${status}`);
      this.notify();
    }
  }

  public addRoom(roomData: Omit<Room, 'id'>): Room {
    const newId = this.rooms.length > 0 ? Math.max(...this.rooms.map((r) => r.id)) + 1 : 1;
    const newRoom: Room = { ...roomData, id: newId };
    this.rooms.push(newRoom);
    this.logAudit('Admin', 'Add Room', `Added Room #${newRoom.roomNumber} (${newRoom.type})`);
    this.notify();
    return newRoom;
  }

  // ==========================================
  // HMS GUESTS MANAGEMENT METHODS
  // ==========================================
  public getGuests(): Guest[] {
    return [...this.guests];
  }

  public addGuest(guestData: Omit<Guest, 'id' | 'totalStays' | 'totalSpent'>): Guest {
    const newId = this.guests.length > 0 ? Math.max(...this.guests.map((g) => g.id)) + 1 : 1;
    const newGuest: Guest = { ...guestData, id: newId, totalStays: 0, totalSpent: 0 };
    this.guests.push(newGuest);
    this.logAudit('Front Desk', 'Register Guest', `Registered guest: ${newGuest.fullName}`);
    this.notify();
    return newGuest;
  }

  // ==========================================
  // HMS RESERVATIONS MANAGEMENT METHODS
  // ==========================================
  public getReservations(): Reservation[] {
    return [...this.reservations];
  }

  public createReservation(resData: Omit<Reservation, 'id' | 'bookingRef' | 'createdAt'>): Reservation {
    const newId = this.reservations.length > 0 ? Math.max(...this.reservations.map((r) => r.id)) + 1 : 101;
    const bookingRef = `RES-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReservation: Reservation = {
      ...resData,
      id: newId,
      bookingRef,
      createdAt: new Date().toISOString(),
    };
    this.reservations.push(newReservation);

    // Update Room status to Occupied if checking in immediately or reserved
    const room = this.rooms.find((r) => r.id === newReservation.roomId || r.roomNumber === newReservation.roomNumber);
    if (room && newReservation.status === 'Checked-In') {
      room.status = 'Occupied';
      room.currentGuestName = newReservation.guestName;
      room.currentReservationId = newReservation.id;
    }

    // Auto-create room charge transaction in guest folio
    this.postFolioTransaction({
      reservationId: newReservation.id,
      roomNumber: newReservation.roomNumber,
      guestName: newReservation.guestName,
      category: 'Room Charge',
      description: `Room Charge (${newReservation.nights} nights @ ${newReservation.nightlyRate} ETB)`,
      amount: newReservation.totalAmount,
      type: 'Debit',
      postedBy: 'Front Desk',
    });

    if (newReservation.depositPaid > 0) {
      this.postFolioTransaction({
        reservationId: newReservation.id,
        roomNumber: newReservation.roomNumber,
        guestName: newReservation.guestName,
        category: 'Payment Deposit',
        description: `Advance Deposit Paid`,
        amount: newReservation.depositPaid,
        type: 'Credit',
        paymentMethod: 'Cash',
        postedBy: 'Front Desk',
      });
    }

    this.logAudit(
      'Front Desk',
      'Create Reservation',
      `Created booking ${bookingRef} for ${newReservation.guestName} (Room ${newReservation.roomNumber})`
    );
    this.notify();
    return newReservation;
  }

  public checkInReservation(resId: number): void {
    const res = this.reservations.find((r) => r.id === resId);
    if (res) {
      res.status = 'Checked-In';
      const room = this.rooms.find((r) => r.id === res.roomId || r.roomNumber === res.roomNumber);
      if (room) {
        room.status = 'Occupied';
        room.currentGuestName = res.guestName;
        room.currentReservationId = res.id;
      }
      this.logAudit('Front Desk', 'Guest Check-In', `Checked in ${res.guestName} to Room ${res.roomNumber}`);
      this.notify();
    }
  }

  public checkOutReservation(resId: number): void {
    const res = this.reservations.find((r) => r.id === resId);
    if (res) {
      res.status = 'Checked-Out';
      const room = this.rooms.find((r) => r.id === res.roomId || r.roomNumber === res.roomNumber);
      if (room) {
        room.status = 'Dirty';
        room.currentGuestName = undefined;
        room.currentReservationId = undefined;

        // Auto-assign housekeeping cleanup task
        this.addHousekeepingTask({
          roomNumber: room.roomNumber,
          taskType: 'Full Clean',
          priority: 'Urgent',
          assignedStaff: 'Housekeeping Staff',
          status: 'Pending',
          notes: `Post checkout cleaning for Room ${room.roomNumber}`,
        });
      }
      this.logAudit('Front Desk', 'Guest Check-Out', `Checked out ${res.guestName} from Room ${res.roomNumber}`);
      this.notify();
    }
  }

  // ==========================================
  // HMS FOLIO TRANSACTIONS & ROOM POS CHARGES
  // ==========================================
  public getFolioTransactions(): FolioTransaction[] {
    return [...this.folioTransactions];
  }

  public getFolioForReservation(reservationId: number): FolioTransaction[] {
    return this.folioTransactions.filter((tx) => tx.reservationId === reservationId);
  }

  public postFolioTransaction(txData: Omit<FolioTransaction, 'id' | 'timestamp'>): FolioTransaction {
    const newId = this.folioTransactions.length > 0 ? Math.max(...this.folioTransactions.map((t) => t.id)) + 1 : 1;
    const newTx: FolioTransaction = {
      ...txData,
      id: newId,
      timestamp: new Date().toISOString(),
    };
    this.folioTransactions.push(newTx);
    this.notify();
    return newTx;
  }

  // Charge POS Restaurant order to checked-in guest room folio
  public chargeOrderToGuestRoom(roomNumber: string, orderId: number, amount: number, itemsSummary: string): boolean {
    const activeRes = this.reservations.find((r) => r.roomNumber === roomNumber && r.status === 'Checked-In');
    if (!activeRes) return false;

    this.postFolioTransaction({
      reservationId: activeRes.id,
      roomNumber: roomNumber,
      guestName: activeRes.guestName,
      category: 'Restaurant POS',
      description: `POS Order #${orderId} (${itemsSummary})`,
      amount,
      type: 'Debit',
      postedBy: 'Cashier POS',
    });

    this.logAudit('POS', 'Room Folio Charge', `Charged ETB ${amount} for Order #${orderId} to Room ${roomNumber}`);
    this.notify();
    return true;
  }

  // ==========================================
  // HMS HOUSEKEEPING & MAINTENANCE METHODS
  // ==========================================
  public getHousekeepingTasks(): HousekeepingTask[] {
    return [...this.housekeepingTasks];
  }

  public addHousekeepingTask(taskData: Omit<HousekeepingTask, 'id' | 'createdAt'>): HousekeepingTask {
    const newId = this.housekeepingTasks.length > 0 ? Math.max(...this.housekeepingTasks.map((t) => t.id)) + 1 : 1;
    const newTask: HousekeepingTask = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    this.housekeepingTasks.push(newTask);
    this.logAudit('Housekeeping', 'Assign Task', `Assigned ${newTask.taskType} for Room ${newTask.roomNumber}`);
    this.notify();
    return newTask;
  }

  public updateHousekeepingTaskStatus(taskId: number, status: HousekeepingTask['status']): void {
    const task = this.housekeepingTasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === 'Completed' || status === 'Inspected') {
        const room = this.rooms.find((r) => r.roomNumber === task.roomNumber);
        if (room && room.status === 'Dirty') {
          room.status = status === 'Inspected' ? 'Inspected' : 'Clean';
        }
      }
      this.logAudit('Housekeeping', 'Update Task Status', `Task #${taskId} set to ${status}`);
      this.notify();
    }
  }

  // ==========================================
  // HMS EVENT & CONFERENCE HALL METHODS
  // ==========================================
  public getEventHalls(): EventHall[] {
    return [...this.eventHalls];
  }

  public getEventBookings(): EventBooking[] {
    return [...this.eventBookings];
  }

  public createEventBooking(bookingData: Omit<EventBooking, 'id' | 'bookingRef'>): EventBooking {
    const newId = this.eventBookings.length > 0 ? Math.max(...this.eventBookings.map((b) => b.id)) + 1 : 1;
    const bookingRef = `EVT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: EventBooking = {
      ...bookingData,
      id: newId,
      bookingRef,
    };
    this.eventBookings.push(newBooking);
    this.logAudit('Events', 'Create Event Booking', `Booked ${newBooking.eventTitle} at ${newBooking.hallName}`);
    this.notify();
    return newBooking;
  }

  // ==========================================
  // HMS STAFF & HR METHODS
  // ==========================================
  public getStaffMembers(): StaffMember[] {
    return [...this.staffMembers];
  }

  public addStaffMember(staffData: Omit<StaffMember, 'id'>): StaffMember {
    const newId = this.staffMembers.length > 0 ? Math.max(...this.staffMembers.map((s) => s.id)) + 1 : 1;
    const newStaff: StaffMember = { ...staffData, id: newId };
    this.staffMembers.push(newStaff);
    this.logAudit('HR', 'Add Staff', `Added employee ${newStaff.name} (${newStaff.department})`);
    this.notify();
    return newStaff;
  }
}

export const store = new ZemenServeStore();

