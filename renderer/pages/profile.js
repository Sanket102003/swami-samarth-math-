import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import withAuth from "../utils/withAuth";
import {
  getProfile,
  updateProfile,
} from "../services/userService";

function Profile() {
  const [form, setForm] = useState({
    staffId: "",
    name: "",
    email: "",
    phone: "",
    role: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getProfile();

      setForm({
        staffId: data.profile.staffId || "",
        name: data.profile.name || "",
        email: data.profile.email || "",
        phone: data.profile.phone || "",
        role: data.profile.role || "",
        status: data.profile.status || "",
      });
    } catch (err) {
      console.error("Profile fetch error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const data = await updateProfile({
        name: form.name,
        phone: form.phone,
      });

      // Update localStorage
      localStorage.setItem("name", data.user.name);

      const currentUser = JSON.parse(
        localStorage.getItem("user")
      );
      currentUser.name = data.user.name;
      currentUser.phone = data.user.phone;
      localStorage.setItem(
        "user",
        JSON.stringify(currentUser)
      );

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ padding: "20px" }}>Loading profile...</p>;
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header title="My Profile / प्रोफाइल" />

        <div className="section settings-card">
          <h3>Profile Details</h3>

          <input
            className="input"
            value={form.staffId}
            disabled
            placeholder="Staff ID"
          />

          <input
            className="input"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
          />

          <input
            className="input"
            value={form.email}
            disabled
            placeholder="Email"
          />

          <input
            className="input"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone"
          />

          <input
            className="input"
            value={form.role}
            disabled
            placeholder="Role"
          />

          <input
            className="input"
            value={form.status}
            disabled
            placeholder="Status"
          />

          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Profile, [
  "Admin",
  "Entry Operator",
  "Accountant",
]);