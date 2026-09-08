import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { env } from "../config/env";
import { recordAudit } from "./auditLog.service";

export class LoginLockedError extends Error {
  constructor(public retryAfterMinutes: number) {
    super("Konto jest tymczasowo zablokowane.");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Nieprawidłowy e-mail lub hasło.");
  }
}

/** 15 min → 1h → 24h (patrz LOGIN_LOCKOUT_STAGES_MINUTES w .env). */
function lockoutMinutesForLevel(level: number): number {
  const stages = env.LOGIN_LOCKOUT_STAGES_MINUTES;
  const index = Math.min(level, stages.length - 1);
  return stages[index];
}

/**
 * Logowanie z tymczasową, samo-wygasającą blokadą konta zamiast trwałej —
 * patrz PROJECT.md, sekcja "Ochrona przed atakami na logowanie". Nie ma
 * ręcznego odblokowywania: konto samo się odblokowuje po upływie czasu,
 * więc nie ma ryzyka trwałego zablokowania jedynego admina.
 */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Ta sama odpowiedź niezależnie od tego, czy konto istnieje — nie
  // zdradzamy atakującemu, które adresy e-mail są zarejestrowane.
  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
    throw new LoginLockedError(minutesLeft);
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    const attempts = user.failedLoginAttempts + 1;

    if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
      const newLevel = user.lockLevel + 1;
      const minutes = lockoutMinutesForLevel(newLevel - 1);
      const lockedUntil = new Date(Date.now() + minutes * 60_000);

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockLevel: newLevel, lockedUntil },
      });

      await recordAudit({
        entityType: "User",
        entityId: user.id,
        action: "LOCKOUT",
        performedByLabel: "system (ochrona logowania)",
        dataAfter: { email: user.email, lockedUntil, lockLevel: newLevel },
      });

      throw new LoginLockedError(minutes);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts },
    });

    throw new InvalidCredentialsError();
  }

  if (user.failedLoginAttempts > 0 || user.lockLevel > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
    });
  }

  return user;
}
