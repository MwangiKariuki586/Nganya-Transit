import { Keyboard, X } from "lucide-react";
import { useState } from "react";
import type { KeyboardShortcut } from "../hooks/useKeyboardShortcuts";
import { formatShortcut } from "../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (shortcuts.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
        title="Keyboard shortcuts"
      >
        <Keyboard className="h-3.5 w-3.5" />
        <span>Shortcuts</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--color-bg-base)] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Keyboard Shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                >
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 text-xs font-mono font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-body)] border border-[var(--color-line)] rounded">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Shortcuts work when not typing in input fields
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
