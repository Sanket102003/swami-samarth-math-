import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DevoteeForm from "../components/DevoteeForm";
import PurposeDropdown from "../components/PurposeDropdown";
import apiRequest from "../services/api";

export default function TaxReceipt() {
  const router = useRouter();

  const [is80G, setIs80G] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [panCard, setPanCard] = useState("");
  const [cashAmount, setCashAmount] = useState(""); // new cash amount field
  const [loading, setLoading] = useState(false);

  const banks = is80G
    ? ["ICICI Bank", "CDB Bank", "SBI Bank"]
    : ["ICICI Bank", "CDB Bank"];

  /* ======================================================
     PURPOSES THAT SUPPORT ADVANCE PAYMENT
  ====================================================== */
  const ADVANCE_ALLOWED_PURPOSES = [
    "full bhandara",
    "half bhandara",
    "shiraprasad",
  ];

  const normalizePurpose = (purpose = "") =>
    String(purpose).split("/")[0].trim().toLowerCase();

  /* ======================================================
     VALIDATION
  ====================================================== */
  const validateName = (name) => /^[A-Za-z\s]+$/.test(name.trim());

  const validatePhone = (phone) => {
    const cleaned = phone.trim();
    return /^[6-9]\d{9}$/.test(cleaned) && !/^(\d)\1{9}$/.test(cleaned);
  };

  const validateEmail = (email) => {
    if (!email?.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  };

  const validatePanCard = (pan) =>
    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());

  /* ======================================================
     CREATE TAX BOOKING
  ====================================================== */
  const handleCreateBooking = async () => {
    try {
      setLoading(true);

      const savedForm = JSON.parse(
        localStorage.getItem("bookingForm") || "{}"
      );

      if (!savedForm.name?.trim()) { alert("Please enter devotee name"); return; }
      if (!validateName(savedForm.name)) { alert("Name should contain only letters and spaces."); return; }
      if (!savedForm.phone?.trim()) { alert("Please enter phone number"); return; }
      if (!validatePhone(savedForm.phone)) { alert("Enter a valid 10-digit mobile number."); return; }
      if (savedForm.email?.trim() && !validateEmail(savedForm.email)) { alert("Please enter a valid email address."); return; }
      if (!savedForm.purpose?.trim()) { alert("Please select purpose"); return; }

      const bookingDate = new Date(savedForm.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) { alert("Past dates are not allowed."); return; }

      if (!selectedBank) { alert("Please select bank"); return; }

      if (is80G) {
        if (!panCard.trim()) { alert("Please enter PAN card number for 80G"); return; }
        if (!validatePanCard(panCard)) { alert("Please enter a valid PAN card number (e.g. ABCDE1234F)"); return; }
      }

      /* FINANCIAL VALUES */
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
        advance = amount;
        remainingAmount = 0;
        status = "Approved";
      }

      const paymentType =
        savedForm.paymentType ||
        (remainingAmount > 0 ? "Advance Payment" : "Full Payment");

      /* API CALL */
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
          amount,
          advance,
          paidAmount: advance,
          remainingAmount,
          paymentType,
          status,
          receiptType: "Tax",
          bank: selectedBank,
          is80G,
          panCard: is80G ? panCard.trim().toUpperCase() : "",
          cashAmount: cashAmount ? Number(cashAmount) : 0, // send cash amount
          reason: savedForm.reason || "",
        }),
      });

      console.log("CREATE TAX BOOKING RESPONSE:", response);

      const receiptId =
        response?.booking?.bookingId ||
        response?.booking?.receiptId ||
        response?.bookingId ||
        response?.receiptId ||
        "BOOKING";

      localStorage.setItem("lastBooking", JSON.stringify({
        ...(response?.booking || {}),
        bookingId: receiptId,
      }));

      localStorage.removeItem("bookingForm");
      router.push(`/booking-success?id=${encodeURIComponent(receiptId)}`);
    } catch (err) {
      console.error("Tax booking error:", err);
      alert(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="db-dashboard">
      <Sidebar />

      <div className="db-main">
        <Header title="Income Tax Receipt / आयकर पावती" />

        <p className="tr-step-text">Step 2 of 2</p>

        <div className="db-section tr-section">
          <h3>Payment Details / पेमेंट तपशील</h3>

          {/* 80G Checkbox */}
          <label className="tr-checkbox">
            <input
              type="checkbox"
              checked={is80G}
              onChange={() => {
                const next80G = !is80G;
                setIs80G(next80G);
                if (!next80G && selectedBank === "SBI Bank") setSelectedBank("");
                if (!next80G) setPanCard("");
              }}
            />
            <span className="tr-checkmark"></span>
            80G Applicable
          </label>

          {/* Bank Dropdown */}
          <div style={{ marginTop: "10px" }}>
            <label className="tr-bank-label">Bank / बँक</label>
            <select
              className="input"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
            >
              <option value="">Select Bank</option>
              {banks.map((bank, index) => (
                <option key={index} value={bank}>{bank}</option>
              ))}
            </select>
          </div>

          {/* Cash Amount — not required, for offline cash bookings */}
          <div style={{ marginTop: "10px" }}>
            <label className="tr-bank-label">
              Cash Amount / रोख रक्कम
            </label>
            <input
              type="number"
              className="input"
              placeholder="Enter cash amount (optional) / रोख रक्कम टाका"
              min="1"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>

          {/* PAN Card — only when 80G is checked */}
          {is80G && (
            <div style={{ marginTop: "10px" }}>
              <label className="tr-bank-label">
                PAN Card Number / पॅन कार्ड नंबर *
              </label>
              <input
                className="input"
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

        {/* Devotee Form */}
        <DevoteeForm />

        {/* Purpose Details */}
        <PurposeDropdown />

        {/* Action Buttons */}
        <div className="tr-actions">
          <button
            className="secondary-btn"
            onClick={() => router.push("/new-booking")}
            disabled={loading}
          >
            ← Back / मागे
          </button>

          <button
            className="primary-btn"
            onClick={handleCreateBooking}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Booking / बुकिंग करा ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}