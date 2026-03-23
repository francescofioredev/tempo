# 01 — Cleanup: Rimozione Demo Fruit Shop

## Obiettivo

Rimuovere tutti gli artefatti del template demo "fruit shop" per partire da una base pulita.

## File e Directory da ELIMINARE

### `resources/product-search-result/` (intera directory)

Contiene il widget demo e tutti i suoi sotto-componenti:
- `widget.tsx` — Componente principale (carousel di frutta)
- `types.ts` — Tipi del widget demo
- `components/Carousel.tsx`, `CarouselItem.tsx`, `CarouselSkeleton.tsx`
- `components/Accordion.tsx`, `AccordionItem.tsx`
- `hooks/useCarouselAnimation.ts`

### `public/fruits/` (intera directory)

16 immagini PNG di frutta usate dal carousel demo.

## File da MODIFICARE

### `index.ts` — Rimuovere codice demo

**Cosa rimuovere:**
- Array `fruits` (riga ~29-46) — dati statici per il demo
- Tool `search-tools` (riga ~48-76) — tool con widget carousel
- Tool `get-fruit-details` (riga ~78-104) — tool per dettagli frutta

**Cosa tenere:**
- Import e configurazione `MCPServer` (righe 1-19)
- `server.listen()` (righe 106-108)

**Cosa aggiornare:**
- `description`: da `"MCP server with MCP Apps integration"` a `"Freelancer Time & Invoice Tracker"`

### `resources/styles.css` — Rimuovere CSS carousel

**Cosa rimuovere** (righe ~42-117):
- `.carousel-item` e tutte le classi correlate
- Animazioni CSS custom per il carousel (pointer-relative blur, transitions)
- CSS custom properties (`--pointer-x`, `--pointer-y`, `--icon-scale`, `--icon-opacity`)
- Container queries per il carousel

**Cosa tenere** (righe 1-~40):
- `@import "tailwindcss"`
- `@import "@openai/apps-sdk-ui/css"`
- `@theme` block con token
- Stili base (`*, body, #root`)

## File Auto-rigenerati (nessuna azione manuale)

- `.mcp-use/product-search-result/` — Rigenerato automaticamente da `mcp-use dev`
- `.mcp-use/tool-registry.d.ts` — Rigenerato dalle definizioni dei tool

## Risultato Atteso

Dopo il cleanup:
- `npm run dev` si avvia senza errori
- Nessun tool visibile nell'Inspector
- Nessun widget disponibile
- Il server risponde correttamente (health check)
