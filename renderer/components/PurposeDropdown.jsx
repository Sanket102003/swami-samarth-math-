import { useState, useEffect, useCallback } from "react";
import { purposes } from "../constants/purposes";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiRequest from "../services/api";

export default function PurposeDropdown() {
  const [purpose, setPurpose] = useState("");
  const [baseAmount, setBaseAmount] = useState(0);
  const [amount, setAmount] = useState("");
  const [bookingDate, setBookingDate] = useState(null);
  const [advance, setAdvance] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [payNowAmount, setPayNowAmount] = useState("");
  const [allBookings, setAllBookings] = useState([]);
  const [settings, setSettings] = useState({});
  const [bookingsLoading, setBookingsLoading] = useState(true);

  /* ==========================================
     PURPOSE GROUPS
  ========================================== */
  const customAmountPurposes = [
    "Donation / देणगी",
    "Utsav Donation / उत्सव देणगी",
    "Abhishek / अभिषेक",
  ];

  const specialPurposes = [
    "Full Bhandara / पूर्ण भंडारा (₹25,000)",
    "Half Bhandara / अर्ध भंडारा (₹15,000)",
    "Shirapasad / शिराप्रसाद (₹5,001)",
  ];

  const fixedPurposes = [
    "Vidaprasad / विडाप्रसाद (₹251)",
    "Two Wheeler / दुचाकी (₹251)",
    "Three Wheeler / तीनचाकी (₹351)",
    "Four Wheeler / चारचाकी (₹551)",
  ];

  const isCustom = customAmountPurposes.includes(purpose);
  const isSpecial = specialPurposes.includes(purpose);
  const isFixed = fixedPurposes.includes(purpose);
  const normalizedPurpose = purpose.toLowerCase();

  /* ==========================================
     HELPERS
  ========================================== */
  const getBookingForm = useCallback(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("bookingForm") || "{}");
    } catch {
      return {};
    }
  }, []);

  const saveToLocalStorage = useCallback(
    (overrides = {}) => {
      const existing = getBookingForm();
      const updated = { ...existing, ...overrides };

      const totalAmount = Number(updated.amount ?? updated.baseAmount ?? 0);
      const paidAmount = Number(updated.advance ?? 0);
      const remaining = Math.max(totalAmount - paidAmount, 0);

      updated.remainingAmount = remaining;
      updated.status = remaining === 0 ? "Approved" : "Pending";

      localStorage.setItem("bookingForm", JSON.stringify(updated));
    },
    [getBookingForm]
  );

  const toLocalDateString = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  /* ==========================================
     FETCH BOOKINGS + SETTINGS
  ========================================== */
  const fetchBookingsAndSettings = useCallback(async () => {
    try {
      const response = await apiRequest("/get_settings");
      const s = response.settings || response.data || response;
      setSettings({
        shirprasad: Number(s.shirprasad ?? 3),
        vidaprasad: Number(s.vidaprasad ?? 15),
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
      setSettings({ shirprasad: 3, vidaprasad: 15 });
    }

    try {
      setBookingsLoading(true);
      const data = await apiRequest("/Bookings");
      const list = Array.isArray(data)
        ? data
        : data.bookings || data.items || data.data || [];
      setAllBookings(list);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setAllBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  /* ==========================================
     INIT — Restore saved form + fetch data
  ========================================== */
  useEffect(() => {
    const init = async () => {
      const saved = getBookingForm();

      if (saved._id || saved.id || saved.bookingId) setIsEditMode(true);

      if (saved.purpose) {
        setPurpose(saved.purpose);
        const selected = purposes.find((p) => p.name === saved.purpose);
        setBaseAmount(
          Number(saved.baseAmount ?? selected?.amount ?? saved.amount ?? 0)
        );
      }

      if (saved.amount !== undefined) setAmount(saved.amount);
      if (saved.bookingDate) setBookingDate(new Date(saved.bookingDate));
      if (saved.advance !== undefined) setAdvance(Number(saved.advance ?? 0));
      if (saved.paymentType) setPaymentType(saved.paymentType);

      if (saved.advance !== undefined && saved.originalAdvance === undefined) {
        saveToLocalStorage({ originalAdvance: Number(saved.advance ?? 0) });
      }

      setPayNowAmount("");
      await fetchBookingsAndSettings();
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================
     DERIVED VALUES
  ========================================== */
  const savedData = getBookingForm();
  const originalAdvance = Number(savedData.originalAdvance ?? savedData.advance ?? 0);
  const previousPaidAmount = isEditMode ? originalAdvance : 0;
  const remainingAmount = Math.max(baseAmount - Number(savedData.advance ?? 0), 0);
  const currentRemainingAmount = Math.max(baseAmount - previousPaidAmount, 0);
  const displayAmount = isCustom ? Number(amount ?? 0) : Number(baseAmount ?? 0);

  /* ==========================================
     ACTIVE BOOKINGS HELPER
  ========================================== */
  const getActiveBookingsForDate = useCallback(
    (dateKey) =>
      allBookings.filter((booking) => {
        const status = (booking.status || "").toLowerCase();
        if (status === "cancelled") return false;
        const bDate = (booking.bookingDate || booking.date || "")
          .split("T")[0]
          .trim();
        return bDate === dateKey;
      }),
    [allBookings]
  );

  /* ==========================================
     DATE SELECTION LOGIC
  ========================================== */
  const isDateSelectable = useCallback(
    (date) => {
      if (!date || !purpose) return false;

      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      const dayOfWeek = selected.getDay();

      if (
        normalizedPurpose.includes("full bhandara") ||
        normalizedPurpose.includes("half bhandara")
      ) {
        if (dayOfWeek !== 0 && dayOfWeek !== 4) return false;
      }

      if (
        normalizedPurpose.includes("shirapasad") ||
        normalizedPurpose.includes("vidaprasad")
      ) {
        if (dayOfWeek !== 4) return false;
      }

      const dateKey = toLocalDateString(selected);
      const activeOnDate = getActiveBookingsForDate(dateKey);

      if (
        normalizedPurpose.includes("full bhandara") ||
        normalizedPurpose.includes("half bhandara")
      ) {
        const activeFullCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("full bhandara")
        ).length;

        const activeHalfCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("half bhandara")
        ).length;

        if (normalizedPurpose.includes("full bhandara")) {
          if (activeFullCount >= 1) return false;
          if (activeHalfCount >= 1) return false;
        }

        if (normalizedPurpose.includes("half bhandara")) {
          if (activeFullCount >= 1) return false;
          if (activeHalfCount >= 2) return false;
        }

        return true;
      }

      if (
        normalizedPurpose.includes("shirapasad") ||
        normalizedPurpose.includes("vidaprasad")
      ) {
        const maxLimit = normalizedPurpose.includes("shirapasad")
          ? Number(settings.shirprasad ?? 3)
          : Number(settings.vidaprasad ?? 15);

        const count = activeOnDate.filter((b) => b.purpose === purpose).length;
        return count < maxLimit;
      }

      return true;
    },
    [purpose, normalizedPurpose, getActiveBookingsForDate, settings]
  );

  /* ==========================================
     DATE CHANGE HANDLER
  ========================================== */
  const handleDatePickerChange = (date) => {
    if (!date) {
      setBookingDate(null);
      saveToLocalStorage({ bookingDate: "" });
      return;
    }
    if (!isDateSelectable(date)) return;
    setBookingDate(date);
    saveToLocalStorage({ bookingDate: toLocalDateString(date) });
  };

  /* ==========================================
     PURPOSE CHANGE HANDLER
  ========================================== */
  const handlePurposeChange = (e) => {
    const selectedPurpose = e.target.value;
    const selected = purposes.find((p) => p.name === selectedPurpose);
    const fixedAmount = Number(selected?.amount ?? 0);

    setPurpose(selectedPurpose);
    setBaseAmount(fixedAmount);
    setAmount("");
    setBookingDate(null);
    setAdvance(0);
    setPaymentType("");
    setPayNowAmount("");

    saveToLocalStorage({
      purpose: selectedPurpose,
      baseAmount: fixedAmount,
      amount: fixedAmount,
      advance: 0,
      originalAdvance: 0,
      remainingAmount: fixedAmount,
      bookingDate: "",
      paymentType: "",
      status: "Pending",
    });
  };

  /* ==========================================
     AMOUNT CHANGE (Custom purposes only)
  ========================================== */
  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    const enteredAmount = Number(value ?? 0);
    saveToLocalStorage({
      amount: enteredAmount,
      advance: enteredAmount,
      bookingDate: bookingDate ? toLocalDateString(bookingDate) : "",
    });
  };

  /* ==========================================
     PAYMENT TYPE HANDLER (Special purposes)
  ========================================== */
  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    setPayNowAmount("");

    if (type === "full") {
      setAdvance(baseAmount);
      saveToLocalStorage({
        paymentType: "full",
        amount: baseAmount,
        advance: baseAmount,
        remainingAmount: 0,
        status: "Approved",
      });
    }

    if (type === "advance") {
      let advanceAmount = 0;

      if (normalizedPurpose.includes("full bhandara")) {
        advanceAmount = 10000;
      } else if (normalizedPurpose.includes("half bhandara")) {
        advanceAmount = 5000;
      } else {
        advanceAmount = baseAmount;
      }

      setAdvance(advanceAmount);
      saveToLocalStorage({
        paymentType: "advance",
        amount: baseAmount,
        advance: advanceAmount,
        originalAdvance: advanceAmount,
        remainingAmount: Math.max(baseAmount - advanceAmount, 0),
      });
    }
  };

  /* ==========================================
     PAY NOW HANDLER (Edit mode)
  ========================================== */
  const handlePayNowChange = (e) => {
    const value = e.target.value;

    if (value === "") {
      setPayNowAmount("");
      setAdvance(previousPaidAmount);
      saveToLocalStorage({
        paymentType: "advance",
        amount: baseAmount,
        advance: previousPaidAmount,
        remainingAmount: Math.max(baseAmount - previousPaidAmount, 0),
      });
      return;
    }

    let payNow = Number(value ?? 0);
    const maxAllowed = Math.max(baseAmount - previousPaidAmount, 0);
    if (payNow > maxAllowed) payNow = maxAllowed;

    setPayNowAmount(String(payNow));

    const totalPaid = previousPaidAmount + payNow;
    const newRemaining = Math.max(baseAmount - totalPaid, 0);

    setAdvance(totalPaid);
    saveToLocalStorage({
      paymentType: "advance",
      amount: baseAmount,
      advance: totalPaid,
      remainingAmount: newRemaining,
    });
  };

  const datePickerProps = {
    selected: bookingDate,
    onChange: handleDatePickerChange,
    filterDate: isDateSelectable,
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: bookingsLoading
      ? "Loading available dates..."
      : "Select booking date (dd-mm-yyyy)",
    className: "input",
    required: true,
    isClearable: true,
    disabled: bookingsLoading,
    calendarClassName: "custom-datepicker",
  };

  /* ==========================================
     UI
  ========================================== */
  return (
    <div className="db-section">
      <h3>Purpose / उद्देश</h3>

      {/* Purpose Dropdown */}
      <select
        className="input"
        value={purpose}
        onChange={handlePurposeChange}
        disabled={isEditMode}
        style={{
          backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
          cursor: isEditMode ? "not-allowed" : "pointer",
          opacity: isEditMode ? 0.8 : 1,
        }}
      >
        <option value="">Choose Purpose</option>
        {purposes.map((item, index) => (
          <option key={index} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>

      {/* Amount Display */}
      {purpose && (
        <div className="amount-box">
          Amount / रक्कम: ₹{displayAmount}
        </div>
      )}

      {/* CUSTOM PURPOSES — enter any amount */}
      {isCustom && (
        <>
          <input
            type="number"
            className="input"
            placeholder="Enter Amount / रक्कम टाका"
            min="1"
            value={amount}
            onChange={handleAmountChange}
          />
          <DatePicker {...datePickerProps} />
        </>
      )}

      {/* SPECIAL PURPOSES — choose payment type first */}
      {isSpecial && !paymentType && (
        <div className="pd-payment-options">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => handlePaymentTypeChange("full")}
          >
            Full Payment
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => handlePaymentTypeChange("advance")}
          >
            Advance Payment
          </button>
        </div>
      )}

      {/* SPECIAL PURPOSES — Full Payment selected */}
      {isSpecial && paymentType === "full" && (
        <DatePicker {...datePickerProps} />
      )}

      {/* SPECIAL PURPOSES — Advance Payment selected */}
      {isSpecial && paymentType === "advance" && (
        <>
          {isEditMode && (
            <div className="amount-box">
              Paid Amount / भरलेली रक्कम: ₹{previousPaidAmount}
            </div>
          )}

          <input
            type="number"
            className="input"
            placeholder="Enter Amount to Pay Now / आता भरणारी रक्कम"
            min="1"
            max={currentRemainingAmount}
            value={payNowAmount}
            onChange={handlePayNowChange}
          />

          <div className="amount-box">
            Remaining Amount / उर्वरित रक्कम: ₹{remainingAmount}
          </div>

          <DatePicker {...datePickerProps} />
        </>
      )}

      {/* FIXED PURPOSES — just pick a date */}
      {isFixed && <DatePicker {...datePickerProps} />}
    </div>
  );
}