import {
  McpUseProvider,
  useWidget,
  useCallTool,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useEffect } from "react";
import "./styles.css";
import { invoicePropsSchema, type InvoiceProps } from "../src/types";

export const widgetMetadata: WidgetMetadata = {
  description: "Professional invoice preview with editable fields",
  props: invoicePropsSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Generating invoice...",
    invoked: "Invoice ready",
  },
};

const InvoicePreview: React.FC = () => {
  const { props, isPending } = useWidget<InvoiceProps>();
  const { callToolAsync: confirmInvoice, isPending: isConfirming } =
    useCallTool("confirm-invoice");

  // --- Editable local state ---
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // --- Init from props (once) ---
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

  // --- Live discount calculation ---
  const parsedDiscount = parseFloat(discount) || 0;
  const subtotal = isPending ? 0 : props.subtotal;
  const liveDiscountAmount = subtotal * (parsedDiscount / 100);
  const liveTotal = subtotal - liveDiscountAmount;

  // --- Confirm handler ---
  const handleConfirm = async () => {
    setConfirmError(null);
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
      setConfirmError("Failed to confirm invoice. Please try again.");
    }
  };

  // --- Format date ---
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // --- Loading skeleton ---
  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-6 rounded-2xl border border-default bg-surface-elevated">
          <div className="h-8 w-32 rounded-md bg-default/10 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded-md bg-default/10 animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-md bg-default/10 animate-pulse" />
            <div className="h-4 w-full rounded-md bg-default/10 animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-default/10 animate-pulse" />
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const inputClasses =
    "px-3 py-2 rounded-lg border border-default bg-surface text-default text-sm placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <McpUseProvider autoSize>
      <div className="p-6 rounded-2xl border border-default bg-surface-elevated">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="heading-lg mb-1">Invoice</h2>
            <p className="text-sm text-secondary">
              #{props.invoiceId} &mdash; {formatDate(props.createdAt)}
            </p>
          </div>
          {isConfirmed && (
            <span className="px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
              Confirmed
            </span>
          )}
        </div>

        {/* Client info */}
        <div className="mb-6">
          <p className="text-xs text-secondary font-medium uppercase tracking-wide mb-2">
            Bill To
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              disabled={isConfirmed}
              className={inputClasses}
            />
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Client email"
              disabled={isConfirmed}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Line items table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-default text-left text-secondary">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Hours</th>
                <th className="pb-2 font-medium text-right">Rate</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {props.entries.map((entry) => (
                <tr key={entry.id} className="border-b border-default/50">
                  <td className="py-2 font-medium">{entry.project}</td>
                  <td className="py-2 text-secondary">{entry.description}</td>
                  <td className="py-2 text-right">{entry.hours}h</td>
                  <td className="py-2 text-right">&euro;{entry.rate}</td>
                  <td className="py-2 text-right font-medium">
                    &euro;{entry.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-default pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-secondary">Subtotal</span>
            <span className="font-medium">&euro;{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-secondary">Discount (%)</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0"
                max="100"
                step="1"
                disabled={isConfirmed}
                className="w-16 px-2 py-1 rounded-lg border border-default bg-surface text-default text-sm text-right focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <span className="text-secondary">
              -&euro;{liveDiscountAmount.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-default pt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>&euro;{liveTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            disabled={isConfirmed}
            rows={2}
            className={`${inputClasses} w-full resize-none`}
          />
        </div>

        {/* Confirm button */}
        {!isConfirmed && (
          <button
            onClick={handleConfirm}
            disabled={isConfirming || !clientName.trim()}
            className="mt-4 w-full py-2 rounded-lg bg-info text-on-info text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {isConfirming ? "Confirming..." : "Confirm Invoice"}
          </button>
        )}

        {confirmError && (
          <p className="mt-2 text-sm text-danger">{confirmError}</p>
        )}
      </div>
    </McpUseProvider>
  );
};

export default InvoicePreview;
