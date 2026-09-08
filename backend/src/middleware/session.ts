import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import mysql from "mysql2/promise";
import type { Express } from "express";
import { env } from "../config/env";

const MySQLStore = MySQLStoreFactory(session);

/**
 * Sesja w ciasteczku httpOnly + secure + SameSite, magazyn sesji w MySQL
 * (bez dodatkowej zależności typu Redis) — patrz PROJECT.md, sekcja
 * "Uwierzytelnianie". `secure: "auto"` oznacza ciasteczko jako bezpieczne
 * także wtedy, gdy TLS terminuje NGINX Proxy Manager przed appką (wymaga
 * `trust proxy`, ustawianego w middleware/security.ts).
 *
 * Uwaga: express-mysql-session NIE przyjmuje connection stringa jako
 * opcji `uri` — trzeba dać mu gotowy pool (mysql2 z kolei string URI
 * rozumie bezpośrednio). Pomylenie tego powoduje ciche łączenie się
 * z domyślnym localhost zamiast z kontenerem `mysql` i crash procesu
 * przy nieobsłużonym błędzie połączenia.
 */
export function applySessionMiddleware(app: Express) {
  const pool = mysql.createPool(env.DATABASE_URL);

  const store = new MySQLStore(
    {
      createDatabaseTable: true,
      schema: {
        tableName: "sessions",
        columnNames: {
          session_id: "session_id",
          expires: "expires",
          data: "data",
        },
      },
    },
    pool
  );

  // Bez tego nasłuchu nieobsłużony błąd magazynu sesji (np. chwilowa utrata
  // połączenia z MySQL) ubija cały proces Node (domyślne zachowanie
  // EventEmittera dla zdarzenia "error" bez słuchacza).
  store.on("error", (error: unknown) => {
    console.error("Błąd magazynu sesji (MySQL):", error);
  });

  app.use(
    session({
      name: "skarbnik.sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: "auto",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 12, // 12h
      },
    })
  );
}
