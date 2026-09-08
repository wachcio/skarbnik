import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface PasswordCheck {
  valid: boolean;
  reason?: string;
}

const LOWER = /[a-ząćęłńóśźż]/;
const UPPER = /[A-ZĄĆĘŁŃÓŚŹŻ]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/**
 * Polityka haseł: min. 10 znaków oraz co najmniej 3 z 4 klas znaków
 * (małe litery, wielkie litery, cyfry, znaki specjalne).
 */
export function validatePasswordStrength(password: string): PasswordCheck {
  if (password.length < 10) {
    return { valid: false, reason: "Hasło musi mieć co najmniej 10 znaków." };
  }

  const matchedClasses = [LOWER, UPPER, DIGIT, SYMBOL].filter((re) => re.test(password)).length;

  if (matchedClasses < 3) {
    return {
      valid: false,
      reason:
        "Hasło musi zawierać co najmniej 3 z 4: małe litery, wielkie litery, cyfry, znaki specjalne.",
    };
  }

  return { valid: true };
}
