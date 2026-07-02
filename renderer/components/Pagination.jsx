// components/Pagination.jsx
// Drop this file into your components/ folder and import it wherever needed.

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to   = Math.min(currentPage * itemsPerPage, totalItems);

  // Show at most 5 page numbers around current page
  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) end   = Math.min(5, totalPages);
    if (currentPage >= totalPages - 2) start = Math.max(1, totalPages - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "16px",
      flexWrap: "wrap",
      gap: "8px",
    }}>
      {/* Record range */}
      <span style={{ fontSize: "13px", color: "#6b7280" }}>
        Showing {from}–{to} of {totalItems}
      </span>

      {/* Page buttons */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* First + Prev */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={btnStyle(currentPage === 1)}
        >«</button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={btnStyle(currentPage === 1)}
        >‹</button>

        {/* Page numbers */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={page === currentPage ? activeBtnStyle : btnStyle(false)}
          >
            {page}
          </button>
        ))}

        {/* Next + Last */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={btnStyle(currentPage === totalPages)}
        >›</button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={btnStyle(currentPage === totalPages)}
        >»</button>
      </div>
    </div>
  );
}

const base = {
  minWidth: "32px",
  height: "32px",
  padding: "0 8px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  background: "#fff",
  color: "#374151",
};

const btnStyle = (disabled) => ({
  ...base,
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const activeBtnStyle = {
  ...base,
  background: "#f97316",
  color: "#fff",
  border: "1px solid #f97316",
};