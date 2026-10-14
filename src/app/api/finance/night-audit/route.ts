import { NextRequest, NextResponse } from 'next/server';
import { verifySessionAndRole } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { RoomModel } from '@/lib/models/Room';
import { ReservationModel } from '@/lib/models/Reservation';
import { AccountingIntegrationService } from '@/lib/accounting/integration.service';
import { getEthiopianLocalDate } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/finance/night-audit
 * Executes the Daily Night Audit across all active checked-in rooms.
 * Automatically posts Room Revenue (4010) and Output VAT (2100) to the General Ledger.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifySessionAndRole(req, ['Admin', 'Manager', 'Accountant', 'Receptionist']);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const todayStr = getEthiopianLocalDate();
    const actorName = auth.userDoc?.name || auth.session?.username || 'Night Auditor';

    // Find all active in-house checked-in reservations
    const checkedInReservations = await ReservationModel.find({ status: 'Checked-In' }).lean();

    const auditResults = [];
    let totalNightlyRevenue = 0;
    let totalRoomsProcessed = 0;

    for (const res of checkedInReservations) {
      try {
        const journal = await AccountingIntegrationService.postRoomNightAuditJournal({
          reservationId: res.idNumber,
          bookingRef: res.bookingRef,
          roomNumber: res.roomNumber,
          guestName: res.guestName,
          nightlyRate: res.nightlyRate,
          postedBy: actorName,
          date: todayStr,
        });

        totalNightlyRevenue += res.nightlyRate;
        totalRoomsProcessed += 1;

        auditResults.push({
          success: true,
          roomNumber: res.roomNumber,
          guestName: res.guestName,
          rate: res.nightlyRate,
          journalEntryNumber: journal.entryNumber,
        });
      } catch (err: any) {
        auditResults.push({
          success: false,
          roomNumber: res.roomNumber,
          guestName: res.guestName,
          rate: res.nightlyRate,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Night Audit completed for ${todayStr}. Processed ${totalRoomsProcessed} occupied rooms.`,
      auditDate: todayStr,
      totalRoomsProcessed,
      totalNightlyRevenue,
      results: auditResults,
    });
  } catch (error: any) {
    console.error('Night Audit POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to execute night audit' },
      { status: 500 }
    );
  }
}
