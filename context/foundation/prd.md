---
project: Aplikacja mobilna dla motocyklistów
version: 1
status: draft
created: 2026-05-19
context_type: greenfield
product_type: mobile
target_scale:
  users: large
  qps: "# TODO: qps — see Open Questions"
  data_volume: "# TODO: data_volume — see Open Questions"
timeline_budget:
  mvp_weeks: 8
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Motocyklista, który chce pojechać z kimś konkretnego dnia, nie ma dziś dedykowanego narzędzia. Przegląda grupy na Facebooku, czyta posty bez filtrów, bez informacji o trasie ani stylu jazdy potencjalnego kompana — i traci czas na poszukiwania, które kończą się niepewnością albo brakiem odpowiedzi.

Ból jest trójwarstwowy:
- **Workflow friction** — za dużo kroków między "chcę jechać" a "jadę z kimś".
- **Dane uwięzione** — trasy, profile, historia wyjazdów istnieją, ale są rozproszone w nieustrukturyzowanych postach.
- **Coordination overhead** — ustalenie szczegółów wyjazdu (godzina, trasa, tempo) jest żmudne nawet gdy znajdzie się chętnego.

Insight: Cold-start jest kluczową barierą — aplikacja społecznościowa bez masy krytycznej jest bezużyteczna. To odstraszało wcześniejszych budowniczych.

## User & Persona

**Persona główna**: Każdy motocyklista — niezależnie od stylu jazdy (touring, sport, enduro, cruiser). Wspólny mianownik: szuka kompana lub grupy do wyjazdu i chce wiedzieć z kim jedzie zanim wyjedzie.

## Success Criteria

### Primary
MVP działa gdy oba poniższe flow działają end-to-end:

**Path 1 — uczestnik**: Użytkownik loguje się → widzi listę przejazdów → filtruje → wybiera przejazd → dołącza bezpośrednio → wysyła wiadomość/komentarz do organizatora. Organizator widzi nowego uczestnika na liście swojego przejazdu.

**Path 2 — organizator**: Użytkownik loguje się → tworzy nowy przejazd → uzupełnia formularz (opis trasy, motocykl, styl jazdy, cel, godzina startu, planowany przyjazd, adres startowy) → przejazd pojawia się na publicznej liście.

### Secondary
Wizualizacja pełnej trasy przejazdu na interaktywnej mapie wewnątrz aplikacji — MVP działa bez niej; adres punktu startowego z możliwością nawigacji zewnętrzną aplikacją wystarczy na start.

### Guardrails
- **Integralność danych przejazdu**: Uczestnik, który dołączył do przejazdu, MUSI być widoczny dla organizatora. Brak tej spójności uszkadza rdzeń produktu.
- **Prywatność lokalizacji**: Lokalizacja użytkownika (punkt startowy, adres domowy) nie może być ujawniana innym użytkownikom bez jego świadomej zgody.

## User Stories

### US-01: Dołączanie do przejazdu (Path 1)

- **Given** jestem zalogowanym użytkownikiem z uzupełnionym profilem,
- **When** wchodzę w zakładkę Przejazdy, filtruję po interesującym mnie regionie i stylu jazdy i wybieram przejazd,
- **Then** widzę szczegóły przejazdu (opis trasy, motocykl organizatora, poziom doświadczenia, adres startowy), dołączam jednym kliknięciem i widzę potwierdzenie że jestem na liście uczestników.

### US-02: Tworzenie przejazdu (Path 2)

- **Given** jestem zalogowanym użytkownikiem,
- **When** tworzę nowy przejazd i uzupełniam formularz (opis trasy, mój motocykl, styl, cel, data/czas, adres startowy),
- **Then** przejazd pojawia się na publicznej liście i widzę kto do mnie dołączył.

## Functional Requirements

### Konto i profil
- FR-001: Użytkownik może zarejestrować się i zalogować (email + hasło lub OAuth). Priority: must-have
  > Socrates: Kontr-argument rozważony: brak. FR stoi.

- FR-002: Użytkownik może stworzyć i edytować profil (imię, bio, styl jazdy, poziom doświadczenia). Priority: must-have
  > Socrates: Kontr-argument rozważony: "wymaganie profilu to bariera onboardingu". Odrzucony — profil jest rdzeniem wartości odróżniającym app od FB.

- FR-003: Użytkownik może dodać i edytować profil motocykla (marka, model, typ). Priority: must-have
  > Socrates: Kontr-argument rozważony: brak. FR stoi.

- FR-013: Użytkownik może ręcznie ustawić poziom doświadczenia (początkujący / średniozaawansowany / zaawansowany). Priority: must-have
  > Socrates: Kontr-argument przyjęty: "samoocena jest niewiarygodna — wszyscy wpiszą 'zaawansowany'". Limitacja znana i zaakceptowana dla MVP; weryfikacja poziomów odłożona do Open Questions.

### Przeglądanie i dołączanie
- FR-004: Użytkownik może przeglądać listę aktywnych przejazdów. Priority: must-have
  > Socrates: FR fundamentalny — brak kontr-argumentu.

- FR-005: Użytkownik może filtrować przejazdy (data, region, styl jazdy). Priority: must-have
  > Socrates: Kontr-argument rozważony: "cold-start — filtry pokażą pustą listę". Odrzucony — bez filtrów app nie ma przewagi nad FB; cold-start adresowany strategią wejścia na rynek.

- FR-006: Użytkownik może dołączyć do przejazdu bezpośrednio (bez akceptacji organizatora). Priority: must-have
  > Socrates: Kontr-argument rozważony: "dołączenie bez weryfikacji profilu = nieznajomy w grupie". Odrzucony — otwarty model obniża barierę i przyspiesza cold-start; minimalne dane profilu widoczne dla organizatora.

- FR-007: Użytkownik może napisać komentarz lub wiadomość do organizatora przejazdu. Priority: must-have
  > Socrates: Kontr-argument rozważony: "publiczne komentarze = moderacyjny dług od dnia 1". Odrzucony — komunikacja z organizatorem to niezbędne minimum; moderacja lekka (report/usuń).

### Tworzenie i zarządzanie przejazdem
- FR-008: Użytkownik może stworzyć przejazd z formularzem (opis trasy, motocykl, styl jazdy, cel, data/czas startu, planowany przyjazd, adres punktu startowego). Priority: must-have
  > Socrates: Kontr-argument rozważony: "za dużo pól = organizator się zniechęca". Odrzucony — każde pole rozwiązuje konkretny ból z fazy 1 (brak trasy, brak kontekstu, brak czasu).

- FR-009: Organizator może usunąć uczestnika z przejazdu. Priority: must-have
  > Socrates: Kontr-argument rozważony: brak. Uproszczony do usuwania (bez workflow akceptacji — wszystkie przejazdy są otwarte).

### Mapa i lokalizacja
- FR-010: Uczestnik widzi adres punktu startowego przejazdu i może go otworzyć w zewnętrznej aplikacji nawigacyjnej. Priority: must-have
  > Socrates: Kontr-argument przyjęty: "embedded mapa = złożoność techniczna nieproporcjonalna do wartości na MVP". FR zmieniony: adres tekstowy z możliwością nawigacji zewnętrzną aplikacją zamiast interaktywnej mapy wbudowanej.

- FR-011: Użytkownik może zobaczyć pełną trasę przejazdu na interaktywnej mapie wewnątrz aplikacji. Priority: nice-to-have
  > Socrates: Nice-to-have — utrzymany w zakresie jako cel v1.5.

### Komunikacja
- FR-012: Użytkownik może uczestniczyć w czacie grupowym przypisanym do przejazdu. Priority: nice-to-have
  > Socrates: Nice-to-have — utrzymany; czat grupowy wymaga osobnego modułu komunikacyjnego.

## Non-Functional Requirements

- **NFR-001**: Aplikacja dostępna na iOS i Android. Wykluczenie jednej platformy wyklucza część społeczności.
- **NFR-002**: Lista przejazdów ładuje się w czasie postrzeganym przez użytkownika poniżej 2 sekund (p95) przy standardowym połączeniu mobilnym.

## Business Logic

Aplikacja przekształca nieustrukturyzowany zamiar wyjazdu w ogłoszenie z sygnałami zgodności (styl jazdy, poziom doświadczenia, region, data, typ motocykla), które umożliwia jeźdźcom filtrowanie i dobór towarzyszy — zamiast czytania nieustrukturyzowanych postów.

Aplikacja nie podejmuje decyzji za użytkownika — decyduje jakie pola są sygnałami zgodności dla motocyklowych przejazdów (to jest wiedza domenowa osadzona w modelu danych). Użytkownik filtruje i self-selektuje.

Dane wejściowe reguły (uchwycone przez organizatora przy tworzeniu przejazdu): styl jazdy, poziom doświadczenia, region / adres startowy, data i czas, typ motocykla, opis trasy, cel wyjazdu. Wyjście: przejazd jest odkrywalny przez innych jeźdźców poprzez filtry zgodności.

## Access Control

- **Metoda dostępu**: Login wymagany (email + hasło lub OAuth). Konto wymagane — profil jeźdźca jest rdzeniem wartości aplikacji.
- **Model ról**: Płaski — wszyscy zalogowani użytkownicy mają identyczne uprawnienia systemowe. Każdy może tworzyć wyjazdy, dołączać do wyjazdów innych i przeglądać profile.
- **Rola organizatora**: Kontekstowa (per wyjazd), nie systemowa — każdy zalogowany użytkownik automatycznie staje się organizatorem przejazdu który stworzył.
- **Niezalogowany użytkownik**: Dostęp do aplikacji zablokowany.

## Non-Goals

- **Brak obsługi wydarzeń / zlotów**: MVP obsługuje wyłącznie wspólne przejazdy. Zloty, rajdy i imprezy mają inną logikę organizacyjną — poza zakresem.
- **Brak kont grupowych / klubowych**: Jeden użytkownik = jeden profil. Konta organizacji, klubów motocyklowych i drużyn są poza zakresem MVP.

## Open Questions

1. **OQ-001: Rekomendacje przy skali** — Przy tysiącach użytkowników czy filtrowanie wystarczy, czy pojawi się presja na rekomendacje ("przejazdy w Twoim regionie / stylu")? Jeśli tak, reguła domenowa zmieni się z filtrowania w ranking/rekomendację. Decyzja odkładana do pierwszych danych z użytkowania. Owner: właściciel produktu. By: po zebraniu pierwszych danych użytkowania.

2. **OQ-002: Wiarygodność poziomu doświadczenia** — Samoocena (FR-013) jest potencjalnie niewiarygodna przy dużej bazie użytkowników. Weryfikacja poziomów (np. przez historię przejazdów, oceny po przejazdach) wymaga przemyślenia przed v2. Owner: właściciel produktu. By: przed v2.

3. **OQ-003: target_scale.qps** — Nie określono docelowego natężenia zapytań (requests per second). Owner: architekt / właściciel produktu. By: przed wyborem stack.

4. **OQ-004: target_scale.data_volume** — Nie określono oczekiwanego wolumenu danych (profile, przejazdy, komentarze). Owner: architekt / właściciel produktu. By: przed wyborem stack.
