import { randomBytes } from 'crypto';
import { promisify } from 'util';

const randomBytesAsync = promisify(randomBytes);

/**
 * Generate a secure random token for email verification or password reset
 * @param length - Length of token in bytes (default: 32)
 * @returns Hex-encoded token string
 */
export async function generateToken(length: number = 32): Promise<string> {
  const buf = await randomBytesAsync(length);
  return buf.toString('hex');
}

/**
 * Generate a token and calculate expiration time
 * @param expiresInHours - Hours until token expires (default: 24)
 * @returns Object with token and expiration date
 */
export async function generateTokenWithExpiration(expiresInHours: number = 24): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = await generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  return { token, expiresAt };
}


