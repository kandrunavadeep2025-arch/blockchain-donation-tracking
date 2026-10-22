import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    forbidden: false,
    error: false,
  });

  const rolesKey = allowedRoles?.join(",") || "";

  useEffect(() => {
    let cancelled = false;

    async function verifyUser() {
      const token = sessionStorage.getItem("donatechainToken");

      if (!token) {
        if (!cancelled) {
          setState({
            loading: false,
            user: null,
            forbidden: false,
            error: false,
          });
        }
        return;
      }

      try {
        const response = await fetch(
          "https://blockchain-donation-tracking.onrender.com/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          sessionStorage.removeItem("donatechainToken");
          sessionStorage.removeItem("donatechainUser");

          if (!cancelled) {
            setState({
              loading: false,
              user: null,
              forbidden: false,
              error: false,
            });
          }
          return;
        }

        // Use the role returned by MongoDB via the backend.
        sessionStorage.setItem(
          "donatechainUser",
          JSON.stringify(data.user)
        );

        const permitted =
          !rolesKey ||
          rolesKey.split(",").includes(data.user.role);

        if (!cancelled) {
          setState({
            loading: false,
            user: data.user,
            forbidden: !permitted,
            error: false,
          });
        }
      } catch (error) {
        console.error("Session verification failed:", error);

        if (!cancelled) {
          setState({
            loading: false,
            user: null,
            forbidden: false,
            error: true,
          });
        }
      }
    }

    verifyUser();

    return () => {
      cancelled = true;
    };
  }, [rolesKey]);

  if (state.loading) {
    return <p>Verifying your login...</p>;
  }

  if (state.error) {
    return (
      <p>
        Could not verify your login. Check that the backend is running,
        then refresh this page.
      </p>
    );
  }

  if (!state.user) {
    return <Navigate to="/login" replace />;
  }

  if (state.forbidden) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;