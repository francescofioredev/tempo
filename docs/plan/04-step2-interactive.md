# 04 — Step 2: Interactive Widget (callTool dal UI)

## Obiettivo

Il widget diventa interattivo: gli utenti possono aggiungere e rimuovere entry direttamente dall'interfaccia, senza passare dalla chat.

## File Coinvolti

| File | Azione |
|------|--------|
| `index.ts` | Aggiungere tool `add-time-entry` + `remove-time-entry` |
| `resources/time-log.tsx` | Aggiungere form, bottoni rimozione, hook `useCallTool` |

---

## Server: `index.ts`

### Tool: `add-time-entry`

**Scopo:** Aggiungere entry dal widget. Nascosto all'AI, visibile solo dall'app.

**Visibilità:** `_meta: { "ui/visibility": ["app"] }`

> **Nota:** Se `_meta: { "ui/visibility": ["app"] }` non funziona a runtime, provare `_meta: { visibility: ["app"] }`. Verificare nell'Inspector che il tool NON appaia nella lista tool visibili all'AI.

**Input Schema:** Identico a `log-time`:

| Campo | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| `project` | `string` | — | Nome progetto |
| `hours` | `number` | — | Ore lavorate |
| `description` | `string` | — | Cosa è stato fatto |
| `rate` | `number` | 50 | Tariffa oraria EUR |

**Handler logic:**
1. Creare `TimeEntry` con ID incrementale
2. Push nell'array `timeEntries`
3. Restituire widget con lista aggiornata

### Tool: `remove-time-entry`

**Scopo:** Rimuovere una entry dal widget. Nascosto all'AI.

**Visibilità:** `_meta: { "ui/visibility": ["app"] }`

**Annotations:** `{ destructiveHint: true }`

**Input Schema:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | `string` | ID della entry da rimuovere |

**Handler logic:**
1. Trovare entry per ID con `findIndex`
2. Se non trovata, restituire `error("Entry not found: ...")`
3. Rimuovere con `splice`
4. Restituire widget con lista aggiornata

**Import aggiuntivo:** `error` da `"mcp-use/server"`

---

## Widget: `resources/time-log.tsx`

### Nuovi Import

```typescript
import { useState, useEffect } from "react";
import { useCallTool } from "mcp-use/react";
```

### Hook per i Tool

```typescript
const {
  callTool: addEntry,
  isPending: isAdding,
  isError: isAddError,
  error: addError,
} = useCallTool("add-time-entry");

const {
  callToolAsync: removeEntryAsync,
} = useCallTool("remove-time-entry");
```

Due hook separati: uno per aggiunta (fire-and-forget con callback), uno per rimozione (async per gestire optimistic update + rollback).

### Stato Locale

```typescript
// Stato ottimistico (sync da props al mount)
const [entries, setEntries] = useState<TimeEntry[]>([]);
const [totalHours, setTotalHours] = useState(0);
const [totalAmount, setTotalAmount] = useState(0);

// Stato form
const [project, setProject] = useState("");
const [hours, setHours] = useState("");
const [rate, setRate] = useState("50");
const [description, setDescription] = useState("");

// Stato rimozione (per loading individuale)
const [removingId, setRemovingId] = useState<string | null>(null);
```

### Sync Props → Stato Locale

```typescript
useEffect(() => {
  if (!isPending && props.entries) {
    setEntries(props.entries);
    setTotalHours(props.totalHours);
    setTotalAmount(props.totalAmount);
  }
}, [isPending, props]);
```

Le props arrivano dal server dopo il tool call iniziale. `useEffect` sincronizza lo stato locale.

### Handler: Aggiunta Entry

```typescript
const handleAdd = (e: React.FormEvent) => {
  e.preventDefault();
  if (!project.trim() || !hours) return;

  addEntry(
    { project, hours: parseFloat(hours), description, rate: parseFloat(rate) || 50 },
    {
      onSuccess: () => {
        // Reset form (tranne rate per comodità)
        setProject("");
        setHours("");
        setDescription("");
      },
    }
  );
};
```

Pattern **fire-and-forget con callback**: la UI si aggiorna quando il tool risponde con nuove props.

### Handler: Rimozione Entry (Optimistic Update)

```typescript
const handleRemove = async (id: string) => {
  setRemovingId(id);
  const previousEntries = [...entries];

  // Rimozione ottimistica
  setEntries((prev) => prev.filter((e) => e.id !== id));

  try {
    await removeEntryAsync({ id });
  } catch {
    // Rollback su errore
    setEntries(previousEntries);
  } finally {
    setRemovingId(null);
  }
};
```

Pattern **optimistic update + rollback**: la riga scompare subito, viene ripristinata se il server fallisce.

### UI: Form di Aggiunta

Posizione: in fondo al widget, sotto la tabella, separato da un `border-t`.

```
┌─────────────────────────────────────────┐
│  [Project    ] [Description          ]  │
│  [Hours      ] [Rate (EUR)           ]  │
│  [          Add Entry                ]  │
│  Error message (se presente)            │
└─────────────────────────────────────────┘
```

- Grid 2 colonne per i campi
- Bottone full-width
- Campi disabilitati durante `isAdding`
- Messaggio errore sotto il bottone se `isAddError`

### UI: Bottone Rimozione per Riga

Aggiungere una 6ª colonna alla tabella (larghezza fissa, allineata a destra):

```
| Project | Description | Hours | Rate | Total | ✕ |
```

- Testo "✕" o icona
- Disabilitato durante `removingId === entry.id`
- Loading state individuale ("..." durante la rimozione)

### Ricalcolo Totali Locale

Dopo la rimozione ottimistica, ricalcolare anche i totali locali:

```typescript
setEntries((prev) => {
  const next = prev.filter((e) => e.id !== id);
  setTotalHours(next.reduce((sum, e) => sum + e.hours, 0));
  setTotalAmount(next.reduce((sum, e) => sum + e.total, 0));
  return next;
});
```

---

## Pattern Chiave Appresi

| Pattern | Dove |
|---------|------|
| `callTool()` da widget | Hook `useCallTool` |
| `visibility: ["app"]` | Tool nascosti all'AI |
| Optimistic update + rollback | Rimozione entry |
| Fire-and-forget + callback | Aggiunta entry |
| Stato form con `useState` | Campi input locali |
| Stato server nelle props | Lista entry dal tool |
| Loading per-item | `removingId` |

---

## Criteri di Completamento

- [ ] Chiamare `log-time` dall'Inspector → widget con form visibile in basso
- [ ] Compilare form e cliccare "Add Entry" → nuova riga appare, form si resetta
- [ ] Cliccare "✕" su una riga → riga scompare, totali aggiornati
- [ ] `add-time-entry` e `remove-time-entry` NON visibili nella lista tool AI
- [ ] Loading state visibile durante aggiunta (bottone disabilitato, testo "Adding...")
- [ ] Se rimozione fallisce, la riga riappare (rollback)
- [ ] Totali si aggiornano correttamente ad ogni operazione
