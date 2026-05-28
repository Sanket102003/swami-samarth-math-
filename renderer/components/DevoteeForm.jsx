import { useEffect, useState } from "react";
import apiRequest from "../services/api";

export default function DevoteeForm() {
  const [form, setForm] = useState({
    smarnarth: "",  // renamed from samarth
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  // Load existing data
  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("bookingForm") || "{}"
    );

    setForm({
      smarnarth: saved.smarnarth || "",
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

  // Phone search handler
  const handlePhoneSearch = async (phone) => {
    setSearchMessage("");
    if (phone.length < 10) return;

    try {
      setSearching(true);

      const data = await apiRequest("/Bookings");
      const allBookings = Array.isArray(data) ? data : data.bookings || [];

      const matches = allBookings.filter(
        (b) => String(b.phone || "").trim() === phone.trim()
      );

      if (matches.length > 0) {
        const latest = matches.sort(
          (a, b) =>
            new Date(b.createdAt || b.bookingDate) -
            new Date(a.createdAt || a.bookingDate)
        )[0];

        const updated = {
          smarnarth: latest.smarnarth || "",
          name: latest.name || "",
          address: latest.address || "",
          phone: latest.phone || phone,
          email: latest.email || "",
        };

        setForm(updated);

        const existing = JSON.parse(
          localStorage.getItem("bookingForm") || "{}"
        );
        localStorage.setItem(
          "bookingForm",
          JSON.stringify({ ...existing, ...updated })
        );

        setSearchMessage("✅ Customer found! Details filled automatically.");
      } else {
        setSearchMessage("❌ No customer found. Please fill details manually.");
      }
    } catch (err) {
      setSearchMessage("❌ No customer found. Please fill details manually.");
      console.log("Phone search failed:", err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="db-section">

      {/* PHONE SEARCH BOX */}
      <h3>Search Customer / ग्राहक शोधा</h3>
      <input
        className="input"
        placeholder="Enter Phone to Auto-fill / फोन नंबर टाका"
        value={searchPhone}
        maxLength={10}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*$/.test(value) && value.length <= 10) {
            setSearchPhone(value);

            if (value.length === 0) {
              const empty = {
                smarnarth: "",
                name: "",
                address: "",
                phone: "",
                email: "",
              };
              setForm(empty);
              setSearchMessage("");

              const existing = JSON.parse(
                localStorage.getItem("bookingForm") || "{}"
              );
              localStorage.setItem(
                "bookingForm",
                JSON.stringify({ ...existing, ...empty })
              );
            } else {
              handlePhoneSearch(value);
            }
          }
        }}
      />
      {searching && (
        <p style={{ padding: "5px", color: "gray" }}>Searching...</p>
      )}
      {searchMessage && (
        <p style={{ padding: "5px" }}>{searchMessage}</p>
      )}

      {/* DEVOTEE DETAILS */}
      <h3 style={{ marginTop: "15px" }}>Devotee Details / भक्त तपशील</h3>

      {/* SAMARNARTH — not required, above Name */}
      <input
        className="input"
        placeholder="smarnarth / स्मरणार्थ"
        value={form.smarnarth}
        onChange={(e) => updateForm("smarnarth", e.target.value)}
      />

      <input
        className="input"
        placeholder="Name / नाव *"
        value={form.name}
        onChange={(e) => {
          const value = e.target.value;
          if (/^[A-Za-z\s]*$/.test(value)) {
            updateForm("name", value);
          }
        }}
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
        maxLength={10}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*$/.test(value) && value.length <= 10) {
            updateForm("phone", value);
          }
        }}
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