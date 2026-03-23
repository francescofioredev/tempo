# 05 — Step 3: Multi-tool & Generazione Fattura

## Obiettivo

Aggiungere un secondo widget (anteprima fattura) che usa le time entry per generare una fattura professionale, modificabile prima della conferma.

## File Coinvolti

| File | Azione |
|------|--------|
| `index.ts` | Aggiungere stato fatture + tool `generate-invoice` e `confirm-invoice` |
| `resources/invoice-preview.tsx` | Creare nuovo widget |
| `resources/types.ts` | Schema `InvoiceProps` già definito nel passo 02 |

---

## Server: `index.ts`

### Stato in-memory aggiuntivo

```typescript
let invoiceIdCounter = 0;

interface InvoiceRecord {
  id: string;
  clientName: string;
  clientEmail?: string;
  notes?: string;
  discount: number;
  entries: TimeEntry[];
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  confirmed: boolean;
}

const invoices: InvoiceRecord[] = [];
```

`InvoiceRecord` è l'interfaccia server-side (include campi mutabili). `InvoiceProps` in `types.ts` è lo schema per le props del widget.

### Tool: `generate-invoice`

**Scopo:** Genera una fattura dalle time entry correnti. Visibile all'AI.

**Input Schema:**

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|-------------|-------------|
| `client_name` | `string` | Sì | Nome cliente |
| `client_email` | `string` (email) | No | Email cliente |
| `notes` | `string` | No | Note aggiuntive |
| `discount` | `number` (0-100) | No | Percentuale sconto |

**Configurazione widget:**

```typescript
widget: {
  name: "invoice-preview",
  invoking: "Generating invoice...",
  invoked: "Invoice ready",
}
```

**Handler logic:**
1. Controllare che `timeEntries.length > 0`, altrimenti `error("No time entries...")`
2. Calcolare `subtotal` = somma dei `total` di tutte le entry
3. Calcolare `discountAmount` = `subtotal * (discount / 100)`
4. Calcolare `total` = `subtotal - discountAmount`
5. Creare `InvoiceRecord`, push in `invoices`
6. Restituire `widget({ props: { ...invoiceData }, output: text("...") })`

**Dettagli:**
- Le entry vengono copiate nella fattura (`[...timeEntries]`) — snapshot al momento della generazione
- Il testo fallback include: numero items, subtotale, sconto, totale

### Tool: `confirm-invoice`

**Scopo:** Conferma e finalizza una fattura dal widget. Nascosto all'AI.

**Visibilità:** `_meta: { "ui/visibility": ["app"] }`

**Input Schema:**

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `invoiceId` | `string` | ID fattura da confermare |
| `clientName` | `string` | Nome cliente finale |
| `clientEmail` | `string?` | Email cliente finale |
| `notes` | `string?` | Note finali |
| `discount` | `number?` | Sconto finale |

**Handler logic:**
1. Trovare fattura per ID
2. Se non trovata, `error("Invoice not found: ...")`
3. Aggiornare tutti i campi con i valori finali (dall'editable form del widget)
4. Ricalcolare `discountAmount` e `total` con il nuovo sconto
5. Impostare `confirmed = true`
6. Restituire widget con dati aggiornati e `confirmed: true`

Questo pattern permette all'utente di modificare i campi nel widget e inviare i valori finali al server solo alla conferma.

---

## Widget: `resources/invoice-preview.tsx`

### Metadata

```typescript
export const widgetMetadata: WidgetMetadata = {
  description: "Professional invoice preview with editable fields",
  props: invoicePropsSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Generating invoice...",
    invoked: "Invoice ready",
  },
};
```

### Hook

```typescript
const { props, isPending } = useWidget<InvoiceProps>();
const { callToolAsync: confirmInvoice, isPending: isConfirming } = useCallTool("confirm-invoice");
```

### Stato Locale (campi editabili)

```typescript
const [clientName, setClientName] = useState("");
const [clientEmail, setClientEmail] = useState("");
const [notes, setNotes] = useState("");
const [discount, setDiscount] = useState("0");
const [isConfirmed, setIsConfirmed] = useState(false);
const [initialized, setInitialized] = useState(false);
```

**Inizializzazione da props:**

```typescript
useEffect(() => {
  if (!isPending && props && !initialized) {
    setClientName(props.clientName);
    setClientEmail(props.clientEmail ?? "");
    setNotes(props.notes ?? "");
    setDiscount(String(props.discount ?? 0));
    setIsConfirmed(props.confirmed);
    setInitialized(true);
  }
}, [isPending, props, initialized]);
```

Flag `initialized` per evitare reset dello stato locale dopo modifica utente.

### Calcolo Live

Lo sconto si ricalcola localmente ad ogni modifica del campo discount:

```typescript
const parsedDiscount = parseFloat(discount) || 0;
const liveDiscountAmount = props.subtotal * (parsedDiscount / 100);
const liveTotal = props.subtotal - liveDiscountAmount;
```

Questo dà feedback immediato all'utente senza chiamate al server.

### Handler: Conferma

```typescript
const handleConfirm = async () => {
  try {
    await confirmInvoice({
      invoiceId: props.invoiceId,
      clientName,
      clientEmail: clientEmail || undefined,
      notes: notes || undefined,
      discount: parsedDiscount,
    });
    setIsConfirmed(true);
  } catch {
    // Mostrare errore (alert o stato locale)
  }
};
```

### Layout Widget

```
┌─────────────────────────────────────────────┐
│  INVOICE                    [✓ Confirmed]   │
│  #001 - 23/03/2026                          │
│                                             │
│  Bill To:                                   │
│  [Client Name      ]                        │
│  [Client Email     ]                        │
│                                             │
│  ┌──────┬───────────┬─────┬──────┬────────┐ │
│  │Proj  │Description│Hours│Rate  │Amount  │ │
│  ├──────┼───────────┼─────┼──────┼────────┤ │
│  │Alpha │API work   │ 3h  │€60   │€180.00 │ │
│  │Beta  │Frontend   │ 5h  │€50   │€250.00 │ │
│  └──────┴───────────┴─────┴──────┴────────┘ │
│                                             │
│                    Subtotal:     €430.00     │
│  Discount (%): [10 ]                        │
│                    Discount:     -€43.00    │
│                    ─────────────────────     │
│                    Total:        €387.00    │
│                                             │
│  [Additional notes...                    ]  │
│                                             │
│  [         Confirm Invoice               ]  │
└─────────────────────────────────────────────┘
```

### Sezioni

1. **Header** — Titolo "Invoice", numero fattura, data, badge "Confirmed" (se confermata)
2. **Client Info** — Input editabili per nome e email
3. **Line Items** — Tabella read-only con le entry (non editabili nella fattura)
4. **Totali** — Subtotale (fisso), campo sconto (editabile), importo sconto, totale (ricalcolato live)
5. **Notes** — Textarea editabile
6. **Confirm** — Bottone (nascosto dopo conferma)

### Stato dei Campi

| Campo | Editabile | Dopo conferma |
|-------|----------|---------------|
| Client name | Sì | No (disabled) |
| Client email | Sì | No (disabled) |
| Discount | Sì | No (disabled) |
| Notes | Sì | No (disabled) |
| Line items | No | No |
| Subtotal | No (calcolato) | No |
| Total | No (calcolato live) | No |

---

## Pattern Chiave Appresi

| Pattern | Dove |
|---------|------|
| Tool multipli condividono stato server | `timeEntries` usato da `log-time` e `generate-invoice` |
| Widget multipli nello stesso progetto | `time-log.tsx` + `invoice-preview.tsx` |
| Widget con campi editabili | `useState` per ogni campo, sync iniziale da props |
| Calcolo live lato client | Sconto ricalcolato senza chiamate server |
| `callToolAsync` per conferma | Attende risposta per aggiornare UI |
| `initialized` flag | Evita reset stato locale dopo prima init |

---

## Criteri di Completamento

- [ ] Loggare diverse entry con `log-time`
- [ ] Chiamare `generate-invoice` con `{ client_name: "Acme Corp", discount: 10 }` → widget fattura
- [ ] Nome cliente pre-compilato e modificabile
- [ ] Tabella line items con tutte le entry loggate
- [ ] Subtotale, sconto e totale calcolati correttamente
- [ ] Modificare sconto nel widget → totale si aggiorna live
- [ ] Scrivere note nel textarea
- [ ] Cliccare "Confirm" → badge "Confirmed" appare, campi disabilitati
- [ ] `confirm-invoice` NON visibile nella lista tool AI
- [ ] Testo fallback della fattura corretto
