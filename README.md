# Fill the Screen

Mobilní hra jako PWA (React + TypeScript + Vite). Cíl každého levelu: vyplnit celou obrazovku
jednou barvou, odlišnou od té, kterou level začíná.

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
  game/                herní jádro sdílené levely: typy, LevelHost (HUD + „Level dokončen“),
                       měření zaplnění plochy, hook pro celoobrazovkový canvas, uložení postupu
  levels/
    index.ts           ⟵ POŘADÍ LEVELŮ (jediné místo, kde se mění)
    finger-paint/      jeden level = jedna složka (definice + komponenta + styly + assety)
```

## Přidání levelu

1. Vytvoř složku `src/levels/<nazev-levelu>/` s `index.ts` (definice) a komponentou.
2. Komponenta dostane `onProgress(ratio)` a `onComplete()` (viz `src/game/types.ts`).
3. Přidej import do pole v `src/levels/index.ts` na požadované místo.

Pro testování lze otevřít konkrétní level přes `?level=<id>` nebo `?level=<pořadí>`, např. `?level=finger-paint`.

## Chování na mobilu

- Pull-to-refresh, scroll, pinch-zoom, dlouhý stisk a dvojklik jsou zablokované (`index.css`, `platform/gestures.ts`).
- Orientace: manifest vynucuje `portrait` pro nainstalovanou PWA, na Androidu se po klepnutí na start
  zapne fullscreen a zamkne orientace. Kde zámek nejde (iOS), překryje hru výzva k otočení telefonu.
