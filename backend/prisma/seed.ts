import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const semesters = await Promise.all(
    [1, 2].map((number) =>
      prisma.semester.upsert({
        where: { number },
        update: {},
        create: { number, label: `Semestr ${number}` },
      })
    )
  );

  await prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", publicViewEnabled: false, activeSemesterId: semesters[0].id },
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? "Skarbnik";

  if (!adminEmail || !adminPassword) {
    console.warn("Pomijam tworzenie konta admina — brak ADMIN_EMAIL/ADMIN_PASSWORD w .env.");
    return;
  }

  const passwordHash = await hashPassword(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      displayName: adminDisplayName,
    },
  });

  console.log(`Gotowe: 2 semestry, ustawienia, konto admina (${adminEmail}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
