# 00 — Overview

## Contesto

Tempo è un MCP App per freelancer che permette di tracciare il tempo lavorato su diversi progetti e generare fatture, tutto dall'interfaccia chat. Il progetto usa il framework **mcp-use** ed è pensato come esercizio incrementale per il Buildathon @ Turin.

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | mcp-use (TypeScript SDK) |
| UI Components | React 19 + `@openai/apps-sdk-ui` |
| Styling | Tailwind CSS v4 + token CSS di OpenAI SDK |
| Validation | Zod 4 |
| Build | Vite (via mcp-use) |
| Runtime | Node.js (ES2022) |

## Architettura

- **Server** (`index.ts`): MCPServer con 5 tool, stato in-memory (nessun database)
- **Widget** (`resources/`): Componenti React auto-registrati dal framework
- **Tipi** (`resources/types.ts`): Schemi Zod condivisi tra server e widget

### Stato in-memory

```
timeEntries: TimeEntry[]     // Lista di tutte le entry temporali
invoices: InvoiceRecord[]    // Lista delle fatture generate
entryIdCounter: number       // Counter incrementale per ID entry
invoiceIdCounter: number     // Counter incrementale per ID fatture
```

## Tool

| # | Nome | Tipo | Visibilità | Step |
|---|------|------|-----------|------|
| 1 | `log-time` | Widget tool | AI + App | 1 |
| 2 | `add-time-entry` | Widget tool | Solo App | 2 |
| 3 | `remove-time-entry` | Widget tool | Solo App | 2 |
| 4 | `generate-invoice` | Widget tool | AI + App | 3 |
| 5 | `confirm-invoice` | Widget tool | Solo App | 3 |

## Widget

| Nome | File | Step |
|------|------|------|
| `time-log` | `resources/time-log.tsx` | 1 (display) → 2 (interattivo) |
| `invoice-preview` | `resources/invoice-preview.tsx` | 3 |

## Struttura File Finale

```
tempo/
├── index.ts                    # Server: 5 tool + stato in-memory
├── src/
│   └── types.ts                # Schemi Zod e tipi TypeScript condivisi
├── resources/
│   ├── styles.css              # Tailwind v4 + OpenAI SDK UI CSS
│   ├── time-log.tsx            # Widget time tracker (tabella + form)
│   └── invoice-preview.tsx     # Widget fattura (preview + conferma)
├── public/
│   ├── favicon.ico
│   └── icon.svg
├── docs/
│   ├── PRD.md
│   └── plan/
├── package.json
└── tsconfig.json
```

> **Nota:** `types.ts` è in `src/` e non in `resources/` perché mcp-use tratta ogni file in `resources/` come un widget (richiede default export React). I tipi condivisi vanno quindi fuori da quella directory.

## Flusso Utente Completo

1. Utente: _"Ho lavorato 3 ore su Project Alpha a €60/h"_ → `log-time` → widget time tracker
2. Utente: _"Aggiungi 5 ore su Project Beta"_ → `log-time` → tracker aggiornato
3. Utente aggiunge altre entry direttamente dal form nel widget
4. Utente: _"Genera fattura per Acme Corp"_ → `generate-invoice` → widget fattura
5. Utente modifica sconto nel widget, clicca Conferma

## Ordine di Implementazione

1. **Cleanup** — Rimozione demo fruit shop
2. **Tipi condivisi** — `resources/types.ts`
3. **Step 1** — Tool `log-time` + widget `time-log.tsx` (sola visualizzazione)
4. **Step 2** — Tool `add-time-entry` + `remove-time-entry` + aggiornamento widget con form
5. **Step 3** — Tool `generate-invoice` + `confirm-invoice` + widget `invoice-preview.tsx`
