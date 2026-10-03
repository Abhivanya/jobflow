import type { ReactNode } from "react";

export function PageHeader({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        {lede ? <p className="mt-1 max-w-2xl text-muted">{lede}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-clay/30 bg-white px-3 py-2 text-sm text-clay">{children}</p>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={onClose}>
      <div className="card mt-8 w-full max-w-xl p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button className="btn secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-clay">{error}</span> : null}
    </label>
  );
}

export function ChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((item) => (
          <button key={item} type="button" className="chip" onClick={() => onChange(value.filter((entry) => entry !== item))}>
            {item} ×
          </button>
        ))}
      </div>
      <input
        className="field"
        placeholder={placeholder || "Type one and press Enter"}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== ",") return;
          event.preventDefault();
          const next = event.currentTarget.value.trim();
          if (!next || value.some((item) => item.toLowerCase() === next.toLowerCase())) {
            event.currentTarget.value = "";
            return;
          }
          onChange([...value, next]);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
