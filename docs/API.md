# Kontrakt API

Wszystkie trasy (poza `/api/health` i `/api/public/*`) wymagają zalogowania
(ciasteczko sesji). `Rola` mówi, kto ma dostęp: **Admin**, **Rodzic**
(tylko do swoich dzieci), **Każdy** (zalogowany, oba zakresy inaczej
filtrowane) albo **Brak** (bez logowania).

Legenda statusu implementacji: ✅ gotowe · 🚧 trasa + uprawnienia gotowe,
logika biznesowa zaplanowana na kolejny etap (zwraca `501`).

## Auth

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| POST | `/api/auth/login` | Brak | Logowanie e-mail+hasło, ustawia ciasteczko sesji. Limit prób per IP + tymczasowa blokada konta. | ✅ |
| POST | `/api/auth/logout` | Każdy | Wylogowanie, niszczy sesję. | ✅ |
| GET | `/api/auth/me` | Każdy | Dane zalogowanego użytkownika + lista `childIds` (dla rodzica). | ✅ |

## Konta (użytkownicy)

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/users` | Admin | Lista kont rodziców. | ✅ |
| POST | `/api/users` | Admin | Utworzenie konta rodzica + powiązanie z dzieckiem/dziećmi. | ✅ |
| PATCH | `/api/users/:id` | Admin | Edycja konta / przypisań do dzieci. | ✅ |
| POST | `/api/users/:id/reset-password` | Admin | Ręczny reset hasła (bez e-maila — patrz PROJECT.md). | ✅ |
| DELETE | `/api/users/:id` | Admin | Usunięcie konta. | ✅ |

## Dzieci

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/children` | Każdy | Admin: wszystkie. Rodzic: tylko powiązane. | ✅ |
| GET | `/api/children/:id` | Każdy | Jak wyżej, dla pojedynczego dziecka. | ✅ |
| POST | `/api/children` | Admin | Dodanie dziecka. | ✅ |
| PATCH | `/api/children/:id` | Admin | Edycja dziecka. | ✅ |
| DELETE | `/api/children/:id` | Admin | Usunięcie (kaskadowo wpłaty i powiązania rodziców; pełna migawka w logu audytowym). | ✅ |
| GET | `/api/children/:id/ledger?semesterId=` | Każdy | Rozliczenie dziecka wg kategorii (kwota/wpłacono/brakuje) w danym semestrze. | ✅ |

## Semestry

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/semesters` | Każdy | Lista dwóch semestrów bieżącego roku. | ✅ |

## Kategorie i kwoty docelowe

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/categories` | Admin | Lista kategorii (z flagą `archived`). | ✅ |
| POST | `/api/categories` | Admin | Nowa kategoria. | ✅ |
| PATCH | `/api/categories/:id` | Admin | Edycja nazwy. | ✅ |
| DELETE | `/api/categories/:id` | Admin | Soft delete (`archived = true`) — historyczne wpłaty zostają widoczne. | ✅ |
| GET | `/api/categories/:id/targets` | Admin | Domyślne kwoty per semestr. | ✅ |
| PUT | `/api/categories/:id/targets/:semesterId` | Admin | Ustawienie/zmiana kwoty domyślnej. | ✅ |
| PUT | `/api/children/:id/amounts/:categoryId/:semesterId` | Admin | Nadpisanie kwoty dla konkretnego dziecka. | ✅ |
| DELETE | `/api/children/:id/amounts/:categoryId/:semesterId` | Admin | Usunięcie nadpisania (powrót do kwoty domyślnej). | ✅ |

## Wpłaty

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/payments?childId=&categoryId=&semesterId=` | Każdy | Admin: wszystkie (z filtrami). Rodzic: tylko wpłaty swojego dziecka. | ✅ |
| POST | `/api/payments` | Admin | Nowa wpłata (dopuszczalne wiele częściowych na tę samą kategorię/semestr). | ✅ |
| PATCH | `/api/payments/:id` | Admin | Edycja wpłaty. | ✅ |
| DELETE | `/api/payments/:id` | Admin | Usunięcie wpłaty (hard delete + migawka w logu audytowym). | ✅ |

## Ustawienia

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/settings` | Admin | Odczyt (`publicViewEnabled`, `activeSemesterId`). | ✅ |
| PATCH | `/api/settings` | Admin | Zmiana ustawień, w tym przełącznik widoku publicznego. | ✅ |

## Raporty

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/reports/arrears?semesterId=` | Admin | Zestawienie zaległości wg dziecka/kategorii. | ✅ |
| GET | `/api/reports/summary?semesterId=` | Admin | Zestawienie zbiorcze grupy (reużywa `services/reports.service.ts`). | ✅ |
| GET | `/api/reports/child/:id?semesterId=` | Admin | Karta wpłat pojedynczego dziecka. | ✅ |
| GET | `/api/reports/export?report=&format=pdf\|xlsx` | Admin | Eksport raportu do pliku. | 🚧 |

## Import / eksport

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/backup/export` | Admin | Pełny eksport bazy do jednego pliku JSON. | ✅ |
| POST | `/api/backup/import` | Admin | Pełne przywrócenie bazy z pliku JSON. | ✅ |

## Widok publiczny

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/public/summary?semesterId=` | Brak | Zagregowane dane grupy (`targetTotal`, `collectedTotal`, `byCategory`) — **bez** danych dzieci. Zwraca `404`, gdy `publicViewEnabled = false`. | ✅ |

## Diagnostyka

| Metoda | Ścieżka | Rola | Opis | Status |
|---|---|---|---|---|
| GET | `/api/health` | Brak | Status appki + połączenia z bazą. | ✅ |
