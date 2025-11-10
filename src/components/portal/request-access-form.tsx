'use client';

import { useState, useTransition } from "react";

interface FormState {
  fullName: string;
  company: string;
  email: string;
  managerEmail: string;
  notes: string;
}

const INITIAL_STATE: FormState = {
  fullName: "",
  company: "",
  email: "",
  managerEmail: "",
  notes: "",
};

export function RequestAccessForm() {
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setMessage("");

    const managerEmail = formState.managerEmail.trim();
    if (!managerEmail || !managerEmail.endsWith("@promosink.com")) {
      setStatus("error");
      setMessage("Account manager email must use the promosink.com domain.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/portal/api/request-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formState.fullName,
            company: formState.company,
            email: formState.email,
            managerEmail,
            notes: formState.notes,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Unable to submit request.");
        }

        setStatus("success");
        setMessage("Thanks! Your access request was submitted for review.");
        setFormState(INITIAL_STATE);
      } catch (error) {
        setStatus("error");
        setMessage((error as Error).message || "Something went wrong. Try again or email support@promosink.com.");
      }
    });
  }

  function handleFieldChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Full name</label>
          <input
            required
            value={formState.fullName}
            onChange={(event) => handleFieldChange("fullName", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Jamie Rivera"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Company</label>
          <input
            value={formState.company}
            onChange={(event) => handleFieldChange("company", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Acme Promotions"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Work email</label>
          <input
            required
            type="email"
            value={formState.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="you@company.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Which Promos Ink account manager are you working with?</label>
          <input
            required
            type="email"
            value={formState.managerEmail}
            onChange={(event) => handleFieldChange("managerEmail", event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="manager@promosink.com"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Share context</label>
        <textarea
          value={formState.notes}
          onChange={(event) => handleFieldChange("notes", event.target.value)}
          rows={4}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Projects you need help with, brands you support, or integrations to connect."
        />
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Submitting…" : "Send access request"}
        </button>
        {status !== "idle" ? (
          <p
            className={`text-sm ${status === "success" ? "text-emerald-600" : "text-rose-600"}`}
          >
            {message}
          </p>
        ) : null}
        <p className="text-xs text-slate-400">
          Requests are routed to Promos Ink account management. You will receive an email confirmation once your login is approved.
        </p>
      </div>
    </form>
  );
}
