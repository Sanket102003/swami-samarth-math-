import { useState, useEffect, useCallback } from "react";
import { purposes, abhishekTypes } from "../constants/purposes";
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

const SPECIAL_AMOUNTS = {
  "Full Bhandara / पूर्ण भंडारा": 100000,
  "Half Bhandara / अर्ध भंडारा": 50000,
};

const SPECIAL_ADVANCE = {
  "Full Bhandara / पूर्ण भंडारा": 10000,
  "Half Bhandara / अर्ध भंडारा": 5000,
};

// Purposes that show NO calendar
const NO_CALENDAR_PURPOSES = [
  "Two Wheeler / दुचाकी (₹251)",
  "Three Wheeler / तीनचाकी (₹351)",
  "Four Wheeler / चारचाकी (₹551)",
  "गाडीपुजा (टे पो, बस इयादी.)",
];

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

  const [eventType, setEventType] = useState("");
  const [utsavList, setUtsavList] = useState([]);
  const [selectedUtsav, setSelectedUtsav] = useState("");
  const [utsavDates, setUtsavDates] = useState([]);
  const [specialPurpose, setSpecialPurpose] = useState("");
  const [abhishekGotra, setAbhishekGotra] = useState("");
  const [abhishekType, setAbhishekType] = useState(""); // new
  const [abhishekDates, setAbhishekDates] = useState([]);
  const [pricePerDate, setPricePerDate] = useState("");

  /* ==========================================
     PURPOSE GROUPS
  ========================================== */
  const regularPurposes = purposes.filter(
    (p) => p.name !== "Utsav Donation / उत्सव देणगी"
  );

  const isAbhishek = purpose === "Abhishek / अभिषेक";
  const isDonation = purpose === "Donation / देणगी";
  const isRegularSpecial =
    purpose === "Full Bhandara / पूर्ण भंडारा (₹25,000)" ||
    purpose === "Half Bhandara / अर्ध भंडारा (₹15,000)";
  const isFixed = [
    "Vidaprasad / विडाप्रसाद (₹251)",
    "Two Wheeler / दुचाकी (₹251)",
    "Three Wheeler / तीनचाकी (₹351)",
    "Four Wheeler / चारचाकी (₹551)",
    "गाडीपुजा (टे पो, बस इयादी.)",
  ].includes(purpose);
  const isNoCalendar = NO_CALENDAR_PURPOSES.includes(purpose);
  const isShirapasad = purpose === "Shirapasad / शिराप्रसाद (₹5,001)";
  const normalizedPurpose = purpose.toLowerCase();

  const abhishekTotal = pricePerDate && abhishekDates.length
    ? Number(pricePerDate) * abhishekDates.length
    : 0;

  /* ==========================================
     HELPERS
  ========================================== */
  const getBookingForm = useCallback(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("bookingForm") || "{}"); }
    catch { return {}; }
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
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const toDBDateString = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${d}-${m}-${y}`;
  };

  // Format date range for display in dropdown
  const formatUtsavDateRange = (dates) => {
    if (!dates || dates.length === 0) return "";
    const sorted = [...dates].sort();
    if (sorted.length === 1) return sorted[0];
    // Format as DD-MM-YYYY
    const fmt = (d) => d.split("-").reverse().join("-");
    return `${fmt(sorted[0])} to ${fmt(sorted[sorted.length - 1])}`;
  };

  // Filter out utsav events where ALL dates are in the past
  const getActiveUtsavList = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return utsavList.filter((utsav) => {
      const dates = Array.isArray(utsav.dates)
        ? utsav.dates
        : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
      // Keep utsav if at least one date is today or future
      return dates.some((d) => new Date(d) >= today);
    });
  }, [utsavList]);

  const getAllUtsavDates = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allDates = [];
    utsavList.forEach((utsav) => {
      const dates = Array.isArray(utsav.dates)
        ? utsav.dates
        : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
      dates.forEach((d) => {
        const date = new Date(d.split("T")[0]);
        if (date >= today) allDates.push(d.split("T")[0].trim());
      });
    });
    return allDates;
  }, [utsavList]);

  /* ==========================================
     FETCH DATA
  ========================================== */
  const fetchData = useCallback(async () => {
    try {
      const response = await apiRequest("/get_settings");
      const s = response.settings || response.data || response;
      setSettings({ shirprasad: Number(s.shirprasad ?? 3), vidaprasad: Number(s.vidaprasad ?? 15) });
    } catch { setSettings({ shirprasad: 3, vidaprasad: 15 }); }

    try {
      setBookingsLoading(true);
      const data = await apiRequest("/Bookings");
      const list = Array.isArray(data) ? data : data.bookings || data.items || data.data || [];
      setAllBookings(list);
    } catch { setAllBookings([]); }
    finally { setBookingsLoading(false); }

    try {
      const response = await apiRequest("/get_utsav_list");
      const list = response.utsavList || response.data || response || [];
      setUtsavList(Array.isArray(list) ? list : []);
    } catch { setUtsavList([]); }
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
      if (saved.abhishekGotra) setAbhishekGotra(saved.abhishekGotra);
      if (saved.abhishekType) setAbhishekType(saved.abhishekType);
      if (saved.pricePerDate) setPricePerDate(saved.pricePerDate);
      if (saved.abhishekDates) setAbhishekDates(saved.abhishekDates.map((d) => new Date(d)));
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

  /* ==========================================
     ACTIVE BOOKINGS HELPER
  ========================================== */
  const getActiveBookingsForDate = useCallback(
    (dateKey) =>
      allBookings.filter((booking) => {
        const status = (booking.status || "").toLowerCase();
        if (status === "cancelled") return false;
        const bDate = (booking.bookingDate || booking.date || "").split("T")[0].trim();
        return bDate === dateKey;
      }),
    [allBookings]
  );

  /* ==========================================
     BOOKED ABHISHEK DATES — for highlighting
  ========================================== */
  const getBookedAbhishekDates = useCallback(() => {
    if (!abhishekType) return [];
    return allBookings
      .filter((b) => {
        const status = (b.status || "").toLowerCase();
        if (status === "cancelled") return false;
        return (b.purpose || "").includes("Abhishek") || (b.abhishekType === abhishekType);
      })
      .map((b) => {
        const dateStr = (b.bookingDate || b.date || "").split("T")[0];
        return dateStr ? new Date(dateStr) : null;
      })
      .filter(Boolean);
  }, [allBookings, abhishekType]);

  /* ==========================================
     DATE SELECTION — REGULAR
  ========================================== */
  const isDateSelectable = useCallback(
    (date) => {
      if (!date || !purpose) return false;
      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      // Block ALL utsav dates for regular events
      const allUtsavDates = getAllUtsavDates();
      const dateKey = toLocalDateString(selected);
      // Convert utsav dates to dd-MM-yyyy for comparison
      const utsavDateKeys = allUtsavDates.map((d) => {
        const parts = d.split("-"); // YYYY-MM-DD
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      });
      if (utsavDateKeys.includes(dateKey)) return false;

      const dayOfWeek = selected.getDay();

      if (normalizedPurpose.includes("full bhandara") ||
          normalizedPurpose.includes("half bhandara")) {
        if (dayOfWeek !== 0 && dayOfWeek !== 4) return false;
      }
      if (normalizedPurpose.includes("shirapasad") ||
          normalizedPurpose.includes("vidaprasad")) {
        if (dayOfWeek !== 4) return false;
      }

      const activeOnDate = toLocalDateString(selected);
      const activeBookings = getActiveBookingsForDate(activeOnDate);

      if (normalizedPurpose.includes("full bhandara") ||
          normalizedPurpose.includes("half bhandara")) {
        const activeFullCount = activeBookings.filter((b) =>
          (b.purpose || "").toLowerCase().includes("full bhandara")
        ).length;
        const activeHalfCount = activeBookings.filter((b) =>
          (b.purpose || "").toLowerCase().includes("half bhandara")
        ).length;
        if (normalizedPurpose.includes("full bhandara")) {
          if (activeFullCount >= 1 || activeHalfCount >= 1) return false;
        }
        if (normalizedPurpose.includes("half bhandara")) {
          if (activeFullCount >= 1 || activeHalfCount >= 2) return false;
        }
        return true;
      }

      if (normalizedPurpose.includes("shirapasad") ||
          normalizedPurpose.includes("vidaprasad")) {
        const maxLimit = normalizedPurpose.includes("shirapasad")
          ? Number(settings.shirprasad ?? 3)
          : Number(settings.vidaprasad ?? 15);
        const count = activeBookings.filter((b) => b.purpose === purpose).length;
        return count < maxLimit;
      }

      return true;
    },
    [purpose, normalizedPurpose, getActiveBookingsForDate, settings, getAllUtsavDates]
  );

  /* ==========================================
     DATE SELECTION — SPECIAL EVENTS
  ========================================== */
  const isSpecialDateSelectable = useCallback(
    (date) => {
      if (!date || !selectedUtsav || !utsavDates.length) return false;
      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      const dateKey = toLocalDateString(selected); // dd-MM-yyyy

      // Normalize utsav dates from YYYY-MM-DD to dd-MM-yyyy for comparison
      const normalizedUtsavDates = utsavDates.map((d) => {
        const parts = d.split("T")[0].split("-"); // YYYY-MM-DD
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      });

      if (!normalizedUtsavDates.includes(dateKey)) return false;

      if (specialPurpose) {
        const activeOnDate = getActiveBookingsForDate(toLocalDateString(selected));
        const activeFullCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("full bhandara")
        ).length;
        const activeHalfCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("half bhandara")
        ).length;
        if (specialPurpose.toLowerCase().includes("full bhandara")) {
          if (activeFullCount >= 1 || activeHalfCount >= 1) return false;
        }
        if (specialPurpose.toLowerCase().includes("half bhandara")) {
          if (activeFullCount >= 1 || activeHalfCount >= 2) return false;
        }
      }
      return true;
    },
    [selectedUtsav, utsavDates, specialPurpose, getActiveBookingsForDate]
  );

  /* ==========================================
     DATE SELECTION — ABHISHEK
     Block dates that are already fully booked for this abhishek type
  ========================================== */
  const isAbhishekDateSelectable = useCallback(
    (date) => {
      if (!date) return false;
      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      // Check slot limit for this abhishek type on this date
      const selectedType = abhishekTypes.find((a) => a.name === abhishekType);
      if (selectedType && selectedType.slots) {
        const dateKey = toLocalDateString(selected);
        const bookedCount = allBookings.filter((b) => {
          const status = (b.status || "").toLowerCase();
          if (status === "cancelled") return false;
          const bDate = (b.bookingDate || b.date || "").split("T")[0];
          return bDate === dateKey && b.abhishekType === abhishekType;
        }).length;
        if (bookedCount >= selectedType.slots) return false;
      }

      return true;
    },
    [abhishekType, allBookings]
  );

  /* ==========================================
     ABHISHEK MULTI-DATE TOGGLE
  ========================================== */
  const handleAbhishekDateToggle = (date) => {
    if (!date) return;
    const dateStr = toLocalDateString(date);
    const alreadySelected = abhishekDates.some(
      (d) => toLocalDateString(d) === dateStr
    );

    // If deselecting — always allow
    if (alreadySelected) {
      const newDates = abhishekDates.filter(
        (d) => toLocalDateString(d) !== dateStr
      );
      setAbhishekDates(newDates);
      const newTotal = pricePerDate ? Number(pricePerDate) * newDates.length : 0;
      setBaseAmount(newTotal);
      saveToLocalStorage({
        abhishekDates: newDates.map(toLocalDateString),
        amount: newTotal, baseAmount: newTotal,
        advance: newTotal, remainingAmount: 0,
      });
      return;
    }

    // If selecting — check slot limit per day
    const selectedType = abhishekTypes.find((a) => a.name === abhishekType);
    if (selectedType && selectedType.slots) {
      // Count already booked from DB for this date
      const bookedCount = allBookings.filter((b) => {
        const status = (b.status || "").toLowerCase();
        if (status === "cancelled") return false;
        const bDate = (b.bookingDate || b.date || "").split("T")[0];
        return bDate === dateStr && b.abhishekType === abhishekType;
      }).length;

      if (bookedCount >= selectedType.slots) {
        alert(`Only ${selectedType.slots} slots available for this date!`);
        return;
      }
    }

    const newDates = [...abhishekDates, date];
    setAbhishekDates(newDates);
    const newTotal = pricePerDate ? Number(pricePerDate) * newDates.length : 0;
    setBaseAmount(newTotal);
    saveToLocalStorage({
      abhishekDates: newDates.map(toLocalDateString),
      amount: newTotal, baseAmount: newTotal,
      advance: newTotal, remainingAmount: 0,
    });
  };

  const handlePricePerDateChange = (e) => {
    const val = e.target.value;
    setPricePerDate(val);
    const newTotal = val && abhishekDates.length ? Number(val) * abhishekDates.length : 0;
    setBaseAmount(newTotal);
    saveToLocalStorage({
      pricePerDate: val, amount: newTotal,
      baseAmount: newTotal, advance: newTotal, remainingAmount: 0,
    });
  };

  /* ==========================================
     HANDLERS
  ========================================== */
  const handleDatePickerChange = (date) => {
    if (!date) {
      setBookingDate(null);
      saveToLocalStorage({ bookingDate: "" });
      return;
    }
    setBookingDate(date);
    saveToLocalStorage({ bookingDate: toDBDateString(date) }); // store as dd-MM-yyyy
  };

  const handleEventTypeChange = (type) => {
    setEventType(type);
    setPurpose(""); setBaseAmount(0); setAmount("");
    setBookingDate(null); setAdvance(0); setPaymentType("");
    setPayNowAmount(""); setSelectedUtsav(""); setUtsavDates([]);
    setSpecialPurpose(""); setAbhishekGotra(""); setAbhishekType("");
    setAbhishekDates([]); setPricePerDate("");
    saveToLocalStorage({
      eventType: type, purpose: "", baseAmount: 0, amount: 0,
      advance: 0, originalAdvance: 0, remainingAmount: 0,
      bookingDate: "", paymentType: "", selectedUtsav: "",
      specialPurpose: "", abhishekGotra: "", abhishekType: "",
      abhishekDates: [], pricePerDate: "", status: "Pending",
    });
  };

  const handleUtsavChange = (e) => {
    const name = e.target.value;
    setSelectedUtsav(name);
    setBookingDate(null); setSpecialPurpose(""); setPaymentType(""); setAmount("");
    const found = utsavList.find((u) => u.name === name);
    const dates = found
      ? Array.isArray(found.dates) ? found.dates : (found.dates || "").split(",").map((d) => d.trim()).filter(Boolean)
      : [];
    setUtsavDates(dates);
    saveToLocalStorage({
      selectedUtsav: name, bookingDate: "",
      specialPurpose: "", paymentType: "",
      amount: 0, advance: 0, remainingAmount: 0,
    });
  };

  const handleSpecialPurposeChange = (val) => {
    setSpecialPurpose(val);
    setPaymentType(""); setAmount(""); setBookingDate(null);
    const fixedAmt = SPECIAL_AMOUNTS[val] || 0;
    setBaseAmount(fixedAmt);
    saveToLocalStorage({
      specialPurpose: val, purpose: val, baseAmount: fixedAmt,
      amount: fixedAmt, paymentType: "", advance: 0,
      remainingAmount: fixedAmt, bookingDate: "",
    });
  };

  const handlePurposeChange = (e) => {
    const selectedPurpose = e.target.value;
    const selected = regularPurposes.find((p) => p.name === selectedPurpose);
    const fixedAmount = Number(selected?.amount ?? 0);
    setPurpose(selectedPurpose); setBaseAmount(fixedAmount); setAmount("");
    setBookingDate(null); setAdvance(0); setPaymentType("");
    setPayNowAmount(""); setAbhishekGotra(""); setAbhishekType("");
    setAbhishekDates([]); setPricePerDate("");
    saveToLocalStorage({
      purpose: selectedPurpose, baseAmount: fixedAmount, amount: fixedAmount,
      advance: 0, originalAdvance: 0, remainingAmount: fixedAmount,
      bookingDate: "", paymentType: "", abhishekGotra: "",
      abhishekType: "", abhishekDates: [], pricePerDate: "", status: "Pending",
    });
  };

  const handleAbhishekTypeChange = (e) => {
    const val = e.target.value;
    setAbhishekType(val);
    setAbhishekDates([]);
    setBaseAmount(0);

    // Auto-fill price from abhishek type
    const found = abhishekTypes.find((a) => a.name === val);
    const autoPrice = found ? String(found.amount) : "";
    setPricePerDate(autoPrice);

    saveToLocalStorage({
      abhishekType: val,
      abhishekDates: [],
      pricePerDate: autoPrice,
      amount: 0,
      baseAmount: 0,
      advance: 0,
      remainingAmount: 0,
    });
  };

  const handleAbhishekGotraChange = (e) => {
    const val = e.target.value;
    setAbhishekGotra(val);
    saveToLocalStorage({ abhishekGotra: val });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    const enteredAmount = Number(value ?? 0);
    setBaseAmount(enteredAmount);
    saveToLocalStorage({
      amount: enteredAmount, baseAmount: enteredAmount,
      advance: paymentType === "full" ? enteredAmount : Number(savedData.advance ?? 0),
      bookingDate: bookingDate ? toLocalDateString(bookingDate) : "",
    });
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    setPayNowAmount("");
    const currentAmount = Number(amount || baseAmount || 0);
    if (type === "full") {
      setAdvance(currentAmount);
      saveToLocalStorage({ paymentType: "full", amount: currentAmount, advance: currentAmount, remainingAmount: 0, status: "Approved" });
    }
    if (type === "advance") {
      let advanceAmt = 0;
      if (specialPurpose && SPECIAL_ADVANCE[specialPurpose]) {
        advanceAmt = SPECIAL_ADVANCE[specialPurpose];
        setPayNowAmount(String(advanceAmt));
      }
      setAdvance(advanceAmt);
      saveToLocalStorage({ paymentType: "advance", amount: currentAmount, advance: advanceAmt, originalAdvance: advanceAmt, remainingAmount: Math.max(currentAmount - advanceAmt, 0) });
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

  /* ==========================================
     DATE PICKER PROPS
  ========================================== */
  const regularDatePickerProps = {
    selected: bookingDate,
    onChange: handleDatePickerChange,
    filterDate: isDateSelectable,
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: bookingsLoading ? "Loading available dates..." : "Select booking date (dd-mm-yyyy)",
    className: "input",
    required: true,
    isClearable: true,
    disabled: bookingsLoading,
    calendarClassName: "custom-datepicker",
    // Highlight utsav dates in red so user knows why they are blocked
    highlightDates: [
      {
        "react-datepicker__day--utsav-blocked": getAllUtsavDates().map((d) => new Date(d)),
      }
    ],
  };

  const specialDatePickerProps = {
    selected: bookingDate,
    onChange: handleDatePickerChange,
    filterDate: isSpecialDateSelectable,
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select booking date (dd-mm-yyyy)",
    className: "input",
    required: true,
    isClearable: true,
    disabled: !selectedUtsav || !specialPurpose || !paymentType,
    calendarClassName: "custom-datepicker",
    highlightDates: utsavDates
      .filter((d) => new Date(d) >= new Date(new Date().setHours(0, 0, 0, 0)))
      .map((d) => new Date(d)),
  };

  // Abhishek inline calendar — same style as regular
  const abhishekDatePickerProps = {
    onChange: handleAbhishekDateToggle,
    filterDate: isAbhishekDateSelectable,
    highlightDates: [
      {
        "react-datepicker__day--highlighted-custom": abhishekDates,
      },
      {
        "react-datepicker__day--booked": getBookedAbhishekDates(),
      }
    ],
    minDate: new Date(),
    inline: true,
    calendarClassName: "custom-datepicker abhishek-calendar",
  };

  const activeUtsavList = getActiveUtsavList();

  /* ==========================================
     UI
  ========================================== */
  return (
    <div className="db-section">

      {/* SECTION HEADER */}
      <div className="pd-section-header">
        <span className="pd-section-icon">🎯</span>
        <div>
          <h3 className="pd-section-title">Purpose / उद्देश</h3>
          <p className="pd-section-sub">Select event type and booking purpose</p>
        </div>
      </div>

      {/* ── EVENT TYPE BUTTONS ── */}
      <div className="pd-field-group">
        <label className="pd-label">Event Type / कार्यक्रम प्रकार</label>
        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
          {[
            { key: "special", icon: "✨", en: "Special Events", mr: "विशेष कार्यक्रम" },
            { key: "regular", icon: "📋", en: "Regular Events", mr: "नियमित कार्यक्रम" },
          ].map(({ key, icon, en, mr }) => (
            <button
              key={key}
              type="button"
              disabled={isEditMode}
              onClick={() => handleEventTypeChange(key)}
              className={`pd-pay-btn ${eventType === key ? "pd-pay-full" : ""}`}
              style={{ flex: 1, border: `2px solid ${eventType === key ? "#f97316" : "#e5e7eb"}` }}
            >
              <span className="pd-pay-icon">{icon}</span>
              <span>{en}</span>
              <small>{mr}</small>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════
          SPECIAL EVENTS FLOW
      ══════════════════════════════════ */}
      {eventType === "special" && (
        <div className="pd-special-flow">

          {/* Utsav Dropdown — only active utsavs, date range shown in option */}
          <div className="pd-field-group">
            <label className="pd-label">Utsav / उत्सव</label>
            <select className="input" value={selectedUtsav} onChange={handleUtsavChange} disabled={isEditMode}>
              <option value="">Select Utsav / उत्सव निवडा</option>
              {activeUtsavList.map((utsav, index) => {
                const dates = Array.isArray(utsav.dates)
                  ? utsav.dates
                  : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
                const dateRange = formatUtsavDateRange(dates);
                return (
                  <option key={index} value={utsav.name}>
                    {utsav.name}{dateRange ? ` (${dateRange})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedUtsav && (
            <>
              {/* Bhandara Type Buttons */}
              <div className="pd-field-group">
                <label className="pd-label">Bhandara Type / भंडारा प्रकार</label>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                  {["Full Bhandara / पूर्ण भंडारा", "Half Bhandara / अर्ध भंडारा"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={isEditMode}
                      onClick={() => handleSpecialPurposeChange(item)}
                      className={`pd-pay-btn ${specialPurpose === item ? "pd-pay-full" : ""}`}
                      style={{ flex: 1, border: `2px solid ${specialPurpose === item ? "#f97316" : "#e5e7eb"}` }}
                    >
                      <span className="pd-pay-icon">{item.includes("Full") ? "🍱" : "🥗"}</span>
                      <span>{item.split("/")[0].trim()}</span>
                      <small>₹{(SPECIAL_AMOUNTS[item] || 0).toLocaleString("en-IN")}</small>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {specialPurpose && (
            <div className="pd-amount-card">
              <span className="pd-amount-label">Fixed Amount / निश्चित रक्कम</span>
              <span className="pd-amount-value">₹{(SPECIAL_AMOUNTS[specialPurpose] || 0).toLocaleString("en-IN")}</span>
            </div>
          )}

          {/* Payment Type Buttons */}
          {selectedUtsav && specialPurpose && !paymentType && (
            <div className="pd-payment-options">
              <button type="button" className="pd-pay-btn pd-pay-full" onClick={() => handlePaymentTypeChange("full")}>
                <span className="pd-pay-icon">💰</span>
                <span>Full Payment</span>
                <small>₹{(SPECIAL_AMOUNTS[specialPurpose] || 0).toLocaleString("en-IN")}</small>
              </button>
              <button type="button" className="pd-pay-btn pd-pay-advance" onClick={() => handlePaymentTypeChange("advance")}>
                <span className="pd-pay-icon">📋</span>
                <span>Advance Payment</span>
                <small>₹{(SPECIAL_ADVANCE[specialPurpose] || 0).toLocaleString("en-IN")} now</small>
              </button>
            </div>
          )}

          {selectedUtsav && specialPurpose && paymentType && (
            <>
              {paymentType === "advance" && (
                <>
                  <div className="pd-field-group">
                    <label className="pd-label">Advance Amount / आगाऊ रक्कम</label>
                    <input
                      type="number" className="input"
                      placeholder="Enter Advance Amount"
                      min="1" max={SPECIAL_AMOUNTS[specialPurpose]}
                      value={payNowAmount} onChange={handlePayNowChange}
                    />
                  </div>
                  <div className="pd-remaining-box">
                    <span>Remaining / उर्वरित</span>
                    <span className="pd-remaining-value">
                      ₹{Math.max((SPECIAL_AMOUNTS[specialPurpose] || 0) - Number(payNowAmount || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
              {(paymentType === "full" || (paymentType === "advance" && Number(payNowAmount) > 0)) && (
                <div className="pd-field-group">
                  <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                  <DatePicker {...specialDatePickerProps} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          REGULAR EVENTS FLOW
      ══════════════════════════════════ */}
      {eventType === "regular" && (
        <div className="pd-regular-flow">

          <div className="pd-field-group">
            <label className="pd-label">Purpose / उद्देश</label>
            <select
              className="input" value={purpose} onChange={handlePurposeChange}
              disabled={isEditMode}
              style={{ backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff", cursor: isEditMode ? "not-allowed" : "pointer", opacity: isEditMode ? 0.8 : 1 }}
            >
              <option value="">Choose Purpose / उद्देश निवडा</option>
              {regularPurposes.map((item, index) => (
                <option key={index} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* ── ABHISHEK FLOW ── */}
          {isAbhishek && (
            <>
              {/* Abhishek Type Dropdown */}
              <div className="pd-field-group">
                <label className="pd-label">Abhishek Type / अभिषेक प्रकार *</label>
                <select
                  className="input"
                  value={abhishekType}
                  onChange={handleAbhishekTypeChange}
                  disabled={isEditMode}
                >
                  <option value="">Select Abhishek Type / अभिषेक प्रकार निवडा</option>
                  {abhishekTypes.map((item, index) => (
                    <option key={index} value={item.name}>
                      {item.name} — ₹{item.amount.toLocaleString("en-IN")}
                      {item.slots ? ` (${item.slots} slots/day)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gotra — only after abhishek type selected */}
              {abhishekType && (
                <div className="pd-field-group">
                  <label className="pd-label">Gotra / गोत्र</label>
                  <select
                    className="input"
                    value={abhishekGotra === "" || ABHISHEK_GOTRAS.includes(abhishekGotra) ? abhishekGotra : "Other"}
                    onChange={(e) => {
                      if (e.target.value === "Other") {
                        setAbhishekGotra("Other");
                        saveToLocalStorage({ abhishekGotra: "Other" });
                      } else {
                        handleAbhishekGotraChange(e);
                      }
                    }}
                    disabled={isEditMode}
                  >
                    <option value="">Select Gotra / गोत्र निवडा</option>
                    {ABHISHEK_GOTRAS.map((gotra, index) => (
                      <option key={index} value={gotra}>{gotra}</option>
                    ))}
                  </select>

                  {/* Show text input when Other is selected */}
                  {(abhishekGotra === "Other" || (!ABHISHEK_GOTRAS.slice(0, -1).includes(abhishekGotra) && abhishekGotra !== "")) && (
                    <input
                      className="input"
                      style={{ marginTop: "8px" }}
                      placeholder="Enter your Gotra / गोत्र प्रविष्ट करा"
                      value={abhishekGotra === "Other" ? "" : abhishekGotra}
                      onChange={(e) => {
                        setAbhishekGotra(e.target.value);
                        saveToLocalStorage({ abhishekGotra: e.target.value });
                      }}
                    />
                  )}
                </div>
              )}

              {/* Price per date — only after abhishek type selected */}
              {abhishekType && (
                <div className="pd-field-group">
                  <label className="pd-label">Price per Date / प्रति तारीख किंमत *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter price per date"
                    min="1"
                    value={pricePerDate}
                    readOnly
                    style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                    onChange={handlePricePerDateChange}
                  />
                </div>
              )}

              {/* Multi-date calendar — same style as regular calendar */}
              {abhishekType && pricePerDate && Number(pricePerDate) > 0 && (
                <>
                  <div className="pd-field-group">
                    <label className="pd-label">
                      Select Dates / तारखा निवडा * — click to select/deselect
                    </label>
                    <DatePicker {...abhishekDatePickerProps} />
                  </div>

                  {/* Selected date tags */}
                  {abhishekDates.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                      {abhishekDates.slice().sort((a, b) => a - b).map((date, i) => {
                        const str = toLocalDateString(date);
                        return (
                          <span key={i} style={{
                            background: "#fff7ed", border: "1px solid #f97316",
                            color: "#f97316", borderRadius: "8px", padding: "4px 10px",
                            fontSize: "13px", fontWeight: "600",
                            display: "inline-flex", alignItems: "center", gap: "6px",
                          }}>
                            {str}
                            <button
                              onClick={() => handleAbhishekDateToggle(date)}
                              style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontWeight: "700", fontSize: "14px", padding: 0, lineHeight: 1 }}
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {abhishekDates.length > 0 && (
                    <div className="pd-amount-card">
                      <span className="pd-amount-label">
                        Total ({abhishekDates.length} date{abhishekDates.length > 1 ? "s" : ""} × ₹{Number(pricePerDate).toLocaleString("en-IN")})
                      </span>
                      <span className="pd-amount-value">₹{abhishekTotal.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* DONATION */}
          {isDonation && (
            <>
              {Number(amount) > 0 && (
                <div className="pd-amount-card">
                  <span className="pd-amount-label">Amount / रक्कम</span>
                  <span className="pd-amount-value">₹{Number(amount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pd-field-group">
                <label className="pd-label">Enter Amount / रक्कम टाका</label>
                <input type="number" className="input" placeholder="Enter Amount" min="1" value={amount} onChange={handleAmountChange} />
              </div>
              <div className="pd-field-group">
                <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                <DatePicker {...regularDatePickerProps} />
              </div>
            </>
          )}

          {/* REGULAR SPECIAL — Full/Half Bhandara */}
          {isRegularSpecial && (
            <>
              {baseAmount > 0 && (
                <div className="pd-amount-card">
                  <span className="pd-amount-label">Amount / रक्कम</span>
                  <span className="pd-amount-value">₹{baseAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {!paymentType && (
                <div className="pd-payment-options">
                  <button type="button" className="pd-pay-btn pd-pay-full" onClick={() => handlePaymentTypeChange("full")}>
                    <span className="pd-pay-icon">💰</span>
                    <span>Full Payment</span>
                    <small>₹{baseAmount.toLocaleString("en-IN")}</small>
                  </button>
                  <button type="button" className="pd-pay-btn pd-pay-advance" onClick={() => handlePaymentTypeChange("advance")}>
                    <span className="pd-pay-icon">📋</span>
                    <span>Advance Payment</span>
                  </button>
                </div>
              )}
              {paymentType === "full" && (
                <div className="pd-field-group">
                  <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                  <DatePicker {...regularDatePickerProps} />
                </div>
              )}
              {paymentType === "advance" && (
                <>
                  {isEditMode && (
                    <div className="pd-amount-card">
                      <span className="pd-amount-label">Paid Amount / भरलेली रक्कम</span>
                      <span className="pd-amount-value">₹{previousPaidAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="pd-field-group">
                    <label className="pd-label">Pay Now / आता भरा</label>
                    <input type="number" className="input" placeholder="Enter Amount to Pay Now" min="1" max={currentRemainingAmount} value={payNowAmount} onChange={handlePayNowChange} />
                  </div>
                  <div className="pd-remaining-box">
                    <span>Remaining / उर्वरित</span>
                    <span className="pd-remaining-value">₹{remainingAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="pd-field-group">
                    <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                    <DatePicker {...regularDatePickerProps} />
                  </div>
                </>
              )}
            </>
          )}

          {/* SHIRAPASAD */}
          {isShirapasad && (
            <>
              <div className="pd-info-tag">✅ Full Payment Only — ₹5,001</div>
              <div className="pd-field-group">
                <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                <DatePicker {...regularDatePickerProps} />
              </div>
            </>
          )}

          {/* FIXED WITH CALENDAR — Vidaprasad only */}
          {purpose === "Vidaprasad / विडाप्रसाद (₹251)" && (
            <div className="pd-field-group">
              <label className="pd-label">Booking Date / बुकिंग तारीख</label>
              <DatePicker {...regularDatePickerProps} />
            </div>
          )}

          {/* NO CALENDAR — 2/3/4 Wheeler + गाडीपुजा */}
          {isNoCalendar && purpose !== "Vidaprasad / विडाप्रसाद (₹251)" && (
            <div className="pd-info-tag">
              ✅ Amount: ₹{baseAmount.toLocaleString("en-IN")} — No date selection required
            </div>
          )}
        </div>
      )}
    </div>
  );
}