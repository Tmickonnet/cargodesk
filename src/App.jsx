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
  const [warehouseData, setWarehouseData] = useState({
    warehouses: [],
    stuffing: [],
    weighbridge: [],
    vgm: [],
    error: "",
    unavailable: false,
  });
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [reportsData, setReportsData] = useState({ shipments: 0, bookings: 0, containers: 0, trackingEvents: 0, unresolvedExceptions: 0, deliveries: 0, documents: 0, error: "", unavailable: false });
  const [reportsLoading, setReportsLoading] = useState(false);

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
  const isWarehouse = activePage === "Warehouse";
  const isReports = activePage === "Reports";


  useEffect(() => {
    let isMounted = true;

    const loadWarehouseWorkspace = async () => {
      if (
        activePage !== "Warehouse" ||
        !session ||
        authorizationLoading ||
        !role
      ) {
        return;
      }

      const [operationsView, masterDataView] = await Promise.all([
        hasPermission("OPERATIONS_VIEW"),
        hasPermission("MASTER_DATA_VIEW"),
      ]);

      if (!isMounted) return;

      if (!operationsView) {
        setWarehouseData({
          warehouses: [],
          stuffing: [],
          weighbridge: [],
          vgm: [],
          error: "",
          unavailable: true,
        });
        setWarehouseLoading(false);
        return;
      }

      setWarehouseLoading(true);
      setWarehouseData({
        warehouses: [],
        stuffing: [],
        weighbridge: [],
        vgm: [],
        error: "",
        unavailable: false,
      });

      try {
        const results = await Promise.all([
          masterDataView
            ? supabase
                .from("warehouses")
                .select(
                  "warehouse_id, warehouse_code, warehouse_name, party_id, city, state_region, country_id, capacity_mt, is_active, created_at, updated_at"
                )
                .order("updated_at", { ascending: false, nullsFirst: false })
                .limit(25)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("stuffing_record")
            .select(
              "stuffing_record_id, shipment_id, container_id, stuffing_reference, stuffing_status_id, warehouse_id, stuffing_location_id, planned_stuffing_date, actual_start_time, actual_end_time, seal_number, package_count, gross_weight, weight_uom_id, stuffing_supervisor, verified_by, created_at, updated_at"
            )
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(25),
          supabase
            .from("weighbridge_record")
            .select(
              "weighbridge_record_id, shipment_id, container_id, weighing_type_id, weighing_reference, weighbridge_ticket_number, weighing_date, gross_weight, tare_weight, net_weight, weight_uom_id, weighbridge_location_id, verified_by, verification_status_id, created_at, updated_at"
            )
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(25),
          supabase
            .from("container_vgm")
            .select(
              "container_vgm_id, shipment_id, container_id, vgm_reference, vgm_weight, weight_uom_id, weighing_method, weighing_date, weighing_location_id, authorized_person, verified_by, verification_status_id, submitted_to_carrier_at, created_at, updated_at"
            )
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(25),
        ]);

        if (!isMounted) return;

        const firstError = results.find((result) => result?.error)?.error;

        if (firstError) {
          console.error("CargoDesk warehouse workspace load failed:", firstError);
          setWarehouseData({
            warehouses: [],
            stuffing: [],
            weighbridge: [],
            vgm: [],
            error: firstError.message || "Unable to load warehouse activity.",
            unavailable: false,
          });
          return;
        }

        setWarehouseData({
          warehouses: results[0]?.data ?? [],
          stuffing: results[1]?.data ?? [],
          weighbridge: results[2]?.data ?? [],
          vgm: results[3]?.data ?? [],
          error: "",
          unavailable: false,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error("CargoDesk warehouse workspace load failed:", error);
        setWarehouseData({
          warehouses: [],
          stuffing: [],
          weighbridge: [],
          vgm: [],
          error: error.message || "Unable to load warehouse activity.",
          unavailable: false,
        });
      } finally {
        if (isMounted) setWarehouseLoading(false);
      }
    };

    loadWarehouseWorkspace();

    return () => {
      isMounted = false;
    };
  }, [activePage, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadReportsWorkspace = async () => {
      if (activePage !== "Reports" || !session || authorizationLoading || !role) return;
      const permitted = await hasPermission("OPERATIONS_VIEW");
      if (!isMounted) return;
      if (!permitted) { setReportsData((current) => ({ ...current, unavailable: true, error: "" })); setReportsLoading(false); return; }
      setReportsLoading(true);
      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const results = await Promise.all([
          supabase.from("shipments").select("shipment_id", { count: "exact", head: true }),
          supabase.from("bookings").select("booking_id", { count: "exact", head: true }),
          supabase.from("shipment_container").select("shipment_container_id", { count: "exact", head: true }),
          supabase.from("tracking_event").select("tracking_event_id", { count: "exact", head: true }).gte("event_datetime", since),
          supabase.from("shipment_exception").select("shipment_exception_id", { count: "exact", head: true }).is("resolved_at", null),
          supabase.from("delivery").select("delivery_id", { count: "exact", head: true }),
          supabase.from("documents").select("document_id", { count: "exact", head: true }),
        ]);
        if (!isMounted) return;
        const firstError = results.find((result) => result?.error)?.error;
        if (firstError) { setReportsData((current) => ({ ...current, error: firstError.message || "Unable to load operational report data.", unavailable: false })); return; }
        setReportsData({ shipments: results[0].count ?? 0, bookings: results[1].count ?? 0, containers: results[2].count ?? 0, trackingEvents: results[3].count ?? 0, unresolvedExceptions: results[4].count ?? 0, deliveries: results[5].count ?? 0, documents: results[6].count ?? 0, error: "", unavailable: false });
      } catch (error) {
        if (isMounted) setReportsData((current) => ({ ...current, error: error.message || "Unable to load operational report data.", unavailable: false }));
      } finally {
        if (isMounted) setReportsLoading(false);
      }
    };
    loadReportsWorkspace();
    return () => { isMounted = false; };
  }, [activePage, session, authorizationLoading, role, hasPermission]);
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
          ) : isReports ? (
            <div style={{ marginBottom: "22px" }}>
              <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                ← Back to Dashboard
              </button>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Management</div>
                <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Reports</h1>
                <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>Read-only operational record volumes derived from existing authorized logistics data.</p>
              </div>
              {reportsLoading ? (
                <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading operational report data...</div>
              ) : reportsData.unavailable ? (
                <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Operational reports are not available for this role.</div>
              ) : reportsData.error ? (
                <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Unable to load operational report data: {reportsData.error}</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "18px" }}>
                    {[["Shipments", reportsData.shipments], ["Bookings", reportsData.bookings], ["Container assignments", reportsData.containers], ["Deliveries", reportsData.deliveries], ["Documents", reportsData.documents], ["Unresolved exceptions", reportsData.unresolvedExceptions]].map(([label, value]) => (
                      <div key={label} style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "10px", padding: "17px" }}><div style={{ fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div><div style={{ marginTop: "7px", fontSize: "27px", fontWeight: "700", color: "#173b6c" }}>{value}</div></div>
                    ))}
                  </div>
                  <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" }}>Tracking activity</div>
                    <h2 style={{ margin: "0 0 8px", fontSize: "19px", color: "#173b6c" }}>Recent tracking events</h2>
                    <p style={{ margin: 0, color: "#627d98", fontSize: "13px", lineHeight: 1.6 }}>{reportsData.trackingEvents} tracking events recorded in the last 30 days through the authorized read path.</p>
                    <div style={{ marginTop: "16px", padding: "12px 14px", background: "#f5f7fb", border: "1px solid #e5e9f0", borderRadius: "8px", color: "#627d98", fontSize: "12px", lineHeight: 1.6 }}>These figures are descriptive record counts. They do not infer shipment performance, compliance, commercial authority, or completion status.</div>
                  </section>
                </>
              )}
            </div>          ) : isWarehouse ? (
            <>
              <div style={{ marginBottom: "22px" }}>
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

                <div style={{ marginBottom: "20px" }}>
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
                    Operations
                  </div>
                  <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>
                    Warehouse
                  </h1>
                  <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px" }}>
                    Review authorized warehouse, stuffing, weighbridge, and VGM activity through existing read paths.
                  </p>
                </div>

                {warehouseLoading ? (
                  <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>
                    Loading warehouse activity...
                  </div>
                ) : warehouseData.unavailable ? (
                  <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>
                    Warehouse activity is not available for this role.
                  </div>
                ) : warehouseData.error ? (
                  <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>
                    Unable to load warehouse activity: {warehouseData.error}
                  </div>
                ) : (
                  <>
                    {[
                      ["Warehouse master records", warehouseData.warehouses.length],
                      ["Stuffing records", warehouseData.stuffing.length],
                      ["Weighbridge records", warehouseData.weighbridge.length],
                      ["Container VGM records", warehouseData.vgm.length],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          minWidth: "190px",
                          margin: "0 12px 14px 0",
                          padding: "15px 17px",
                          background: "#ffffff",
                          border: "1px solid #e5e9f0",
                          borderRadius: "10px",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {label}
                        </span>
                        <span style={{ marginTop: "6px", fontSize: "24px", fontWeight: "700", color: "#173b6c" }}>
                          {value}
                        </span>
                      </div>
                    ))}

                    <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginTop: "4px", marginBottom: "18px", overflowX: "auto" }}>
                      <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>
                        Warehouse master records
                      </h2>
                      {warehouseData.warehouses.length === 0 ? (
                        <div style={{ color: "#627d98", fontSize: "13px" }}>No warehouse master records are available through the authorized read path.</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #d9e2ec" }}>
                              {["Code", "Name", "Party ID", "Location", "Capacity MT", "Active"].map((heading) => (
                                <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {warehouseData.warehouses.map((item) => (
                              <tr key={item.warehouse_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                                <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.warehouse_code || "—"}</td>
                                <td style={{ padding: "10px 8px", fontSize: "12px", color: "#334e68" }}>{item.warehouse_name || "—"}</td>
                                <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.party_id ?? "—"}</td>
                                <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{[item.city, item.state_region].filter(Boolean).join(", ") || "—"}</td>
                                <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.capacity_mt ?? "—"}</td>
                                <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.is_active == null ? "—" : item.is_active ? "Yes" : "No"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </section>

                    <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginBottom: "18px", overflowX: "auto" }}>
                      <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>Stuffing activity</h2>
                      {warehouseData.stuffing.length === 0 ? (
                        <div style={{ color: "#627d98", fontSize: "13px" }}>No stuffing records are available.</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
                          <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Reference", "Shipment", "Container", "Status ID", "Warehouse", "Planned", "Actual End", "Seal"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead>
                          <tbody>{warehouseData.stuffing.map((item) => <tr key={item.stuffing_record_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                            <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.stuffing_reference || "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipment_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.container_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.stuffing_status_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.warehouse_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.planned_stuffing_date ? new Date(item.planned_stuffing_date).toLocaleString() : "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.actual_end_time ? new Date(item.actual_end_time).toLocaleString() : "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.seal_number || "—"}</td>
                          </tr>)}</tbody>
                        </table>
                      )}
                    </section>

                    <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginBottom: "18px", overflowX: "auto" }}>
                      <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>Weighbridge activity</h2>
                      {warehouseData.weighbridge.length === 0 ? (
                        <div style={{ color: "#627d98", fontSize: "13px" }}>No weighbridge records are available.</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1150px" }}>
                          <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Reference", "Shipment", "Container", "Ticket", "Gross", "Tare", "Net", "Verification ID", "Date"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead>
                          <tbody>{warehouseData.weighbridge.map((item) => <tr key={item.weighbridge_record_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                            <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.weighing_reference || "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipment_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.container_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.weighbridge_ticket_number || "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.gross_weight ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.tare_weight ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.net_weight ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.verification_status_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.weighing_date ? new Date(item.weighing_date).toLocaleString() : "—"}</td>
                          </tr>)}</tbody>
                        </table>
                      )}
                    </section>

                    <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", marginBottom: "18px", overflowX: "auto" }}>
                      <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: "#173b6c" }}>Container VGM activity</h2>
                      {warehouseData.vgm.length === 0 ? (
                        <div style={{ color: "#627d98", fontSize: "13px" }}>No container VGM records are available.</div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1150px" }}>
                          <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Reference", "Shipment", "Container", "VGM", "Method", "Verification ID", "Weighing Date", "Submitted"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead>
                          <tbody>{warehouseData.vgm.map((item) => <tr key={item.container_vgm_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                            <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.vgm_reference || "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipment_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.container_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.vgm_weight ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.weighing_method || "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.verification_status_id ?? "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.weighing_date ? new Date(item.weighing_date).toLocaleString() : "—"}</td>
                            <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.submitted_to_carrier_at ? new Date(item.submitted_to_carrier_at).toLocaleString() : "—"}</td>
                          </tr>)}</tbody>
                        </table>
                      )}
                    </section>
                  </>
                )}
              </div>
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
