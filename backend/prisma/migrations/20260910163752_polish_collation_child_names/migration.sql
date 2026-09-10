-- Sortowanie imion/nazwisk dzieci w poprawnym polskim porządku alfabetycznym
-- (ą, ć, ę, ł, ń, ó, ś, ź, ż). `utf8mb4_unicode_ci` (dotychczasowa kolacja
-- kolumny) sortuje np. "Żaba"/"Źrebak" PRZED "Zych", co jest niepoprawne
-- w polskim alfabecie (kolejność: Z, Ź, Ż) — zweryfikowane empirycznie na
-- prawdziwym MySQL. `utf8mb4_polish_ci` sortuje to poprawnie, więc tylko
-- te dwie kolumny (jedyne, po których appka faktycznie sortuje dzieci —
-- patrz routes/children.routes.ts i services/reports.service.ts) dostają
-- dedykowaną polską kolację.
ALTER TABLE `children`
  MODIFY `firstName` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_polish_ci NOT NULL,
  MODIFY `lastName` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_polish_ci NOT NULL;
