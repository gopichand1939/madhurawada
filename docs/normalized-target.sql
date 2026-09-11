-- DESIGN ONLY: not the migration used by the current MVP.

-- Review and integrate with typed services before applying.

BEGIN;

CREATE SCHEMA IF NOT EXISTS cloud_kitchen_target;

SET LOCAL search_path TO cloud_kitchen_target, public;

CREATE TABLE kitchens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL, branding jsonb NOT NULL DEFAULT '{}', delivery_settings jsonb NOT NULL DEFAULT '{}', accepting_orders boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  email text NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  UNIQUE(kitchen_id,email)
);

CREATE INDEX users_tenant_idx ON users(kitchen_id,created_at);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  UNIQUE(kitchen_id,name)
);

CREATE INDEX roles_tenant_idx ON roles(kitchen_id,created_at);

CREATE TABLE permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,user_id) REFERENCES users(kitchen_id,id),
  FOREIGN KEY(kitchen_id,role_id) REFERENCES roles(kitchen_id,id),
  UNIQUE(kitchen_id,user_id,role_id)
);

CREATE INDEX user_roles_tenant_idx ON user_roles(kitchen_id,created_at);

CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,role_id) REFERENCES roles(kitchen_id,id),
  UNIQUE(kitchen_id,role_id,permission_id)
);

CREATE INDEX role_permissions_tenant_idx ON role_permissions(kitchen_id,created_at);

CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK(size_bytes>=0),
  alt_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,uploaded_by) REFERENCES users(kitchen_id,id)
);

CREATE INDEX media_tenant_idx ON media(kitchen_id,created_at);

CREATE TABLE sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  image_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,image_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id,slug)
);

CREATE INDEX sections_tenant_idx ON sections(kitchen_id,created_at);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  section_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  image_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,section_id) REFERENCES sections(kitchen_id,id),
  FOREIGN KEY(kitchen_id,image_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id,slug)
);

CREATE INDEX categories_tenant_idx ON categories(kitchen_id,created_at);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  category_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  image_id uuid,
  sku text NOT NULL,
  short_description text,
  base_price_paise integer NOT NULL CHECK(base_price_paise>=0),
  discount_price_paise integer CHECK(discount_price_paise>=0),
  tax_basis_points integer NOT NULL DEFAULT 0 CHECK(tax_basis_points>=0),
  prep_minutes integer NOT NULL DEFAULT 25 CHECK(prep_minutes>=0),
  serving_size text,
  calories integer CHECK(calories>=0),
  vegetarian boolean NOT NULL,
  allergens text[] NOT NULL DEFAULT '{}',
  spice_level smallint NOT NULL DEFAULT 0 CHECK(spice_level BETWEEN 0 AND 5),
  bestseller boolean NOT NULL DEFAULT false,
  recommended boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT true,
  stock_status text NOT NULL DEFAULT 'AVAILABLE',
  seo_title text,
  seo_description text,
  extra_attributes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,category_id) REFERENCES categories(kitchen_id,id),
  FOREIGN KEY(kitchen_id,image_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id,slug),
  UNIQUE(kitchen_id,sku),
  CHECK(discount_price_paise IS NULL OR discount_price_paise<=base_price_paise)
);

CREATE INDEX menu_items_tenant_idx ON menu_items(kitchen_id,created_at);

CREATE TABLE item_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  item_id uuid NOT NULL,
  media_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,item_id) REFERENCES menu_items(kitchen_id,id),
  FOREIGN KEY(kitchen_id,media_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id,item_id,media_id)
);

CREATE INDEX item_gallery_tenant_idx ON item_gallery(kitchen_id,created_at);

CREATE TABLE item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  item_id uuid NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  price_paise integer NOT NULL CHECK(price_paise>=0),
  discount_price_paise integer CHECK(discount_price_paise>=0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,item_id) REFERENCES menu_items(kitchen_id,id),
  UNIQUE(kitchen_id,sku),
  CHECK(discount_price_paise IS NULL OR discount_price_paise<=price_paise)
);

CREATE INDEX item_variants_tenant_idx ON item_variants(kitchen_id,created_at);

CREATE TABLE addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  name text NOT NULL,
  min_selections integer NOT NULL DEFAULT 0,
  max_selections integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  CHECK(min_selections>=0 AND max_selections>=min_selections)
);

CREATE INDEX addon_groups_tenant_idx ON addon_groups(kitchen_id,created_at);

CREATE TABLE addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  group_id uuid NOT NULL,
  name text NOT NULL,
  price_paise integer NOT NULL CHECK(price_paise>=0),
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,group_id) REFERENCES addon_groups(kitchen_id,id)
);

CREATE INDEX addons_tenant_idx ON addons(kitchen_id,created_at);

CREATE TABLE item_addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  item_id uuid NOT NULL,
  group_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,item_id) REFERENCES menu_items(kitchen_id,id),
  FOREIGN KEY(kitchen_id,group_id) REFERENCES addon_groups(kitchen_id,id),
  UNIQUE(kitchen_id,item_id,group_id)
);

CREATE INDEX item_addon_groups_tenant_idx ON item_addon_groups(kitchen_id,created_at);

CREATE TABLE hero_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  desktop_image_id uuid,
  mobile_image_id uuid,
  cta_text text,
  cta_action text,
  cta_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,desktop_image_id) REFERENCES media(kitchen_id,id),
  FOREIGN KEY(kitchen_id,mobile_image_id) REFERENCES media(kitchen_id,id),
  CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);

CREATE INDEX hero_sections_tenant_idx ON hero_sections(kitchen_id,created_at);

CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  desktop_image_id uuid,
  mobile_image_id uuid,
  cta_text text,
  cta_action text,
  cta_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,desktop_image_id) REFERENCES media(kitchen_id,id),
  FOREIGN KEY(kitchen_id,mobile_image_id) REFERENCES media(kitchen_id,id),
  CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);

CREATE INDEX banners_tenant_idx ON banners(kitchen_id,created_at);

CREATE TABLE about_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  image_id uuid,
  mission text,
  story text,
  features jsonb NOT NULL DEFAULT '[]',
  statistics jsonb NOT NULL DEFAULT '[]',
  cta_text text,
  cta_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,image_id) REFERENCES media(kitchen_id,id)
);

CREATE INDEX about_sections_tenant_idx ON about_sections(kitchen_id,created_at);

CREATE TABLE contact_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  phone text,
  whatsapp text,
  email text,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  maps_url text,
  opening_hours jsonb NOT NULL DEFAULT '{}',
  social_links jsonb NOT NULL DEFAULT '{}',
  delivery_radius_km numeric(4,1) CHECK(delivery_radius_km>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  UNIQUE(kitchen_id)
);

CREATE INDEX contact_settings_tenant_idx ON contact_settings(kitchen_id,created_at);

CREATE TABLE footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  logo_id uuid,
  description text,
  navigation_links jsonb NOT NULL DEFAULT '[]',
  legal_links jsonb NOT NULL DEFAULT '[]',
  copyright_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,logo_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id)
);

CREATE INDEX footer_settings_tenant_idx ON footer_settings(kitchen_id,created_at);

CREATE TABLE testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  customer_name text NOT NULL,
  rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review text NOT NULL,
  image_id uuid,
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  consent_record text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,image_id) REFERENCES media(kitchen_id,id)
);

CREATE INDEX testimonials_tenant_idx ON testimonials(kitchen_id,created_at);

CREATE TABLE seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  path text NOT NULL,
  title text NOT NULL,
  description text,
  og_title text,
  og_description text,
  og_image_id uuid,
  canonical_url text,
  structured_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,og_image_id) REFERENCES media(kitchen_id,id),
  UNIQUE(kitchen_id,path)
);

CREATE INDEX seo_pages_tenant_idx ON seo_pages(kitchen_id,created_at);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  phone_verified_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  UNIQUE(kitchen_id,phone)
);

CREATE INDEX customers_tenant_idx ON customers(kitchen_id,created_at);

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  customer_id uuid NOT NULL,
  label text,
  address text NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,customer_id) REFERENCES customers(kitchen_id,id)
);

CREATE INDEX customer_addresses_tenant_idx ON customer_addresses(kitchen_id,created_at);

CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  code text NOT NULL,
  discount_type text NOT NULL CHECK(discount_type IN ('PERCENT','FIXED')),
  value integer NOT NULL CHECK(value>0),
  minimum_order_paise integer NOT NULL DEFAULT 0,
  maximum_discount_paise integer,
  starts_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  usage_limit integer,
  per_customer_limit integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  UNIQUE(kitchen_id,code),
  CHECK(expires_at>starts_at),
  CHECK(discount_type<>'PERCENT' OR value<=100)
);

CREATE INDEX coupons_tenant_idx ON coupons(kitchen_id,created_at);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  customer_id uuid NOT NULL,
  order_number text NOT NULL,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  payment_status text NOT NULL DEFAULT 'NOT_PAID',
  subtotal_paise integer NOT NULL CHECK(subtotal_paise>=0),
  discount_paise integer NOT NULL DEFAULT 0 CHECK(discount_paise>=0),
  tax_paise integer NOT NULL DEFAULT 0 CHECK(tax_paise>=0),
  delivery_paise integer NOT NULL DEFAULT 0 CHECK(delivery_paise>=0),
  total_paise integer NOT NULL CHECK(total_paise>=0),
  address_snapshot jsonb NOT NULL,
  requested_slot timestamptz,
  tracking_token_hash text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,customer_id) REFERENCES customers(kitchen_id,id),
  UNIQUE(kitchen_id,order_number),
  UNIQUE(kitchen_id,idempotency_key),
  CHECK(total_paise=subtotal_paise-discount_paise+tax_paise+delivery_paise)
);

CREATE INDEX orders_tenant_idx ON orders(kitchen_id,created_at);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  order_id uuid NOT NULL,
  item_id uuid,
  variant_id uuid,
  name_snapshot text NOT NULL,
  variant_snapshot text,
  quantity integer NOT NULL CHECK(quantity>0),
  unit_price_paise integer NOT NULL CHECK(unit_price_paise>=0),
  total_paise integer NOT NULL CHECK(total_paise>=0),
  tax_snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,order_id) REFERENCES orders(kitchen_id,id),
  FOREIGN KEY(kitchen_id,item_id) REFERENCES menu_items(kitchen_id,id),
  FOREIGN KEY(kitchen_id,variant_id) REFERENCES item_variants(kitchen_id,id)
);

CREATE INDEX order_items_tenant_idx ON order_items(kitchen_id,created_at);

CREATE TABLE order_item_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  order_item_id uuid NOT NULL,
  addon_id uuid,
  name_snapshot text NOT NULL,
  quantity integer NOT NULL CHECK(quantity>0),
  unit_price_paise integer NOT NULL CHECK(unit_price_paise>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,order_item_id) REFERENCES order_items(kitchen_id,id),
  FOREIGN KEY(kitchen_id,addon_id) REFERENCES addons(kitchen_id,id)
);

CREATE INDEX order_item_addons_tenant_idx ON order_item_addons(kitchen_id,created_at);

CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,order_id) REFERENCES orders(kitchen_id,id),
  FOREIGN KEY(kitchen_id,actor_id) REFERENCES users(kitchen_id,id)
);

CREATE INDEX order_status_history_tenant_idx ON order_status_history(kitchen_id,created_at);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  order_id uuid NOT NULL,
  provider text NOT NULL,
  provider_payment_id text,
  amount_paise integer NOT NULL CHECK(amount_paise>=0),
  refunded_paise integer NOT NULL DEFAULT 0 CHECK(refunded_paise>=0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL,
  last_event_id text,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,order_id) REFERENCES orders(kitchen_id,id),
  UNIQUE(provider,provider_payment_id),
  CHECK(refunded_paise<=amount_paise)
);

CREATE INDEX payments_tenant_idx ON payments(kitchen_id,created_at);

CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  payment_id uuid NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  event_hash text NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,payment_id) REFERENCES payments(kitchen_id,id)
);

CREATE INDEX payment_events_tenant_idx ON payment_events(kitchen_id,created_at);

CREATE TABLE coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  coupon_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  order_id uuid NOT NULL,
  discount_paise integer NOT NULL CHECK(discount_paise>=0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,coupon_id) REFERENCES coupons(kitchen_id,id),
  FOREIGN KEY(kitchen_id,customer_id) REFERENCES customers(kitchen_id,id),
  FOREIGN KEY(kitchen_id,order_id) REFERENCES orders(kitchen_id,id),
  UNIQUE(kitchen_id,order_id,coupon_id)
);

CREATE INDEX coupon_redemptions_tenant_idx ON coupon_redemptions(kitchen_id,created_at);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id uuid NOT NULL REFERENCES kitchens(id),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  redacted_changes jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(kitchen_id,id),
  FOREIGN KEY(kitchen_id,actor_id) REFERENCES users(kitchen_id,id)
);

CREATE INDEX audit_logs_tenant_idx ON audit_logs(kitchen_id,created_at);

CREATE INDEX orders_queue_idx ON orders(kitchen_id,status,created_at);

CREATE INDEX menu_items_available_idx ON menu_items(kitchen_id,category_id,active,available,sort_order);

-- Append-only audit/history privileges and updated_at triggers belong in the deployment migration.

-- Enforce option membership, coupon limits and payment reconciliation transactionally.

COMMIT;
