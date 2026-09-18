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

  const [shipments, setShipments] = useState([]);
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentError, setShipmentError] = useState("");
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [shipmentDetail, setShipmentDetail] = useState(null);
  const [shipmentDetailLoading, setShipmentDetailLoading] = useState(false);
  const [shipmentDetailError, setShipmentDetailError] = useState("");

  const loadShipments = async () => {
    setShipmentLoading(true);
    setShipmentError("");

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("CargoDesk shipment list query failed:", error);
      setShipmentError(error.message || "Unable to load shipments.");
      setShipments([]);
    } else {
      setShipments(data || []);
    }

    setShipmentLoading(false);
  };

  const loadShipmentDetail = async (shipmentId) => {
    setSelectedShipmentId(shipmentId);
    setShipmentDetailLoading(true);
    setShipmentDetailError("");
    setShipmentDetail(null);

    const queries = [
      ["booking", "bookings", "shipment_id"],
      ["legs", "shipment_legs", "shipment_id"],
      ["milestones", "shipment_milestone", "shipment_id"],
      ["cargo", "shipment_cargo", "shipment_id"],
      ["shipmentContainers", "shipment_container", "shipment_id"],
      ["documents", "shipment_documents", "shipment_id"],
      ["tracking", "tracking_event", "shipment_id"],
      ["exceptions", "shipment_exception", "shipment_id"],
      ["delivery", "delivery", "shipment_id"],
    ];

    const results = await Promise.all(
      queries.map(async ([key, table, column]) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(column, shipmentId)
          .order("created_at", { ascending: false });

        return [key, data || [], error];
      })
    );

    const failed = results.find(([, , error]) => error);
    if (failed) {
      console.error("CargoDesk shipment detail query failed:", failed[2]);
      setShipmentDetailError(
        failed[2]?.message || "Unable to load shipment details."
      );
      setShipmentDetailLoading(false);
      return;
    }

    const detail = Object.fromEntries(
      results.map(([key, data]) => [key, data])
    );

    if (detail.shipmentContainers.length) {
      const containerIds = detail.shipmentContainers
        .map((row) => row.container_id)
        .filter(Boolean);

      if (containerIds.length) {
        const { data, error } = await supabase
          .from("containers")
          .select("*")
          .in("container_id", containerIds);

        if (error) {
          setShipmentDetailError(error.message || "Unable to load containers.");
          setShipmentDetailLoading(false);
          return;
        }

        detail.containers = data || [];
      } else {
        detail.containers = [];
      }
    } else {
      detail.containers = [];
    }

    setShipmentDetail(detail);
    setShipmentDetailLoading(false);
  };

  useEffect(() => {
    if (!session || authorizationLoading || !role || activePage !== "Shipments") {
      return;
    }

    loadShipments();
  }, [session, authorizationLoading, role, activePage]);

  useEffect(() => {
    if (!session || authorizationLoading || !role || activePage !== "Shipments") {
      return;
    }

    setSelectedShipmentId(null);
    setShipmentDetail(null);
    setShipmentDetailError("");
  }, [session, authorizationLoading, role, activePage]);

  const handleNavigation = (item) => {
    if (authorizationLoading || !role || allowedNavigation[item] !== true) {
      return;
    }

    setActivePage(item);
  };

  const filteredShipments = shipments.filter((shipment) => {
    const query = shipmentSearch.trim().toLowerCase();
    if (!query) return true;

    return [
      shipment.shipment_number,
      shipment.shipment_id,
      shipment.special_instructions,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    );
  });

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const renderValue = (value) =>
    value === null || value === undefined || value === "" ? "—" : String(value);

  const renderShipmentsModule = () => {
    if (selectedShipmentId && shipmentDetail) {
      const selected = shipments.find(
        (shipment) => shipment.shipment_id === selectedShipmentId
      );

      return (
        <section>
          <button
            type="button"
            onClick={() => {
              setSelectedShipmentId(null);
              setShipmentDetail(null);
              setShipmentDetailError("");
            }}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              color: "#1f5f95",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "18px",
            }}
          >
            ← Back to Shipment List
          </button>

          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e9f0",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "18px",
            boxShadow: "0 2px 8px rgba(16,42,67,0.04)"
          }}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#627d98",textTransform:"uppercase",letterSpacing:"0.7px"}}>Shipment Detail</div>
            <h2 style={{margin:"7px 0 6px",fontSize:"25px",color:"#173b6c"}}>{renderValue(selected?.shipment_number)}</h2>
            <div style={{fontSize:"12px",color:"#627d98"}}>Shipment ID: {renderValue(selectedShipmentId)}</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"16px"}}>
            {[
              ["Identity", [
                ["Shipment Number", selected?.shipment_number],
                ["Shipment Type ID", selected?.shipment_type_id],
                ["Shipment Status ID", selected?.shipment_status_id],
                ["Customer ID", selected?.customer_id],
                ["Supplier ID", selected?.supplier_id],
              ]],
              ["Planning", [
                ["Cargo Ready", selected?.cargo_ready_date],
                ["Planned Departure", selected?.planned_departure_date],
                ["Planned Arrival", selected?.planned_arrival_date],
                ["Actual Departure", selected?.actual_departure_date],
                ["Actual Arrival", selected?.actual_arrival_date],
              ]],
              ["Route", [
                ["Origin Location ID", selected?.origin_location_id],
                ["Destination Location ID", selected?.destination_location_id],
                ["Origin Country ID", selected?.origin_country_id],
                ["Destination Country ID", selected?.destination_country_id],
                ["Transport Mode ID", selected?.primary_transport_mode_id],
              ]],
            ].map(([title, fields]) => (
              <div key={title} style={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:"12px",padding:"18px"}}>
                <h3 style={{margin:"0 0 14px",fontSize:"15px",color:"#173b6c"}}>{title}</h3>
                {fields.map(([label,value]) => (
                  <div key={label} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"8px 0",borderTop:"1px solid #eef2f7",fontSize:"12px"}}>
                    <span style={{color:"#627d98"}}>{label}</span>
                    <strong style={{color:"#334e68",textAlign:"right"}}>{renderValue(value)}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {[
            ["Booking", shipmentDetail.booking],
            ["Route / Legs", shipmentDetail.legs],
            ["Milestones", shipmentDetail.milestones],
            ["Cargo", shipmentDetail.cargo],
            ["Shipment Containers", shipmentDetail.shipmentContainers],
            ["Containers", shipmentDetail.containers],
            ["Documents", shipmentDetail.documents],
            ["Tracking Events", shipmentDetail.tracking],
            ["Exceptions", shipmentDetail.exceptions],
            ["Delivery", shipmentDetail.delivery],
          ].map(([title, rows]) => (
            <div key={title} style={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:"12px",padding:"18px",marginTop:"16px",overflowX:"auto"}}>
              <h3 style={{margin:"0 0 12px",fontSize:"16px",color:"#173b6c"}}>{title}</h3>
              {rows?.length ? (
                <div style={{fontSize:"12px",color:"#334e68"}}>
                  {rows.map((row, index) => (
                    <details key={row.id || row[Object.keys(row)[0]] || index} style={{borderTop:"1px solid #eef2f7",padding:"9px 0"}}>
                      <summary style={{cursor:"pointer",fontWeight:"600"}}>
                        {row.shipment_number || row.booking_number || row.container_number || row.document_id || row.event_reference || row.exception_reference || row.delivery_reference || row.milestone_name || row.cargo_description || row.proof_of_delivery_id || `Record ${index + 1}`}
                      </summary>
                      <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",margin:"10px 0 0",fontFamily:"inherit",color:"#627d98"}}>{JSON.stringify(row, null, 2)}</pre>
                    </details>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:"12px",color:"#829ab1"}}>No records found for this shipment.</div>
              )}
            </div>
          ))}
        </section>
      );
    }

    return (
      <section>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:"16px",flexWrap:"wrap",marginBottom:"18px"}}>
          <div>
            <div style={{fontSize:"12px",fontWeight:"600",color:"#627d98",textTransform:"uppercase",letterSpacing:"0.6px"}}>Operations</div>
            <h1 style={{margin:"6px 0 5px",fontSize:"28px",color:"#173b6c"}}>Shipments</h1>
            <p style={{margin:0,color:"#627d98",fontSize:"14px"}}>Read-only shipment visibility using the existing CargoDesk database foundation.</p>
          </div>
          <button type="button" onClick={loadShipments} disabled={shipmentLoading} style={{border:"1px solid #d9e2ec",borderRadius:"7px",padding:"9px 13px",background:"#fff",color:"#334e68",fontSize:"12px",fontWeight:"600",cursor:shipmentLoading?"not-allowed":"pointer"}}>{shipmentLoading?"Refreshing…":"Refresh"}</button>
        </div>

        <div style={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:"12px",padding:"16px",marginBottom:"18px"}}>
          <label htmlFor="shipment-search" style={{display:"block",fontSize:"11px",fontWeight:"700",color:"#627d98",marginBottom:"7px",textTransform:"uppercase",letterSpacing:"0.6px"}}>Search</label>
          <input id="shipment-search" value={shipmentSearch} onChange={(event)=>setShipmentSearch(event.target.value)} placeholder="Search shipment number, ID, or instructions" style={{width:"100%",boxSizing:"border-box",border:"1px solid #cbd5e0",borderRadius:"8px",padding:"11px 12px",fontSize:"13px",color:"#172033"}} />
        </div>

        {shipmentError && <div style={{background:"#fff5f5",border:"1px solid #fed7d7",borderRadius:"8px",padding:"12px",marginBottom:"16px",color:"#b83232",fontSize:"12px"}}>{shipmentError}</div>}

        <div style={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:"12px",overflowX:"auto"}}>
          {shipmentLoading ? (
            <div style={{padding:"28px",fontSize:"13px",color:"#627d98"}}>Loading shipments…</div>
          ) : filteredShipments.length ? (
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:"760px"}}>
              <thead>
                <tr style={{background:"#f5f7fb",textAlign:"left"}}>
                  {["Shipment","Status ID","Transport Mode ID","Planned Departure","Planned Arrival","Actual Departure","Actual Arrival"].map((heading)=>(
                    <th key={heading} style={{padding:"12px",fontSize:"11px",color:"#627d98",textTransform:"uppercase",letterSpacing:"0.4px",borderBottom:"1px solid #e5e9f0"}}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment)=>(
                  <tr key={shipment.shipment_id} onClick={()=>loadShipmentDetail(shipment.shipment_id)} style={{cursor:"pointer",borderBottom:"1px solid #eef2f7"}}>
                    <td style={{padding:"13px 12px",fontSize:"13px",fontWeight:"700",color:"#1f5f95"}}>{shipment.shipment_number}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#334e68"}}>{renderValue(shipment.shipment_status_id)}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#334e68"}}>{renderValue(shipment.primary_transport_mode_id)}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#627d98"}}>{formatDate(shipment.planned_departure_date)}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#627d98"}}>{formatDate(shipment.planned_arrival_date)}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#627d98"}}>{formatDate(shipment.actual_departure_date)}</td>
                    <td style={{padding:"13px 12px",fontSize:"12px",color:"#627d98"}}>{formatDate(shipment.actual_arrival_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{padding:"28px",fontSize:"13px",color:"#627d98"}}>No shipments match the current search.</div>
          )}
        </div>
      </section>
    );
  };

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
          ) : activePage === "Shipments" ? (
            renderShipmentsModule()
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
