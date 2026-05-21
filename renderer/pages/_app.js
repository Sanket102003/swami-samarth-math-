// ===== GLOBAL BASE (RESET + BODY STYLES) =====
import "../styles/globals.css";

// ===== CORE LAYOUT (Sidebar + Header) =====
import "../styles/layout.css";

// ===== SHARED UI (Reusable everywhere) =====
import "../styles/forms.css";
import "../styles/dropdown.css";

// ===== AUTH =====
import "../styles/auth.css";

// ===== PAGE STYLES =====
import "../styles/dashboard.css";
import "../styles/new-booking.css";
import "../styles/internal-receipt.css";
import "../styles/tax-receipt.css";
import "../styles/allBookings.css";
import "../styles/tomorrowSchedule.css";
import "../styles/reports.css";
import "../styles/settings.css";
import "../styles/edit.css";
import "../styles/success.css";
import "../styles/print.css"; 
import "../styles/print.css"; // ✅ ADD THIS 
import "../styles/dashboard-details.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
