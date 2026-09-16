import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuthorization } from "./auth/useAuthorization";

const navigationGroups = [
  {
    title: "Operations",
    items: [
      "Dashboard",
      "Shipments",
      "Documentation",
      "Containers",
      "Warehouse",
      "Shipping",
      "Delivery",
    ],
  },
  {
    title: "Management",
    items: ["Reports", "Audit Log", "Settings"],
  },
];

const navigationPermissions = {
  Dashboard: "OPERATIONS_VIEW",
  Shipments: "SHIPMENT_VIEW",
  Documentation: "DOCUMENT_VIEW",
  Containers: "CARGO_VIEW",
  Warehouse: "OPERATIONS_VIEW",
  Shipping: "BOOKING_VIEW",
  Delivery: "DELIVERY_VIEW",
  Reports: "OPERATIONS_VIEW",
  "Audit Log": "AUDIT_VIEW",
  Settings: "SYSTEM_CONFIG",
};

const moduleDescriptions = {
  Shipments:
    "Create, monitor, track, and manage shipment activities from booking through final delivery.",
  Documentation:
    "Manage commercial, export, shipping, terminal, customs, and delivery documentation.",
  Containers:
    "Monitor container allocation, stuffing, movement, shipping status, and delivery visibility.",
  Warehouse:
    "Coordinate warehouse activities, cargo preparation, loading, stuffing, and inventory movement.",
  Shipping:
    "Manage shipping-line activities, vessel information, bookings, bills of lading, and sailing status.",
  Delivery:
    "Monitor delivery planning, transportation coordination, proof of delivery, and completion status.",
  Reports:
    "Access operational reports, shipment performance information, documentation status, and logistics analysis.",
  "Audit Log":
    "Review system activities and maintain an auditable record of important operational changes.",
  Settings:
    "Manage application preferences and future configuration options for CargoDesk Global.",
};

const dashboardCards = [
  {
    title: "Active Shipments",
    value: "0",
    description: "Shipments currently being monitored",
  },
  {
    title: "Pending Documents",
    value: "0",
    description: "Documents requiring attention",
  },
  {
    title: "Containers in Transit",
    value: "0",
    description: "Containers currently moving",
  },
  {
    title: "Pending Deliveries",
    value: "0",
    description: "Deliveries awaiting completion",
  },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState("Checking database...");
  const [connectionMessage, setConnectionMessage] = useState("");

  const {
    role,
    loading: authorizationLoading,
    hasPermission,
  } = useAuthorization(Boolean(session));

  const [allowedNavigation, setAllowedNavigation] = useState({});

  useEffect(() => {
    let isMounted = true;

    const checkAuthenticatedDatabase = async (currentSession) => {
      if (!currentSession) {
        if (isMounted) {
          setConnectionStatus("Supabase reachable");
          setConnectionMessage(
            "Database access requires authentication. CargoDesk security is active."
          );
        }
        return;
      }

      const {
        data: statusData,
        error: statusError,
      } = await supabase
        .from("shipment_statuses")
        .select("*")
        .limit(1);

      if (!isMounted) {
        return;
      }

      if (statusError) {
        console.error(
          "CargoDesk Supabase database connection test failed:",
          statusError
        );

        setConnectionStatus("Database connection requires attention");
        setConnectionMessage(
          statusError.message || "Supabase database test failed."
        );
      } else {
        setConnectionStatus("Supabase connected");
        setConnectionMessage(
          statusData?.length
            ? "CargoDesk can communicate with the logistics database."
            : "Authenticated Supabase connection is working, but no shipment-status row was returned."
        );
      }
    };

    const initializeAuthAndDatabase = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      const currentSession = data?.session ?? null;

      if (error) {
        console.error("CargoDesk authentication check failed:", error);
        setSession(null);
        setConnectionStatus("Supabase reachable");
        setConnectionMessage(
          "Authentication check requires attention. Database access remains protected."
        );
      } else {
        setSession(currentSession);
        await checkAuthenticatedDatabase(currentSession);
      }

      if (isMounted) {
        setAuthLoading(false);
      }
    };

    initializeAuthAndDatabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) {
        return;
      }

      setSession(currentSession ?? null);
      setAuthError("");
      setAllowedNavigation({});

      if (currentSession) {
        setConnectionStatus("Checking database...");
        setConnectionMessage("");
        await checkAuthenticatedDatabase(currentSession);
      } else {
        setConnectionStatus("Supabase reachable");
        setConnectionMessage(
          "Database access requires authentication. CargoDesk security is active."
        );
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveNavigationPermissions = async () => {
      if (!session || authorizationLoading || !role) {
        if (isMounted) {
          setAllowedNavigation({});
        }
        return;
      }

      const checks = await Promise.all(
        Object.entries(navigationPermissions).map(
          async ([item, permission]) => [item, await hasPermission(permission)]
        )
      );

      if (!isMounted) {
        return;
      }

      setAllowedNavigation(Object.fromEntries(checks));
    };

    resolveNavigationPermissions();

    return () => {
      isMounted = false;
    };
  }, [session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    if (!session || authorizationLoading || !role) {
      return;
    }

    if (allowedNavigation[activePage] === false) {
      setActivePage("Dashboard");
    }
  }, [session, authorizationLoading, role, allowedNavigation, activePage]);

  const handleLogin = async (event) => {
    event.preventDefault();

    setAuthError("");
    setAuthSubmitting(true);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setAuthError("Please enter your email address and password.");
      setAuthSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error("CargoDesk sign-in failed:", error);
      setAuthError(
        error.message || "Unable to sign in. Please check your credentials."
      );
    }

    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    setAuthError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("CargoDesk sign-out failed:", error);
      setAuthError(error.message || "Unable to sign out.");
    }
  };

  const isDashboard = activePage === "Dashboard";

  const handleNavigation = (item) => {
    if (authorizationLoading || !role || allowedNavigation[item] !== true) {
      return;
    }

    setActivePage(item);
  };

  const visibleNavigationGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => allowedNavigation[item] === true
      ),
    }))
    .filter((group) => group.items.length > 0);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#173b6c",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "14px",
              background: "#173b6c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontWeight: "700",
              fontSize: "20px",
            }}
          >
            CD
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            CargoDesk Global
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#627d98",
            }}
          >
            Checking secure authentication...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#172033",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e9f0",
              borderRadius: "16px",
              padding: "34px",
              boxShadow: "0 8px 30px rgba(16,42,67,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: "#173b6c",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "16px",
                }}
              >
                CD
              </div>

              <div>
                <div
                  style={{
                    fontSize: "21px",
                    fontWeight: "700",
                    color: "#173b6c",
                  }}
                >
                  CargoDesk Global
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "12px",
                    color: "#718096",
                  }}
                >
                  Logistics Operations Platform
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#627d98",
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                  marginBottom: "7px",
                }}
              >
                Secure Access
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "27px",
                  color: "#173b6c",
                }}
              >
                Sign in
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  color: "#627d98",
                  lineHeight: 1.6,
                }}
              >
                Sign in to access the CargoDesk Global logistics operations
                workspace.
              </p>
            </div>

            {authError && (
              <div
                style={{
                  background: "#fff5f5",
                  border: "1px solid #fed7d7",
                  borderRadius: "8px",
                  padding: "12px 13px",
                  marginBottom: "18px",
                  color: "#b83232",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <label
                htmlFor="cargodesk-email"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334e68",
                  marginBottom: "7px",
                }}
              >
                Email address
              </label>

              <input
                id="cargodesk-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                disabled={authSubmitting}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #cbd5e0",
                  borderRadius: "8px",
                  padding: "12px 13px",
                  fontSize: "14px",
                  outline: "none",
                  marginBottom: "16px",
                  color: "#172033",
                  background: "#ffffff",
                }}
              />

              <label
                htmlFor="cargodesk-password"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334e68",
                  marginBottom: "7px",
                }}
              >
                Password
              </label>

              <input
                id="cargodesk-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                disabled={authSubmitting}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #cbd5e0",
                  borderRadius: "8px",
                  padding: "12px 13px",
                  fontSize: "14px",
                  outline: "none",
                  marginBottom: "20px",
                  color: "#172033",
                  background: "#ffffff",
                }}
              />

              <button
                type="submit"
                disabled={authSubmitting}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "8px",
                  padding: "13px 16px",
                  background: authSubmitting ? "#829ab1" : "#173b6c",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: authSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {authSubmitting ? "Signing in..." : "Sign in to CargoDesk"}
              </button>
            </form>

            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid #e5e9f0",
                fontSize: "11px",
                lineHeight: 1.6,
                color: "#829ab1",
                textAlign: "center",
              }}
            >
              Authorized CargoDesk users only.
              <br />
              Protected by Supabase authentication and database security.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authorizationLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#173b6c",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "14px",
              background: "#173b6c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontWeight: "700",
              fontSize: "20px",
            }}
          >
            CD
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            CargoDesk Global
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#627d98",
            }}
          >
            Verifying authorized access...
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#172033",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#ffffff",
            border: "1px solid #fed7d7",
            borderRadius: "12px",
            padding: "28px",
            boxShadow: "0 8px 30px rgba(16,42,67,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#b83232",
              textTransform: "uppercase",
              letterSpacing: "0.7px",
              marginBottom: "10px",
            }}
          >
            Authorization unavailable
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#173b6c",
            }}
          >
            Access cannot be verified
          </h1>

          <p
            style={{
              margin: "10px 0 20px",
              color: "#627d98",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            CargoDesk cannot establish the authenticated authorization role.
            The application is failing closed and will not expose operational
            modules until authorization can be verified.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              border: "1px solid #d9e2ec",
              borderRadius: "7px",
              padding: "9px 13px",
              background: "#ffffff",
              color: "#334e68",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const isNavigationReady = Object.keys(allowedNavigation).length > 0;
  const hasAccessibleModule = Object.values(allowedNavigation).some(Boolean);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#172033",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e9f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "21px",
              fontWeight: "700",
              color: "#173b6c",
            }}
          >
            CargoDesk Global
          </div>

          <div
            style={{
              marginTop: "3px",
              fontSize: "12px",
              color: "#718096",
            }}
          >
            Logistics Operations Platform
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              padding: "7px 11px",
              borderRadius: "20px",
              background: "#e6f4ea",
              color: "#1f7a5a",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            Authorized
          </div>

          <div
            style={{
              padding: "7px 11px",
              borderRadius: "20px",
              background: "#eef2f7",
              color: "#334e68",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            {role}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              border: "1px solid #d9e2ec",
              borderRadius: "7px",
              padding: "8px 11px",
              background: "#ffffff",
              color: "#334e68",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>

          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#173b6c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            CD
          </div>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: "245px",
            background: "#102a43",
            color: "#ffffff",
            padding: "24px 14px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "0 12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "1px",
                color: "#9fb3c8",
              }}
            >
              CONTROL CENTER
            </div>
          </div>

          {!isNavigationReady ? (
            <div
              style={{
                padding: "12px",
                color: "#9fb3c8",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Loading authorized modules...
            </div>
          ) : (
            visibleNavigationGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: "25px" }}>
                <div
                  style={{
                    padding: "0 12px 9px",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.8px",
                    color: "#829ab1",
                    textTransform: "uppercase",
                  }}
                >
                  {group.title}
                </div>

                {group.items.map((item) => {
                  const isActive = activePage === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleNavigation(item)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderRadius: "8px",
                        padding: "11px 12px",
                        marginBottom: "4px",
                        textAlign: "left",
                        cursor: "pointer",
                        background: isActive ? "#1f5f95" : "transparent",
                        color: isActive ? "#ffffff" : "#d9e2ec",
                        fontSize: "14px",
                        fontWeight: isActive ? "600" : "500",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "30px",
            minWidth: 0,
          }}
        >
          {!hasAccessibleModule ? (
            <section
              style={{
                background: "#ffffff",
                border: "1px solid #fed7d7",
                borderRadius: "12px",
                padding: "28px",
                boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#b83232",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                }}
              >
                No authorized modules
              </div>

              <h1
                style={{
                  margin: "0 0 10px",
                  fontSize: "24px",
                  color: "#173b6c",
                }}
              >
                Access is restricted
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#627d98",
                  fontSize: "14px",
                  lineHeight: 1.7,
                }}
              >
                Your authenticated account does not currently have an active
                CargoDesk permission that grants access to an application
                module. No restricted module has been exposed.
              </p>
            </section>
          ) : isDashboard ? (
            <>
              {/* Dashboard heading */}
              <div
                style={{
                  marginBottom: "25px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#627d98",
                    marginBottom: "7px",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                  }}
                >
                  Overview
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    color: "#173b6c",
                  }}
                >
                  Dashboard
                </h1>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#627d98",
                    fontSize: "14px",
                  }}
                >
                  Monitor your logistics operations from one central workspace.
                </p>
              </div>

              {/* Supabase connection status */}
              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e9f0",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  marginBottom: "22px",
                  boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#627d98",
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                    marginBottom: "7px",
                  }}
                >
                  System Connectivity
                </div>

                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color:
                      connectionStatus === "Supabase connected"
                        ? "#1f7a5a"
                        : "#173b6c",
                  }}
                >
                  {connectionStatus}
                </div>

                {connectionMessage && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      lineHeight: 1.6,
                      color: "#627d98",
                    }}
                  >
                    {connectionMessage}
                  </div>
                )}
              </section>

              {/* Dashboard cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "18px",
                  marginBottom: "28px",
                }}
              >
                {dashboardCards.map((card) => (
                  <div
                    key={card.title}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e9f0",
                      borderRadius: "12px",
                      padding: "20px",
                      boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#627d98",
                        fontWeight: "600",
                        marginBottom: "12px",
                      }}
                    >
                      {card.title}
                    </div>

                    <div
                      style={{
                        fontSize: "30px",
                        lineHeight: 1,
                        fontWeight: "700",
                        color: "#173b6c",
                        marginBottom: "10px",
                      }}
                    >
                      {card.value}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#829ab1",
                      }}
                    >
                      {card.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Operations overview */}
              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e9f0",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#627d98",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                  }}
                >
                  Operations
                </div>

                <h2
                  style={{
                    margin: "0 0 10px",
                    fontSize: "20px",
                    color: "#173b6c",
                  }}
                >
                  Operations Overview
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#627d98",
                    fontSize: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  CargoDesk Global is being developed as a centralized
                  logistics operations platform for shipment management,
                  documentation, container visibility, warehouse coordination,
                  shipping activities, delivery management, reporting, and
                  auditability.
                </p>
              </section>
            </>
          ) : (
            <>
              {/* Module workspace */}
              <div
                style={{
                  marginBottom: "22px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleNavigation("Dashboard")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor:
                      allowedNavigation.Dashboard === true
                        ? "pointer"
                        : "not-allowed",
                    color: "#1f5f95",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "20px",
                  }}
                >
                  ← Back to Dashboard
                </button>

                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e9f0",
                    borderRadius: "12px",
                    padding: "28px",
                    boxShadow: "0 2px 8px rgba(16,42,67,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1f7a5a",
                      marginBottom: "16px",
                      letterSpacing: "0.7px",
                    }}
                  >
                    MODULE READY
                  </div>

                  <h2
                    style={{
                      margin: "0 0 10px",
                      fontSize: "24px",
                      color: "#173b6c",
                    }}
                  >
                    {activePage}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: "760px",
                      color: "#627d98",
                      fontSize: "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    {moduleDescriptions[activePage] ||
                      "This CargoDesk Global module is ready for controlled implementation steps."}
                  </p>

                  <div
                    style={{
                      marginTop: "24px",
                      padding: "18px",
                      background: "#f5f7fb",
                      borderRadius: "8px",
                      border: "1px solid #e5e9f0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#334e68",
                        marginBottom: "6px",
                      }}
                    >
                      Implementation status
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#627d98",
                        lineHeight: 1.6,
                      }}
                    >
                      Navigation is active. The operational interface and
                      database-connected functionality for this module will be
                      introduced through controlled implementation steps.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
