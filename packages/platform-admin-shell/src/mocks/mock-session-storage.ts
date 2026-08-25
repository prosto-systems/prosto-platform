import { z } from 'zod';
import type { IMockSession } from './mock-state';

export const MOCK_SESSION_STORAGE_KEY = 'prosto.admin.msw.sessions.v1';

const EMPTY_SNAPSHOT: IMockSessionSnapshot = {
  sessionSequence: 0,
  sessions: [],
};

const storedSessionSchema = z
  .object({
    csrfToken: z.string().min(1),
    expiresAt: z.number().finite(),
    id: z.string().min(1),
    userId: z.string().min(1),
  })
  .strict();

const storedSessionSnapshotSchema = z
  .object({
    sessionSequence: z.number().int().nonnegative(),
    sessions: z.array(storedSessionSchema),
    version: z.literal(1),
  })
  .strict();

export interface IMockSessionSnapshot {
  readonly sessionSequence: number;
  readonly sessions: readonly IMockSession[];
}

/** @internal */
export class MockSessionStorage {
  public constructor(private readonly storage: Storage | undefined) {}

  public load(
    validUserIds: ReadonlySet<string>,
    now = Date.now(),
  ): IMockSessionSnapshot {
    const serializedSnapshot = this.read();

    if (serializedSnapshot === undefined) {
      return EMPTY_SNAPSHOT;
    }

    const parsedSnapshot = parseSnapshot(serializedSnapshot);

    if (parsedSnapshot === undefined) {
      this.clear();
      return EMPTY_SNAPSHOT;
    }

    const sessions = parsedSnapshot.sessions.filter(
      (session) => session.expiresAt > now && validUserIds.has(session.userId),
    );
    const sessionSequence = Math.max(
      parsedSnapshot.sessionSequence,
      ...sessions.map((session) => getSessionSequence(session.id)),
    );
    const snapshot = { sessionSequence, sessions };

    if (
      sessions.length !== parsedSnapshot.sessions.length ||
      sessionSequence !== parsedSnapshot.sessionSequence
    ) {
      this.save(snapshot);
    }

    return snapshot;
  }

  public save(snapshot: IMockSessionSnapshot): void {
    try {
      this.storage?.setItem(
        MOCK_SESSION_STORAGE_KEY,
        JSON.stringify({ ...snapshot, version: 1 }),
      );
    } catch {
      // Never leave an older session snapshot restorable after a failed update.
      this.clear();
    }
  }

  public clear(): void {
    try {
      this.storage?.removeItem(MOCK_SESSION_STORAGE_KEY);
    } catch {
      // Storage can be disabled by browser privacy settings. MSW stays in memory.
    }
  }

  private read(): string | undefined {
    try {
      return this.storage?.getItem(MOCK_SESSION_STORAGE_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  }
}

export function getBrowserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function parseSnapshot(
  serializedSnapshot: string,
): z.infer<typeof storedSessionSnapshotSchema> | undefined {
  try {
    const parsedSnapshot = storedSessionSnapshotSchema.safeParse(
      JSON.parse(serializedSnapshot),
    );

    return parsedSnapshot.success ? parsedSnapshot.data : undefined;
  } catch {
    return undefined;
  }
}

function getSessionSequence(sessionId: string): number {
  const sequence = /^mock-session-(\d+)$/.exec(sessionId)?.[1];

  return sequence === undefined ? 0 : Number(sequence);
}
