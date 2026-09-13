import React from "react";

function App() {
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
      {/* Top Header */}
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

      {/* Main Application Area */}
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
            Operations
          </div>

          {[
            "Dashboard",
            "Shipments",
            "Documentation",
            "Containers",
            "Warehouse",
            "Shipping",
            "Delivery",
          ].map((item, index) => (
            <div
              key={item}
              style={{
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "5px",
                background: index === 0 ? "#eaf3ff" : "transparent",
                color: index === 0 ? "#1261b5" : "#445166",
                fontWeight: index === 0 ? "600" : "500",
                fontSize: "14px",
                cursor: "default",
              }}
            >
              {item}
            </div>
          ))}

          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#7a8799",
              textTransform: "uppercase",
              marginTop: "28px",
              marginBottom: "12px",
              paddingLeft: "12px",
            }}
          >
            Management
          </div>

          {["Reports", "Audit Log", "Settings"].map((item) => (
            <div
              key={item}
              style={{
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "5px",
                color: "#445166",
                fontWeight: "500",
                fontSize: "14px",
              }}
            >
              {item}
            </div>
          ))}
        </aside>

        {/* Dashboard Content */}
        <main style={{ flex: 1, padding: "32px" }}>
          <div style={{ marginBottom: "28px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                color: "#172033",
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
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
                    color: "#172033",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </section>

          {/* Main Workspace */}
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
                color: "#172033",
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
              container, warehouse, shipping and delivery modules will appear
              here as they are connected.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
