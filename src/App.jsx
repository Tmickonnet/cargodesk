import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { useAuthorization } from "./auth/useAuthorization";
import DocumentSubmitActions from "./DocumentSubmitActions";
import DocumentReviewActions from "./DocumentReviewActions";
import ExceptionsWorkspace from "./ExceptionsWorkspace";
import CreateShipmentForm from "./CreateShipmentForm";
import ShipmentCargoWorkspace from "./ShipmentCargoWorkspace";

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
      "Exceptions",
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
  Exceptions: "EXCEPTION_VIEW",
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
    key: "activeShipments",
    title: "Active Shipments",
    description: "Shipments currently in an operational lifecycle",
  },
  {
    key: "pendingDocuments",
    title: "Pending Documents",
    description: "Documents not yet in a final lifecycle state",
  },
  {
    key: "containersInTransit",
    title: "Containers in Transit",
    description: "Not available: controlled container transit status is not established",
  },
  {
    key: "pendingDeliveries",
    title: "Pending Deliveries",
    description: "Deliveries not yet delivered or cancelled",
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
  const [dashboardData, setDashboardData] = useState({
    activeShipments: null,
    pendingDocuments: null,
    containersInTransit: null,
    pendingDeliveries: null,
    error: "",
    unavailable: false,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState({ rows: [], error: "", unavailable: false });
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentCreateAllowed, setShipmentCreateAllowed] = useState(false);
  const [showShipmentCreate, setShowShipmentCreate] = useState(false);
  const [shipmentCreateMessage, setShipmentCreateMessage] = useState("");
  const [shipmentRefreshKey, setShipmentRefreshKey] = useState(0);
  const [bookingData, setBookingData] = useState({ rows: [], error: "", unavailable: false });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [auditLogData, setAuditLogData] = useState({ rows: [], error: "", unavailable: false });
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [documentationData, setDocumentationData] = useState({ rows: [], error: "", unavailable: false });
  const [documentationLoading, setDocumentationLoading] = useState(false);
  const [containerData, setContainerData] = useState({ rows: [], error: "", unavailable: false });
  const [containerLoading, setContainerLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState({ rows: [], error: "", unavailable: false });
  const [deliveryLoading, setDeliveryLoading] = useState(false);

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
        .select("shipment_status_id")
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
  const isShipments = activePage === "Shipments";
  const isShipping = activePage === "Shipping";
  const isAuditLog = activePage === "Audit Log";
  const isDocumentation = activePage === "Documentation";
  const isContainers = activePage === "Containers";
  const isDelivery = activePage === "Delivery";
  const isExceptions = activePage === "Exceptions";


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
    const loadBookingWorkspace = async () => {
      if (!isShipping || !session || authorizationLoading || !role) return;
      const permitted = await hasPermission("BOOKING_VIEW");
      if (!isMounted) return;
      if (!permitted) { setBookingData({ rows: [], error: "", unavailable: true }); setBookingLoading(false); return; }
      setBookingLoading(true);
      setBookingData({ rows: [], error: "", unavailable: false });
      try {
        const result = await supabase.from("bookings").select("booking_id, shipment_id, booking_number, booking_status_id, booking_date, requested_etd, confirmed_etd, requested_eta, confirmed_eta, voyage_number, freight_terms, carrier_reference").order("booking_date", { ascending: false, nullsFirst: false }).limit(25);
        if (!isMounted) return;
        if (result.error) { setBookingData({ rows: [], error: result.error.message || "Unable to load booking activity.", unavailable: false }); return; }
        setBookingData({ rows: result.data ?? [], error: "", unavailable: false });
      } catch (error) {
        if (isMounted) setBookingData({ rows: [], error: error.message || "Unable to load booking activity.", unavailable: false });
      } finally { if (isMounted) setBookingLoading(false); }
    };
    loadBookingWorkspace();
    return () => { isMounted = false; };
  }, [isShipping, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadShipmentWorkspace = async () => {
      if (!isShipments || !session || authorizationLoading || !role) return;
      const [permitted, canCreate] = await Promise.all([
        hasPermission("SHIPMENT_VIEW"),
        hasPermission("SHIPMENT_CREATE"),
      ]);
      if (!isMounted) return;
      setShipmentCreateAllowed(canCreate === true);
      if (!permitted) { setShipmentData({ rows: [], error: "", unavailable: true }); setShipmentLoading(false); return; }
      setShipmentLoading(true);
      setShipmentData({ rows: [], error: "", unavailable: false });
      try {
        const [shipmentsResult, statusesResult] = await Promise.all([
          supabase.from("shipments").select("shipment_id, shipment_number, shipment_status_id, primary_transport_mode_id, planned_departure_date, planned_arrival_date, actual_departure_date, actual_arrival_date, cargo_ready_date, created_at, updated_at").order("updated_at", { ascending: false, nullsFirst: false }).limit(25),
          supabase.from("shipment_statuses").select("shipment_status_id, status_code, status_name, sort_order").order("sort_order", { ascending: true }),
        ]);
        if (!isMounted) return;
        const firstError = [shipmentsResult, statusesResult].find((result) => result?.error)?.error;
        if (firstError) { setShipmentData({ rows: [], error: firstError.message || "Unable to load shipment activity.", unavailable: false }); return; }
        const statusById = new Map((statusesResult.data ?? []).map((status) => [Number(status.shipment_status_id), status]));
        const rows = (shipmentsResult.data ?? []).map((shipment) => ({ ...shipment, status: statusById.get(Number(shipment.shipment_status_id)) ?? null }));
        setShipmentData({ rows, error: "", unavailable: false });
      } catch (error) {
        if (isMounted) setShipmentData({ rows: [], error: error.message || "Unable to load shipment activity.", unavailable: false });
      } finally { if (isMounted) setShipmentLoading(false); }
    };
    loadShipmentWorkspace();
    return () => { isMounted = false; };
  }, [isShipments, session, authorizationLoading, role, hasPermission, shipmentRefreshKey]);

  const handleShipmentCreated = (result) => {
    setShowShipmentCreate(false);
    setShipmentRefreshKey((current) => current + 1);
    setShipmentCreateMessage(
      `Shipment ${result.shipment_number} created successfully in DRAFT status.`
    );
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboardSnapshot = async () => {
      if (!isDashboard || !session || authorizationLoading || !role) return;

      const [operationsView, shipmentView, documentView, deliveryView] =
        await Promise.all([
          hasPermission("OPERATIONS_VIEW"),
          hasPermission("SHIPMENT_VIEW"),
          hasPermission("DOCUMENT_VIEW"),
          hasPermission("DELIVERY_VIEW"),
        ]);
      if (!isMounted) return;

      if (!operationsView) {
        setDashboardData((current) => ({ ...current, unavailable: true, error: "" }));
        setDashboardLoading(false);
        return;
      }

      setDashboardLoading(true);
      setDashboardData({
        activeShipments: null,
        pendingDocuments: null,
        containersInTransit: null,
        pendingDeliveries: null,
        error: "",
        unavailable: false,
      });

      try {
        const activeShipmentStatusIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        const pendingDocumentStatusIds = [1, 2, 3, 4];
        const pendingDeliveryStatusIds = [1, 2, 3, 4, 6, 7];

        const [shipments, documents, deliveries] = await Promise.all([
          shipmentView
            ? supabase
                .from("shipments")
                .select("shipment_id", { count: "exact", head: true })
                .in("shipment_status_id", activeShipmentStatusIds)
            : Promise.resolve({ count: null, error: null }),
          documentView
            ? supabase
                .from("documents")
                .select("document_id", { count: "exact", head: true })
                .in("document_status_id", pendingDocumentStatusIds)
            : Promise.resolve({ count: null, error: null }),
          deliveryView
            ? supabase
                .from("delivery")
                .select("delivery_id", { count: "exact", head: true })
                .in("delivery_status_id", pendingDeliveryStatusIds)
            : Promise.resolve({ count: null, error: null }),
        ]);

        if (!isMounted) return;

        const firstError = [shipments, documents, deliveries].find((result) => result?.error)?.error;
        if (firstError) {
          setDashboardData((current) => ({
            ...current,
            error: firstError.message || "Unable to load dashboard activity.",
            unavailable: false,
          }));
          return;
        }

        setDashboardData({
          activeShipments: shipmentView ? shipments.count ?? 0 : null,
          pendingDocuments: documentView ? documents.count ?? 0 : null,
          containersInTransit: null,
          pendingDeliveries: deliveryView ? deliveries.count ?? 0 : null,
          error: "",
          unavailable: false,
        });
      } catch (error) {
        if (isMounted) {
          setDashboardData((current) => ({
            ...current,
            error: error.message || "Unable to load dashboard activity.",
            unavailable: false,
          }));
        }
      } finally {
        if (isMounted) setDashboardLoading(false);
      }
    };

    loadDashboardSnapshot();

    return () => {
      isMounted = false;
    };
  }, [isDashboard, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadAuditLogWorkspace = async () => {
      if (!isAuditLog || !session || authorizationLoading || !role) return;
      const permitted = await hasPermission("AUDIT_VIEW");
      if (!isMounted) return;
      if (!permitted) {
        setAuditLogData({ rows: [], error: "", unavailable: true });
        setAuditLogLoading(false);
        return;
      }
      setAuditLogLoading(true);
      setAuditLogData({ rows: [], error: "", unavailable: false });
      try {
        const result = await supabase
          .from("audit_log")
          .select("audit_log_id, action_type, table_name, record_reference, action_timestamp, user_id, description")
          .order("action_timestamp", { ascending: false })
          .order("audit_log_id", { ascending: false })
          .limit(25);
        if (!isMounted) return;
        if (result.error) {
          console.error("CargoDesk Audit Log workspace load failed:", result.error);
          setAuditLogData({ rows: [], error: result.error.message || "Unable to load the Audit Log.", unavailable: false });
          return;
        }
        setAuditLogData({ rows: result.data ?? [], error: "", unavailable: false });
      } catch (error) {
        if (isMounted) {
          console.error("CargoDesk Audit Log workspace load failed:", error);
          setAuditLogData({ rows: [], error: error.message || "Unable to load the Audit Log.", unavailable: false });
        }
      } finally {
        if (isMounted) setAuditLogLoading(false);
      }
    };
    loadAuditLogWorkspace();
    return () => { isMounted = false; };
  }, [isAuditLog, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadContainerWorkspace = async () => {
      if (!isContainers || !session || authorizationLoading || !role) return;
      const permitted = await hasPermission("CARGO_VIEW");
      if (!isMounted) return;
      if (!permitted) { setContainerData({ rows: [], error: "", unavailable: true }); setContainerLoading(false); return; }
      setContainerLoading(true);
      setContainerData({ rows: [], error: "", unavailable: false });
      try {
        const [containersResult, linksResult, vgmResult, allocationResult] = await Promise.all([
          supabase.from("containers").select("container_id, container_number, container_type_id, owner_shipping_line_id, tare_weight, maximum_gross_weight, container_status, updated_at").order("updated_at", { ascending: false, nullsFirst: false }).limit(25),
          supabase.from("shipment_container").select("shipment_container_id, shipment_id, container_id, booking_id, container_sequence, seal_number, container_status").order("updated_at", { ascending: false, nullsFirst: false }).limit(25),
          supabase.from("container_vgm").select("container_vgm_id, shipment_id, container_id, vgm_reference, vgm_weight, weight_uom_id, verification_status_id, submitted_to_carrier_at").order("updated_at", { ascending: false, nullsFirst: false }).limit(25),
          Promise.resolve({ data: [], error: null }),
        ]);
        if (!isMounted) return;
        const firstError = [containersResult, linksResult, vgmResult, allocationResult].find((result) => result?.error)?.error;
        if (firstError) { setContainerData({ rows: [], error: firstError.message || "Unable to load container activity.", unavailable: false }); return; }
        const linksByContainer = new Map();
        (linksResult.data ?? []).forEach((link) => { if (!linksByContainer.has(Number(link.container_id))) linksByContainer.set(Number(link.container_id), link); });
        const vgmByContainer = new Map();
        (vgmResult.data ?? []).forEach((item) => { if (!vgmByContainer.has(Number(item.container_id))) vgmByContainer.set(Number(item.container_id), item); });
        setContainerData({ rows: (containersResult.data ?? []).map((item) => ({ ...item, shipmentLink: linksByContainer.get(Number(item.container_id)) ?? null, vgm: vgmByContainer.get(Number(item.container_id)) ?? null })), error: "", unavailable: false });
      } catch (error) {
        if (isMounted) setContainerData({ rows: [], error: error.message || "Unable to load container activity.", unavailable: false });
      } finally { if (isMounted) setContainerLoading(false); }
    };
    loadContainerWorkspace();
    return () => { isMounted = false; };
  }, [isContainers, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadDeliveryWorkspace = async () => {
      if (!isDelivery || !session || authorizationLoading || !role) return;

      const permitted = await hasPermission("DELIVERY_VIEW");
      if (!isMounted) return;

      if (!permitted) {
        setDeliveryData({ rows: [], error: "", unavailable: true });
        setDeliveryLoading(false);
        return;
      }

      setDeliveryLoading(true);
      setDeliveryData({ rows: [], error: "", unavailable: false });

      try {
        const [deliveryResult, statusResult, podResult] = await Promise.all([
          supabase
            .from("delivery")
            .select("delivery_id, shipment_id, delivery_reference, delivery_status_id, planned_delivery_date, dispatch_date, estimated_delivery_date, actual_delivery_date, vehicle_reference, received_by, remarks, updated_at")
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(25),
          supabase
            .from("delivery_statuses")
            .select("delivery_status_id, status_code, status_name, sort_order")
            .order("sort_order", { ascending: true }),
          supabase
            .from("proof_of_delivery")
            .select("proof_of_delivery_id, delivery_id, pod_reference, pod_date, received_by, receiver_role, signature_available, delivery_condition, shortage_quantity, verification_status_id, verified_by, verification_date, remarks")
            .order("pod_date", { ascending: false, nullsFirst: false })
            .limit(25),
        ]);

        if (!isMounted) return;

        const firstError = [deliveryResult, statusResult, podResult].find((result) => result?.error)?.error;
        if (firstError) {
          console.error("CargoDesk Delivery workspace load failed:", firstError);
          setDeliveryData({ rows: [], error: firstError.message || "Unable to load delivery activity.", unavailable: false });
          return;
        }

        const statusById = new Map((statusResult.data ?? []).map((status) => [Number(status.delivery_status_id), status]));
        const podByDelivery = new Map();
        (podResult.data ?? []).forEach((pod) => {
          if (!podByDelivery.has(Number(pod.delivery_id))) podByDelivery.set(Number(pod.delivery_id), pod);
        });

        setDeliveryData({
          rows: (deliveryResult.data ?? []).map((delivery) => ({
            ...delivery,
            status: statusById.get(Number(delivery.delivery_status_id)) ?? null,
            pod: podByDelivery.get(Number(delivery.delivery_id)) ?? null,
          })),
          error: "",
          unavailable: false,
        });
      } catch (error) {
        if (isMounted) {
          console.error("CargoDesk Delivery workspace load failed:", error);
          setDeliveryData({ rows: [], error: error.message || "Unable to load delivery activity.", unavailable: false });
        }
      } finally {
        if (isMounted) setDeliveryLoading(false);
      }
    };

    loadDeliveryWorkspace();
    return () => { isMounted = false; };
  }, [isDelivery, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadDocumentationWorkspace = async () => {
      if (!isDocumentation || !session || authorizationLoading || !role) return;

      const permitted = await hasPermission("DOCUMENT_VIEW");
      if (!isMounted) return;

      if (!permitted) {
        setDocumentationData({ rows: [], error: "", unavailable: true });
        setDocumentationLoading(false);
        return;
      }

      setDocumentationLoading(true);
      setDocumentationData({ rows: [], error: "", unavailable: false });

      try {
        const result = await supabase
          .from("documents")
          .select("document_id, document_number, document_title, document_type_id, document_status_id, file_name, version_number, is_current_version, uploaded_by, uploaded_at, expiry_date, updated_at")
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(25);

        if (!isMounted) return;

        if (result.error) {
          console.error("CargoDesk Documentation workspace load failed:", result.error);
          setDocumentationData({
            rows: [],
            error: result.error.message || "Unable to load documentation activity.",
            unavailable: false,
          });
          return;
        }

        const documentRows = result.data ?? [];
        const documentIds = documentRows.map((item) => item.document_id).filter((id) => id != null);

        if (documentIds.length === 0) {
          setDocumentationData({ rows: [], error: "", unavailable: false });
          return;
        }

        const linksResult = await supabase
          .from("shipment_documents")
          .select("document_id, shipment_id, is_primary")
          .in("document_id", documentIds);

        if (!isMounted) return;

        if (linksResult.error) {
          console.error("CargoDesk Documentation shipment linkage load failed:", linksResult.error);
          setDocumentationData({
            rows: [],
            error: linksResult.error.message || "Unable to load shipment-document links.",
            unavailable: false,
          });
          return;
        }

        const shipmentByDocument = new Map(
          (linksResult.data ?? []).map((link) => [Number(link.document_id), link])
        );

        setDocumentationData({
          rows: documentRows.map((item) => ({
            ...item,
            shipmentLink: shipmentByDocument.get(Number(item.document_id)) ?? null,
          })),
          error: "",
          unavailable: false,
        });
      } catch (error) {
        if (isMounted) {
          console.error("CargoDesk Documentation workspace load failed:", error);
          setDocumentationData({
            rows: [],
            error: error.message || "Unable to load documentation activity.",
            unavailable: false,
          });
        }
      } finally {
        if (isMounted) setDocumentationLoading(false);
      }
    };

    loadDocumentationWorkspace();

    return () => {
      isMounted = false;
    };
  }, [isDocumentation, session, authorizationLoading, role, hasPermission]);

  useEffect(() => {
    let isMounted = true;
    const loadReportsWorkspace = async () => {
      if (activePage !== "Reports" || !session || authorizationLoading || !role) return;
      const [operationsView, shipmentView, bookingView, cargoView, trackingView, exceptionView, deliveryView, documentView] =
        await Promise.all([
          hasPermission("OPERATIONS_VIEW"),
          hasPermission("SHIPMENT_VIEW"),
          hasPermission("BOOKING_VIEW"),
          hasPermission("CARGO_VIEW"),
          hasPermission("TRACKING_VIEW"),
          hasPermission("EXCEPTION_VIEW"),
          hasPermission("DELIVERY_VIEW"),
          hasPermission("DOCUMENT_VIEW"),
        ]);
      if (!isMounted) return;
      if (!operationsView) { setReportsData((current) => ({ ...current, unavailable: true, error: "" })); setReportsLoading(false); return; }
      setReportsLoading(true);
      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const results = await Promise.all([
          shipmentView ? supabase.from("shipments").select("shipment_id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
          bookingView ? supabase.from("bookings").select("booking_id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
          cargoView ? supabase.from("shipment_container").select("shipment_container_id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
          trackingView ? supabase.from("tracking_event").select("tracking_event_id", { count: "exact", head: true }).gte("event_datetime", since) : Promise.resolve({ count: null, error: null }),
          exceptionView ? supabase.from("shipment_exception").select("shipment_exception_id", { count: "exact", head: true }).is("resolved_at", null) : Promise.resolve({ count: null, error: null }),
          deliveryView ? supabase.from("delivery").select("delivery_id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
          documentView ? supabase.from("documents").select("document_id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
        ]);
        if (!isMounted) return;
        const firstError = results.find((result) => result?.error)?.error;
        if (firstError) { setReportsData((current) => ({ ...current, error: firstError.message || "Unable to load operational report data.", unavailable: false })); return; }
        setReportsData({ shipments: shipmentView ? results[0].count ?? 0 : null, bookings: bookingView ? results[1].count ?? 0 : null, containers: cargoView ? results[2].count ?? 0 : null, trackingEvents: trackingView ? results[3].count ?? 0 : null, unresolvedExceptions: exceptionView ? results[4].count ?? 0 : null, deliveries: deliveryView ? results[5].count ?? 0 : null, documents: documentView ? results[6].count ?? 0 : null, error: "", unavailable: false });
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
                      {dashboardLoading
                        ? "…"
                        : card.key === "containersInTransit"
                          ? "—"
                          : dashboardData[card.key] ?? "—"}
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

              {dashboardData.error && (
                <div
                  style={{
                    background: "#fff5f5",
                    border: "1px solid #fed7d7",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    marginBottom: "18px",
                    color: "#b83232",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  Unable to load dashboard activity: {dashboardData.error}
                </div>
              )}

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
          ) : isAuditLog ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Management</div>
                  <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Audit Log</h1>
                  <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>Read-only audit activity through the existing AUDIT_VIEW authorization boundary.</p>
                </div>
                {auditLogLoading ? (
                  <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading Audit Log...</div>
                ) : auditLogData.unavailable ? (
                  <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Audit Log access is not available for this role.</div>
                ) : auditLogData.error ? (
                  <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>Unable to load Audit Log data: {auditLogData.error}</div>
                ) : (
                  <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}>
                      <h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Recent audit activity</h2>
                      <span style={{ fontSize: "12px", color: "#627d98" }}>Showing up to 25 records</span>
                    </div>
                    {auditLogData.rows.length === 0 ? (
                      <div style={{ color: "#627d98", fontSize: "13px" }}>No audit records are available through the authorized read path.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                        <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Timestamp", "Action", "Actor ID", "Entity", "Record", "Description"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead>
                        <tbody>{auditLogData.rows.map((item) => <tr key={item.audit_log_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.action_timestamp ? new Date(item.action_timestamp).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#334e68" }}>{item.action_type || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.user_id ?? "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.table_name || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.record_reference || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.description || "—"}</td>
                        </tr>)}</tbody>
                      </table>
                    )}
                  </section>
                )}
              </div>
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
                      <div key={label} style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "10px", padding: "17px" }}><div style={{ fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div><div style={{ marginTop: "7px", fontSize: "27px", fontWeight: "700", color: "#173b6c" }}>{value == null ? "Not available" : value}</div></div>
                    ))}
                  </div>
                  <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" }}>Tracking activity</div>
                    <h2 style={{ margin: "0 0 8px", fontSize: "19px", color: "#173b6c" }}>Recent tracking events</h2>
                    <p style={{ margin: 0, color: "#627d98", fontSize: "13px", lineHeight: 1.6 }}>{reportsData.trackingEvents == null ? "Tracking activity is not available for this role." : `${reportsData.trackingEvents} tracking events recorded in the last 30 days through the authorized read path.`}</p>
                    <div style={{ marginTop: "16px", padding: "12px 14px", background: "#f5f7fb", border: "1px solid #e5e9f0", borderRadius: "8px", color: "#627d98", fontSize: "12px", lineHeight: 1.6 }}>These figures are descriptive record counts. They do not infer shipment performance, compliance, commercial authority, or completion status.</div>
                  </section>
                </>
              )}
            </div>          ) : isDocumentation ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                  ← Back to Dashboard
                </button>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations</div>
                  <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Documentation</h1>
                  <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>
                    Read-only document visibility through the existing DOCUMENT_VIEW authorization boundary.
                  </p>
                </div>
                {documentationLoading ? (
                  <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>
                    Loading documentation activity...
                  </div>
                ) : documentationData.unavailable ? (
                  <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>
                    Documentation activity is not available for this role.
                  </div>
                ) : documentationData.error ? (
                  <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>
                    Unable to load documentation activity: {documentationData.error}
                  </div>
                ) : (
                  <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Document records</h2>
                        <p style={{ margin: "6px 0 0", color: "#627d98", fontSize: "12px" }}>
                          Up to 25 records. Document type and status are shown as controlled IDs; no protected lookup access is assumed.
                        </p>
                      </div>
                      <span style={{ fontSize: "12px", color: "#627d98" }}>{documentationData.rows.length} record(s)</span>
                    </div>
                    {documentationData.rows.length === 0 ? (
                      <div style={{ color: "#627d98", fontSize: "13px" }}>No document records are available through the authorized read path.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1350px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #d9e2ec" }}>
                            {["Document", "Title", "Type ID", "Status ID", "Shipment ID", "File", "Version", "Current", "Uploaded", "Expiry", "Updated"].map((heading) => (
                              <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {documentationData.rows.map((item) => (
                            <tr key={item.document_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                              <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.document_number || ("Document " + item.document_id)}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#334e68" }}>{item.document_title || "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.document_type_id ?? "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.document_status_id ?? "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipmentLink?.shipment_id ?? "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.file_name || "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.version_number ?? "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.is_current_version == null ? "—" : item.is_current_version ? "Yes" : "No"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.expiry_date || "—"}</td>
                              <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                  <DocumentSubmitActions
                    rows={documentationData.rows}
                    authorizationLoading={authorizationLoading}
                    hasPermission={hasPermission}
                    onTransitioned={(documentId) => {
                      setDocumentationData((current) => ({
                        ...current,
                        rows: current.rows.map((row) =>
                          Number(row.document_id) === Number(documentId)
                            ? { ...row, document_status_id: 2, updated_at: new Date().toISOString() }
                            : row
                        ),
                      }));
                    }}
                  />
                  <DocumentReviewActions
                    rows={documentationData.rows}
                    authorizationLoading={authorizationLoading}
                    hasPermission={hasPermission}
                    onTransitioned={(documentId, transitionData) => {
                      const statusIdByCode = {
                        UNDER_REVIEW: 3,
                        APPROVED: 4,
                        ISSUED: 5,
                      };
                      const nextStatusId = statusIdByCode[transitionData?.new_status_code];
                      if (!nextStatusId) return;
                      setDocumentationData((current) => ({
                        ...current,
                        rows: current.rows.map((row) =>
                          Number(row.document_id) === Number(documentId)
                            ? { ...row, document_status_id: nextStatusId, updated_at: transitionData?.transitioned_at || new Date().toISOString() }
                            : row
                        ),
                      }));
                    }}
                  />                  </section>
                )}
              </div>
            </>
          ) : isExceptions ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <ExceptionsWorkspace
                  session={session}
                  role={role}
                  authorizationLoading={authorizationLoading}
                  hasPermission={hasPermission}
                />
              </div>
            </>
          ) : isDelivery ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations</div>
                  <h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Delivery</h1>
                  <p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px", lineHeight: 1.6 }}>Read-only delivery and proof-of-delivery visibility using the existing DELIVERY_VIEW authorization boundary.</p>
                </div>
                {deliveryLoading ? (
                  <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading delivery activity...</div>
                ) : deliveryData.unavailable ? (
                  <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Delivery activity is not available for this role.</div>
                ) : deliveryData.error ? (
                  <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>Unable to load delivery activity: {deliveryData.error}</div>
                ) : (
                  <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}>
                      <h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Delivery records</h2>
                      <span style={{ fontSize: "12px", color: "#627d98" }}>Showing up to 25 deliveries; status meanings are from the authorized lookup table.</span>
                    </div>
                    {deliveryData.rows.length === 0 ? (
                      <div style={{ color: "#627d98", fontSize: "13px" }}>No delivery records are available through the authorized read path.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1450px" }}>
                        <thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Delivery", "Shipment ID", "Status", "Planned", "Dispatch", "Estimated", "Actual", "Vehicle", "Received By", "POD", "POD Verification ID"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead>
                        <tbody>{deliveryData.rows.map((item) => <tr key={item.delivery_id} style={{ borderBottom: "1px solid #eef2f7" }}>
                          <td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.delivery_reference || ("Delivery " + item.delivery_id)}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipment_id ?? "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.status?.status_name || item.status?.status_code || item.delivery_status_id || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.planned_delivery_date ? new Date(item.planned_delivery_date).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.dispatch_date ? new Date(item.dispatch_date).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.estimated_delivery_date ? new Date(item.estimated_delivery_date).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.actual_delivery_date ? new Date(item.actual_delivery_date).toLocaleString() : "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.vehicle_reference || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.received_by || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.pod?.pod_reference || "—"}</td>
                          <td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.pod?.verification_status_id ?? "—"}</td>
                        </tr>)}</tbody>
                      </table>
                    )}
                  </section>
                )}
              </div>
            </>
          ) : isContainers ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <div style={{ marginBottom: "20px" }}><div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations</div><h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Containers</h1><p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px" }}>Read-only container visibility using the existing CARGO_VIEW authorization boundary.</p></div>
                {containerLoading ? <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading container activity...</div> : containerData.unavailable ? <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Container activity is not available for this role.</div> : containerData.error ? <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>Unable to load container activity: {containerData.error}</div> : <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}><h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Container records</h2><span style={{ fontSize: "12px", color: "#627d98" }}>Showing up to 25 containers; type and verification remain controlled IDs.</span></div>
                  {containerData.rows.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No container records are available through the authorized read path.</div> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1350px" }}><thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Container", "Type ID", "Owner ID", "Status", "Tare", "Max Gross", "Shipment ID", "Booking ID", "Seal", "VGM", "VGM Status ID"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead><tbody>{containerData.rows.map((item) => <tr key={item.container_id} style={{ borderBottom: "1px solid #eef2f7" }}><td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.container_number}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.container_type_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.owner_shipping_line_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.container_status || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.tare_weight ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.maximum_gross_weight ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipmentLink?.shipment_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipmentLink?.booking_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipmentLink?.seal_number || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.vgm?.vgm_weight ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.vgm?.verification_status_id ?? "—"}</td></tr>)}</tbody></table>}
                </section>}
              </div>
            </>
          ) : isShipments ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <div style={{ marginBottom: "20px" }}><div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations</div><div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-end" }}><div><h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Shipments</h1><p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px" }}>Create and monitor core shipment records through controlled authorized workflows.</p></div>{shipmentCreateAllowed && !showShipmentCreate && <button type="button" onClick={() => { setShipmentCreateMessage(""); setShowShipmentCreate(true); }} style={{ border: "none", borderRadius: "7px", padding: "10px 14px", background: "#173b6c", color: "#ffffff", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Create Shipment</button>}</div></div>
                {shipmentCreateMessage && <div style={{ background: "#e6f4ea", border: "1px solid #b7dfc6", borderRadius: "8px", padding: "11px 13px", color: "#1f7a5a", fontSize: "12px", marginBottom: "16px" }}>{shipmentCreateMessage}</div>}
                {showShipmentCreate ? <CreateShipmentForm onCreated={handleShipmentCreated} onCancel={() => setShowShipmentCreate(false)} /> : shipmentLoading ? <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading shipments...</div> : shipmentData.unavailable ? <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Shipment activity is not available for this role.</div> : shipmentData.error ? <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>Unable to load shipment activity: {shipmentData.error}</div> : <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}><h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Shipment records</h2><span style={{ fontSize: "12px", color: "#627d98" }}>Showing up to 25 records</span></div>
                  {shipmentData.rows.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No shipment records are available through the authorized read path.</div> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}><thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Shipment", "Status", "Transport Mode ID", "Planned Departure", "Planned Arrival", "Actual Departure", "Actual Arrival", "Cargo Ready"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead><tbody>{shipmentData.rows.map((item) => <tr key={item.shipment_id} style={{ borderBottom: "1px solid #eef2f7" }}><td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.shipment_number || ("Shipment " + item.shipment_id)}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.status?.status_name || item.status?.status_code || item.shipment_status_id || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.primary_transport_mode_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.planned_departure_date || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.planned_arrival_date || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.actual_departure_date || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.actual_arrival_date || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.cargo_ready_date || "—"}</td></tr>)}</tbody></table>}
                </section>}
              </div>
            </>
          ) : isShipping ? (
            <>
              <div style={{ marginBottom: "22px" }}>
                <button type="button" onClick={() => handleNavigation("Dashboard")} style={{ border: "none", background: "transparent", padding: 0, cursor: allowedNavigation.Dashboard === true ? "pointer" : "not-allowed", color: "#1f5f95", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>← Back to Dashboard</button>
                <div style={{ marginBottom: "20px" }}><div style={{ fontSize: "12px", fontWeight: "600", color: "#627d98", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Operations</div><h1 style={{ margin: 0, fontSize: "28px", color: "#173b6c" }}>Shipping</h1><p style={{ margin: "8px 0 0", color: "#627d98", fontSize: "14px" }}>Read-only booking activity using the existing authorized booking data path.</p></div>
                {bookingLoading ? <div style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", color: "#627d98", fontSize: "13px" }}>Loading booking activity...</div> : bookingData.unavailable ? <div style={{ background: "#ffffff", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px" }}>Booking activity is not available for this role.</div> : bookingData.error ? <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "12px", padding: "20px", color: "#b83232", fontSize: "13px", lineHeight: 1.6 }}>Unable to load booking activity: {bookingData.error}</div> : <section style={{ background: "#ffffff", border: "1px solid #e5e9f0", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline", marginBottom: "14px" }}><h2 style={{ margin: 0, fontSize: "18px", color: "#173b6c" }}>Booking records</h2><span style={{ fontSize: "12px", color: "#627d98" }}>Status displayed as controlled ID; lookup access is not assumed.</span></div>
                  {bookingData.rows.length === 0 ? <div style={{ color: "#627d98", fontSize: "13px" }}>No booking records are available through the authorized read path.</div> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}><thead><tr style={{ borderBottom: "1px solid #d9e2ec" }}>{["Booking", "Shipment ID", "Status ID", "Booking Date", "Requested ETD", "Confirmed ETD", "Requested ETA", "Confirmed ETA", "Voyage", "Freight Terms", "Carrier Reference"].map((heading) => <th key={heading} style={{ padding: "9px 8px", textAlign: "left", fontSize: "11px", color: "#627d98", textTransform: "uppercase", letterSpacing: "0.5px" }}>{heading}</th>)}</tr></thead><tbody>{bookingData.rows.map((item) => <tr key={item.booking_id} style={{ borderBottom: "1px solid #eef2f7" }}><td style={{ padding: "10px 8px", fontSize: "12px", fontWeight: "700", color: "#1f5f95" }}>{item.booking_number || ("Booking " + item.booking_id)}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.shipment_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.booking_status_id ?? "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.booking_date || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.requested_etd || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.confirmed_etd || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.requested_eta || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.confirmed_eta || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.voyage_number || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.freight_terms || "—"}</td><td style={{ padding: "10px 8px", fontSize: "12px", color: "#627d98" }}>{item.carrier_reference || "—"}</td></tr>)}</tbody></table>}
                </section>}
              </div>
            </>
          <ShipmentCargoWorkspace shipments={shipmentData.rows} />
          ) : isWarehouse ? (
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