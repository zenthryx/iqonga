-- BACKUP SCRIPT - Run this BEFORE the migration if tables exist with data
-- Date: 2025-12-24

-- ==========================================
-- BACKUP EXISTING TABLES
-- ==========================================

-- Backup credit_packages (if exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_packages') THEN
        -- Drop backup table if it exists
        DROP TABLE IF EXISTS credit_packages_backup_20251224;
        
        -- Create backup
        CREATE TABLE credit_packages_backup_20251224 AS 
        SELECT * FROM credit_packages;
        
        RAISE NOTICE 'Backed up credit_packages to credit_packages_backup_20251224';
    ELSE
        RAISE NOTICE 'credit_packages table does not exist, no backup needed';
    END IF;
END $$;

-- Backup payment_transactions (if exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        DROP TABLE IF EXISTS payment_transactions_backup_20251224;
        
        CREATE TABLE payment_transactions_backup_20251224 AS 
        SELECT * FROM payment_transactions;
        
        RAISE NOTICE 'Backed up payment_transactions to payment_transactions_backup_20251224';
    ELSE
        RAISE NOTICE 'payment_transactions table does not exist, no backup needed';
    END IF;
END $$;

-- Backup user_payment_methods (if exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_payment_methods') THEN
        DROP TABLE IF EXISTS user_payment_methods_backup_20251224;
        
        CREATE TABLE user_payment_methods_backup_20251224 AS 
        SELECT * FROM user_payment_methods;
        
        RAISE NOTICE 'Backed up user_payment_methods to user_payment_methods_backup_20251224';
    ELSE
        RAISE NOTICE 'user_payment_methods table does not exist, no backup needed';
    END IF;
END $$;

-- ==========================================
-- VERIFY BACKUPS CREATED
-- ==========================================

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE '%backup_20251224%'
ORDER BY table_name;

-- ==========================================
-- TO RESTORE FROM BACKUP (if needed later):
-- ==========================================

/*
-- Restore credit_packages
DROP TABLE IF EXISTS credit_packages CASCADE;
CREATE TABLE credit_packages AS SELECT * FROM credit_packages_backup_20251224;

-- Restore payment_transactions
DROP TABLE IF EXISTS payment_transactions CASCADE;
CREATE TABLE payment_transactions AS SELECT * FROM payment_transactions_backup_20251224;

-- Restore user_payment_methods
DROP TABLE IF EXISTS user_payment_methods CASCADE;
CREATE TABLE user_payment_methods AS SELECT * FROM user_payment_methods_backup_20251224;
*/

