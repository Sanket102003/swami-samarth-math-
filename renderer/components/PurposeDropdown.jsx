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

  // Event type — special or regular
  const [eventType, setEventType] = useState("");

  // Special event states
  const [utsavList, setUtsavList] = useState([]);
  const [selectedUtsav, setSelectedUtsav] = useState("");
  const [utsavDates, setUtsavDates] = useState([]);
  const [specialPurpose, setSpecialPurpose] = useState("");

  /* ==========================================
     PURPOSE GROUPS
  ========================================== */
  const customAmountPurposes = [
    "Donation / देणगी",
    "Abhishek / अभिषेक",
  ];

  const specialBhandaraPurposes = [
    "Full Bhandara / पूर्ण भंडारा",
    "Half Bhandara / अर्ध भंडारा",
  ];

  const regularSpecialPurposes = [
    "Full Bhandara / पूर्ण भंडारा (₹25,000)",
    "Half Bhandara / अर्ध भंडारा (₹15,000)",
  ];

  const fixedPurposes = [
    "Vidaprasad / विडाप्रसाद (₹251)",
    "Two Wheeler / दुचाकी (₹251)",
    "Three Wheeler / तीनचाकी (₹351)",
    "Four Wheeler / चारचाकी (₹551)",
  ];

  const SHIRAPASAD_PURPOSE = "Shirapasad / शिराप्रसाद (₹5,001)";

  // Regular purposes — no Utsav Donation
  const regularPurposes = purposes.filter(
    (p) => p.name !== "Utsav Donation / उत्सव देणगी"
  );

  const isCustom = customAmountPurposes.includes(purpose);
  const isRegularSpecial = regularSpecialPurposes.includes(purpose);
  const isFixed = fixedPurposes.includes(purpose);
  const isShirapasad = purpose === SHIRAPASAD_PURPOSE;
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
     FETCH DATA
  ========================================== */
  const fetchData = useCallback(async () => {
    try {
      const response = await apiRequest("/get_settings");
      const s = response.settings || response.data || response;
      setSettings({
        shirprasad: Number(s.shirprasad ?? 3),
        vidaprasad: Number(s.vidaprasad ?? 15),
      });
    } catch (err) {
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
      setAllBookings([]);
    } finally {
      setBookingsLoading(false);
    }

    try {
      const response = await apiRequest("/get_utsav_list");
      const list = response.utsavList || response.data || response || [];
      setUtsavList(Array.isArray(list) ? list : []);
    } catch (err) {
      setUtsavList([]);
    }
  }, []);

  /* ==========================================
     INIT
  ========================================== */
  useEffect(() => {
    const init = async () => {
      const saved = getBookingForm();
      if (saved._id || saved.id || saved.bookingId) setIsEditMode(true);
      if (saved.purpose) {
        setPurpose(saved.purpose);
        const selected = purposes.find((p) => p.name === saved.purpose);
        setBaseAmount(Number(saved.baseAmount ?? selected?.amount ?? saved.amount ?? 0));
      }
      if (saved.amount !== undefined) setAmount(saved.amount);
      if (saved.bookingDate) setBookingDate(new Date(saved.bookingDate));
      if (saved.advance !== undefined) setAdvance(Number(saved.advance ?? 0));
      if (saved.paymentType) setPaymentType(saved.paymentType);
      if (saved.eventType) setEventType(saved.eventType);
      if (saved.selectedUtsav) setSelectedUtsav(saved.selectedUtsav);
      if (saved.specialPurpose) setSpecialPurpose(saved.specialPurpose);
      if (saved.advance !== undefined && saved.originalAdvance === undefined) {
        saveToLocalStorage({ originalAdvance: Number(saved.advance ?? 0) });
      }
      setPayNowAmount("");
      await fetchData();
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
     UTSAV DATE HELPERS
  ========================================== */
  const getUtsavMaxDate = () => {
    if (!utsavDates.length) return null;
    const sorted = [...utsavDates].sort();
    return new Date(sorted[sorted.length - 1]);
  };

  const isHighlightedDate = (date) => {
    const dateStr = toLocalDateString(date);
    return utsavDates.includes(dateStr);
  };

  /* ==========================================
     ACTIVE BOOKINGS HELPER
  ========================================== */
  const getActiveBookingsForDate = useCallback(
    (dateKey) =>
      allBookings.filter((booking) => {
        const status = (booking.status || "").toLowerCase();
        if (status === "cancelled") return false;
        const bDate = (booking.bookingDate || booking.date || "")
          .split("T")[0].trim();
        return bDate === dateKey;
      }),
    [allBookings]
  );

  /* ==========================================
     DATE SELECTION LOGIC — REGULAR
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

      if (normalizedPurpose.includes("full bhandara") ||
          normalizedPurpose.includes("half bhandara")) {
        if (dayOfWeek !== 0 && dayOfWeek !== 4) return false;
      }

      if (normalizedPurpose.includes("shirapasad") ||
          normalizedPurpose.includes("vidaprasad")) {
        if (dayOfWeek !== 4) return false;
      }

      const dateKey = toLocalDateString(selected);
      const activeOnDate = getActiveBookingsForDate(dateKey);

      if (normalizedPurpose.includes("full bhandara") ||
          normalizedPurpose.includes("half bhandara")) {
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

      if (normalizedPurpose.includes("shirapasad") ||
          normalizedPurpose.includes("vidaprasad")) {
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
     DATE SELECTION LOGIC — SPECIAL EVENTS
     Same Full/Half Bhandara restrictions apply
  ========================================== */
  const isSpecialDateSelectable = useCallback(
    (date) => {
      if (!date || !selectedUtsav || !utsavDates.length) return false;

      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      // Can't select beyond last utsav date
      const maxDate = getUtsavMaxDate();
      if (maxDate) {
        const maxDateCopy = new Date(maxDate);
        maxDateCopy.setHours(23, 59, 59, 999);
        if (selected > maxDateCopy) return false;
      }

      // Apply Full/Half Bhandara restrictions per day
      if (specialPurpose) {
        const dateKey = toLocalDateString(selected);
        const activeOnDate = getActiveBookingsForDate(dateKey);

        const activeFullCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("full bhandara")
        ).length;

        const activeHalfCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("half bhandara")
        ).length;

        if (specialPurpose.toLowerCase().includes("full bhandara")) {
          if (activeFullCount >= 1) return false; // full already booked
          if (activeHalfCount >= 1) return false; // half already booked
        }

        if (specialPurpose.toLowerCase().includes("half bhandara")) {
          if (activeFullCount >= 1) return false;  // full already booked
          if (activeHalfCount >= 2) return false;  // 2 halfs already booked
        }
      }

      return true;
    },
    [selectedUtsav, utsavDates, specialPurpose, getActiveBookingsForDate]
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
    setBookingDate(date);
    saveToLocalStorage({ bookingDate: toLocalDateString(date) });
  };

  /* ==========================================
     EVENT TYPE CHANGE
  ========================================== */
  const handleEventTypeChange = (e) => {
    const type = e.target.value;
    setEventType(type);
    setPurpose("");
    setBaseAmount(0);
    setAmount("");
    setBookingDate(null);
    setAdvance(0);
    setPaymentType("");
    setPayNowAmount("");
    setSelectedUtsav("");
    setUtsavDates([]);
    setSpecialPurpose("");

    saveToLocalStorage({
      eventType: type,
      purpose: "",
      baseAmount: 0,
      amount: 0,
      advance: 0,
      originalAdvance: 0,
      remainingAmount: 0,
      bookingDate: "",
      paymentType: "",
      selectedUtsav: "",
      specialPurpose: "",
      status: "Pending",
    });
  };

  /* ==========================================
     UTSAV SELECTION HANDLER
  ========================================== */
  const handleUtsavChange = (e) => {
    const name = e.target.value;
    setSelectedUtsav(name);
    setBookingDate(null);
    setSpecialPurpose("");
    setPaymentType("");
    setAmount("");

    const found = utsavList.find((u) => u.name === name);
    const dates = found
      ? Array.isArray(found.dates)
        ? found.dates
        : (found.dates || "").split(",").map((d) => d.trim()).filter(Boolean)
      : [];

    setUtsavDates(dates);

    saveToLocalStorage({
      selectedUtsav: name,
      bookingDate: "",
      specialPurpose: "",
      paymentType: "",
      amount: 0,
      advance: 0,
      remainingAmount: 0,
    });
  };

  /* ==========================================
     SPECIAL PURPOSE CHANGE (Full/Half Bhandara)
  ========================================== */
  const handleSpecialPurposeChange = (e) => {
    const val = e.target.value;
    setSpecialPurpose(val);
    setPaymentType("");
    setAmount("");
    setBookingDate(null);

    saveToLocalStorage({
      specialPurpose: val,
      purpose: val,
      paymentType: "",
      amount: 0,
      advance: 0,
      remainingAmount: 0,
      bookingDate: "",
    });
  };

  /* ==========================================
     PURPOSE CHANGE HANDLER — REGULAR
  ========================================== */
  const handlePurposeChange = (e) => {
    const selectedPurpose = e.target.value;
    const selected = regularPurposes.find((p) => p.name === selectedPurpose);
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
     AMOUNT CHANGE
  ========================================== */
  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    const enteredAmount = Number(value ?? 0);
    setBaseAmount(enteredAmount);
    saveToLocalStorage({
      amount: enteredAmount,
      baseAmount: enteredAmount,
      advance: paymentType === "full" ? enteredAmount : Number(savedData.advance ?? 0),
      bookingDate: bookingDate ? toLocalDateString(bookingDate) : "",
    });
  };

  /* ==========================================
     PAYMENT TYPE HANDLER
  ========================================== */
  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    setPayNowAmount("");

    const currentAmount = Number(amount || baseAmount || 0);

    if (type === "full") {
      setAdvance(currentAmount);
      saveToLocalStorage({
        paymentType: "full",
        amount: currentAmount,
        advance: currentAmount,
        remainingAmount: 0,
        status: "Approved",
      });
    }

    if (type === "advance") {
      setAdvance(0);
      saveToLocalStorage({
        paymentType: "advance",
        amount: currentAmount,
        advance: 0,
        originalAdvance: 0,
        remainingAmount: currentAmount,
      });
    }
  };

  /* ==========================================
     PAY NOW HANDLER
  ========================================== */
  const handlePayNowChange = (e) => {
    const value = e.target.value;
    const currentAmount = Number(amount || baseAmount || 0);

    if (value === "") {
      setPayNowAmount("");
      setAdvance(previousPaidAmount);
      saveToLocalStorage({
        paymentType: "advance",
        amount: currentAmount,
        advance: previousPaidAmount,
        remainingAmount: Math.max(currentAmount - previousPaidAmount, 0),
      });
      return;
    }

    let payNow = Number(value ?? 0);
    const maxAllowed = Math.max(currentAmount - previousPaidAmount, 0);
    if (payNow > maxAllowed) payNow = maxAllowed;

    setPayNowAmount(String(payNow));
    const totalPaid = previousPaidAmount + payNow;
    const newRemaining = Math.max(currentAmount - totalPaid, 0);

    setAdvance(totalPaid);
    saveToLocalStorage({
      paymentType: "advance",
      amount: currentAmount,
      advance: totalPaid,
      remainingAmount: newRemaining,
    });
  };

  /* ==========================================
     REGULAR DATE PICKER PROPS
  ========================================== */
  const regularDatePickerProps = {
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
     SPECIAL EVENT DATE PICKER PROPS
  ========================================== */
  const specialDatePickerProps = {
    selected: bookingDate,
    onChange: handleDatePickerChange,
    filterDate: isSpecialDateSelectable,
    minDate: new Date(),
    maxDate: getUtsavMaxDate(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select booking date (dd-mm-yyyy)",
    className: "input",
    required: true,
    isClearable: true,
    disabled: !selectedUtsav || !specialPurpose || !paymentType,
    calendarClassName: "custom-datepicker",
    highlightDates: utsavDates.map((d) => new Date(d)),
    dayClassName: (date) =>
      isHighlightedDate(date) ? "highlighted-puja-date" : undefined,
  };

  /* ==========================================
     UI
  ========================================== */
  return (
    <div className="db-section">
      <h3>Purpose / उद्देश</h3>

      {/* EVENT TYPE SELECTOR */}
      <select
        className="input"
        value={eventType}
        onChange={handleEventTypeChange}
        disabled={isEditMode}
        style={{
          backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
          cursor: isEditMode ? "not-allowed" : "pointer",
          opacity: isEditMode ? 0.8 : 1,
        }}
      >
        <option value="">Select Event Type / कार्यक्रम प्रकार निवडा</option>
        <option value="special">Special Events / विशेष कार्यक्रम</option>
        <option value="regular">Regular Events / नियमित कार्यक्रम</option>
      </select>

      {/* ══════════════════════════════════
          SPECIAL EVENTS FLOW
      ══════════════════════════════════ */}
      {eventType === "special" && (
        <>
          <h3 style={{ marginTop: "15px" }}>Utsav / उत्सव</h3>

          {/* Utsav Dropdown */}
          <select
            className="input"
            value={selectedUtsav}
            onChange={handleUtsavChange}
            disabled={isEditMode}
          >
            <option value="">Select Utsav / उत्सव निवडा</option>
            {utsavList.map((utsav, index) => (
              <option key={index} value={utsav.name}>
                {utsav.name}
              </option>
            ))}
          </select>

          {/* After utsav selected */}
          {selectedUtsav && (
            <>
              {/* Puja dates hint */}
              {utsavDates.length > 0 && (
                <p style={{ fontSize: "13px", color: "#f97316", margin: "6px 0" }}>
                  🗓 Puja dates: {utsavDates.join(", ")}
                </p>
              )}

              {/* Full / Half Bhandara dropdown */}
              <select
                className="input"
                value={specialPurpose}
                onChange={handleSpecialPurposeChange}
                disabled={isEditMode}
              >
                <option value="">Select Purpose / उद्देश निवडा</option>
                {specialBhandaraPurposes.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                ))}
              </select>
            </>
          )}

          {/* After bhandara selected — payment type buttons */}
          {selectedUtsav && specialPurpose && !paymentType && (
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

          {/* After payment type — amount input + date */}
          {selectedUtsav && specialPurpose && paymentType && (
            <>
              <input
                type="number"
                className="input"
                placeholder="Enter Amount / रक्कम टाका *"
                min="1"
                value={amount}
                onChange={handleAmountChange}
              />

              {/* Advance — show advance amount input + remaining */}
              {paymentType === "advance" && Number(amount) > 0 && (
                <>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter Advance Amount / आगाऊ रक्कम टाका"
                    min="1"
                    max={Number(amount)}
                    value={payNowAmount}
                    onChange={handlePayNowChange}
                  />
                  <div className="amount-box">
                    Remaining Amount / उर्वरित रक्कम: ₹
                    {Math.max(
                      Number(amount) - Number(payNowAmount || 0),
                      0
                    ).toLocaleString("en-IN")}
                  </div>
                </>
              )}

              {/* Date picker — shown after amount entered */}
              {(paymentType === "full" ||
                (paymentType === "advance" && Number(payNowAmount) > 0)) &&
                Number(amount) > 0 && (
                  <DatePicker {...specialDatePickerProps} />
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════
          REGULAR EVENTS FLOW
      ══════════════════════════════════ */}
      {eventType === "regular" && (
        <>
          <select
            className="input"
            value={purpose}
            onChange={handlePurposeChange}
            disabled={isEditMode}
            style={{
              backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
              cursor: isEditMode ? "not-allowed" : "pointer",
              opacity: isEditMode ? 0.8 : 1,
              marginTop: "10px",
            }}
          >
            <option value="">Choose Purpose / उद्देश निवडा</option>
            {regularPurposes.map((item, index) => (
              <option key={index} value={item.name}>{item.name}</option>
            ))}
          </select>

          {/* Amount Display */}
          {purpose && (
            <div className="amount-box">
              Amount / रक्कम: ₹{displayAmount}
            </div>
          )}

          {/* CUSTOM — Donation / Abhishek */}
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
              <DatePicker {...regularDatePickerProps} />
            </>
          )}

          {/* REGULAR SPECIAL — Full/Half Bhandara */}
          {isRegularSpecial && !paymentType && (
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

          {isRegularSpecial && paymentType === "full" && (
            <DatePicker {...regularDatePickerProps} />
          )}

          {isRegularSpecial && paymentType === "advance" && (
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
              <DatePicker {...regularDatePickerProps} />
            </>
          )}

          {/* SHIRAPASAD */}
          {isShirapasad && (
            <>
              <div className="amount-box">
                Amount / रक्कम: ₹5,001 (Full Payment Only)
              </div>
              <DatePicker {...regularDatePickerProps} />
            </>
          )}

          {/* FIXED */}
          {isFixed && <DatePicker {...regularDatePickerProps} />}
        </>
      )}
    </div>
  );
}