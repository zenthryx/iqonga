-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_balance INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0,
    auto_recharge_enabled BOOLEAN NOT NULL DEFAULT false,
    auto_recharge_threshold INTEGER NOT NULL DEFAULT 100,
    auto_recharge_amount INTEGER NOT NULL DEFAULT 500,
    debt_balance INTEGER NOT NULL DEFAULT 0,
    last_purchase_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(credit_balance);
CREATE INDEX IF NOT EXISTS idx_user_credits_auto_recharge ON user_credits(auto_recharge_enabled);

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'deduct', 'refund', 'bonus', 'debt_repayment')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- For linking to specific actions (post_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Create credit_packages table for purchase options
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    price_sol DECIMAL(10, 6) NOT NULL,
    price_usdc DECIMAL(10, 2) NOT NULL,
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_sol, price_usdc, bonus_credits, sort_order) VALUES
('Starter Pack', 100, 0.01, 1.00, 0, 1),
('Basic Pack', 500, 0.05, 5.00, 50, 2),
('Pro Pack', 1000, 0.10, 10.00, 150, 3),
('Premium Pack', 2500, 0.25, 25.00, 500, 4),
('Enterprise Pack', 5000, 0.50, 50.00, 1250, 5)
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits_updated_at();

-- Create function to automatically create credit account for new users
CREATE OR REPLACE FUNCTION create_user_credits_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_credits (user_id, credit_balance, total_purchased, total_used)
    VALUES (NEW.id, 0, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create credit account
CREATE TRIGGER create_user_credits_account_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_credits_account();

-- Create function to log credit transactions
CREATE OR REPLACE FUNCTION log_credit_transaction(
    p_user_id INTEGER,
    p_transaction_type VARCHAR(20),
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_reference_id VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT credit_balance INTO current_balance
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after, description, reference_id
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, current_balance, current_balance + p_amount, p_description, p_reference_id
    );
END;
$$ LANGUAGE plpgsql;
