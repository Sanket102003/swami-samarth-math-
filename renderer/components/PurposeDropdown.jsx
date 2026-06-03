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

const NO_CALENDAR_PURPOSES = [
  "Two Wheeler / दुचाकी (₹251)",
  "Three Wheeler / तीनचाकी (₹351)",
  "Four Wheeler / चारचाकी (₹551)",
  "गाडीपुजा (टे पो, बस इयादी.)",
];

/* ==========================================
   SAFE DATE HELPER — prevents Invalid time value
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
  const [abhishekType, setAbhishekType] = useState("");
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
  const isNoCalendar = NO_CALENDAR_PURPOSES.includes(purpose);
  const isShirapasad = purpose === "Shirapasad / शिराप्रसाद (₹5,001)";
  const isVidaprasad = purpose === "Vidaprasad / विडाप्रसाद (₹251)";
  const normalizedPurpose = purpose.toLowerCase();

  const abhishekTotal =
    pricePerDate && abhishekDates.length
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

  // Display format: dd-MM-yyyy
  const toLocalDateString = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  // DB format: YYYY-MM-DD (safe for backend sorting)
  const toDBDateString = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Format date range for utsav dropdown display
  const formatUtsavDateRange = (dates) => {
    if (!dates || dates.length === 0) return "";
    const sorted = [...dates].sort();
    const fmt = (d) => {
      const parts = d.split("T")[0].split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };
    if (sorted.length === 1) return fmt(sorted[0]);
    return `${fmt(sorted[0])} to ${fmt(sorted[sorted.length - 1])}`;
  };

  // Filter utsavs where at least one date is today or future
  const getActiveUtsavList = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return utsavList.filter((utsav) => {
      const dates = Array.isArray(utsav.dates)
        ? utsav.dates
        : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
      return dates.some((d) => {
        const date = safeDate(d);
        return date && date >= today;
      });
    });
  }, [utsavList]);

  // Get all future utsav dates as YYYY-MM-DD strings (safe)
  const getAllUtsavDates = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allDates = [];
    utsavList.forEach((utsav) => {
      const dates = Array.isArray(utsav.dates)
        ? utsav.dates
        : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
      dates.forEach((d) => {
        const clean = d.split("T")[0].trim();
        const date = safeDate(clean);
        if (date && date >= today) allDates.push(clean);
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
      if (saved.bookingDate) {
        const d = safeDate(saved.bookingDate);
        if (d) setBookingDate(d);
      }
      if (saved.advance !== undefined) setAdvance(Number(saved.advance ?? 0));
      if (saved.paymentType) setPaymentType(saved.paymentType);
      if (saved.eventType) setEventType(saved.eventType);
      if (saved.selectedUtsav) setSelectedUtsav(saved.selectedUtsav);
      if (saved.specialPurpose) setSpecialPurpose(saved.specialPurpose);
      if (saved.abhishekGotra) setAbhishekGotra(saved.abhishekGotra);
      if (saved.abhishekType) setAbhishekType(saved.abhishekType);
      if (saved.pricePerDate) setPricePerDate(saved.pricePerDate);
      if (saved.abhishekDates) {
        const validDates = saved.abhishekDates
          .map((d) => safeDate(d))
          .filter(Boolean);
        setAbhishekDates(validDates);
      }
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
     BOOKED ABHISHEK DATES
  ========================================== */
  const getBookedAbhishekDates = useCallback(() => {
    if (!abhishekType) return [];
    return allBookings
      .filter((b) => {
        const status = (b.status || "").toLowerCase();
        if (status === "cancelled") return false;
        return b.abhishekType === abhishekType;
      })
      .map((b) => safeDate((b.bookingDate || b.date || "").split("T")[0]))
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

      // Block ALL utsav dates
      const allUtsavDates = getAllUtsavDates(); // YYYY-MM-DD strings
      const selectedDBKey = toDBDateString(selected); // YYYY-MM-DD
      if (allUtsavDates.includes(selectedDBKey)) return false;

      const dayOfWeek = selected.getDay();
      if (normalizedPurpose.includes("full bhandara") || normalizedPurpose.includes("half bhandara")) {
        if (dayOfWeek !== 0 && dayOfWeek !== 4) return false;
      }
      if (normalizedPurpose.includes("shirapasad") || normalizedPurpose.includes("vidaprasad")) {
        if (dayOfWeek !== 4) return false;
      }

      const dateKey = toDBDateString(selected);
      const activeBookings = getActiveBookingsForDate(dateKey);

      if (normalizedPurpose.includes("full bhandara") || normalizedPurpose.includes("half bhandara")) {
        const activeFullCount = activeBookings.filter((b) => (b.purpose || "").toLowerCase().includes("full bhandara")).length;
        const activeHalfCount = activeBookings.filter((b) => (b.purpose || "").toLowerCase().includes("half bhandara")).length;
        if (normalizedPurpose.includes("full bhandara")) { if (activeFullCount >= 1 || activeHalfCount >= 1) return false; }
        if (normalizedPurpose.includes("half bhandara")) { if (activeFullCount >= 1 || activeHalfCount >= 2) return false; }
        return true;
      }

      if (normalizedPurpose.includes("shirapasad") || normalizedPurpose.includes("vidaprasad")) {
        const maxLimit = normalizedPurpose.includes("shirapasad") ? Number(settings.shirprasad ?? 3) : Number(settings.vidaprasad ?? 15);
        const count = activeBookings.filter((b) => b.purpose === purpose).length;
        return count < maxLimit;
      }

      return true;
    },
    [purpose, normalizedPurpose, getActiveBookingsForDate, settings, getAllUtsavDates]
  );

  /* ==========================================
     SAFE NORMALIZE — handles UTC timezone shift
     Always parses YYYY-MM-DD as LOCAL date
     (avoids the "off by one day" bug in IST)
  ========================================== */
  const normalizeToLocalYMD = (d) => {
    if (!d) return "";

    // Already a Date object — convert to local YYYY-MM-DD
    if (d instanceof Date) return toDBDateString(d);

    const str = String(d).split("T")[0].trim();

    // YYYY-MM-DD — parse as LOCAL date to avoid UTC shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, day] = str.split("-").map(Number);
      const localDate = new Date(y, m - 1, day);
      return toDBDateString(localDate);
    }

    // DD-MM-YYYY → YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [dd, mm, yyyy] = str.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }

    return str;
  };

  /* ==========================================
     DATE SELECTION — SPECIAL EVENTS
     NO Thursday/Sunday restriction.
     Only dates within admin's utsav range are selectable.
     Already-booked dates are blocked (not just highlighted).
  ========================================== */
  const isSpecialDateSelectable = useCallback(
    (date) => {
      if (!date || !selectedUtsav || !utsavDates.length) return false;

      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      // Convert selected date to YYYY-MM-DD using LOCAL time
      const selectedKey = toDBDateString(selected);

      // Normalize ALL utsav dates using LOCAL time (fixes UTC+5:30 shift)
      const normalizedUtsavDates = utsavDates.map((d) => normalizeToLocalYMD(d));

      // Only allow dates in admin's defined range — NO day-of-week restriction
      if (!normalizedUtsavDates.includes(selectedKey)) return false;

      // Block already fully-booked dates
      if (specialPurpose) {
        const activeOnDate = getActiveBookingsForDate(selectedKey);
        const fullCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("full bhandara")
        ).length;
        const halfCount = activeOnDate.filter((b) =>
          (b.purpose || "").toLowerCase().includes("half bhandara")
        ).length;

        if (specialPurpose.toLowerCase().includes("full bhandara")) {
          if (fullCount >= 1 || halfCount >= 1) return false;
        }
        if (specialPurpose.toLowerCase().includes("half bhandara")) {
          if (fullCount >= 1 || halfCount >= 2) return false;
        }
      }

      return true;
    },
    [selectedUtsav, utsavDates, specialPurpose, getActiveBookingsForDate]
  );

  /* ==========================================
     DATE SELECTION — ABHISHEK
     Block dates reserved for special events (utsav dates). 
     Abhishek cannot be booked on any utsav date.
  ========================================== */
  const isAbhishekDateSelectable = useCallback(
    (date) => {
      if (!date) return false;

      const selected = new Date(date);
      selected.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return false;

      // Block ALL utsav dates for Abhishek too
      const allUtsavDates = getAllUtsavDates(); // returns YYYY-MM-DD strings
      const selectedKey = toDBDateString(selected);
      if (allUtsavDates.includes(selectedKey)) return false;

      // Check slot availability per abhishekType
      const selectedType = abhishekTypes.find((a) => a.name === abhishekType);
      if (selectedType && selectedType.slots) {
        const bookedCount = allBookings.filter((b) => {
          const status = (b.status || "").toLowerCase();
          if (status === "cancelled") return false;
          const bDate = (b.bookingDate || b.date || "").split("T")[0];
          return bDate === selectedKey && b.abhishekType === abhishekType;
        }).length;
        if (bookedCount >= selectedType.slots) return false;
      }

      return true;
    },
    [abhishekType, allBookings, getAllUtsavDates]
  );

  /* ==========================================
     ABHISHEK MULTI-DATE TOGGLE
  ========================================== */
  const handleAbhishekDateToggle = (date) => {
    if (!date) return;
    const dateStr = toDBDateString(date);
    const alreadySelected = abhishekDates.some((d) => toDBDateString(d) === dateStr);

    if (alreadySelected) {
      const newDates = abhishekDates.filter((d) => toDBDateString(d) !== dateStr);
      setAbhishekDates(newDates);
      const newTotal = pricePerDate ? Number(pricePerDate) * newDates.length : 0;
      setBaseAmount(newTotal);
      saveToLocalStorage({ abhishekDates: newDates.map(toDBDateString), amount: newTotal, baseAmount: newTotal, advance: newTotal, remainingAmount: 0 });
      return;
    }

    const selectedType = abhishekTypes.find((a) => a.name === abhishekType);
    if (selectedType && selectedType.slots) {
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
    saveToLocalStorage({ abhishekDates: newDates.map(toDBDateString), amount: newTotal, baseAmount: newTotal, advance: newTotal, remainingAmount: 0 });
  };

  /* ==========================================
     HANDLERS
  ========================================== */
  const handleDatePickerChange = (date) => {
    if (!date) { setBookingDate(null); saveToLocalStorage({ bookingDate: "" }); return; }
    setBookingDate(date);
    saveToLocalStorage({ bookingDate: toDBDateString(date) });
  };

  const handleEventTypeChange = (type) => {
    setEventType(type); setPurpose(""); setBaseAmount(0); setAmount("");
    setBookingDate(null); setAdvance(0); setPaymentType(""); setPayNowAmount("");
    setSelectedUtsav(""); setUtsavDates([]); setSpecialPurpose("");
    setAbhishekGotra(""); setAbhishekType(""); setAbhishekDates([]); setPricePerDate("");
    saveToLocalStorage({ eventType: type, purpose: "", baseAmount: 0, amount: 0, advance: 0, originalAdvance: 0, remainingAmount: 0, bookingDate: "", paymentType: "", selectedUtsav: "", specialPurpose: "", abhishekGotra: "", abhishekType: "", abhishekDates: [], pricePerDate: "", status: "Pending" });
  };

  const handleUtsavChange = (e) => {
    const name = e.target.value;
    setSelectedUtsav(name); setBookingDate(null); setSpecialPurpose(""); setPaymentType(""); setAmount("");
    const found = utsavList.find((u) => u.name === name);
    const dates = found ? (Array.isArray(found.dates) ? found.dates : (found.dates || "").split(",").map((d) => d.trim()).filter(Boolean)) : [];
    setUtsavDates(dates);
    saveToLocalStorage({ selectedUtsav: name, bookingDate: "", specialPurpose: "", paymentType: "", amount: 0, advance: 0, remainingAmount: 0 });
  };

  const handleSpecialPurposeChange = (val) => {
    setSpecialPurpose(val); setPaymentType(""); setAmount(""); setBookingDate(null);
    const fixedAmt = SPECIAL_AMOUNTS[val] || 0;
    setBaseAmount(fixedAmt);
    saveToLocalStorage({ specialPurpose: val, purpose: val, baseAmount: fixedAmt, amount: fixedAmt, paymentType: "", advance: 0, remainingAmount: fixedAmt, bookingDate: "" });
  };

  const handlePurposeChange = (e) => {
    const selectedPurpose = e.target.value;
    const selected = regularPurposes.find((p) => p.name === selectedPurpose);
    const fixedAmount = Number(selected?.amount ?? 0);
    setPurpose(selectedPurpose); setBaseAmount(fixedAmount); setAmount("");
    setBookingDate(null); setAdvance(0); setPaymentType(""); setPayNowAmount("");
    setAbhishekGotra(""); setAbhishekType(""); setAbhishekDates([]); setPricePerDate("");
    saveToLocalStorage({ purpose: selectedPurpose, baseAmount: fixedAmount, amount: fixedAmount, advance: 0, originalAdvance: 0, remainingAmount: fixedAmount, bookingDate: "", paymentType: "", abhishekGotra: "", abhishekType: "", abhishekDates: [], pricePerDate: "", status: "Pending" });
  };

  const handleAbhishekTypeChange = (e) => {
    const val = e.target.value;
    setAbhishekType(val); setAbhishekDates([]); setBaseAmount(0);
    const found = abhishekTypes.find((a) => a.name === val);
    const autoPrice = found ? String(found.amount) : "";
    setPricePerDate(autoPrice);
    saveToLocalStorage({ abhishekType: val, abhishekDates: [], pricePerDate: autoPrice, amount: 0, baseAmount: 0, advance: 0, remainingAmount: 0 });
  };

  const handleAbhishekGotraChange = (val) => {
    setAbhishekGotra(val);
    saveToLocalStorage({ abhishekGotra: val });
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    const enteredAmount = Number(value ?? 0);
    setBaseAmount(enteredAmount);
    saveToLocalStorage({ amount: enteredAmount, baseAmount: enteredAmount, advance: paymentType === "full" ? enteredAmount : Number(savedData.advance ?? 0), bookingDate: bookingDate ? toDBDateString(bookingDate) : "" });
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type); setPayNowAmount("");
    const currentAmount = Number(amount || baseAmount || 0);
    if (type === "full") {
      setAdvance(currentAmount);
      saveToLocalStorage({ paymentType: "full", amount: currentAmount, advance: currentAmount, remainingAmount: 0, status: "Approved" });
    }
    if (type === "advance") {
      let advanceAmt = 0;
      if (specialPurpose && SPECIAL_ADVANCE[specialPurpose]) { advanceAmt = SPECIAL_ADVANCE[specialPurpose]; setPayNowAmount(String(advanceAmt)); }
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
     SAFE HIGHLIGHT DATES
  ========================================== */
  const safeUtsavHighlightDates = getAllUtsavDates()
    .map((d) => safeDate(d))
    .filter(Boolean);

  const safeSpecialHighlightDates = utsavDates
    .map((d) => safeDate(d.split("T")[0]))
    .filter((d) => {
      if (!d) return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return d >= today;
    });

  const safeAbhishekSelected = abhishekDates.filter(Boolean);
  const safeAbhishekBooked = getBookedAbhishekDates().filter(Boolean);

  /* ==========================================
     UTSAV NAME HELPER
  ========================================== */
  const getUtsavNameForDate = (date) => {
    if (!date || !utsavList.length) return undefined;
    // Use local date parts to avoid UTC shift
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${d}`;

    const found = utsavList.find((u) => {
      const dates = Array.isArray(u.dates)
        ? u.dates
        : (u.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
      return dates.some((d) => d.split("T")[0].trim() === dateKey);
    });

    return found ? found.name : undefined;
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
    className: "pd-date-input",
    required: true,
    isClearable: true,
    disabled: bookingsLoading,
    calendarClassName: "pd-calendar",
    highlightDates: safeUtsavHighlightDates.length > 0
      ? [{ "react-datepicker__day--utsav-blocked": safeUtsavHighlightDates }]
      : [],
    renderDayContents: (day, date) => {
      const utsavName = getUtsavNameForDate(date);
      return (
        <span title={utsavName || ""}>
          {day}
        </span>
      );
    },
  };

  const specialDatePickerProps = {
    selected: bookingDate,
    onChange: handleDatePickerChange,
    filterDate: isSpecialDateSelectable,
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select booking date (dd-mm-yyyy)",
    className: "pd-date-input",
    required: true,
    isClearable: true,
    disabled: !selectedUtsav || !specialPurpose || !paymentType,
    calendarClassName: "pd-calendar",
    highlightDates: safeSpecialHighlightDates.length > 0 ? safeSpecialHighlightDates : [],
  };

  const abhishekDatePickerProps = {
    selected: null,
    onChange: handleAbhishekDateToggle,
    filterDate: isAbhishekDateSelectable,
    highlightDates: [
      ...(safeAbhishekSelected.length > 0 ? [{ "react-datepicker__day--abhishek-selected": safeAbhishekSelected }] : []),
      ...(safeAbhishekBooked.length > 0 ? [{ "react-datepicker__day--abhishek-booked": safeAbhishekBooked }] : []),
      ...(safeUtsavHighlightDates.length > 0 ? [{ "react-datepicker__day--utsav-blocked": safeUtsavHighlightDates }] : []),
    ],
    minDate: new Date(),
    dateFormat: "dd-MM-yyyy",
    placeholderText: "Select dates (click to add/remove)",
    className: "pd-date-input",
    isClearable: false,
    calendarClassName: "pd-calendar",
    renderDayContents: (day, date) => {
      const utsavName = getUtsavNameForDate(date);
      return (
        <span title={utsavName || ""}>
          {day}
        </span>
      );
    },
  };

  const activeUtsavList = getActiveUtsavList();

  /* ==========================================
     UI
  ========================================== */
  return (
    <div className="pd-root">

      {/* ── SECTION HEADER ── */}
      <div className="pd-header">
        <div className="pd-header-icon">🪔</div>
        <div>
          <h3 className="pd-header-title">Purpose / उद्देश</h3>
          <p className="pd-header-sub">Select event type and booking purpose</p>
        </div>
      </div>

      {/* ── EVENT TYPE SELECTOR ── */}
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

      {/* ══════════════════════
          SPECIAL EVENTS
      ══════════════════════ */}
      {eventType === "special" && (
        <div className="pd-flow">

          <div className="pd-field">
            <label className="pd-label">Utsav / उत्सव</label>
            <select className="pd-select" value={selectedUtsav} onChange={handleUtsavChange} disabled={isEditMode}>
              <option value="">— Select Utsav / उत्सव निवडा —</option>
              {activeUtsavList.map((utsav, i) => {
                const dates = Array.isArray(utsav.dates) ? utsav.dates : (utsav.dates || "").split(",").map((d) => d.trim()).filter(Boolean);
                const range = formatUtsavDateRange(dates);
                return (
                  <option key={i} value={utsav.name}>
                    {utsav.name}{range ? ` (${range})` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedUtsav && (
            <div className="pd-field">
              <label className="pd-label">Bhandara Type / भंडारा प्रकार</label>
              <div className="pd-bhandara-grid">
                {["Full Bhandara / पूर्ण भंडारा", "Half Bhandara / अर्ध भंडारा"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={isEditMode}
                    onClick={() => handleSpecialPurposeChange(item)}
                    className={`pd-bhandara-btn ${specialPurpose === item ? "pd-bhandara-btn--active" : ""}`}
                  >
                    <span className="pd-bhandara-icon">{item.includes("Full") ? "🍱" : "🥗"}</span>
                    <span className="pd-bhandara-name">{item.split("/")[0].trim()}</span>
                    <span className="pd-bhandara-amt">₹{(SPECIAL_AMOUNTS[item] || 0).toLocaleString("en-IN")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {specialPurpose && (
            <div className="pd-amount-row pd-amount-row--green">
              <span className="pd-amount-row__label">Fixed Amount / निश्चित रक्कम</span>
              <span className="pd-amount-row__value">₹{(SPECIAL_AMOUNTS[specialPurpose] || 0).toLocaleString("en-IN")}</span>
            </div>
          )}

          {selectedUtsav && specialPurpose && !paymentType && (
            <div className="pd-field">
              <label className="pd-label">Payment Type / पेमेंट प्रकार</label>
              <div className="pd-pay-grid">
                <button type="button" className="pd-pay-btn pd-pay-btn--full" onClick={() => handlePaymentTypeChange("full")}>
                  <span className="pd-pay-icon">💰</span>
                  <span className="pd-pay-title">Full Payment</span>
                  <span className="pd-pay-sub">₹{(SPECIAL_AMOUNTS[specialPurpose] || 0).toLocaleString("en-IN")}</span>
                </button>
                <button type="button" className="pd-pay-btn pd-pay-btn--advance" onClick={() => handlePaymentTypeChange("advance")}>
                  <span className="pd-pay-icon">📋</span>
                  <span className="pd-pay-title">Advance Payment</span>
                  <span className="pd-pay-sub">₹{(SPECIAL_ADVANCE[specialPurpose] || 0).toLocaleString("en-IN")} now</span>
                </button>
              </div>
            </div>
          )}

          {selectedUtsav && specialPurpose && paymentType && (
            <>
              {paymentType === "advance" && (
                <>
                  <div className="pd-field">
                    <label className="pd-label">Advance Amount / आगाऊ रक्कम</label>
                    <input type="number" className="pd-input" placeholder="Enter advance amount" min="1" max={SPECIAL_AMOUNTS[specialPurpose]} value={payNowAmount} onChange={handlePayNowChange} />
                  </div>
                  <div className="pd-amount-row pd-amount-row--amber">
                    <span className="pd-amount-row__label">Remaining / उर्वरित रक्कम</span>
                    <span className="pd-amount-row__value">₹{Math.max((SPECIAL_AMOUNTS[specialPurpose] || 0) - Number(payNowAmount || 0), 0).toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              {(paymentType === "full" || (paymentType === "advance" && Number(payNowAmount) > 0)) && (
                <div className="pd-field">
                  <label className="pd-label">Booking Date / बुकिंग तारीख</label>
                  <DatePicker {...specialDatePickerProps} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════
          REGULAR EVENTS
      ══════════════════════ */}
      {eventType === "regular" && (
        <div className="pd-flow">

          <div className="pd-field">
            <label className="pd-label">Purpose / उद्देश</label>
            <select className="pd-select" value={purpose} onChange={handlePurposeChange} disabled={isEditMode}
              style={{ opacity: isEditMode ? 0.7 : 1, cursor: isEditMode ? "not-allowed" : "pointer" }}>
              <option value="">— Choose Purpose / उद्देश निवडा —</option>
              {regularPurposes.map((item, i) => (
                <option key={i} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* ── ABHISHEK ── */}
          {isAbhishek && (
            <div className="pd-abhishek-flow">

              <div className="pd-field">
                <label className="pd-label">Abhishek Type / अभिषेक प्रकार <span className="pd-required">*</span></label>
                <select className="pd-select" value={abhishekType} onChange={handleAbhishekTypeChange} disabled={isEditMode}>
                  <option value="">— Select Abhishek Type —</option>
                  {abhishekTypes.map((item, i) => (
                    <option key={i} value={item.name}>
                      {item.name} — ₹{item.amount.toLocaleString("en-IN")}{item.slots ? ` (${item.slots} slots/day)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {abhishekType && (
                <>
                  <div className="pd-field">
                    <label className="pd-label">Gotra / गोत्र</label>
                    <select
                      className="pd-select"
                      value={ABHISHEK_GOTRAS.includes(abhishekGotra) ? abhishekGotra : abhishekGotra ? "Other" : ""}
                      onChange={(e) => {
                        if (e.target.value === "Other") { handleAbhishekGotraChange("Other"); }
                        else { handleAbhishekGotraChange(e.target.value); }
                      }}
                      disabled={isEditMode}
                    >
                      <option value="">— Select Gotra / गोत्र निवडा —</option>
                      {ABHISHEK_GOTRAS.map((g, i) => <option key={i} value={g}>{g}</option>)}
                    </select>

                    {(abhishekGotra === "Other" || (abhishekGotra && !ABHISHEK_GOTRAS.slice(0, -1).includes(abhishekGotra))) && (
                      <input
                        className="pd-input"
                        style={{ marginTop: "8px" }}
                        placeholder="Enter Gotra / गोत्र प्रविष्ट करा"
                        value={abhishekGotra === "Other" ? "" : abhishekGotra}
                        onChange={(e) => handleAbhishekGotraChange(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="pd-field">
                    <label className="pd-label">Price per Date / प्रति तारीख किंमत</label>
                    <div className="pd-readonly-field">
                      <span className="pd-readonly-prefix">₹</span>
                      <span className="pd-readonly-value">{pricePerDate ? Number(pricePerDate).toLocaleString("en-IN") : "—"}</span>
                      <span className="pd-readonly-badge">Auto-filled</span>
                    </div>
                  </div>

                  {pricePerDate && Number(pricePerDate) > 0 && (
                    <>
                      <div className="pd-field">
                        <label className="pd-label">
                          Select Dates / तारखा निवडा <span className="pd-required">*</span>
                          <span className="pd-label-hint"> — click to select/deselect</span>
                        </label>
                        <div className="pd-calendar-wrap">
                          <DatePicker {...abhishekDatePickerProps} />
                        </div>
                      </div>

                      {abhishekDates.length > 0 && (
                        <>
                          <div className="pd-date-tags">
                            {abhishekDates.slice().sort((a, b) => a - b).map((date, i) => (
                              <span key={i} className="pd-date-tag">
                                {toLocalDateString(date)}
                                <button className="pd-date-tag__remove" onClick={() => handleAbhishekDateToggle(date)}>×</button>
                              </span>
                            ))}
                          </div>

                          <div className="pd-amount-row pd-amount-row--green">
                            <span className="pd-amount-row__label">
                              Total — {abhishekDates.length} date{abhishekDates.length > 1 ? "s" : ""} × ₹{Number(pricePerDate).toLocaleString("en-IN")}
                            </span>
                            <span className="pd-amount-row__value">₹{abhishekTotal.toLocaleString("en-IN")}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── DONATION ── */}
          {isDonation && (
            <>
              <div className="pd-field">
                <label className="pd-label">Enter Amount / रक्कम टाका <span className="pd-required">*</span></label>
                <input type="number" className="pd-input" placeholder="Enter amount" min="1" value={amount} onChange={handleAmountChange} />
              </div>
              {Number(amount) > 0 && (
                <div className="pd-amount-row pd-amount-row--green">
                  <span className="pd-amount-row__label">Amount / रक्कम</span>
                  <span className="pd-amount-row__value">₹{Number(amount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pd-field">
                <label className="pd-label">Booking Date / बुकिंग तारीख <span className="pd-required">*</span></label>
                <DatePicker {...regularDatePickerProps} />
              </div>
            </>
          )}

          {/* ── FULL/HALF BHANDARA ── */}
          {isRegularSpecial && (
            <>
              {baseAmount > 0 && (
                <div className="pd-amount-row pd-amount-row--green">
                  <span className="pd-amount-row__label">Amount / रक्कम</span>
                  <span className="pd-amount-row__value">₹{baseAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {!paymentType && (
                <div className="pd-field">
                  <label className="pd-label">Payment Type / पेमेंट प्रकार</label>
                  <div className="pd-pay-grid">
                    <button type="button" className="pd-pay-btn pd-pay-btn--full" onClick={() => handlePaymentTypeChange("full")}>
                      <span className="pd-pay-icon">💰</span>
                      <span className="pd-pay-title">Full Payment</span>
                      <span className="pd-pay-sub">₹{baseAmount.toLocaleString("en-IN")}</span>
                    </button>
                    <button type="button" className="pd-pay-btn pd-pay-btn--advance" onClick={() => handlePaymentTypeChange("advance")}>
                      <span className="pd-pay-icon">📋</span>
                      <span className="pd-pay-title">Advance Payment</span>
                      <span className="pd-pay-sub">Pay partial now</span>
                    </button>
                  </div>
                </div>
              )}
              {paymentType === "full" && (
                <div className="pd-field">
                  <label className="pd-label">Booking Date / बुकिंग तारीख <span className="pd-required">*</span></label>
                  <DatePicker {...regularDatePickerProps} />
                </div>
              )}
              {paymentType === "advance" && (
                <>
                  {isEditMode && (
                    <div className="pd-amount-row pd-amount-row--blue">
                      <span className="pd-amount-row__label">Paid Amount / भरलेली रक्कम</span>
                      <span className="pd-amount-row__value">₹{previousPaidAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="pd-field">
                    <label className="pd-label">Pay Now / आता भरा <span className="pd-required">*</span></label>
                    <input type="number" className="pd-input" placeholder="Enter amount to pay now" min="1" max={currentRemainingAmount} value={payNowAmount} onChange={handlePayNowChange} />
                  </div>
                  <div className="pd-amount-row pd-amount-row--amber">
                    <span className="pd-amount-row__label">Remaining / उर्वरित रक्कम</span>
                    <span className="pd-amount-row__value">₹{remainingAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="pd-field">
                    <label className="pd-label">Booking Date / बुकिंग तारीख <span className="pd-required">*</span></label>
                    <DatePicker {...regularDatePickerProps} />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── SHIRAPASAD ── */}
          {isShirapasad && (
            <>
              <div className="pd-badge pd-badge--green">✅ Full Payment Only — ₹5,001</div>
              <div className="pd-field">
                <label className="pd-label">Booking Date / बुकिंग तारीख <span className="pd-required">*</span></label>
                <DatePicker {...regularDatePickerProps} />
              </div>
            </>
          )}

          {/* ── VIDAPRASAD ── */}
          {isVidaprasad && (
            <div className="pd-field">
              <label className="pd-label">Booking Date / बुकिंग तारीख <span className="pd-required">*</span></label>
              <DatePicker {...regularDatePickerProps} />
            </div>
          )}

          {/* ── NO CALENDAR PURPOSES ── */}
          {isNoCalendar && (
            <div className="pd-badge pd-badge--green">
              ✅ Amount: ₹{baseAmount.toLocaleString("en-IN")} — No date selection required
            </div>
          )}

        </div>
      )}
    </div>
  );
}