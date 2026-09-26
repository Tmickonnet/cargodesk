-- EXECUTABLE DRAFT ONLY — NOT APPROVED / NOT APPLIED
-- Product & Classification domain.
-- This file is a review candidate. Do not apply directly to production.

BEGIN;

CREATE SEQUENCE logistics.product_product_id_seq;
CREATE SEQUENCE logistics.classification_system_classification_system_id_seq;
CREATE SEQUENCE logistics.classification_jurisdiction_classification_jurisdiction_id_seq;
CREATE SEQUENCE logistics.classification_edition_classification_edition_id_seq;
CREATE SEQUENCE logistics.classification_record_classification_record_id_seq;
CREATE SEQUENCE logistics.product_classification_product_classification_id_seq;
CREATE SEQUENCE logistics.shipment_cargo_classification_shipment_cargo_classification_id_seq;

CREATE TABLE logistics.product (
    product_id bigint NOT NULL DEFAULT nextval('logistics.product_product_id_seq'),
    product_code varchar(100) NOT NULL,
    product_name varchar(255) NOT NULL,
    parent_product_id bigint,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    effective_from date,
    effective_to date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_pkey PRIMARY KEY (product_id),
    CONSTRAINT product_code_key UNIQUE (product_code),
    CONSTRAINT product_parent_fk FOREIGN KEY (parent_product_id) REFERENCES logistics.product(product_id) ON DELETE RESTRICT,
    CONSTRAINT product_not_self_parent_ck CHECK (parent_product_id IS NULL OR parent_product_id <> product_id),
    CONSTRAINT product_effective_dates_ck CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);
ALTER SEQUENCE logistics.product_product_id_seq OWNED BY logistics.product.product_id;

CREATE TABLE logistics.classification_system (
    classification_system_id bigint NOT NULL DEFAULT nextval('logistics.classification_system_classification_system_id_seq'),
    system_code varchar(50) NOT NULL,
    system_name varchar(255) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classification_system_pkey PRIMARY KEY (classification_system_id),
    CONSTRAINT classification_system_code_key UNIQUE (system_code)
);
ALTER SEQUENCE logistics.classification_system_classification_system_id_seq OWNED BY logistics.classification_system.classification_system_id;

CREATE TABLE logistics.classification_jurisdiction (
    classification_jurisdiction_id bigint NOT NULL DEFAULT nextval('logistics.classification_jurisdiction_classification_jurisdiction_id_seq'),
    jurisdiction_code varchar(50) NOT NULL,
    jurisdiction_name varchar(255) NOT NULL,
    country_id bigint,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classification_jurisdiction_pkey PRIMARY KEY (classification_jurisdiction_id),
    CONSTRAINT classification_jurisdiction_code_key UNIQUE (jurisdiction_code),
    CONSTRAINT classification_jurisdiction_country_fk FOREIGN KEY (country_id) REFERENCES logistics.countries(country_id) ON DELETE RESTRICT
);
ALTER SEQUENCE logistics.classification_jurisdiction_classification_jurisdiction_id_seq OWNED BY logistics.classification_jurisdiction.classification_jurisdiction_id;

CREATE TABLE logistics.classification_edition (
    classification_edition_id bigint NOT NULL DEFAULT nextval('logistics.classification_edition_classification_edition_id_seq'),
    classification_system_id bigint NOT NULL,
    edition_code varchar(100) NOT NULL,
    edition_name varchar(255),
    effective_from date NOT NULL,
    effective_to date,
    status_code varchar(20) NOT NULL DEFAULT 'ACTIVE',
    source_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classification_edition_pkey PRIMARY KEY (classification_edition_id),
    CONSTRAINT classification_edition_unique_key UNIQUE (classification_system_id, edition_code),
    CONSTRAINT classification_edition_system_fk FOREIGN KEY (classification_system_id) REFERENCES logistics.classification_system(classification_system_id) ON DELETE RESTRICT,
    CONSTRAINT classification_edition_status_ck CHECK (status_code IN ('ACTIVE','SUPERSEDED','RETIRED')),
    CONSTRAINT classification_edition_dates_ck CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
ALTER SEQUENCE logistics.classification_edition_classification_edition_id_seq OWNED BY logistics.classification_edition.classification_edition_id;

CREATE TABLE logistics.classification_record (
    classification_record_id bigint NOT NULL DEFAULT nextval('logistics.classification_record_classification_record_id_seq'),
    classification_edition_id bigint NOT NULL,
    classification_jurisdiction_id bigint NOT NULL,
    parent_classification_record_id bigint,
    classification_code varchar(100) NOT NULL,
    official_description text NOT NULL,
    status_code varchar(20) NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classification_record_pkey PRIMARY KEY (classification_record_id),
    CONSTRAINT classification_record_unique_key UNIQUE (classification_edition_id, classification_jurisdiction_id, classification_code),
    CONSTRAINT classification_record_edition_fk FOREIGN KEY (classification_edition_id) REFERENCES logistics.classification_edition(classification_edition_id) ON DELETE RESTRICT,
    CONSTRAINT classification_record_jurisdiction_fk FOREIGN KEY (classification_jurisdiction_id) REFERENCES logistics.classification_jurisdiction(classification_jurisdiction_id) ON DELETE RESTRICT,
    CONSTRAINT classification_record_parent_fk FOREIGN KEY (parent_classification_record_id) REFERENCES logistics.classification_record(classification_record_id) ON DELETE RESTRICT,
    CONSTRAINT classification_record_status_ck CHECK (status_code IN ('ACTIVE','SUPERSEDED','RETIRED')),
    CONSTRAINT classification_record_not_self_parent_ck CHECK (parent_classification_record_id IS NULL OR parent_classification_record_id <> classification_record_id)
);
ALTER SEQUENCE logistics.classification_record_classification_record_id_seq OWNED BY logistics.classification_record.classification_record_id;

CREATE TABLE logistics.product_classification (
    product_classification_id bigint NOT NULL DEFAULT nextval('logistics.product_classification_product_classification_id_seq'),
    product_id bigint NOT NULL,
    classification_record_id bigint NOT NULL,
    effective_from date,
    effective_to date,
    status_code varchar(20) NOT NULL DEFAULT 'ACTIVE',
    source_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_classification_pkey PRIMARY KEY (product_classification_id),
    CONSTRAINT product_classification_product_fk FOREIGN KEY (product_id) REFERENCES logistics.product(product_id) ON DELETE RESTRICT,
    CONSTRAINT product_classification_record_fk FOREIGN KEY (classification_record_id) REFERENCES logistics.classification_record(classification_record_id) ON DELETE RESTRICT,
    CONSTRAINT product_classification_status_ck CHECK (status_code IN ('ACTIVE','SUPERSEDED','RETIRED')),
    CONSTRAINT product_classification_dates_ck CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);
ALTER SEQUENCE logistics.product_classification_product_classification_id_seq OWNED BY logistics.product_classification.product_classification_id;

CREATE UNIQUE INDEX product_classification_active_unique_idx ON logistics.product_classification (product_id, classification_record_id) WHERE status_code = 'ACTIVE';
CREATE INDEX product_classification_record_lookup_idx ON logistics.product_classification (classification_record_id);

CREATE TABLE logistics.shipment_cargo_classification (
    shipment_cargo_classification_id bigint NOT NULL DEFAULT nextval('logistics.shipment_cargo_classification_shipment_cargo_classification_id_seq'),
    shipment_cargo_id bigint NOT NULL,
    product_id bigint NOT NULL,
    classification_record_id bigint NOT NULL,
    classification_code_snapshot varchar(100) NOT NULL,
    classification_description_snapshot text NOT NULL,
    classification_system_code_snapshot varchar(50) NOT NULL,
    classification_edition_code_snapshot varchar(100) NOT NULL,
    jurisdiction_code_snapshot varchar(50) NOT NULL,
    status_code varchar(20) NOT NULL DEFAULT 'SUGGESTED',
    source_code varchar(30) NOT NULL,
    verified_by bigint,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT shipment_cargo_classification_pkey PRIMARY KEY (shipment_cargo_classification_id),
    CONSTRAINT shipment_cargo_classification_cargo_fk FOREIGN KEY (shipment_cargo_id) REFERENCES logistics.shipment_cargo(shipment_cargo_id) ON DELETE RESTRICT,
    CONSTRAINT shipment_cargo_classification_product_fk FOREIGN KEY (product_id) REFERENCES logistics.product(product_id) ON DELETE RESTRICT,
    CONSTRAINT shipment_cargo_classification_record_fk FOREIGN KEY (classification_record_id) REFERENCES logistics.classification_record(classification_record_id) ON DELETE RESTRICT,
    CONSTRAINT shipment_cargo_classification_verified_by_fk FOREIGN KEY (verified_by) REFERENCES logistics.users(user_id) ON DELETE RESTRICT,
    CONSTRAINT shipment_cargo_classification_status_ck CHECK (status_code IN ('SUGGESTED','UNDER_REVIEW','VERIFIED','REJECTED','SUPERSEDED')),
    CONSTRAINT shipment_cargo_classification_source_ck CHECK (source_code IN ('MASTER_REFERENCE','HUMAN_ENTERED','HUMAN_VERIFIED','IMPORTED_REFERENCE','DOCUMENT_DERIVED','SYSTEM_SUGGESTED')),
    CONSTRAINT shipment_cargo_classification_verification_ck CHECK ((status_code = 'VERIFIED' AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR status_code <> 'VERIFIED')
);
ALTER SEQUENCE logistics.shipment_cargo_classification_shipment_cargo_classification_id_seq OWNED BY logistics.shipment_cargo_classification.shipment_cargo_classification_id;

CREATE INDEX shipment_cargo_classification_cargo_lookup_idx ON logistics.shipment_cargo_classification (shipment_cargo_id);
CREATE INDEX shipment_cargo_classification_product_lookup_idx ON logistics.shipment_cargo_classification (product_id);
CREATE INDEX shipment_cargo_classification_record_lookup_idx ON logistics.shipment_cargo_classification (classification_record_id);

-- RLS is required before these tables can be exposed through the authenticated Data API.
ALTER TABLE logistics.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_jurisdiction ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_edition ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.classification_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.product_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics.shipment_cargo_classification ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies or table grants in this draft.
-- Permission/RLS policies must be reviewed as a separate security package.

COMMENT ON TABLE logistics.product IS 'Product and sub-product hierarchy for shipment cargo identity.';
COMMENT ON TABLE logistics.classification_system IS 'Classification systems used by CargoDesk.';
COMMENT ON TABLE logistics.classification_jurisdiction IS 'Jurisdictions governing classification interpretation.';
COMMENT ON TABLE logistics.classification_edition IS 'Versioned editions of classification systems.';
COMMENT ON TABLE logistics.classification_record IS 'Authoritative classification codes and descriptions within an edition and jurisdiction.';
COMMENT ON TABLE logistics.product_classification IS 'Versioned mapping between products and classification records.';
COMMENT ON TABLE logistics.shipment_cargo_classification IS 'Shipment-specific classification with historical snapshots and explicit verification state.';

COMMIT;
