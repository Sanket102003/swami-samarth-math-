export default function RoleDropdown({ value, onChange }) {
  return (
    <select
      name="role"
      className="input"
      value={value}
      onChange={onChange}
    >
      <option value="Admin">Admin</option>
      <option value="Entry Operator">Entry Operator</option>
      <option value="Accountant">Accountant</option>
    </select>
  );
}