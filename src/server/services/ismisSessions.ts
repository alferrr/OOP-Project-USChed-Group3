import { randomBytes } from 'node:crypto'
import { getConfig } from '../config'
import { IsmisSessionExpiredError, RateLimitedError } from '../errors'
import { IsmisConnection } from '../ismis/connection'
import { recordIsmisFailure } from './ismisHealth'
import { singleton } from './singleton'

export interface Opened {
  sessionId: string
  expiresAt: Date
}

interface Entry {
  id: string
  studentIdNumber: string
  connection: IsmisConnection | null
  createdAt: number
  lastUsed: number
  busy: boolean
}

/** A leased session: hold it while a search runs so the reaper leaves it alone. */
export class Lease {
  constructor(
    private readonly entry: Entry,
    private readonly owner: IsmisSessionService,
  ) {}

  connection(): IsmisConnection {
    if (!this.entry.connection) throw new IsmisSessionExpiredError('Your ISMIS session has ended. Please sign in again.')
    return this.entry.connection
  }

  sessionId(): string {
    return this.entry.id
  }

  studentIdNumber(): string {
    return this.entry.studentIdNumber
  }

  /** The session is unusable (e.g. ISMIS dropped it): remove it so the student is asked to sign in again. */
  destroy(): void {
    this.owner.remove(this.entry)
  }

  release(): void {
    this.entry.lastUsed = Date.now()
    this.entry.busy = false
  }
}

/**
 * Holds signed-in ISMIS connections in memory so a student signs in once and then runs several searches.
 * Each session is identified by the student's own student ID number (their username) and by a separate,
 * unguessable session id that the browser holds and presents on every later call; that id alone is proof
 * enough of who is asking, the same way any bearer session token is. The password is used only inside
 * login() and never stored; only the session cookies and the ID number live on, in memory, never on disk or
 * in the database. A session ends when the student signs out, after an idle timeout, after a maximum
 * lifetime, or when the server restarts.
 */
export class IsmisSessionService {
  private readonly sessions = new Map<string, Entry>()
  private readonly reaper: NodeJS.Timeout

  constructor() {
    this.reaper = setInterval(() => this.reapExpired(), 15_000)
    this.reaper.unref() // never keep the process alive just for housekeeping
  }

  /**
   * Signs in to ISMIS. idNumber is the student's own ISMIS username, exactly as they typed it; ISMIS accepting
   * the login alongside it is what establishes that it really is theirs.
   */
  async login(idNumber: string, password: string): Promise<Opened> {
    const cfg = getConfig()
    if (this.sessions.size >= cfg.ismisSession.maxSessions) {
      throw new RateLimitedError('USChed has too many signed-in students right now. Try again shortly.')
    }
    let connection: IsmisConnection
    try {
      connection = await IsmisConnection.signIn(cfg.ismis, idNumber, password)
    } catch (e) {
      recordIsmisFailure(e)
      throw e
    }
    // One session per student: signing in again replaces the previous one.
    for (const e of [...this.sessions.values()]) if (e.studentIdNumber === idNumber) this.remove(e)
    const now = Date.now()
    const entry: Entry = { id: newId(), studentIdNumber: idNumber, connection, createdAt: now, lastUsed: now, busy: false }
    this.sessions.set(entry.id, entry)
    return { sessionId: entry.id, expiresAt: new Date(this.expiresAt(entry)) }
  }

  /** Leases the session for one search run; throws if it is missing or expired. */
  lease(sessionId: string | null | undefined): Lease {
    const e = this.live(sessionId)
    if (e.busy) throw new RateLimitedError('A search is already running for your ISMIS session.')
    e.busy = true
    e.lastUsed = Date.now()
    return new Lease(e, this)
  }

  /**
   * Who a live session belongs to, for endpoints that only need to know the student's identity (browsing their
   * own catalog) without holding the ISMIS connection itself. Refreshes the idle timer the same as a lease would.
   */
  identify(sessionId: string | null | undefined): string {
    const e = this.live(sessionId)
    e.lastUsed = Date.now()
    return e.studentIdNumber
  }

  /** Ends every session a student has (an admin signing someone out, or their data being deleted). Returns how many ended. */
  endForStudent(studentIdNumber: string): number {
    const mine = [...this.sessions.values()].filter((e) => e.studentIdNumber === studentIdNumber)
    for (const e of mine) this.remove(e)
    return mine.length
  }

  /** Signs out: ends the session immediately. An unknown id is ignored. */
  logout(sessionId: string | null | undefined): void {
    const e = sessionId ? this.sessions.get(sessionId) : undefined
    if (e) this.remove(e)
  }

  /** For the admin dashboard: who is signed in and for how long. Never exposes session ids or connections. */
  overview(): { studentIdNumber: string; createdAt: Date; lastUsed: Date; expiresAt: Date; busy: boolean }[] {
    return [...this.sessions.values()].map((e) => ({
      studentIdNumber: e.studentIdNumber,
      createdAt: new Date(e.createdAt),
      lastUsed: new Date(e.lastUsed),
      expiresAt: new Date(this.expiresAt(e)),
      busy: e.busy,
    }))
  }

  activeSessions(): number {
    return this.sessions.size
  }

  /**
   * Registers a session for studentIdNumber without contacting ISMIS at all. Only ever called from tests
   * that need a signed-in identity but are not themselves testing the ISMIS connection; the connection
   * stored is null, so a leased test session cannot run a real search.
   */
  seedTestSession(studentIdNumber: string): string {
    const now = Date.now()
    const entry: Entry = { id: newId(), studentIdNumber, connection: null, createdAt: now, lastUsed: now, busy: false }
    this.sessions.set(entry.id, entry)
    return entry.id
  }

  /** Test hook: swaps in an already-built connection (e.g. one pointed at a fake ISMIS). */
  seedConnection(studentIdNumber: string, connection: IsmisConnection): string {
    const id = this.seedTestSession(studentIdNumber)
    this.sessions.get(id)!.connection = connection
    return id
  }

  remove(e: Entry): void {
    if (this.sessions.get(e.id) === e) {
      this.sessions.delete(e.id)
      void e.connection?.close()
    }
  }

  reapExpired(): void {
    for (const e of [...this.sessions.values()]) {
      if (!e.busy && this.isExpired(e)) this.remove(e)
    }
  }

  shutdown(): void {
    clearInterval(this.reaper)
    for (const e of [...this.sessions.values()]) this.remove(e)
  }

  private live(sessionId: string | null | undefined): Entry {
    const e = sessionId ? this.sessions.get(sessionId) : undefined
    if (!e || this.isExpired(e)) throw new IsmisSessionExpiredError('Your ISMIS session has ended. Please sign in again.')
    return e
  }

  private expiresAt(e: Entry): number {
    const s = getConfig().ismisSession
    return Math.min(e.lastUsed + s.idleMinutes * 60_000, e.createdAt + s.maxMinutes * 60_000)
  }

  private isExpired(e: Entry): boolean {
    return this.expiresAt(e) <= Date.now()
  }
}

const newId = () => randomBytes(24).toString('base64url')

export const ismisSessions = (): IsmisSessionService => {
  const service = singleton('ismisSessions', () => new IsmisSessionService())
  // Dev hot reload keeps the instance pinned on globalThis while the class is re-evaluated, so an instance built
  // before a new method was added would not have it. Re-point it at the current class; its state is untouched.
  if (Object.getPrototypeOf(service) !== IsmisSessionService.prototype) Object.setPrototypeOf(service, IsmisSessionService.prototype)
  return service
}
