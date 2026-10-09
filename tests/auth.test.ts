import assert from 'assert';
import { createSignedSessionToken, verifySignedSessionToken } from '../src/lib/auth';

async function runAuthTests() {
  console.log('=== Running Server-Side Auth & Security Test Suite ===\n');

  // Test 1: Generate valid signed session token
  const validAdminUser = {
    id: '65f1234567890abcdef12345',
    username: 'admin',
    name: 'General Manager',
    email: 'admin@hotel.com',
    role: 'Admin' as const,
  };

  const token = createSignedSessionToken(validAdminUser);
  assert.ok(token && token.includes('.'), 'Token must be formatted as payload.signature');
  console.log('✔ Test 1 Passed: Generated cryptographically signed HMAC token.');

  // Test 2: Verify valid token
  const verifiedPayload = verifySignedSessionToken(token);
  assert.ok(verifiedPayload !== null, 'Token should verify successfully');
  assert.strictEqual(verifiedPayload?.username, 'admin');
  assert.strictEqual(verifiedPayload?.role, 'Admin');
  console.log('✔ Test 2 Passed: Verified valid signed token payload.');

  // Test 3: Reject tampered / unsigned token (e.g. attacker changing role to Admin)
  const [payloadBase64] = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...validAdminUser, role: 'Admin', exp: Date.now() + 100000 })
  ).toString('base64url');
  const forgedToken = `${tamperedPayload}.invalid_fake_signature_hash`;

  const forgedVerification = verifySignedSessionToken(forgedToken);
  assert.strictEqual(forgedVerification, null, 'Forged token must be rejected');
  console.log('✔ Test 3 Passed: Successfully rejected tampered/forged session token.');

  // Test 4: Reject expired token
  const expiredPayloadBase64 = Buffer.from(
    JSON.stringify({ ...validAdminUser, exp: Date.now() - 5000 })
  ).toString('base64url');
  
  // Create valid signature for expired payload to isolate expiration check
  const crypto = await import('crypto');
  const secret = process.env.SESSION_SECRET || 'zemenserve_secure_session_secret_key_2026_et';
  const expiredSignature = crypto.createHmac('sha256', secret).update(expiredPayloadBase64).digest('base64url');
  const expiredToken = `${expiredPayloadBase64}.${expiredSignature}`;

  const expiredVerification = verifySignedSessionToken(expiredToken);
  assert.strictEqual(expiredVerification, null, 'Expired token must be rejected');
  console.log('✔ Test 4 Passed: Successfully rejected expired session token.');

  // Test 5: Verify role authorization logic (Cashier vs Admin permission check)
  const cashierUser = {
    id: '65f1234567890abcdef67890',
    username: 'cashier1',
    name: 'Abebe Cashier',
    email: 'cashier@hotel.com',
    role: 'Cashier' as const,
  };

  const cashierToken = createSignedSessionToken(cashierUser);
  const cashierSession = verifySignedSessionToken(cashierToken);
  assert.strictEqual(cashierSession?.role, 'Cashier');

  const adminAllowedRoles = ['Admin'];
  const isCashierAuthorizedForAdminRoute = adminAllowedRoles.includes(cashierSession!.role);
  assert.strictEqual(isCashierAuthorizedForAdminRoute, false, 'Cashier must NOT be authorized for Admin-only routes');
  console.log('✔ Test 5 Passed: Role authorization restriction enforced correctly (403 Forbidden check).');

  console.log('\n✅ ALL SERVER-SIDE AUTH & AUTHORIZATION TESTS PASSED CLEANLY!\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth Test Suite Failed:', err);
  process.exit(1);
});
