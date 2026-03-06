-- Create WooCommerce orders and customers tables for order management
-- This allows AI agents to access order details and customer purchase history

-- WooCommerce stores table (one per user/company)
CREATE TABLE IF NOT EXISTS woocommerce_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    store_url VARCHAR(500) NOT NULL,
    store_name VARCHAR(255),
    api_key VARCHAR(255), -- WooCommerce REST API key (encrypted)
    api_secret VARCHAR(255), -- WooCommerce REST API secret (encrypted)
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, store_url)
);

-- WooCommerce customers table
CREATE TABLE IF NOT EXISTS woocommerce_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    woocommerce_store_id UUID NOT NULL REFERENCES woocommerce_stores(id) ON DELETE CASCADE,
    woocommerce_customer_id BIGINT NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    total_spent DECIMAL(10,2) DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    date_created TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(woocommerce_store_id, woocommerce_customer_id)
);

-- WooCommerce orders table
CREATE TABLE IF NOT EXISTS woocommerce_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    woocommerce_store_id UUID NOT NULL REFERENCES woocommerce_stores(id) ON DELETE CASCADE,
    woocommerce_order_id BIGINT NOT NULL,
    order_number VARCHAR(50),
    woocommerce_customer_id UUID REFERENCES woocommerce_customers(id) ON DELETE SET NULL,
    customer_email VARCHAR(255),
    customer_first_name VARCHAR(255),
    customer_last_name VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- pending, processing, on-hold, completed, cancelled, refunded, failed
    currency VARCHAR(10) DEFAULT 'USD',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    shipping_total DECIMAL(10,2) DEFAULT 0,
    discount_total DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(100),
    payment_method_title VARCHAR(255),
    date_created TIMESTAMP WITH TIME ZONE,
    date_modified TIMESTAMP WITH TIME ZONE,
    date_completed TIMESTAMP WITH TIME ZONE,
    billing_address JSONB, -- Full billing address as JSON
    shipping_address JSONB, -- Full shipping address as JSON
    line_items JSONB, -- Array of order line items
    shipping_lines JSONB, -- Array of shipping methods
    fee_lines JSONB, -- Array of fees
    coupon_lines JSONB, -- Array of applied coupons
    metadata JSONB, -- Additional order metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(woocommerce_store_id, woocommerce_order_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_woocommerce_stores_user_id ON woocommerce_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_stores_company_profile ON woocommerce_stores(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_customers_store ON woocommerce_customers(woocommerce_store_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_customers_email ON woocommerce_customers(email);
CREATE INDEX IF NOT EXISTS idx_woocommerce_orders_store ON woocommerce_orders(woocommerce_store_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_orders_customer ON woocommerce_orders(woocommerce_customer_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_orders_customer_email ON woocommerce_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_woocommerce_orders_status ON woocommerce_orders(status);
CREATE INDEX IF NOT EXISTS idx_woocommerce_orders_date_created ON woocommerce_orders(date_created);

-- Comments
COMMENT ON TABLE woocommerce_stores IS 'Stores WooCommerce store connections for each user';
COMMENT ON TABLE woocommerce_customers IS 'Stores WooCommerce customer information synced from stores';
COMMENT ON TABLE woocommerce_orders IS 'Stores WooCommerce order details for AI agent access and order management';

