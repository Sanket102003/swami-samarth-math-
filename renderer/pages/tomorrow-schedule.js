import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import PrintOptionsModal from "../components/PrintOptionsModal";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";

function TomorrowSchedule() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrintOptions, setShowPrintOptions] =
    useState(false);

  /* ======================================================
     GET TOMORROW DATE
  ====================================================== */
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return tomorrow.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* ======================================================
     FETCH TOMORROW BOOKINGS
  ====================================================== */
  useEffect(() => {
    const fetchTomorrowBookings =
      async () => {
        try {
          // API Call:
          // GET /Bookings_tomorrow
          const data =
            await apiRequest(
              "/Bookings_tomorrow"
            );

          console.log(
            "TOMORROW BOOKINGS:",
            data
          );

          // Backend may return:
          // { success: true, bookings: [...] }
          // or directly [...]
          if (Array.isArray(data)) {
            setBookings(data);
          } else {
            setBookings(
              data.bookings || []
            );
          }
        } catch (err) {
          console.error(
            "Tomorrow schedule error:",
            err
          );

          const errorMsg = (
            err.message || ""
          ).toLowerCase();

          // Logout if token invalid
          if (
            errorMsg.includes("token") ||
            errorMsg.includes("expired") ||
            errorMsg.includes(
              "signature"
            )
          ) {
            localStorage.clear();
            window.location.href =
              "/login";
            return;
          }

          alert(
            err.message ||
              "Failed to load tomorrow's schedule"
          );
        } finally {
          setLoading(false);
        }
      };

    fetchTomorrowBookings();
  }, []);

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header title="Tomorrow's Schedule / उद्याचे वेळापत्रक" />

        {/* Date */}
        <p className="date-text">
          {getTomorrow()}
        </p>

        {/* Print Button */}
        <div className="top-actions">
          <button
            className="print-btn"
            onClick={() =>
              setShowPrintOptions(true)
            }
          >
            🖨 Print / छापा
          </button>
        </div>

        {/* Schedule List */}
        <div className="schedule-box">
          {loading ? (
            <div className="empty">
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="empty">
              No bookings for tomorrow /
              उद्यासाठी बुकिंग नाही
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={
                  booking._id ||
                  booking.id
                }
                className="schedule-card"
              >
                {/* LEFT */}
                <div className="schedule-left">
                  <h4>
                    {booking.name}
                  </h4>
                  <p>
                    {booking.phone}
                  </p>
                </div>

                {/* CENTER */}
                <div className="schedule-center">
                  <p>
                    {booking.purpose}
                  </p>
                  <strong>
                    ₹
                    {booking.amount ||
                      0}
                  </strong>
                </div>

                {/* RIGHT */}
                <div className="schedule-right">
                  {booking.time ||
                    "--:--"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PRINT OPTIONS MODAL */}
      {showPrintOptions && (
        <PrintOptionsModal
          onClose={() =>
            setShowPrintOptions(false)
          }
        />
      )}
    </div>
  );
}

/* ======================================================
   ROLE-BASED ACCESS
   Admin and Entry Operator can view tomorrow schedule.
====================================================== */
export default withAuth(
  TomorrowSchedule,
  [
    "Admin",
    "Entry Operator",
  ]
);