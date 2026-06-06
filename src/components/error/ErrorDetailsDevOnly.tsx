import { useState } from "react";

export function ErrorDetailsDevOnly({ error }: { error: unknown }) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const rawMessage =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack || ""}`.trim()
      : typeof error === "string"
        ? error
        : JSON.stringify(error, null, 2);

  return (
    <div className="w-full rounded-[20px] border border-red-500/30 bg-red-500/8 p-4">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200"
      >
        {isOpen ? "Hide error details" : "Show error details"}
      </button>
      {isOpen ? (
        <pre className="mt-3 overflow-auto text-xs leading-6 text-red-100 whitespace-pre-wrap">
          {rawMessage}
        </pre>
      ) : null}
    </div>
  );
}
