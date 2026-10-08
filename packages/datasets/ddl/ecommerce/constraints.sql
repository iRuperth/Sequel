CREATE INDEX customers_email_idx ON customers (email);
CREATE INDEX customers_created_at_idx ON customers (created_at);

ALTER TABLE addresses
  ADD CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (customer_id);
CREATE INDEX addresses_customer_id_idx ON addresses (customer_id);

ALTER TABLE categories
  ADD CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES categories (category_id);
ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);

ALTER TABLE products
  ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (category_id);
ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
CREATE INDEX products_category_id_idx ON products (category_id);

ALTER TABLE inventory
  ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (product_id);

ALTER TABLE promotions ADD CONSTRAINT promotions_promo_code_key UNIQUE (promo_code);

ALTER TABLE orders
  ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (customer_id);
ALTER TABLE orders
  ADD CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES addresses (address_id);
ALTER TABLE orders
  ADD CONSTRAINT orders_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES promotions (promotion_id);
ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
CREATE INDEX orders_ordered_at_idx ON orders (ordered_at);

ALTER TABLE order_items
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (order_id);
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (product_id);
ALTER TABLE order_items ADD CONSTRAINT order_items_order_line_key UNIQUE (order_id, line_number);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

ALTER TABLE payments
  ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (order_id);
CREATE INDEX payments_order_id_idx ON payments (order_id);

ALTER TABLE shipments
  ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (order_id);
CREATE INDEX shipments_order_id_idx ON shipments (order_id);

ALTER TABLE returns
  ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (order_id);
ALTER TABLE returns
  ADD CONSTRAINT returns_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items (order_item_id);
CREATE INDEX returns_order_item_id_idx ON returns (order_item_id);
