---
project: Aplikacja mobilna dla motocyklistów
version: 1
status: draft
created: 2026-07-16
updated: 2026-07-16
prd_version: 1
main_goal: market-feedback
top_blocker: capacity
---

# Roadmap: Aplikacja mobilna dla motocyklistów

> Wyprowadzona z `context/foundation/prd.md` (v1) + auto-zbadanego baseline'u kodu
> (potwierdzonego przez użytkownika, patrz `## Baseline` poniżej).
> Edytuj w miejscu; archiwizuj gdy zastąpiona.
> Kawałki (slices) poniżej są wypisane w kolejności zależności. Tabela "At a glance" to indeks.

## Vision recap

Motocyklista, który chce pojechać z kimś konkretnego dnia, nie ma dziś dedykowanego narzędzia — przegląda grupy na Facebooku, czyta nieustrukturyzowane posty bez filtrów, bez informacji o trasie ani stylu jazdy potencjalnego kompana, i traci czas na poszukiwania kończące się niepewnością. Kluczowym ryzykiem produktu jest cold-start: aplikacja społecznościowa bez masy krytycznej użytkowników jest bezużyteczna, co odstraszało wcześniejszych budowniczych tego samego pomysłu.

## North star

**S-02: Tworzenie przejazdu** — organizator tworzy przejazd z sygnałami zgodności (styl jazdy, poziom doświadczenia, region, data, typ motocykla), który staje się widoczny na publicznej liście.

> "Gwiazda przewodnia" oznacza tu najmniejsze kompletne flow, które jako pierwsze dowodzi, że produkt działa — umieszczone tak wcześnie, jak pozwalają na to zależności, bo wszystko inne ma znaczenie tylko wtedy, gdy to działa. Tworzenie przejazdu wygrało z alternatywami, bo bezpośrednio implementuje rdzeń hipotezy PRD (strukturyzacja zamiast chaotycznych postów) i nic dalej nie da się realnie zweryfikować, dopóki choć jeden prawdziwy przejazd nie istnieje.

## At a glance

| ID   | Change ID               | Outcome (user can …)                                                              | Prerequisites | PRD refs                          | Status   |
| ---- | ------------------------ | ----------------------------------------------------------------------------------- | -------------- | ---------------------------------- | -------- |
| F-01 | frontend-auth-shell       | (foundation) powłoka nawigacji Expo Router z bramką sesji auth                      | —              | Access Control                     | ready    |
| S-01 | rider-onboarding-profile  | zarejestrować się/zalogować i uzupełnić profil jeźdźca + motocykla                  | F-01           | FR-001, FR-002, FR-003, FR-013, US-02 | proposed |
| S-02 | create-ride               | stworzyć przejazd z sygnałami zgodności, widoczny na publicznej liście              | S-01           | FR-008, US-02                      | proposed |
| S-03 | browse-filter-rides       | przeglądać i filtrować listę aktywnych przejazdów                                   | S-01           | FR-004, FR-005, US-01              | proposed |
| S-04 | join-ride                 | zobaczyć szczegóły przejazdu i dołączyć jednym kliknięciem; organizator widzi uczestnika | S-02, S-03 | FR-006, FR-010, US-01              | proposed |
| S-05 | message-organizer         | napisać wiadomość do organizatora z widoku przejazdu                                | S-04           | FR-007, US-01                      | proposed |
| S-06 | manage-participants       | (organizator) usunąć uczestnika ze swojego przejazdu                                | S-04           | FR-009, US-02                      | proposed |

## Baseline

Co już istnieje w kodzie na dzień `2026-07-16` (auto-zbadane + potwierdzone przez użytkownika).
Foundations poniżej zakładają, że to jest obecne i NIE budują tego od nowa.

- **Frontend:** partial — tylko domyślny szkielet Expo Router (`app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`, `app/modal.tsx`); brak ekranów auth/rides/profile/chat. `lib/api-client.ts` i `lib/auth-client.ts` (plumbing) istnieją, ale nieużywane przez realny UI.
- **Backend / API:** present — Hono na Cloudflare Workers, trasy `backend/src/routes/{profile,rides,participants,messages,chat}.ts`, wdrożone na preview + production.
- **Data:** present — D1 + Drizzle, `backend/src/db/schema.ts`, migracje zastosowane local → preview → prod.
- **Auth:** present — better-auth (email+hasło + Google OAuth web client), `backend/src/lib/auth.ts`, zweryfikowane end-to-end na obu środowiskach.
- **Deploy / infra:** present — Cloudflare Workers + D1 + Durable Objects, CI/CD via GitHub Actions (`backend-preview.yml` auto, `backend-deploy.yml` manual-gated z wymaganym reviewerem).
- **Observability:** absent — brak logowania strukturalnego, error-trackingu i metryk.

## Foundations

### F-01: Powłoka nawigacji frontendu z bramką sesji auth

- **Outcome:** (foundation) Expo Router ma grupy tras dla zalogowanych/niezalogowanych, spięte z już wdrożoną sesją better-auth (token w SecureStore); niezalogowany użytkownik jest przekierowywany zamiast widzieć domyślne ekrany startera. Zastępuje domyślny szkielet Expo (`(tabs)/index.tsx`, `explore.tsx`, `modal.tsx`).
- **Change ID:** frontend-auth-shell
- **PRD refs:** Access Control ("Niezalogowany użytkownik: Dostęp do aplikacji zablokowany")
- **Unlocks:** S-01 i pośrednio każdy kolejny S-NN — żaden realny ekran nie może istnieć bez bramki sesji i wspólnej struktury nawigacji.
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez tego każdy ekran musiałby hakować własną logikę bramki auth osobno — ustalenie wzorca raz, zanim powstanie pierwszy ekran, jest tanie teraz i kosztowne do naprawienia później w 6 osobnych miejscach.
- **Status:** ready

## Slices

### S-01: Rejestracja, logowanie i profil jeźdźca

- **Outcome:** użytkownik może zarejestrować się i zalogować (email+hasło lub Google OAuth), uzupełnić profil jeźdźca (imię, bio, styl jazdy, poziom doświadczenia) oraz dodać/edytować profil motocykla.
- **Change ID:** rider-onboarding-profile
- **PRD refs:** FR-001, FR-002, FR-003, FR-013, US-02 (prerequisite dla obu ścieżek)
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rejestracja, profil i motocykl są scalone w jeden slice, bo żadne z nich nie ma samodzielnej wartości bez pozostałych — to jednorazowy onboarding, nie osobne akcje użytkownika w cyklu produktu.
- **Status:** proposed

### S-02: Tworzenie przejazdu

- **Outcome:** zalogowany użytkownik z uzupełnionym profilem może stworzyć przejazd (opis trasy, motocykl, styl jazdy, cel, data/czas startu, planowany przyjazd, adres punktu startowego), który pojawia się na publicznej liście.
- **Change ID:** create-ride
- **PRD refs:** FR-008, US-02
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Wybrana jako gwiazda przewodnia i sekwencjonowana zaraz po onboardingu — to najmniejszy slice, który bezpośrednio implementuje regułę domenową PRD (sygnały zgodności), a każdy kolejny slice potrzebuje choć jednego realnego przejazdu do przetestowania.
- **Status:** proposed

### S-03: Przeglądanie i filtrowanie przejazdów

- **Outcome:** użytkownik może przeglądać listę aktywnych przejazdów i filtrować ją (data, region, styl jazdy).
- **Change ID:** browse-filter-rides
- **PRD refs:** FR-004, FR-005, US-01
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Przeglądanie i filtrowanie zostały scalone w jeden slice, bo filtrowanie bez przeglądalnej listy nie ma sensu i odwrotnie — rozdzielenie naruszyłoby balans granularności dla tak małego, sczepionego zakresu.
- **Status:** proposed

### S-04: Dołączanie do przejazdu i widoczność uczestnika

- **Outcome:** użytkownik widzi szczegóły przejazdu (opis trasy, motocykl organizatora, poziom doświadczenia, adres startowy z linkiem do zewnętrznej nawigacji) i dołącza jednym kliknięciem; organizator widzi nowego uczestnika na liście swojego przejazdu.
- **Change ID:** join-ride
- **PRD refs:** FR-006, FR-010, US-01, guardrail integralności danych przejazdu
- **Prerequisites:** S-02, S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowany zaraz po tworzeniu i przeglądaniu, bo to tu faktycznie testuje się najbardziej ryzykowne założenie (zgodnie z celem `market-feedback`): czy uczestnik dołączający do przejazdu jest rzeczywiście widoczny dla organizatora — złamanie tego uszkadza rdzeń produktu wg PRD.
- **Status:** proposed

### S-05: Wiadomość do organizatora

- **Outcome:** użytkownik może napisać wiadomość/komentarz do organizatora z widoku szczegółów przejazdu; organizator odczytuje wiadomości skierowane do siebie.
- **Change ID:** message-organizer
- **PRD refs:** FR-007, US-01
- **Prerequisites:** S-04
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rozdzielony od dołączania (S-04), bo to odrębna, samodzielna akcja użytkownika (można napisać do organizatora bez dołączania) — złączenie ich w jeden slice ukryłoby tę różnicę.
- **Status:** proposed

### S-06: Zarządzanie uczestnikami

- **Outcome:** organizator może usunąć uczestnika ze swojego przejazdu.
- **Change ID:** manage-participants
- **PRD refs:** FR-009, US-02
- **Prerequisites:** S-04
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Najmniejszy slice w roadmapie — pojedyncza akcja tylko-organizatora bez nowego modelowania domeny — celowo na końcu, bo nie jest wymagany do udowodnienia rdzenia hipotezy, tylko do domknięcia FR must-have.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID               | Suggested issue title                                             | Ready for `/10x-plan` | Notes                       |
| ---------- | ------------------------ | ------------------------------------------------------------------- | ---------------------- | ---------------------------- |
| F-01       | frontend-auth-shell       | Frontend: powłoka nawigacji z bramką sesji auth                    | yes                    | —                            |
| S-01       | rider-onboarding-profile  | Frontend: rejestracja, logowanie i profil jeźdźca + motocykla       | no                     | Po F-01                     |
| S-02       | create-ride               | Frontend: tworzenie przejazdu (gwiazda przewodnia)                 | no                     | Po S-01                     |
| S-03       | browse-filter-rides       | Frontend: przeglądanie i filtrowanie listy przejazdów               | no                     | Po S-01, równolegle z S-02   |
| S-04       | join-ride                 | Frontend: szczegóły przejazdu + dołączanie                          | no                     | Po S-02 i S-03               |
| S-05       | message-organizer         | Frontend: wiadomość do organizatora                                 | no                     | Po S-04, równolegle z S-06   |
| S-06       | manage-participants       | Frontend: usuwanie uczestnika (organizator)                         | no                     | Po S-04, równolegle z S-05   |

## Open Roadmap Questions

1. **OQ-001: Rekomendacje przy skali** — Przy tysiącach użytkowników czy filtrowanie wystarczy, czy pojawi się presja na rekomendacje ("przejazdy w Twoim regionie/stylu")? Owner: właściciel produktu. Block: roadmap-wide, ale nie blokuje żadnego S-NN dzisiaj — decyzja odkładana do pierwszych danych z użytkowania (co ta roadmapa właśnie ma dostarczyć).
2. **OQ-002: Wiarygodność poziomu doświadczenia** — Samoocena (FR-013) jest potencjalnie niewiarygodna przy dużej bazie. Owner: właściciel produktu. Block: nie blokuje S-01, przemyślenie wymagane przed v2.
3. **OQ-003: target_scale.qps** — Nie określono docelowego natężenia zapytań. Owner: architekt/właściciel produktu. Block: nie blokuje frontendowych slice'ów; NFR-002 zmierzone empirycznie (p95=0.458s przy 5000 wierszy) per `context/deployment/deploy-plan.md` daje silny sygnał, że backend nie będzie wąskim gardłem.
4. **OQ-004: target_scale.data_volume** — Nie określono oczekiwanego wolumenu danych. Owner: architekt/właściciel produktu. Block: jak wyżej — nie blokuje frontendu.
5. **OQ-005: Sign in with Apple przed publikacją w App Store** — `context/deployment/deploy-plan.md` odnotowuje, że wysyłka Google OAuth na iOS wymusza Apple Guideline 4.8 (prawdopodobnie wymaga też Sign in with Apple), zaakceptowane jako śledzone follow-up. Owner: deweloper. Block: nie blokuje S-01 (Android-first, Google OAuth) ani żadnego innego S-NN — musi być rozstrzygnięte przed pierwszym zgłoszeniem do App Store, nie przed rozpoczęciem frontendu.

## Parked

- **Interaktywna mapa trasy w aplikacji (FR-011)** — Why parked: PRD priority nice-to-have, cel v1.5; adres tekstowy + link do zewnętrznej nawigacji (FR-010, w S-04) wystarcza na MVP.
- **Czat grupowy przypisany do przejazdu (FR-012)** — Why parked: PRD priority nice-to-have. Backend (`ChatRoom` Durable Object, WebSocket hibernation) jest już w pełni zbudowany i zweryfikowany per `deploy-plan.md` — brakuje wyłącznie UI frontendowego; można podjąć jako osobny slice po MVP bez dodatkowej pracy backendowej.
- **Wydarzenia / zloty** — Why parked: PRD Non-Goals — inna logika organizacyjna niż wspólne przejazdy, poza zakresem MVP.
- **Konta grupowe / klubowe** — Why parked: PRD Non-Goals — jeden użytkownik = jeden profil w MVP.
- **Dystrybucja na iOS (płatne konto Apple Developer, build EAS na iOS)** — Why parked: per `deploy-plan.md`, świadomie odłożone; ścieżka Android jest wystarczająca do walidacji obu ścieżek PRD i zbierania feedbacku rynkowego zgodnie z `main_goal: market-feedback`.
- **Warstwa obserwowalności (logowanie, error-tracking, metryki)** — Why parked: baseline raportuje ją jako absent, ale żaden NFR ani must-have FR jej dziś nie wymaga; wprowadzenie przedwczesne byłoby budową horyzontalną bez nazwanego odbiorcy w tym MVP.

## Done

(Puste przy pierwszej generacji. `/10x-archive` doda tu wpis — i przełączy `Status` danego elementu na `done` — gdy zmiana, której `Change ID` odpowiada elementowi roadmapy, zostanie zarchiwizowana.)
