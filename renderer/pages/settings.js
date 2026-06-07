import { useState, useEffect } from "react";
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
     LOAD ON PAGE LOAD
  ====================================================== */
  useEffect(() => {
    fetchSettings();
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
            <span className="settings-card-icon"></span>
            <div>
              <h3 className="settings-card-title">Booking Limits / बुकिंग मर्यादा</h3>
              <p className="settings-card-subtitle">Set maximum bookings allowed per day for each purpose</p>
            </div>
          </div>

          <div className="settings-fields">
            <div className="settings-field">
              <label className="settings-label">Max Shiraprasad per day</label>
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
              <label className="settings-label">Max Vidaprasad per day</label>
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
            {limitsLoading ? "Saving..." : "Save Settings"}
          </button>

          {showLimitsToast && (
            <div className="settings-toast settings-toast-success">
              ✔ Booking limits saved successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(Settings, ["Admin"]);