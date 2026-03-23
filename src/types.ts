import { z } from "zod";

// --- Time Entry ---

export const timeEntrySchema = z.object({
  id: z.string().describe("Unique entry ID"),
  project: z.string().describe("Project name"),
  hours: z.number().describe("Hours worked"),
  description: z.string().describe("Description of work done"),
  rate: z.number().describe("Hourly rate in EUR"),
  total: z.number().describe("Line total (hours * rate)"),
  createdAt: z.string().describe("ISO timestamp when entry was created"),
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;

// --- Time Log Widget Props ---

export const timeLogPropsSchema = z.object({
  entries: z.array(timeEntrySchema),
  totalHours: z.number(),
  totalAmount: z.number(),
});

export type TimeLogProps = z.infer<typeof timeLogPropsSchema>;

// --- Invoice Widget Props (Step 3) ---

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
