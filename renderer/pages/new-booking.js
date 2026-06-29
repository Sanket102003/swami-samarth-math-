import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";

function NewBooking() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* ======================================================
     LOAD USER ROLE
  ====================================================== */
  useEffect(() => {
    const userRole = localStorage.getItem("role") || "";
    setRole(userRole);
  }, []);

  /* ======================================================
     CONTINUE TO RECEIPT FORM
  ====================================================== */
  const handleContinue = () => {
    if (!selected) {
      setErrorMsg("Please select receipt type / कृपया पावती प्रकार निवडा");
      return;
    }
    setErrorMsg("");

    localStorage.setItem("receiptType", selected);

    if (selected === "internal") {
      router.push("/internal-receipt");
    } else if (selected === "tax") {
      router.push("/tax-receipt");
    }
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="db-dashboard">
      <Sidebar />

      <div className="db-main">
        <Header title="New Booking / नवीन बुकिंग" />

        <p className="nb-step-text">Step 1 of 2</p>

        <div className="db-section nb-booking-center">
          <h3>Select Receipt Type / पावती प्रकार निवडा</h3>

          <div className="nb-receipt-options">

            {/* SHREE SWAMI SAMARTH RECEIPT */}
            <div
              className={`nb-receipt-card ${selected === "internal" ? "nb-active" : ""}`}
              onClick={() => setSelected("internal")}
            >
              <h4>Shree Swami Samarth Receipt</h4>
              <p>श्री स्वामी समर्थ पावती (रोख)</p>
            </div>

            {/* TAX RECEIPT */}
            <div
              className={`nb-receipt-card ${selected === "tax" ? "nb-active" : ""}`}
              onClick={() => setSelected("tax")}
            >
              <h4>Income Tax Receipt</h4>
              <p>आयकर पावती (Online)</p>
            </div>

          </div>

          {/* ERROR MESSAGE */}
          {errorMsg && (
            <div style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "6px", color: "#dc2626", padding: "8px 12px", margin: "10px 0", fontSize: "13px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* CONTINUE BUTTON */}
          <div className="nb-continue">
            <button
              className="primary-btn"
              disabled={!selected}
              onClick={handleContinue}
            >
              Continue / पुढे चला →
            </button>
          </div>

          {/* OPTIONAL INFO */}
          {role && (
            <p style={{ marginTop: "15px", color: "#666", fontSize: "14px" }}>
              Logged in as: <strong>{role}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   ROLE-BASED ACCESS
   Admin, Entry Operator and Accountant can create bookings.
====================================================== */
export default withAuth(NewBooking, ["Admin", "Entry Operator", "Accountant"]);