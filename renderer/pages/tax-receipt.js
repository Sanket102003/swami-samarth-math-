import { useState, useEffect, useRef } from "react";
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
  const [errorMsg, setErrorMsg] = useState("");

  // Online payment (ICICI / SBI / BCCB via Cashfree)
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState("");
  const cfReadyRef = useRef(false);

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

  // Load Cashfree JS SDK once
  useEffect(() => {
    if (document.getElementById("cashfree-sdk")) { cfReadyRef.current = true; return; }
    const s = document.createElement("script");
    s.id = "cashfree-sdk";
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => { cfReadyRef.current = true; };
    document.head.appendChild(s);
  }, []);

  // Launch Cashfree modal when payment session is ready
  useEffect(() => {
    if (!showPayment || !paymentSessionId || !pendingBookingId) return;

    const launch = () => {
      if (typeof window.Cashfree === "undefined") { setTimeout(launch, 150); return; }
      const cashfree = window.Cashfree({ mode: "sandbox" }); // change to "production" for live
      cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" })
        .then((result) => {
          if (result?.error) {
            setErrorMsg(result.error.message || "Payment failed or cancelled.");
            setShowPayment(false);
          } else if (result?.paymentDetails) {
            localStorage.setItem("lastBooking", JSON.stringify({ bookingId: pendingBookingId }));
            localStorage.removeItem("bookingForm");
            router.push(`/booking-success?id=${encodeURIComponent(pendingBookingId)}`);
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || "Payment error");
          setShowPayment(false);
        });
    };
    launch();
  }, [showPayment, paymentSessionId, pendingBookingId]);

  const showErr = (msg) => { setErrorMsg(msg); };

  const handleCreateBooking = async () => {
    setErrorMsg("");
    const savedForm = JSON.parse(localStorage.getItem("bookingForm") || "{}");

    // 1. Payment method
    if (!selectedBank) { showErr("Please select a payment method"); return; }
    if (isChequeSelected) {
      if (!payingBankName.trim()) { showErr("Please enter paying bank name"); return; }
      if (!chequeNumber.trim())   { showErr("Please enter cheque number"); return; }
      if (!chequeDate)            { showErr("Please enter cheque date"); return; }
    }
    if (is80G) {
      if (!panCard.trim())       { showErr("Please enter PAN card number for 80G"); return; }
      if (!validatePan(panCard)) { showErr("Please enter a valid PAN card (e.g. ABCDE1234F)"); return; }
    }

    // 2. Name & phone
    if (!savedForm.name?.trim())         { showErr("Please enter devotee name"); return; }
    if (!validateName(savedForm.name))   { showErr("Name should contain only letters and spaces."); return; }
    if (!savedForm.phone?.trim())        { showErr("Please enter phone number"); return; }
    if (!validatePhone(savedForm.phone)) { showErr("Enter a valid 10-digit mobile number."); return; }
    if (savedForm.email?.trim() && !validateEmail(savedForm.email)) { showErr("Please enter a valid email address."); return; }

    // 3. Event type
    if (!savedForm.eventType) { showErr("Please select event type (Special or Regular)"); return; }

    // 4. Purpose / event
    if (!savedForm.purpose?.trim()) { showErr("Please select purpose / event"); return; }

    // 5. Amount — only required when flexible
    if (savedForm.amountType === "flexible") {
      if (!Number(savedForm.amount) || Number(savedForm.amount) <= 0) { showErr("Please enter amount"); return; }
    }

    // 6. Date
    const noCalendarPurposes = [
      "Two Wheeler / दुचाकी (₹251)",
      "Three Wheeler / तीनचाकी (₹351)",
      "Four Wheeler / चारचाकी (₹551)",
      "गाडीपुजा (टे पो, बस इयादी.)",
    ];
    const isMultiDate = Array.isArray(savedForm.multiDates) && savedForm.multiDates.length > 0;
    if (isMultiDate) {
      if (!savedForm.pricePerDate || Number(savedForm.pricePerDate) <= 0) { showErr("Please enter price per date"); return; }
    } else if (!noCalendarPurposes.includes(savedForm.purpose)) {
      if (!savedForm.bookingDate) { showErr("Please select booking date"); return; }
      const bd = new Date(savedForm.bookingDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (bd < today) { showErr("Past dates are not allowed."); return; }
    }

    const amount = Number(savedForm.amount || 0);
    let advance = Number(savedForm.advance || 0);
    let remainingAmount = Number(savedForm.remainingAmount || 0);

    const normalizedPurpose = normalizePurpose(savedForm.purpose);
    const isAdvanceAllowed = ADVANCE_ALLOWED_PURPOSES.includes(normalizedPurpose);

    let status = "Approved";
    if (isAdvanceAllowed) {
      status = remainingAmount > 0 ? "Pending" : "Approved";
    } else {
      advance = amount; remainingAmount = 0; status = "Approved";
    }

    const paymentType = savedForm.paymentType || (remainingAmount > 0 ? "Advance Payment" : "Full Payment");

    const bookingPayload = {
      customerId: savedForm.customerId || "",
      bookingGroupId: savedForm.bookingGroupId || "",
      parentBookingId: savedForm.parentBookingId || "",
      name: savedForm.name?.trim() || "",
      phone: savedForm.phone?.trim() || "",
      email: savedForm.email?.trim() || "",
      address: savedForm.address?.trim() || "",
      purpose: savedForm.purpose || "",
      bookingDate: savedForm.bookingDate,
      multiDates: savedForm.multiDates || [],
      pricePerDate: savedForm.pricePerDate || "",
      gotra: savedForm.gotra || "",
      amount, advance, paidAmount: advance, remainingAmount,
      paymentType,
      receiptType: "Tax",
      bank: selectedBank,
      is80G,
      panCard: is80G ? panCard.trim().toUpperCase() : "",
      payingBankName: isChequeSelected ? payingBankName.trim() : "",
      chequeNumber:   isChequeSelected ? chequeNumber.trim() : "",
      chequeDate:     isChequeSelected ? chequeDate : "",
      reason: savedForm.reason || "",
    };

    const isOnlineBank = selectedBank === "ICICI Bank" || selectedBank === "SBI Bank" || selectedBank === "BCCB Bank";

    try {
      setLoading(true);

      if (isOnlineBank) {
        // Step 1: Save to dedicated pending DB (separate from booking DB)
        const pendingRes = await apiRequest("/create_pending_booking", {
          method: "POST",
          body: JSON.stringify(bookingPayload),
        });
        const orderId = pendingRes?.orderId || "";
        if (!orderId) { showErr("Failed to create pending booking. Please try again."); return; }

        // Step 2: Create Cashfree payment order using orderId as reference
        const orderRes = await apiRequest("/create_payment_order", {
          method: "POST",
          body: JSON.stringify({
            bank: selectedBank,
            amount,
            orderId,
            customerName: savedForm.name?.trim(),
            customerPhone: savedForm.phone?.trim(),
            customerEmail: savedForm.email?.trim() || "devotee@ssmvd.org",
          }),
        });

        if (!orderRes?.payment_session_id) {
          showErr("Could not initiate payment. Please try again.");
          return;
        }

        // Step 3: Show Cashfree QR modal (triggered by useEffect)
        setPendingBookingId(orderId);
        setPaymentSessionId(orderRes.payment_session_id);
        setShowPayment(true);
      } else {
        // Cash / Cheque — direct booking
        const response = await apiRequest("/create_booking", {
          method: "POST",
          body: JSON.stringify({ ...bookingPayload, status }),
        });
        const receiptId = response?.booking?.bookingId || response?.booking?.receiptId || response?.bookingId || "BOOKING";
        localStorage.setItem("lastBooking", JSON.stringify({ ...(response?.booking || {}), bookingId: receiptId }));
        localStorage.removeItem("bookingForm");
        router.push(`/booking-success?id=${encodeURIComponent(receiptId)}`);
      }
    } catch (err) {
      console.error("Tax booking error:", err);
      showErr(err.message || "Failed to create booking");
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

        {errorMsg && (
          <div style={{
            background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px",
            color: "#dc2626", padding: "6px 10px", marginBottom: "8px",
            fontSize: "13px", display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span>⚠️</span>
            <span style={{ flex: 1 }}>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "14px", lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* PAYMENT IN PROGRESS — shown while Cashfree QR modal is open */}
        {showPayment && (
          <div style={{
            background: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: "8px",
            padding: "14px 16px", marginBottom: "10px", textAlign: "center",
          }}>
            <p style={{ fontWeight: 600, color: "#0369a1", marginBottom: "4px", fontSize: "14px" }}>
              💳 Payment window is open — complete the UPI payment in the popup.
            </p>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
              Booking ID: <strong>{pendingBookingId}</strong>
            </p>
            <button
              style={{
                fontSize: "12px", padding: "4px 14px", cursor: "pointer",
                border: "1px solid #94a3b8", borderRadius: "4px", background: "#fff",
              }}
              onClick={() => { setShowPayment(false); setPaymentSessionId(""); }}
            >
              Cancel Payment
            </button>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="tr-actions">
          <button className="secondary-btn" onClick={() => router.push("/new-booking")} disabled={loading || showPayment}>
            ← Back / मागे
          </button>
          <button className="primary-btn" onClick={handleCreateBooking} disabled={loading || showPayment}>
            {loading ? "Processing..." : "Create Booking / बुकिंग करा ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}