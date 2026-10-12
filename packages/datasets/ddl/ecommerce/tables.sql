CREATE TABLE customers (
  customer_id bigint PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text,
  country_code char(2) NOT NULL,
  city text NOT NULL,
  loyalty_tier text NOT NULL CHECK (loyalty_tier IN ('none', 'silver', 'gold', 'platinum')),
  marketing_opt_in boolean NOT NULL,
  created_at timestamptz NOT NULL,
  last_login_at timestamptz
);

CREATE TABLE addresses (
  address_id bigint PRIMARY KEY,
  customer_id bigint NOT NULL,
  address_type text NOT NULL CHECK (address_type IN ('shipping', 'billing')),
  street_line text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  country_code char(2) NOT NULL,
  is_default boolean NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE categories (
  category_id bigint PRIMARY KEY,
  parent_category_id bigint,
  category_name text NOT NULL,
  slug text NOT NULL
);

CREATE TABLE products (
  product_id bigint PRIMARY KEY,
  sku text NOT NULL,
  product_name text NOT NULL,
  category_id bigint NOT NULL,
  brand text NOT NULL,
  unit_price numeric(14, 2) NOT NULL CHECK (unit_price > 0),
  unit_cost numeric(14, 2) NOT NULL CHECK (unit_cost > 0),
  currency char(3) NOT NULL,
  weight_grams integer NOT NULL,
  is_active boolean NOT NULL,
  launched_at timestamptz NOT NULL
);

CREATE TABLE inventory (
  product_id bigint NOT NULL,
  warehouse_code text NOT NULL,
  quantity_on_hand integer NOT NULL CHECK (quantity_on_hand >= 0),
  quantity_reserved integer NOT NULL CHECK (quantity_reserved >= 0),
  reorder_point integer NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (product_id, warehouse_code)
);

CREATE TABLE promotions (
  promotion_id bigint PRIMARY KEY,
  promo_code text NOT NULL,
  description text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed_amount', 'free_shipping')),
  discount_value numeric(10, 2) NOT NULL,
  min_order_amount numeric(14, 2),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz
);

CREATE TABLE orders (
  order_id bigint PRIMARY KEY,
  order_number text NOT NULL,
  customer_id bigint NOT NULL,
  shipping_address_id bigint,
  promotion_id bigint,
  status text NOT NULL CHECK (
    status IN ('pending_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'returned')
  ),
  sales_channel text NOT NULL CHECK (sales_channel IN ('web', 'ios_app', 'android_app', 'marketplace')),
  currency char(3) NOT NULL,
  subtotal_amount numeric(14, 2) NOT NULL,
  discount_amount numeric(14, 2) NOT NULL,
  shipping_amount numeric(14, 2) NOT NULL,
  tax_amount numeric(14, 2) NOT NULL,
  total_amount numeric(14, 2) NOT NULL,
  ordered_at timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_item_id bigint PRIMARY KEY,
  order_id bigint NOT NULL,
  line_number integer NOT NULL,
  product_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14, 2) NOT NULL,
  discount_amount numeric(14, 2) NOT NULL,
  line_total numeric(14, 2) NOT NULL
);

CREATE TABLE payments (
  payment_id bigint PRIMARY KEY,
  order_id bigint NOT NULL,
  payment_method text NOT NULL CHECK (
    payment_method IN ('card', 'digital_wallet', 'bank_transfer', 'pay_later', 'gift_card')
  ),
  provider_reference text NOT NULL,
  amount numeric(14, 2) NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  attempted_at timestamptz NOT NULL,
  captured_at timestamptz
);

CREATE TABLE shipments (
  shipment_id bigint PRIMARY KEY,
  order_id bigint NOT NULL,
  warehouse_code text NOT NULL,
  carrier text NOT NULL,
  service_level text NOT NULL CHECK (service_level IN ('standard', 'express', 'next_day')),
  tracking_number text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('label_created', 'in_transit', 'delivered', 'returned_to_sender', 'lost')
  ),
  created_at timestamptz NOT NULL,
  shipped_at timestamptz,
  delivered_at timestamptz
);

CREATE TABLE returns (
  return_id bigint PRIMARY KEY,
  order_id bigint NOT NULL,
  order_item_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('requested', 'received', 'refunded', 'rejected')),
  refund_amount numeric(14, 2),
  requested_at timestamptz NOT NULL,
  processed_at timestamptz
);
