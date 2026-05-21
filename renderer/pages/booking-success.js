import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function BookingSuccess() {
  const router = useRouter();

  const receiptId =
    router.query.id || "Loading...";

  return (
    <div className="dashboard">
      <Sidebar active="new-booking" />

      <div className="main success-page">
        <Header title="Booking Status" />

        <div className="success-card">
          {/* Success Icon */}
          <div className="success-icon">
            ✔
          </div>

          {/* Title */}
          <h2 className="success-title">
            <span>
              Booking Confirmed!
            </span>
            <span>
              बुकिंग पूर्ण!
            </span>
          </h2>

          {/* Subtitle */}
          <p className="success-subtitle">
            Your booking has been
            successfully created.
          </p>

          {/* Receipt */}
          <p className="receipt">
            Receipt:
            <br />
            <strong>
              {receiptId}
            </strong>
          </p>

          {/* Buttons */}
          <div className="success-actions">
            <button
              className="primary-btn"
              onClick={() =>
                router.push(
                  "/new-booking"
                )
              }
            >
              New Booking /
              नवीन बुकिंग
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                router.push(
                  "/all-bookings"
                )
              }
            >
              View All /
              सर्व पहा
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}