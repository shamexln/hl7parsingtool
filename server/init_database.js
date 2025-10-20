const sqlite3 = require('sqlite3').verbose();
const { TABLE_HL7_PATIENTS, DATABASE_FILE, TABLE_HL7_CODESYSTEMS, TABLE_HL7_CODESYSTEM_300} = require('./config');
const { SQLITE_INTEGER_MAX, OBSOLETED_DEFAULT_VALUE} = require('./constants');
const winston = require('winston');

// 日志配置示例（仅供参考，你项目中可能已有此配置）
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple()
    ),
    transports: [new winston.transports.Console()]
});

async function initializeDatabase() {
    const db = new sqlite3.Database(DATABASE_FILE);
    const util = require('util');
    const dbRun = util.promisify(db.run).bind(db);

    try {
        // Create patients table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS ${TABLE_HL7_PATIENTS} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT,
                local_time TEXT,
                Date TEXT,
                Time TEXT,
                Hour TEXT,
                bed_label TEXT,
                pat_ID TEXT,
                mon_unit TEXT,
                care_unit TEXT,
                alarm_grade TEXT,
                alarm_state TEXT,
                Alarm_Grade_2 TEXT,
                alarm_message TEXT,
                param_id TEXT,
                param_description TEXT,
                param_value TEXT,
                param_uom TEXT,
                param_upper_lim TEXT,
                param_lower_lim TEXT,
                Limit_Violation_Type TEXT,
                Limit_Violation_Value TEXT,
                subid TEXT,
                sourcechannel TEXT,
                onset_tick TEXT,
                alarm_duration TEXT,
                change_time_UTC TEXT,
                change_tick TEXT,
                aborted TEXT,                       
                raw_message TEXT,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info(`Table "${TABLE_HL7_PATIENTS}" created or already exists.`);

        // Create codesystems table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS ${TABLE_HL7_CODESYSTEMS} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codesystem_id TEXT,
                codesystem_name TEXT,
                codesystem_filename TEXT,
                codesystem_tablename TEXT,
                codesystem_isdeault TEXT,
                codesystem_iscurrent TEXT,
                codesystem_xml TEXT,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info(`Table "${TABLE_HL7_CODESYSTEMS}" created or already exists.`);

        // Create codesystem detail table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS ${TABLE_HL7_CODESYSTEM_300} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tagkey TEXT,
                observationtype TEXT,
                datatype TEXT,
                encode TEXT,
                parameterlabel TEXT,
                encodesystem TEXT,
                subid TEXT,
                description TEXT,
                source TEXT,
                mds TEXT,
                mdsid TEXT,
                vmd TEXT,
                vmdid TEXT,
                channel TEXT,
                channelid TEXT
            )
        `);
        logger.info(`Table "${TABLE_HL7_CODESYSTEM_300}" created or already exists.`);

        // Create users table for user management (with UID and password cycle)
        // SQLITE_INTEGER_MAX max vaue of INTEGER
        await dbRun(`CREATE TABLE IF NOT EXISTS users (
                                                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                          username TEXT UNIQUE NOT NULL,
                                                          uid TEXT UNIQUE,
                                                          password_enc BLOB NOT NULL,
                                                          iv BLOB NOT NULL,
                                                          tag BLOB NOT NULL,
                                                          password_cycle_days TEXT DEFAULT ${SQLITE_INTEGER_MAX},
                                                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                     )`);
        logger.info(`Table "users" created or already exists.`);

        // Ensure new columns exist for legacy databases
        await new Promise((resolve) => {
            db.all("PRAGMA table_info(users)", [], async (perr, rows) => {
                if (perr) {
                    logger.warn('PRAGMA table_info(users) failed:', perr);
                    return resolve();
                }
                try {
                    const names = Array.isArray(rows) ? rows.map(r => r.name) : [];
                    if (!names.includes('uid')) {
                        await dbRun("ALTER TABLE users ADD COLUMN uid TEXT UNIQUE");
                        logger.info('Added missing column users.uid');
                    }
                    if (!names.includes('password_cycle_days')) {
                        await dbRun("ALTER TABLE users ADD COLUMN password_cycle_days TEXT DEFAULT '-1'");
                        logger.info('Added missing column users.password_cycle_days');
                    }
                } catch (e) {
                    logger.warn('Altering users table failed (may be fine if schema already up-to-date):', e.message || e);
                }
                resolve();
            });
        });

        // Create password history table (store encrypted passwords per user UID)
        await dbRun(`CREATE TABLE IF NOT EXISTS password (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          uid TEXT NOT NULL,
                          password_enc BLOB NOT NULL,
                          iv BLOB NOT NULL,
                          tag BLOB NOT NULL,
                          obsoleted TEXT DEFAULT ${OBSOLETED_DEFAULT_VALUE},
                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                      )`);
        logger.info(`Table "password" created or already exists.`);

        // Create auth_tokens table for persistent session tokens
        await dbRun(`
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info(`Table "auth_tokens" created or already exists.`);
    } catch (err) {
        logger.error('Error creating tables:', err);
        throw err; // Rethrow to allow caller to handle the error
    } finally {
        await new Promise((resolve, reject) => {
            db.close(err => {
                if (err) {
                    logger.error('Error closing database:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = {
    initializeDatabase
};
