import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "ADMIN" | "PARENT";
    email?: string;
    displayName?: string;
  }
}
