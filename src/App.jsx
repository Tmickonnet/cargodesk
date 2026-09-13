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
    "Create, monitor and manage logistics shipments from booking through final delivery.",
  Documentation:
    "Manage commercial, export, shipping and compliance documentation associated with shipments.",
  Containers:
    "Monitor container allocation, stuffing, movement, status and shipment visibility.",
  Warehouse:
    "Coordinate warehouse activities, cargo preparation, loading and stuffing operations.",
  Shipping:
    "Monitor vessel bookings, shipping-line activities, terminal operations and movement milestones.",
  Delivery:
    "Track delivery activities from port or terminal release through final destination.",
  Reports:
    "View operational reports and logistics performance information.",
  "Audit Log":
    "Review recorded operational and security activities across the CargoDesk platform.",
  Settings:
    "Manage application preferences and configuration.",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  const isDashboard = activePage === "Dashboard";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        color: "#172033",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: "72px",
          background: "#0b1f3a",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: "21px", fontWeight: "700" }}>
            CargoDesk Global
          </div>
          <div style={{ fontSize: "12px", opacity: 0.75 }}>
            Logistics Operations Platform
          </div>
        </div>

        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#1d72d8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
          }}
        >
          CD
        </div>
      </header>

      {/* Application */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "240px",
            background: "#ffffff",
            borderRight: "1px solid #e1e7ef",
            padding: "24px 16px",
          }}
        >
          {navigationGroups.map((group) => (
            <div key={group.title} style={{ marginBottom: "28px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#7a8799",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                  paddingLeft: "12px",
                }}
              >
                {group.title}
              </div>

              {group.items.map((item) => {
                const active = activePage === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleNavigation(item)}
                    style={{
                      width: "100%",
                      border: "none",
                      textAlign: "left",
                      padding: "12px",
                      borderRadius: "8px",
                      marginBottom: "5px",
                      background: active ? "#eaf3ff" : "transparent",
                      color: active ? "#1261b5" : "#445166",
                      fontWeight: active ? "600" : "500",
                      fontSize: "14px",
                      cursor: "pointer",
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
        <main style={{ flex: 1, padding: "32px" }}>
          {isDashboard ? (
            <>
              <div style={{ marginBottom: "28px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    fontWeight: "700",
                  }}
                >
                  Logistics Dashboard
                </h1>

                <p
                  style={{
                    marginTop: "8px",
                    color: "#68758a",
                    fontSize: "14px",
                  }}
                >
                  Monitor shipments, documentation, containers and delivery
                  operations from one workspace.
                </p>
              </div>

              {/* Summary Cards */}
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "18px",
                  marginBottom: "28px",
                }}
              >
                {[
                  ["Active Shipments", "0"],
                  ["Pending Documents", "0"],
                  ["Containers in Transit", "0"],
                  ["Pending Deliveries", "0"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e1e7ef",
                      borderRadius: "12px",
                      padding: "20px",
                      boxShadow: "0 2px 6px rgba(20,40,70,0.04)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6c788b",
                        marginBottom: "12px",
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        fontSize: "28px",
                        fontWeight: "700",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </section>

              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e1e7ef",
                  borderRadius: "12px",
                  padding: "24px",
                  minHeight: "300px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: "18px",
                  }}
                >
                  Operations Overview
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#68758a",
                    fontSize: "14px",
                  }}
                >
                  Your logistics workspace is ready. Shipment, documentation,
                  container, warehouse, shipping and delivery modules will
                  appear here as they are connected.
                </p>
              </section>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "28px" }}>
                <button
                  type="button"
                  onClick={() => handleNavigation("Dashboard")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#1261b5",
                    padding: 0,
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    marginBottom: "18px",
                  }}
                >
                  ← Back to Dashboard
                </button>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    fontWeight: "700",
                  }}
                >
                  {activePage}
                </h1>

                <p
                  style={{
                    marginTop: "8px",
                    color: "#68758a",
                    fontSize: "14px",
                  }}
                >
                  {moduleDescriptions[activePage]}
                </p>
              </div>

              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e1e7ef",
                  borderRadius: "12px",
                  padding: "28px",
                  minHeight: "320px",
                  boxShadow: "0 2px 6px rgba(20,40,70,0.04)",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    background: "#eef5ff",
                    color: "#1261b5",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginBottom: "16px",
                  }}
                >
                  MODULE READY
                </div>

                <h2
                  style={{
                    margin: "0 0 10px",
                    fontSize: "20px",
                  }}
                >
