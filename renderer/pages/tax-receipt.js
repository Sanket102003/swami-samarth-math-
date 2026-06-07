import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DevoteeForm from "../components/DevoteeForm";
import PurposeDropdown from "../components/PurposeDropdown";
import apiRequest from "../services/api";

/* Bank options — no Cash */
const ALL_BANKS = [
  { id: "ICICI Bank", label: "ICICI", icon: "🏦" },
  { id: "BCCB Bank",  label: "BCCB",  icon: "🏛️" },
  { id: "SBI Bank",   label: "SBI",   icon: "🏧" },
  { id: "Cash",       label: "Cash",  icon: "💵", isCash: true },
  { id: "Cheque",     label: "Cheque",icon: "📝", isCheque: true },
];

export default function TaxReceipt() {
  const router = useRouter();

  const [is80G, setIs80G] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [panCard, setPanCard] = useState("");
  const [loading, setLoading] = useState(false);

  // Cheque fields
  const [payingBankName, setPayingBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  const visibleBanks = is80G
    ? ALL_BANKS
    : ALL_BANKS.filter((b) => b.id !== "SBI Bank");

  const isChequeSelected = selectedBank === "Cheque";

  const ADVANCE_ALLOWED_PURPOSES = ["full bhandara", "half bhandara", "shiraprasad"];
  const normalizePurpose = (p = "") => String(p).split("/")[0].trim().toLowerCase();

  const validateName  = (n) => /^[A-Za-z\s]+$/.test(n.trim());
  const validatePhone = (p) => { const c = p.trim(); return /^[6-9]\d{9}$/.test(c) && !/^(\d)\1{9}$/.test(c); };
  const validateEmail = (e) => { if (!e?.trim()) return true; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); };
  const validatePan   = (p) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p.trim().toUpperCase());

  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      const savedForm = JSON.parse(localStorage.getItem("bookingForm") || "{}");

      if (!savedForm.name?.trim())         { alert("Please enter devotee name"); return; }
      if (!validateName(savedForm.name))   { alert("Name should contain only letters and spaces."); return; }
      if (!savedForm.phone?.trim())        { alert("Please enter phone number"); return; }
      if (!validatePhone(savedForm.phone)) { alert("Enter a valid 10-digit mobile number."); return; }
      if (savedForm.email?.trim() && !validateEmail(savedForm.email)) { alert("Please enter a valid email address."); return; }
      if (!savedForm.purpose?.trim())      { alert("Please select purpose"); return; }

      const noCalendarPurposes = [
        "Two Wheeler / दुचाकी (₹251)",
        "Three Wheeler / तीनचाकी (₹351)",
        "Four Wheeler / चारचाकी (₹551)",
        "गाडीपुजा (टे पो, बस इयादी.)",
      ];

      if (savedForm.purpose === "Abhishek / अभिषेक") {
        if (!savedForm.abhishekType?.trim())  { alert("Please select Abhishek type"); return; }
        if (!savedForm.abhishekGotra?.trim()) { alert("Please select or enter Gotra"); return; }
        if (!savedForm.pricePerDate || Number(savedForm.pricePerDate) <= 0) { alert("Please enter price per date"); return; }
        if (!savedForm.abhishekDates || savedForm.abhishekDates.length === 0) { alert("Please select at least one date for Abhishek"); return; }
      } else if (!noCalendarPurposes.includes(savedForm.purpose) && !savedForm.bookingDate) {
        alert("Please select booking date"); return;
      }

      const bookingDate = new Date(savedForm.bookingDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (bookingDate < today) { alert("Past dates are not allowed."); return; }

      if (!selectedBank) { alert("Please select a payment method"); return; }

      // Cheque validation
      if (isChequeSelected) {
        if (!payingBankName.trim()) { alert("Please enter paying bank name"); return; }
        if (!chequeNumber.trim())   { alert("Please enter cheque number"); return; }
        if (!chequeDate)            { alert("Please enter cheque date"); return; }
      }

      if (is80G) {
        if (!panCard.trim())       { alert("Please enter PAN card number for 80G"); return; }
        if (!validatePan(panCard)) { alert("Please enter a valid PAN card (e.g. ABCDE1234F)"); return; }
      }

      const amount = Number(savedForm.amount || 0);
      let advance = Number(savedForm.advance || 0);
      let remainingAmount = Number(savedForm.remainingAmount || 0);

      if (Number.isNaN(amount) || amount <= 0) { alert("Amount must be greater than 0"); return; }

      const normalizedPurpose = normalizePurpose(savedForm.purpose);
      const isAdvanceAllowed = ADVANCE_ALLOWED_PURPOSES.includes(normalizedPurpose);

      let status = "Approved";
      if (isAdvanceAllowed) {
        status = remainingAmount > 0 ? "Pending" : "Approved";
      } else {
        advance = amount; remainingAmount = 0; status = "Approved";
      }

      const paymentType = savedForm.paymentType || (remainingAmount > 0 ? "Advance Payment" : "Full Payment");

      const response = await apiRequest("/create_booking", {
        method: "POST",
        body: JSON.stringify({
          customerId: savedForm.customerId || "",
          bookingGroupId: savedForm.bookingGroupId || "",
          parentBookingId: savedForm.parentBookingId || "",
          name: savedForm.name?.trim() || "",
          phone: savedForm.phone?.trim() || "",
          email: savedForm.email?.trim() || "",
          address: savedForm.address?.trim() || "",
          purpose: savedForm.purpose || "",
          bookingDate: savedForm.bookingDate,
          amount, advance, paidAmount: advance, remainingAmount,
          paymentType, status,
          receiptType: "Tax",
          bank: selectedBank,
          is80G,
          panCard: is80G ? panCard.trim().toUpperCase() : "",
          // Cheque details — only sent when Cheque selected
          payingBankName: isChequeSelected ? payingBankName.trim() : "",
          chequeNumber:   isChequeSelected ? chequeNumber.trim() : "",
          chequeDate:     isChequeSelected ? chequeDate : "",
          reason: savedForm.reason || "",
        }),
      });

      const receiptId = response?.booking?.bookingId || response?.booking?.receiptId || response?.bookingId || "BOOKING";
      localStorage.setItem("lastBooking", JSON.stringify({ ...(response?.booking || {}), bookingId: receiptId }));
      localStorage.removeItem("bookingForm");
      router.push(`/booking-success?id=${encodeURIComponent(receiptId)}`);
    } catch (err) {
      console.error("Tax booking error:", err);
      alert(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-dashboard">
      <Sidebar />

      <div className="db-main ir-internal-page">
        <Header title="Income Tax Receipt / आयकर पावती" />

        {/* STEP INDICATOR */}
        <div className="tr-step-bar">
          <div className="tr-step tr-step-done">
            <div className="tr-step-num">✓</div>
            <span>Receipt Type</span>
          </div>
          <div className="tr-step-line" />
          <div className="tr-step tr-step-active">
            <div className="tr-step-num">2</div>
            <span>Booking Details</span>
          </div>
        </div>

        {/* RECEIPT BADGE */}
        <div className="tr-receipt-badge">
          🧾 Income Tax Receipt / आयकर पावती (Online)
        </div>

        {/* PAYMENT DETAILS CARD */}
        <div className="tr-card">
          <div className="tr-card-header">
            <div className="tr-card-icon">💳</div>
            <div>
              <p className="tr-card-title">Payment Details / पेमेंट तपशील</p>
              <p className="tr-card-subtitle">Select payment method and tax exemption</p>
            </div>
          </div>
          <div className="tr-card-body">

            {/* 80G TOGGLE */}
            <label className="tr-toggle-row">
              <div className="tr-toggle-info">
                <span className="tr-toggle-title">80G Tax Exemption Applicable</span>
                <span className="tr-toggle-desc">Enable for income tax deduction certificate</span>
              </div>
              <div className="tr-toggle">
                <input
                  type="checkbox"
                  checked={is80G}
                  onChange={() => {
                    const next = !is80G;
                    setIs80G(next);
                    if (!next && selectedBank === "SBI Bank") setSelectedBank("");
                    if (!next) setPanCard("");
                  }}
                />
                <span className="tr-toggle-slider" />
              </div>
            </label>

            {/* PAYMENT METHOD PILLS — no Cash, Cheque added */}
            <div className="tr-field">
              <label className="tr-bank-label">Payment Method / पेमेंट पद्धत</label>
              <div className="tr-bank-options">
                {visibleBanks.map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    className={`tr-bank-pill${bank.isCheque ? " tr-cheque-pill" : ""}${selectedBank === bank.id ? " tr-bank-active" : ""}`}
                    onClick={() => {
                      setSelectedBank(bank.id);
                      // Clear cheque fields if switching away from cheque
                      if (!bank.isCheque) {
                        setPayingBankName("");
                        setChequeNumber("");
                        setChequeDate("");
                      }
                    }}
                  >
                    <span className="tr-bank-icon">{bank.icon}</span>
                    {bank.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CHEQUE FIELDS — only when Cheque selected */}
            {isChequeSelected && (
              <div className="tr-cheque-box">
                <p className="tr-cheque-title">📝 Cheque Details / चेक तपशील</p>

                <div className="tr-cheque-field">
                  <label className="tr-bank-label">Paying Bank Name / बँकेचे नाव *</label>
                  <input
                    className="tr-cheque-input"
                    placeholder="e.g. State Bank of India"
                    value={payingBankName}
                    onChange={(e) => setPayingBankName(e.target.value)}
                  />
                </div>

                <div className="tr-cheque-field">
                  <label className="tr-bank-label">Cheque Number / चेक नंबर *</label>
                  <input
                    className="tr-cheque-input"
                    placeholder="e.g. 123456"
                    value={chequeNumber}
                    onChange={(e) =>
                      setChequeNumber(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    maxLength={6}
                  />
                </div>

                <div className="tr-cheque-field">
                  <label className="tr-bank-label">Cheque Date / चेक तारीख *</label>
                  <input
                    type="date"
                    className="tr-cheque-input"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PAN CARD — only when 80G enabled */}
            {is80G && (
              <div className="tr-pan-box">
                <label className="tr-pan-label">🪪 PAN Card Number / पॅन कार्ड नंबर *</label>
                <input
                  className="tr-pan-input"
                  placeholder="e.g. ABCDE1234F"
                  value={panCard}
                  maxLength={10}
                  onChange={(e) =>
                    setPanCard(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                />
              </div>
            )}

          </div>
        </div>

        {/* DEVOTEE DETAILS CARD */}
        <div className="tr-card">
          <div className="tr-card-header">
            <div className="tr-card-icon">👤</div>
            <div>
              <p className="tr-card-title">Devotee Details / भक्त तपशील</p>
              <p className="tr-card-subtitle">Enter the devotee's personal information</p>
            </div>
          </div>
          <div className="tr-card-body">
            <DevoteeForm />
          </div>
        </div>

        {/* PURPOSE CARD */}
        <div className="tr-card">
          <div className="tr-card-header">
            <div className="tr-card-icon">📋</div>
            <div>
              <p className="tr-card-title">Purpose & Date / उद्देश आणि तारीख</p>
              <p className="tr-card-subtitle">Select purpose, payment type and booking date</p>
            </div>
          </div>
          <div className="tr-card-body">
            <PurposeDropdown />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="tr-actions">
          <button className="secondary-btn" onClick={() => router.push("/new-booking")} disabled={loading}>
            ← Back / मागे
          </button>
          <button className="primary-btn" onClick={handleCreateBooking} disabled={loading}>
            {loading ? "Creating..." : "Create Booking / बुकिंग करा ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}