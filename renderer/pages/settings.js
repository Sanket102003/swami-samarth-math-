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
  const [shirprasad, setShirprasad] = useState("");
  const [vidaprasad, setVidaprasad] = useState("");
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [showLimitsToast, setShowLimitsToast] = useState(false);

  /* ======================================================
     UTSAV DONATIONS
  ====================================================== */
  const [utsavList, setUtsavList] = useState([]);
  const [utsavName, setUtsavName] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);
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
      setShirprasad(String(settings.shirprasad ?? 3));
      setVidaprasad(String(settings.vidaprasad ?? 15));
    } catch (err) {
      console.error("Settings fetch error:", err);
      setShirprasad("3");
      setVidaprasad("15");
    }
  };

  /* ======================================================
     FETCH UTSAV LIST
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
     DATE HELPERS
  ====================================================== */
  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleCalendarDateChange = (date) => {
    if (!date) return;
    const dateStr = toDateStr(date);
    setSelectedDates((prev) => {
      const alreadySelected = prev.some((d) => toDateStr(d) === dateStr);
      if (alreadySelected) {
        return prev.filter((d) => toDateStr(d) !== dateStr);
      } else {
        return [...prev, date];
      }
    });
  };

  /* ======================================================
     ADD UTSAV
  ====================================================== */
  const handleAddUtsav = async () => {
    if (!utsavName.trim()) {
      alert("Please enter Utsav name");
      return;
    }
    if (selectedDates.length === 0) {
      alert("Please select at least one date from the calendar");
      return;
    }
    const rawDates = selectedDates.map(toDateStr).sort();
    setUtsavLoading(true);
    try {
      await apiRequest("/save_utsav", {
        method: "POST",
        body: JSON.stringify({
          name: utsavName.trim(),
          dates: rawDates,
        }),
      });
      await fetchUtsavList();
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
        <div className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">📋</span>
            <div>
              <h3 className="settings-card-title">Booking Limits / बुकिंग मर्यादा</h3>
              <p className="settings-card-subtitle">Set maximum bookings allowed per day for each purpose</p>
            </div>
          </div>

          <div className="settings-fields">
            <div className="settings-field">
              <label className="settings-label">
                Max Shiraprasad per day
              </label>
              <input
                type="number"
                className="settings-input"
                min="0"
                value={shirprasad}
                onChange={(e) => setShirprasad(e.target.value)}
                placeholder="Enter limit"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">
                Max Vidaprasad per day
              </label>
              <input
                type="number"
                className="settings-input"
                min="0"
                value={vidaprasad}
                onChange={(e) => setVidaprasad(e.target.value)}
                placeholder="Enter limit"
              />
            </div>
          </div>

          <button
            className="settings-save-btn"
            onClick={handleSaveSettings}
            disabled={limitsLoading}
          >
            {limitsLoading ? "Saving..." : "💾 Save Settings"}
          </button>

          {showLimitsToast && (
            <div className="settings-toast settings-toast-success">
              ✔ Booking limits saved successfully
            </div>
          )}
        </div>

        {/* ── UTSAV DONATION MANAGEMENT ── */}
        <div className="settings-card" style={{ marginTop: "24px" }}>
          <div className="settings-card-header">
            <span className="settings-card-icon">🎉</span>
            <div>
              <h3 className="settings-card-title">Utsav Donation Management / उत्सव देणगी व्यवस्थापन</h3>
              <p className="settings-card-subtitle">Add Utsav events with their available booking dates</p>
            </div>
          </div>

          {/* Utsav Name Input */}
          <div className="settings-field">
            <label className="settings-label">Utsav Name / उत्सव नाव *</label>
            <input
              type="text"
              className="settings-input"
              placeholder="e.g. Ram Navami Utsav"
              value={utsavName}
              onChange={(e) => setUtsavName(e.target.value)}
            />
          </div>

          {/* Calendar — only shows after name is entered */}
          {utsavName.trim() && (
            <div className="settings-field">
              <label className="settings-label">
                Available Dates / उपलब्ध तारखा *
                <span className="settings-label-hint"> (click dates to select/deselect)</span>
              </label>

              <div className="utsav-calendar-wrap">
                <DatePicker
                  onChange={handleCalendarDateChange}
                  highlightDates={selectedDates}
                  minDate={new Date()}
                  inline
                  calendarClassName="utsav-calendar"
                />
              </div>

              {/* Selected date tags */}
              {selectedDates.length > 0 ? (
                <div className="utsav-date-tags">
                  {selectedDates
                    .slice()
                    .sort((a, b) => a - b)
                    .map((date, i) => {
                      const str = toDateStr(date);
                      return (
                        <span key={i} className="utsav-date-tag">
                          {str}
                          <button
                            className="utsav-date-tag-remove"
                            onClick={() =>
                              setSelectedDates((prev) =>
                                prev.filter((d) => toDateStr(d) !== str)
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                </div>
              ) : (
                <p className="settings-hint">No dates selected yet. Click dates on the calendar above.</p>
              )}
            </div>
          )}

          <button
            className="settings-save-btn"
            onClick={handleAddUtsav}
            disabled={utsavLoading}
          >
            {utsavLoading ? "Saving..." : "+ Add Utsav"}
          </button>

          {showUtsavToast && (
            <div className="settings-toast settings-toast-success">
              ✔ Utsav saved successfully
            </div>
          )}

          {/* ── Existing Utsav List ── */}
          <div className="utsav-list-section">
            <h4 className="utsav-list-title">
              Existing Utsav Events / विद्यमान उत्सव
            </h4>

            {utsavFetching ? (
              <p className="settings-hint">Loading...</p>
            ) : utsavList.length === 0 ? (
              <div className="utsav-empty">
                <p>No Utsav events added yet.</p>
              </div>
            ) : (
              <div className="utsav-list">
                {utsavList.map((utsav) => {
                  const utsavId = utsav._id || utsav.id;
                  const dates = Array.isArray(utsav.dates)
                    ? utsav.dates.join(", ")
                    : utsav.dates || "-";

                  return (
                    <div key={utsavId} className="utsav-item">
                      <div className="utsav-item-info">
                        <div className="utsav-item-icon">🎊</div>
                        <div>
                          <p className="utsav-item-name">{utsav.name}</p>
                          <p className="utsav-item-dates">📅 {dates}</p>
                        </div>
                      </div>
                      <button
                        className="utsav-delete-btn"
                        onClick={() => handleDeleteUtsav(utsavId)}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {(showLimitsToast || showUtsavToast) && (
        <div className="settings-toast settings-toast-success">
          {showLimitsToast ? "✔ Booking limits saved successfully" : "✔ Utsav saved successfully"}
        </div>
      )}
    </div>
  );
}

export default withAuth(Settings, ["Admin"]);