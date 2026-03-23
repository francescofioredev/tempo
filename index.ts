import { MCPServer, widget, text, error } from "mcp-use/server";
import { z } from "zod";
import type { TimeEntry } from "./src/types";

const server = new MCPServer({
  name: "tempo",
  title: "Tempo",
  version: "1.0.0",
  description: "Freelancer Time & Invoice Tracker",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// --- In-memory state ---
let entryIdCounter = 0;
const timeEntries: TimeEntry[] = [];

function computeTotals() {
  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = timeEntries.reduce((sum, e) => sum + e.total, 0);
  return { totalHours, totalAmount };
}

// --- Tools ---

server.tool(
  {
    name: "log-time",
    description:
      "Log time spent on a project and display the time tracker widget",
    schema: z.object({
      project: z.string().describe("Project name"),
      hours: z.number().describe("Hours worked"),
      description: z.string().describe("What was done"),
      rate: z.number().default(50).describe("Hourly rate in EUR, defaults to 50"),
    }),
    widget: {
      name: "time-log",
      invoking: "Logging time...",
      invoked: "Time logged",
    },
  },
  async ({ project, hours, description, rate }) => {
    const entry: TimeEntry = {
      id: String(++entryIdCounter),
      project,
      hours,
      description,
      rate,
      total: hours * rate,
      createdAt: new Date().toISOString(),
    };
    timeEntries.push(entry);

    const { totalHours, totalAmount } = computeTotals();

    return widget({
      props: {
        entries: [...timeEntries],
        totalHours,
        totalAmount,
      },
      output: text(
        `Logged ${hours}h on "${project}" at €${rate}/h (€${entry.total}). ` +
          `Total: ${totalHours}h, €${totalAmount}`
      ),
    });
  }
);

// --- Invoice state ---
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

// --- Invoice tools ---

server.tool(
  {
    name: "generate-invoice",
    description:
      "Generate a professional invoice from logged time entries",
    schema: z.object({
      client_name: z.string().describe("Client name for the invoice"),
      client_email: z.string().email().optional().describe("Client email"),
      notes: z.string().optional().describe("Additional notes"),
      discount: z.number().min(0).max(100).default(0).describe("Discount percentage (0-100)"),
    }),
    widget: {
      name: "invoice-preview",
      invoking: "Generating invoice...",
      invoked: "Invoice ready",
    },
  },
  async ({ client_name, client_email, notes, discount }) => {
    if (timeEntries.length === 0) {
      return error("No time entries to generate an invoice from. Log some time first.");
    }

    const entriesSnapshot = [...timeEntries];
    const subtotal = entriesSnapshot.reduce((sum, e) => sum + e.total, 0);
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;

    const invoice: InvoiceRecord = {
      id: String(++invoiceIdCounter),
      clientName: client_name,
      clientEmail: client_email,
      notes,
      discount,
      entries: entriesSnapshot,
      subtotal,
      discountAmount,
      total,
      createdAt: new Date().toISOString(),
      confirmed: false,
    };
    invoices.push(invoice);

    return widget({
      props: {
        invoiceId: invoice.id,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        notes: invoice.notes,
        discount: invoice.discount,
        entries: invoice.entries,
        subtotal: invoice.subtotal,
        discountAmount: invoice.discountAmount,
        total: invoice.total,
        createdAt: invoice.createdAt,
        confirmed: invoice.confirmed,
      },
      output: text(
        `Invoice #${invoice.id} generated for ${client_name}. ` +
          `${entriesSnapshot.length} items, subtotal €${subtotal.toFixed(2)}, ` +
          `discount ${discount}% (-€${discountAmount.toFixed(2)}), ` +
          `total €${total.toFixed(2)}`
      ),
    });
  }
);

server.tool(
  {
    name: "confirm-invoice",
    description: "Confirm and finalize an invoice",
    schema: z.object({
      invoiceId: z.string().describe("ID of the invoice to confirm"),
      clientName: z.string().describe("Final client name"),
      clientEmail: z.string().optional().describe("Final client email"),
      notes: z.string().optional().describe("Final notes"),
      discount: z.number().min(0).max(100).optional().describe("Final discount percentage"),
    }),
    widget: {
      name: "invoice-preview",
      invoking: "Confirming invoice...",
      invoked: "Invoice confirmed",
    },
    _meta: { "ui/visibility": ["app"] },
  },
  async ({ invoiceId, clientName, clientEmail, notes, discount }) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return error(`Invoice not found: ${invoiceId}`);
    }

    invoice.clientName = clientName;
    invoice.clientEmail = clientEmail;
    invoice.notes = notes;
    invoice.discount = discount ?? invoice.discount;
    invoice.discountAmount = invoice.subtotal * (invoice.discount / 100);
    invoice.total = invoice.subtotal - invoice.discountAmount;
    invoice.confirmed = true;

    return widget({
      props: {
        invoiceId: invoice.id,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        notes: invoice.notes,
        discount: invoice.discount,
        entries: invoice.entries,
        subtotal: invoice.subtotal,
        discountAmount: invoice.discountAmount,
        total: invoice.total,
        createdAt: invoice.createdAt,
        confirmed: invoice.confirmed,
      },
      output: text(`Invoice #${invoice.id} confirmed for ${invoice.clientName}. Total: €${invoice.total.toFixed(2)}`),
    });
  }
);

// --- App-only tools (callable from widget, hidden from AI) ---

server.tool(
  {
    name: "add-time-entry",
    description: "Add a time entry from the widget form",
    schema: z.object({
      project: z.string().describe("Project name"),
      hours: z.number().describe("Hours worked"),
      description: z.string().describe("What was done"),
      rate: z.number().default(50).describe("Hourly rate in EUR"),
    }),
    widget: {
      name: "time-log",
      invoking: "Adding entry...",
      invoked: "Entry added",
    },
    _meta: { "ui/visibility": ["app"] },
  },
  async ({ project, hours, description, rate }) => {
    const entry: TimeEntry = {
      id: String(++entryIdCounter),
      project,
      hours,
      description,
      rate,
      total: hours * rate,
      createdAt: new Date().toISOString(),
    };
    timeEntries.push(entry);

    const { totalHours, totalAmount } = computeTotals();

    return widget({
      props: {
        entries: [...timeEntries],
        totalHours,
        totalAmount,
      },
      output: text(
        `Added ${hours}h on "${project}" at €${rate}/h. Total: ${totalHours}h, €${totalAmount}`
      ),
    });
  }
);

server.tool(
  {
    name: "remove-time-entry",
    description: "Remove a time entry by ID",
    schema: z.object({
      id: z.string().describe("ID of the entry to remove"),
    }),
    annotations: { destructiveHint: true },
    widget: {
      name: "time-log",
      invoking: "Removing entry...",
      invoked: "Entry removed",
    },
    _meta: { "ui/visibility": ["app"] },
  },
  async ({ id }) => {
    const idx = timeEntries.findIndex((e) => e.id === id);
    if (idx === -1) {
      return error(`Entry not found: ${id}`);
    }
    timeEntries.splice(idx, 1);

    const { totalHours, totalAmount } = computeTotals();

    return widget({
      props: {
        entries: [...timeEntries],
        totalHours,
        totalAmount,
      },
      output: text(`Removed entry ${id}. Total: ${totalHours}h, €${totalAmount}`),
    });
  }
);

server.listen().then(() => {
  console.log("Server running");
});
