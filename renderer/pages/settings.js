import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";
import apiRequest from "../services/api";

function Settings() {
  /* ======================================================
     BOOKING SETTINGS
     Your Wix collection name is: TempleSettings
  ====================================================== */
  const [shirprasad, setShirprasad] =
    useState(3);

  const [vidaprasad, setVidaprasad] =
    useState(15);

  const [showToast, setShowToast] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  /* ======================================================
     LOAD SETTINGS ON PAGE LOAD
  ====================================================== */
  useEffect(() => {
    fetchSettings();
  }, []);

  /* ======================================================
     FETCH SETTINGS
  ====================================================== */
  const fetchSettings = async () => {
    try {
      const response =
        await apiRequest(
          "/get_settings"
        );

      console.log(
        "GET SETTINGS RESPONSE:",
        response
      );

      // Handle:
      // { success: true, settings: {...} }
      // { success: true, data: {...} }
      // { shirprasad: 10, vidaprasad: 15 }
      const settings =
        response.settings ||
        response.data ||
        response;

      setShirprasad(
        Number(
          settings.shirprasad || 3
        )
      );

      setVidaprasad(
        Number(
          settings.vidaprasad || 15
        )
      );
    } catch (err) {
      console.error(
        "Settings fetch error:",
        err
      );

      // If collection is empty, use defaults
      setShirprasad(3);
      setVidaprasad(15);
    }
  };

  /* ======================================================
     SAVE SETTINGS
  ====================================================== */
  const handleSaveSettings = async () => {
    // Validation
    if (
      Number(shirprasad) < 0 ||
      Number(vidaprasad) < 0
    ) {
      alert(
        "Values cannot be negative"
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await apiRequest(
          "/save_settings",
          {
            method: "POST",
            body: JSON.stringify({
              shirprasad:
                Number(shirprasad),
              vidaprasad:
                Number(vidaprasad),
            }),
          }
        );

      console.log(
        "SAVE SETTINGS RESPONSE:",
        response
      );

      showSuccessToast();
    } catch (err) {
      console.error(
        "Save settings error:",
        err
      );

      alert(
        err.message ||
          "Failed to save settings"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     SHOW SUCCESS TOAST
  ====================================================== */
  const showSuccessToast = () => {
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="dashboard">
      <Sidebar active="settings" />

      <div className="main">
        <Header title="Settings / सेटिंग्ज" />

        <div className="section settings-card">
          <h3>
            Booking Limits /
            बुकिंग मर्यादा
          </h3>

          {/* Shiraprasad Limit */}
          <div className="form-group">
            <label className="label">
              Max Shiraprasad per day
            </label>

            <input
              type="number"
              className="input"
              min="0"
              value={shirprasad}
              onChange={(e) =>
                setShirprasad(
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </div>

          {/* Vidaprasad Limit */}
          <div className="form-group">
            <label className="label">
              Max Vidaprasad per day
            </label>

            <input
              type="number"
              className="input"
              min="0"
              value={vidaprasad}
              onChange={(e) =>
                setVidaprasad(
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </div>

          {/* Save Button */}
          <button
            className="primary-btn"
            onClick={
              handleSaveSettings
            }
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>

        {/* Success Toast */}
        {showToast && (
          <div className="toast">
            ✔ Changes saved
            successfully
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   ADMIN ONLY ACCESS
====================================================== */
export default withAuth(Settings, [
  "Admin",
]);