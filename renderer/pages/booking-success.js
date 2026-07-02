import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function BookingSuccess() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [receiptId, setReceiptId] = useState("Loading...");
  const rawId = router.query.id;

  const API_BASE = "https://www.swamisamrathbhuigaon.com/_functions";

  useEffect(() => {
    if (!rawId) return;

    if (/^(C|BK|IT)-\d{2}-\d+$/.test(rawId)) {
      setReceiptId(rawId);
      return;
    }

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_BASE}/get_booking_by_order_id?orderId=${rawId}`);
        const data = await res.json();
        if (data.status === "confirmed") {
          setReceiptId(data.bookingId);
          clearInterval(poll);
        } else if (attempts >= 10) {
          clearInterval(poll);
          setReceiptId("Processing — check All Bookings shortly");
        }
      } catch (e) {
        console.error("poll booking error:", e);
      }
    }, 1500);

    return () => clearInterval(poll);
  }, [rawId]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("bookingForm") || "{}"
    );

    // If smarnarth is filled → show smarnarth, else show name
    const name = saved.smarnarth?.trim()
      ? saved.smarnarth.trim()
      : saved.name?.trim() || "";

    setDisplayName(name);
  }, []);

  return (
    <div className="dashboard">
      <Sidebar active="new-booking" />

      <div className="main success-page">
        <Header title="Booking Status" />

        <div className="success-card">
          {/* Success Icon */}
          <div className="success-icon">✔</div>

          {/* Title */}
          <h2 className="success-title">
            <span>Booking Confirmed!</span>
            <span>बुकिंग पूर्ण!</span>
          </h2>

          {/* Subtitle */}
          <p className="success-subtitle">
            Your booking has been successfully created.
          </p>

          {/* Name — shows smarnarth if filled, else name */}
          {displayName && (
            <p className="receipt">
              Name / नाव:<br />
              <strong>{displayName}</strong>
            </p>
          )}

          {/* Receipt */}
          <p className="receipt">
            Receipt:<br />
            <strong>{receiptId}</strong>
          </p>

          {/* Buttons */}
          <div className="success-actions">
            <button
              className="primary-btn success-print-btn"
              onClick={() => router.push("/receipt-print")}
            >
              Print Receipt / पावती प्रिंट
            </button>

            <div className="success-secondary-row">
              <button
                className="secondary-btn"
                onClick={() => router.push("/new-booking")}
              >
                New Booking / नवीन बुकिंग
              </button>

              <button
                className="secondary-btn"
                onClick={() => router.push("/all-bookings")}
              >
                View All / सर्व पहा
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}