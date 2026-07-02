import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import apiRequest from "../services/api";

const { ipcRenderer } = typeof window !== "undefined" && window.require
  ? window.require("electron")
  : { ipcRenderer: null };

// ── Marathi number-to-words ────────────────────────────────────────────────
const ones = [
  "", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ",
  "दहा", "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस",
  "वीस", "एकवीस", "बावीस", "तेवीस", "चोवीस", "पंचवीस", "सव्वीस", "सत्तावीस",
  "अठ्ठावीस", "एकोणतीस", "तीस", "एकतीस", "बत्तीस", "तेहतीस", "चौतीस",
  "पस्तीस", "छत्तीस", "सदतीस", "अडतीस", "एकोणचाळीस", "चाळीस", "एकेचाळीस",
  "बेचाळीस", "त्रेचाळीस", "चव्वेचाळीस", "पंचेचाळीस", "सेहेचाळीस", "सत्तेचाळीस",
  "अठ्ठेचाळीस", "एकोणपन्नास", "पन्नास", "एकावन्न", "बावन्न", "त्रेपन्न",
  "चोपन्न", "पंचावन्न", "छप्पन्न", "सत्तावन्न", "अठ्ठावन्न", "एकोणसाठ", "साठ",
  "एकसष्ट", "बासष्ट", "त्रेसष्ट", "चौसष्ट", "पासष्ट", "सहासष्ट", "सदुसष्ट",
  "अडुसष्ट", "एकोणसत्तर", "सत्तर", "एकाहत्तर", "बाहत्तर", "त्र्याहत्तर",
  "चौर्‍याहत्तर", "पंच्याहत्तर", "छ्याहत्तर", "सत्त्याहत्तर", "अठ्ठ्याहत्तर",
  "एकोणऐंशी", "ऐंशी", "एक्याऐंशी", "ब्याऐंशी", "त्र्याऐंशी", "चौऱ्याऐंशी",
  "पंच्याऐंशी", "शहाऐंशी", "सत्त्याऐंशी", "अठ्ठ्याऐंशी", "एकोणनव्वद",
  "नव्वद", "एक्याण्णव", "ब्याण्णव", "त्र्याण्णव", "चौऱ्याण्णव", "पंच्याण्णव",
  "शहाण्णव", "सत्त्याण्णव", "अठ्ठ्याण्णव", "नव्याण्णव",
];
const hundreds = ["", "शंभर", "दोनशे", "तीनशे", "चारशे", "पाचशे", "सहाशे", "सातशे", "आठशे", "नऊशे"];

function threeDigitMarathi(n) {
  if (n === 0) return "";
  if (n < 100) return ones[n];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return hundreds[h] + (rem ? " " + ones[rem] : "");
}

function numberToWordsMarathi(num) {
  const n = Math.round(Number(num) || 0);
  if (!n) return "";
  let remaining = n;
  const crore    = Math.floor(remaining / 10000000); remaining %= 10000000;
  const lakh     = Math.floor(remaining / 100000);   remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);     remaining %= 1000;
  const rest     = remaining;
  const parts = [];
  if (crore)    parts.push(threeDigitMarathi(crore)    + " कोटी");
  if (lakh)     parts.push(threeDigitMarathi(lakh)     + " लाख");
  if (thousand) parts.push(threeDigitMarathi(thousand) + " हजार");
  if (rest)     parts.push(threeDigitMarathi(rest));
  return parts.join(" ") + " रुपये फक्त";
}

function formatDateMarathi(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const dd   = d.getDate().toLocaleString("mr-IN");
  const mm   = (d.getMonth() + 1).toLocaleString("mr-IN");
  const yyyy = d.getFullYear().toLocaleString("mr-IN");
  return `${String(dd).padStart(2, "०")}/${String(mm).padStart(2, "०")}/${yyyy}`;
}

function formatAmount(value) {
  const n = Number(value);
  return !isNaN(n) && n > 0 ? n.toLocaleString("en-IN") : "";
}

// ── Field Row component ───────────────────────────────────────────────────
function Field({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "3px",
    }}>
      <span style={{
        fontSize: "10px",
        fontWeight: 700,
        color: "#a07850",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>{label}</span>
      <span style={{
        fontSize: highlight ? "16px" : "14px",
        fontWeight: highlight ? 800 : 500,
        color: highlight ? "#c2410c" : "#1c0f00",
        fontFamily: "inherit",
      }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptPrint() {
  const router = useRouter();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastBooking");
    if (saved) {
      const parsed = JSON.parse(saved);
      setBooking(parsed);

      if ((parsed.bank === "UPI" || parsed.receiptType === "Tax") && !parsed.utrNumber) {
        apiRequest(`/get_booking?bookingId=${parsed.bookingId}`)
          .then((res) => {
            if (res.booking) setBooking(res.booking);
          })
          .catch(() => {});
      }
    }
  }, []);

  const handlePrint = () => {
    if (ipcRenderer) {
      ipcRenderer.send("print-receipt");
    } else {
      window.print();
    }
  };

  if (!booking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#fdf8f3", fontFamily: "Arial, sans-serif",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🪔</div>
        <p style={{ color: "#a07850", fontSize: "15px", marginBottom: "20px" }}>No receipt data found.</p>
        <button
          onClick={() => router.back()}
          style={{
            background: "#5c1a00", color: "#fff", border: "none",
            padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
          }}
        >← Back</button>
      </div>
    );
  }

  // ── Field mapping ─────────────────────────────────────────────────────────
  const receiptNo    = booking.bookingId || booking.receiptId || "";
  const date         = formatDateMarathi(booking.bookingDate || booking.date);
  const name         = booking.name || "";
  const phone        = booking.phone || "";
  const address      = booking.address || "";
  const purpose      = booking.purpose || "";
  const gotra        = booking.gotra || "";
  const paymentMode  = booking.bank || booking.paymentType || "";
  const chequeNo     = booking.chequeNumber || "";
  const utrNo        = booking.utrNumber || "";
  const showCheque   = paymentMode === "Cheque" && chequeNo;
  const showUTR      = paymentMode === "UPI" && utrNo;
  const paidAmt      = booking.paidAmount ?? booking.advance ?? booking.amount ?? 0;
  const paidDisplay  = formatAmount(paidAmt);
  const paidWords    = numberToWordsMarathi(paidAmt);
  const remaining    = Number(booking.remainingAmount || 0);
  const hasBalance   = remaining > 0;
  const balanceDisplay = formatAmount(remaining);

  // Receipt type badge
  const receiptType  = booking.receiptType || "Internal";
  const isInternal   = receiptType === "Internal";

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: "Segoe UI", Arial, sans-serif;
          background: #fdf6ee;
          min-height: 100vh;
        }

        /* ── TOP NAVBAR ── */
        .rp-nav {
          background: #3d1400;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .rp-nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rp-nav-logo {
          font-size: 20px;
        }

        .rp-nav-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffe4b5;
          letter-spacing: 0.3px;
        }

        .rp-nav-sub {
          font-size: 11px;
          color: #c49a6c;
          font-weight: 400;
        }

        .rp-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .rp-btn-back {
          background: transparent;
          color: #ffe4b5;
          border: 1px solid rgba(255,228,181,0.3);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .rp-btn-back:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,228,181,0.6);
        }

        .rp-btn-print {
          background: #f97316;
          color: #fff;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 2px 8px rgba(249,115,22,0.4);
          transition: all 0.2s;
        }

        .rp-btn-print:hover {
          background: #ea580c;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(249,115,22,0.4);
        }

        /* ── PAGE BODY ── */
        .rp-page {
          max-width: 760px;
          margin: 32px auto;
          padding: 0 20px 60px;
        }

        /* ── RECEIPT HEADER CARD ── */
        .rp-header-card {
          background: linear-gradient(135deg, #3d1400 0%, #6b2700 100%);
          border-radius: 16px 16px 0 0;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .rp-org-name {
          font-size: 18px;
          font-weight: 800;
          color: #ffe4b5;
          line-height: 1.3;
          letter-spacing: -0.3px;
        }

        .rp-org-sub {
          font-size: 12px;
          color: #c49a6c;
          margin-top: 3px;
        }

        .rp-receipt-badge {
          background: rgba(255,228,181,0.15);
          border: 1px solid rgba(255,228,181,0.3);
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #ffe4b5;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── RECEIPT BODY CARD ── */
        .rp-body-card {
          background: #fff;
          border: 1px solid #e8ddd2;
          border-top: none;
          border-radius: 0 0 16px 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(93,40,0,0.08);
        }

        /* ── ID BAR ── */
        .rp-id-bar {
          background: #fff7ed;
          border-bottom: 1px solid #fed7aa;
          padding: 14px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rp-receipt-no {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rp-receipt-no-label {
          font-size: 10px;
          font-weight: 700;
          color: #a07850;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rp-receipt-no-value {
          font-size: 18px;
          font-weight: 800;
          color: #c2410c;
          letter-spacing: 0.5px;
        }

        .rp-date-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .rp-date-label {
          font-size: 10px;
          font-weight: 700;
          color: #a07850;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rp-date-value {
          font-size: 14px;
          font-weight: 700;
          color: #1c0f00;
        }

        /* ── FIELDS GRID ── */
        .rp-fields {
          padding: 24px 28px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 32px;
        }

        .rp-field-full {
          grid-column: 1 / -1;
        }

        .rp-field-label {
          font-size: 10px;
          font-weight: 700;
          color: #a07850;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .rp-field-value {
          font-size: 14px;
          font-weight: 500;
          color: #1c0f00;
          line-height: 1.4;
        }

        .rp-field-value--bold {
          font-size: 15px;
          font-weight: 700;
        }

        /* ── DIVIDER ── */
        .rp-divider {
          height: 1px;
          background: #f0ece6;
          margin: 0 28px;
        }

        /* ── AMOUNT SECTION ── */
        .rp-amount-section {
          padding: 20px 28px;
          display: flex;
          align-items: stretch;
          gap: 16px;
          background: #fffcf8;
        }

        .rp-amount-words {
          flex: 1;
          background: #fff7ed;
          border: 1.5px solid #fed7aa;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .rp-amount-words-label {
          font-size: 10px;
          font-weight: 700;
          color: #a07850;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .rp-amount-words-value {
          font-size: 13px;
          font-weight: 600;
          color: #92400e;
          line-height: 1.5;
          font-style: italic;
        }

        .rp-amount-box {
          background: #3d1400;
          border-radius: 12px;
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          gap: 4px;
        }

        .rp-amount-box-label {
          font-size: 10px;
          font-weight: 700;
          color: #c49a6c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rp-amount-box-value {
          font-size: 22px;
          font-weight: 800;
          color: #ffe4b5;
          letter-spacing: -0.5px;
        }

        /* ── BALANCE / CHEQUE SECTION ── */
        .rp-extra-section {
          padding: 16px 28px;
          border-top: 1px solid #f0ece6;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rp-extra-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .rp-extra-pill--balance {
          background: #fef3c7;
          border: 1.5px solid #fde68a;
          color: #92400e;
        }

        .rp-extra-pill--cheque {
          background: #eff6ff;
          border: 1.5px solid #bfdbfe;
          color: #1e40af;
        }

        .rp-extra-pill--utr {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          color: #14532d;
        }

        /* ── FOOTER ── */
        .rp-footer {
          padding: 16px 28px;
          border-top: 1px solid #f0ece6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rp-payment-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          color: #15803d;
        }

        .rp-footer-hint {
          font-size: 11px;
          color: #c49a6c;
          font-style: italic;
        }

        /* ── PRINT NOTICE ── */
        .rp-print-notice {
          margin-top: 20px;
          text-align: center;
          color: #a07850;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        /* ── PRINT ONLY FIELDS ── */
        .print-only { display: none; }

        /* ── PRINT STYLES ── */
        @page {
          size: 185mm 125mm;
          margin: 0;
        }

        @media print {
          .rp-nav,
          .rp-page > *:not(.receipt-print-target),
          .rp-print-notice { display: none !important; }

          body { background: transparent; margin: 0; }

          .receipt-print-target {
            display: block !important;
            position: absolute;
            top: 0; left: 0;
            width: 185mm; height: 125mm;
            background: transparent;
          }

          .rp-header-card,
          .rp-body-card,
          .rp-id-bar,
          .rp-fields,
          .rp-divider,
          .rp-amount-section,
          .rp-extra-section,
          .rp-footer { display: none !important; }

          .print-only {
            display: block !important;
            position: absolute;
            color: #000;
          }

          .r-receiptno  { top: 30mm; left: 28mm;  font-size: 10pt; font-weight: bold; }
          .r-date       { top: 30mm; left: 128mm; font-size: 10pt; font-weight: bold; }
          .r-name       { top: 37mm; left: 42mm;  font-size: 11pt; font-weight: bold; }
          .r-address    { top: 43mm; left: 15mm;  font-size: 10pt; width: 90mm; }
          .r-phone      { top: 48mm; left: 132mm; font-size: 10pt; }
          .r-purpose    { top: 54mm; left: 36mm;  font-size: 10pt; width: 88mm; }
          .r-amountwords { top: 60mm; left: 15mm; font-size: 10pt; width: 95mm; }
          .r-gotra      { top: 66mm; left: 15mm;  font-size: 10pt; }
          .r-paymentmode { top: 66mm; left: 60mm; font-size: 10pt; }
          .r-amount     { top: 65mm; left: 138mm; font-size: 13pt; font-weight: bold; text-align: center; width: 30mm; }
          .r-balance    { top: 75mm; left: 10mm;  font-size: 10pt; font-weight: bold; }
          .r-chequeno   { top: 81mm; left: 10mm;  font-size: 10pt; font-weight: bold; }
          .r-utrno      { top: 81mm; left: 10mm;  font-size: 10pt; font-weight: bold; }
        }
      `}</style>

      {/* ── TOP NAV ── */}
      <div className="rp-nav">
        <div className="rp-nav-left">
          <span className="rp-nav-logo">🪔</span>
          <div>
            <div className="rp-nav-title">श्री स्वामी समर्थ सेवा परिवार</div>
            <div className="rp-nav-sub">Receipt Preview — पावती पूर्वावलोकन</div>
          </div>
        </div>
        <div className="rp-nav-actions">
          <button className="rp-btn-back" onClick={() => router.back()}>← Back</button>
          <button className="rp-btn-print" onClick={handlePrint}>
            🖨 Print Receipt
          </button>
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div className="rp-page">

        {/* RECEIPT CARD — screen preview */}
        <div>
          {/* Header */}
          <div className="rp-header-card">
            <div>
              <div className="rp-org-name">श्री स्वामी समर्थ सेवा परिवार, भुईगांव-वसई</div>
              <div className="rp-org-sub">एखाद आळी, मु.भुईगांव, ता.पो.वसई, जि.पालघर ४०१२०१</div>
            </div>
            <div className="rp-receipt-badge">
              {isInternal ? "🪙 Internal Receipt" : "📄 Tax Receipt"}
            </div>
          </div>

          {/* Body */}
          <div className="rp-body-card">

            {/* ID bar */}
            <div className="rp-id-bar">
              <div className="rp-receipt-no">
                <span className="rp-receipt-no-label">पावती क्रमांक / Receipt No</span>
                <span className="rp-receipt-no-value">{receiptNo || "—"}</span>
              </div>
              <div className="rp-date-box">
                <span className="rp-date-label">दिनांक / Date</span>
                <span className="rp-date-value">{date || "—"}</span>
              </div>
            </div>

            {/* Fields grid */}
            <div className="rp-fields">
              <div className="rp-field-full">
                <div className="rp-field-label">श्री./श्रीमती/मेसर्स — Name</div>
                <div className="rp-field-value rp-field-value--bold">{name || "—"}</div>
              </div>

              <div>
                <div className="rp-field-label">भ्रमणध्वनी / Phone</div>
                <div className="rp-field-value">{phone || "—"}</div>
              </div>

              <div>
                <div className="rp-field-label">गोत्र / Gotra</div>
                <div className="rp-field-value">{gotra || "—"}</div>
              </div>

              <div className="rp-field-full">
                <div className="rp-field-label">पत्ता / Address</div>
                <div className="rp-field-value">{address || "—"}</div>
              </div>

              <div className="rp-field-full">
                <div className="rp-field-label">आपणाकडून / Purpose</div>
                <div className="rp-field-value rp-field-value--bold">{purpose || "—"}</div>
              </div>
            </div>

            <div className="rp-divider" />

            {/* Amount section */}
            <div className="rp-amount-section">
              <div className="rp-amount-words">
                <div className="rp-amount-words-label">रुपये / Amount in Words</div>
                <div className="rp-amount-words-value">{paidWords || "—"}</div>
              </div>
              <div className="rp-amount-box">
                <span className="rp-amount-box-label">₹ Paid</span>
                <span className="rp-amount-box-value">{paidDisplay || "0"}/-</span>
              </div>
            </div>

            {/* Extra info — balance / cheque / utr */}
            {(hasBalance || showCheque || showUTR) && (
              <div className="rp-extra-section">
                {hasBalance && (
                  <span className="rp-extra-pill rp-extra-pill--balance">
                    ⏳ शिल्लक: ₹{balanceDisplay}/-
                  </span>
                )}
                {showCheque && (
                  <span className="rp-extra-pill rp-extra-pill--cheque">
                    📝 धनादेश क्र.: {chequeNo}
                  </span>
                )}
                {showUTR && (
                  <span className="rp-extra-pill rp-extra-pill--utr">
                    ✅ UTR: {utrNo}
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="rp-footer">
              <span className="rp-payment-pill">
                💳 {paymentMode || "Cash"}
              </span>
              <span className="rp-footer-hint">
                नोंदणी क्र.एफ/१५१३/पालघर · मो. ९१६८६०७५५०
              </span>
            </div>

          </div>
        </div>

        <div className="rp-print-notice">
          🖨 &nbsp;Click "Print Receipt" to print on the physical pavti card (18.5cm × 12.5cm)
        </div>

        {/* PRINT-ONLY OVERLAY — absolutely positioned onto physical card */}
        <div className="receipt-print-target" style={{ display: "none" }}>
          <div className="print-only r-receiptno">{receiptNo}</div>
          <div className="print-only r-date">{date}</div>
          <div className="print-only r-name">{name}</div>
          <div className="print-only r-address">{address}</div>
          <div className="print-only r-phone">{phone}</div>
          <div className="print-only r-purpose">{purpose}</div>
          <div className="print-only r-amountwords">{paidWords}</div>
          <div className="print-only r-gotra">{gotra}</div>
          <div className="print-only r-paymentmode">{paymentMode}</div>
          <div className="print-only r-amount">{paidDisplay}/-</div>
          {hasBalance && (
            <div className="print-only r-balance">शिल्लक रक्कम: ₹ {balanceDisplay}/-</div>
          )}
          {showCheque && (
            <div className="print-only r-chequeno">धनादेश क्र.: {chequeNo}</div>
          )}
          {showUTR && (
            <div className="print-only r-utrno">UTR: {utrNo}</div>
          )}
        </div>

      </div>
    </>
  );
}