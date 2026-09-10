import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

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

export function HelpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate(-1)}>
        ‹ Wróć
      </button>

      <div className="page-header">
        <h1>Pomoc</h1>
      </div>

      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "1rem" }}>
        Krótki przewodnik po appce — co gdzie znaleźć i jak z tego korzystać. Kliknij tytuł sekcji, żeby ją
        rozwinąć.
      </p>

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
    </div>
  );
}
