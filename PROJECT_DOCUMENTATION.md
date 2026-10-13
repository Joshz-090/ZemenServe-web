# ZemenServe — Hotel & Restaurant ERP Management System
## Comprehensive System & Role Documentation

---

## 📌 Executive Summary

**ZemenServe** is an enterprise-grade, offline-first Hotel Management System (HMS) and Restaurant Point of Sale (POS) tailored for modern hotels, resorts, and dining establishments. It unifies Front Desk Operations, Room Reservations, Housekeeping, Restaurant POS, Recipe-Level Inventory Management, Kitchen Display Systems (KDS), Event Hall Bookings, Staff HR, and Financial Reporting into a single streamlined web application.

---

## 👥 System User Roles & Access Permissions

ZemenServe enforces role-based access control (RBAC) across **8 distinct user roles**. Each role receives a tailored workflow and restricted navigation routes suitable for their operational duties:

| Role | Access Level | Permitted Navigation Routes | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | Full System Access | All Routes + `/admin` | System setup, user account creation, PIN management, system audit logs, hotel parameters. |
| 👔 **Manager** | Operational Control | All Routes + `/admin` | Operational oversight, menu adjustments, financial inspection, staff audits, inventory control. |
| 🔑 **Receptionist** | Front Office | `/reception`, `/reservations`, `/housekeeping`, `/events` | Guest check-in/out, room assignments, reservation management, room folio charging, hall bookings. |
| 💳 **Cashier** | Billing & POS | `/pos`, `/menu`, `/inventory`, `/daily-report`, `/reports`, `/orders`, `/reception`, `/kitchen` | High-speed POS billing, accepting cash/card/mobile money/room charges, order tracking, receipt printing. |
| 👨‍🍳 **Chef** | Kitchen Operations | `/kitchen`, `/kds` | Live Kitchen Display System (KDS) monitoring, order preparation, bump-bar ticket completion. |
| 🤵 **Waiter** | Dining Service | `/waiters`, `/menu`, `/orders` | Table order entry, waiter performance tracking, reviewing digital menu & active guest orders. |
| 🧹 **Housekeeper** | Room Maintenance | `/housekeeping` | Room cleanliness status updates (Clean, Dirty, Inspected, Out of Service), task execution, minibar restock logs. |
| 📊 **Accountant** | Financial Audit | `/finance`, `/daily-report`, `/reports`, `/orders` | Room folio auditing, general ledger inspection, daily revenue vs. COGS tracking, financial reconciliation. |

---

## 🧭 Navigation Sidebar & Module Functionality Breakdown

The persistent navigation sidebar is divided into clean, logical operational modules. Below is a detailed description of every link and its embedded capabilities:

```
┌─────────────────────────────────────────────────────────┐
│                 ZEMENSERVE SIDEBAR                      │
├─────────────────────────────────────────────────────────┤
│ ▼ FRONT OFFICE & ROOMS                                  │
│   🔑 Reception Desk       (/reception)                  │
│   📅 Reservations Grid    (/reservations)               │
│   ✨ Housekeeping Board   (/housekeeping)               │
├─────────────────────────────────────────────────────────┤
│ ▼ RESTAURANT & DINING POS                               │
│   🛍️ Cashier POS          (/pos)                        │
│   👨‍🍳 Kitchen Display (KDS) (/kitchen)                   │
│   🍽️ Digital Menu         (/menu)                       │
│   🧾 Orders Log           (/orders)                     │
├─────────────────────────────────────────────────────────┤
│ ▼ HOTEL ERP & MANAGEMENT                                │
│   💵 Finance & Ledger     (/finance)                    │
│   🏢 Events & Halls       (/events)                     │
│   👥 Staff & HR           (/hr)                         │
│   📦 Inventory Stock      (/inventory)                  │
│   📊 Daily Reports        (/daily-report)               │
│   🛡️ Admin Control        (/admin)                      │
└─────────────────────────────────────────────────────────┘
```

---

### 1️⃣ Front Office & Rooms

#### 🔑 **Reception Desk** (`/reception`)
* **Purpose**: Serves as the central hub for front desk agents managing room occupancy and live guest transactions.
* **Key Capabilities**:
  * **Room Availability Grid**: View real-time room status categorized by Clean, Dirty, Occupied, Inspected, and Out of Service.
  * **Guest Check-In / Check-Out**: Process walk-in guests or check in guests with existing reservations.
  * **Folio Billing & Charges**: Direct post-to-room charges (Room Rates, POS Dining, Minibar, Laundry, Late Fees).
  * **Guest Lookup**: Search guest profiles, verify National ID/Passport details, and review stay history.

#### 📅 **Reservations Grid** (`/reservations`)
* **Purpose**: Manages short-term and long-term room bookings across direct walk-ins and Online Travel Agencies (OTAs).
* **Key Capabilities**:
  * **Visual Calendar/Grid**: Track upcoming check-ins, check-outs, and room allocations.
  * **Booking Creation**: Reserve rooms by date range, room type, guest count, and channel (Walk-in, Booking.com, Expedia, Corporate).
  * **Deposit & Payment Status**: Record advance payments, deposits, and pending balances.
  * **Special Requests**: Note guest preferences (e.g., high floor, extra bed, early check-in).

#### ✨ **Housekeeping Board** (`/housekeeping`)
* **Purpose**: Coordinates room cleaning, inspection workflows, and maintenance tasks.
* **Key Capabilities**:
  * **Room Cleanliness Matrix**: Instant toggle between *Dirty*, *In Progress*, *Clean*, and *Inspected*.
  * **Task Assignment**: Assign staff members to specific room cleaning, deep cleaning, or minibar restock tasks.
  * **Maintenance Flagging**: Mark damaged rooms as *Out of Service* with repair notes for engineering.

---

### 2️⃣ Restaurant & Dining POS

#### 🛍️ **Cashier POS** (`/pos`)
* **Purpose**: High-speed touch-screen billing terminal for restaurant, bar, room service, and banquet ordering.
* **Key Capabilities**:
  * **Item Selection**: Filter menu items by category with visual thumbnails and quick search.
  * **Multi-Payment Methods**: Accept Cash, Card, Telebirr, CBE Birr, or Charge to Hotel Room Folio.
  * **Waiter Assignment**: Associate orders with specific waiters for commission and accountability tracking.
  * **Automatic Inventory Deduction**: Instantly deduct ingredients based on defined item recipes upon checkout.

#### 👨‍🍳 **Kitchen Display (KDS)** (`/kitchen`)
* **Purpose**: Full-screen, real-time Kitchen Display System designed for kitchen monitors and chef bump-bars.
* **Key Capabilities**:
  * **Live Order Tickets**: Displays incoming orders with real-time preparation timers.
  * **Status Bumping**: One-click bump button to transition tickets from *Preparing* to *Ready for Service*.
  * **Pending Order Badge**: Live visual order counter badge integrated directly into the sidebar.

#### 🍽️ **Digital Menu** (`/menu`)
* **Purpose**: Catalog management for all food, beverage, and service offerings.
* **Key Capabilities**:
  * **Item Management**: Add, edit, or disable menu items, pricing, and categories.
  * **Recipe Builder**: Link raw ingredients (e.g., coffee beans, milk, meat) and exact quantities required per portion.
  * **Availability Toggle**: Mark items out of stock if key ingredients are depleted.

#### 🧾 **Orders Log** (`/orders`)
* **Purpose**: Real-time and historical ledger of all orders placed across the establishment.
* **Key Capabilities**:
  * **Order Status Tracking**: Monitor order status (*Pending*, *Preparing*, *Ready*, *Served*, *Paid*, *Cancelled*).
  * **Receipt Reprinting**: Generate duplicate customer receipts or kitchen dockets.
  * **Order Voiding**: Void or adjust orders with audit log recording for fraud prevention.

---

### 3️⃣ Hotel ERP & Management

#### 💵 **Finance & Ledger** (`/finance`)
* **Purpose**: Financial accounting module tracking guest folios, departmental revenue streams, and payments.
* **Key Capabilities**:
  * **Departmental Revenue Breakdown**: Compare income generated across Rooms, F&B Dining, Events/Halls, and Extras.
  * **Room Folio Transactions**: View itemized debit/credit logs for every active or past reservation.
  * **Payment Reconciliation**: Reconcile cash drawer balances with digital payment gateway payouts (Telebirr/CBE).

#### 🏢 **Events & Halls** (`/events`)
* **Purpose**: Event management module for booking conference rooms, banquet halls, and wedding venues.
* **Key Capabilities**:
  * **Hall Management**: Configure hall capacity, hourly/daily rental rates, and available amenities.
  * **Event Bookings**: Schedule conferences, set room layouts (Banquet, Theater, Classroom, U-Shape), and assign catering packages.
  * **Billing & Deposits**: Collect advance event deposits and issue final banquet billing statements.

#### 👥 **Staff & HR** (`/hr`)
* **Purpose**: Human resource roster and shift scheduling tool for hotel employees.
* **Key Capabilities**:
  * **Employee Directory**: Maintain staff records, roles, phone numbers, and department allocations.
  * **Shift Scheduling**: Assign Morning (06:00-14:00), Evening (14:00-22:00), Night (22:00-06:00), or General shifts.
  * **Duty Status**: Monitor staff on active duty, on leave, or off duty.

#### 📦 **Inventory Stock** (`/inventory`)
* **Purpose**: Recipe-level raw material tracking and stock control system.
* **Key Capabilities**:
  * **Ingredient Tracking**: Monitor quantities of raw ingredients in specific units (`kg`, `g`, `L`, `ml`, `pcs`).
  * **Low-Stock Warnings**: Visual indicators and ping notifications when ingredients drop below safety thresholds.
  * **Stock Adjustment Logs**: Record restock deliveries, waste, breakage, and audit logs.

#### 📊 **Daily Reports** (`/daily-report` & `/reports`)
* **Purpose**: Executive analytics dashboard providing business intelligence and financial health summaries.
* **Key Capabilities**:
  * **Profitability Metrics**: View Total Revenue, Total Cost of Goods Sold (COGS), and Net Profit margins.
  * **Item Performance**: Identify top-selling menu items, highest margin products, and low performers.
  * **Audit Trail**: Track user login activity, drawer opens, price overrides, and sensitive actions.

#### 🛡️ **Admin Control** (`/admin`)
* **Purpose**: System configuration and user security management.
* **Key Capabilities**:
  * **User & Credential Management**: Create staff accounts, assign roles, reset PINs, and enable/disable accounts.
  * **Hotel Profile Settings**: Update hotel name, tax identification (TIN), VAT rates, currency symbol, and contact info.
  * **System Audit Logs**: Complete security log of administrative actions.

---

## 🛠️ Technical Stack Summary

* **Frontend Framework**: Next.js (App Router, Client Components, Turbopack)
* **Styling**: Tailwind CSS (Dark Mode, Glassmorphism, HSL Accents)
* **Iconography**: Lucide React
* **State & Sync**: In-Memory Sync Store with SQLite database synchronization
* **Deployment**: Offline-first hybrid local web application
