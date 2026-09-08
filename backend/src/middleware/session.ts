import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import type { Express } from "express";
import { env } from "../config/env";

const MySQLStore = MySQLStoreFactory(session);

/**
 * Sesja w ciasteczku httpOnly + secure + SameSite, magazyn sesji w MySQL
 * (bez dodatkowej zależności typu Redis) — patrz PROJECT.md, sekcja
 * "Uwierzytelnianie". `secure: "auto"` oznacza sekcję cookie jako bezpieczną
 * także wtedy, gdy TLS terminuje NGINX Proxy Manager przed appką (wymaga
 * `trust proxy`, ustawianego w middleware/security.ts).
 */
export function applySessionMiddleware(app: Express) {
  const store = new MySQLStore({
    uri: env.DATABASE_URL,
    createDatabaseTable: true,
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
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
