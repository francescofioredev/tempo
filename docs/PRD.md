# Tempo — Freelancer Time & Invoice Tracker

## Overview

Tempo is an MCP App that lets freelancers track time spent on projects and generate invoices, all from within the chat interface. It serves as a preparation exercise for the **Buildathon @ Turin** (MCP Apps hackathon, OGR Torino) and is designed to progressively teach the core patterns of building MCP Apps with the `mcp-use` framework.

## Goals

- Learn the mcp-use SDK patterns by building something real and incremental
- Cover the key MCP App concepts: tool definition, widget rendering, widget-to-tool interactivity, multi-tool coordination, theming
- End up with a working project that can be tested via the mcp-use Inspector, Claude Desktop, or tunneling to ChatGPT

## Tech Stack

- **Framework:** mcp-use (TypeScript SDK)
- **UI:** React widgets via `mcp-use/react`
- **Bootstrap:** `npx create-mcp-use-app tempo --template mcp-apps`
- **Skill reference:** `mcp-apps-builder` from `mcp-use/mcp-use` (installed in Claude Code)

## Architecture

Standard mcp-use project structure:

```
tempo/
├── index.ts              # Server entry point
├── resources/            # React widgets (auto-registered)
│   ├── time-log.tsx      # Time tracker widget
│   └── invoice-preview.tsx  # Invoice widget (Step 3)
├── package.json
└── tsconfig.json
```

Server state is kept in-memory (no database). Widgets communicate with the server exclusively via MCP tool calls.

---

## Step 1 — Display Widget (foundations)

**Objective:** Get the full stack running — a tool that accepts time data and a widget that displays it.

### Tool: `log-time`

Accepts:

| Field       | Type   | Description                 |
|-------------|--------|-----------------------------|
| project     | string | Project name                |
| hours       | number | Hours worked                |
| description | string | What was done               |
| rate        | number | Hourly rate (€), default 50 |

Returns: `widget()` with props containing the entry + running list + computed totals.

Also returns a `text()` output as fallback for non-UI hosts.

### Widget: `resources/time-log.tsx`

Renders a card with:

- Table of logged entries (Project | Hours | Rate | Total)
- Summary row with total hours and total amount
- Light/dark theme support via `useWidgetTheme()`

### Key patterns to learn

- `MCPServer` setup, `server.tool()` with Zod schema
- `widget({ props, output })` return type
- `useWidget()` hook, `isPending` guard, `McpUseProvider autoSize`
- `widgetMetadata` export with `props` schema
- Testing via Inspector at `http://localhost:3000/inspector`

### Done when

You can call the tool from the Inspector, pass project/hours/rate, and see a styled table rendered in the widget.

---

## Step 2 — Interactive Widget (callTool from UI)

**Objective:** The widget becomes interactive — users can add and remove entries directly from the UI without going through the chat.

### New tool: `add-time-entry`

Same input schema as `log-time`, but:

- `visibility: ["app"]` — only callable from the widget, hidden from the AI model
- Adds the entry to the server-side in-memory list
- Returns updated full list of entries

### New tool: `remove-time-entry`

| Field | Type   | Description                  |
|-------|--------|------------------------------|
| id    | string | ID of the entry to remove    |

Also `visibility: ["app"]`.

### Widget changes

- Add an inline form at the bottom: project, hours, rate, description fields + "Add" button
- Each row gets a "Remove" button
- On "Add": call `callTool("add-time-entry", { ... })`, update UI optimistically
- On "Remove": call `callTool("remove-time-entry", { id })`, update UI
- Handle loading and error states on tool calls
- Use `useState` for local form state

### Key patterns to learn

- `callTool()` from widget — the core interactivity pattern
- `visibility: ["app"]` for UI-only tools
- `exposeAsTool: false` in widget metadata when needed
- Optimistic UI updates + error rollback
- Local `useState` for form fields vs server state for entries

### Done when

You can open the widget, add entries via the form, remove them with the button, and see the totals update — all without typing in the chat.

---

## Step 3 — Multi-tool & Invoice Generation

**Objective:** Add a second widget (invoice preview) that uses the time entries to generate a professional invoice, editable before confirmation.

### New tool: `generate-invoice`

| Field       | Type   | Description                     |
|-------------|--------|---------------------------------|
| client_name | string | Client name for the invoice     |
| client_email| string | Client email (optional)         |
| notes       | string | Additional notes (optional)     |
| discount    | number | Discount percentage (optional)  |

Reads the in-memory time entries, computes subtotal/discount/total, returns a widget with invoice data.

### New widget: `resources/invoice-preview.tsx`

Renders a professional invoice layout:

- Header with freelancer info (hardcoded or configurable) and client info
- Line items table from time entries
- Subtotal, discount row (if any), total
- Editable fields: client name, notes, discount — changes update the preview live via local state
- "Confirm" button that calls a `confirm-invoice` tool (visibility: ["app"]) which could log/export the invoice

### New tool: `confirm-invoice`

`visibility: ["app"]` — called from the invoice widget's confirm button. Takes the final invoice data and returns a confirmation message.

### Key patterns to learn

- Multiple tools sharing server-side state (entries from time tracker → invoice)
- Multiple widgets in the same project (`time-log.tsx` + `invoice-preview.tsx`)
- Complex widget with editable fields and local state management
- CSP configuration if loading external fonts/icons
- Tunneling with `mcp-use start --tunnel` for testing on a real client

### Chat flow at this point

1. User: "I worked 3 hours on Project Alpha at €60/hour" → `log-time` → time tracker widget
2. User: "Add 5 hours on Project Beta" → `log-time` → updated tracker
3. User adds more entries directly from the widget form
4. User: "Generate invoice for Acme Corp" → `generate-invoice` → invoice preview widget
5. User adjusts discount in the widget, clicks Confirm

### Done when

Full flow works: log time → see tracker → add entries from widget → generate invoice → edit details in invoice widget → confirm. Test with tunneling or Claude Desktop.

---

## Notes for Claude Code

- Always refer to the `mcp-apps-builder` skill for implementation patterns, especially the reference files under `references/widgets/` for interactivity, state, and UI guidelines
- Start each step by reading the relevant reference docs from the skill before writing code
- Use `yarn dev` for hot reload during development
- Test each step thoroughly with the Inspector before moving to the next
- Don't over-engineer: in-memory state is fine, no database needed
- Keep widgets self-contained: all UI state lives in the widget via `useState`, all persistent state lives on the server