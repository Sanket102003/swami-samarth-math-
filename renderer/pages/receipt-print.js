import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ReceiptPrint() {
  const router = useRouter();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastBooking");
    if (saved) {
      try {
        setBooking(JSON.parse(saved));
      } catch {
        setBooking(null);
      }
    }
  }, []);

  const formatAmount = (value) =>
    value || value === 0 ? Number(value).toLocaleString("en-IN") : "";

  const formatDate = (value) => {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d)) return new Date().toLocaleDateString("en-IN");
    return d.toLocaleDateString("en-IN");
  };

  // Converts a number to words in Indian numbering style (e.g. 400 -> "Four Hundred Rupees Only")
  const numberToWords = (num) => {
    const n = Math.round(Number(num) || 0);
    if (!n) return "";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
      "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const twoDigits = (x) => {
      if (x < 20) return ones[x];
      return tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
    };

    const threeDigits = (x) => {
      if (x >= 100) {
        return ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + twoDigits(x % 100) : "");
      }
      return twoDigits(x);
    };

    let remaining = n;
    const crore = Math.floor(remaining / 10000000); remaining %= 10000000;
    const lakh = Math.floor(remaining / 100000); remaining %= 100000;
    const thousand = Math.floor(remaining / 1000); remaining %= 1000;
    const hundred = remaining;

    let parts = [];
    if (crore) parts.push(threeDigits(crore) + " Crore");
    if (lakh) parts.push(threeDigits(lakh) + " Lakh");
    if (thousand) parts.push(threeDigits(thousand) + " Thousand");
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(" ") + " Rupees Only";
  };

  if (!booking) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial" }}>
        <p>No receipt data found.</p>
        <button onClick={() => router.back()}>← Back</button>
      </div>
    );
  }

  const receiptNo = booking.bookingId || booking.receiptId || "";
  const date = formatDate(booking.date || booking.createdAt);
  const name = booking.name || "";
  const phone = booking.phone || "";
  const address = booking.address || "";
  const purpose = booking.purpose || "";
  const gotra = booking.gotra || "";
  const paymentMode = booking.bank || booking.paymentType || "";
  const amount = formatAmount(
    booking.paidAmount ?? booking.advance ?? booking.amount
  );
  const amountWords = numberToWords(
    booking.paidAmount ?? booking.advance ?? booking.amount
  );

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
          background: #1a73e8;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
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

        /* print-only fields: invisible on screen, positioned only when printing */
        .print-only { display: none; }

        /* ── PRINT STYLES — matches physical pavti card, 18.5cm x 12.5cm ── */
        @page {
          size: 185mm 125mm;
          margin: 0;
        }

        @media print {
          #controls { display: none !important; }
          body { margin: 0; }

          .receipt-card {
            border: none;
            background: transparent;
            padding: 0;
            margin: 0;
            position: relative;
            width: 185mm;
            height: 125mm;
            page-break-after: always;
          }

          .r-row, .r-label { display: none; }

          .print-only {
            display: block;
            position: absolute;
            color: #000;
          }

          /* Adjust mm offsets after a test print if any field
             is slightly off the printed line on your card. */

          .r-receiptno { top: 37mm; left: 60mm;  font-size: 10pt; font-weight: bold; }
          .r-date      { top: 37mm; left: 135mm; font-size: 10pt; font-weight: bold; }
          .r-name      { top: 44mm; left: 42mm;  font-size: 11pt; font-weight: bold; }
          .r-address   { top: 49mm; left: 15mm;  font-size: 10pt; width: 90mm; }
          .r-phone     { top: 55mm; left: 139mm; font-size: 10pt; }
          .r-purpose   { top: 62mm; left: 36mm;  font-size: 10pt; width: 100mm; }
          .r-gotra     { top: 74mm; left: 15mm;  font-size: 10pt; }
          .r-paymentmode { top: 74mm; left: 68mm; font-size: 10pt; }
          .r-amount {
            top: 73mm;
            left: 134mm;
            font-size: 13pt;
            font-weight: bold;
            text-align: center;
            width: 30mm;
          }
        }
      `}</style>

      {/* SCREEN CONTROLS */}
      <div id="controls">
        <span>
          {receiptNo} &nbsp;|&nbsp; {name}
        </span>
        <button className="back-btn" onClick={() => router.back()}>
          ← Back
        </button>
        <button onClick={() => window.print()}>Print Receipt</button>
      </div>

      {/* RECEIPT CARD — screen preview + print target */}
      <div className="receipt-card">
        {/* SCREEN PREVIEW ROWS (hidden when printing) */}
        <div className="r-row"><span className="r-label">Receipt No: </span>{receiptNo}</div>
        <div className="r-row"><span className="r-label">Date: </span>{date}</div>
        <div className="r-row"><span className="r-label">Name: </span>{name}</div>
        <div className="r-row"><span className="r-label">Phone: </span>{phone}</div>
        <div className="r-row"><span className="r-label">Address: </span>{address}</div>
        <div className="r-row"><span className="r-label">Purpose: </span>{purpose}</div>
        <div className="r-row"><span className="r-label">Gotra: </span>{gotra}</div>
        <div className="r-row"><span className="r-label">Payment Mode: </span>{paymentMode}</div>
        <div className="r-row"><span className="r-label">Amount: </span>{amount}</div>

        {/* PRINT-ONLY FIELDS — absolutely positioned to match the physical card */}
        <div className="print-only r-receiptno">{receiptNo}</div>
        <div className="print-only r-date">{date}</div>
        <div className="print-only r-name">{name}</div>
        <div className="print-only r-address">{address}</div>
        <div className="print-only r-phone">{phone}</div>
        <div className="print-only r-purpose">{purpose}</div>
        <div className="print-only r-gotra">{gotra}</div>
        <div className="print-only r-paymentmode">{paymentMode}</div>
        <div className="print-only r-amount">{amount}</div>
      </div>
    </>
  );
}