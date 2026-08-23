# autofoliewrap.cz

Statický web pro autofoliářskou dílnu v Praze — celopolepy, PPF ochrana laku,
tónování autoskel a světel.

Bez frameworku, bez build kroku pro CSS. Jen HTML, jeden stylesheet a TypeScript,
který se kompiluje do `js/`.

## Spuštění

```bash
npm install     # jednorázově
npm run build   # ts/ -> js/
npm run serve   # http://localhost:3000
```

Během vývoje se hodí `npm run watch` (tsc v režimu sledování).
`npm run lint` spustí typovou kontrolu bez generování souborů.

## Struktura

```
index.html               celá stránka včetně SVG ikon (sprite v <body>)
css/style.css            jeden stylesheet, cascade layers + design tokeny
ts/main.ts               navigace, galerie, kalkulačka, formulář, reference
ts/scroll-effect.ts      scroll-driven sekvence snímků na <canvas>
js/                      kompilovaný výstup (verzovaný, aby web fungoval bez buildu)
assets/frames/           60 snímků z dílny pro scroll efekt
scripts/generate-frames.mjs   generátor náhradních snímků (vyžaduje sharp)
```

## Jak je to postavené

**Barvy a téma.** Všechny barvy jsou tokeny na `:root` zapsané přes `light-dark()`,
takže se web automaticky přizpůsobí světlému i tmavému režimu systému. Sekce, které
mají být tmavé vždy (hlavička, hero, scroll sekce, `postup`, `kontakt`, patička),
mají vynucené `color-scheme: dark` — tokeny se v nich vyhodnotí znovu.

Když upravujete barvy, saháte na tokeny v hlavičce `css/style.css`, ne na jednotlivá
pravidla.

**Vrstvy.** `@layer reset, base, layout, components, utilities`. Specificita se řeší
pořadím vrstev, ne zanořováním selektorů — proto v souboru nenajdete `!important`
kromě `.visually-hidden`.

**Animace.** Odhalování prvků při scrollu jede na CSS `animation-timeline: view()`
uvnitř `@supports`. Prohlížeč, který to neumí, obsah prostě zobrazí — nic se neschová.
Vše respektuje `prefers-reduced-motion`.

**Scroll sekvence.** `ts/scroll-effect.ts` nestahuje nic, dokud se sekce neblíží
k viewportu. Snímky se načítají po šesti, první vykreslený se zobrazí okamžitě
a chybějící se nahradí nejbližším načteným. Při `prefers-reduced-motion` nebo na
pomalém/měřeném připojení se ukáže jediný statický snímek.

## Co je potřeba doplnit

**Fotky v galerii.** Část snímků jsou stock fotky jako placeholder (označeno
komentářem v `index.html` u sekce galerie). Nahraďte je vlastními realizacemi —
stačí vyměnit `src`, `data-full` a `alt` u dané položky. Vlastní fotky z dílny
(`assets/frames/car_*.webp`) v galerii už jsou.

**Odesílání formuláře.** V `ts/main.ts` je nahoře konstanta `FORM_ENDPOINT`.
Dokud je prázdná, formulář otevře e-mailového klienta s předvyplněnou poptávkou —
zpráva tedy dorazí, jen přes klienta návštěvníka. Jakmile doplníte URL (Formspree,
Netlify Forms, vlastní endpoint), přepne se na odeslání přes `fetch` na pozadí.

**Ceny v kalkulačce.** Základy, koeficienty podle velikosti vozu a příplatky jsou
v `initCalculator()` v `ts/main.ts` (konstanty `BASE`, `SIZE`, `EXTRA`, `TIME`).
Stejná čísla jsou i v ceníku v `index.html` — při změně upravte obě místa.

**Adresa dílny.** Web zatím uvádí jen „Praha, přesnou adresu pošleme při domluvě
termínu". Až bude adresa veřejná, doplňte ji do sekce kontakt a do `AutoBodyShop`
structured data v `<head>`.

## Poznámky k obsahu

- Rok založení je všude uveden jako **2013** (původní web měl na různých místech
  2009 i 2013).
- Reference jsou převzaté z původního webu. Web záměrně **neuvádí** agregované
  hodnocení ani `AggregateRating` ve structured data — to by šlo doplnit až proti
  skutečným Google recenzím.
