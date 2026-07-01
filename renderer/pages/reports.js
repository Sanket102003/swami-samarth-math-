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
  const [amountOperator, setAmountOperator] = useState("");
  const [amountValue, setAmountValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportMsg, setReportMsg] = useState({ text: "", type: "" });
  const [viewType, setViewType] = useState("All Details");


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
      if (showAlert) setReportMsg({ text: err.message || "Unable to connect to the server", type: "error" });
      setReportData([]);
    }
  };

  /* ======================================================
     CALCULATE SUMMARY FROM FILTERED DATA
  ====================================================== */
  const getCalculatedStats = (data = reportData) => {
    const uniqueGroups = new Set(
      data.map((item) => item.bookingGroupId || item._id)
    );

    const totalRevenue = data
      .filter((item) => (item.status || "").toLowerCase().trim() === "approved")
      .reduce((sum, item) => sum + Number(item.paidAmount || item.advance || 0), 0);

    const pendingMap = new Map();
    data.forEach((item) => {
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
  const handleDownload = (data = []) => {
    try {
      if (!data || data.length === 0) {
        setReportMsg({ text: "No report data found for the selected filters.", type: "error" });
        return;
      }



      const headers = [
        "Booking ID", "Name", "Phone", "Purpose",
        "Receipt Type", "Total Amount", "Paid Amount",
        "Remaining Amount", "Status", "Booking Date",
      ];

      const rows = data.map((item) => [

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
      setReportMsg({ text: "Failed to download report.", type: "error" });
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
  /* ── Amount filter applied client-side after API fetch ── */
  const filteredData = reportData.filter((item) => {
    if (!amountOperator || amountValue === "") return true;
    const itemAmt = Number(item.amount || 0);
    const filterAmt = Number(amountValue);
    if (amountOperator === "=")  return itemAmt === filterAmt;
    if (amountOperator === ">=") return itemAmt >= filterAmt;
    if (amountOperator === "<=") return itemAmt <= filterAmt;
    return true;
  });

  // ViewType: when Devotee Details is selected, deduplicate by phone
  const displayData = viewType === "Devotee Details"
    ? filteredData.filter((item, index, self) =>
        index === self.findIndex((t) => t.phone === item.phone)
      )
    : filteredData;

  const { totalRevenue, totalBookings, pendingDues } = getCalculatedStats(displayData);


  // ── Reusable filter row config ──
  // Instead of repeating <div className="filter-left"> 4 times,
  // define the filters as data and render them in one map()
  const filters = [
    {
      label: "View Type",
      element: (
        <select
          className="input"
          value={viewType}
          onChange={(e) => setViewType(e.target.value)}
        >
          <option value="All Details">All Details</option>
          <option value="Devotee Details">Devotee Details</option>
        </select>
      ),
    },
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
    {
      label: "Amount Filter",

      element: (
        <select
          className="input"
          value={amountOperator}
          onChange={(e) => { setAmountOperator(e.target.value); setAmountValue(""); }}
        >
          <option value="">No Amount Filter</option>
          <option value="=">= Equal to</option>
          <option value=">=">≥ Greater than or equal</option>
          <option value="<=">≤ Less than or equal</option>
        </select>
      ),
    },

    {
      label: "Amount (₹)",
      element: (
        <input
          type="number"
          className="input"
          placeholder={amountOperator ? "Enter amount" : "Select filter first"}
          value={amountValue}
          min="0"
          disabled={!amountOperator}
          onChange={(e) => setAmountValue(e.target.value)}
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

  const devoteeColumns = [
    { header: "Name",    render: (item) => item.name    || "-" },
    { header: "Phone",   render: (item) => item.phone   || "-" },
    { header: "Email",   render: (item) => item.email   || "-" },
    { header: "Address", render: (item) => item.address || "-" },
  ];

  const activeColumns = viewType === "Devotee Details" ? devoteeColumns : columns;

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header title="Reports / अहवाल" />

        {/* INLINE MESSAGE */}
        {reportMsg.text && (
          <div style={{
            background: reportMsg.type === "success" ? "#dcfce7" : "#fee2e2",
            border: `1px solid ${reportMsg.type === "success" ? "#22c55e" : "#ef4444"}`,
            color: reportMsg.type === "success" ? "#15803d" : "#dc2626",
            borderRadius: "6px", padding: "8px 12px", margin: "10px 0", fontSize: "13px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>{reportMsg.type === "success" ? "✓" : "⚠️"} {reportMsg.text}</span>
            <button onClick={() => setReportMsg({ text: "", type: "" })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>
          </div>
        )}

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
              onClick={() => handleDownload(displayData)}
            >

              ⬇ Download Report
            </button>
          </div>
        </div>

        {/* ── RECORD COUNT ── */}
        <div className="reports-total">
          Total Records: {displayData.length}
          {displayData.length !== reportData.length && (
            <span style={{ marginLeft: "10px", color: "#f97316", fontSize: "13px", fontWeight: 600 }}>
              (filtered from {reportData.length})
            </span>
          )}

        </div>

        {/* ── TABLE ── */}
        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                {activeColumns.map(({ header }) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, index) => (

                <tr key={item._id || index}>
                  {activeColumns.map(({ header, render }) => (
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