import { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiRequest from "../services/api";

/* ==========================================
   CONSTANTS
========================================== */
const ABHISHEK_GOTRAS = [
  "विश्वामित्र", "जमदग्री", "भारद्वाज", "गोतम",
  "अत्रि", "विशिष्ट", "कश्यप", "अगस्ती", "Other",
];

/* ==========================================
   SAFE DATE HELPER
========================================== */
const safeDate = (d) => {
  if (!d) return null;
  const str = typeof d === "string" ? d.split("T")[0].trim() : null;
  if (str && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, day] = str.split("-").map(Number);
    const date = new Date(y, m - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export default function PurposeDropdown() {
  /* ── Core state ── */
  const [eventType, setEventType] = useState("");
  const [sevaList, setSevaList] = useState([]);
  const [sevaLoading, setSevaLoading] = useState(true);
  const [allBookings, setAllBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  /* ── Selected seva ── */
  const [selectedSeva, setSelectedSeva] = useState(null); // full seva object
  const [selectedSevaId, setSelectedSevaId] = useState("");

  /* ── Amount ── */
  const [amount, setAmount] = useState("");
  const [baseAmount, setBaseAmount] = useState(0);

  /* ── Sub-purpose ── */
  const [selectedSubPurpose, setSelectedSubPurpose] = useState("");
  const [pricePerDate, setPricePerDate] = useState("");

  /* ── Gotra ── */
  const [gotra, setGotra] = useState("");
  const [gotraCustom, setGotraCustom] = useState("");

  /* ── Payment ── */
  const [paymentType, setPaymentType] = useState("");
  const [payNowAmount, setPayNowAmount] = useState("");
  const [advance, setAdvance] = useState(0);

  /* ── Dates ── */
  const [bookingDate, setBookingDate] = useState(null);
  const [multiDates, setMultiDates] = useState([]); // for multi-date sevas

  /* ── Special events ── */
  const [selectedSpecialSeva, setSelectedSpecialSeva] = useState(null);

  /* ==========================================
     HELPERS
  ========================================== */
  const getBookingForm = useCallback(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("bookingForm") || "{}"); }
    catch { return {}; }
  }, []);

  const saveToLocalStorage = useCallback((overrides = {}) => {
    const existing = getBookingForm();
    const updated = { ...existing, ...overrides };
    const totalAmount = Number(updated.amount ?? updated.baseAmount ?? 0);
    const paidAmount = Number(updated.advance ?? 0);
    const remaining = Math.max(totalAmount - paidAmount, 0);
    updated.remainingAmount = remaining;
    updated.status = remaining === 0 ? "Approved" : "Pending";
    localStorage.setItem("bookingForm", JSON.stringify(updated));
  }, [getBookingForm]);

  const toDBDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const toDisplayDate = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  /* ==========================================
     FETCH DATA
  ========================================== */
  const fetchData = useCallback(async () => {
    // Fetch seva list
    try {
      const res = await apiRequest("/get_seva_list");
      const list = res.sevaList || res.data || res || [];
      setSevaList(Array.isArray(list) ? list : []);
    } catch {
      setSevaList([]);
    } finally {
      setSevaLoading(false);
    }

    // Fetch all bookings for date availability check
    try {
      setBookingsLoading(true);
      const data = await apiRequest("/Bookings");
      const list = Array.isArray(data) ? data : data.bookings || [];
      setAllBookings(list);
    } catch {
      setAllBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  /* ==========================================
     INIT
  ========================================== */
  useEffect(() => {
    const init = async () => {
      const saved = getBookingForm();
      if (saved._id || saved.id || saved.bookingId) setIsEditMode(true);

      // Restore state from localStorage
      if (saved.eventType) setEventType(saved.eventType);
      if (saved.selectedSevaId) setSelectedSevaId(saved.selectedSevaId);
      if (saved.amount !== undefined) setAmount(String(saved.amount));
      if (saved.bookingDate) { const d = safeDate(saved.bookingDate); if (d) setBookingDate(d); }
      if (saved.advance !== undefined) setAdvance(Number(saved.advance ?? 0));
      if (saved.paymentType) setPaymentType(saved.paymentType);
      if (saved.selectedSubPurpose) setSelectedSubPurpose(saved.selectedSubPurpose);
      if (saved.gotra) setGotra(saved.gotra);
      if (saved.pricePerDate) setPricePerDate(saved.pricePerDate);
      if (saved.multiDates) {
        setMultiDates(saved.multiDates.map((d) => safeDate(d)).filter(Boolean));
      }
      if (saved.advance !== undefined && saved.originalAdvance === undefined) {
        saveToLocalStorage({ originalAdvance: Number(saved.advance ?? 0) });
      }

      await fetchData();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================
     RESTORE selectedSeva after sevaList loads
  ========================================== */
  useEffect(() => {
    if (sevaList.length > 0 && selectedSevaId) {
      const found = sevaList.find((s) => (s._id || s.id) === selectedSevaId);
      if (found) setSelectedSeva(found);
    }
  }, [sevaList, selectedSevaId]);

  /* ==========================================
     DERIVED VALUES
  ========================================== */
  const savedData = getBookingForm();
  const originalAdvance = Number(savedData.originalAdvance ?? savedData.advance ?? 0);
  const previousPaidAmount = isEditMode ? originalAdvance : 0;
  const remainingAmount = Math.max(baseAmount - Number(savedData.advance ?? 0), 0);
  const currentRemainingAmount = Math.max(baseAmount - previousPaidAmount, 0);

  // Split sevas by event type — only show active sevas
  const specialSevas = sevaList.filter((s) => s.eventType === "special" && s.isActive !== false);
  const regularSevas = sevaList.filter((s) => s.eventType === "regular" && s.isActive !== false);

  // Multi-date total
  const multiDateTotal = pricePerDate && multiDates.length
    ? Number(pricePerDate) * multiDates.length
    : 0;

  /* ==========================================
     ACTIVE BOOKINGS FOR DATE
  ========================================== */
  const getActiveBookingsForDate = useCallback((dateKey) =>
    allBookings.filter((b) => {
      if ((b.status || "").toLowerCase() === "cancelled") return false;
      const bDate = (b.bookingDate || b.date || "").split("T")[0].trim();
      return bDate === dateKey;
    }),
    [allBookings]
  );

  /* ==========================================
     DATE SELECTABLE — Regular Sevas
  ========================================== */
  const isDateSelectable = useCallback((date) => {
    if (!date) return false;
    // If no seva selected yet, allow future dates (calendar still shows)
    if (!selectedSeva) {
      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return selected >= today;
    }

    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) return false;

    const dateRule = selectedSeva.dateRule || "any";
    const dateKey = toDBDate(selected);
    const dayOfWeek = selected.getDay();

    // Block special seva dates only if this seva has blockOnSpecialDates = true
    if (selectedSeva?.blockOnSpecialDates) {
      const allSpecialDates = specialSevas.flatMap((s) =>
        (s.specificDates || s.dates || []).map((d) =>
          typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d)
        )
      );
      if (allSpecialDates.includes(dateKey)) return false;
    }

    // Day restrictions
    if (dateRule === "thursday" && dayOfWeek !== 4) return false;
    if (dateRule === "sun_thu" && dayOfWeek !== 0 && dayOfWeek !== 4) return false;
    if (dateRule === "specific") {
      const allowed = (selectedSeva.specificDates || []).map((d) =>
        typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d)
      );
      if (!allowed.includes(dateKey)) return false;
    }

    // Max per date check
    const maxPerDate = Number(selectedSeva.maxPerDate || 0);
    if (maxPerDate > 0) {
      const activeOnDate = getActiveBookingsForDate(dateKey);

      // Cross-block: Full Bhandara ↔ Half Bhandara
      const sevaName = (selectedSeva.displayName || "").toLowerCase();
      if (sevaName.includes("full bhandara") || sevaName.includes("half bhandara")) {
        const fullCount = activeOnDate.filter((b) => (b.purpose || "").toLowerCase().includes("full bhandara")).length;
        const halfCount = activeOnDate.filter((b) => (b.purpose || "").toLowerCase().includes("half bhandara")).length;
        if (sevaName.includes("full bhandara") && (fullCount >= 1 || halfCount >= 1)) return false;
        if (sevaName.includes("half bhandara") && (fullCount >= 1 || halfCount >= 2)) return false;
        return true;
      }

      const count = activeOnDate.filter((b) => b.purpose === selectedSeva.displayName).length;
      if (count >= maxPerDate) return false;
    }

    return true;
  }, [selectedSeva, specialSevas, getActiveBookingsForDate]);

  /* ==========================================
     DATE SELECTABLE — Special Sevas
  ========================================== */
  const isSpecialDateSelectable = useCallback((date) => {
    if (!date || !selectedSpecialSeva || !selectedSeva) return false;

    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) return false;

    const dateKey = toDBDate(selected);
    const allowedDates = (selectedSpecialSeva.specificDates || selectedSpecialSeva.dates || [])
      .map((d) => typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d));

    if (!allowedDates.includes(dateKey)) return false;

    // Max per date check for special seva
    const maxPerDate = Number(selectedSpecialSeva.maxPerDate || 0);
    if (maxPerDate > 0) {
      const activeOnDate = getActiveBookingsForDate(dateKey);

      // Cross-block for Bhandara types
      if (selectedSeva) {
        const subName = (selectedSeva.displayName || "").toLowerCase();
        const fullCount = activeOnDate.filter((b) => (b.purpose || "").toLowerCase().includes("full bhandara")).length;
        const halfCount = activeOnDate.filter((b) => (b.purpose || "").toLowerCase().includes("half bhandara")).length;
        if (subName.includes("full bhandara") && (fullCount >= 1 || halfCount >= 1)) return false;
        if (subName.includes("half bhandara") && (fullCount >= 1 || halfCount >= 2)) return false;
      }

      const count = activeOnDate.filter((b) => b.purpose === selectedSeva.displayName).length;
      if (count >= maxPerDate) return false;
    }

    return true;
  }, [selectedSeva, selectedSpecialSeva, getActiveBookingsForDate]);

  /* ==========================================
     DATE SELECTABLE — Multi-date (Abhishek-type)
  ========================================== */
  const isMultiDateSelectable = useCallback((date) => {
    if (!date || !selectedSeva) return false;

    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) return false;

    const dateKey = toDBDate(selected);

    // Block special seva dates only if blockOnSpecialDates = true
    if (selectedSeva?.blockOnSpecialDates) {
      const allSpecialDates = specialSevas.flatMap((s) =>
        (s.specificDates || s.dates || []).map((d) =>
          typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d)
        )
      );
      if (allSpecialDates.includes(dateKey)) return false;
    }

    // Check sub-purpose slot availability
    if (selectedSubPurpose && selectedSeva.subPurposes) {
      const sub = selectedSeva.subPurposes.find((s) => s.name === selectedSubPurpose);
      if (sub && sub.slots > 0) {
        const bookedCount = allBookings.filter((b) => {
          if ((b.status || "").toLowerCase() === "cancelled") return false;
          const bDate = (b.bookingDate || b.date || "").split("T")[0];
          return bDate === dateKey && b.subPurpose === selectedSubPurpose;
        }).length;
        if (bookedCount >= sub.slots) return false;
      }
    }

    return true;
  }, [selectedSeva, selectedSubPurpose, specialSevas, allBookings]);

  /* ==========================================
     RESET — called when event type changes
  ========================================== */
  const resetSelections = (keepEventType = false) => {
    setSelectedSeva(null); setSelectedSevaId("");
    setAmount(""); setBaseAmount(0);
    setSelectedSubPurpose(""); setPricePerDate("");
    setGotra(""); setGotraCustom("");
    setPaymentType(""); setPayNowAmount(""); setAdvance(0);
    setBookingDate(null); setMultiDates([]);
    setSelectedSpecialSeva(null);
    saveToLocalStorage({
      ...(keepEventType ? {} : { eventType: "" }),
      selectedSevaId: "", purpose: "", baseAmount: 0, amount: 0,
      advance: 0, originalAdvance: 0, remainingAmount: 0,
      bookingDate: "", paymentType: "", selectedSubPurpose: "",
      gotra: "", pricePerDate: "", multiDates: [], status: "Pending",
    });
  };

  /* ==========================================
     HANDLERS
  ========================================== */
  const handleEventTypeChange = (type) => {
    setEventType(type);
    resetSelections();
    saveToLocalStorage({ eventType: type });
  };

  // Regular seva selected
  const handleSevaChange = (e) => {
    const id = e.target.value;
    const found = sevaList.find((s) => (s._id || s.id) === id);
    setSelectedSeva(found || null);
    setSelectedSevaId(id);
    setAmount(""); setBaseAmount(found?.amountType === "fixed" ? Number(found.amount) : 0);
    setSelectedSubPurpose(""); setPricePerDate("");
    setGotra(""); setGotraCustom("");
    setPaymentType(""); setPayNowAmount(""); setAdvance(0);
    setBookingDate(null); setMultiDates([]);

    saveToLocalStorage({
      selectedSevaId: id,
      purpose: found?.displayName || "",
      baseAmount: found?.amountType === "fixed" ? Number(found.amount) : 0,
      amount: found?.amountType === "fixed" ? Number(found.amount) : 0,
      advance: 0, originalAdvance: 0,
      remainingAmount: found?.amountType === "fixed" ? Number(found.amount) : 0,
      bookingDate: "", paymentType: "", selectedSubPurpose: "",
      gotra: "", pricePerDate: "", multiDates: [], status: "Pending",
    });
  };

  // Special seva (utsav) selected
  const handleSpecialSevaChange = (e) => {
    const id = e.target.value;
    const found = specialSevas.find((s) => (s._id || s.id) === id);
    setSelectedSpecialSeva(found || null);
    setSelectedSeva(null); setSelectedSevaId("");
    setAmount(""); setBaseAmount(0);
    setPaymentType(""); setPayNowAmount(""); setAdvance(0);
    setBookingDate(null);
    saveToLocalStorage({
      selectedSpecialSevaId: id,
      purpose: "", baseAmount: 0, amount: 0,
      advance: 0, remainingAmount: 0, bookingDate: "", paymentType: "",
    });
  };

  // Sub-purpose (e.g. Panchamrut, Rudrabhishek)
  const handleSubPurposeChange = (e) => {
    const name = e.target.value;
    setSelectedSubPurpose(name);
    setMultiDates([]); setBookingDate(null);

    const sub = selectedSeva?.subPurposes?.find((s) => s.name === name);
    const price = sub ? String(sub.amount || "") : "";
    setPricePerDate(price);

    saveToLocalStorage({
      selectedSubPurpose: name,
      pricePerDate: price,
      multiDates: [], bookingDate: "",
      amount: 0, baseAmount: 0, advance: 0, remainingAmount: 0,
    });
  };

  // Special event sub-purpose (Bhandara type)
  const handleSpecialSubSevaChange = (sub) => {
    setSelectedSeva(sub);
    setSelectedSevaId(sub._id || sub.id || "");
    setPaymentType(""); setPayNowAmount(""); setAdvance(0); setBookingDate(null);
    const fixedAmt = Number(sub.amount || 0);
    setBaseAmount(fixedAmt);
    saveToLocalStorage({
      purpose: sub.displayName,
      selectedSevaId: sub._id || sub.id || "",
      baseAmount: fixedAmt, amount: fixedAmt,
      advance: 0, remainingAmount: fixedAmt,
      bookingDate: "", paymentType: "",
    });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    const n = Number(value ?? 0);
    setBaseAmount(n);
    saveToLocalStorage({
      amount: n, baseAmount: n,
      advance: paymentType === "full" ? n : Number(savedData.advance ?? 0),
      bookingDate: bookingDate ? toDBDate(bookingDate) : "",
    });
  };

  const handleGotraChange = (val) => {
    setGotra(val);
    saveToLocalStorage({ gotra: val });
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type); setPayNowAmount("");
    const currentAmount = Number(amount || baseAmount || 0);
    if (type === "full") {
      setAdvance(currentAmount);
      saveToLocalStorage({ paymentType: "full", amount: currentAmount, advance: currentAmount, remainingAmount: 0, status: "Approved" });
    }
    if (type === "advance") {
      setAdvance(0);
      saveToLocalStorage({ paymentType: "advance", amount: currentAmount, advance: 0, originalAdvance: 0, remainingAmount: currentAmount });
    }
  };

  const handlePayNowChange = (e) => {
    const value = e.target.value;
    const currentAmount = Number(amount || baseAmount || 0);
    if (value === "") {
      setPayNowAmount(""); setAdvance(previousPaidAmount);
      saveToLocalStorage({ paymentType: "advance", amount: currentAmount, advance: previousPaidAmount, remainingAmount: Math.max(currentAmount - previousPaidAmount, 0) });
      return;
    }
    let payNow = Number(value ?? 0);
    const maxAllowed = Math.max(currentAmount - previousPaidAmount, 0);
    if (payNow > maxAllowed) payNow = maxAllowed;
    setPayNowAmount(String(payNow));
    const totalPaid = previousPaidAmount + payNow;
    setAdvance(totalPaid);
    saveToLocalStorage({ paymentType: "advance", amount: currentAmount, advance: totalPaid, remainingAmount: Math.max(currentAmount - totalPaid, 0) });
  };

  const handleDateChange = (date) => {
    if (!date) { setBookingDate(null); saveToLocalStorage({ bookingDate: "" }); return; }
    setBookingDate(date);
    saveToLocalStorage({ bookingDate: toDBDate(date) });
  };

  const handleMultiDateToggle = (date) => {
    if (!date) return;
    const dateStr = toDBDate(date);
    const exists = multiDates.some((d) => toDBDate(d) === dateStr);
    let newDates;
    if (exists) {
      newDates = multiDates.filter((d) => toDBDate(d) !== dateStr);
    } else {
      newDates = [...multiDates, date];
    }
    setMultiDates(newDates);
    const newTotal = pricePerDate ? Number(pricePerDate) * newDates.length : 0;
    setBaseAmount(newTotal);
    saveToLocalStorage({
      multiDates: newDates.map(toDBDate),
      amount: newTotal, baseAmount: newTotal,
      advance: newTotal, remainingAmount: 0,
    });
  };

  /* ==========================================
     TOOLTIP HELPER — returns special event name for a date
  ========================================== */
  const getSpecialEventNameForDate = useCallback((date) => {
    if (!date) return null;
    const dateKey = toDBDate(new Date(date));
    const found = specialSevas.find((s) =>
      (s.specificDates || s.dates || []).some((d) =>
        (typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d)) === dateKey
      )
    );
    return found ? found.displayName : null;
  }, [specialSevas]);

  /* ==========================================
     DATE PICKER PROPS
  ========================================== */
  

  // Get all special event dates — only used when blockOnSpecialDates is true
  const blockedSpecialDates = selectedSeva?.blockOnSpecialDates
    ? specialSevas
        .flatMap((s) =>
          (s.specificDates || s.dates || []).map((d) =>
            safeDate(typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d))
          )
        )
        .filter(Boolean)
    : [];

  // Merge highlightDates into regular picker (blocked special dates)
  const regularDatePickerProps = {
    selected: bookingDate,
    onChange: handleDateChange,
    filterDate: isDateSelectable,
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select booking date (dd-mm-yyyy)",
    className: "pd-date-input",
    required: true,
    isClearable: true,
    calendarClassName: "pd-calendar",
    highlightDates: blockedSpecialDates.length > 0
      ? [{ "react-datepicker__day--utsav-blocked": blockedSpecialDates }]
      : [],
    // Tooltip: show special event name on blocked dates (only when seva blocks special dates)
    renderDayContents: (day, date) => {
      const specialName = getSpecialEventNameForDate(date);
      return (
        <span
          title={specialName && selectedSeva?.blockOnSpecialDates
            ? `🚫 ${specialName} — Date reserved for special event`
            : ""}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          {day}
        </span>
      );
    },
  };

  // Get the allowed dates for the selected special seva
  const specialSevaHighlightDates = selectedSpecialSeva
    ? (selectedSpecialSeva.specificDates || selectedSpecialSeva.dates || [])
        .map((d) => safeDate(typeof d === "string" ? d.split("T")[0].trim() : toDBDate(d)))
        .filter(Boolean)
    : [];

  const specialDatePickerProps = {
    selected: bookingDate,
    onChange: handleDateChange,
    filterDate: isSpecialDateSelectable,
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select booking date (dd-mm-yyyy)",
    className: "pd-date-input",
    required: true,
    isClearable: true,
    disabled: !selectedSpecialSeva || !selectedSeva || !paymentType,
    calendarClassName: "pd-calendar",
    highlightDates: specialSevaHighlightDates.length > 0
      ? [{ "react-datepicker__day--highlighted": specialSevaHighlightDates }]
      : [],
  };

  const multiDatePickerProps = {
    selected: null,
    onChange: handleMultiDateToggle,
    filterDate: isMultiDateSelectable,
    highlightDates: [
      ...(multiDates.length > 0 ? [{ "react-datepicker__day--abhishek-selected": multiDates }] : []),
    ],
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Click dates to select/deselect",
    className: "pd-date-input",
    isClearable: false,
    calendarClassName: "pd-calendar abhishek-calendar",
    renderDayContents: (day, date) => {
      const specialName = getSpecialEventNameForDate(date);
      return (
        <span
          title={specialName ? `🚫 ${specialName} — Date reserved for special event` : ""}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          {day}
        </span>
      );
    },
  };

  /* ==========================================
     LOADING
  ========================================== */
  if (sevaLoading) {
    return (
      <div className="pd-root">
        <div className="pd-loading">Loading sevas...</div>
      </div>
    );
  }

  /* ==========================================
     UI
  ========================================== */
  return (
    <div className="pd-root">

      {/* SECTION HEADER */}
      <div className="pd-header">
        <div className="pd-header-icon">🪔</div>
        <div>
          <h3 className="pd-header-title">Purpose / उद्देश</h3>
          <p className="pd-header-sub">Select event type and booking purpose</p>
        </div>
      </div>

      {/* EVENT TYPE BUTTONS */}
      <div className="pd-field">
        <label className="pd-label">Event Type / कार्यक्रम प्रकार</label>
        <div className="pd-event-grid">
          {[
            { key: "special", icon: "✨", en: "Special Events", mr: "विशेष कार्यक्रम" },
            { key: "regular", icon: "📋", en: "Regular Events", mr: "नियमित कार्यक्रम" },
          ].map(({ key, icon, en, mr }) => (
            <button
              key={key}
              type="button"
              disabled={isEditMode}
              onClick={() => handleEventTypeChange(key)}
              className={`pd-event-btn ${eventType === key ? "pd-event-btn--active" : ""}`}
            >
              <span className="pd-event-icon">{icon}</span>
              <span className="pd-event-en">{en}</span>
              <span className="pd-event-mr">{mr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════
          SPECIAL EVENTS
      ══════════════════════════════ */}
      {eventType === "special" && (
        <div className="pd-flow">

          {/* Step 1: Select special seva (utsav) */}
          <div className="pd-field">
            <label className="pd-label">Event / उत्सव *</label>
            <select
              className="pd-select"
              value={selectedSpecialSeva ? (selectedSpecialSeva._id || selectedSpecialSeva.id) : ""}
              onChange={handleSpecialSevaChange}
              disabled={isEditMode}
            >
              <option value="">— Select Event / उत्सव निवडा —</option>
              {specialSevas.map((seva, i) => {
                const dates = seva.specificDates || seva.dates || [];
                const dateRange = dates.length > 0
                  ? ` (${dates[0]} to ${dates[dates.length - 1]})`
                  : "";
                return (
                  <option key={i} value={seva._id || seva.id}>
                    {seva.displayName}{dateRange}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Step 2: Select sub-seva under this special event */}
          {selectedSpecialSeva && (
            <div className="pd-field">
              <label className="pd-label">Seva Type / सेवा प्रकार *</label>
              <div className="pd-bhandara-grid">
                {selectedSpecialSeva.subPurposes?.length > 0
                  ? selectedSpecialSeva.subPurposes.map((sub, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={isEditMode}
                        onClick={() => handleSpecialSubSevaChange(sub)}
                        className={`pd-bhandara-btn ${selectedSeva?.name === sub.name ? "pd-bhandara-btn--active" : ""}`}
                      >
                        <span className="pd-bhandara-name">{sub.name}</span>
                        {sub.amount > 0 && <span className="pd-bhandara-amt">₹{Number(sub.amount).toLocaleString("en-IN")}</span>}
                      </button>
                    ))
                  : /* If no sub-purposes, use the special seva itself */
                    (() => {
                      // Auto-select the special seva directly
                      if (!selectedSeva && selectedSpecialSeva) {
                        setTimeout(() => handleSpecialSubSevaChange(selectedSpecialSeva), 0);
                      }
                      return null;
                    })()
                }
              </div>
            </div>
          )}

          {/* Step 3: Amount display */}
          {selectedSeva && baseAmount > 0 && (
            <div className="pd-amount-row pd-amount-row--green">
              <span className="pd-amount-row__label">Fixed Amount / निश्चित रक्कम</span>
              <span className="pd-amount-row__value">₹{baseAmount.toLocaleString("en-IN")}</span>
            </div>
          )}

          {/* Step 4: Payment type */}
          {selectedSeva && !paymentType && selectedSpecialSeva && (
            <div className="pd-field">
              <label className="pd-label">Payment Type / पेमेंट प्रकार</label>
              <div className="pd-pay-grid">
                <button type="button" className="pd-pay-btn pd-pay-btn--full" onClick={() => handlePaymentTypeChange("full")}>
                  <span className="pd-pay-icon">💰</span>
                  <span className="pd-pay-title">Full Payment</span>
                  <span className="pd-pay-sub">₹{baseAmount.toLocaleString("en-IN")}</span>
                </button>
                {selectedSeva.paymentOptions === "full_advance" && (
                  <button type="button" className="pd-pay-btn pd-pay-btn--advance" onClick={() => handlePaymentTypeChange("advance")}>
                    <span className="pd-pay-icon">📋</span>
                    <span className="pd-pay-title">Advance Payment</span>
                    <span className="pd-pay-sub">Pay partial now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Advance amount */}
          {selectedSeva && paymentType === "advance" && (
            <>
              <div className="pd-field">
                <label className="pd-label">Advance Amount / आगाऊ रक्कम *</label>
                <input type="number" className="pd-input" placeholder="Enter advance amount" min="1" max={baseAmount} value={payNowAmount} onChange={handlePayNowChange} />
              </div>
              <div className="pd-amount-row pd-amount-row--amber">
                <span className="pd-amount-row__label">Remaining / उर्वरित रक्कम</span>
                <span className="pd-amount-row__value">₹{Math.max(baseAmount - Number(payNowAmount || 0), 0).toLocaleString("en-IN")}</span>
              </div>
            </>
          )}

          {/* Step 6: Booking date */}
          {selectedSeva && paymentType && (paymentType === "full" || Number(payNowAmount) > 0) && (
            <div className="pd-field">
              <label className="pd-label">Booking Date / बुकिंग तारीख *</label>
              <DatePicker {...specialDatePickerProps} />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          REGULAR EVENTS
      ══════════════════════════════ */}
      {eventType === "regular" && (
        <div className="pd-flow">

          {/* Select regular seva */}
          <div className="pd-field">
            <label className="pd-label">Purpose / उद्देश *</label>
            <select
              className="pd-select"
              value={selectedSevaId}
              onChange={handleSevaChange}
              disabled={isEditMode}
              style={{ opacity: isEditMode ? 0.7 : 1, cursor: isEditMode ? "not-allowed" : "pointer" }}
            >
              <option value="">— Choose Purpose / उद्देश निवडा —</option>
              {regularSevas.map((seva, i) => (
                <option key={i} value={seva._id || seva.id}>
                  {seva.displayName}
                  {seva.amountType === "fixed" ? ` (₹${Number(seva.amount).toLocaleString("en-IN")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedSeva && (
            <>
              {/* Fixed amount display — only when no sub-purposes */}
              {selectedSeva.amountType === "fixed" && !selectedSeva.hasSubPurposes && (
                <div className="pd-amount-row pd-amount-row--green">
                  <span className="pd-amount-row__label">Amount / रक्कम</span>
                  <span className="pd-amount-row__value">₹{Number(selectedSeva.amount).toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Sub-purpose dropdown */}
              {selectedSeva.hasSubPurposes && selectedSeva.subPurposes?.length > 0 && (
                <div className="pd-field">
                  <label className="pd-label">
                    {selectedSeva.displayName} Type *
                  </label>
                  <select className="pd-select" value={selectedSubPurpose} onChange={handleSubPurposeChange} disabled={isEditMode}>
                    <option value="">— Select Type —</option>
                    {selectedSeva.subPurposes.map((sub, i) => (
                      <option key={i} value={sub.name}>
                        {sub.name}
                        {sub.amount > 0 ? ` — ₹${Number(sub.amount).toLocaleString("en-IN")}` : ""}
                        {sub.slots > 0 ? ` (${sub.slots} slots/day)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gotra dropdown */}
              {selectedSeva.hasGotra && (selectedSubPurpose || !selectedSeva.hasSubPurposes) && (
                <div className="pd-field">
                  <label className="pd-label">Gotra / गोत्र</label>
                  <select
                    className="pd-select"
                    value={ABHISHEK_GOTRAS.includes(gotra) ? gotra : gotra ? "Other" : ""}
                    onChange={(e) => {
                      if (e.target.value === "Other") { handleGotraChange("Other"); setGotraCustom(""); }
                      else { handleGotraChange(e.target.value); setGotraCustom(""); }
                    }}
                    disabled={isEditMode}
                  >
                    <option value="">— Select Gotra / गोत्र निवडा —</option>
                    {ABHISHEK_GOTRAS.map((g, i) => <option key={i} value={g}>{g}</option>)}
                  </select>
                  {(gotra === "Other" || (gotra && !ABHISHEK_GOTRAS.slice(0, -1).includes(gotra))) && (
                    <input
                      className="pd-input"
                      style={{ marginTop: "8px" }}
                      placeholder="Enter Gotra / गोत्र प्रविष्ट करा"
                      value={gotraCustom}
                      onChange={(e) => { setGotraCustom(e.target.value); handleGotraChange(e.target.value); }}
                    />
                  )}
                </div>
              )}

              {/* Flexible amount input
                  Show if: flexible amount AND (no sub-purposes OR sub-purpose already selected)
                  Sub-purposes with their own amount use pricePerDate instead */}
              {selectedSeva.amountType === "flexible" &&
                (!selectedSeva.hasSubPurposes || (selectedSeva.hasSubPurposes && selectedSubPurpose && !(() => {
                  const sub = selectedSeva.subPurposes?.find((s) => s.name === selectedSubPurpose);
                  return sub?.amount > 0 || sub?.isMultiDate;
                })())) && (
                <>
                  <div className="pd-field">
                    <label className="pd-label">Enter Amount / रक्कम टाका *</label>
                    <input type="number" className="pd-input" placeholder="Enter amount" min="1" value={amount} onChange={handleAmountChange} />
                  </div>
                  {Number(amount) > 0 && (
                    <div className="pd-amount-row pd-amount-row--green">
                      <span className="pd-amount-row__label">Amount / रक्कम</span>
                      <span className="pd-amount-row__value">₹{Number(amount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>
              )}

              {/* Multi-date selection (e.g. Abhishek) */}
              {selectedSeva.hasSubPurposes && selectedSubPurpose && (() => {
                const sub = selectedSeva.subPurposes?.find((s) => s.name === selectedSubPurpose);
                return sub?.isMultiDate;
              })() && pricePerDate && (
                <>
                  {/* Price per date */}
                  <div className="pd-readonly-field">
                    <span className="pd-readonly-prefix">₹</span>
                    <span className="pd-readonly-value">{Number(pricePerDate).toLocaleString("en-IN")}</span>
                    <span className="pd-readonly-badge">per date</span>
                  </div>

                  {/* Multi-date calendar */}
                  <div className="pd-field">
                    <label className="pd-label">
                      Select Dates / तारखा निवडा *
                      <span className="pd-label-hint"> — click to select/deselect</span>
                    </label>
                    <div className="pd-calendar-wrap">
                      <DatePicker {...multiDatePickerProps} />
                    </div>
                  </div>

                  {/* Selected date tags */}
                  {multiDates.length > 0 && (
                    <>
                      <div className="pd-date-tags">
                        {multiDates.slice().sort((a, b) => a - b).map((date, i) => (
                          <span key={i} className="pd-date-tag">
                            {toDisplayDate(date)}
                            <button className="pd-date-tag__remove" onClick={() => handleMultiDateToggle(date)}>×</button>
                          </span>
                        ))}
                      </div>
                      <div className="pd-amount-row pd-amount-row--green">
                        <span className="pd-amount-row__label">
                          Total — {multiDates.length} date{multiDates.length > 1 ? "s" : ""} × ₹{Number(pricePerDate).toLocaleString("en-IN")}
                        </span>
                        <span className="pd-amount-row__value">₹{multiDateTotal.toLocaleString("en-IN")}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Payment type buttons */}
              {selectedSeva.amountType === "fixed" && selectedSeva.dateRule !== "none" && !paymentType &&
                (!selectedSeva.hasSubPurposes || selectedSubPurpose) && (
                <div className="pd-field">
                  <label className="pd-label">Payment Type / पेमेंट प्रकार</label>
                  <div className="pd-pay-grid">
                    <button type="button" className="pd-pay-btn pd-pay-btn--full" onClick={() => handlePaymentTypeChange("full")}>
                      <span className="pd-pay-icon">💰</span>
                      <span className="pd-pay-title">Full Payment</span>
                      <span className="pd-pay-sub">₹{Number(selectedSeva.amount).toLocaleString("en-IN")}</span>
                    </button>
                    {selectedSeva.paymentOptions === "full_advance" && (
                      <button type="button" className="pd-pay-btn pd-pay-btn--advance" onClick={() => handlePaymentTypeChange("advance")}>
                        <span className="pd-pay-icon">📋</span>
                        <span className="pd-pay-title">Advance Payment</span>
                        <span className="pd-pay-sub">Pay partial now</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Advance payment input */}
              {paymentType === "advance" && (
                <>
                  {isEditMode && (
                    <div className="pd-amount-row pd-amount-row--blue">
                      <span className="pd-amount-row__label">Paid Amount / भरलेली रक्कम</span>
                      <span className="pd-amount-row__value">₹{previousPaidAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="pd-field">
                    <label className="pd-label">Pay Now / आता भरा *</label>
                    <input type="number" className="pd-input" placeholder="Enter amount to pay now" min="1" max={currentRemainingAmount} value={payNowAmount} onChange={handlePayNowChange} />
                  </div>
                  <div className="pd-amount-row pd-amount-row--amber">
                    <span className="pd-amount-row__label">Remaining / उर्वरित रक्कम</span>
                    <span className="pd-amount-row__value">₹{remainingAmount.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}

              {/* No date badge */}
              {selectedSeva.dateRule === "none" && (
                <div className="pd-badge pd-badge--green">
                  ✅ Amount: ₹{Number(selectedSeva.amount || 0).toLocaleString("en-IN")} — No date selection required
                </div>
              )}

              {/* Single booking date */}
              {selectedSeva.dateRule !== "none" && (() => {
                // If seva has sub-purposes, wait for sub-purpose to be selected
                if (selectedSeva.hasSubPurposes) {
                  if (!selectedSubPurpose) return false;
                  const sub = selectedSeva.subPurposes?.find((s) => s.name === selectedSubPurpose);
                  if (sub?.isMultiDate) return false; // multi-date calendar shown above
                }
                // flexible amount — show calendar immediately
                if (selectedSeva.amountType === "flexible") return true;
                // fixed + full only — show immediately
                if (selectedSeva.paymentOptions === "full") return true;
                // fixed + full_advance — need payment type selected
                if (selectedSeva.paymentOptions === "full_advance") {
                  return paymentType === "full" || (paymentType === "advance" && Number(payNowAmount) > 0);
                }
                return true;
              })() && (
                <div className="pd-field">
                  <label className="pd-label">Booking Date / बुकिंग तारीख *</label>
                  <DatePicker {...regularDatePickerProps} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}