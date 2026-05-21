import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";

import {
  FaCalendarAlt,
  FaChartLine,
  FaExclamationTriangle,
  FaBan,
  FaUsers,
} from "react-icons/fa";

function Dashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    pendingDues: 0,
    todayBookings: 0,
    cancelledBookings: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [revenueByPurpose, setRevenueByPurpose] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ======================================================
     FETCH DASHBOARD STATS
  ====================================================== */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await apiRequest("/dashboard_stats");
        console.log("DASHBOARD RESPONSE:", data);
        const statsData = data.stats || data;

        const bookingsResponse = await apiRequest("/Bookings");
        const allBookings = bookingsResponse.bookings || [];

        /* APPROVED BOOKINGS (FOR REVENUE ONLY) */
        const approvedBookings = allBookings.filter(
          (booking) =>
            (booking.status || "").toLowerCase().trim() === "approved"
        );

        /* RECENT BOOKINGS - Approved + Pending only */
        const validRecentBookings = allBookings.filter((booking) => {
          const status = (booking.status || "").toLowerCase().trim();
          return status === "approved" || status === "pending";
        });

        /* TOTAL REVENUE - ONLY APPROVED */
        const totalRevenue = approvedBookings.reduce(
          (sum, booking) =>
            sum + Number(booking.paidAmount || booking.advance || 0),
          0
        );

        /* PENDING DUES */
        const pendingDues =
          Number(statsData.pendingDues || statsData.totalPendingAmount) || 0;

        /* TODAY BOOKINGS */
        const todayBookings = Number(statsData.todayBookings) || 0;

        /* CANCELLED BOOKINGS COUNT */
        const cancelledBookings = allBookings.filter(
          (booking) =>
            (booking.status || "").toLowerCase().trim() === "cancelled"
        ).length;

        /* REVENUE BY PURPOSE */
        const revenueByPurpose = Object.values(
          approvedBookings.reduce((grouped, booking) => {
            const purpose = booking.purpose || "Unknown";
            const paid = Number(booking.paidAmount || booking.advance || 0);
            if (!grouped[purpose]) {
              grouped[purpose] = { purpose, amount: 0 };
            }
            grouped[purpose].amount += paid;
            return grouped;
          }, {})
        );

        /* COUNT UNIQUE BOOKING GROUPS */
        const uniqueBookingGroups = [
          ...new Set(
            allBookings.map(
              (booking) => booking.bookingGroupId || booking.bookingId
            )
          ),
        ];

        /* UPDATE STATS */
        setStats({
          totalBookings: uniqueBookingGroups.length,
          totalRevenue,
          pendingDues,
          todayBookings,
          cancelledBookings,
        });

        setRecentBookings(validRecentBookings.slice(0, 5));
        setRevenueByPurpose(revenueByPurpose);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        const errorMsg = (err.message || "").toLowerCase();
        if (
          errorMsg.includes("token") ||
          errorMsg.includes("expired") ||
          errorMsg.includes("signature")
        ) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        alert(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  /* ======================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <div className="db-dashboard">
        <Sidebar />
        <div className="db-main">
          <Header title="Dashboard / मुख्यपृष्ठ" />
          <p style={{ padding: "20px" }}>Loading dashboard...</p>
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
        <Header title="Dashboard / मुख्यपृष्ठ" />

        {/* ===== STAT CARDS ===== */}
        <div className="db-cards">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={<FaCalendarAlt />}
            color="orange"
            link="/dashboard-details?type=bookings"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue}`}
            icon={<FaChartLine />}
            color="green"
            link="/dashboard-details?type=revenue"
          />
          <StatCard
            title="Pending Dues"
            value={`₹${stats.pendingDues}`}
            icon={<FaExclamationTriangle />}
            color="orange"
            link="/dashboard-details?type=pending"
          />
          <StatCard
            title="Today's Bookings"
            value={stats.todayBookings}
            icon={<FaUsers />}
            color="blue"
            link="/dashboard-details?type=today"
          />
          <StatCard
            title="Cancelled Bookings"
            value={stats.cancelledBookings}
            icon={<FaBan />}
            color="orange"
            link="/dashboard-details?type=cancelled"
          />
        </div>

        {/* ===== MAIN SECTIONS ===== */}
        <div className="db-section-container">

          {/* ===== REVENUE BY PURPOSE ===== */}
          <div className="db-section">
            <h3>Revenue by Purpose / उद्देशानुसार महसूल</h3>

            {revenueByPurpose.length === 0 ? (
              <div className="db-empty-state">
                <p>No revenue data available.</p>
              </div>
            ) : (
              revenueByPurpose.map((item, index) => (
                <div key={index} className="db-revenue-item">
                  <p>
                    <strong>{item.purpose}</strong>
                  </p>
                  <p>₹{Number(item.amount || 0).toLocaleString("en-IN")}</p>
                </div>
              ))
            )}
          </div>

          {/* ===== RECENT BOOKINGS ===== */}
          <div className="db-section">
            <h3>Recent Bookings / अलीकडील बुकिंग</h3>

            {recentBookings.length === 0 ? (
              <div className="db-empty-state">
                <p>No bookings yet. Create your first booking!</p>
              </div>
            ) : (
              recentBookings.map((booking, index) => (
                <div
                  key={booking._id || index}
                  className="db-booking-item"
                >
                  <div className="db-booking-info">
                    <p className="db-booking-name">
                      <strong>{booking.name}</strong>
                    </p>
                    <p className="db-booking-purpose">{booking.purpose}</p>
                  </div>

                  <p className="db-booking-amount">
                    ₹{booking.paidAmount || booking.advance || booking.amount || 0}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default withAuth(Dashboard, ["Admin", "Entry Operator", "Accountant"]);