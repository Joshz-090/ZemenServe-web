# ZemenServe — Hotel & Restaurant ERP Management System
## Enterprise System Architecture & Module Documentation

---

## 📌 Executive Summary

**ZemenServe** is an enterprise-grade Hotel Management System (HMS) and Restaurant Point of Sale (POS) ERP built with Next.js App Router, TypeScript, and MongoDB. It delivers end-to-end automation for modern hospitality enterprises, unifying Front Office Operations, Room Reservations, Restaurant & Bar POS, Waiter Ordering, Live Kitchen Display Systems (KDS), Recipe-Level Inventory Management, Banquet & Event Hall Management, Staff & HR Workforce Management, Corporate Contracts, Financial Accounting, and System Administration into a synchronized, secure platform.

---

## 👥 System User Roles & Role-Based Access Control (RBAC)

ZemenServe enforces strict server-side and client-side role-based access control across **8 operational user roles**. Navigation routes, sensitive data fields (such as salary and confidential HR notes), and privileged actions are protected according to duty specifications:

| Role | Access Level | Permitted Navigation Routes | Primary Responsibilities & Permissions |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | Full System Administrator | All Routes + `/admin` | User management, PIN assignment, room creation/deletion/pricing, corporate contracts, system audit trail, hotel tax/TIN parameters. |
| 👔 **Manager** | Operations & Oversight | All Routes + `/admin` | Staff roster approval, attendance corrections, leave reviews, banquet venue configuration, financial auditing, inventory adjustments. |
| 🔑 **Receptionist** | Front Office & Guests | `/reception`, `/reservations`, `/events` | Guest check-in/out, room allocations, walk-in reservations, room folio billing, event hall scheduling. |
| 💳 **Cashier** | Billing & POS Terminal | `/pos`, `/menu`, `/orders`, `/daily-report`, `/reports`, `/reception` | High-speed billing, multi-tender payments (Cash, Card, Telebirr, CBE Birr, Room Charge), order settlement, receipt printing. |
| 🤵 **Waiter** | Dining Room Service | `/waiters`, `/menu`, `/orders` | Table order creation, assigned station management, digital menu lookup, order status tracking. |
| 👨‍🍳 **Chef** | Culinary & Kitchen Display | `/kitchen`, `/kds` | Real-time Kitchen Display System (KDS), preparation timers, bump-bar ticket completion. |
| 🧹 **Housekeeper** | Room Inspection & Cleanliness | `/reception` *(Room status panel)* | Room cleanliness status updates (Clean, Dirty, Inspected, Out of Service), minibar consumption logging, engineering flags. |
| 📊 **Accountant** | Financial Audit & Reporting | `/finance`, `/daily-report`, `/reports`, `/orders` | Room folio auditing, general ledger inspection, payment reconciliation, revenue vs. COGS reports, tax summaries. |

---

## 🧭 Navigation Architecture & Core Modules

The system is organized into **13 dedicated operational modules**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZEMENSERVE ERP MODULES                          │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ FRONT OFFICE & ROOM OPERATIONS                                       │
│   1.  Reception Desk & Room Status       (/reception)                  │
│   2.  Room Reservations Grid             (/reservations)               │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ FOOD & BEVERAGE SERVICE (POS & KITCHEN)                              │
│   3.  Cashier Point of Sale (POS)        (/pos)                        │
│   4.  Waiter Order Entry Terminal        (/waiters)                    │
│   5.  Kitchen Display System (KDS)       (/kitchen, /kds)              │
│   6.  Digital Menu & Recipe Catalog      (/menu)                       │
│   7.  Orders Ledger & Dockets            (/orders)                     │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ BANQUETS, EVENTS & VENUE LEASING                                     │
│   8.  Event Halls & Banquet Bookings     (/events)                     │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ WORKFORCE & HUMAN RESOURCES                                          │
│   9.  Staff & HR Workforce Management    (/hr)                         │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ SUPPLY CHAIN & PROCUREMENT                                           │
│   10. Recipe-Level Inventory Stock       (/inventory)                  │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ FINANCIAL CONTROL & BUSINESS INTELLIGENCE                            │
│   11. Finance & Guest Ledger             (/finance)                    │
│   12. Daily & Historical Reports         (/daily-report, /reports)     │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ SYSTEM ADMINISTRATION & CONFIGURATION                                │
│   13. Admin Control Center               (/admin)                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Comprehensive Module Breakdown

### 1️⃣ Reception Desk & Room Operations (`/reception`)
* **Objective**: Primary command center for front office operations, room occupancy tracking, and guest transactions.
* **Core Capabilities**:
  * **Interactive Room Grid**: Visual cards for every hotel room indicating room number, floor, room type (Standard, Deluxe, Executive Suite, Presidential), price per night, and live status (*Clean*, *Dirty*, *Occupied*, *Inspected*, *Out of Service*).
  * **Guest Check-In / Check-Out**: Process walk-ins, link arriving guests to existing reservations, assign room keys, and execute departures with folio balancing.
  * **Room Folio Charging**: Post real-time room charges for F&B dining, minibar consumption, laundry, and extra amenities directly to guest accounts.
  * **Housekeeping Integration**: Front desk agents and housekeeping staff toggle room turnaround statuses directly from the grid.
  * **Guest Directory**: Search guest profiles, verify National ID or Passport numbers, and review stay records.

### 2️⃣ Room Reservations Grid (`/reservations`)
* **Objective**: Manage booking pipelines across direct walk-ins, phone reservations, and Online Travel Agencies (OTAs).
* **Core Capabilities**:
  * **Visual Timeline & Grid**: Filter bookings by check-in date, status (*Confirmed*, *Checked-In*, *Checked-Out*, *Cancelled*), and room category.
  * **Booking Engine**: Create new reservations with automated night calculations, price quotes, guest contact details, and payment deposit tracking.
  * **Channel Attribution**: Track booking source (Direct Walk-in, Booking.com, Expedia, Corporate Partner).
  * **Special Guest Requests**: Record preferences such as early check-in, late check-out, high floor, or quiet zone.

### 3️⃣ Cashier Point of Sale (`/pos`)
* **Objective**: High-throughput billing interface optimized for touch terminals across restaurants, bars, cafés, and room service.
* **Core Capabilities**:
  * **Category Navigation**: Fast filtering across Breakfast, Main Dishes, Hot Beverages, Cocktails, Beers, Wines, and Desserts.
  * **Multi-Tender Payments**: Process Cash, Credit/Debit Card, Telebirr, CBE Birr, or Charge to Room Folio with validation.
  * **Waiter Accountability**: Tag each order with the servicing waiter to track covers and service quality.
  * **Real-Time Recipe Depletion**: Instantly triggers ingredient deductions in the inventory ledger upon checkout.
  * **Receipt Printing**: Thermal receipt printer-ready format with hotel TIN, VAT breakdown, and service charge.

### 4️⃣ Waiter Order Terminal (`/waiters`)
* **Objective**: Streamlined mobile/tablet ordering terminal for floor waitstaff.
* **Core Capabilities**:
  * **Table & Cover Selection**: Select indoor, terrace, or banquet tables with guest seat counts.
  * **Active Orders Tracking**: Monitor whether kitchen staff have marked items as *Preparing* or *Ready for Service*.
  * **Digital Menu Reference**: Instant access to dish descriptions, allergens, and live item availability.

### 5️⃣ Kitchen Display System — KDS (`/kitchen` & `/kds`)
* **Objective**: Paperless, high-visibility digital order management system for executive chefs and culinary stations.
* **Core Capabilities**:
  * **Live Order Tickets**: Visual cards showing ticket number, elapsed timer, table or room number, waiter name, and dish modifications.
  * **Color-Coded Urgency**: Visual indicators highlight order age (<10 min green, 10–20 min amber, >20 min red).
  * **One-Click Bump Bar**: Transitions tickets from *Pending* ➔ *Preparing* ➔ *Ready*.
  * **Active Ticket Counter**: Synchronized badge count in the navigation layout alerting staff to pending kitchen tickets.

### 6️⃣ Digital Menu & Recipe Catalog (`/menu`)
* **Objective**: Catalog management for all food, beverage, and service items.
* **Core Capabilities**:
  * **Item Master**: Manage item names, retail prices, categories, preparation times, and descriptions.
  * **Recipe Specification**: Associate raw ingredients (e.g., espresso beans, beef cuts, cooking oil) and precise metric quantities required per portion.
  * **Availability Management**: Instant toggle to disable sold-out dishes when key ingredients are depleted.

### 7️⃣ Orders Ledger & Dockets (`/orders`)
* **Objective**: Central transaction log of all food, beverage, and service tickets.
* **Core Capabilities**:
  * **Order Filtering**: View orders by date range, payment status (*Paid*, *Pending*, *Voided*), and channel (*Dine-In*, *Takeaway*, *Room Service*).
  * **Docket & Invoice Reprint**: Re-generate customer invoices, kitchen dockets, or tax summary receipts.
  * **Security & Voids**: Restrict cancellations and voided bills to managers, logging all cancellations in the system audit trail.

### 8️⃣ Event Halls & Banquet Bookings (`/events`)
* **Objective**: End-to-end venue reservation and catering management for conferences, summits, weddings, and corporate seminars.
* **Core Capabilities**:
  * **Venue & Hall Configuration**: Manager/Admin capability to create, edit, and configure halls (capacity, daily/hourly rates, included AV equipment, amenities).
  * **Booking Scheduler**: Reserve venues by date, setup format (*Banquet*, *Theater*, *Classroom*, *U-Shape*, *Cocktail*), attendee count, and catering package.
  * **Deposits & Quotations**: Track advance security deposits, calculate outstanding balance, and generate banquet contract summaries.
  * **Operational Calendar Link**: Live synchronization with the Shared Operations Calendar in the HR module without data duplication.

### 9️⃣ Staff & HR Workforce Management (`/hr`)
* **Objective**: Enterprise workforce operations system replacing simple CRUD rosters with hotel-grade management.
* **Core Capabilities (10 Dedicated Operational Tabs)**:
  1. **Executive Dashboard**: Key workforce KPIs (total headcount, on-duty staff, active shifts, pending leaves, urgent duties, upcoming event staffing).
  2. **Employee Directory**: Paginated directory with unique staff codes (`EMP-1001` format), department filters, employment type, emergency contacts, and soft-delete/deactivation.
  3. **Department Management**: 15 pre-seeded hotel departments (Front Office, Housekeeping, F&B Service, Culinary, Banquets, Security, Maintenance, Finance, Laundry, etc.) with minimum staffing quotas and department heads.
  4. **Roster & Shift Scheduling**: Shift assignments supporting overnight hours (e.g., 22:00–06:00), employee multi-select, and an automated conflict detection engine (shift overlap, rest period violation, approved leave collisions).
  5. **Shared Hotel Operations Calendar**: Unified view consolidating workforce shifts, duty checklists, leave periods, management reminders, and real `EventBooking` entries directly from the database.
  6. **Daily Duties & Checklists**: Operational and event preparation task assignments with priority levels (*Urgent*, *High*, *Normal*, *Low*) and completion tracking.
  7. **Attendance & Timesheets**: Clock-in and clock-out tracking, actual vs. scheduled hours, late arrival flags, and manager manual correction workflow with mandatory audit reasons.
  8. **Leave Management Pipeline**: Submission and review of Annual, Sick, Maternity/Paternity, and Unpaid leave with automatic collision alerts against scheduled shifts.
  9. **Training & Qualifications**: Hospitality certifications, food safety (HACCP), language proficiencies, and certificate expiration tracking.
  10. **Reports & Analytics**: Department distribution graphs, workforce summaries, printable layout, and instant CSV directory export.
  * **9-Tab Employee Profile Drawer**: Deep-dive profile drawer covering Overview, Employment Details, Shift Schedule, Attendance History, Leave Records, Duty Tasks, Qualifications, Identity Documents, and Internal HR Notes.
  * **Data Privacy & RBAC**: Server-side masking of confidential salary and HR remarks for non-manager staff.
  * **Local Timezone**: Native alignment with Ethiopian Local Time (`Africa/Addis_Ababa`, UTC+3).

### 🔟 Recipe-Level Inventory Stock (`/inventory`)
* **Objective**: Real-time stock control and raw ingredient tracking preventing stockouts and shrinkage.
* **Core Capabilities**:
  * **Ingredient Master**: Monitor stock across kilograms (`kg`), grams (`g`), liters (`L`), milliliters (`ml`), and pieces (`pcs`).
  * **Automated POS Depletion**: Deducts exact recipe ingredients in real time upon POS bill settlement.
  * **Low-Stock Alerts**: Visual badges and notifications when stock falls below configured reorder levels.
  * **Stock Movement Audit**: Complete ledger recording purchase orders, restocking deliveries, kitchen waste, and spoilage.

### 1️⃣1️⃣ Finance & Guest Ledger (`/finance`)
* **Objective**: Comprehensive accounting module overseeing revenue streams, room folios, and payment reconciliation.
* **Core Capabilities**:
  * **Departmental Revenue Breakdown**: Comparative analysis across Rooms, F&B Dining, Event Halls, and Ancillary Services.
  * **Guest Folio Ledger**: Itemized debit/credit records for every stay, detailing room rates, dining charges, and payments.
  * **Digital Reconciliation**: Balance physical cash drawer registers against digital payment provider payouts (Telebirr, CBE Birr, Card POS).

### 1️⃣2️⃣ Daily & Historical Reports (`/daily-report` & `/reports`)
* **Objective**: Executive reporting suite and business intelligence dashboard.
* **Core Capabilities**:
  * **Daily Financial Flash**: Total Revenue, Cost of Goods Sold (COGS), Gross Profit, Occupancy Percentage, and Average Daily Rate (ADR).
  * **Sales Performance**: Top-performing menu items, high-margin contributors, and low-velocity products.
  * **System Audit Trail**: Complete timeline of administrative actions, price adjustments, drawer openings, and staff authentications.

### 1️⃣3️⃣ Admin Control Center (`/admin`)
* **Objective**: Central administration panel restricted to Admin and Manager roles.
* **Core Capabilities**:
  * **User Management**: Create user accounts, assign user roles, set security PINs, and toggle active status.
  * **Room Inventory Management**: Create new rooms, edit room types, configure base rates, and decommission rooms.
  * **Corporate Contracts**: Manage corporate client accounts, company billing limits, discount percentages, and validity dates.
  * **Hotel Profile Configuration**: Update hotel branding, TIN, VAT rate, service charge percentage, and contact info.
  * **Audit Log Viewer**: Server-side audit log viewing for compliance and fraud detection.

---

## 💻 Technical Architecture & Technology Stack

| Layer | Technologies Used | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19 | Server & Client Components, Turbopack, Fast Refresh |
| **Language** | TypeScript 5 | Strict type validation across all entities and API routes |
| **Database** | MongoDB, Mongoose 9 | Fully normalized Mongoose schemas, indexes, and connection pooling |
| **Styling & Design** | Tailwind CSS v4, Lucide Icons, Framer Motion | Modern dark theme, glassmorphism accents, responsive grid layouts |
| **Authentication & RBAC** | Session Tokens, BCryptJS, Server Guards | HTTP-only verification via `verifySessionAndRole` |
| **Business Timezone** | Ethiopian Local Time (`Africa/Addis_Ababa`, UTC+3) | Consistent business day, attendance punch, and shift calculations |
| **Reporting & Export** | CSV Exporters, Thermal Print Layouts | Built-in CSV generation for employee records and reports |
| **Testing** | Node.js Test Suites, TypeScript Compiler | Automated test coverage for integrity, conflict engines, and idempotency |

---

## 🔒 Security & Data Integrity

1. **Role-Based Server Guards**: Every API endpoint under `/api/admin/*`, `/api/hr/*`, `/api/events/*`, and `/api/reservations/*` verifies incoming session credentials before database execution.
2. **PII & Salary Masking**: Sensitive compensation figures and internal remarks are stripped server-side before payloads leave the API when requested by non-manager roles.
3. **Audit Logging**: Sensitive administrative actions (employee onboarding, shift conflict overrides, attendance corrections, bill voids, room deletions) automatically record audit entries in `AuditLog`.
4. **Idempotent Operations**: Payment processing and initial data seeding enforce uniqueness constraints and upserts to prevent duplicate database records.
