import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";

function NewBooking() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState("");

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
      alert("Please select receipt type");
      return;
    }

    // Save selected receipt type
    localStorage.setItem("receiptType", selected);

    // Navigate to booking form pages
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

            {/* INTERNAL RECEIPT */}
            <div
              className={`nb-receipt-card ${selected === "internal" ? "nb-active" : ""}`}
              onClick={() => setSelected("internal")}
            >
              <h4>Internal Receipt</h4>
              <p>अंतर्गत पावती (Cash)</p>
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
   Only Admin and Entry Operator can create bookings.
====================================================== */
export default withAuth(NewBooking, ["Admin", "Entry Operator"]);