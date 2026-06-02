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

  const ADVANCE_ALLOWED_PURPOSES = ["full bhandara", "half bhandara", "shiraprasad"];

  const normalizePurpose = (purpose = "") =>
    String(purpose).split("/")[0].trim().toLowerCase();

  const validateName = (name) => /^[A-Za-z\s]+$/.test(name.trim());
  const validatePhone = (phone) => {
    const c = phone.trim();
    return /^[6-9]\d{9}$/.test(c) && !/^(\d)\1{9}$/.test(c);
  };
  const validateEmail = (email) => {
    if (!email?.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  };

  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      const savedForm = JSON.parse(localStorage.getItem("bookingForm") || "{}");

      if (!savedForm.name?.trim()) { alert("Please enter devotee name"); return; }
      if (!validateName(savedForm.name)) { alert("Name should contain only letters and spaces."); return; }
      if (!savedForm.phone?.trim()) { alert("Please enter phone number"); return; }
      if (!validatePhone(savedForm.phone)) { alert("Enter a valid 10-digit mobile number."); return; }
      if (savedForm.email?.trim() && !validateEmail(savedForm.email)) { alert("Please enter a valid email address."); return; }
      if (!savedForm.purpose?.trim()) { alert("Please select purpose"); return; }

      const noCalendarPurposes = [
        "Two Wheeler / दुचाकी (₹251)",
        "Three Wheeler / तीनचाकी (₹351)",
        "Four Wheeler / चारचाकी (₹551)",
        "गाडीपुजा (टे पो, बस इयादी.)",
      ];

      if (savedForm.purpose === "Abhishek / अभिषेक") {
        if (!savedForm.abhishekType?.trim()) { alert("Please select Abhishek type"); return; }
        if (!savedForm.abhishekGotra?.trim()) { alert("Please select or enter Gotra"); return; }
        if (!savedForm.pricePerDate || Number(savedForm.pricePerDate) <= 0) { alert("Please enter price per date"); return; }
        if (!savedForm.abhishekDates || savedForm.abhishekDates.length === 0) {
          alert("Please select at least one date for Abhishek");
          return;
        }
      } else if (!noCalendarPurposes.includes(savedForm.purpose) &&
                 savedForm.purpose !== "Abhishek / अभिषेक" &&
                 !savedForm.bookingDate) {
        alert("Please select booking date");
        return;
      }

      const bookingDate = new Date(savedForm.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) { alert("Past dates are not allowed."); return; }

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
          receiptType: "Internal",
          reason: savedForm.reason || "",
        }),
      });

      const receiptId = response?.booking?.bookingId || response?.booking?.receiptId || response?.bookingId || "BOOKING";
      localStorage.setItem("lastBooking", JSON.stringify({ ...(response?.booking || {}), bookingId: receiptId }));
      localStorage.removeItem("bookingForm");
      router.push(`/booking-success?id=${encodeURIComponent(receiptId)}`);
    } catch (err) {
      console.error("Create booking error:", err);
      alert(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-dashboard">
      <Sidebar />

      <div className="db-main ir-internal-page">
        <Header title="Internal Receipt / अंतर्गत पावती" />

        {/* STEP INDICATOR */}
        <div className="ir-step-bar">
          <div className="ir-step ir-step-done">
            <div className="ir-step-num">✓</div>
            <span>Receipt Type</span>
          </div>
          <div className="ir-step-line" />
          <div className="ir-step ir-step-active">
            <div className="ir-step-num">2</div>
            <span>Booking Details</span>
          </div>
        </div>

        {/* RECEIPT BADGE */}
        <div className="ir-receipt-badge">
          🧾 Internal Receipt / अंतर्गत पावती (Cash)
        </div>

        {/* DEVOTEE DETAILS CARD */}
        <div className="ir-card">
          <div className="ir-card-header">
            <div className="ir-card-icon">👤</div>
            <div>
              <p className="ir-card-title">Devotee Details / भक्त तपशील</p>
              <p className="ir-card-subtitle">Enter the devotee's personal information</p>
            </div>
          </div>
          <div className="ir-card-body">
            <DevoteeForm />
          </div>
        </div>

        {/* PURPOSE & BOOKING DETAILS CARD */}
        <div className="ir-card">
          <div className="ir-card-header">
            <div className="ir-card-icon">📋</div>
            <div>
              <p className="ir-card-title">Purpose & Date / उद्देश आणि तारीख</p>
              <p className="ir-card-subtitle">Select purpose, payment type and booking date</p>
            </div>
          </div>
          <div className="ir-card-body">
            <PurposeDropdown />
          </div>
        </div>

        {/* ACTION BUTTONS */}
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