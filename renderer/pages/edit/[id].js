import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import PurposeDropdown from "../../components/PurposeDropdown";
import withAuth from "../../utils/withAuth";
import apiRequest from "../../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function EditBooking() {
  const router = useRouter();
  const { id } = router.query;

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    payNow: "",
    bookingDate: "",
  });

  const [booking, setBooking] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ======================================================
     FETCH BOOKING BY ID
  ====================================================== */
  useEffect(() => {
    if (!id) return;

    const fetchBooking = async () => {
      try {
        const data = await apiRequest(
          `/booking_by_id?id=${id}`
        );

        const booking = data.booking || data;

        setBooking(booking);

        // Devotee form fields
        setForm({
          name: booking.name || "",
          address: booking.address || "",
          phone: booking.phone || "",
          email: booking.email || "",
          payNow: "",
          bookingDate: booking.bookingDate
            ? new Date(
                booking.bookingDate
              )
                .toISOString()
                .split("T")[0]
            : "",
        });

        // Normalize financial fields
        const amount = Number(booking.amount || 0);
        const advance = Number(booking.advance || 0);

        const remainingAmount =
          booking.remainingAmount !== undefined
            ? Number(
                booking.remainingAmount || 0
              )
            : Math.max(amount - advance, 0);

        // Save full booking for PurposeDropdown
        localStorage.setItem(
          "bookingForm",
          JSON.stringify({
            ...booking,

            // Normalize date for input type="date"
            bookingDate: booking.bookingDate
              ? new Date(
                  booking.bookingDate
                )
                  .toISOString()
                  .split("T")[0]
              : "",

            // Original amount
            amount,

            // User will enter any amount manually
            advance: 0,
            paidAmount: 0,

            // Current pending amount
            remainingAmount,

            // Payment type
            paymentType:
              "Remaining Payment",

            // Metadata for backend
            originalBookingId:
              booking.bookingId,

            bookingGroupId:
              booking.bookingGroupId ||
              booking.bookingId,

            parentBookingId:
              booking.bookingId,

            // Initial status
            status:
              remainingAmount > 0
                ? "Pending"
                : "Approved",

            paymentStatus:
              remainingAmount > 0
                ? "Partial"
                : "Paid",
          })
        );
      } catch (err) {
        console.error(
          "Fetch booking error:",
          err
        );
        alert(
          err.message ||
            "Failed to load booking"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();

    // Cleanup when page is closed
    return () => {
      localStorage.removeItem(
        "bookingForm"
      );
    };
  }, [id]);

  /* ======================================================
     HANDLE INPUT CHANGE
  ====================================================== */
  const handleChange = (e) => {
    const updatedForm = {
      ...form,
      [e.target.name]: e.target.value,
    };

    setForm(updatedForm);

    const existing = JSON.parse(
      localStorage.getItem(
        "bookingForm"
      ) || "{}"
    );

    localStorage.setItem(
      "bookingForm",
      JSON.stringify({
        ...existing,
        [e.target.name]: e.target.value,
      })
    );
  };

  /* ======================================================
     HANDLE PAYMENT AMOUNT CHANGE
  ====================================================== */
  const handlePaymentChange = (e) => {
    const value = e.target.value;
    const payNow = Number(value || 0);

    const currentRemaining = Number(
      booking?.remainingAmount || 0
    );

    if (payNow > currentRemaining) {
      alert(
        "Entered amount cannot be greater than pending amount."
      );
      return;
    }

    const newRemaining = Math.max(
      currentRemaining - payNow,
      0
    );

    setForm({
      ...form,
      payNow: value,
    });

    const existing = JSON.parse(
      localStorage.getItem(
        "bookingForm"
      ) || "{}"
    );

    localStorage.setItem(
      "bookingForm",
      JSON.stringify({
        ...existing,
        advance: payNow,
        paidAmount: payNow,
        remainingAmount:
          newRemaining,
        paymentType:
          "Remaining Payment",
        status:
          newRemaining === 0
            ? "Approved"
            : "Pending",
        paymentStatus:
          newRemaining === 0
            ? "Paid"
            : "Partial",
      })
    );
  };

  /* ======================================================
     SAVE PAYMENT (CREATE NEW RECEIPT)
  ====================================================== */
  const handleSave = async () => {
    try {
      setSaving(true);

      const saved = JSON.parse(
        localStorage.getItem(
          "bookingForm"
        ) || "{}"
      );

      const payNow = Number(
        saved.advance ||
          saved.paidAmount ||
          0
      );

      if (payNow <= 0) {
        alert(
          "Please enter amount to pay."
        );
        return;
      }

      const currentRemaining = Number(
        booking?.remainingAmount || 0
      );

      if (payNow > currentRemaining) {
        alert(
          "Payment amount cannot exceed pending amount."
        );
        return;
      }

      const newRemaining = Math.max(
        currentRemaining - payNow,
        0
      );

      const payload = {
        // SAME GROUP ID
        bookingGroupId:
          booking.bookingGroupId ||
          booking.bookingId,

        // PREVIOUS RECEIPT ID
        parentBookingId:
          booking.bookingId,

        // Customer info
        customerId:
          booking.customerId || "",

        // Devotee details
        name: saved.name,
        address: saved.address,
        phone: saved.phone,
        email: saved.email,

        // Booking details
        purpose: saved.purpose,
        bookingDate:
          form.bookingDate ||
          saved.bookingDate,

        // Financial
        amount:
          Number(
            booking.amount || 0
          ),
        advance: payNow,
        paidAmount: payNow,
        remainingAmount:
          newRemaining,

        // Payment
        paymentType:
          "Remaining Payment",

        // Status
        status:
          newRemaining === 0
            ? "Approved"
            : "Pending",

        // Receipt info
        receiptType:
          booking.receiptType ||
          "Internal",
        bank: booking.bank || "",
        is80G:
          booking.is80G || false,
      };

      const data = await apiRequest(
        "/create_booking",
        {
          method: "POST",
          body: JSON.stringify(
            payload
          ),
        }
      );

      console.log(
        "PAYMENT RESPONSE:",
        data
      );

      alert(
        `Payment received successfully!\nNew Receipt ID: ${data.booking.bookingId}`
      );

      localStorage.removeItem(
        "bookingForm"
      );

      router.push(
        `/booking-success?id=${data.booking.bookingId}`
      );
    } catch (err) {
      console.error(
        "Payment error:",
        err
      );

      alert(
        err.message ||
          "Failed to create receipt"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     LOADING
  ====================================================== */
  if (loading) {
    return (
      <div className="dashboard">
        <Sidebar />
        <div className="main">
          <Header title="Edit Booking" />
          <p style={{ padding: "20px" }}>
            Loading booking...
          </p>
        </div>
      </div>
    );
  }

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header
          title={`Edit Receipt ${
            booking?.bookingId || ""
          }`}
        />

        <div className="edit-container">
          <h2>
            Edit Booking / बुकिंग संपादित करा
          </h2>

          {/* DEVOTEE DETAILS */}
          <div className="form-section">
            <h3>
              Devotee Details / भक्त तपशील
            </h3>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name / नाव *"
              className="input"
            />

            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address / पत्ता"
              className="input"
            />

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone / फोन *"
              className="input"
            />

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="input"
            />
          </div>

          {/* PURPOSE + PAYMENT SECTION */}
          <div className="form-section">
            
            <PurposeDropdown />

            <div className="amount-box">
              <strong>
                Paid Amount / भरलेली रक्कम:
              </strong>{" "}
              ₹
              {Number(
                (booking?.amount || 0) -
                  (booking?.remainingAmount ||
                    0)
              ).toLocaleString("en-IN")}
            </div>

            <input
              type="number"
              className="input"
              placeholder="Enter Amount to Pay Now / आता भरणारी रक्कम"
              value={form.payNow}
              onChange={
                handlePaymentChange
              }
            />

            <div className="amount-box">
              <strong>
                Remaining Amount / उर्वरित रक्कम:
              </strong>{" "}
              ₹
              {Math.max(
                Number(
                  booking?.remainingAmount ||
                    0
                ) -
                  Number(
                    form.payNow || 0
                  ),
                0
              ).toLocaleString("en-IN")}
            </div>

            <DatePicker
  selected={
    form.bookingDate
      ? new Date(form.bookingDate)
      : null
  }
  onChange={(date) => {
    if (!date) return;

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const formatted = `${year}-${month}-${day}`;

    const updatedForm = {
      ...form,
      bookingDate: formatted,
    };

    setForm(updatedForm);

    // Update localStorage so PurposeDropdown and save logic stay in sync
    const existing = JSON.parse(
      localStorage.getItem("bookingForm") || "{}"
    );

    localStorage.setItem(
      "bookingForm",
      JSON.stringify({
        ...existing,
        bookingDate: formatted,
      })
    );
  }}
  filterDate={(date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);

    return selected >= today;
  }}
  minDate={new Date()}
  dateFormat="dd-MM-yyyy"
  placeholderText="Select booking date"
  className="input"
  required
/>

            <button
              className="primary-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Generating Receipt..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(
  EditBooking,
  [
    "Admin",
    "Entry Operator",
    "Accountant",
  ]
);
