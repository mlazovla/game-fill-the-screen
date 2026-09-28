# Fill the Screen

Mobilní hra jako PWA (React + TypeScript + Vite). Cíl každého levelu: vyplnit celou obrazovku
jednou barvou, odlišnou od té, kterou level začíná.

**Hrát:** https://fillthescreengame.mlazovaci.cz – otevři v mobilu a přes menu prohlížeče
„Přidat na plochu“ / „Nainstalovat aplikaci“ ji nainstaluj jako PWA (pak běží i offline).

## Příkazy

| Příkaz | Co dělá |
| --- | --- |
| `npm run dev` | Dev server s HTTPS (self-signed) dostupný i v LAN – otevři `https://<ip-macu>:5173` na telefonu a potvrď varování certifikátu. HTTPS je nutné kvůli senzorům, mikrofonu a kameře. |
| `npm run build` | Produkční build do `dist/` včetně service workeru (offline) a manifestu. |
| `npm run preview` | Lokální náhled produkčního buildu. |
| `npm run deploy` | Build + rsync na Raspberry Pi → https://fillthescreengame.mlazovaci.cz |
| `npm run icons` | Přegeneruje PNG ikony v `public/`. |
| `npm run lint` | oxlint. |

Deploy jde přes `vml@192.168.0.242` (SSH funguje jen z LAN) do
`/var/www/mlazovaci.cz/sites/fillthescreengame/www`, který nginx na Pi obsluhuje přes wildcard
`*.mlazovaci.cz`. Cíl lze přepsat proměnnými `DEPLOY_HOST`, `DEPLOY_PATH`.

## Struktura

```
src/
  config.ts            název aplikace, barva, vynucená orientace (sdílí i vite.config.ts → manifest)
  main.tsx             vstup: registrace service workeru, blokace gest prohlížeče
  index.css            globální styly (bez scrollu, pull-to-refresh, výběru textu…)
  app/                 shell aplikace: App, úvodní obrazovka, hlídač orientace
  platform/            práce se zařízením: gesta, fullscreen + zámek orientace, media query
  game/                herní jádro sdílené levely: typy, LevelHost (level + ladicí HUD),
                       LevelTransition (přechod „LEVEL n“), měření zaplnění plochy,
                       hook pro celoobrazovkový canvas, uložení postupu
  levels/
    index.ts           ⟵ POŘADÍ LEVELŮ (jediné místo, kde se mění)
    finger-paint/      1: kreslení prstem, dokud není zaplněno 98 %
    pinch-circle/      2: kolečko (Ø ~2 cm) posouvat prstem a roztáhnout zoomem přes celý displej
                       jeden level = jedna složka (definice + komponenta + styly + assety)
```

## Přidání levelu

1. Vytvoř složku `src/levels/<nazev-levelu>/` s `index.ts` (definice) a komponentou.
2. Komponenta dostane `onProgress(ratio)` a `onComplete()` (viz `src/game/types.ts`).
3. Přidej import do pole v `src/levels/index.ts` na požadované místo.

Hra je o objevování, jak level překonat, proto se v levelech ve výchozím stavu nic neukazuje.
Pro ladění lze na úvodní obrazovce zapnout **Zobrazit UI** (číslo a název levelu, procento zaplnění
a seznam čísel levelů pro přímý skok do levelu); volba se pamatuje v localStorage.

Pro testování lze otevřít konkrétní level přes `?level=<id>` nebo `?level=<pořadí>`, např. `?level=finger-paint`.

## Průběh hry

Po dokončení levelu obrazovka zešedne (50% šedá), přes celou výšku se černě ukáže „LEVEL“ a přes něj
bíle číslo dalšího levelu (`src/game/LevelTransition.tsx`). Klepnutím se přes šedou odkryje další level.
Po posledním levelu se místo toho ukáže „A to je vše“ a klepnutí vrátí hráče na úvodní obrazovku
(postup se vrátí na level 1).
Stav přechodu řídí `src/app/App.tsx`; starý level se odpojí, jakmile je šedá plně krycí, nový se připojí
až po klepnutí.

## Písmo

Roboto Flex (variabilní, tloušťka až 1000) je přibalené v aplikaci kvůli offline režimu – jen latinka
a latinka-ext (`src/fonts.css`). Globálně se nastavuje proměnnou `--font-game` v `src/index.css`.

## Chování na mobilu

- Tlačítko zpět je během hry zachycené (`platform/useBackButton.ts`): vpravo nahoře se na 2 s ukáže
  kolečko s křížkem (`app/QuitButton.tsx`), které vrátí hru na úvodní obrazovku. Strážní záznam v historii
  se kvůli ochraně Chrome obnovuje jen při interakci – dvojí zpět bez dotyku mezi tím hru opustí.
- Pull-to-refresh, scroll, pinch-zoom, dlouhý stisk a dvojklik jsou zablokované (`index.css`, `platform/gestures.ts`).
- Orientace: manifest vynucuje `portrait` pro nainstalovanou PWA, na Androidu se po klepnutí na start
  zapne fullscreen a zamkne orientace. Kde zámek nejde (iOS), překryje hru výzva k otočení telefonu.
