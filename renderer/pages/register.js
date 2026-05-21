import { useState } from "react";
import { useRouter } from "next/router";
import RoleDropdown from "../components/RoleDropdown";
import { registerUser } from "../services/authService";

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "Admin",
  });

  const [loading, setLoading] = useState(false);

  /* ======================================================
     VALIDATION FUNCTIONS
  ====================================================== */

  // Name: Only letters and spaces
  const validateName = (name) => {
    const regex = /^[A-Za-z\s]+$/;
    return regex.test(name.trim());
  };

  // Phone:
  // - Exactly 10 digits
  // - Starts with 6, 7, 8, or 9
  const validatePhone = (phone) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone.trim());
  };

  // Email format validation
  const validateEmail = (email) => {
    const regex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(
      email.trim().toLowerCase()
    );
  };

  /* ======================================================
     HANDLE INPUT CHANGES
  ====================================================== */
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* ======================================================
     HANDLE FORM SUBMIT
  ====================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /* ==========================================
       REQUIRED FIELD VALIDATION
    ========================================== */
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password.trim() ||
      !form.role
    ) {
      alert("Please fill all required fields.");
      return;
    }

    /* ==========================================
       NAME VALIDATION
    ========================================== */
    if (!validateName(form.name)) {
      alert(
        "Name should contain only letters and spaces."
      );
      return;
    }

    /* ==========================================
       PHONE VALIDATION
    ========================================== */
    if (!validatePhone(form.phone)) {
      alert(
        "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."
      );
      return;
    }

    /* ==========================================
       EMAIL VALIDATION
    ========================================== */
    if (!validateEmail(form.email)) {
      alert(
        "Please enter a valid email address."
      );
      return;
    }

    setLoading(true);

    try {
      /* ==========================================
         CALL REGISTER API
      ========================================== */
      const data = await registerUser({
        name: form.name.trim(),
        email: form.email
          .trim()
          .toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      });

      console.log(
        "REGISTER RESPONSE:",
        data
      );

      /* ==========================================
         SUCCESS
      ========================================== */
      alert(
        data.message ||
          "Registered Successfully!"
      );

      router.push("/login");
    } catch (err) {
      console.error(
        "REGISTER ERROR:",
        err
      );

      const message =
        err?.message ||
        "Registration failed";

      /* ==========================================
         DUPLICATE EMAIL
      ========================================== */
      if (
        message
          .toLowerCase()
          .includes("email")
      ) {
        alert(
          "This email is already registered."
        );
      }

      /* ==========================================
         DUPLICATE PHONE
      ========================================== */
      else if (
        message
          .toLowerCase()
          .includes("phone")
      ) {
        alert(
          "This mobile number is already registered."
        );
      }

      /* ==========================================
         GENERIC ERROR
      ========================================== */
      else if (
        message
          .toLowerCase()
          .includes("already exists")
      ) {
        alert(
          "User already exists."
        );
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Register / नोंदणी</h2>

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            className="input"
            value={form.name}
            onChange={handleChange}
            required
          />

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="input"
            value={form.email}
            onChange={handleChange}
            required
          />

          {/* Phone */}
          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            className="input"
            value={form.phone}
            onChange={handleChange}
            maxLength={10}
            required
          />

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="input"
            value={form.password}
            onChange={handleChange}
            required
          />

          {/* Role Dropdown */}
          <RoleDropdown
            value={form.role}
            onChange={handleChange}
          />

          {/* Submit Button */}
          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
          >
            {loading
              ? "Registering..."
              : "Register"}
          </button>
        </form>

        {/* Switch to Login */}
        <p className="auth-switch">
          Already have an account?{" "}
          <span
            style={{
              cursor: "pointer",
              color: "#ff6b00",
              fontWeight: "600",
            }}
            onClick={() =>
              router.push("/login")
            }
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}