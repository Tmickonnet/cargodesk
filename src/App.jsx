import React, { useState } from "react";

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

  const isDashboard = activePage === "Dashboard";

  const handleNavigation = (item) => {
    setActivePage(item);
  };

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

          {navigationGroups.map((group) => (
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
                      background: isActive
                        ? "#1f5f95"
                        : "transparent",
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
          ))}
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "30px",
            minWidth: 0,
          }}
        >
          {isDashboard ? (
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
                  onClick={() => setActivePage("Dashboard")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
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
                      "This CargoDesk Global module is ready for controlled implementation."}
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
