import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function Section({ title, defaultOpen, children }: SectionProps) {
  return (
    <details className="help-section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="help-section-body">{children}</div>
    </details>
  );
}

/** Treść pomocy w dwóch pełnych wersjach (PL/EN) zamiast płaskich kluczy
 * tłumaczeń — sekcje mają bogate formatowanie (<strong>, listy), które
 * nie mieści się wygodnie w prostych stringach ze słownika (translations.ts). */
function HelpContentPl({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <Section title="Jak w ogóle działa ta appka?" defaultOpen>
        <p>
          Skarbnik Przedszkolny to appka do prowadzenia składek grupy przedszkolnej. Rok szkolny jest podzielony
          na <strong>dwa semestry</strong> — większość ekranów (Wpłaty, Wydatki, Raporty, karta dziecka) ma u góry
          przełącznik, który pozwala przeskoczyć między nimi.
        </p>
        <p>
          Dla każdego semestru administrator ustala <strong>kategorie składek</strong> — czyli cele, na które
          zbierane są pieniądze (np. „Rada rodziców”, „Książki”, „Wycieczka”), wraz z kwotą docelową: ile trzeba
          zebrać. Rodzice wpłacają pieniądze (można wpłacać wiele razy po kawałku), a administrator rejestruje
          każdą wpłatę w appce. Administrator rejestruje też <strong>wydatki</strong> — na co faktycznie wydał
          zebrane pieniądze.
        </p>
        <p>
          Raporty pokazują całość: ile zebrano, ile jeszcze brakuje, ile wydano i ile pieniędzy skarbnik ma teraz
          realnie do dyspozycji.
        </p>
      </Section>

      <Section title="Kto co widzi — administrator i rodzic">
        <p>
          <strong>Administrator</strong> (skarbnik) widzi i zarządza wszystkim: dziećmi, kategoriami, wpłatami,
          wydatkami, kontami rodziców, raportami i ustawieniami appki.
        </p>
        <p>
          <strong>Rodzic</strong> widzi tylko dane swojego dziecka — jego wpłaty i rozliczenie. Może przeglądać,
          ale nie może samodzielnie dodawać ani zmieniać wpłat — to robi administrator. Konto rodzica zakłada
          administrator w Ustawieniach → Konta rodziców.
        </p>
      </Section>

      <Section title="Dzieci">
        <p>
          Zakładka „Dzieci” pokazuje listę wszystkich dzieci, posortowaną alfabetycznie po nazwisku. Kliknięcie w
          dziecko otwiera jego kartę: dane kontaktowe, notatki i rozliczenie składek.
        </p>
        {isAdmin && (
          <p>
            Jako administrator możesz dodać nowe dziecko (przycisk „Dodaj dziecko”), edytować dane albo usunąć
            dziecko z bazy — usunięcie jest nieodwracalne w bieżącym widoku (historia zostaje zapisana w logu
            audytowym), więc appka najpierw prosi o potwierdzenie.
          </p>
        )}
        <p>
          Na karcie dziecka, w sekcji „Raport”, można pobrać pełne zestawienie tego dziecka jako plik PDF lub
          Excel — z danymi kontaktowymi oraz rozliczeniem i historią wpłat za <strong>oba semestry naraz</strong>,
          w odróżnieniu od widoku na ekranie, który pokazuje jeden semestr na raz.
        </p>
      </Section>

      {isAdmin && (
        <Section title="Kategorie składek (cele)">
          <p>
            Kategorie ustawia się w Ustawienia → Kategorie składek. Każda kategoria ma domyślną kwotę docelową na
            dany semestr (np. 400 zł na „Radę rodziców” w Semestrze 1) — tę kwotę można też nadpisać dla
            pojedynczego dziecka na karcie dziecka (np. przy zniżce rodzeństwa).
          </p>
          <p>
            Kategorii nie da się skasować, jeśli ktoś już do niej wpłacił lub coś z niej wydano — zamiast tego
            można ją <strong>zarchiwizować</strong>. Zarchiwizowana kategoria znika z list wyboru przy nowych
            wpłatach/wydatkach, ale cała jej historia zostaje widoczna w raportach i na karcie dziecka.
          </p>
        </Section>
      )}

      <Section title="Wpłaty">
        <p>
          Zakładka „Wpłaty” pokazuje listę wpłat w wybranym semestrze — administrator widzi wszystkie, rodzic
          tylko wpłaty swojego dziecka.
        </p>
        {isAdmin && (
          <>
            <p>
              Żeby dodać wpłatę, kliknij „Dodaj wpłatę”, wybierz dziecko, kategorię, kwotę, datę i (opcjonalnie)
              opis, np. „druga rata”. Można dodawać wiele częściowych wpłat na tę samą kategorię — nie trzeba
              wpłacać całości naraz.
            </p>
            <p>
              Appka pilnuje dwóch zabezpieczeń: wpłaty w <strong>jednej kategorii</strong> nie mogą przekroczyć jej
              kwoty docelowej, a suma wpłat dziecka <strong>po wszystkich kategoriach razem</strong> nie może
              przekroczyć sumy wszystkich kwot docelowych. Jeśli appka odrzuci wpłatę, sprawdź, czy przypadkiem
              coś już nie zostało w pełni opłacone.
            </p>
            <p>Usunięcie wpłaty jest nieodwracalne w bieżącym widoku (ale zostaje ślad w logu audytowym).</p>
          </>
        )}
      </Section>

      {isAdmin && (
        <Section title="Wydatki">
          <p>
            Zakładka „Wydatki” to druga strona bilansu — tu zapisujesz, na co skarbnik faktycznie wydał zebrane
            pieniądze. Każdy wydatek jest przypisany do kategorii, ma kwotę, datę i opcjonalny opis.
          </p>
          <p>Wydatki można dodawać, edytować i usuwać — dokładnie tak samo jak wpłaty.</p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Raporty">
          <p>Zakładka „Raporty” to strona główna po zalogowaniu jako administrator. Zawiera kilka sekcji:</p>
          <ul>
            <li>
              <strong>Stan kasy</strong> — ile w sumie zebrano, ile wydano i ile skarbnik dysponuje teraz, łącznie
              za wszystkie semestry (to jedno realne konto, więc ta liczba nie zależy od wybranego niżej
              semestru).
            </li>
            <li>
              <strong>Zestawienie zbiorcze</strong> — ile zebrano/zaplanowano/wydano w każdej kategorii, w
              wybranym semestrze.
            </li>
            <li>
              <strong>Zaległości</strong> — które dzieci mają niedopłacone kategorie w wybranym semestrze, z sumą
              zaległości przy każdym dziecku.
            </li>
            <li>
              <strong>Wydatki wg miesięcy</strong> — wydatki wybranego semestru pogrupowane miesiąc po miesiącu.
            </li>
          </ul>
          <p>
            Każda sekcja (poza Stanem kasy) ma przyciski <strong>PDF</strong> i <strong>Excel</strong> do pobrania
            gotowego pliku, np. na zebranie rodziców.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Widok publiczny">
          <p>
            W Ustawienia → Widok publiczny możesz włączyć stronę dostępną pod adresem <code>/public</code> —{" "}
            <strong>bez logowania</strong>. Pokazuje ona tylko zagregowany postęp zbiórki grupy (ile zebrano z ilu
            zaplanowano, wg kategorii) — bez żadnych danych osobowych dzieci ani informacji o wydatkach czy stanie
            kasy. To wygodny sposób, żeby rodzice mogli sprawdzić postęp bez zakładania im kont.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Konta rodziców">
          <p>
            W Ustawienia → Konta rodziców tworzysz konta dla rodziców i przypisujesz do nich dzieci (jedno konto
            może mieć więcej niż jedno dziecko, np. rodzeństwo). Podajesz e-mail i hasło początkowe — appka nie
            wysyła żadnych maili, więc hasło trzeba przekazać rodzicowi samodzielnie (np. osobiście lub SMS-em).
          </p>
          <p>
            Jeśli rodzic zapomni hasła, wchodzisz na jego konto i klikasz „Reset hasła” — ustawiasz nowe i
            przekazujesz je tak samo jak za pierwszym razem. Rodzic może też sam zmienić hasło i e-mail w swoich
            Ustawieniach, jeśli tylko pamięta obecne hasło.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Kopia zapasowa">
          <p>
            W Ustawienia → Kopia zapasowa możesz pobrać pełny eksport wszystkich danych appki do jednego pliku
            JSON — to Twoja kopia bezpieczeństwa. Hasła <strong>nigdy</strong> nie trafiają do pliku.
          </p>
          <div className="tip-box warning">
            <span className="tip-icon">⚠️</span>
            <span>
              Import pliku <strong>całkowicie zastępuje</strong> wszystkie bieżące dane — dzieci, wpłaty,
              kategorie, konta. To operacja nieodwracalna, appka poprosi o potwierdzenie. Po imporcie każde konto
              dostaje nowe, tymczasowe hasło (oryginalne nie są przechowywane w kopii) — listę haseł można od
              razu pobrać jako plik, zanim znikną z ekranu po wylogowaniu.
            </span>
          </div>
        </Section>
      )}

      {isAdmin && (
        <Section title="Log audytowy">
          <p>
            W Ustawienia → Log audytowy widać historię wszystkich zmian w appce — kto, co i kiedy zrobił (np. kto
            usunął wpłatę albo zmienił kwotę docelową kategorii). Listę można filtrować po typie (dziecko,
            wpłata, wydatek…) i po rodzaju zmiany (utworzono, zaktualizowano, usunięto). Ten log zapisuje się
            automatycznie przy każdej zmianie — nie trzeba nic włączać.
          </p>
        </Section>
      )}

      <Section title="Moje konto — zmiana e-maila i hasła">
        <p>
          Na dole Ustawień każdy zalogowany (administrator i rodzic) może samodzielnie zmienić swój e-mail
          (login) albo hasło — w obu przypadkach appka poprosi o podanie <strong>obecnego hasła</strong>, dla
          bezpieczeństwa.
        </p>
      </Section>

      {isAdmin && (
        <Section title="A jeśli administrator zapomni hasła?">
          <p>
            Ponieważ appka świadomie nie wysyła żadnych maili (więc nie ma klasycznego „resetu przez e-mail”),
            odzyskanie hasła administratora wymaga bezpośredniego dostępu do serwera — komendy uruchamianej przez
            osobę, która appkę wdrożyła (np. w domu, przez Docker). To celowe zabezpieczenie: nie dodaje żadnego
            nowego, publicznie dostępnego sposobu na przejęcie konta.
          </p>
        </Section>
      )}

      <Section title="Najczęstsze pytania">
        <p>
          <strong>Dlaczego appka nie pozwala mi wpłacić więcej niż zaplanowano?</strong>
          <br />
          To celowe zabezpieczenie przed pomyłką — pojedyncza kategoria i suma wszystkich kategorii dziecka mają
          swój limit równy kwocie docelowej. Jeśli kwota docelowa się zmieniła (np. dodatkowa zbiórka), najpierw
          zwiększ ją w Ustawieniach → Kategorie.
        </p>
        <p>
          <strong>Co się dzieje z zarchiwizowaną kategorią?</strong>
          <br />
          Znika z list wyboru przy nowych wpłatach/wydatkach, ale cała jej historia (wpłaty, wydatki, kwoty)
          zostaje widoczna w raportach i na kartach dzieci — nic nie ginie.
        </p>
        <p>
          <strong>Czy mogę cofnąć usunięcie wpłaty, dziecka albo konta?</strong>
          <br />
          Nie z poziomu appki — ale każda taka operacja zostawia ślad w logu audytowym, więc historia nie ginie
          całkowicie, tylko znika z bieżących widoków.
        </p>
        <p>
          <strong>Jak przełączyć semestr?</strong>
          <br />
          Selektor semestru znajduje się w prawym górnym rogu ekranów, które pokazują dane semestralne (Wpłaty,
          Wydatki, Raporty, karta dziecka).
        </p>
      </Section>
    </>
  );
}

function HelpContentEn({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <Section title="How does this app work?" defaultOpen>
        <p>
          Skarbnik Przedszkolny is an app for running a preschool group's dues. The school year is split into{" "}
          <strong>two semesters</strong> — most screens (Payments, Expenses, Reports, a child's record) have a
          switcher at the top to jump between them.
        </p>
        <p>
          For each semester, the administrator sets up <strong>dues categories</strong> — i.e. purposes money is
          collected for (e.g. "Parents' council", "Books", "Field trip"), each with a target amount: how much
          needs to be collected. Parents pay in (you can pay in several smaller instalments), and the
          administrator records each payment in the app. The administrator also records{" "}
          <strong>expenses</strong> — what the money that was collected was actually spent on.
        </p>
        <p>
          Reports show the full picture: how much has been collected, how much is still missing, how much has
          been spent, and how much money the treasurer actually has available right now.
        </p>
      </Section>

      <Section title="Who sees what — administrator and parent">
        <p>
          <strong>Administrator</strong> (the treasurer) sees and manages everything: children, categories,
          payments, expenses, parent accounts, reports, and the app's settings.
        </p>
        <p>
          <strong>Parent</strong> sees only their own child's data — their payments and dues breakdown. They can
          view it, but cannot add or change payments themselves — the administrator does that. A parent account
          is created by the administrator in Settings → Parent accounts.
        </p>
      </Section>

      <Section title="Children">
        <p>
          The "Children" tab shows a list of all children, sorted alphabetically by last name. Clicking a child
          opens their record: contact details, notes, and their dues breakdown.
        </p>
        {isAdmin && (
          <p>
            As an administrator you can add a new child ("Add child" button), edit their details, or delete a
            child from the database — deletion is irreversible in the current view (the history is kept in the
            audit log), so the app asks for confirmation first.
          </p>
        )}
        <p>
          On a child's record, in the "Report" section, you can download a full summary for that child as a PDF
          or Excel file — with contact details plus dues and payment history for{" "}
          <strong>both semesters at once</strong>, unlike the on-screen view, which shows one semester at a time.
        </p>
      </Section>

      {isAdmin && (
        <Section title="Dues categories">
          <p>
            Categories are set up in Settings → Dues categories. Each category has a default target amount for a
            given semester (e.g. PLN 400 for "Parents' council" in Semester 1) — this amount can also be
            overridden for an individual child on their record (e.g. for a sibling discount).
          </p>
          <p>
            A category can't be deleted once someone has paid into it or something has been spent from it —
            instead, it can be <strong>archived</strong>. An archived category disappears from selection lists
            for new payments/expenses, but its entire history stays visible in reports and on children's records.
          </p>
        </Section>
      )}

      <Section title="Payments">
        <p>
          The "Payments" tab shows the list of payments for the selected semester — the administrator sees all
          of them, a parent only their own child's payments.
        </p>
        {isAdmin && (
          <>
            <p>
              To add a payment, click "Add payment", choose the child, category, amount, date, and (optionally)
              a description, e.g. "second instalment". You can add multiple partial payments for the same
              category — you don't have to pay the full amount at once.
            </p>
            <p>
              The app enforces two safeguards: payments in a <strong>single category</strong> cannot exceed its
              target amount, and a child's total payments <strong>across all categories combined</strong> cannot
              exceed the sum of all target amounts. If the app rejects a payment, check whether something has
              already been paid in full.
            </p>
            <p>Deleting a payment is irreversible in the current view (but leaves a trace in the audit log).</p>
          </>
        )}
      </Section>

      {isAdmin && (
        <Section title="Expenses">
          <p>
            The "Expenses" tab is the other side of the ledger — here you record what the treasurer actually
            spent the collected money on. Each expense is linked to a category, has an amount, a date, and an
            optional description.
          </p>
          <p>Expenses can be added, edited, and deleted — exactly the same way as payments.</p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Reports">
          <p>The "Reports" tab is the home page after logging in as administrator. It contains several sections:</p>
          <ul>
            <li>
              <strong>Treasury balance</strong> — how much has been collected in total, how much spent, and how
              much the treasurer has available now, across all semesters combined (this is one real account, so
              this figure doesn't depend on the semester selected below).
            </li>
            <li>
              <strong>Summary</strong> — how much has been collected/planned/spent in each category, for the
              selected semester.
            </li>
            <li>
              <strong>Arrears</strong> — which children have underpaid categories in the selected semester, with
              a total owed shown next to each child.
            </li>
            <li>
              <strong>Expenses by month</strong> — the selected semester's expenses grouped month by month.
            </li>
          </ul>
          <p>
            Every section (except Treasury balance) has <strong>PDF</strong> and <strong>Excel</strong> buttons
            to download a ready-made file, e.g. for a parents' meeting.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Public view">
          <p>
            In Settings → Public view you can enable a page available at <code>/public</code> —{" "}
            <strong>without logging in</strong>. It only shows the group's aggregated collection progress (how
            much collected out of how much planned, by category) — with no personal data about children and no
            information about expenses or the treasury balance. It's a convenient way for parents to check
            progress without needing an account.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Parent accounts">
          <p>
            In Settings → Parent accounts you create accounts for parents and assign children to them (one
            account can have more than one child, e.g. siblings). You set an email and an initial password — the
            app doesn't send any emails, so the password needs to be passed on to the parent yourself (e.g. in
            person or by text message).
          </p>
          <p>
            If a parent forgets their password, go to their account and click "Reset password" — set a new one
            and pass it on the same way as the first time. A parent can also change their own password and email
            in their Settings, as long as they remember their current password.
          </p>
        </Section>
      )}

      {isAdmin && (
        <Section title="Backup">
          <p>
            In Settings → Backup you can download a full export of all the app's data into a single JSON file —
            this is your safety copy. Passwords <strong>never</strong> end up in the file.
          </p>
          <div className="tip-box warning">
            <span className="tip-icon">⚠️</span>
            <span>
              Importing a file <strong>completely replaces</strong> all current data — children, payments,
              categories, accounts. This is irreversible; the app will ask for confirmation. After import, every
              account gets a new, temporary password (the originals are not stored in the backup) — you can
              download the password list as a file right away, before it disappears from the screen after you
              log out.
            </span>
          </div>
        </Section>
      )}

      {isAdmin && (
        <Section title="Audit log">
          <p>
            In Settings → Audit log you can see the history of every change in the app — who did what and when
            (e.g. who deleted a payment or changed a category's target amount). The list can be filtered by type
            (child, payment, expense…) and by kind of change (created, updated, deleted). This log is recorded
            automatically for every change — there's nothing to turn on.
          </p>
        </Section>
      )}

      <Section title="My account — changing email and password">
        <p>
          At the bottom of Settings, every logged-in user (administrator and parent) can change their own email
          (login) or password — in both cases the app will ask for your <strong>current password</strong>, for
          security.
        </p>
      </Section>

      {isAdmin && (
        <Section title="What if the administrator forgets their password?">
          <p>
            Because the app deliberately doesn't send any emails (so there's no classic "reset by email"),
            recovering the administrator's password requires direct access to the server — a command run by the
            person who deployed the app (e.g. at home, via Docker). This is a deliberate safeguard: it doesn't
            add any new, publicly reachable way to take over the account.
          </p>
        </Section>
      )}

      <Section title="Frequently asked questions">
        <p>
          <strong>Why won't the app let me pay in more than what was planned?</strong>
          <br />
          This is a deliberate safeguard against mistakes — a single category and the sum of a child's
          categories each have a limit equal to the target amount. If the target amount has changed (e.g. an
          extra collection), first increase it in Settings → Categories.
        </p>
        <p>
          <strong>What happens to an archived category?</strong>
          <br />
          It disappears from selection lists for new payments/expenses, but its entire history (payments,
          expenses, amounts) stays visible in reports and on children's records — nothing is lost.
        </p>
        <p>
          <strong>Can I undo deleting a payment, a child, or an account?</strong>
          <br />
          Not from within the app — but every such operation leaves a trace in the audit log, so the history
          isn't lost entirely, it just disappears from current views.
        </p>
        <p>
          <strong>How do I switch semesters?</strong>
          <br />
          The semester selector is in the top-right corner of screens that show semester-based data (Payments,
          Expenses, Reports, a child's record).
        </p>
      </Section>
    </>
  );
}

export function HelpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      <div className="page-header">
        <h1>{t("help.title")}</h1>
      </div>

      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "1rem" }}>
        {t("help.intro")}
      </p>

      {language === "en" ? <HelpContentEn isAdmin={isAdmin} /> : <HelpContentPl isAdmin={isAdmin} />}
    </div>
  );
}
