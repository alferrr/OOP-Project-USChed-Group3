import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { getConfig } from '../config'
import { prisma } from '../db'
import { ConsentRequiredError } from '../errors'
import { TERMS_TEXT } from '../terms'

export interface Terms {
  version: string
  text: string
}

export interface Grant {
  token: string
  expiresAt: Date
}

/** Verified contents of a consent token. */
export interface Claims {
  sessionId: string
  termsVersion: string
  expiresAt: Date
}

export function currentTerms(): Terms {
  return { version: getConfig().termsVersion, text: TERMS_TEXT }
}

/** Records consent evidence (no credentials, no names) and returns a signed token. */
export async function recordConsent(
  termsVersion: string,
  agreedTerms: boolean,
  agreedCredentialUse: boolean,
  ip: string | null,
  userAgent: string | null,
): Promise<Grant> {
  const cfg = getConfig()
  if (!agreedTerms || !agreedCredentialUse || cfg.termsVersion !== termsVersion) {
    throw new ConsentRequiredError('Both consents are required for the current terms version.')
  }
  const sessionId = randomUUID()
  const now = new Date()
  await prisma.consentRecord.create({
    data: {
      sessionId,
      termsVersion,
      agreedTerms: true,
      agreedCredentialUse: true,
      ipHash: sha256Hex(`${cfg.consent.ipSalt}:${ip ?? ''}`),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      acceptedAt: now,
    },
  })
  const expiresAt = new Date(now.getTime() + cfg.consent.ttlMinutes * 60_000)
  return { token: sign(sessionId, termsVersion, expiresAt), expiresAt }
}

/** Throws ConsentRequiredError unless the token is authentic, unexpired, and for the current terms. */
export function verifyConsent(token: string | null | undefined, now: Date = new Date()): Claims {
  if (!token || !token.trim()) throw new ConsentRequiredError('Consent is required before using ISMIS features.')
  const dot = token.indexOf('.')
  if (dot < 1) throw invalid()
  const payloadB64 = token.slice(0, dot)
  const expected = mac(payloadB64)
  const actual = Buffer.from(token.slice(dot + 1), 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw invalid()

  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  const parts = payload.split('|')
  if (parts.length !== 3 || !/^\d+$/.test(parts[2])) throw invalid()
  const expiresAt = new Date(Number(parts[2]) * 1000)
  if (expiresAt.getTime() < now.getTime()) {
    throw new ConsentRequiredError('Consent has expired. Please accept the terms again.')
  }
  if (getConfig().termsVersion !== parts[1]) {
    throw new ConsentRequiredError('The terms have changed. Please review and accept them again.')
  }
  return { sessionId: parts[0], termsVersion: parts[1], expiresAt }
}

function sign(sessionId: string, version: string, expiresAt: Date): string {
  const payload = Buffer.from(`${sessionId}|${version}|${Math.floor(expiresAt.getTime() / 1000)}`, 'utf8').toString('base64url')
  return `${payload}.${mac(payload).toString('base64url')}`
}

function mac(data: string): Buffer {
  return createHmac('sha256', getConfig().consent.secret).update(data, 'utf8').digest()
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

const invalid = () => new ConsentRequiredError('Consent token is not valid.')
