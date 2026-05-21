import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function withAuth(Component, allowedRoles = []) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      // No token → redirect to login
      if (!token) {
        router.replace("/login");
        return;
      }

      // Role restriction
      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        router.replace("/dashboard");
        return;
      }

      // Authorized
      setLoading(false);
    }, [router]);

    if (loading) {
      return <p style={{ padding: "20px" }}>Checking access...</p>;
    }

    return <Component {...props} />;
  };
}
