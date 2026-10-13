import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { EmployeeModel } from '@/lib/models/Employee';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_EMPLOYEES = [
  {
    idNumber: 1,
    staffCode: 'EMP-1001',
    fullName: 'Abebe Kebede',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 911 223 344',
    email: 'abebe.frontdesk@zemenserve.com',
    gender: 'Male',
    dateOfBirth: '1992-05-14',
    address: 'Bole Sub-City, Addis Ababa',
    emergencyContact: { name: 'Almaz Kebede', phone: '+251 922 110 099', relationship: 'Spouse' },
    department: 'Front Office / Reception',
    jobTitle: 'Senior Front Desk Supervisor',
    employeeType: 'Full-time',
    startDate: '2023-01-15',
    status: 'Active',
    supervisorName: 'Hotel General Manager',
    location: 'Main Hotel Complex',
    normalWeeklyHours: 48,
    salary: 22000,
    notes: 'Exemplary guest satisfaction scores. Certified in Hotel PMS & Concierge operations.',
    idType: 'National ID',
    idNumberDoc: 'ET-ID-88776655',
  },
  {
    idNumber: 2,
    staffCode: 'EMP-1002',
    fullName: 'Tigist Haile',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 912 334 455',
    email: 'tigist.hk@zemenserve.com',
    gender: 'Female',
    dateOfBirth: '1990-11-20',
    address: 'Yeka Sub-City, Addis Ababa',
    emergencyContact: { name: 'Haile Wolde', phone: '+251 911 998 877', relationship: 'Father' },
    department: 'Housekeeping',
    jobTitle: 'Executive Housekeeper Lead',
    employeeType: 'Full-time',
    startDate: '2022-06-01',
    status: 'Active',
    supervisorName: 'Operations Manager',
    location: 'Guest Floors & Public Areas',
    normalWeeklyHours: 48,
    salary: 19500,
    notes: 'Oversees 24 floor attendants. Manages linen rotation, VIP room staging, and laundry turnover.',
    idType: 'National ID',
    idNumberDoc: 'ET-ID-44556677',
  },
  {
    idNumber: 3,
    staffCode: 'EMP-1003',
    fullName: 'Chef Daniel Mekonnen',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 911 556 677',
    email: 'daniel.kitchen@zemenserve.com',
    gender: 'Male',
    dateOfBirth: '1988-03-10',
    address: 'Kirkos Sub-City, Addis Ababa',
    emergencyContact: { name: 'Marta Mekonnen', phone: '+251 930 445 566', relationship: 'Sister' },
    department: 'Kitchen & Culinary',
    jobTitle: 'Executive Chef',
    employeeType: 'Full-time',
    startDate: '2021-09-01',
    status: 'Active',
    supervisorName: 'Food & Beverage Director',
    location: 'Central Kitchen & Banquet Galley',
    normalWeeklyHours: 48,
    salary: 38000,
    notes: 'Specialist in authentic Ethiopian national cuisine & European continental banquet banqueting.',
    idType: 'Passport',
    idNumberDoc: 'EP-4499112',
  },
  {
    idNumber: 4,
    staffCode: 'EMP-1004',
    fullName: 'Dawit Yilma',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 920 667 788',
    email: 'dawit.dining@zemenserve.com',
    gender: 'Male',
    dateOfBirth: '1995-08-12',
    address: 'Nifas Silk Sub-City, Addis Ababa',
    emergencyContact: { name: 'Yilma Tadesse', phone: '+251 911 332 211', relationship: 'Brother' },
    department: 'Food & Beverage',
    jobTitle: 'Head Captain & POS Cashier',
    employeeType: 'Full-time',
    startDate: '2023-04-10',
    status: 'Active',
    supervisorName: 'F&B Manager',
    location: 'Main Dining Restaurant',
    normalWeeklyHours: 48,
    salary: 16000,
    notes: 'High speed table billing and room charge posting accuracy.',
    idType: 'National ID',
    idNumberDoc: 'ET-ID-22334411',
  },
  {
    idNumber: 5,
    staffCode: 'EMP-1005',
    fullName: 'Sara Girma',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 913 778 899',
    email: 'sara.events@zemenserve.com',
    gender: 'Female',
    dateOfBirth: '1994-01-25',
    address: 'Bole Medhanealem, Addis Ababa',
    emergencyContact: { name: 'Girma Assefa', phone: '+251 912 667 788', relationship: 'Father' },
    department: 'Events & Banquet Operations',
    jobTitle: 'Conference & Event Coordinator',
    employeeType: 'Full-time',
    startDate: '2023-08-15',
    status: 'Active',
    supervisorName: 'Hotel General Manager',
    location: 'Lalibela Ballroom & Conference Center',
    normalWeeklyHours: 48,
    salary: 24000,
    notes: 'Handles corporate summits, wedding setups, and conference hall rentals.',
    idType: 'National ID',
    idNumberDoc: 'ET-ID-77665544',
  },
  {
    idNumber: 6,
    staffCode: 'EMP-1006',
    fullName: 'Yonas Technician',
    photoUrl: '',
    nationality: 'Ethiopian',
    phone: '+251 911 889 900',
    email: 'yonas.eng@zemenserve.com',
    gender: 'Male',
    dateOfBirth: '1989-07-04',
    address: 'Akaki Kality, Addis Ababa',
    emergencyContact: { name: 'Eleni Yonas', phone: '+251 940 112 233', relationship: 'Spouse' },
    department: 'Maintenance & Engineering',
    jobTitle: 'Chief Facilities Engineer',
    employeeType: 'Full-time',
    startDate: '2022-02-01',
    status: 'Active',
    supervisorName: 'Operations Manager',
    location: 'Plant Rooms, Generators & HVAC',
    normalWeeklyHours: 48,
    salary: 26000,
    notes: 'Certified in industrial 3-phase generators, commercial chillers, and hall acoustic staging.',
    idType: 'National ID',
    idNumberDoc: 'ET-ID-99001122',
  },
];

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

    // Seed defaults if empty
    const count = await EmployeeModel.countDocuments();
    if (count === 0) {
      await EmployeeModel.insertMany(INITIAL_EMPLOYEES);
    }

    // Role check for sensitive fields (Salary)
    let canViewSalary = false;
    const auth = await verifySessionAndRole(req);
    if (!auth.errorResponse && auth.session) {
      const role = auth.session.role;
      if (role === 'Admin' || role === 'Manager') {
        canViewSalary = true;
      }
    }

    const query: any = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { staffCode: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (department && department !== 'all') {
      query.department = department;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await EmployeeModel.countDocuments(query);
    const docs = await EmployeeModel.find(query)
      .sort({ staffCode: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const employees = docs.map((doc: any) => ({
      id: doc.idNumber,
      staffCode: doc.staffCode,
      fullName: doc.fullName,
      photoUrl: doc.photoUrl || '',
      nationality: doc.nationality || 'Ethiopian',
      phone: doc.phone,
      altPhone: doc.altPhone || '',
      email: doc.email || '',
      gender: doc.gender || '',
      dateOfBirth: doc.dateOfBirth || '',
      address: doc.address || '',
      emergencyContact: doc.emergencyContact || { name: '', phone: '', relationship: '' },
      department: doc.department,
      jobTitle: doc.jobTitle,
      employeeType: doc.employeeType || 'Full-time',
      startDate: doc.startDate,
      contractEndDate: doc.contractEndDate || '',
      status: doc.status || 'Active',
      supervisorName: doc.supervisorName || '',
      location: doc.location || 'Main Hotel Complex',
      normalWeeklyHours: doc.normalWeeklyHours || 48,
      salary: canViewSalary ? doc.salary : undefined, // Restricted PII
      notes: doc.notes || '',
      idType: doc.idType || 'National ID',
      idNumberDoc: doc.idNumberDoc || '',
      idExpiryDate: doc.idExpiryDate || '',
      workPermitNumber: doc.workPermitNumber || '',
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();

    const {
      fullName,
      nationality,
      phone,
      altPhone,
      email,
      gender,
      dateOfBirth,
      address,
      emergencyContact,
      department,
      jobTitle,
      employeeType,
      startDate,
      contractEndDate,
      status,
      supervisorName,
      location,
      normalWeeklyHours,
      salary,
      notes,
      idType,
      idNumberDoc,
      idExpiryDate,
      workPermitNumber,
    } = body;

    if (!fullName || !phone || !department || !jobTitle || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Full name, phone, department, job title, and start date are required.' },
        { status: 400 }
      );
    }

    const maxDoc = await EmployeeModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;
    const staffCode = `EMP-${String(1000 + nextId)}`;

    const newEmp = new EmployeeModel({
      idNumber: nextId,
      staffCode,
      fullName: fullName.trim(),
      nationality: nationality || 'Ethiopian',
      phone: phone.trim(),
      altPhone: altPhone ? altPhone.trim() : undefined,
      email: email ? email.trim() : undefined,
      gender: gender || '',
      dateOfBirth: dateOfBirth || '',
      address: address ? address.trim() : '',
      emergencyContact: emergencyContact || { name: '', phone: '', relationship: '' },
      department: department.trim(),
      jobTitle: jobTitle.trim(),
      employeeType: employeeType || 'Full-time',
      startDate,
      contractEndDate: contractEndDate || undefined,
      status: status || 'Active',
      supervisorName: supervisorName ? supervisorName.trim() : '',
      location: location ? location.trim() : 'Main Hotel Complex',
      normalWeeklyHours: Number(normalWeeklyHours) || 48,
      salary: Number(salary) || 0,
      notes: notes ? notes.trim() : '',
      idType: idType || 'National ID',
      idNumberDoc: idNumberDoc ? idNumberDoc.trim() : '',
      idExpiryDate: idExpiryDate || '',
      workPermitNumber: workPermitNumber ? workPermitNumber.trim() : '',
    });

    await newEmp.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Create Employee',
        details: `Created employee record ${newEmp.staffCode} (${newEmp.fullName}, ${newEmp.department})`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Employee ${newEmp.staffCode} (${newEmp.fullName}) created successfully!`,
      employee: {
        id: newEmp.idNumber,
        staffCode: newEmp.staffCode,
        fullName: newEmp.fullName,
        department: newEmp.department,
        jobTitle: newEmp.jobTitle,
        status: newEmp.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });

    const emp = await EmployeeModel.findOne({ idNumber: Number(id) });
    if (!emp) return NextResponse.json({ success: false, error: 'Employee record not found.' }, { status: 404 });

    // Apply allowed updates
    if (updates.fullName) emp.fullName = updates.fullName.trim();
    if (updates.phone) emp.phone = updates.phone.trim();
    if (updates.altPhone !== undefined) emp.altPhone = updates.altPhone.trim();
    if (updates.email !== undefined) emp.email = updates.email.trim();
    if (updates.nationality) emp.nationality = updates.nationality.trim();
    if (updates.address !== undefined) emp.address = updates.address.trim();
    if (updates.emergencyContact) emp.emergencyContact = updates.emergencyContact;
    if (updates.department) emp.department = updates.department.trim();
    if (updates.jobTitle) emp.jobTitle = updates.jobTitle.trim();
    if (updates.employeeType) emp.employeeType = updates.employeeType;
    if (updates.status) emp.status = updates.status;
    if (updates.startDate) emp.startDate = updates.startDate;
    if (updates.contractEndDate !== undefined) emp.contractEndDate = updates.contractEndDate;
    if (updates.supervisorName !== undefined) emp.supervisorName = updates.supervisorName.trim();
    if (updates.location !== undefined) emp.location = updates.location.trim();
    if (updates.normalWeeklyHours !== undefined) emp.normalWeeklyHours = Number(updates.normalWeeklyHours);
    if (updates.salary !== undefined) emp.salary = Number(updates.salary);
    if (updates.notes !== undefined) emp.notes = updates.notes.trim();
    if (updates.idType !== undefined) emp.idType = updates.idType;
    if (updates.idNumberDoc !== undefined) emp.idNumberDoc = updates.idNumberDoc.trim();
    if (updates.idExpiryDate !== undefined) emp.idExpiryDate = updates.idExpiryDate;
    if (updates.workPermitNumber !== undefined) emp.workPermitNumber = updates.workPermitNumber.trim();

    await emp.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Update Employee',
        details: `Updated employee ${emp.staffCode} (${emp.fullName}) - Status: ${emp.status}`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Employee ${emp.staffCode} updated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 });

    const emp = await EmployeeModel.findOne({ idNumber: id });
    if (!emp) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    // Mark as Terminated rather than deleting historical audit trail
    emp.status = 'Terminated';
    await emp.save();

    // Audit Log
    try {
      const maxAudit = await AuditLogModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
      const auditId = (maxAudit?.idNumber || 0) + 1;
      await AuditLogModel.create({
        idNumber: auditId,
        user: `${auth.session?.name || 'Manager'} (${auth.session?.role || 'Manager'})`,
        action: 'Deactivate Employee',
        details: `Terminated employee record ${emp.staffCode} (${emp.fullName})`,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Employee ${emp.staffCode} (${emp.fullName}) deactivated/terminated.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
