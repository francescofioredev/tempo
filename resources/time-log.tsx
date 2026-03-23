import {
  McpUseProvider,
  useWidget,
  useCallTool,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState, useEffect } from "react";
import "./styles.css";
import { timeLogPropsSchema, type TimeLogProps, type TimeEntry } from "../src/types";

export const widgetMetadata: WidgetMetadata = {
  description: "Display time tracking entries with totals",
  props: timeLogPropsSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Loading time tracker...",
    invoked: "Time tracker ready",
  },
};

const TimeLog: React.FC = () => {
  const { props, isPending } = useWidget<TimeLogProps>();

  // --- useCallTool hooks ---
  const {
    callTool: addEntry,
    isPending: isAdding,
    isError: isAddError,
    error: addError,
  } = useCallTool("add-time-entry");

  const { callToolAsync: removeEntryAsync } = useCallTool("remove-time-entry");

  // --- Local state (optimistic) ---
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // --- Form state ---
  const [project, setProject] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState("50");

  // --- Per-item loading ---
  const [removingId, setRemovingId] = useState<string | null>(null);

  // --- Sync props → local state ---
  useEffect(() => {
    if (!isPending && props?.entries) {
      setEntries(props.entries);
      setTotalHours(props.totalHours);
      setTotalAmount(props.totalAmount);
    }
  }, [isPending, props]);

  // --- Handlers ---
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim() || !hours) return;

    const h = parseFloat(hours);
    const r = parseFloat(rate) || 50;

    // Optimistic add
    const tempEntry: TimeEntry = {
      id: `temp-${Date.now()}`,
      project: project.trim(),
      hours: h,
      description: description.trim(),
      rate: r,
      total: h * r,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, tempEntry]);
    setTotalHours((prev) => prev + h);
    setTotalAmount((prev) => prev + tempEntry.total);

    const previousEntries = [...entries];
    const previousHours = totalHours;
    const previousAmount = totalAmount;

    // Reset form immediately
    const trimmedProject = project.trim();
    const trimmedDesc = description.trim();
    setProject("");
    setHours("");
    setDescription("");

    addEntry(
      {
        project: trimmedProject,
        hours: h,
        description: trimmedDesc,
        rate: r,
      },
      {
        onError: () => {
          // Rollback
          setEntries(previousEntries);
          setTotalHours(previousHours);
          setTotalAmount(previousAmount);
        },
      }
    );
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    const previousEntries = [...entries];
    const previousHours = totalHours;
    const previousAmount = totalAmount;

    // Optimistic removal
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      setTotalHours(next.reduce((sum, e) => sum + e.hours, 0));
      setTotalAmount(next.reduce((sum, e) => sum + e.total, 0));
      return next;
    });

    try {
      await removeEntryAsync({ id });
    } catch {
      // Rollback on error
      setEntries(previousEntries);
      setTotalHours(previousHours);
      setTotalAmount(previousAmount);
    } finally {
      setRemovingId(null);
    }
  };

  const canAdd = project.trim() !== "" && hours !== "" && parseFloat(hours) > 0;

  // --- Loading skeleton ---
  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-6 rounded-2xl border border-default bg-surface-elevated">
          <div className="h-6 w-40 rounded-md bg-default/10 animate-pulse mb-2" />
          <div className="h-4 w-24 rounded-md bg-default/10 animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-md bg-default/10 animate-pulse" />
            <div className="h-4 w-full rounded-md bg-default/10 animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-default/10 animate-pulse" />
          </div>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div className="p-6 rounded-2xl border border-default bg-surface-elevated">
        <h2 className="heading-lg mb-1">Tempo</h2>
        <p className="text-sm text-secondary mb-4">Time Tracker</p>

        {entries.length === 0 ? (
          <p className="text-secondary text-center py-8">
            No entries yet. Log some time to get started.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default text-left text-secondary">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Hours</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-default/50"
                    >
                      <td className="py-2 font-medium">{entry.project}</td>
                      <td className="py-2 text-secondary">
                        {entry.description}
                      </td>
                      <td className="py-2 text-right">{entry.hours}h</td>
                      <td className="py-2 text-right">€{entry.rate}</td>
                      <td className="py-2 text-right font-medium">
                        €{entry.total.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleRemove(entry.id)}
                          disabled={removingId === entry.id}
                          className="text-secondary hover:text-danger transition-colors disabled:opacity-50"
                          title="Remove entry"
                        >
                          {removingId === entry.id ? "..." : "✕"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-default flex justify-between text-sm font-semibold">
              <span>Total: {totalHours}h</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
          </>
        )}

        {/* --- Add Entry Form --- */}
        <form
          onSubmit={handleAdd}
          className="mt-4 pt-4 border-t border-default"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Project"
              disabled={isAdding}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-default text-sm placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              disabled={isAdding}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-default text-sm placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info"
            />
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours"
              min="0.1"
              step="0.1"
              disabled={isAdding}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-default text-sm placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info"
            />
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Rate (EUR)"
              min="0"
              step="1"
              disabled={isAdding}
              className="px-3 py-2 rounded-lg border border-default bg-surface text-default text-sm placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>
          <button
            type="submit"
            disabled={!canAdd || isAdding}
            className="w-full py-2 rounded-lg bg-info text-on-info text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {isAdding ? "Adding..." : "Add Entry"}
          </button>
          {isAddError && (
            <p className="mt-2 text-sm text-danger">
              {addError instanceof Error ? addError.message : "Failed to add entry"}
            </p>
          )}
        </form>
      </div>
    </McpUseProvider>
  );
};

export default TimeLog;
