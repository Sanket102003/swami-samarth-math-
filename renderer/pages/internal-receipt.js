import { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DevoteeForm from "../components/DevoteeForm";
import PurposeDropdown from "../components/PurposeDropdown";
import apiRequest from "../services/api";

export default function InternalReceipt() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  // Name: only letters and spaces
  const validateName = (name) => {
    const regex = /^[A-Za-z\s]+$/;
    return regex.test(name.trim());
  };

  // Phone: exactly 10 digits, starts with 6-9, no repeated digits
  const validatePhone = (phone) => {
    const cleaned = phone.trim();
    const validFormat = /^[6-9]\d{9}$/.test(cleaned);
    const allSameDigits = /^(\d)\1{9}$/.test(cleaned);
    return validFormat && !allSameDigits;
  };

  // Email validation (optional field)
  const validateEmail = (email) => {
    if (!email?.trim()) return true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim().toLowerCase());
  };

  /* ======================================================
     CREATE BOOKING
  ====================================================== */
  const handleCreateBooking = async () => {
    try {
      setLoading(true);

      /* LOAD SAVED FORM */
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

      /* CREATE BOOKING API */
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
          receiptType: "Internal",
          reason: savedForm.reason || "",
        }),
      });

      console.log("CREATE BOOKING RESPONSE:", response);

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

      /* CLEAR TEMP STORAGE */
      localStorage.removeItem("bookingForm");

      /* REDIRECT TO SUCCESS PAGE */
      router.push(`/booking-success?id=${encodeURIComponent(receiptId)}`);
    } catch (err) {
      console.error("Create booking error:", err);
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

      <div className="db-main ir-internal-page">
        <Header title="Internal Receipt / अंतर्गत पावती" />

        <p className="ir-step-text">Step 2 of 2</p>

        {/* Devotee Details */}
        <div className="db-section ir-internal-section">
          <DevoteeForm />
        </div>

        {/* Purpose Details */}
        <div className="db-section ir-internal-section">
          <PurposeDropdown />
        </div>

        {/* Action Buttons */}
        <div className="ir-internal-actions">
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