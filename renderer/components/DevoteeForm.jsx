import { useEffect, useState } from "react";

export default function DevoteeForm() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  // Load existing data
  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("bookingForm") || "{}"
    );

    setForm({
      name: saved.name || "",
      address: saved.address || "",
      phone: saved.phone || "",
      email: saved.email || "",
    });
  }, []);

  // Save to localStorage
  const updateForm = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);

    const existing = JSON.parse(
      localStorage.getItem("bookingForm") || "{}"
    );

    localStorage.setItem(
      "bookingForm",
      JSON.stringify({ ...existing, ...updated })
    );
  };

  return (
    <div className="db-section">
      <h3>Devotee Details / भक्त तपशील</h3>

      <input
        className="input"
        placeholder="Name / नाव *"
        value={form.name}
        onChange={(e) => updateForm("name", e.target.value)}
      />

      <input
        className="input"
        placeholder="Address / पत्ता"
        value={form.address}
        onChange={(e) => updateForm("address", e.target.value)}
      />

      <input
        className="input"
        placeholder="Phone / फोन *"
        value={form.phone}
        onChange={(e) => updateForm("phone", e.target.value)}
      />

      <input
        className="input"
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={(e) => updateForm("email", e.target.value)}
      />
    </div>
  );
}