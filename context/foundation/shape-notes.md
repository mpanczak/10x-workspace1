---
project: Aplikacja mobilna dla motocyklistów
context_type: greenfield
updated: 2026-05-19
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 13
  product_type: mobile
  target_scale:
    users: large
  timeline_budget:
    mvp_weeks: 8
    after_hours_only: true
    hard_deadline: null
  quality_check_status: accepted
---

<!-- seed idea: Aplikacja mobilna dla motocyklistów — łączenie społeczności, wspólne wyjazdy i wydarzenia -->

## Vision & Problem Statement

Motocyklista, który chce pojechać z kimś konkretnego dnia, nie ma dziś dedykowanego narzędzia. Przegląda grupy na Facebooku, czyta posty bez filtrów, bez informacji o trasie ani stylu jazdy potencjalnego kompana — i traci czas na poszukiwania, które kończą się niepewnością albo brakiem odpowiedzi.

Ból jest trójwarstwowy:
- **Workflow friction** — za dużo kroków między "chcę jechać" a "jadę z kimś".
- **Dane uwięzione** — trasy, profile, historia wyjazdów istnieją, ale są rozproszone w nieustrukturyzowanych postach.
- **Coordination overhead** — ustalenie szczegółów wyjazdu (godzina, trasa, tempo) jest żmudne nawet gdy znajdzie się chętnego.

Insight: Cold-start jest kluczową barierą — aplikacja społecznościowa bez masy krytycznej jest bezużyteczna. To odstraszało wcześniejszych budowniczych.

## User & Persona

**Persona główna**: Każdy motocyklista — niezależnie od stylu jazdy (touring, sport, enduro, cruiser). Wspólny mianownik: szuka kompana lub grupy do wyjazdu i chce wiedzieć z kim jedzie zanim wyjedzie.

## Access Control

- **Metoda dostępu**: Login (email + hasło / OAuth / passwordless). Konto wymagane — profil jeźdźca jest rdzeniem wartości aplikacji.
- **Model ról**: Płaski — wszyscy zalogowani użytkownicy mają identyczne uprawnienia. Każdy może tworzyć wyjazdy, dołączać do wyjazdów innych i przeglądać profile.
- **Uzasadnienie MVP**: Najmniejszy model dostępu, który czyni MVP użytecznym — rola organizatora/uczestnika jest kontekstowa (per wyjazd), nie systemowa.

## Success Criteria

### Primary
MVP działa gdy oba poniższe flow działają end-to-end:

**Path 1 — uczestnik**: Użytkownik loguje się → widzi listę przejazdów → filtruje → wybiera przejazd → dołącza bezpośrednio → wysyła wiadomość/komentarz do organizatora. Organizator widzi nowego uczestnika na liście swojego przejazdu.

**Path 2 — organizator**: Użytkownik loguje się → tworzy nowy przejazd → uzupełnia formularz (opis trasy, motocykl, styl jazdy, cel, godzina startu, planowany przyjazd, adres startowy) → przejazd pojawia się na publicznej liście.

### Secondary
Wizualizacja pełnej trasy na mapie — atrakcyjna funkcja, ale MVP działa bez niej; adres tekstowy + link Google Maps wystarczy na start.

### Guardrails
- **Integralność danych przejazdu**: Uczestnik, który dołączył do przejazdu, MUSI być widoczny dla organizatora. Brak tej spójności uszkadza rdzeń produktu.
- **Prywatność lokalizacji**: Lokalizacja użytkownika (punkt startowy, adres domowy) nie może być ujawniana innym użytkownikom bez jego świadomej zgody.

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
- FR-010: Uczestnik widzi adres punktu startowego przejazdu oraz link do Google Maps. Priority: must-have
  > Socrates: Kontr-argument przyjęty: "embedded mapa = złożoność techniczna nieproporcjonalna do wartości na MVP". FR zmieniony: adres tekstowy + link Google Maps zamiast interaktywnej mapy.

- FR-011: Użytkownik może zobaczyć pełną trasę przejazdu na interaktywnej mapie. Priority: nice-to-have
  > Socrates: Nice-to-have — utrzymany w zakresie jako cel v1.5.

### Komunikacja
- FR-012: Użytkownik może uczestniczyć w czacie grupowym przypisanym do przejazdu. Priority: nice-to-have
  > Socrates: Nice-to-have — utrzymany; real-time chat jest osobnym modułem infrastrukturalnym.

## User Stories

### US-01: Dołączanie do przejazdu (Path 1)
**Given** jestem zalogowanym użytkownikiem z uzupełnionym profilem,
**When** wchodzę w zakładkę Przejazdy, filtruję po interesującym mnie regionie i stylu jazdy i wybieram przejazd,
**Then** widzę szczegóły przejazdu (opis trasy, motocykl organizatora, poziom doświadczenia, adres startowy), dołączam jednym kliknięciem i widzę potwierdzenie że jestem na liście uczestników.

### US-02: Tworzenie przejazdu (Path 2)
**Given** jestem zalogowanym użytkownikiem,
**When** tworzę nowy przejazd i uzupełniam formularz (opis trasy, mój motocykl, styl, cel, data/czas, adres startowy),
**Then** przejazd pojawia się na publicznej liście i widzę kto do mnie dołączył.

## Business Logic

**Reguła domeny (jedno zdanie)**: Aplikacja przekształca nieustrukturyzowany zamiar wyjazdu w ogłoszenie z sygnałami zgodności (styl jazdy, poziom doświadczenia, region, data, typ motocykla), które umożliwia jeźdźcom filtrowanie i dobór towarzyszy — zamiast czytania nieustrukturyzowanych postów.

**Model**: Strukturyzowana tablica ogłoszeń z filtrami. Aplikacja nie podejmuje decyzji za użytkownika — decyduje jakie pola są sygnałami zgodności dla motocyklowych przejazdów (to jest wiedza domenowa osadzona w modelu danych). Użytkownik filtruje i self-selektuje.

**Dane wejściowe reguły** (uchwycone przez organizatora przy tworzeniu przejazdu): styl jazdy, poziom doświadczenia, region / adres startowy, data i czas, typ motocykla, opis trasy, cel wyjazdu.

**Wyjście reguły**: przejazd jest odkrywalny przez innych jeźdźców poprzez filtry zgodności.

## Non-Functional Requirements

- **NFR-001**: Aplikacja działa na iOS i Android. Wykluczenie jednej platformy wyklucza część społeczności.
- **NFR-002**: Lista przejazdów ładuje się w czasie postrzeganym przez użytkownika poniżej 2 sekund (p95) przy standardowym połączeniu mobilnym.

## Non-Goals

- **Brak obsługi wydarzeń / zlotów**: MVP obsługuje wyłącznie wspólne przejazdy. Zloty, rajdy i imprezy mają inną logikę organizacyjną — poza zakresem.
- **Brak kont grupowych / klubowych**: Jeden użytkownik = jeden profil. Konta organizacji, klubów motocyklowych i drużyn są poza zakresem MVP.

## Open Questions

- **OQ-001**: Przy tysiącach użytkowników — czy filtrowanie wystarczy, czy pojawi się presja na rekomendacje ("przejazdy w Twoim regionie / stylu")? Jeśli tak, reguła domenowa zmieni się z filtrowania w ranking/rekomendację. Decyzja odkładana do pierwszych danych z użytkowania.
- **OQ-002**: Wiarygodność samooceny poziomu doświadczenia (FR-013) — przy dużej bazie "zaawansowany" staje się bez znaczenia. Weryfikacja poziomów (np. przez odznaki zdobywane automatycznie, oceny po przejazdach) wymaga przemyślenia przed v2.

## Timeline acknowledgment
Acknowledged on 2026-05-19: 6–10 tygodniowy MVP (estymacja: 8 tygodni) wymaga systematycznej, popołudniowej pracy. Użytkownik przyjął ten koszt świadomie.
