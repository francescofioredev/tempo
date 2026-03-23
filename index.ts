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
