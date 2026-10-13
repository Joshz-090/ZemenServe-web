import { NextResponse, NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { HrReminderModel } from '@/lib/models/HrReminder';
import { verifySessionAndRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const query: any = {};
    if (date) query.date = date;

    const docs = await HrReminderModel.find(query).sort({ date: 1, priority: -1 }).lean();
    const reminders = docs.map((d: any) => ({
      id: d.idNumber,
      title: d.title,
      description: d.description || '',
      category: d.category || 'Operational',
      date: d.date,
      time: d.time || '',
      priority: d.priority || 'Normal',
      targetDepartment: d.targetDepartment || '',
      assignedToName: d.assignedToName || '',
      isCompleted: Boolean(d.isCompleted),
      relatedEventId: d.relatedEventId,
      relatedEventTitle: d.relatedEventTitle || '',
      createdBy: d.createdBy || 'Manager',
    }));

    return NextResponse.json({ success: true, reminders });
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
    const { title, description, category, date, time, priority, targetDepartment, assignedToName, relatedEventId, relatedEventTitle } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: 'Title and date are required.' }, { status: 400 });
    }

    const maxDoc = await HrReminderModel.findOne().sort({ idNumber: -1 }).select('idNumber').lean();
    const nextId = (maxDoc?.idNumber || 0) + 1;

    const newReminder = new HrReminderModel({
      idNumber: nextId,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'Operational',
      date,
      time: time || '09:00',
      priority: priority || 'Normal',
      targetDepartment: targetDepartment || '',
      assignedToName: assignedToName || '',
      isCompleted: false,
      relatedEventId: relatedEventId ? Number(relatedEventId) : undefined,
      relatedEventTitle: relatedEventTitle || undefined,
      createdBy: auth.session?.name || 'Manager',
    });

    await newReminder.save();
    return NextResponse.json({ success: true, message: 'Reminder created successfully.', reminder: newReminder });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const body = await req.json();
    const { id, isCompleted, title, description, priority } = body;

    if (!id) return NextResponse.json({ success: false, error: 'Reminder ID is required.' }, { status: 400 });

    const reminder = await HrReminderModel.findOne({ idNumber: Number(id) });
    if (!reminder) return NextResponse.json({ success: false, error: 'Reminder not found.' }, { status: 404 });

    if (isCompleted !== undefined) reminder.isCompleted = Boolean(isCompleted);
    if (title) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description.trim();
    if (priority) reminder.priority = priority;

    await reminder.save();
    return NextResponse.json({ success: true, message: 'Reminder updated successfully.' });
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

    if (!id) return NextResponse.json({ success: false, error: 'Reminder ID is required.' }, { status: 400 });

    await HrReminderModel.deleteOne({ idNumber: id });
    return NextResponse.json({ success: true, message: 'Reminder removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
