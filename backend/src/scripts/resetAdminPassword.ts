import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword, validatePasswordStrength } from "../lib/password";
import { recordAudit } from "../services/auditLog.service";

/**
 * Odzyskiwanie dostępu administratora — celowo NIE przez appkę (bez maila,
 * bez "kodu odzyskiwania" przechowywanego gdzieś w systemie), tylko przez
 * bezpośredni dostęp do serwera:
 *
 *   docker compose exec backend npm run admin:reset-password
 *
 * Uzasadnienie: appka świadomie nie wysyła e-maili (patrz PROJECT.md), więc
 * klasyczny "link resetujący" wymagałby dodania SMTP. Zamiast tego jedyną
 * drogą odzyskania hasła admina jest ktoś, kto ma dostęp do serwera —
 * dokładnie taki sam próg jak np. bezpośredni dostęp do bazy danych, więc
 * nie otwiera to żadnej nowej powierzchni ataku w internecie.
 *
 * Resetuje WYŁĄCZNIE konta ADMIN — hasła rodziców resetuje admin z poziomu
 * samej appki (Ustawienia → Konta rodziców), tam ten mechanizm nie jest
 * potrzebny.
 */

/**
 * Jeden, trwały czytnik znaków ze stdin, żyjący przez cały czas trwania
 * skryptu — celowo NIE tworzymy osobnego `stdin.on("data", …)` na każde
 * pytanie. Gdy kilka linii wejścia (e-mail + hasła) przychodzi w jednym
 * fragmencie danych (typowe przy testach/potokach), listener utworzony
 * dopiero PO pierwszym pytaniu nigdy by nie zobaczył reszty — dane
 * należące do kolejnych pytań trzeba więc buforować od samego początku,
 * nie odbierać ich na nowo za każdym razem.
 */
class StdinReader {
  private buffer: string[] = [];
  private waiting: ((char: string | null) => void) | null = null;
  private ended = false;

  constructor() {
    const stdin = process.stdin;
    stdin.setEncoding("utf8");
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.on("data", (chunk: string) => {
      for (const char of chunk) {
        if (this.waiting) {
          const resolve = this.waiting;
          this.waiting = null;
          resolve(char);
        } else {
          this.buffer.push(char);
        }
      }
    });
    stdin.on("end", () => {
      this.ended = true;
      if (this.waiting) {
        const resolve = this.waiting;
        this.waiting = null;
        resolve(null);
      }
    });
    stdin.resume();
  }

  private nextChar(): Promise<string | null> {
    if (this.buffer.length > 0) return Promise.resolve(this.buffer.shift()!);
    if (this.ended) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.waiting = resolve;
    });
  }

  async readLine(query: string, options: { hidden?: boolean } = {}): Promise<string> {
    process.stdout.write(query);
    const isTty = process.stdin.isTTY;
    let input = "";
    for (;;) {
      const char = await this.nextChar();
      if (char === null || char === "\n" || char === "\r") {
        process.stdout.write("\n");
        return input.trim();
      }
      if (char === "\x03") {
        // Ctrl-C
        process.stdout.write("\n");
        throw new Error("Przerwano.");
      }
      if (char === "\x7f" || char === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          if (isTty) process.stdout.write("\b \b");
        }
        continue;
      }
      input += char;
      if (isTty) process.stdout.write(options.hidden ? "*" : char);
    }
  }

  close() {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

async function promptNewPassword(stdin: StdinReader): Promise<string> {
  for (;;) {
    const password = await stdin.readLine("Nowe hasło: ", { hidden: true });
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      console.log(strength.reason + "\n");
      continue;
    }
    const confirmation = await stdin.readLine("Powtórz nowe hasło: ", { hidden: true });
    if (confirmation !== password) {
      console.log("Hasła nie są identyczne — spróbuj ponownie.\n");
      continue;
    }
    return password;
  }
}

/** Usuwa aktywne sesje danego konta (express-mysql-session trzyma je jako
 * JSON w kolumnie `data`) — po resecie hasła admin i tak musi się zalogować
 * ponownie wszędzie, więc od razu wymuszamy to na wszystkich urządzeniach. */
async function invalidateSessions(userId: string): Promise<number> {
  const sessions = await prisma.session.findMany();
  const staleIds = sessions
    .filter((s) => {
      try {
        return s.data ? JSON.parse(s.data).userId === userId : false;
      } catch {
        return false;
      }
    })
    .map((s) => s.sessionId);

  if (staleIds.length > 0) {
    await prisma.session.deleteMany({ where: { sessionId: { in: staleIds } } });
  }
  return staleIds.length;
}

async function main() {
  console.log("=== Reset hasła administratora — Skarbnik Przedszkolny ===");
  console.log("Ta komenda resetuje hasło konta ADMIN bezpośrednio w bazie danych.\n");

  const stdin = new StdinReader();
  try {
    const email = await stdin.readLine("E-mail konta administratora: ");
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`\nNie znaleziono konta z adresem "${email}".`);
      process.exitCode = 1;
      return;
    }
    if (user.role !== "ADMIN") {
      console.error(
        `\nKonto "${email}" nie jest kontem administratora. Hasła rodziców resetuje admin z poziomu appki ` +
          "(Ustawienia → Konta rodziców), nie tą komendą."
      );
      process.exitCode = 1;
      return;
    }

    const newPassword = await promptNewPassword(stdin);
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginAttempts: 0, lockLevel: 0, lockedUntil: null },
    });

    const invalidatedCount = await invalidateSessions(user.id);

    await recordAudit({
      entityType: "User",
      entityId: user.id,
      action: "UPDATE",
      performedById: null,
      performedByLabel: "Reset hasła administratora (komenda serwerowa)",
      dataAfter: { note: "Hasło zresetowane bezpośrednio w bazie danych przez operatora serwera." },
    });

    console.log(`\n✅ Hasło konta "${email}" zostało zmienione.`);
    if (invalidatedCount > 0) {
      console.log(`   Wylogowano ${invalidatedCount} aktywną(ych) sesję/sesji tego konta.`);
    }
  } finally {
    stdin.close();
  }
}

main()
  .catch((err) => {
    console.error("\nBłąd:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
