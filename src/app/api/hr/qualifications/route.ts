import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { QualificationModel } from '@/lib/models/Qualification';
import { EmployeeModel } from '@/lib/models/Employee';
import { verifySessionAndRole } from '@/lib/auth';

const INITIAL_QUALIFICATIONS = [
  { idNumber: 1, employeeId: 3, staffCode: 'EMP-1003', employeeName: 'Chef Daniel Mekonnen', title: 'HACCP Advanced Food Hygiene & Safety', category: 'Food Safety & Hygiene', issuingBody: 'Ethiopian Standards Agency (ESA)', issueDate: '2023-05-10', expiryDate: '2026-05-10', certificateNumber: 'ESA-HACCP-9901', verificationStatus: 'Verified', notes: 'Mandatory commercial banquet certification.' },
  { idNumber: 2, employeeId: 6, staffCode: 'EMP-1006', employeeName: 'Yonas Technician', title: 'Industrial Generator & 3-Phase Systems', category: 'Technical / Engineering', issuingBody: 'Ethiopian Electric Power Institute', issueDate: '2022-08-15', expiryDate: '2027-08-15', certificateNumber: 'EEP-ENG-4411', verificationStatus: 'Verified', notes: 'Qualified to service 500kVA backup generator.' },
  { idNumber: 3, employeeId: 1, staffCode: 'EMP-1001', employeeName: 'Abebe Kebede', title: 'Certified Hotel Reception & Concierge', category: 'Guest Relations & Language', issuingBody: 'Ethiopian Hotel & Tourism Training Institute (EHTTI)', issueDate: '2023-02-12', expiryDate: '2028-02-12', certificateNumber: 'EHTTI-REC-8822', verificationStatus: 'Verified', notes: 'Fluent in English and Amharic.' },
  { idNumber: 4, employeeId: 2, staffCode: 'EMP-1002', employeeName: 'Tigist Haile', title: 'Healthcare Sanitation & Hospitality Cleanliness', category: 'First Aid & Safety', issuingBody: 'Red Cross Ethiopia', issueDate: '2024-01-20', expiryDate: '2027-01-20', certificateNumber: 'RC-SAN-1290', verificationStatus: 'Verified', notes: 'First aid responder lead.' },
];

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const count = await QualificationModel.countDocuments();
    if (count === 0) {
      for (const item of INITIAL_QUALIFICATIONS) {
        await QualificationModel.updateOne({ idNumber: item.idNumber }, { $setOnInsert: item }, { upsert: true });
      }
    }

    const query: any = {};
    if (employeeId) query.employeeId = Number(employeeId);

    const docs = await QualificationModel.find(query).sort({ issueDate: -1 }).lean();
    
    // Deduplicate any records that may share the same idNumber from race conditions
    const seen = new Set<number>();
    const duplicateIdsToRemove: any[] = [];
    const uniqueDocs = docs.filter((d: any) => {
      const idNum = Number(d.idNumber);
      if (idNum && seen.has(idNum)) {
        if (d._id) duplicateIdsToRemove.push(d._id);
        return false;
      }
      if (idNum) seen.add(idNum);
      return true;
    });

    if (duplicateIdsToRemove.length > 0) {
      QualificationModel.deleteMany({ _id: { $in: duplicateIdsToRemove } }).catch(() => {});
    }

    const qualifications = uniqueDocs.map((d: any, index: number) => ({
      id: d.idNumber || index + 1,
      _id: d._id ? d._id.toString() : `qual-${d.idNumber || index + 1}`,
      employeeId: d.employeeId,
      staffCode: d.staffCode,
      employeeName: d.employeeName,
      title: d.title,
      category: d.category || 'General',
      issuingBody: d.issuingBody,
      issueDate: d.issueDate,
      expiryDate: d.expiryDate || '',
      certificateNumber: d.certificateNumber || '',
      verificationStatus: d.verificationStatus || 'Verified',
      notes: d.notes || '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, qualifications });
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
    const { employeeId, title, category, issuingBody, issueDate, expiryDate, certificateNumber, notes } = body;

    if (!employeeId || !title || !issuingBody || !issueDate) {
      return NextResponse.json(
        { success: false, error: 'Employee, certification title, issuing organization, and issue date are required.' },
        { status: 400 }
      );
    }

    const emp = await EmployeeModel.findOne({ idNumber: Number(employeeId) });
    if (!emp) return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });

    const maxDoc = await QualificationModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;

    const newQual = new QualificationModel({
      idNumber: nextId,
      employeeId: emp.idNumber,
      staffCode: emp.staffCode,
      employeeName: emp.fullName,
      title: title.trim(),
      category: category || 'General',
      issuingBody: issuingBody.trim(),
      issueDate,
      expiryDate: expiryDate || undefined,
      certificateNumber: certificateNumber ? certificateNumber.trim() : '',
      verificationStatus: 'Verified',
      notes: notes ? notes.trim() : '',
    });

    await newQual.save();
    return NextResponse.json({ success: true, message: 'Qualification saved successfully.', qualification: newQual });
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

    if (!id) return NextResponse.json({ success: false, error: 'Qualification ID is required.' }, { status: 400 });

    await QualificationModel.deleteOne({ idNumber: id });
    return NextResponse.json({ success: true, message: 'Qualification removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
