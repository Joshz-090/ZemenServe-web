import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import { UserModel, IUser } from '@/lib/models/User';
import { UserRole } from '@/lib/types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'zemenserve_secure_session_secret_key_2026_et';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC SHA-256 session token.
 */
export function createSignedSessionToken(user: { id: string; username: string; name: string; email: string; role: UserRole }): string {
  const payload: SessionPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a signed session token. Returns parsed payload if valid, null if invalid/expired.
 */
export function verifySignedSessionToken(token: string): SessionPayload | null {
  try {
    if (!token || !token.includes('.')) return null;

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export interface AuthResult {
  errorResponse?: NextResponse;
  session?: SessionPayload;
  userDoc?: IUser;
}

/**
 * Server-side authentication and role authorization middleware helper.
 * Validates session token and queries DB to ensure active user status.
 */
export async function verifySessionAndRole(
  req: Request | NextRequest,
  allowedRoles?: UserRole[]
): Promise<AuthResult> {
  try {
    let token: string | undefined;

    // 1. Try reading token from Authorization header or Cookies
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/zemen_auth_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      return {
        errorResponse: NextResponse.json(
          { success: false, error: 'Authentication required. Please log in.' },
          { status: 401 }
        ),
      };
    }

    // 2. Verify cryptographically signed token
    const sessionPayload = verifySignedSessionToken(token);
    if (!sessionPayload) {
      return {
        errorResponse: NextResponse.json(
          { success: false, error: 'Invalid or expired session token.' },
          { status: 401 }
        ),
      };
    }

    // 3. Verify user exists and is active in database
    await connectToDatabase();
    const userDoc = await UserModel.findById(sessionPayload.id);

    if (!userDoc || !userDoc.isActive) {
      return {
        errorResponse: NextResponse.json(
          { success: false, error: 'Account is deactivated or no longer exists.' },
          { status: 401 }
        ),
      };
    }

    // 4. Verify role authorization
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userDoc.role as UserRole)) {
        return {
          errorResponse: NextResponse.json(
            { success: false, error: `Forbidden: Access restricted. Requires ${allowedRoles.join(' or ')} role.` },
            { status: 403 }
          ),
        };
      }
    }

    return { session: sessionPayload, userDoc };
  } catch (err: any) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Authentication processing error.' },
        { status: 500 }
      ),
    };
  }
}
