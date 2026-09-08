// Pakiet nie publikuje własnych typów — deklaracja minimalna (any),
// żeby TypeScript się nie wywracał. Konfiguracja i tak jest wąskim
// gardłem tylko w src/middleware/session.ts.
declare module "express-mysql-session" {
  const MySQLStoreFactory: any;
  export = MySQLStoreFactory;
}
