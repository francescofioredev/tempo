# 03 — Step 1: Display Widget (Fondamenta)

## Obiettivo

Far funzionare l'intero stack: un tool che accetta dati temporali e un widget che li visualizza in tabella.

## File Coinvolti

| File | Azione |
|------|--------|
| `index.ts` | Aggiungere tool `log-time` + stato in-memory |
| `resources/time-log.tsx` | Creare nuovo widget |
| `resources/types.ts` | Già creato nel passo 02 |

---

## Server: `index.ts`

### Import aggiuntivi

```typescript
import { MCPServer, widget, text } from "mcp-use/server";
import { z } from "zod";
import type { TimeEntry } from "./resources/types";
```

### Stato in-memory

```typescript
let entryIdCounter = 0;
const timeEntries: TimeEntry[] = [];
```

Counter incrementale per ID univoci (evita dipendenze esterne come UUID).

### Helper

```typescript
function computeTotals() {
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = timeEntries.reduce((sum, e) => sum + e.total, 0);
  return { totalHours, totalAmount };
}
```

### Tool: `log-time`

**Scopo:** Logga tempo lavorato su un progetto, lo salva in-memory, restituisce widget + testo fallback.

**Input Schema:**

| Campo | Tipo | Obbligatorio | Default | Descrizione |
|-------|------|-------------|---------|-------------|
| `project` | `string` | Sì | — | Nome progetto |
| `hours` | `number` | Sì | — | Ore lavorate |
| `description` | `string` | Sì | — | Cosa è stato fatto |
| `rate` | `number` | No | 50 | Tariffa oraria EUR |

**Configurazione widget:**

```typescript
widget: {
  name: "time-log",          // Corrisponde a resources/time-log.tsx
  invoking: "Logging time...",
  invoked: "Time logged",
}
```

**Handler logic:**
1. Creare `TimeEntry` con ID incrementale, calcolare `total = hours * rate`
2. Push nell'array `timeEntries`
3. Calcolare totali con `computeTotals()`
4. Restituire `widget({ props, output: text(...) })`

**Dettagli importanti:**
- Passare `[...timeEntries]` (copia) nelle props per evitare riferimenti mutabili
- Il testo fallback deve riassumere l'azione: ore, progetto, tariffa, totali correnti
- Ogni campo dello schema Zod deve avere `.describe()`

---

## Widget: `resources/time-log.tsx`

### Metadata

```typescript
export const widgetMetadata: WidgetMetadata = {
  description: "Display time tracking entries with totals",
  props: timeLogPropsSchema,     // Importato da ./types
  exposeAsTool: false,           // Abbinato a tool custom
  metadata: {
    invoking: "Loading time tracker...",
    invoked: "Time tracker ready",
  },
};
```

### Hook

```typescript
const { props, isPending } = useWidget<TimeLogProps>();
```

### Struttura Componente

1. **Guard `isPending`** — Skeleton loading (placeholder animato)
2. **Stato vuoto** — Messaggio se `entries.length === 0`
3. **Tabella entries** — Colonne: Project | Description | Hours | Rate | Total
4. **Riga sommario** — Total hours + Total amount

### Stile

- Classi Tailwind + token OpenAI SDK (`bg-surface-elevated`, `border-default`, `text-secondary`)
- Dark mode automatico tramite token CSS del SDK (nessun `useWidgetTheme()` esplicito necessario per i token, ma importare per uso futuro)
- `McpUseProvider autoSize` su ogni return path

### Pattern Critici da Seguire

- **`isPending` sempre prima di accedere a `props`** — Il widget monta PRIMA che il tool completi
- **`McpUseProvider autoSize`** — Wrapper obbligatorio su ogni return path
- **`exposeAsTool: false`** — Sempre false quando abbinato a tool custom
- **`key={entry.id}`** su ogni riga della tabella

---

## Criteri di Completamento

- [ ] `npm run dev` si avvia senza errori
- [ ] Inspector mostra il tool `log-time` nella lista
- [ ] Chiamata `log-time` con `{ project: "Alpha", hours: 3, description: "API work", rate: 60 }` → widget con 1 riga
- [ ] Seconda chiamata → widget con 2 righe, totali aggiornati
- [ ] Testo fallback visibile nella risposta del tool
- [ ] Skeleton loading visibile durante il caricamento
