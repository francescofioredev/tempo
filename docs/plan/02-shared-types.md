# 02 — Tipi Condivisi: `resources/types.ts`

## Obiettivo

Definire schemi Zod e tipi TypeScript riusabili da server (`index.ts`) e widget (`time-log.tsx`, `invoice-preview.tsx`).

## File

**Nuovo file:** `resources/types.ts`

## Perché in `resources/`

- La directory `resources/` è già inclusa nel `tsconfig.json` (`include: ["resources/**"]`)
- I widget importano direttamente da `./types` (path relativo)
- Il server importa da `./resources/types` (funziona con `moduleResolution: "bundler"`)
- Nessuna necessità di creare una directory `src/` separata

## Schema: TimeEntry

Rappresenta una singola entry temporale.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | `string` | ID univoco (counter incrementale) |
| `project` | `string` | Nome del progetto |
| `hours` | `number` | Ore lavorate |
| `description` | `string` | Descrizione del lavoro |
| `rate` | `number` | Tariffa oraria (EUR) |
| `total` | `number` | Totale riga (hours × rate) |
| `createdAt` | `string` | Timestamp ISO di creazione |

```typescript
export const timeEntrySchema = z.object({
  id: z.string(),
  project: z.string(),
  hours: z.number(),
  description: z.string(),
  rate: z.number(),
  total: z.number(),
  createdAt: z.string(),
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;
```

## Schema: TimeLogProps

Props passate al widget `time-log`.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `entries` | `TimeEntry[]` | Lista di tutte le entry |
| `totalHours` | `number` | Somma ore |
| `totalAmount` | `number` | Somma totali |

```typescript
export const timeLogPropsSchema = z.object({
  entries: z.array(timeEntrySchema),
  totalHours: z.number(),
  totalAmount: z.number(),
});

export type TimeLogProps = z.infer<typeof timeLogPropsSchema>;
```

## Schema: InvoiceProps (usato dallo Step 3)

Props passate al widget `invoice-preview`.

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `invoiceId` | `string` | ID univoco fattura |
| `clientName` | `string` | Nome cliente |
| `clientEmail` | `string?` | Email cliente (opzionale) |
| `notes` | `string?` | Note aggiuntive (opzionale) |
| `discount` | `number?` | Percentuale sconto (opzionale) |
| `entries` | `TimeEntry[]` | Entry incluse nella fattura |
| `subtotal` | `number` | Subtotale (somma totali entry) |
| `discountAmount` | `number` | Importo sconto |
| `total` | `number` | Totale finale |
| `createdAt` | `string` | Timestamp ISO di creazione |
| `confirmed` | `boolean` | Se la fattura è confermata |

```typescript
export const invoicePropsSchema = z.object({
  invoiceId: z.string(),
  clientName: z.string(),
  clientEmail: z.string().optional(),
  notes: z.string().optional(),
  discount: z.number().optional(),
  entries: z.array(timeEntrySchema),
  subtotal: z.number(),
  discountAmount: z.number(),
  total: z.number(),
  createdAt: z.string(),
  confirmed: z.boolean(),
});

export type InvoiceProps = z.infer<typeof invoicePropsSchema>;
```

## Pattern Critico: Inferenza Tipi

```typescript
// CORRETTO — estrarre il tipo dallo schema direttamente
const propsSchema = z.object({ ... });
type Props = z.infer<typeof propsSchema>;

// SBAGLIATO — perdita informazioni di tipo
type Props = z.infer<typeof widgetMetadata.props>;
```
