import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";

function Settings() {
  /* ======================================================
     BOOKING LIMITS
  ====================================================== */
  const [shirprasad, setShirprasad] = useState(3);
  const [vidaprasad, setVidaprasad] = useState(15);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [showLimitsToast, setShowLimitsToast] = useState(false);

  /* ======================================================
     UTSAV DONATIONS
     Each utsav has: name + dates (comma separated)
  ====================================================== */
  const [utsavList, setUtsavList] = useState([]); // loaded from DB
  const [utsavName, setUtsavName] = useState("");
  const [selectedDates, setSelectedDates] = useState([]); // array of Date objects picked from calendar
  const [utsavLoading, setUtsavLoading] = useState(false);
  const [showUtsavToast, setShowUtsavToast] = useState(false);
  const [utsavFetching, setUtsavFetching] = useState(true);

  /* ======================================================
     LOAD ON PAGE LOAD
  ====================================================== */
  useEffect(() => {
    fetchSettings();
    fetchUtsavList();
  }, []);

  /* ======================================================
     FETCH BOOKING LIMITS
  ====================================================== */
  const fetchSettings = async () => {
    try {
      const response = await apiRequest("/get_settings");
      const settings = response.settings || response.data || response;
      setShirprasad(Number(settings.shirprasad || 3));
      setVidaprasad(Number(settings.vidaprasad || 15));
    } catch (err) {
      console.error("Settings fetch error:", err);
      setShirprasad(3);
      setVidaprasad(15);
    }
  };

  /* ======================================================
     FETCH UTSAV LIST FROM DB
  ====================================================== */
  const fetchUtsavList = async () => {
    try {
      setUtsavFetching(true);
      const response = await apiRequest("/get_utsav_list");
      const list = response.utsavList || response.data || response || [];
      setUtsavList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Utsav fetch error:", err);
      setUtsavList([]);
    } finally {
      setUtsavFetching(false);
    }
  };

  /* ======================================================
     SAVE BOOKING LIMITS
  ====================================================== */
  const handleSaveSettings = async () => {
    if (Number(shirprasad) < 0 || Number(vidaprasad) < 0) {
      alert("Values cannot be negative");
      return;
    }

    setLimitsLoading(true);

    try {
      await apiRequest("/save_settings", {
        method: "POST",
        body: JSON.stringify({
          shirprasad: Number(shirprasad),
          vidaprasad: Number(vidaprasad),
        }),
      });
      setShowLimitsToast(true);
      setTimeout(() => setShowLimitsToast(false), 3000);
    } catch (err) {
      console.error("Save settings error:", err);
      alert(err.message || "Failed to save settings");
    } finally {
      setLimitsLoading(false);
    }
  };

  /* ======================================================
     ADD UTSAV
  ====================================================== */
  // Helper: convert Date object to YYYY-MM-DD string
  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Toggle a date in selectedDates array
  const handleCalendarDateChange = (date) => {
    if (!date) return;
    const dateStr = toDateStr(date);
    setSelectedDates((prev) => {
      const alreadySelected = prev.some((d) => toDateStr(d) === dateStr);
      if (alreadySelected) {
        // Click again → deselect
        return prev.filter((d) => toDateStr(d) !== dateStr);
      } else {
        // New date → add
        return [...prev, date];
      }
    });
  };

  // Highlight selected dates in calendar
  const highlightDates = selectedDates;

  const handleAddUtsav = async () => {
    if (!utsavName.trim()) {
      alert("Please enter Utsav name");
      return;
    }

    if (selectedDates.length === 0) {
      alert("Please select at least one date from the calendar");
      return;
    }

    // Convert Date objects to YYYY-MM-DD strings
    const rawDates = selectedDates
      .map(toDateStr)
      .sort(); // sort chronologically

    setUtsavLoading(true);

    try {
      await apiRequest("/save_utsav", {
        method: "POST",
        body: JSON.stringify({
          name: utsavName.trim(),
          dates: rawDates,
        }),
      });

      // Refresh utsav list
      await fetchUtsavList();

      // Clear inputs
      setUtsavName("");
      setSelectedDates([]);

      setShowUtsavToast(true);
      setTimeout(() => setShowUtsavToast(false), 3000);
    } catch (err) {
      console.error("Save utsav error:", err);
      alert(err.message || "Failed to save utsav");
    } finally {
      setUtsavLoading(false);
    }
  };

  /* ======================================================
     DELETE UTSAV
  ====================================================== */
  const handleDeleteUtsav = async (utsavId) => {
    if (!confirm("Are you sure you want to delete this Utsav?")) return;

    try {
      await apiRequest("/delete_utsav", {
        method: "POST",
        body: JSON.stringify({ id: utsavId }),
      });
      setUtsavList((prev) =>
        prev.filter((u) => (u._id || u.id) !== utsavId)
      );
    } catch (err) {
      console.error("Delete utsav error:", err);
      alert(err.message || "Failed to delete utsav");
    }
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="dashboard">
      <Sidebar active="settings" />

      <div className="main">
        <Header title="Settings / सेटिंग्ज" />

        {/* ── BOOKING LIMITS ── */}
        <div className="section settings-card">
          <h3>Booking Limits / बुकिंग मर्यादा</h3>

          <div className="form-group">
            <label className="label">Max Shiraprasad per day</label>
            <input
              type="number"
              className="input"
              min="0"
              value={shirprasad}
              onChange={(e) => setShirprasad(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="label">Max Vidaprasad per day</label>
            <input
              type="number"
              className="input"
              min="0"
              value={vidaprasad}
              onChange={(e) => setVidaprasad(Number(e.target.value))}
            />
          </div>

          <button
            className="primary-btn"
            onClick={handleSaveSettings}
            disabled={limitsLoading}
          >
            {limitsLoading ? "Saving..." : "Save Settings"}
          </button>

          {showLimitsToast && (
            <div className="toast">✔ Booking limits saved successfully</div>
          )}
        </div>

        {/* ── UTSAV DONATION MANAGEMENT ── */}
        <div className="section settings-card" style={{ marginTop: "20px" }}>
          <h3>Utsav Donation Management / उत्सव देणगी व्यवस्थापन</h3>

          <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
            Add Utsav events with their available booking dates. Users will see
            these as options under Utsav Donation.
          </p>

          {/* Utsav Name */}
          <div className="form-group">
            <label className="label">Utsav Name / उत्सव नाव *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Ram Navami Utsav"
              value={utsavName}
              onChange={(e) => setUtsavName(e.target.value)}
            />
          </div>

          {/* Utsav Dates — Calendar multi-select */}
          <div className="form-group">
            <label className="label">
              Available Dates / उपलब्ध तारखा * (click dates to select/deselect)
            </label>

            {/* Inline calendar — click to toggle dates */}
            <DatePicker
              onChange={handleCalendarDateChange}
              highlightDates={highlightDates}
              minDate={new Date()}
              inline
              calendarClassName="utsav-calendar"
            />

            {/* Show selected dates as tags */}
            {selectedDates.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {selectedDates
                  .slice()
                  .sort((a, b) => a - b)
                  .map((date, i) => {
                    const str = toDateStr(date);
                    return (
                      <span
                        key={i}
                        style={{
                          background: "#fff7ed",
                          border: "1px solid #f97316",
                          color: "#f97316",
                          borderRadius: "8px",
                          padding: "4px 10px",
                          fontSize: "13px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {str}
                        <button
                          onClick={() =>
                            setSelectedDates((prev) =>
                              prev.filter((d) => toDateStr(d) !== str)
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            color: "#f97316",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "14px",
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
              </div>
            )}

            {selectedDates.length === 0 && (
              <p style={{ color: "#999", fontSize: "13px", marginTop: "8px" }}>
                No dates selected yet. Click dates on the calendar above.
              </p>
            )}
          </div>

          <button
            className="primary-btn"
            onClick={handleAddUtsav}
            disabled={utsavLoading}
          >
            {utsavLoading ? "Saving..." : "+ Add Utsav"}
          </button>

          {showUtsavToast && (
            <div className="toast">✔ Utsav saved successfully</div>
          )}

          {/* Utsav List */}
          <div style={{ marginTop: "24px" }}>
            <h4 style={{ marginBottom: "12px", color: "#374151" }}>
              Existing Utsav Events / विद्यमान उत्सव
            </h4>

            {utsavFetching ? (
              <p style={{ color: "#999" }}>Loading...</p>
            ) : utsavList.length === 0 ? (
              <p style={{ color: "#999" }}>No Utsav events added yet.</p>
            ) : (
              utsavList.map((utsav) => {
                const utsavId = utsav._id || utsav.id;
                const dates = Array.isArray(utsav.dates)
                  ? utsav.dates.join(", ")
                  : utsav.dates || "-";

                return (
                  <div
                    key={utsavId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "14px 16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      marginBottom: "10px",
                      background: "#f9fafb",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: "700", color: "#111827", margin: 0 }}>
                        {utsav.name}
                      </p>
                      <p style={{ color: "#6b7280", fontSize: "13px", margin: "4px 0 0" }}>
                        Dates: {dates}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteUtsav(utsavId)}
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Settings, ["Admin"]);
