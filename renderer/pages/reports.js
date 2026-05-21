import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";
import { purposes } from "../constants/purposes";

function Reports() {
  /* ======================================================
     STATES
  ====================================================== */
  const [reportData, setReportData] = useState([]);
  const [receiptType, setReceiptType] = useState("All");
  const [purpose, setPurpose] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  const purposeOptions = [{ name: "All" }, ...purposes];

  /* ======================================================
     INITIAL LOAD
  ====================================================== */
  useEffect(() => {
    const loadReportsPage = async () => {
      setLoading(true);
      try {
        await fetchReports(false);
      } catch (err) {
        console.error("Reports load error:", err);
      }
      setLoading(false);
    };

    loadReportsPage();
  }, []);

  /* ======================================================
     FETCH FILTERED REPORTS
  ====================================================== */
  const fetchReports = async (showAlert = true) => {
    try {
      const params = new URLSearchParams();
      if (receiptType && receiptType !== "All") params.append("receiptType", receiptType);
      if (purpose && purpose !== "All") params.append("purpose", purpose);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiRequest(`/reports${query}`);
      setReportData(data.reports || []);
    } catch (err) {
      console.error("Reports fetch error:", err);
      if (showAlert) alert(err.message || "Unable to connect to the server");
      setReportData([]);
    }
  };

  /* ======================================================
     CALCULATE SUMMARY FROM FILTERED DATA
  ====================================================== */
  const getCalculatedStats = () => {
    const uniqueGroups = new Set(
      reportData.map((item) => item.bookingGroupId || item._id)
    );

    const totalRevenue = reportData
      .filter((item) => (item.status || "").toLowerCase().trim() === "approved")
      .reduce((sum, item) => sum + Number(item.paidAmount || item.advance || 0), 0);

    const pendingMap = new Map();
    reportData.forEach((item) => {
      if ((item.status || "").toLowerCase().trim() !== "pending") return;
      const groupId = item.bookingGroupId || item._id;
      if (!pendingMap.has(groupId)) {
        pendingMap.set(groupId, Number(item.remainingAmount || 0));
      }
    });

    const pendingDues = Array.from(pendingMap.values()).reduce((sum, v) => sum + v, 0);

    return {
      totalRevenue,
      totalBookings: uniqueGroups.size,
      pendingDues,
    };
  };

  /* ======================================================
     CSV DOWNLOAD
  ====================================================== */
  const handleDownload = () => {
    try {
      if (!reportData || reportData.length === 0) {
        alert("No report data found for the selected filters.");
        return;
      }

      const headers = [
        "Booking ID", "Name", "Phone", "Purpose",
        "Receipt Type", "Total Amount", "Paid Amount",
        "Remaining Amount", "Status", "Booking Date",
      ];

      const rows = reportData.map((item) => [
        item.bookingId || "",
        item.name || "",
        item.phone || "",
        item.purpose || "",
        item.receiptType || "",
        item.amount || 0,
        item.advance || 0,
        item.remainingAmount || 0,
        item.status || "",
        item.bookingDate
          ? new Date(item.bookingDate).toLocaleDateString("en-GB")
          : "",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];

      link.href = url;
      link.download = `booking-report-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download error:", err);
      alert("Failed to download report.");
    }
  };

  /* ======================================================
     LOADING UI
  ====================================================== */
  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main">
          <Header title="Reports / अहवाल" />
          <p style={{ padding: "20px" }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  /* ======================================================
     UI
  ====================================================== */
  const { totalRevenue, totalBookings, pendingDues } = getCalculatedStats();

  // ── Reusable filter row config ──
  // Instead of repeating <div className="filter-left"> 4 times,
  // define the filters as data and render them in one map()
  const filters = [
    {
      label: "Receipt Type",
      element: (
        <select
          className="input"
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value)}
        >
          <option value="All">All Receipts</option>
          <option value="Internal">Internal Receipt</option>
          <option value="Tax">Income Tax Receipt</option>
        </select>
      ),
    },
    {
      label: "Purpose",
      element: (
        <select
          className="input"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          {purposeOptions.map((item, index) => (
            <option key={index} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: "From Date",
      element: (
        <input
          type="date"
          className="input"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      ),
    },
    {
      label: "To Date",
      element: (
        <input
          type="date"
          className="input"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      ),
    },
  ];

  // ── Reusable table column config ──
  // Instead of repeating <td> blocks, define columns as data
  const columns = [
    { header: "Booking ID",   render: (item) => item.bookingId || "-" },
    { header: "Name",         render: (item) => item.name || "-" },
    { header: "Phone",        render: (item) => item.phone || "-" },
    { header: "Purpose",      render: (item) => item.purpose || "-" },
    { header: "Total Amount", render: (item) => `₹${Number(item.amount || 0).toLocaleString("en-IN")}` },
    { header: "Paid Amount",  render: (item) => `₹${Number(item.paidAmount || item.advance || 0).toLocaleString("en-IN")}` },
    { header: "Remaining",    render: (item) => `₹${Number(item.remainingAmount || 0).toLocaleString("en-IN")}` },
    { header: "Status",       render: (item) => item.status || "-" },
    {
      header: "Date",
      render: (item) =>
        item.bookingDate
          ? new Date(item.bookingDate).toLocaleDateString("en-GB")
          : "-",
    },
  ];

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header title="Reports / अहवाल" />

        <p className="page-subtitle">Swami Samarth Math, Bhuigaon-Vasai</p>

        {/* ── STATS ── */}
        <div className="reports-stats">
          <div className="reports-card">
            <p>Total Revenue</p>
            <h2 className="green">₹{totalRevenue.toLocaleString("en-IN")}</h2>
          </div>
          <div className="reports-card">
            <p>Bookings</p>
            <h2 className="orange">{totalBookings}</h2>
          </div>
          <div className="reports-card">
            <p>Pending Dues</p>
            <h2 className="orange">₹{pendingDues.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="reports-filter">
          {filters.map(({ label, element }) => (
            <div key={label} className="filter-left">
              <label className="label">{label}</label>
              {element}
            </div>
          ))}

          {/* Both buttons in one centered row below filters */}
          <div className="filter-btn-row">
            <button
              className="apply-filter-btn"
              onClick={async () => {
                setLoading(true);
                try {
                  await fetchReports(true);
                } catch (err) {
                  console.error("Filter apply error:", err);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Apply Filters
            </button>

            <button
              className="download-report-btn"
              onClick={handleDownload}
            >
              ⬇ Download Report
            </button>
          </div>
        </div>

        {/* ── RECORD COUNT ── */}
        <div className="reports-total">
          Total Records: {reportData.length}
        </div>

        {/* ── TABLE ── */}
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                {columns.map(({ header }) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, index) => (
                <tr key={item._id || index}>
                  {columns.map(({ header, render }) => (
                    <td key={header}>{render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Reports, ["Admin", "Accountant"]);