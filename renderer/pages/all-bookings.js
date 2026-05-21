import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";

function AllBookings() {
  const router = useRouter();

  const [bookings, setBookings] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  /* ======================================================
     PURPOSES THAT SUPPORT PARTIAL PAYMENT
  ====================================================== */
  const shouldShowPaymentBreakup = (purpose = "") => {
    const eligiblePurposes = [
      "Full Bhandara / पूर्ण भंडारा (₹25,000)",
      "Half Bhandara / अर्ध भंडारा (₹15,000)",
      "Shirapasad / शिराप्रसाद (₹5,001)",
    ];

    return eligiblePurposes.includes(purpose);
  };

  /* ======================================================
     FETCH ALL BOOKINGS
  ====================================================== */
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await apiRequest("/Bookings");

        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          setBookings(data.bookings || []);
        }
      } catch (err) {
        console.error("Bookings fetch error:", err);

        const errorMsg = (err.message || "").toLowerCase();

        if (
          errorMsg.includes("token") ||
          errorMsg.includes("expired") ||
          errorMsg.includes("signature")
        ) {
          localStorage.clear();
          window.location.href = "/login";
        } else {
          alert(err.message || "Failed to load bookings");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

/* ======================================================
   SEARCH FILTER
====================================================== */
const filteredBookings = useMemo(() => {
  const term = searchTerm
    .toLowerCase()
    .trim();

  return bookings.filter(
    (booking) =>
      String(
        booking.name || ""
      )
        .toLowerCase()
        .includes(term) ||

      String(
        booking.bookingId || ""
      )
        .toLowerCase()
        .includes(term) ||

      String(
        booking.phone || ""
      )
        .toLowerCase()
        .includes(term) ||

      String(
        booking._id || ""
      )
        .toLowerCase()
        .includes(term)
  );
}, [bookings, searchTerm]);

  /* ======================================================
     CANCEL BOOKING
  ====================================================== */
  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Please enter cancellation reason");
      return;
    }

    try {
      await apiRequest("/cancel_booking", {
        method: "POST",
        body: JSON.stringify({
          id: confirmId,
          reason: cancelReason,
        }),
      });

      setBookings((prev) =>
        prev.map((booking) =>
          (booking._id || booking.id) === confirmId
            ? {
                ...booking,
                status: "Cancelled",
                reason: cancelReason,
              }
            : booking
        )
      );

      setConfirmId(null);
      setCancelReason("");

      alert("Booking cancelled successfully");
    } catch (err) {
      console.error("Cancel booking error:", err);
      alert(err.message || "Failed to cancel booking");
    }
  };

  /* ======================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main">
          <Header title="All Bookings / सर्व बुकिंग" />
          <p style={{ padding: "20px" }}>
            Loading bookings...
          </p>
        </div>
      </div>
    );
  }

/* ======================================================
   UI
====================================================== */
return (
  <div className="dashboard">
    <Sidebar />

    <div className="main">
      <Header title="All Bookings / सर्व बुकिंग" />

      {/* SEARCH BOX */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search by Name, Booking ID, or Phone..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />
      </div>

      {/* BOOKING LIST */}
      <div className="booking-list">
        {filteredBookings.length === 0 ? (
          <div className="empty">
            No bookings found.
          </div>
        ) : (
          <div className="all-bookings-container">
            {/* TABLE HEADER */}
            <div className="all-bookings-header">
              <div>Booking ID</div>
              <div>Name</div>
              <div>Phone</div>
              <div>Purpose</div>
              <div>Total Amount</div>
              <div>Paid Amount</div>
              <div>Remaining</div>
              <div>Status</div>
              <div>Date</div>
            </div>

            {/* TABLE ROWS */}
            <div className="all-bookings-list">
              {filteredBookings.map((booking) => {
                const rowKey =
                  booking._id ||
                  booking.id;

                const status =
                  booking.status ||
                  "Pending";

                const statusClass =
                  status
                    .toLowerCase()
                    .includes(
                      "approved"
                    )
                    ? "status-approved"
                    : status
                        .toLowerCase()
                        .includes(
                          "cancelled"
                        )
                    ? "status-cancelled"
                    : "status-pending";

                const formatCurrency = (
                  value
                ) =>
                  `₹${Number(
                    value || 0
                  ).toLocaleString(
                    "en-IN"
                  )}`;

                const formatDate = (
                  value
                ) => {
                  if (!value)
                    return "-";

                  const date =
                    new Date(value);

                  if (
                    isNaN(date)
                  )
                    return value;

                  return date.toLocaleDateString(
                    "en-GB"
                  );
                };

                return (
                  <div
                    key={rowKey}
                    className="all-bookings-row"
                  >
                    {/* BOOKING ID */}
                    <div className="all-bookings-id">
                      {booking.bookingId ||
                        rowKey ||
                        "-"}
                    </div>

                    {/* NAME */}
                    <div className="all-bookings-name">
                      {booking.name ||
                        "-"}
                    </div>

                    {/* PHONE */}
                    <div className="all-bookings-phone">
                      {booking.phone ||
                        "-"}
                    </div>

                    {/* PURPOSE */}
                    <div className="all-bookings-purpose">
                      {booking.purpose ||
                        "-"}
                    </div>

                    {/* TOTAL AMOUNT */}
                    <div className="all-bookings-amount">
                      {formatCurrency(
                        booking.amount
                      )}
                    </div>

                    {/* PAID AMOUNT */}
                    <div className="all-bookings-amount">
                      {formatCurrency(
                        booking.advance ??
                          booking.paidAmount
                      )}
                    </div>

                    {/* REMAINING */}
                    <div className="all-bookings-amount">
                      {formatCurrency(
                        booking.remainingAmount
                      )}
                    </div>

                    {/* STATUS */}
                    <div
                      className={`all-bookings-status ${statusClass}`}
                    >
                      {status}
                    </div>

                    {/* DATE */}
                    <div className="all-bookings-date">
                      {formatDate(
                        booking.bookingDate ||
                          booking.date
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* CANCEL MODAL */}
    {confirmId && (
      <div className="modal-overlay">
        <div className="modal">
          <p>
            Enter cancellation
            reason
          </p>

          <textarea
            className="input"
            rows="4"
            value={cancelReason}
            onChange={(e) =>
              setCancelReason(
                e.target.value
              )
            }
            placeholder="Enter reason..."
            style={{
              marginTop: "10px",
              marginBottom:
                "15px",
            }}
          />

          <div className="modal-actions">
            <button
              className="primary-btn"
              onClick={
                confirmCancel
              }
            >
              Confirm Cancel
            </button>

            <button
              className="secondary-btn"
              onClick={() => {
                setConfirmId(
                  null
                );
                setCancelReason(
                  ""
                );
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

}

export default withAuth(AllBookings, [
  "Admin",
  "Entry Operator",
  "Accountant",
]);
