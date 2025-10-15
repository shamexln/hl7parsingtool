const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const sqlite3 = require("sqlite3").verbose();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require("./logger");
const {
    DATABASE_FILE, TABLE_HL7_PATIENTS, LISTCODESYSTEM_API, CODESYSTEMTAGS_API, TABLE_HL7_CODESYSTEMS
} = require("./config");
const {createPatientExcelWorkbook} = require("./export");
const {getConnectionStats, getClientInfo} = require("./tcp-server");
const {
    getAllTags, getCodeSystemNames, createCodeSystem, getCodesystemTableNameByName, updateDetailCodeSystem
} = require("./codesystem");

/**
 * Creates an Express application for the HTTP API
 * @returns {express.Application} - Express application
 */
function createHttpApp() {
    const app = express();

    // Enable CORS for frontend access (allow credentials for cookie-based auth)
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());

    // Global auth gate for all /api/* except /api/auth/*.
    // This ensures any expired/missing access token results in 401,
    // allowing the frontend interceptor to trigger refresh via refresh token.
    const GLOBAL_AUTH_SECRET = (process.env.AUTH_SECRET || 'draeger-sdmi-monitor');
    function isProtectedApi(pathname) {
        return /^\/api\//.test(pathname) && !/^\/api\/auth\//.test(pathname);
    }
    app.use((req, res, next) => {
        try {
            // Always allow CORS preflight
            if (req.method === 'OPTIONS') return next();
            if (!isProtectedApi(req.path || req.url)) return next();
            const authHeader = req.headers['authorization'] || '';
            const m = authHeader.match(/^Bearer\s+(.+)$/i);
            const token = m ? m[1] : null;
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
            try {
                jwt.verify(token, GLOBAL_AUTH_SECRET);
                return next();
            } catch {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    // Serve root path
    app.get("/", (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "browser", "index.html"));
    });

    // API endpoint: Query all patients
    app.get("/api/patients", (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READONLY, (openErr) => {
            if (openErr) {
                logger.error("Failed to open database:", openErr);
                return res.status(500).json({error: "Failed to connect to database"});
            }
        },);

        db.all(`SELECT *
                FROM ${TABLE_HL7_PATIENTS}
                ORDER BY datetime(utcDate) DESC`, (err, rows) => {
            if (err) {
                logger.error("Error querying patients:", err);
                res
                    .status(500)
                    .json({error: "Internal server error while querying database"});
            } else {
                res.json(rows);
            }

            // Safely close database connection
            db.close((closeErr) => {
                if (closeErr) {
                    logger.error("Error closing database:", closeErr);
                }
            });
        });
    });

    // API endpoint: Paginated patient query
    app.get("/api/patients/paginated/:id?", (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const {startTime, endTime} = req.query;
        let {id} = req.params;
        if (!id || id.trim() === '') {
            id = null; // Explicitly indicate search for all patients
        }
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;

        getPaginatedData(DATABASE_FILE, TABLE_HL7_PATIENTS, id, startTime, endTime, page, pageSize, (err, result) => {
            if (err) {
                res.status(500).json({error: "Internal Server Error"});
            } else {
                // Use map to remove raw_message field
                const modifiedRows = result.rows.map(({raw_message, ...rest}) => rest,);

                res.json({
                    ...result, rows: modifiedRows,
                });
            }
        },);
    });

    // API endpoint: Export patient data to Excel
    app.get('/api/patients/export/:id?', async (req, res) => {
        const patientId = req.params.id?.trim();
        const {startTime, endTime} = req.query;
        const db = new sqlite3.Database(DATABASE_FILE);
        const tableName = TABLE_HL7_PATIENTS;

        // Fetch data from database for patientId
        const fetchDataFromDB = (patientId, startTime, endTime) => {
            return new Promise((resolve, reject) => {
                let query = `SELECT *  FROM ${tableName}`;
                let conditions = [];
                let params = [];

                if (patientId) {
                    conditions.push('pat_ID = ?');
                    params.push(patientId);
                }
                if (startTime) {
                    conditions.push('Date >= ?');
                    params.push(startTime);
                }
                if (endTime) {
                    conditions.push('Date <= ?');
                    params.push(endTime);
                }
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }

                db.all(query, params, (err, rows) => {
                    if (err) {
                        logger.error('Database query error:', err);
                        reject(err);
                    } else {
                        resolve(rows); // Return queried data
                    }
                });
            });
        };

        try {
            const filteredData = await fetchDataFromDB(patientId, startTime, endTime);
            // Create a new Excel workbook and worksheet
            const workbook = createPatientExcelWorkbook(filteredData);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=patients_data_${patientId || 'all'}_${Date.now()}.xlsx`);
            await workbook.xlsx.write(res);
            // Must call end to explicitly notify client that transmission is complete
            res.end();

        } catch (error) {
            console.error('export excel fail:', error);
            res.status(500).send('export excel fail');
        } finally {
            db.close();
        }
    });

    // API endpoint: Get connection statistics
    app.get("/api/connections", (req, res) => {
        try {
            const stats = getConnectionStats();
            res.json({
                success: true, stats
            });
            logger.debug("Connection statistics accessed via API");
        } catch (error) {
            logger.error(`Error retrieving connection statistics: ${error.message}`);
            res.status(500).json({
                success: false, message: "Failed to retrieve connection statistics", error: error.message
            });
        }
    });

    // API endpoint: Get detailed information about a specific client
    app.get("/api/connections/:clientId", (req, res) => {
        try {
            const {clientId} = req.params;
            const clientInfo = getClientInfo(clientId);

            if (!clientInfo) {
                return res.status(404).json({
                    success: false, message: `Client with ID ${clientId} not found`
                });
            }

            res.json({
                success: true, client: clientInfo
            });
            logger.debug(`Client information accessed via API for client ${clientId}`);
        } catch (error) {
            logger.error(`Error retrieving client information: ${error.message}`);
            res.status(500).json({
                success: false, message: "Failed to retrieve client information", error: error.message
            });
        }
    });

    // API endpoint: Update port configuration
    app.post("/api/port-config", (req, res) => {
        try {
            const {tcpPort, httpPort} = req.body;
            const portConfigPath = path.join(process.cwd(), 'port-config.json');

            // Validate port values
            if (!tcpPort && !httpPort) {
                return res.status(400).json({
                    success: false, message: "At least one port (tcpPort or httpPort) must be provided"
                });
            }

            // Read current configuration
            const currentConfig = JSON.parse(fs.readFileSync(portConfigPath, 'utf8'));
            const newConfig = {...currentConfig};

            // Update TCP port (if provided)
            if (tcpPort !== undefined) {
                if (!isValidPort(Number(tcpPort))) {
                    return res.status(400).json({
                        success: false, message: "Invalid TCP port. Port must be a number between 1 and 65535."
                    });
                }
                newConfig.tcpPort = Number(tcpPort);
            }

            // Update HTTP port (if provided)
            if (httpPort !== undefined) {
                if (!isValidPort(Number(httpPort))) {
                    return res.status(400).json({
                        success: false, message: "Invalid HTTP port. Port must be a number between 1 and 65535."
                    });
                }
                newConfig.httpPort = Number(httpPort);
            }

            // Write new configuration to file
            fs.writeFileSync(portConfigPath, JSON.stringify(newConfig, null, 2));

            // Return success response
            res.json({
                success: true, message: "Port configuration updated successfully", config: newConfig
            });

            logger.info(`Port configuration updated via API: TCP port ${newConfig.tcpPort}, HTTP port ${newConfig.httpPort}`);
        } catch (error) {
            logger.error(`Error updating port configuration: ${error.message}`);
            res.status(500).json({
                success: false, message: "Failed to update port configuration", error: error.message
            });
        }
    });

    // API endpoint: Get port configuration
    app.get("/api/port-config", (req, res) => {
        try {
            const portConfigPath = path.join(process.cwd(), 'port-config.json');

            // Read current configuration
            const currentConfig = JSON.parse(fs.readFileSync(portConfigPath, 'utf8'));

            // Return success response
            res.json({
                success: true, config: currentConfig
            });

            logger.info(`Port configuration retrieved via API`);
        } catch (error) {
            logger.error(`Error retrieving port configuration: ${error.message}`);
            res.status(500).json({
                success: false, message: "Failed to retrieve port configuration", error: error.message
            });
        }
    });

    // Auth helpers
    const AUTH_SECRET = (process.env.AUTH_SECRET || 'draeger-sdmi-monitor');
    const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // 15 minutes
    logger.info('ACCESS_TOKEN_EXPIRES_IN:', ACCESS_TOKEN_EXPIRES_IN);
    const AUTH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS || (7 * 24 * 60 * 60 * 1000)); // refresh TTL
    logger.info('AUTH_TOKEN_TTL_MS:', AUTH_TOKEN_TTL_MS);
    function getAesKey() {
        // Derive a 32-byte key from secret via sha256
        return crypto.createHash('sha256').update(String(AUTH_SECRET)).digest();
    }
    function encryptText(plain) {
        const key = getAesKey();
        const iv = crypto.randomBytes(12); // GCM 12-byte IV
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const enc = Buffer.concat([cipher.update(Buffer.from(String(plain), 'utf8')), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { enc, iv, tag };
    }
    function decryptText(encBuf, ivBuf, tagBuf) {
        const key = getAesKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
        decipher.setAuthTag(tagBuf);
        const dec = Buffer.concat([decipher.update(encBuf), decipher.final()]);
        return dec.toString('utf8');
    }

    // API endpoint: User login (issue JWT access + refresh)
    app.post('/api/auth/login', (req, res) => {
        try {
            const { username, password } = req.body || {};
            if (!username || !password) {
                return res.status(400).json({ success: false });
            }

            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
            db.get('SELECT username, password_enc, iv, tag FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    logger.error('DB error during login:', err);
                    db.close();
                    return res.status(500).json({ success: false });
                }

                if (!row) {
                    // user not found
                    db.close();
                    return res.status(401).json({ success: false });
                }

                try {
                    const storedPwd = decryptText(row.password_enc, row.iv, row.tag);
                    if (storedPwd !== password) {
                        db.close();
                        return res.status(401).json({ success: false });
                    }
                } catch (e) {
                    logger.error('Decrypt error during login:', e);
                    db.close();
                    return res.status(500).json({ success: false });
                }

                // Credentials OK: issue JWT access token and a stored refresh token
                const accessToken = jwt.sign({ sub: username }, AUTH_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
                const refreshToken = crypto.randomBytes(32).toString('hex');
                const expiresAt = Date.now() + AUTH_TOKEN_TTL_MS;
                db.run('INSERT OR REPLACE INTO auth_tokens (token, username, expires_at) VALUES (?, ?, ?)', [refreshToken, username, expiresAt], (insErr) => {
                    db.close();
                    if (insErr) {
                        logger.error('DB error saving refresh token:', insErr);
                        return res.status(500).json({ success: false });
                    }
                    // Do not use cookies; return tokens in response body for client to store and send via headers
                    return res.json({ success: true, token: accessToken, refreshToken });
                });
            });
        } catch (error) {
            logger.error(`Error during login: ${error.message}`);
            return res.status(500).json({ success: false });
        }
    });

    // API endpoint: Check current session (verify access JWT; refresh via refresh cookie if needed)
    app.get('/api/auth/me', (req, res) => {
        try {
            // Expect Authorization: Bearer <accessJWT>
            const authHeader = req.headers['authorization'] || '';
            const m = authHeader.match(/^Bearer\s+(.+)$/i);
            const access = m ? m[1] : null;
            if (access) {
                try {
                    jwt.verify(access, AUTH_SECRET);
                    return res.json({ authenticated: true });
                } catch (e) {
                    // fall through to refresh path on expiry or invalid
                }
            }

            // Try refresh flow via custom header X-Refresh-Token
            const refresh = req.headers['x-refresh-token'];
            if (!refresh) {
                return res.json({ authenticated: false });
            }

            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READONLY);
            db.get('SELECT username, expires_at FROM auth_tokens WHERE token = ?', [refresh], (err, row) => {
                db.close();
                if (err) {
                    logger.error('DB error checking session:', err);
                    return res.status(500).json({ authenticated: false });
                }
                const now = Date.now();
                if (!row) {
                    // Unknown refresh token
                    return res.json({ authenticated: false });
                }
                if (Number(row.expires_at) <= now) {
                    // Refresh token expired — clean it up from DB to avoid accumulation, then report unauthenticated
                    const wdb = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
                    wdb.run('DELETE FROM auth_tokens WHERE token = ?', [refresh], (delErr) => {
                        wdb.close();
                        if (delErr) {
                            logger.warn('Failed to delete expired refresh token:', delErr);
                        }
                        return res.json({ authenticated: false });
                    });
                    return; // ensure no further processing
                }
                // Issue a new access token and return it in body (no cookies)
                const newAccess = jwt.sign({ sub: row.username }, AUTH_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
                return res.json({ authenticated: true, token: newAccess });
            });
        } catch (error) {
            logger.error(`Error checking session: ${error.message}`);
            return res.status(500).json({ authenticated: false });
        }
    });

    // API endpoint: Logout user (delete refresh token and clear cookies)
    app.post('/api/auth/logout', (req, res) => {
        try {
            const refresh = req.headers['x-refresh-token'];
            const endNoContent = () => res.status(204).end();
            if (refresh) {
                const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
                db.run('DELETE FROM auth_tokens WHERE token = ?', [refresh], (err) => {
                    db.close();
                    if (err) {
                        logger.error('DB error during logout:', err);
                    }
                    return endNoContent();
                });
            } else {
                return endNoContent();
            }
        } catch (error) {
            logger.error(`Error during logout: ${error.message}`);
            return res.status(500).end();
        }
    });

    // Check if initial setup is required
    // Logic: first login if users table does not exist OR exists but has zero rows
    app.get('/api/auth/setup-required', (req, res) => {
        try {
            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READONLY);
            // Step 1: check if users table exists
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (tblErr, tblRow) => {
                if (tblErr) {
                    db.close();
                    logger.error('DB error checking users table existence:', tblErr);
                    return res.status(500).json({ setupRequired: false });
                }
                if (!tblRow) {
                    // No users table -> first login required
                    db.close();
                    return res.json({ setupRequired: true });
                }
                // Step 2: users table exists, check if any user rows exist
                db.get('SELECT COUNT(1) as cnt FROM users', [], (cntErr, cntRow) => {
                    db.close();
                    if (cntErr) {
                        logger.error('DB error counting users:', cntErr);
                        return res.status(500).json({ setupRequired: false });
                    }
                    const needSetup = !cntRow || Number(cntRow.cnt) === 0;
                    return res.json({ setupRequired: needSetup });
                });
            });
        } catch (error) {
            logger.error(`Error checking setup-required: ${error.message}`);
            return res.status(500).json({ setupRequired: false });
        }
    });

    // Initialize first user (first-time setup)
    // Frontend already confirmed password twice; backend stores without extra validation on first setup
    app.post('/api/auth/setup-initial', (req, res) => {
        try {
            const { password, username } = req.body || {};
            const targetUser = (username && String(username).trim()) || 'admin';
            if (!password) {
                return res.status(400).json({ success: false, message: 'Missing password' });
            }

            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
            // Ensure users table exists (in case database initializer didn't create it yet)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_enc BLOB NOT NULL,
                iv BLOB NOT NULL,
                tag BLOB NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, [], (createErr) => {
                if (createErr) {
                    db.close();
                    logger.error('DB error creating users table:', createErr);
                    return res.status(500).json({ success: false });
                }
                // Allow setup only if no user exists yet
                db.get('SELECT COUNT(1) as cnt FROM users', [], (selErr, row) => {
                    if (selErr) {
                        db.close();
                        logger.error('DB error reading users:', selErr);
                        return res.status(500).json({ success: false });
                    }
                    if (row && Number(row.cnt) > 0) {
                        db.close();
                        return res.status(409).json({ success: false, message: 'Already initialized' });
                    }

                    const { enc, iv, tag } = encryptText(password);
                    db.run('INSERT INTO users (username, password_enc, iv, tag) VALUES (?, ?, ?, ?)', [targetUser, enc, iv, tag], (insErr) => {
                        db.close();
                        if (insErr) {
                            logger.error('DB error inserting initial user:', insErr);
                            return res.status(500).json({ success: false });
                        }
                        return res.json({ success: true });
                    });
                });
            });
        } catch (error) {
            logger.error(`Error during setup-initial: ${error.message}`);
            return res.status(500).json({ success: false });
        }
    });


    // API endpoint: List all codesystem names
    app.get(LISTCODESYSTEM_API, (req, res) => {
        try {
            res.setHeader('Content-Type', 'application/json');
            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READONLY, (openErr) => {
                if (openErr) {
                    logger.error("Failed to open database:", openErr);
                    return res.status(500).json({error: "Failed to connect to database"});
                }
            },);

            db.all(`SELECT *
                    FROM ${TABLE_HL7_CODESYSTEMS}`, (err, rows) => {
                if (err) {
                    logger.error("Error querying patients:", err);
                    res
                        .status(500)
                        .json({error: "Internal server error while querying database"});
                } else {
                    res.json(rows);
                }

                // Safely close database connection
                db.close((closeErr) => {
                    if (closeErr) {
                        logger.error("Error closing database:", closeErr);
                    }
                });
            });
            logger.info(`All custom tag mappings list retrieved via API`);
        } catch (error) {
            logger.error(`Error retrieving custom tag mappings list: ${error.message}`);
            res.status(500).json({
                success: false, message: "Failed to retrieve custom tag mappings list", error: error.message
            });
        }
    });


    // API endpoint: Paginated patient query
    app.get("/api/codesystem-detail/paginated/:id", async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        let {id} = req.params;
        if (!id || id.trim() === '') {
            return res.status(400).json({error: "invalid id"});
        }
        const codesystemName = req.query.codesystemname;
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;

        try {
            // Get the appropriate table name for the codesystem
            const tableName = await getCodesystemTableNameByName(codesystemName);

            getPaginatedData(DATABASE_FILE, tableName, "", "", "", page, pageSize, (err, result) => {
                if (err) {
                    logger.error("Error in codesystem pagination:", err);
                    res.status(500).json({error: "Internal Server Error"});
                } else {

                    res.json({
                        ...result
                    });
                }
            },);
        } catch (error) {
            logger.error("Error getting codesystem table name:", error);
            res.status(500).json({error: "Internal Server Error"});
        }
    });

    // 更新CodeSystem接口
    app.post('/api/updatecodesystem', async (req, res) => {
        const {codesystemName, changedData} = req.body;

        if (!codesystemName || !Array.isArray(changedData)) {
            logger.error("parameter error: lack of codesystemName or changedData");
            return res.status(400).json({error: "Invalid request body"});
        }

        // 获取表名: 你应该有类似 getCodesystemTableName 的工具函数
        const tableName = await getCodesystemTableNameByName(codesystemName);
        if (!tableName) {
            logger.error(`can not find table name, codesystemName: ${codesystemName}`);
            return res.status(400).json({error: "Unknown codesystemName"});
        }

        // 必须等 updateDetailCodeSystem 完成
        const updateCount = await updateDetailCodeSystem(tableName, changedData);

        res.json({success: true, updated: updateCount});

    });

    // Change password for authenticated user
    app.post('/api/change-password', (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body || {};
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ success: false, message: 'Missing oldPassword or newPassword' });
            }
            if (String(newPassword).length < 8) {
                return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
            }

            // simple sequence checks
            const isRepeatedChar = (s) => /^(.)\1+$/.test(s);
            const isSequentialNumeric = (s) => {
                if (!/^\d+$/.test(s)) return false;
                let inc = true, dec = true;
                for (let i = 1; i < s.length; i++) {
                    const prev = s.charCodeAt(i-1) - 48;
                    const cur = s.charCodeAt(i) - 48;
                    if (cur !== prev + 1) inc = false;
                    if (cur !== prev - 1) dec = false;
                    if (!inc && !dec) return false;
                }
                return inc || dec;
            };
            const isObviousSequence = (s) => isRepeatedChar(s) || isSequentialNumeric(s);
            if (isObviousSequence(String(newPassword))) {
                return res.status(400).json({ success: false, message: 'New password is too simple (obvious sequence)' });
            }

            // Verify JWT from Authorization header
            const authHeader = req.headers['authorization'] || '';
            const m = authHeader.match(/^Bearer\s+(.+)$/i);
            const token = m ? m[1] : null;
            if (!token) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            let username;
            try {
                const payload = jwt.verify(token, AUTH_SECRET);
                username = payload && payload.sub;
            } catch (e) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            if (!username) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
            db.get('SELECT username, password_enc, iv, tag FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    db.close();
                    logger.error('DB error during change-password:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                if (!row) {
                    db.close();
                    return res.status(404).json({ success: false, message: 'User not found' });
                }

                try {
                    const storedPwd = decryptText(row.password_enc, row.iv, row.tag);
                    if (storedPwd !== oldPassword) {
                        db.close();
                        return res.status(400).json({ success: false, message: 'Old password is incorrect' });
                    }
                    if (storedPwd === String(newPassword)) {
                        db.close();
                        return res.status(400).json({ success: false, message: 'New password must differ from the previous one' });
                    }
                } catch (e) {
                    db.close();
                    logger.error('Decrypt error during change-password:', e);
                    return res.status(500).json({ success: false, message: 'Internal error' });
                }

                const { enc, iv, tag } = encryptText(newPassword);
                db.run('UPDATE users SET password_enc = ?, iv = ?, tag = ? WHERE username = ?', [enc, iv, tag, username], (updErr) => {
                    db.close();
                    if (updErr) {
                        logger.error('DB error updating password:', updErr);
                        return res.status(500).json({ success: false, message: 'Failed to update password' });
                    }
                    return res.json({ success: true });
                });
            });
        } catch (error) {
            logger.error(`Error changing password: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    // Password cycle routes (per-user)
    function ensurePasswordCycleColumn(callback) {
        const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
        db.all("PRAGMA table_info(users)", [], (err, rows) => {
            if (err) {
                logger.error('PRAGMA table_info(users) failed:', err);
                db.close();
                return callback(err);
            }
            const hasCol = Array.isArray(rows) && rows.some(r => r.name === 'password_cycle_days');
            if (hasCol) {
                db.close();
                return callback(null);
            }
            db.run("ALTER TABLE users ADD COLUMN password_cycle_days INTEGER", [], (alterErr) => {
                if (alterErr) {
                    // If users table doesn't exist yet, ignore here (setup-initial will create). For other errors log.
                    logger.warn('ALTER TABLE users ADD COLUMN password_cycle_days failed (may be fine if users not yet created):', alterErr.message || alterErr);
                }
                db.close();
                return callback(null);
            });
        });
    }

    const CYCLE_MAP = { '1m': 30, '2m': 60, '6m': 180, '1y': 365 };
    const CYCLE_KEYS = Object.keys(CYCLE_MAP);

    app.get('/api/password-cycle', (req, res) => {
        try {
            // auth
            const authHeader = req.headers['authorization'] || '';
            const m = authHeader.match(/^Bearer\s+(.+)$/i);
            const token = m ? m[1] : null;
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
            let username;
            try { username = jwt.verify(token, AUTH_SECRET)?.sub; } catch { return res.status(401).json({ success: false, message: 'Unauthorized' }); }
            if (!username) return res.status(401).json({ success: false, message: 'Unauthorized' });

            ensurePasswordCycleColumn((colErr) => {
                if (colErr) return res.status(500).json({ success: false, message: 'Internal error' });
                const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READONLY);
                db.get('SELECT password_cycle_days FROM users WHERE username = ?', [username], (err, row) => {
                    db.close();
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    const days = row && row.password_cycle_days != null ? Number(row.password_cycle_days) : null;
                    let cycle = null;
                    if (days != null) {
                        // reverse map
                        cycle = CYCLE_KEYS.find(k => CYCLE_MAP[k] === days) || null;
                    }
                    return res.json({ success: true, cycle, days });
                });
            });
        } catch (e) {
            logger.error('Error getting password-cycle:', e);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    app.post('/api/password-cycle', (req, res) => {
        try {
            const { cycle } = req.body || {};
            if (!cycle || !CYCLE_KEYS.includes(String(cycle))) {
                return res.status(400).json({ success: false, message: 'Invalid cycle. Allowed: 1m, 2m, 6m, 1y' });
            }
            // auth
            const authHeader = req.headers['authorization'] || '';
            const m = authHeader.match(/^Bearer\s+(.+)$/i);
            const token = m ? m[1] : null;
            if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
            let username;
            try { username = jwt.verify(token, AUTH_SECRET)?.sub; } catch { return res.status(401).json({ success: false, message: 'Unauthorized' }); }
            if (!username) return res.status(401).json({ success: false, message: 'Unauthorized' });

            ensurePasswordCycleColumn((colErr) => {
                if (colErr) return res.status(500).json({ success: false, message: 'Internal error' });
                const days = CYCLE_MAP[cycle];
                const db = new sqlite3.Database(DATABASE_FILE, sqlite3.OPEN_READWRITE);
                db.run('UPDATE users SET password_cycle_days = ? WHERE username = ?', [days, username], (updErr) => {
                    db.close();
                    if (updErr) {
                        logger.error('DB error updating password cycle:', updErr);
                        return res.status(500).json({ success: false, message: 'Failed to update password cycle' });
                    }
                    return res.json({ success: true });
                });
            });
        } catch (e) {
            logger.error('Error setting password-cycle:', e);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    // Serve static files (UI)
    app.use(express.static(path.join(process.cwd(), "public", "browser")));

    // For all other requests return index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "browser", "index.html"));
    });

    return app;
}

/**
 * Database paginated query logic
 * @param {string} databaseFile - Path to database file
 * @param {string} tableName - Table name to query
 * @param {string} id - Patient ID to filter by
 * @param {string} startTime - Start time to filter by
 * @param {string} endTime - End time to filter by
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @param {Function} callback - Callback function
 */
function getPaginatedData(databaseFile, tableName, id, startTime, endTime, page, pageSize, callback,) {
    const offset = (page - 1) * pageSize;
    const db = new sqlite3.Database(databaseFile);
    let whereParts = [];
    let params = [];
    if (id != null && id.trim() !== '') {
        whereParts.push('pat_ID = ?');
        params.push(id);
    }
    if (startTime) {
        whereParts.push('Date >= ?');
        params.push(startTime);
    }
    if (endTime) {
        whereParts.push('Date <= ?');
        params.push(endTime);
    }

    let whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    if (whereClause.length !== 0) {
        whereClause += ' ORDER BY datetime(local_time) DESC';
    }
    const totalQuery = `SELECT COUNT(*) AS total
                        FROM ${tableName} ${whereClause}`;
    const dataQuery = `SELECT *
                       FROM ${tableName} ${whereClause} LIMIT ?
                       OFFSET ?`;
    const dataParams = params.concat([pageSize, offset]);

    db.serialize(() => {
        db.get(totalQuery, params, (err, totalResult) => {
            if (err) {
                logger.error("Error counting records:", err);
                callback(err);
                db.close();
                return;
            }

            const total = totalResult.total;

            db.all(dataQuery, dataParams, (err, rows) => {
                if (err) {
                    logger.error("Error fetching paginated data:", err);
                    callback(err);
                    db.close();
                    return;
                }

                callback(null, {
                    rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
                });

                db.close();
            },);
        },);
    });
}

/**
 * Validates if a port number is valid
 * @param {number} port - Port number to validate
 * @returns {boolean} - True if port is valid
 */
function isValidPort(port) {
    return Number.isInteger(port) && port > 0 && port < 65536;
}

/**
 * Creates an HTTP server
 * @param {number} port - Port number to listen on
 * @returns {http.Server} - HTTP server instance
 */
function startHttpServer(port) {
    const app = createHttpApp();
    const server = app.listen(port, () => {
        logger.info(`HTTP API listening on port ${port}\n`);
        logger.info(`HTTP API server started on port ${port}\n`);
    });

    return server;
}

/**
 * Restarts the HTTP server on a new port
 * @param {http.Server} currentServer - Current HTTP server instance
 * @param {number} newPort - New port number to listen on
 * @returns {Promise<http.Server>} - New HTTP server instance
 */
function restartHttpServer(currentServer, newPort) {
    return new Promise((resolve) => {
        if (currentServer) {
            currentServer.close(() => {
                logger.info(`HTTP server closed, restarting on port ${newPort}`);
                resolve(startHttpServer(newPort));
            });
        } else {
            resolve(startHttpServer(newPort));
        }
    });
}

module.exports = {
    createHttpApp, startHttpServer, restartHttpServer, getPaginatedData
};
