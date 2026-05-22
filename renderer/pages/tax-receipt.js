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

  /* ======================================================
     NORMALIZE PURPOSE
  ====================================================== */
  const normalizePurpose = (purpose = "") => {
    return String(purpose).split("/")[0].trim().toLowerCase();
  };

  /* ======================================================
     VALIDATION FUNCTIONS
  ====================================================== */
  const validateName = (name) => {
    const regex = /^[A-Za-z\s]+$/;
    return regex.test(name.trim());
  };

  const validatePhone = (phone) => {
    const cleaned = phone.trim();
    const validFormat = /^[6-9]\d{9}$/.test(cleaned);
    const allSameDigits = /^(\d)\1{9}$/.test(cleaned);
    return validFormat && !allSameDigits;
  };

  const validateEmail = (email) => {
    if (!email?.trim()) return true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim().toLowerCase());
  };

  /* ======================================================
     CREATE TAX BOOKING
  ====================================================== */
  const handleCreateBooking = async () => {
    try {
      setLoading(true);

      const savedForm = JSON.parse(
        localStorage.getItem("bookingForm") || "{}"
      );

      /* BASIC VALIDATION */
      if (!savedForm.name?.trim()) {
        alert("Please enter devotee name");
        return;
      }

      if (!validateName(savedForm.name)) {
        alert("Name should contain only letters and spaces.");
        return;
      }

      if (!savedForm.phone?.trim()) {
        alert("Please enter phone number");
        return;
      }

      if (!validatePhone(savedForm.phone)) {
        alert(
          "Enter a valid 10-digit mobile number. Repeated numbers like 1111111111 are not allowed."
        );
        return;
      }

      if (savedForm.email?.trim() && !validateEmail(savedForm.email)) {
        alert("Please enter a valid email address.");
        return;
      }

      if (!savedForm.purpose?.trim()) {
        alert("Please select purpose");
        return;
      }

      const bookingDate = new Date(savedForm.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
        alert("Past dates are not allowed.");
        return;
      }

      if (!selectedBank) {
        alert("Please select bank");
        return;
      }

      /* FINANCIAL VALUES */
      const amount = Number(savedForm.amount || 0);
      let advance = Number(savedForm.advance || 0);
      let remainingAmount = Number(savedForm.remainingAmount || 0);

      if (Number.isNaN(amount) || amount <= 0) {
        alert("Amount must be greater than 0");
        return;
      }

      if (Number.isNaN(advance) || advance < 0) {
        alert("Advance amount cannot be negative");
        return;
      }

      if (Number.isNaN(remainingAmount) || remainingAmount < 0) {
        alert("Remaining amount cannot be negative");
        return;
      }

      /* PURPOSE LOGIC */
      const normalizedPurpose = normalizePurpose(savedForm.purpose);
      const isAdvanceAllowed = ADVANCE_ALLOWED_PURPOSES.includes(normalizedPurpose);

      /* STATUS LOGIC */
      let status = "Approved";

      if (isAdvanceAllowed) {
        status = remainingAmount > 0 ? "Pending" : "Approved";
      } else {
        advance = amount;
        remainingAmount = 0;
        status = "Approved";
      }

      /* PAYMENT TYPE */
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
          reason: savedForm.reason || "",
        }),
      });

      console.log("CREATE TAX BOOKING RESPONSE:", response);

      /* GET GENERATED BOOKING ID */
      const receiptId =
        response?.booking?.bookingId ||
        response?.booking?.receiptId ||
        response?.bookingId ||
        response?.receiptId ||
        "BOOKING";

      /* SAVE FOR PRINT */
      localStorage.setItem("lastBooking", JSON.stringify({
        ...(response?.booking || {}),
        bookingId: receiptId,
      }));

      /* CLEAR TEMP DATA */
      localStorage.removeItem("bookingForm");

      /* REDIRECT TO SUCCESS PAGE */
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

        {/* Payment Details */}
        <div className="db-section tr-section">
          <h3>Payment Details / पेमेंट तपशील</h3>

          <label className="tr-checkbox">
            <input
              type="checkbox"
              checked={is80G}
              onChange={() => {
                const next80G = !is80G;
                setIs80G(next80G);
                if (!next80G && selectedBank === "SBI Bank") {
                  setSelectedBank("");
                }
              }}
            />
            <span className="tr-checkmark"></span>
            80G Applicable
          </label>

          <div style={{ marginTop: "10px" }}>
            <label className="tr-bank-label">Bank / बँक</label>
            <select
              className="input"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
            >
              <option value="">Select Bank</option>
              {banks.map((bank, index) => (
                <option key={index} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
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