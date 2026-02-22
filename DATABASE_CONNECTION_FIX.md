# Database Connection Error Fix (ECONNRESET)

## Problem
You're experiencing `ECONNRESET` errors when trying to login. This happens because the remote MySQL server (`srv2109.hstgr.io`) is closing connections unexpectedly.

## What Was Fixed

### 1. Improved Connection Pool Configuration
Updated `lms-backend/database/connection.js` with:
- Increased connection timeout from 10s to 20s
- Added acquire timeout (20s)
- Enabled keep-alive with 10s initial delay
- Added reconnect option
- Increased query timeout to 60s
- Added session timeout settings (8 hours)

### 2. Better Error Handling
Updated `lms-backend/routes/auth.js` with:
- Explicit connection acquisition and release
- Specific error messages for connection issues
- Proper connection cleanup on errors

### 3. Connection Pool Monitoring
Added event listeners to track:
- New connections
- Connection acquisition
- Connection release
- Queue waiting

## How to Apply the Fix

### Step 1: Restart Your Backend Server
```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd lms-backend
npm start
```

### Step 2: Test the Connection
When the server starts, you should see:
```
✅ Database connected successfully
```

### Step 3: Try Logging In Again
The login should now work properly. If you still see errors, check the logs for more specific error messages.

## Additional Troubleshooting

### If the error persists:

#### Option 1: Check Database Server Status
Your remote database server might be down or experiencing issues. Contact your hosting provider (Hostinger) to verify the database server is running.

#### Option 2: Check Firewall/Network
Ensure your local machine can reach `srv2109.hstgr.io:3306`. Test with:
```bash
# Windows
telnet srv2109.hstgr.io 3306

# Or use MySQL client
mysql -h srv2109.hstgr.io -P 3306 -u u687065429_root -p
```

#### Option 3: Increase Connection Limits
If you have access to MySQL configuration, increase these values:
```sql
SET GLOBAL max_connections = 200;
SET GLOBAL wait_timeout = 28800;
SET GLOBAL interactive_timeout = 28800;
```

#### Option 4: Use Local Database for Development
For development, consider using a local MySQL database:

1. Install MySQL locally
2. Create a local database
3. Update `.env` to use localhost:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lms_db
```

#### Option 5: Add Connection Retry Logic
If the issue is intermittent, you can add retry logic. Create a new file `lms-backend/utils/db-retry.js`:

```javascript
const pool = require('../database/connection');

async function queryWithRetry(sql, params, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [results] = await pool.query(sql, params);
      return results;
    } catch (error) {
      lastError = error;
      console.log(`Query attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}

module.exports = { queryWithRetry };
```

Then use it in your routes:
```javascript
const { queryWithRetry } = require('../utils/db-retry');

// Instead of:
const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

// Use:
const users = await queryWithRetry('SELECT * FROM users WHERE email = ?', [email]);
```

## Monitoring Connection Health

Add this endpoint to check database health:

```javascript
// In lms-backend/routes/health.js
const express = require('express');
const pool = require('../database/connection');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
```

Register it in `index.js`:
```javascript
const healthRoutes = require('./routes/health');
app.use('/api', healthRoutes);
```

Then check health at: `http://localhost:5000/api/health`

## Common Causes of ECONNRESET

1. **Remote server timeout** - Server closes idle connections
2. **Network instability** - Connection drops between your machine and server
3. **Firewall interference** - Firewall closing long-running connections
4. **Server overload** - Database server rejecting new connections
5. **SSL/TLS issues** - If using SSL, certificate problems can cause resets
6. **Connection pool exhaustion** - All connections in use, new requests fail

## Best Practices

1. **Always release connections** - Use try/finally blocks
2. **Set appropriate timeouts** - Balance between too short and too long
3. **Monitor connection pool** - Watch for connection leaks
4. **Use connection pooling** - Don't create new connections for each query
5. **Handle errors gracefully** - Provide user-friendly error messages
6. **Log connection events** - Track connection lifecycle for debugging

## Contact Support

If the issue persists after trying these fixes:
1. Check Hostinger's MySQL server status
2. Review your hosting plan's connection limits
3. Consider upgrading to a dedicated database server
4. Contact Hostinger support for assistance
