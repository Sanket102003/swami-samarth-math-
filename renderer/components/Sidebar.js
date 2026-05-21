import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaPlus,
  FaList,
  FaCalendar,
  FaChartBar,
  FaCog,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

export default function Sidebar() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  // Load role from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("role");
      setRole(storedRole);
    }
  }, []);

  /* ======================================================
     ROLE-BASED MENU ACCESS

     Admin:
       - Dashboard
       - New Booking
       - All Bookings
       - Tomorrow's Schedule
       - Reports
       - Settings
       - My Profile

     Entry Operator:
       - Dashboard
       - New Booking
       - All Bookings
       - Tomorrow's Schedule
       - My Profile

     Accountant:
       - Dashboard
       - All Bookings
       - Reports
       - My Profile
  ====================================================== */
  const ROLE_MENU = {
    Admin: [
      "dashboard",
      "new_booking",
      "all_bookings",
      "schedule",
      "reports",
      "settings",
      "profile",
    ],

    "Entry Operator": [
      "dashboard",
      "new_booking",
      "all_bookings",
      "schedule",
      "profile",
    ],

    Accountant: [
      "dashboard",
      "all_bookings",
      "reports",
      "profile",
    ],
  };

  // All possible menu items
  const menu = [
    {
      key: "dashboard",
      name: "Dashboard",
      path: "/dashboard",
      icon: <FaHome />,
    },
    {
      key: "new_booking",
      name: "New Booking",
      path: "/new-booking",
      icon: <FaPlus />,
    },
    {
      key: "all_bookings",
      name: "All Bookings",
      path: "/all-bookings",
      icon: <FaList />,
    },
    {
      key: "schedule",
      name: "Tomorrow's Schedule",
      path: "/tomorrow-schedule",
      icon: <FaCalendar />,
    },
    {
      key: "reports",
      name: "Reports",
      path: "/reports",
      icon: <FaChartBar />,
    },
    {
      key: "settings",
      name: "Settings",
      path: "/settings",
      icon: <FaCog />,
    },
    {
      key: "profile",
      name: "My Profile",
      path: "/profile",
      icon: <FaUser />,
    },
  ];

  // Filter menu according to current role
  const allowedMenu = role
    ? menu.filter((item) =>
        ROLE_MENU[role]?.includes(item.key)
      )
    : [];

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Loading state while reading role
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
        🙏 Swami Samarth Math
        <div className="sub-logo">
          Bhuigaon-Vasai
        </div>
      </div>

      {/* Menu title */}
      <div className="menu-title">Menu</div>

      {/* Dynamic menu items */}
      {allowedMenu.map((item) => {
        const isActive =
          router.pathname === item.path;

        return (
          <div
            key={item.key}
            className={`menu-item ${
              isActive ? "active" : ""
            }`}
            onClick={() =>
              router.push(item.path)
            }
          >
            <span className="icon">
              {item.icon}
            </span>
            {item.name}
          </div>
        );
      })}

      {/* Account Section */}
      <div
        className="menu-title"
        style={{ marginTop: "20px" }}
      >
        Account
      </div>

      {/* Logout */}
      <div
        className="menu-item logout"
        onClick={handleLogout}
      >
        <span className="icon">
          <FaSignOutAlt />
        </span>
        Logout
      </div>
    </div>
  );
}
