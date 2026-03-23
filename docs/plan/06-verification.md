# 06 — Verifica e Testing End-to-End

## Ambiente di Test

- **Dev server:** `npm run dev` → hot reload + Inspector
- **Inspector:** `http://localhost:3000/inspector`
- **Test avanzato:** `mcp-use start --tunnel` per testare su Claude Desktop o ChatGPT

---

## Checklist per Step

### Pre-check: Dopo Cleanup

- [ ] `npm run dev` si avvia senza errori
- [ ] Inspector raggiungibile su `http://localhost:3000/inspector`
- [ ] Nessun tool demo (search-tools, get-fruit-details) nella lista
- [ ] Nessun widget demo visibile

### Step 1: Display Widget

- [ ] Tool `log-time` visibile nell'Inspector
- [ ] Chiamata con parametri minimi: `{ "project": "Test", "hours": 1, "description": "test" }` (rate default 50)
- [ ] Widget mostra tabella con 1 riga
- [ ] Colonne corrette: Project | Description | Hours | Rate | Total
- [ ] Valori corretti: Total = hours × rate
- [ ] Seconda chiamata → 2 righe, totali aggiornati
- [ ] Riga sommario mostra totale ore e importo
- [ ] Testo fallback presente nella risposta tool
- [ ] Skeleton loading visibile durante caricamento (simulare con delay se necessario)
- [ ] Stato vuoto: messaggio "No entries yet" se non ci sono entry

### Step 2: Interactive Widget

- [ ] Tool `add-time-entry` e `remove-time-entry` NON nella lista AI
- [ ] Form visibile in fondo al widget (4 campi + bottone)
- [ ] Compilare form → cliccare "Add Entry" → riga aggiunta
- [ ] Form si resetta dopo aggiunta (tranne rate)
- [ ] Bottone "Add" disabilitato durante l'aggiunta
- [ ] Testo bottone cambia in "Adding..." durante l'aggiunta
- [ ] Cliccare "✕" su una riga → riga scompare immediatamente (optimistic)
- [ ] Totali si aggiornano dopo aggiunta e rimozione
- [ ] Campi form disabilitati se non validi (project vuoto, hours vuoto)
- [ ] Errore visibile se aggiunta fallisce

### Step 3: Invoice Generation

- [ ] Tool `generate-invoice` visibile nell'Inspector
- [ ] Chiamata senza entry → errore "No time entries to invoice"
- [ ] Loggare 2-3 entry, poi generare fattura con sconto
- [ ] Widget fattura mostra header con numero e data
- [ ] Client name pre-compilato e editabile
- [ ] Client email editabile
- [ ] Tabella line items corretta (tutte le entry)
- [ ] Subtotale = somma totali entry
- [ ] Campo sconto editabile → totale ricalcola live
- [ ] Importo sconto visibile solo se > 0
- [ ] Notes textarea editabile
- [ ] Cliccare "Confirm" → badge "Confirmed", campi disabilitati
- [ ] Bottone "Confirm" scompare dopo conferma
- [ ] Tool `confirm-invoice` NON nella lista AI

---

## Test Flusso Completo

Simulare il flusso utente dall'Inspector:

1. **`log-time`** con `{ project: "Project Alpha", hours: 3, description: "Backend API", rate: 60 }`
   - → Widget time tracker con 1 riga (€180)

2. **`log-time`** con `{ project: "Project Beta", hours: 5, description: "Frontend work", rate: 50 }`
   - → Widget con 2 righe, totale €430

3. **Dal widget:** Aggiungere entry tramite form (es. "Project Alpha", 2h, "Code review", €60)
   - → 3 righe, totale €550

4. **Dal widget:** Rimuovere la seconda entry (Project Beta)
   - → 2 righe, totale €300

5. **`generate-invoice`** con `{ client_name: "Acme Corp", client_email: "billing@acme.com", discount: 10 }`
   - → Widget fattura con 2 entry, subtotale €300, sconto -€30, totale €270

6. **Nel widget fattura:** Modificare sconto a 15%
   - → Totale aggiornato live a €255

7. **Nel widget fattura:** Aggiungere nota "Payment due in 30 days"

8. **Nel widget fattura:** Cliccare "Confirm"
   - → Badge "Confirmed", tutti i campi disabilitati

---

## Troubleshooting Comune

| Problema | Causa | Soluzione |
|----------|-------|----------|
| Widget non appare | Nome widget non corrisponde al file | Verificare che `widget.name` nel tool corrisponda al nome del file/directory in `resources/` |
| Props undefined | `isPending` non controllato | Aggiungere guard `if (isPending)` prima di accedere a `props` |
| Tool app-only visibile all'AI | `_meta` non riconosciuto | Provare `_meta: { visibility: ["app"] }` senza prefisso `ui/` |
| Stato locale non si aggiorna | `useEffect` mancante | Sync props → stato locale con `useEffect` |
| Form non si resetta | `onSuccess` callback mancante | Aggiungere reset in `onSuccess` del `callTool` |
| Totali non aggiornati dopo rimozione | Solo filtraggio entries | Ricalcolare `totalHours` e `totalAmount` dopo il filter |
| Widget non ridimensiona | `autoSize` mancante | Verificare `McpUseProvider autoSize` su ogni return path |
| TypeScript errori su props | Tipo inferito da widgetMetadata | Inferire da schema direttamente: `z.infer<typeof propsSchema>` |

---

## Metriche di Successo

| Metrica | Target |
|---------|--------|
| Tool totali | 5 (3 AI-visible, 2 app-only) |
| Widget totali | 2 (time-log, invoice-preview) |
| Nuovi file creati | 3 (types.ts, time-log.tsx, invoice-preview.tsx) |
| File modificati | 2 (index.ts, styles.css) |
| File eliminati | 2 directory (product-search-result/, fruits/) |
| Dipendenze aggiunte | 0 |
