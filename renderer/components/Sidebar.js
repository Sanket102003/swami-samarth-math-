import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  FaHome, FaPlus, FaList, FaCalendar,
  FaChartBar, FaCog, FaUser, FaSignOutAlt,
} from "react-icons/fa";

export default function Sidebar() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("role"));
    }
  }, []);

  const ROLE_MENU = {
    Admin: ["dashboard", "new_booking", "all_bookings", "schedule", "reports", "settings", "add_seva", "profile"],
    "Entry Operator": ["dashboard", "new_booking", "all_bookings", "schedule", "profile"],
    Accountant: ["dashboard", "new_booking", "all_bookings", "reports", "profile"],
  };

  // Menu items with Marathi names
  const menu = [
    { key: "dashboard",    name: "Dashboard",           path: "/dashboard",         icon: <FaHome /> },
    { key: "new_booking",  name: "New Booking",         path: "/new-booking",       icon: <FaPlus /> },
    { key: "all_bookings", name: "All Bookings",        path: "/all-bookings",      icon: <FaList /> },
    { key: "schedule",     name: "Tomorrow's Schedule", path: "/tomorrow-schedule", icon: <FaCalendar /> },
    { key: "reports",      name: "Reports",             path: "/reports",           icon: <FaChartBar /> },
    { key: "settings",     name: "Settings",            path: "/settings",          icon: <FaCog /> },
    { key: "add_seva",     name: "Add Seva",            path: "/add-seva",          icon: <FaPlus /> },
    { key: "profile",      name: "My Profile",          path: "/profile",           icon: <FaUser /> },
  ];

  const allowedMenu = role
    ? menu.filter((item) => ROLE_MENU[role]?.includes(item.key))
    : [];

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (role === null) {
    return (
      <div className="sidebar">
        <p style={{ padding: "20px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="logo">
        🙏 स्वामी समर्थ मठ
        <div className="sub-logo">भुईगाव-वसई</div>
      </div>

      {/* Menu title */}
      <div className="menu-title">Menu</div>

      {/* Dynamic menu items */}
      {allowedMenu.map((item) => {
        const isActive = router.pathname === item.path;
        return (
          <div
            key={item.key}
            className={`menu-item ${isActive ? "active" : ""}`}
            onClick={() => router.push(item.path)}
          >
            <span className="icon">{item.icon}</span>
            {item.name}
          </div>
        );
      })}

      {/* Account Section */}
      <div className="menu-title" style={{ marginTop: "20px" }}>
        Account
      </div>

      {/* Logout */}
      <div className="menu-item logout" onClick={handleLogout}>
        <span className="icon"><FaSignOutAlt /></span>
        बाहेर पडा
      </div>
    </div>
  );
}