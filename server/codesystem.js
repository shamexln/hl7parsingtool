const {
    CODE_SYSTEM,
    DATABASE_FILE,
    TABLE_HL7_PATIENTS,
    TABLE_HL7_CODESYSTEMS,
    TABLE_HL7_CODESYSTEM_300
} = require('./config');
const fs = require('fs');
const xml2js = require('xml2js');
const winston = require("winston");
const parser = new xml2js.Parser();
const path = require('path');
const util = require('util');
const {initializeDatabase} = require("./init_database");
const sqlite3 = require('sqlite3').verbose();
// Add this line to import the crypto module
const crypto = require('crypto');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.simple()
    ),
    transports: [new winston.transports.Console()]
});

let encodeToTagMap = new Map();
let allTags = [];
// Store  mappings in memory
// Structure: { [mappingName]: { tags: [...], descrMap:encodeToDescriptionMap, obsTypMap:encodeToObservationTypeMap, srcChaMap:subidToSourceChannelMap,  createdAt: Date, updatedAt: Date } }
const CodeSystemMappings = {};

/**
 * Attempts to locate the specified file by checking multiple possible paths.
 * Returns the first found path; if none are found, returns the default path in the current directory.
 *
 * @param {string} filename - The name of the file to locate.
 * @returns {string} - The resolved file path.
 */
function getFilePath(filename) {
    // 尝试多种可能的路径
    const possiblePaths = [
        path.join(__dirname, filename),
        path.join(process.cwd(), filename),
        path.join(path.dirname(process.execPath), filename)
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    // If none can be found, return the default path.
    return path.join(__dirname, filename);
}

/**
 * Updates or inserts a codesystem record in the database.
 * - Converts the `get` and `run` methods to Promise form for async/await usage.
 * - Queries the total number of records in the codesystem table.
 * - Checks if a codesystem with the given name already exists.
 * - If it exists, updates the record; otherwise, inserts a new one.
 * - Stores the XML data and related metadata.
 *
 * @param {Buffer|string} data - The XML data to store.
 * @param {string} detailtablename - The detail table name for the codesystem.
 * @param {string} codesystemname - The name of the codesystem.
 */
async function updateCodesysteminDB(data, detailtablename = TABLE_HL7_CODESYSTEM_300, codesystemname = '300') {
    const db = new sqlite3.Database(DATABASE_FILE);
    try {
        // Convert the `get` and `run` methods to Promise form.
        const dbGet = util.promisify(db.get).bind(db);
        const dbRun = util.promisify(db.run).bind(db);
        // Query the total number of records.
        const countRow = await dbGet(`SELECT COUNT(*) AS count
                                      FROM ${TABLE_HL7_CODESYSTEMS}`);
        const totalCount = countRow.count;
        logger.info(`**The total number of records in the current table is ：${totalCount}`);

        const row = await dbGet(
            `SELECT *
             FROM ${TABLE_HL7_CODESYSTEMS}
             WHERE codesystem_name = ?`,
            [codesystemname]
        );

        const xmlData = data.toString();

        if (row) {
            await dbRun(
                `UPDATE ${TABLE_HL7_CODESYSTEMS}
                 SET codesystem_filename  = ?,
                     codesystem_tablename = ?,
                     codesystem_xml       = ?
                 WHERE codesystem_name = ?`,
                [`${codesystemname}_map.xml`, detailtablename, xmlData, codesystemname]
            );
            logger.info(`Codesystem ${codesystemname} updated successfully`);
        } else {
            await dbRun(
                `INSERT INTO ${TABLE_HL7_CODESYSTEMS} (codesystem_id, codesystem_name, codesystem_filename,
                                                       codesystem_tablename, codesystem_isdeault, codesystem_iscurrent,
                                                       codesystem_xml)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [totalCount, codesystemname, `${codesystemname}_map.xml`, detailtablename, 'true', 'true', xmlData]
            );
            logger.info(`Codesystem ${codesystemname} inserted successfully`);
        }

    } catch (err) {
        logger.error("Database operation failed\n:", err);
    } finally {
        db.close((closeErr) => {
            if (closeErr) {
                logger.error("Database close failed\n:", closeErr);
            }
        });
    }
}

/**
 * Executes an SQL statement using db.run and returns a Promise that resolves with the number of affected rows.
 * Useful for getting the changes count when performing UPDATE or DELETE operations with sqlite3.
 *
 * @param {sqlite3.Database} db - The sqlite3 database instance.
 * @param {string} sql - The SQL statement to execute.
 * @param {Array} params - The parameters for the SQL statement.
 * @returns {Promise<number>} - A Promise that resolves with the number of affected rows.
 */
function dbRunWithChanges(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this.changes); // 只返回受影响行数
        });
    });
}

/**
 * Updates or inserts multiple tag records into the specified table in the database.
 * - Creates the table if it does not exist.
 * - For each tag, checks if it already exists (by tagkey).
 *   - If it exists, updates the record and increments affectedRows, unless `forceUpdate` is false.
 *   - If it does not exist, inserts a new record and increments affectedRows.
 * - Updates the encodeToTagMap with the new descriptions.
 * - Returns the total number of affected rows (updated or inserted).
 *
 * @param {string} tablename - The name of the table to update.
 * @param {Array} tags - The array of tag objects to upsert.
 * @param {object} [options={forceUpdate: true}] - Options for the operation.
 * @param {boolean} [options.forceUpdate=true] - If true, existing records will be updated.
 * @returns {Promise<number>} - The total number of affected rows.
 */
async function updateDetailCodeSystem(tablename, tags, options = { forceUpdate: true }) {
    const db = new sqlite3.Database(DATABASE_FILE);
    let affectedRows = 0;
    try {
        const dbGet = util.promisify(db.get).bind(db);
        const dbRun = util.promisify(db.run).bind(db);

        await dbRun(
            `CREATE TABLE IF NOT EXISTS ${tablename}
             (
                 id
                 INTEGER
                 PRIMARY
                 KEY
                 AUTOINCREMENT,
                 tagkey
                 TEXT,
                 observationtype
                 TEXT,
                 datatype
                 TEXT,
                 encode
                 TEXT,
                 parameterlabel
                 TEXT,
                 encodesystem
                 TEXT,
                 subid
                 TEXT,
                 description
                 TEXT,
                 source
                 TEXT,
                 mds
                 TEXT,
                 mdsid
                 TEXT,
                 vmd
                 TEXT,
                 vmdid
                 TEXT,
                 channel
                 TEXT,
                 channelid
                 TEXT
             )`
        );


        for (const item of tags) {

            const row = await dbGet(
                `SELECT tagkey
                 FROM ${tablename}
                 WHERE tagkey = ?`,
                [item.tagkey]
            );

            if (row) {
                if (!options.forceUpdate) {
                    continue; // Skip update if forceUpdate is false
                }
                const changes = await dbRunWithChanges(
                    db,
                    `UPDATE ${tablename}
                     SET observationtype = ?,
                         datatype        = ?,
                         encode          = ?,
                         parameterlabel  = ?,
                         encodesystem    = ?,
                         subid           = ?,
                         description     = ?,
                         source          = ?,
                         mds             = ?,
                         mdsid           = ?,
                         vmd             = ?,
                         vmdid           = ?,
                         channel         = ?,
                         channelid       = ?
                     WHERE tagkey = ?`,
                    [item.observationtype, item.datatype, item.encode, item.parameterlabel, item.encodesystem, item.subid, item.description,
                        item.source, item.mds, item.mdsid, item.vmd, item.vmdid, item.channel, item.channelid, item.tagkey]
                );
                affectedRows += changes;
                logger.info(`Table ${tablename} updated successfully`);
            } else {
                const changes = await dbRunWithChanges(
                    db,
                    `INSERT INTO ${tablename}
                     (tagkey, observationtype, datatype, encode, parameterlabel, encodesystem, subid, description,
                      source, mds, mdsid, vmd, vmdid, channel, channelid)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.tagkey, item.observationtype, item.datatype, item.encode, item.parameterlabel, item.encodesystem, item.subid,
                        item.description, item.source, item.mds, item.mdsid, item.vmd, item.vmdid, item.channel, item.channelid]
                );
                affectedRows += changes;
                logger.info(`Table ${tablename} inserted successfully`);
            }
        }

        // update value in  encodeMap with new tags
        for (const tag of tags) {
            const result = encodeToTagMap.get(tag.encode) || [];
            const matchingResult = result.find(item =>
                tag.encode === item.encode && tag.subid === item.subid
            );
            if (matchingResult) {
                matchingResult.description = tag.description;
            }
        }
        return affectedRows;
    } catch (err) {
        logger.error("Database operation failed\n:", err);
    } finally {
        db.close((closeErr) => {
            if (closeErr) {
                logger.error("Database close failed\n:", closeErr);
            }
        });
    }
}

/**
 * Builds a Map index for the given tags array, using the specified fields as keys.
 * Each key in the Map corresponds to a field value, and its value is an array of tags that have that field value.
 *
 * @param {Array<Object>} tags - The array of tag objects to index.
 * @param {Array<string>} fields - The fields to use as keys for the index.
 * @returns {Map<string, Array<Object>>} - A Map where each key is a field value and each value is an array of matching tags.
 */
function buildSpecificKeyIndex(tags, fields) {
    const index = new Map();
    tags.forEach(tag => {
        fields.forEach(field => {
            const val = tag[field];
            if (val !== undefined) {
                const key = String(val).trim();
                if (!index.has(key)) index.set(key, []);
                index.get(key).push(tag);
            }
        });
    });
    return index;
}

/**
 * Initializes the code system from the given XML data.
 * - Reads the XML file and removes BOM if present.
 * - Parses the XML structure and extracts tags.
 * - Converts each tag's attribute from an array to a single value.
 * - Stores `encode` and `description` in a Map for fast lookup.
 * - Validates and creates a new code system mapping if it does not already exist.
 * - Updates the database with the processed tags.
 *
 * @param {string} xmlData - The path or identifier for the XML data file.
 * @returns {Promise<void|Object>} - Returns an error object if mapping name is invalid or already exists.
 */
async function initializeCodeSystem(xmlData = CODE_SYSTEM) {
    try {
        let bomRemovedData;
        const xmlPath = getFilePath(xmlData);

        const data = await fs.promises.readFile(xmlPath);
        // write the raw data with default name 300 into db
        await updateCodesysteminDB(data);
        bomRemovedData = data.toString().replace("\ufeff", "");

        const result = await parseXML(bomRemovedData);

        logger.info('XML structure:', JSON.stringify(result, null, 2).substring(0, 500) + '...');

        const rootName = Object.keys(result)[0];
        logger.info('Root element name:', rootName);

        const rootElement = result[rootName];

        let tags;
        if (rootElement.tag) {
            tags = rootElement.tag;
        } else {
            logger.error('No "tag" element found. Please check XML structure');
            return;
        }


        // Store `encode` and `description` in a Map.
        if (Array.isArray(tags)) {
            // Store all tags
            allTags = tags.map(tag => {
                // Convert each tag's attribute from an array to a single value.
                const processedTag = {};
                Object.keys(tag).forEach(key => {
                    if (Array.isArray(tag[key]) && tag[key].length > 0) {
                        processedTag[key] = tag[key][0];
                    }
                });
                return processedTag;
            });

            encodeToTagMap = buildSpecificKeyIndex(allTags, ['encode']);

            // Create the new mapping
            const now = new Date();
            const name = xmlPath.substring(xmlPath.lastIndexOf(path.sep) + 1, xmlPath.lastIndexOf('_map'));
            // Validate name
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return {success: false, message: 'Invalid mapping name'};
            }

            // According name to check the data is in the table, if there are data in the table
            // read data from database back to encodeToTagMap
            if (await CheckIsDataincodesystemTable(name)) {
                // Because the database is newer than xml file(always original file)
                // read data from database back to encodeToTagMap
                try {
                    // 1) Determine which table to read from for this codesystem name
                    const tableName = await getCodesystemTableNameByName(name);

                    // 2) Read all tags from DB and rebuild in-memory structures
                    const db = new sqlite3.Database(DATABASE_FILE);
                    const dbAll = util.promisify(db.all).bind(db);
                    try {
                        const rows = await dbAll(
                            `SELECT tagkey, observationtype, datatype, encode, parameterlabel, encodesystem, subid, description,
                                    source, mds, mdsid, vmd, vmdid, channel, channelid
                             FROM ${tableName}`
                        );
                        // Normalize rows into tag objects (ensure string values)
                        const dbTags = (rows || []).map(r => ({
                            tagkey: r.tagkey,
                            observationtype: r.observationtype,
                            datatype: r.datatype,
                            encode: r.encode,
                            parameterlabel: r.parameterlabel,
                            encodesystem: r.encodesystem,
                            subid: r.subid,
                            description: r.description,
                            source: r.source,
                            mds: r.mds,
                            mdsid: r.mdsid,
                            vmd: r.vmd,
                            vmdid: r.vmdid,
                            channel: r.channel,
                            channelid: r.channelid
                        }));

                        // Rebuild global caches from DB data
                        allTags = dbTags;
                        encodeToTagMap = buildSpecificKeyIndex(allTags, ['encode']);

                        // Ensure mapping object exists before updating
                        if (!CodeSystemMappings[name]) {
                            CodeSystemMappings[name] = { tags: [], createdAt: now, updatedAt: now };
                        }
                        // Update the in-memory mapping timestamp and tags
                        CodeSystemMappings[name].tags = allTags;
                        CodeSystemMappings[name].updatedAt = new Date();

                        logger.info(`Loaded existing codesystem '${name}' from database table '${tableName}' into memory.`);
                    } finally {
                        db.close();
                    }

                    // Successfully synced from DB; do not treat as error
                    return { success: true, message: `Mapping '${name}' already exists; reloaded from database.` };
                } catch (e) {
                    logger.error(`Failed to reload existing mapping '${name}' from database:`, e);
                    return { success: false, message: `Failed to reload existing mapping '${name}' from database` };
                }
            } else {
                // if CodeSystemMappings[name] not exist, create it (in-memory and persist to DB)
                CodeSystemMappings[name] = {
                    tags: allTags,
                    createdAt: now,
                    updatedAt: now
                };
                // only insert data into table
                await updateDetailCodeSystem(TABLE_HL7_CODESYSTEM_300, CodeSystemMappings[name].tags, { forceUpdate: false });
            }
            logger.info('Code system initialized successfully.');

        } else {
            logger.error('Tags element is not an array:', tags);
        }
    } catch (err) {
        logger.error('Error parsing XML:', err);
    }
}

function parseXML(xmlData) {
    return new Promise((resolve, reject) => {
        parser.parseString(xmlData, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function getDescription(encode, subid = "") {
    const result = encodeToTagMap.get(encode) || [];
    if (subid) {
        // Find the first tag that matches both encode and subid
        const matchingTag = result.find(encodes =>
            encodes.encode && encodes.subid === subid && encodes.encode === encode
        );
        return matchingTag ? matchingTag.description : undefined;
    } else {
        // Find the first tag that matches encode
        const matchingTag = result.find(encodes =>
            encodes.encode && encodes.encode === encode
        );
        return matchingTag ? matchingTag.description : undefined;
    }
}

function getObservationType(encode, subid = "") {
    const result = encodeToTagMap.get(encode) || [];
    if (subid) {
        // Find the first tag that matches both encode and subid
        const matchingTag = result.find(encodes =>
            encodes.encode && encodes.subid === subid && encodes.encode === encode
        );
        return matchingTag ? matchingTag.observationtype : undefined;
    } else {
        // Find the first tag that matches encode
        const matchingTag = result.find(encodes =>
            encodes.encode && encodes.encode === encode
        );
        return matchingTag ? matchingTag.observationtype : undefined;
    }
}

function getSourceChannel(encode, subid) {
    const result = encodeToTagMap.get(encode) || [];
    if (subid) {
        // Find the first tag that matches both encode and subid
        const matchingTag = result.find(encodes =>
            encodes.encode && encodes.subid === subid && encodes.encode === encode
        );
        return matchingTag ? matchingTag.source + '/' + matchingTag.channel : undefined;
    } else {
        return undefined;
    }

}

function getAllTags() {
    return allTags;
}

/**
 * Function to get the list of xml file
 * @param {string} filepath - default path
 * @returns {string[]} - mapping name
 */
function getCodeSystemNames(filepath = process.cwd()) {
    try {
        const files = fs.readdirSync(filepath);
        return files
            .filter(file => file.endsWith('_map.xml'))
            .map(file => file.substring(0, file.lastIndexOf('_map')));
    } catch (error) {
        logger.error(`Error reading mapping files: ${error.message}`);
        return [];
    }
}

/**
 * Create a new custom tag mapping
 * @param {string} name - Name of the new codesystem file name, e.g. ${name}._map.xml
 * @param {Array} tags - Array of tag objects
 * @param {string} filename - Name of the custom tags file (optional)
 * @returns {Object} - Result object with success status and message
 */
function createCodeSystem(name, codesystem, filename = 'custom_tags.json') {
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return {success: false, message: 'Invalid mapping name'};
    }

    // Check if name already exists
    if (CodeSystemMappings[name]) {
        return {success: false, message: 'A mapping with this name already exists'};
    }

    // Create the new mapping
    const now = new Date();
    CodeSystemMappings[name] = {
        tags: codesystem.tags,
        createdAt: now,
        updatedAt: now
    };

    // Save to disk
    saveCodeSystemToFile(CodeSystemMappings[name], filename);

    return {
        success: true,
        message: 'Custom tag mapping created successfully',
        codesystem: CodeSystemMappings[name]
    };
}

/**
 * Save custom tag mappings to disk
 * @param {string} filename - Name of the custom tags file (optional)
 */
function saveCodeSystemToFile(codesystem, filename = 'custom_tags.json') {
    if (!codesystem || !Array.isArray(codesystem.tags)) {
        logger.error('codesystem 参数无效或缺少 tags 数组');
        return;
    }
    const {create} = require("xmlbuilder2");
    try {
        const root = create({version: "1.0", encoding: "UTF-8"}).ele("root");
        codesystem.tags.forEach(item => {
            const tag = root.ele("tag");
            Object.entries(item).forEach(([key, value]) => {
                tag.ele(key).txt(value);
            });
        });
        const xmlString = root.end({prettyPrint: true});

        const filePath = getCodeSystemFilePath(filename);
        fs.writeFileSync(filePath, '\uFEFF' + xmlString, 'utf8');
        logger.info(`Code system saved to  ${filePath}`);
    } catch (error) {
        logger.error(`save code system into file fail: ${error.message}`);
    }

}

// Function to get the path for custom tag mappings file
function getCodeSystemFilePath(filename = 'custom_tags.json') {
    return path.join(process.cwd(), filename);
}

/**
 * Get the table name for a codesystem by ID
 * @param {string} id - Codesystem ID
 * @returns {Promise<string>} - Table name for the codesystem
 */
async function getCodesystemTableNameByName(name) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DATABASE_FILE);

        try {
            // If id is null or empty, return the default table name
            if (!name || name.trim() === '') {
                resolve(TABLE_HL7_CODESYSTEM_300);
                db.close();
                return;
            }

            // Build the query with proper parameter binding
            const query = `SELECT *
                           FROM ${TABLE_HL7_CODESYSTEMS}
                           WHERE codesystem_name = ?`;

            db.get(query, [name], (err, row) => {
                if (err) {
                    logger.error("Error getting codesystem table name:", err);
                    reject(err);
                    return;
                }

                if (row && row.codesystem_tablename) {
                    resolve(row.codesystem_tablename);
                } else {
                    // If no matching record found, return the default table name
                    resolve(TABLE_HL7_CODESYSTEM_300);
                }
            });
        } catch (error) {
            logger.error("Exception in getCodesystemTableByName:", error);
            reject(error);
        } finally {
            db.close((closeErr) => {
                if (closeErr) {
                    logger.error("Error closing database:", closeErr);
                }
            });
        }
    });
}


// 根据名称检查对应的 codesystem 明细表中是否存在数据
// According to the zh comment, check if there is data in the codesystem detail table for the given name
async function CheckIsDataincodesystemTable(name) {
    try {
        const tableName = await getCodesystemTableNameByName(name);
        const db = new sqlite3.Database(DATABASE_FILE);
        const dbGet = util.promisify(db.get).bind(db);
        try {
            // 1) Ensure table exists
            const tableRow = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
            if (!tableRow) {
                logger.warn(`Codesystem detail table not found: ${tableName}`);
                return false;
            }
            // 2) Check if there is any data in the table
            const countRow = await dbGet(`SELECT COUNT(*) AS cnt FROM ${tableName}`);
            return (countRow && Number(countRow.cnt) > 0);
        } catch (err) {
            logger.error(`CheckIsDataincodesystemTable error for '${name}':`, err);
            return false;
        } finally {
            db.close();
        }
    } catch (e) {
        logger.error(`Failed to resolve table name for codesystem '${name}':`, e);
        return false;
    }
}

module.exports = {
    initializeCodeSystem,
    getDescription,
    getObservationType,
    getSourceChannel,
    getAllTags,
    getCodeSystemNames,
    createCodeSystem,
    getCodesystemTableNameByName,
    updateDetailCodeSystem
};
