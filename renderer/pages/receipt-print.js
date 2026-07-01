import { useEffect, useState } from "react";
import { useRouter } from "next/router";

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

const hundreds = [
  "", "शंभर", "दोनशे", "तीनशे", "चारशे", "पाचशे",
  "सहाशे", "सातशे", "आठशे", "नऊशे",
];

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
  const crore   = Math.floor(remaining / 10000000); remaining %= 10000000;
  const lakh    = Math.floor(remaining / 100000);   remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);     remaining %= 1000;
  const rest    = remaining;

  const parts = [];
  if (crore)    parts.push(threeDigitMarathi(crore)    + " कोटी");
  if (lakh)     parts.push(threeDigitMarathi(lakh)     + " लाख");
  if (thousand) parts.push(threeDigitMarathi(thousand) + " हजार");
  if (rest)     parts.push(threeDigitMarathi(rest));

  return parts.join(" ") + " रुपये फक्त";
}

// ── Format date as DD/MM/YYYY in Marathi (Devanagari numerals) ────────────
function formatDateMarathi(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  // Use Marathi locale for Devanagari digits
  const dd = d.getDate().toLocaleString("mr-IN");
  const mm = (d.getMonth() + 1).toLocaleString("mr-IN");
  const yyyy = d.getFullYear().toLocaleString("mr-IN");
  return `${dd.padStart(2, "०")}/${mm.padStart(2, "०")}/${yyyy}`;
}

// ── Format numeric amount ─────────────────────────────────────────────────
function formatAmount(value) {
  const n = Number(value);
  return !isNaN(n) && n > 0 ? n.toLocaleString("en-IN") : "";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptPrint() {
  const router = useRouter();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastBooking");
    if (saved) {
      try { setBooking(JSON.parse(saved)); }
      catch { setBooking(null); }
    }
  }, []);

  if (!booking) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial" }}>
        <p>No receipt data found.</p>
        <button onClick={() => router.back()}>← Back</button>
      </div>
    );
  }

  // ── Field mapping from your InternalReceipt.jsx booking object ────────────
  const receiptNo    = booking.bookingId || booking.receiptId || "";
  const date         = formatDateMarathi(booking.bookingDate || booking.date);  // seva date, not createdAt
  const name         = booking.name || "";
  const phone        = booking.phone || "";
  const address      = booking.address || "";
  const purpose      = booking.purpose || "";
  const gotra        = booking.gotra || "";
  const paymentMode  = booking.bank || booking.paymentType || "";  // Cash / UPI / Cheque

  // Cheque / UPI refs
  const chequeNo = booking.chequeNumber || "";
  const utrNo    = booking.utrNumber || "";
  const showCheque = paymentMode === "Cheque" && chequeNo;
  const showUTR    = paymentMode === "UPI" && utrNo;

  // Paid amount (advance or full)

  const paidAmt      = booking.paidAmount ?? booking.advance ?? booking.amount ?? 0;
  const paidDisplay  = formatAmount(paidAmt);
  const paidWords    = numberToWordsMarathi(paidAmt);

  // Remaining balance (only for advance bookings)
  const remaining    = Number(booking.remainingAmount || 0);
  const hasBalance   = remaining > 0;
  const balanceDisplay = formatAmount(remaining);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #fff; }

        /* ── SCREEN CONTROLS ── */
        #controls {
          padding: 12px 16px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        #controls span { font-size: 13px; color: #555; flex: 1; }
        #controls button {
          background: #1a73e8; color: white;
          border: none; padding: 8px 20px;
          border-radius: 6px; font-size: 13px; cursor: pointer;
        }
        #controls button.back-btn { background: #666; }
        #controls button:hover { opacity: 0.85; }

        /* ── SCREEN PREVIEW ── */
        .receipt-card {
          border: 1px solid #c00;
          border-radius: 4px;
          padding: 12px 16px;
          margin: 16px;
          background: #fffdf8;
          position: relative;
          min-height: 160px;
        }
        .r-row { font-size: 13px; color: #444; margin-top: 4px; }
        .r-label { font-size: 11px; color: #999; }

        /* Print-only fields hidden on screen */
        .print-only { display: none; }

        /* ── PRINT STYLES — 18.5cm x 12.5cm pavti card overlay ── */
        @page {
          size: 185mm 125mm;
          margin: 0;
        }

        @media print {
          #controls { display: none !important; }
          body { margin: 0; }

          .receipt-card {
            border: none; background: transparent;
            padding: 0; margin: 0;
            position: relative;
            width: 185mm; height: 125mm;
            page-break-after: always;
          }

          .r-row, .r-label { display: none; }

          .print-only {
            display: block;
            position: absolute;
            color: #000;
          }

          /* ── Overlay positions — tune top/left after first test print ── */

          /* पावती नं. */
          .r-receiptno  { top: 30mm; left: 28mm;  font-size: 10pt; font-weight: bold; }

          /* दिनांक (Marathi date) */
          .r-date       { top: 30mm; left: 128mm; font-size: 10pt; font-weight: bold; }

          /* श्री./श्रीमती/मेसर्स — Name */
          .r-name       { top: 37mm; left: 42mm;  font-size: 11pt; font-weight: bold; }

          /* पत्ता — Address */
          .r-address    { top: 43mm; left: 15mm;  font-size: 10pt; width: 90mm; }

          /* भ्रमणध्वनी क्र. — Phone */
          .r-phone      { top: 48mm; left: 132mm; font-size: 10pt; }

          /* आपणाकडून — Purpose */
          .r-purpose    { top: 54mm; left: 36mm;  font-size: 10pt; width: 88mm; }

          /* रुपये — Amount in Marathi words */
          .r-amountwords { top: 60mm; left: 15mm; font-size: 10pt; width: 95mm; }

          /* गोत्र */
          .r-gotra      { top: 66mm; left: 15mm;  font-size: 10pt; }

          /* देयकाची पध्दत — Payment mode (Cash/UPI/Cheque) */
          .r-paymentmode { top: 66mm; left: 60mm; font-size: 10pt; }

          /* ₹ numeric box — paid amount only */
          .r-amount {
            top: 65mm; left: 138mm;
            font-size: 13pt; font-weight: bold;
            text-align: center; width: 30mm;
          }

          /* Balance — only shown when remainingAmount > 0 */
          .r-balance {
            top: 75mm; left: 10mm;
            font-size: 10pt; font-weight: bold;
          }

          /* Cheque No (only when payment mode is Cheque) */
          .r-chequeno {
            top: 81mm; left: 10mm;
            font-size: 10pt; font-weight: bold;
          }

          .r-utrno {
            top: 81mm; left: 10mm;
            font-size: 10pt; font-weight: bold;
          }

        }
      `}</style>

      {/* SCREEN CONTROLS */}
      <div id="controls">
        <span>{receiptNo} &nbsp;|&nbsp; {name}</span>
        <button className="back-btn" onClick={() => router.back()}>← Back</button>
        <button onClick={() => window.print()}>Print Receipt</button>
      </div>

      {/* RECEIPT CARD */}
      <div className="receipt-card">

        {/* SCREEN PREVIEW ROWS */}
        <div className="r-row"><span className="r-label">Receipt No: </span>{receiptNo}</div>
        <div className="r-row"><span className="r-label">Date: </span>{date}</div>
        <div className="r-row"><span className="r-label">Name: </span>{name}</div>
        <div className="r-row"><span className="r-label">Phone: </span>{phone}</div>
        <div className="r-row"><span className="r-label">Address: </span>{address}</div>
        <div className="r-row"><span className="r-label">Purpose: </span>{purpose}</div>
        <div className="r-row"><span className="r-label">Amount (words): </span>{paidWords}</div>
        <div className="r-row"><span className="r-label">Gotra: </span>{gotra}</div>
        <div className="r-row"><span className="r-label">Payment Mode: </span>{paymentMode}</div>
        <div className="r-row"><span className="r-label">Paid Amount: </span>₹ {paidDisplay}</div>
        {hasBalance && (
          <div className="r-row"><span className="r-label">Balance: </span>₹ {balanceDisplay}</div>
        )}

        {/* SCREEN PREVIEW ROWS */}
        {showCheque && (
          <div className="r-row">
            <span className="r-label">Cheque No: </span>{chequeNo}
          </div>
        )}
        {showUTR && (
          <div className="r-row">
            <span className="r-label">UTR No: </span>{utrNo}
          </div>
        )}

        {/* PRINT-ONLY FIELDS — absolutely positioned onto physical card */}

        <div className="print-only r-receiptno">{receiptNo}</div>

        <div className="print-only r-date">{date}</div>
        <div className="print-only r-name">{name}</div>
        <div className="print-only r-address">{address}</div>
        <div className="print-only r-phone">{phone}</div>
        <div className="print-only r-purpose">{purpose}</div>
        <div className="print-only r-amountwords">{paidWords}</div>
        <div className="print-only r-gotra">{gotra}</div>
        <div className="print-only r-paymentmode">{paymentMode}</div>
        {showCheque && (
          <div className="print-only r-chequeno">धनादेश क्र.: {chequeNo}</div>
        )}

        {showUTR && (
          <div className="print-only r-utrno">UTR: {utrNo}</div>
        )}


        <div className="print-only r-amount">{paidDisplay}/-</div>



        {/* Balance — only printed if advance booking */}
        {hasBalance && (
          <div className="print-only r-balance">
            शिल्लक रक्कम: ₹ {balanceDisplay}/-
          </div>
        )}

      </div>
    </>
  );
}