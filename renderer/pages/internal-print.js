import { useRouter } from "next/router";
import { useEffect } from "react";

export default function InternalPrint() {
  const router = useRouter();

  // 🔥 GET DATA FROM QUERY (later from backend)
  const data = {
    receiptNo: "16662",
    name: "अक्षय अधिकारी",
    phone: "9529250813",
    amount: "409",
    date: "04/04/2026",
    time: "1:39 PM",
    purpose: "गाडीपूजा",
  };

  // 🔥 AUTO PRINT (optional)
  useEffect(() => {
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return (
    <div className="receipt-page">

      {/* RECEIPT NUMBER */}
      <div className="pos receipt-no">{data.receiptNo}</div>

      {/* NAME */}
      <div className="pos name">{data.name}</div>

      {/* PHONE */}
      <div className="pos phone">{data.phone}</div>

      {/* DATE */}
      <div className="pos date">{data.date}</div>

      {/* TIME */}
      <div className="pos time">{data.time}</div>

      {/* PURPOSE */}
      <div className="pos purpose">{data.purpose}</div>

      {/* AMOUNT */}
      <div className="pos amount">₹{data.amount}</div>

      {/* PRINT BUTTON (ONLY SCREEN) */}
      <button className="print-btn" onClick={() => window.print()}>
        Print Again
      </button>

    </div>
  );
}