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
| `npm run deploy` | Build + nahrání na server; cíl se bere z lokálního `.deploy.local` (není v repozitáři). |
| `npm run icons` | Přegeneruje PNG ikony v `public/`. |
| `npm run lint` | oxlint. |

## Struktura

```
src/
  config.ts            název aplikace, barva, vynucená orientace (sdílí i vite.config.ts → manifest)
  main.tsx             vstup: registrace service workeru, blokace gest prohlížeče
  index.css            globální styly (bez scrollu, pull-to-refresh, výběru textu…)
  app/                 shell aplikace: App, úvodní obrazovka, hlídač orientace
  intro/               intro při prvním spuštění (viz níže), načítá se líně
  platform/            práce se zařízením: gesta, fullscreen + zámek orientace, media query,
                       senzory (náklon, třesení), mikrofon a kamera
  game/                herní jádro sdílené levely: typy, LevelHost (level + ladicí HUD),
                       LevelTransition (přechod „LEVEL n“), měření zaplnění plochy,
                       hook pro celoobrazovkový canvas, uložení postupu
  levels/
    index.ts           ⟵ POŘADÍ LEVELŮ (jediné místo, kde se mění)
    finger-paint/      1: kreslení prstem, dokud není zaplněno 95 %
    pinch-circle/      2: kolečko (Ø ~2 cm) posouvat prstem a roztáhnout zoomem přes celý displej
    six-stripes/       3: 6 neviditelných proužků; klepnutí zbělí proužek na 0,3 s, pak 1 s bledne.
                       Bílý zůstane, jen když má bílé sousedy (okraj se počítá jako bílý) –
                       vyhraje rychlé proklepání všech 6 najednou; každý proužek hraje tón piána
                       (C dur pentatonika, dole C4 → nahoře C5)
    rain-vessel/       4: displej je nádoba otevřená dole (bílý okraj vlevo, vpravo, nahoře), prší na něj
                       kapky stékající podle gravitace ze senzoru; vzhůru nohama se nádoba plní,
                       při otočení zpět se vylije. Kapka se při dopadu roztříští (drobné šedé
                       kapičky), zní šumění deště a dopady kapek. Moduly: liquid.ts (geometrie
                       hladiny), simulation.ts (kapky, kapalina), render.ts (Canvas 2D), sound.ts
    endless-snake/     5: nekonečný had ve 4 sloupcích (okraj ≥ 5 mm), krok 350 ms, ovládání swipem
                       (fronta tahů; proti směru = pozdržení o 1 krok). Náraz → had od hlavy
                       zmizí a po 1 s se level restartuje; bez interakce had nahoře počká.
                       Vyhraje zaplnění všech polí. Logika v snake.ts, šipky pro ladění na PC
    ember-blow/        6: hromádka popraskaných uhlíků ve 3 řadách (prostřední zůstává tmavá, spodní začíná
                       pod okrajem obrazovky) a nad ní
                       hranice z třísek (jedna vede přes uhlíky, jedna za ně); foukání do mikrofonu (jakýkoli silný
                       zvuk nad šumem okolí) je rozžhavuje ve 3 fázích: uhlíky → třísky → plamen.
                       Fáze 1 a 2 chtějí celkem 6 s foukání (lze na víc nádechů): po < 3 s rychle
                       pohasnou, po ≥ 3 s drží 5 s a pak 3 s slábnou, foukání během slábnutí navazuje.
                       Ve fázi 3 stačí 1 s foukání a přestat – plamen zaplní obrazovku. Pravidla
                       v fire.ts, detekce foukání v blowDetector.ts, kresba v render.ts. Bez mikrofonu
                       se ukáže přeškrtnutý mikrofon, klepnutí zkusí povolení znovu
    jigsaw/            7: šest bílých puclíků (mřížka 2×3 přes celý displej) leží na sobě uprostřed
                       v náhodném pořadí; tahem se posouvají (i víc prsty naráz), po puštění do 1,5 mm
                       od kterékoli pozice zapadnou (krátká vibrace) a lehnou pod volné kusy.
                       Vyhrává složení všech na správná místa. Tvar zámků v puzzle.ts
    patience/          8: uprostřed roste bílý kruh (plocha lineárně, za 30 s pokryje celý displej); každý dotyk
                       ho vrátí na nulu a dokud prst drží, neroste. Vyhraje, kdo nic nedělá. Displej drží
                       rozsvícený Wake Lock (`keepScreenOn` v platform/screen.ts), čas na pozadí se nepočítá
    sphere-puzzle/     9: telefon je uvnitř černé koule s tmavě šedými tečkami po rovnoběžkách, uprostřed kříž.
                       Skládačka 4 dílků (puzzle.ts): kolečko uprostřed a tři dílky kolem. Kolečko se objeví
                       18° vedle středu, ostatní dílky těsně za okrajem pohledu (vlevo/vpravo) a natočené
                       (dílek 2 o 10–20°, 3 a 4 o 20–40°). Volný dílek je světle šedý; když pohled 0,5 s sedí
                       v toleranci směru (1,5°) a natočení (±8°, u kolečka se nehlídá), dílek zbělá, přilepí
                       se k displeji (vibrace) a kříž zmizí. Složené dílky vyplní displej. Zorné pole 50° na
                       šířku. Ovládání natáčením telefonu (gyroskop); bez gyroskopu tah prstem a otočení
                       dvěma prsty, na PC šipky a Q/E. Tečky do 48 px od okraje dílků slábnou (efekt záře).
                       Matematika pohledu ve view.ts, ovládání prstem v touchLook.ts, kresba v render.ts
    size-pulse/        10: malé bílé kolečko (R = 32 px) pulzuje po sinusoidě s periodou 2 s (0,5 s roste, 1 s se
                       zmenšuje, 1 s roste…), násobně: poloměr = R·e^(k·sin). Dokud se hráč dotýká obrazovky,
                       velikost stojí, ale sinus běží dál – držením prstu při zmenšování kolečko roste. k je
                       spočítané z velikosti displeje tak, aby při perfektním načasování stačilo 6 vln růstu
                       (s 3% rezervou); kolečko nejde zmenšit pod R/2. Vyhrává pokrytí celého displeje.
                       Při držení prstu přímo na kolečku hraje tichý sinusový tón, jehož výška sleduje skrytou
                       sinusoidu (±4 půltóny) a se zvětšováním kolečka stoupá (sound.ts). `touchstart` na ploše
                       levelu je zablokovaný, aby dlouhý stisk nespustil haptiku prohlížeče
    lamp/              12: tmavě šedá lampička na stole ve tmě, ze stínítka visí šňůrka s kuličkou. Krátké zatažení
                       šňůrky dolů (vibrace) lampičku natrvalo rozsvítí: stínítko zbělá a světlo jde jen otvorem dole.
                       Stínítko jde chytit prstem (i před rozsvícením) a táhnout; jeho stěny kolidují se žárovkou
                       (vytlačení po krocích ≤ 0,2 jednotky, aby rychlý tah neprošel skrz), takže z lampičky jde
                       sundat jen nahoru otevřeným dnem. Po puštění padá (gravitace, hod podle rychlosti tahu,
                       rotace podle vodorovné rychlosti), po žárovce sklouzne zpět na lampičku, nebo dopadne na
                       stůl vedle ní. Stín je přesný stín bodové žárovky od tří stěn stínítka (dno je otevřené),
                       stůl, podstavec a šňůrka se kreslí přes `lighten`, takže ve světle zmizí a vidět jsou jen ve
                       stínu. Když je stínítko celé mimo obrazovku a lampa svítí, obrazovka během 0,6 s zbělá.
                       Geometrie a stín v lamp.ts, kresba v render.ts
    pexeso-common/     společné části pexes (není to level): obrázky (PexesoSymbol.tsx), jejich sady a míchání
                       (symbols.ts), mřížka a vzhled karty (pexeso.css) a SwipePexeso.tsx – pexeso otáčené tahem,
                       které levely jen konfigurují (mřížka, směry tahu, který směr odhaluje který líc, rozdání).
                       Tah se zamkne na nejbližší povolený směr, karta se otáčí kolem osy kolmé na tah za prstem
                       (180° = 0,9 × kratší strana karty, max. 160 px), šipky líce, který tah odhalí, svítí světle
                       šedě. Po puštění se dotočí od 90° nebo při švihnutí (≥ 600 px/s, ≥ 25°), jinak se vrátí.
                       Shoda se počítá jen podle obrázku: karty se otočí zpět a zmizí jim šipky vyřešeného líce, tím
                       směrem už nejdou otočit. Karta se všemi líci vyřešenými zmizí (bílá). Neshoda se po 1 s
                       zavře, začátek tahu jiné karty ji zavře hned
    pexeso-1/          11: pexeso 3×4 (6 dvojic: kolečko, hvězdička, křížek, trojúhelník, stromeček, čtyřlístek), karty
                       vyplňují celý displej. Rub i líc jsou černé s tmavě šedým rámečkem (odsazení 3 mm), na rubu
                       tmavě šedý puntík – otáčí se jen ťuknutím na něj (plocha pro prst 10 mm). Při otáčení prosvítá
                       bílé pozadí. Shoda: po 0,5 s obě karty zmizí a zůstane bílá plocha. Neshoda: po 1 s se otočí
                       zpět, ťuknutí na třetí kartu je zavře hned. Po poslední dvojici level končí.
                       Balíček v deck.ts
    pexeso-2/          15: SwipePexeso 3×4, každá karta má dva líce – vodorovný (tah ← i →) a svislý (↑ i ↓);
                       24 líců nese 12 obrázků (navíc sluníčko, kytička, slon, srpek měsíce, šestiúhelník, blesk),
                       každý dvakrát, nikdy oba na jedné kartě. Na rubu kříž ze 4 šipek, směr se zamkne po 10 px
    pexeso-3/          13: SwipePexeso se 2 kartami (horní a dolní polovina displeje), na rubu 8 šipek a každý
                       z 8 směrů (i šikmé, záleží na smyslu tahu) odhaluje vlastní líc. Ze 12 obrázků se náhodně
                       vybere 8; obě karty mají stejnou osmici, každá nezávisle náhodně rozmístěnou. Směr se zamkne
                       po 15 px. Obě karty zmizí současně po 8. dvojici
    hammer/            14: Kladivo – na černé ploše velké tmavě šedé kladívko (hammerShape.ts, podle skici), úderníkem
                       na stranu podle ruky: z náklonu v klidu (levý bok dolů = pravá ruka, pravý bok dolů = levá;
                       práh 0,25 g, během švihu a 0,4 s po něm se nemění), přetočí se plynule. Švih (swingMeter.ts):
                       síla = maximum klouzavého průměru (5 vzorků) velikosti lineárního zrychlení, švih začne nad
                       10 m/s², skončí pod 5 m/s² (nejdéle 1,5 s). Nápřah se ignoruje: směr úderu = znaménko
                       nejrychlejší rotace v rovině displeje (`rotationRate.alpha`), do síly se počítají jen vzorky,
                       kdy se telefon netočí opačně (tolerance 30 °/s). Třídy (síla i délka švihu nad 10 m/s² zároveň,
                       platí nejvyšší splněná): malý ≥ 140 ms (cinknutí), střední ≥ 3 g a ≥ 200 ms (praskot), velký
                       ≥ 9 g a ≥ 200 ms (rozbití, krátké tříštění), extrém > 15 g a > 350 ms (rozbití, dlouhé
                       tříštění); švih pod 140 ms se ignoruje.
                       Poškození: střední +2, malý +1 jen když už je prasklina, velký/extrém hned rozbití; rozbití
                       při 4 (cesty: velký, extrém, 2× střední, střední + 2× malý). Pavučina prasklin (crackWeb.ts:
                       14 paprsků, 7 prohnutých prstenců) světle šedá od středu, roste s poškozením. Rozbití
                       (shatter.ts): buňky pavučiny se stanou střepy s výřezem obrazovky, padají a odhalí bílou;
                       když spadnou všechny, level končí. Bez gyroskopu (`devicemotion` nehlásí `rotationRate.alpha`) je
                       ťuknutí na displej střední úder. Zvuky syntetizované v sound.ts. Se „Zobrazit UI“ je dole
                       ladicí řádek: síla, třída, délka, poškození, ruka
                       jeden level = jedna složka (definice + komponenta + styly + assety)
```

## Přidání levelu

1. Vytvoř složku `src/levels/<nazev-levelu>/` s `index.ts` (definice) a komponentou.
2. Komponenta dostane `onProgress(ratio)`, `onComplete()` a `showUi` (zapnuté „Zobrazit UI“, pro ladicí výpisy; viz `src/game/types.ts`).
3. Přidej import do pole v `src/levels/index.ts` na požadované místo.

Hra je o objevování, jak level překonat, proto se v levelech ve výchozím stavu nic neukazuje.
Pro ladění lze na úvodní obrazovce zapnout **Zobrazit UI** (číslo a název levelu, procento zaplnění
a seznam čísel levelů pro přímý skok do levelu); volba se pamatuje v localStorage.

Pro testování lze otevřít konkrétní level přes `?level=<id>` nebo `?level=<pořadí>`, např. `?level=finger-paint`.

## Intro

Při prvním spuštění (a bez `?level=`) se místo úvodní obrazovky ukáže intro (`src/intro/`). Každá jeho
obrazovka je sama malé „vyplň obrazovku“ a zároveň si předem řekne o oprávnění, aby dotaz na mikrofon
neprozradil řešení konkrétního levelu:

1. „Vítej ve hře“ – swipe nahoru vytáhne zespoda bílou plochu.
2. „Cílem je vždy vyplnit celou obrazovku“ – Pokračovat.
3. Senzory – po povolení se zatřesením sypou bílé kameny (`stoneHeap.ts`: hromada jako výšková mapa bez
   mezer; kámen se do hromady boří jako do bahna a zastaví se, až pod jeho masivní částí není nic černého).
   Čím silnější třesení, tím víc a větších kamenů. Po pěti kamenech zmizí text, při 97 % obrazovka dobělí.
   Skip vpravo nahoře dosype obrazovku sám.
4. Mikrofon a kamera – jeden dotaz na obojí. Hlasitost nad šumem okolí plní obrazovku zespoda
   (`loudnessFill.ts`: práh se kalibruje na okolí, běžná řeč stačí). Po 10 % zmizí text a na pozadí se
   ukáže mikrofon. Mikrofon se hned po testu zavře.
5. Obraz – černobílá přední kamera (bez kamery Mona Lisa, volné dílo z Wikimedia Commons), ztmavená.
   Ovládání jako Snapseed: dotyk ukáže menu Kontrast / Gama / Jas (Jas pomůže nejvíc, proto je poslední), tah nahoru/dolů vybírá, doleva/doprava
   mění hodnotu (WebGL shader v `pictureRenderer.ts`, výpočet v `pictureAdjust.ts`). Když je průměrný jas
   přes 90 %, obrazovka zbělá a Pokračovat vede rovnou na přechod „LEVEL“.

Že bylo intro dokončené, se pamatuje v localStorage. Znovu ho jde spustit tlačítkem **Přehrát intro**
na úvodní obrazovce se zapnutým **Zobrazit UI**. Levely si oprávnění i tak ověřují samy (iOS se ptá znovu).

## Průběh hry

Po dokončení levelu obrazovka zešedne (50% šedá), přes celou výšku se černě ukáže „LEVEL“ a přes něj
bíle číslo dalšího levelu (`src/game/LevelTransition.tsx`). Klepnutím se přes šedou odkryje další level.
Po posledním levelu se místo toho ukáže „A to je vše“ a klepnutí vrátí hráče na úvodní obrazovku
(postup se vrátí na level 1).
Stav přechodu řídí `src/app/App.tsx`; starý level se odpojí, jakmile je šedá plně krycí, nový se připojí
až po klepnutí.

## Senzory

`src/platform/deviceGravity.ts` převádí `deviceorientation` (beta, gamma) na směr gravitace v souřadnicích
obrazovky (x doprava, y dolů, z ven z displeje). Level, který senzory potřebuje, má v definici
`usesMotion: true` – na iOS se pak o povolení žádá při klepnutí, které level spouští. Na počítači jde
level ladit přes DevTools → Sensors → Orientation. Orientace je zamčená na `portrait-primary`, aby se
obrazovka při otočení telefonu vzhůru nohama neotočila.

Plnou orientaci včetně otáčení kolem svislé osy (`alpha`) dává `platform/deviceRotation.ts`. Data pošle jen
tehdy, když `devicemotion` hlásí `rotationRate`, tedy když má telefon gyroskop; jinak se level ovládá prstem.

## Zvuk

Zvuky se syntetizují přes Web Audio (žádné nahrávky, funguje offline). Sdílený výstup s kompresorem je
v `src/platform/audio.ts`, syntéza tónu piána v `src/game/piano.ts` (`playPianoNote(frekvence)`).
Levely se zvukem mají v definici `usesAudio: true`, aby se zvuk odemkl už klepnutím, které level spouští
(iOS); ostatní levely zvuk nezapínají, aby zbytečně nepřerušily hudbu přehrávanou v telefonu. Když je
aplikace na pozadí, zvuk se pozastaví.
Ikonou reproduktoru na úvodní obrazovce jde zvuk vypnout (`app/SoundToggle.tsx`, volba se pamatuje);
vypnutý zvuk znamená, že se audio výstup vůbec nevytvoří (`setSoundMuted` v `platform/audio.ts`).
Pokud bude někdy level zvuk potřebovat k vyřešení, naznačí to sám level.

## Mikrofon

Level s `usesMicrophone: true` odemkne klepnutím, které ho spouští, sdílený AudioContext pro analýzu
(`platform/microphone.ts`, iOS) a mikrofon si pak otevře sám (`openMicrophone`). Hlasitost se měří jako
RMS v dB, šum okolí kalibruje `game/noiseFloor.ts` (ignoruje digitální ticho na začátku, během foukání
práh nestoupá).

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
