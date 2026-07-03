import { useState, useRef, useEffect } from "react";

export default function PurposeMultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };

  const label =
    selected.length === 0
      ? "All Purposes"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} purposes selected`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="input"
        style={{ textAlign: "left", cursor: "pointer", width: "100%" }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px",
            marginTop: "4px", maxHeight: "260px", display: "flex", flexDirection: "column",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <input
            type="text"
            placeholder="Search purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ margin: "8px", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px" }}
            autoFocus
          />
          <div style={{ overflowY: "auto", padding: "0 4px 6px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", fontWeight: 600 }}>
              <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
              All Purposes
            </label>
            {filteredOptions.map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} />
                {opt}
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <p style={{ padding: "8px", fontSize: "13px", color: "#9ca3af" }}>No purposes found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}