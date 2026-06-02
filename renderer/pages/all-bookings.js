import { useEffect, useMemo, useState, useRef } from "react";
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
  const [userRole, setUserRole] = useState(null);

  const tableRef = useRef(null);
  const headerRef = useRef(null);
  const scrollbarRef = useRef(null);

  /* ======================================================
     SYNC HORIZONTAL SCROLL
  ====================================================== */
  const handleTableScroll = () => {
    if (headerRef.current)
      headerRef.current.scrollLeft = tableRef.current.scrollLeft;
    if (scrollbarRef.current)
      scrollbarRef.current.scrollLeft = tableRef.current.scrollLeft;
  };

  const handleScrollbarScroll = () => {
    if (tableRef.current)
      tableRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
    if (headerRef.current)
      headerRef.current.scrollLeft = scrollbarRef.current.scrollLeft;
  };

  /* ======================================================
     LOAD USER ROLE
  ====================================================== */
  useEffect(() => {
    setUserRole(localStorage.getItem("role"));
  }, []);

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
    const term = searchTerm.toLowerCase().trim();
    return bookings.filter(
      (booking) =>
        String(booking.name || "").toLowerCase().includes(term) ||
        String(booking.bookingId || "").toLowerCase().includes(term) ||
        String(booking.phone || "").toLowerCase().includes(term) ||
        String(booking._id || "").toLowerCase().includes(term)
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
        body: JSON.stringify({ id: confirmId, reason: cancelReason }),
      });
      setBookings((prev) =>
        prev.map((booking) =>
          (booking._id || booking.id) === confirmId
            ? { ...booking, status: "Cancelled", reason: cancelReason }
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
     HELPERS
  ====================================================== */
  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleDateString("en-GB");
  };

  /* ======================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <div className="db-dashboard">
        <Sidebar />
        <div className="db-main">
          <Header title="All Bookings / सर्व बुकिंग" />
          <p style={{ padding: "20px" }}>Loading bookings...</p>
        </div>
      </div>
    );
  }

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="db-dashboard">
      <Sidebar />

      <div className="db-main">
        <Header title="All Bookings / सर्व बुकिंग" />

        {/* SEARCH BOX */}
        <div className="ab-search-box">
          <input
            type="text"
            placeholder="Search by Name, Booking ID, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* BOOKING LIST */}
        <div className="ab-booking-list">
          {filteredBookings.length === 0 ? (
            <div className="ab-empty">No bookings found.</div>
          ) : (
            <div className="ab-container">

              {/* STICKY HEADER */}
              <div className="ab-sticky-header" ref={headerRef}>
                <div className="ab-header">
                  <div>Booking ID</div>
                  <div>Name</div>
                  <div>Phone</div>
                  <div>Purpose</div>
                  <div>Total Amount</div>
                  <div>Paid Amount</div>
                  <div>Remaining</div>
                  <div>Status</div>
                  <div>Date</div>
                  <div>Action</div>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div
                className="ab-table-scroll"
                ref={tableRef}
                onScroll={handleTableScroll}
              >
                {/* Invisible spacer */}
                <div className="ab-header ab-header-spacer">
                  <div>Booking ID</div>
                  <div>Name</div>
                  <div>Phone</div>
                  <div>Purpose</div>
                  <div>Total Amount</div>
                  <div>Paid Amount</div>
                  <div>Remaining</div>
                  <div>Status</div>
                  <div>Date</div>
                  <div>Action</div>
                </div>

                {/* ROWS */}
                <div className="ab-list">
                  {filteredBookings.map((booking) => {
                    const rowKey = booking._id || booking.id;
                    const status = booking.status || "Pending";
                    const statusLower = status.toLowerCase();

                    const statusClass = statusLower.includes("approved")
                      ? "ab-status-approved"
                      : statusLower.includes("cancelled")
                      ? "ab-status-cancelled"
                      : "ab-status-pending";

                    // Show Cancel button for all non-cancelled bookings
                    const showCancelBtn =
                      userRole === "Admin" &&
                      statusLower !== "cancelled";

                    return (
                      <div key={rowKey} className="ab-row">
                        <div className="ab-id">
                          {booking.bookingId || rowKey || "-"}
                        </div>
                        <div className="ab-name">{booking.name || "-"}</div>
                        <div className="ab-phone">{booking.phone || "-"}</div>
                        <div className="ab-purpose">{booking.purpose || "-"}</div>
                        <div className="ab-amount">{formatCurrency(booking.amount)}</div>
                        <div className="ab-amount">
                          {formatCurrency(booking.advance ?? booking.paidAmount)}
                        </div>
                        <div className="ab-amount">
                          {formatCurrency(booking.remainingAmount)}
                        </div>
                        <div className={`ab-status ${statusClass}`}>{status}</div>
                        <div className="ab-date">
                          {formatDate(booking.bookingDate || booking.date)}
                        </div>
                        <div>
                          {showCancelBtn && (
                            <button
                              className="ab-cancel-btn"
                              onClick={() =>
                                setConfirmId(booking._id || booking.id)
                              }
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STICKY BOTTOM SCROLLBAR */}
              <div
                className="ab-sticky-scrollbar"
                ref={scrollbarRef}
                onScroll={handleScrollbarScroll}
              >
                <div className="ab-scrollbar-inner" />
              </div>

            </div>
          )}
        </div>
      </div>

      {/* CANCEL MODAL */}
      {confirmId && (
        <div className="ab-modal-overlay">
          <div className="ab-modal">
            <p>Enter cancellation reason</p>
            <textarea
              className="input"
              rows="4"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason..."
              style={{ marginTop: "10px", marginBottom: "15px" }}
            />
            <div className="ab-modal-actions">
              <button className="primary-btn" onClick={confirmCancel}>
                Confirm Cancel
              </button>
              <button
                className="secondary-btn"
                onClick={() => { setConfirmId(null); setCancelReason(""); }}
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

export default withAuth(AllBookings, ["Admin", "Entry Operator", "Accountant"]);