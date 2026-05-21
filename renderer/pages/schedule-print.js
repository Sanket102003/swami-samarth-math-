import { useEffect, useState } from "react";

export default function SchedulePrint() {
  const [bookings, setBookings] = useState([]);

  const getTomorrow = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);

    return today.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    fetch("http://localhost:5000/api/bookings/tomorrow")
      .then((res) => res.json())
      .then((data) => setBookings(data))
      .catch(() => console.log("No backend yet"));
  }, []);

  return (
    <div className="print-page">

      <h2>Tomorrow Schedule / उद्याचे वेळापत्रक</h2>
      <p>{getTomorrow()}</p>

      <div className="print-table">
        {bookings.length === 0 ? (
          <p>No bookings</p>
        ) : (
          bookings.map((b, i) => (
            <div key={i} className="print-row">
              <span>{b.name}</span>
              <span>{b.purpose}</span>
              <span>₹{b.amount}</span>
              <span>{b.time || "-"}</span>
            </div>
          ))
        )}
      </div>

      {/* PRINT BUTTON */}
      <button
        className="primary-btn"
        onClick={() => window.print()}
      >
        🖨 Print Now
      </button>

    </div>
  );
}