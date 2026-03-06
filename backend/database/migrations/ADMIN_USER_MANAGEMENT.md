# Admin User Management Guide

This guide explains how to grant and manage admin rights for users in the SocialAI system.

## Overview

Admin users have access to:
- User management
- Credit management
- System monitoring
- Support tickets
- Analytics
- Content moderation

## Granting Admin Rights

### Method 1: Using the Specific Script (Recommended)

For the user `user_AjRNyW8W`, run:

```bash
psql -U your_db_user -d your_database -f Backend/database/migrations/grant_admin_to_user_AjRNyW8W.sql
```

### Method 2: Using the Template Script

1. Open `Backend/database/migrations/grant_admin_template.sql`
2. Replace `'USERNAME_HERE'` with the actual username
3. Optionally customize the `admin_permissions` JSON object
4. Run the script:

```bash
psql -U your_db_user -d your_database -f Backend/database/migrations/grant_admin_template.sql
```

### Method 3: Direct SQL Command

You can also run SQL directly in your database client:

```sql
-- Grant admin by username
UPDATE users 
SET 
    role = 'admin',
    is_admin = true,
    admin_permissions = '{
        "user_management": true,
        "credit_management": true,
        "system_monitoring": true,
        "support_tickets": true,
        "analytics": true,
        "content_moderation": true
    }'::jsonb
WHERE username = 'user_AjRNyW8W';
```

## Finding Users

Before granting admin rights, you may want to find the user:

```sql
-- Find user by username
SELECT id, username, email, wallet_address, role, is_admin 
FROM users 
WHERE username = 'user_AjRNyW8W';

-- Find user by email
SELECT id, username, email, wallet_address, role, is_admin 
FROM users 
WHERE email = 'user@example.com';

-- Find user by wallet address
SELECT id, username, email, wallet_address, role, is_admin 
FROM users 
WHERE wallet_address = 'wallet_address_here';

-- List all users (to find the one you need)
SELECT id, username, email, wallet_address, role, is_admin 
FROM users 
ORDER BY created_at DESC 
LIMIT 20;
```

## Listing All Admins

To see all current admin users:

```sql
SELECT 
    id,
    username,
    email,
    wallet_address,
    role,
    is_admin,
    admin_permissions,
    created_at
FROM users 
WHERE is_admin = true OR role = 'admin'
ORDER BY created_at DESC;
```

## Admin Permissions

The default admin permissions include:
- `user_management`: Manage users (suspend, delete, etc.)
- `credit_management`: Manage user credits
- `system_monitoring`: View system logs and metrics
- `support_tickets`: Handle support tickets
- `analytics`: Access analytics dashboard
- `content_moderation`: Moderate content

You can customize permissions when granting admin rights by modifying the `admin_permissions` JSON object.

## Removing Admin Rights

To remove admin rights from a user:

```sql
UPDATE users 
SET 
    role = 'user',
    is_admin = false,
    admin_permissions = '{}'::jsonb
WHERE username = 'username_here';
```

## Verification

After granting admin rights, verify the changes:

```sql
SELECT 
    id,
    username,
    email,
    wallet_address,
    role,
    is_admin,
    admin_permissions
FROM users 
WHERE username = 'user_AjRNyW8W';
```

The user should have:
- `role = 'admin'`
- `is_admin = true`
- `admin_permissions` with the configured permissions

## Important Notes

1. **Both conditions must be met**: The system checks both `is_admin = true` AND `role = 'admin'` for admin access.

2. **Whitelist requirement**: If `REQUIRE_ADMIN_WHITELIST` environment variable is set (default), the admin user's wallet address must also be whitelisted. You can disable this by setting `REQUIRE_ADMIN_WHITELIST=false` in your environment.

3. **Security**: Only grant admin rights to trusted users. Admin users have significant system access.

4. **Audit trail**: Admin actions are logged in the `admin_actions` table for security and compliance.

## Troubleshooting

### User not found
- Verify the username, email, or wallet address is correct
- Check for typos or case sensitivity issues
- Use the "Finding Users" queries above to locate the user

### Admin access still denied
- Verify both `is_admin = true` AND `role = 'admin'` are set
- Check if wallet whitelist is required and the user's wallet is whitelisted
- Check the `admin_permissions` JSON is valid
- Review server logs for specific error messages

### Permission denied errors
- Check the specific permission in `admin_permissions` JSON
- Ensure the permission key exists and is set to `true`
- Review the admin middleware code for required permission names

## Files

- `grant_admin_to_user_AjRNyW8W.sql` - Specific script for user_AjRNyW8W
- `grant_admin_template.sql` - Reusable template for future admin grants
- `ADMIN_USER_MANAGEMENT.md` - This documentation file
