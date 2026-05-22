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
    value ? "Rs. " + Number(value).toLocaleString("en-IN") : "";

  if (!booking) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial" }}>
        <p>No receipt data found.</p>
        <button onClick={() => router.back()}>← Back</button>
      </div>
    );
  }

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
        #controls button.back-btn {
          background: #666;
        }
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
        .r-name  { font-size: 15px; font-weight: bold; color: #222; margin-top: 4px; }
        .r-amount { font-size: 15px; font-weight: bold; color: #c00; margin-top: 6px; }

        /* ── PRINT STYLES — exact same as Wix HTML ── */
        @page {
          size: 190mm 110mm;
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
            width: 190mm;
            height: 110mm;
            page-break-after: always;
          }

          .r-row   { display: none; }
          .r-label { display: none; }

          .r-name {
            position: absolute;
            top: 42mm;
            left: 50mm;
            font-size: 11pt;
            font-weight: bold;
            color: #000;
          }

          .r-phone {
            position: absolute;
            top: 50mm;
            left: 142mm;
            font-size: 10pt;
            color: #000;
          }

          .r-address {
            position: absolute;
            top: 48mm;
            left: 30mm;
            font-size: 10pt;
            color: #000;
          }

          .r-purpose {
            position: absolute;
            top: 77mm;
            left: 35mm;
            font-size: 10pt;
            font-style: normal;
            color: #000;
          }

          .r-amount {
            position: absolute;
            top: 72mm;
            left: 140mm;
            font-size: 12pt;
            font-weight: bold;
            color: #000;
            text-align: left;
            width: 25mm;
          }
        }
      `}</style>

      {/* SCREEN CONTROLS */}
      <div id="controls">
        <span>
          {booking.bookingId} &nbsp;|&nbsp; {booking.name}
        </span>
        <button className="back-btn" onClick={() => router.back()}>
          ← Back
        </button>
        <button onClick={() => window.print()}>
          Print Receipt
        </button>
      </div>

      {/* RECEIPT CARD — screen preview + print target */}
      <div className="receipt-card">

        {/* SCREEN PREVIEW ROWS */}
        <div className="r-row"><span className="r-label">Receipt No: </span>{booking.bookingId}</div>

        {/* PRINT FIELDS — absolutely positioned on print */}
        <div className="r-name">{booking.name || ""}</div>
        <div className="r-phone">{booking.phone || ""}</div>
        <div className="r-address">{booking.address || ""}</div>
        <div className="r-purpose">{booking.purpose || ""}</div>
        <div className="r-amount">{formatAmount(booking.paidAmount ?? booking.advance ?? booking.amount)}</div>

        {/* SCREEN-ONLY EXTRA INFO */}
        <div className="r-row" style={{ marginTop: 8 }}>
          <span className="r-label">Phone: </span>{booking.phone}
        </div>
        <div className="r-row">
          <span className="r-label">Purpose: </span>{booking.purpose}
        </div>
        <div className="r-row">
          <span className="r-label">Amount: </span>
          {formatAmount(booking.paidAmount ?? booking.advance ?? booking.amount)}
        </div>
        {booking.address && (
          <div className="r-row">
            <span className="r-label">Address: </span>{booking.address}
          </div>
        )}
      </div>
    </>
  );
}
