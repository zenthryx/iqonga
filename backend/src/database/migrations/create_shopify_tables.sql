-- Create Shopify integration tables
CREATE TABLE IF NOT EXISTS shopify_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    store_domain VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    webhook_secret TEXT,
    api_version VARCHAR(20) DEFAULT '2024-01',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_profile_id, store_domain)
);

CREATE TABLE IF NOT EXISTS shopify_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
    shopify_product_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    handle VARCHAR(255),
    product_type VARCHAR(255),
    vendor VARCHAR(255),
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shopify_store_id, shopify_product_id)
);

CREATE TABLE IF NOT EXISTS shopify_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_product_id UUID NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
    shopify_variant_id BIGINT NOT NULL,
    title VARCHAR(255),
    price DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    sku VARCHAR(255),
    inventory_quantity INTEGER DEFAULT 0,
    weight DECIMAL(8,2),
    weight_unit VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shopify_product_id, shopify_variant_id)
);

CREATE TABLE IF NOT EXISTS shopify_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
    shopify_order_id BIGINT NOT NULL,
    order_number VARCHAR(50),
    customer_email VARCHAR(255),
    customer_first_name VARCHAR(255),
    customer_last_name VARCHAR(255),
    total_price DECIMAL(10,2),
    currency VARCHAR(10),
    financial_status VARCHAR(50),
    fulfillment_status VARCHAR(50),
    order_status VARCHAR(50),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shopify_store_id, shopify_order_id)
);

CREATE TABLE IF NOT EXISTS shopify_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopify_store_id UUID NOT NULL REFERENCES shopify_stores(id) ON DELETE CASCADE,
    shopify_customer_id BIGINT NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    total_spent DECIMAL(10,2) DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    state VARCHAR(50),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shopify_store_id, shopify_customer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_stores_company_profile ON shopify_stores(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_store ON shopify_products(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON shopify_products(status);
CREATE INDEX IF NOT EXISTS idx_shopify_variants_product ON shopify_variants(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store ON shopify_orders(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_email ON shopify_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_store ON shopify_customers(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_email ON shopify_customers(email);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_shopify_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shopify_stores_updated_at
    BEFORE UPDATE ON shopify_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER trigger_update_shopify_products_updated_at
    BEFORE UPDATE ON shopify_products
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER trigger_update_shopify_variants_updated_at
    BEFORE UPDATE ON shopify_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER trigger_update_shopify_orders_updated_at
    BEFORE UPDATE ON shopify_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_updated_at();

CREATE TRIGGER trigger_update_shopify_customers_updated_at
    BEFORE UPDATE ON shopify_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_shopify_updated_at();
