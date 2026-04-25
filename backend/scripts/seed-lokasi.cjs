/**
 * Seed script for Kepwil, KantorCabang, and KantorKabupaten tables.
 *
 * Reads from Excel file: DATA KEPWIL,KC, Dan KABUPATEN.xlsx
 * - Sheet "Kepwil-KC-Kab_User": Kepwil > KC > Kantor Kabupaten/Kota (538 rows)
 * - Sheet "Kepwil-KC-Kab_Admin": Kepwil > UNIT KERJA (131 rows, KC-level for admins)
 *
 * Usage: node scripts/seed-lokasi.cjs
 */

const path = require('path');
const XLSX = require(path.join(__dirname, '../../node_modules/xlsx'));
const mysql = require(path.join(__dirname, '../../node_modules/mysql2/promise'));

const EXCEL_FILE = '/mnt/c/Users/adhik/Downloads/DATA KEPWIL,KC, Dan KABUPATEN.xlsx';
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'bpjs_kuesioner',
};

// Kepwil values (Roman numerals I-XII)
const KEPWIL_LIST = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Connected to MySQL database.\n');

  try {
    // ── 1. Read Excel ──
    console.log('Reading Excel file...');
    const wb = XLSX.readFile(EXCEL_FILE);

    // Sheet 1: User data (Kepwil, KC, Kantor Kabupaten/Kota)
    const wsUser = wb.Sheets['Kepwil-KC-Kab_User'];
    const userRows = XLSX.utils.sheet_to_json(wsUser);
    console.log(`  User sheet: ${userRows.length} rows`);

    // Sheet 2: Admin data (Kepwil, UNIT KERJA)
    const wsAdmin = wb.Sheets['Kepwil-KC-Kab_Admin'];
    const adminRows = XLSX.utils.sheet_to_json(wsAdmin);
    console.log(`  Admin sheet: ${adminRows.length} rows`);

    // ── 2. Clear existing data (NULL out FK references first) ──
    console.log('\nClearing existing location data...');

    // NULL out FK references on User table
    await conn.execute('UPDATE `User` SET `kepwilId` = NULL, `kcId` = NULL, `kakabId` = NULL');
    console.log('  Cleared User FK references (kepwilId, kcId, kakabId)');

    // NULL out FK references on Admin table
    await conn.execute('UPDATE `Admin` SET `kepwilId` = NULL, `kcId` = NULL');
    console.log('  Cleared Admin FK references (kepwilId, kcId)');

    // Delete in order: KantorKabupaten -> KantorCabang -> Kepwil
    // Also try to delete old Provinsi/Kabupaten tables if they exist
    const tablesToClear = ['KantorKabupaten', 'KantorCabang', 'Kepwil', 'Kabupaten', 'Provinsi'];
    for (const table of tablesToClear) {
      try {
        const [result] = await conn.execute(`DELETE FROM \`${table}\``);
        if (result.affectedRows > 0) {
          console.log(`  Deleted ${result.affectedRows} rows from ${table}`);
        }
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist, that's fine
        } else {
          console.log(`  Warning: Could not clear ${table}: ${err.message}`);
        }
      }
    }

    // ── 3. Create Kepwil records ──
    console.log('\nCreating Kepwil records...');
    const kepwilMap = new Map(); // nama -> id

    for (const nama of KEPWIL_LIST) {
      const [result] = await conn.execute(
        'INSERT INTO `Kepwil` (`nama`, `createdAt`) VALUES (?, NOW())',
        [nama]
      );
      kepwilMap.set(nama, result.insertId);
    }
    console.log(`  Created ${kepwilMap.size} Kepwil records: ${KEPWIL_LIST.join(', ')}`);

    // ── 4. Parse KC and KantorKabupaten from User sheet ──
    console.log('\nParsing KC and KantorKabupaten from User sheet...');

    // Structure: Map<kepwilNama, Map<kcNamaLower, { displayName, kabupatenSet }>>
    const kcByKepwil = new Map();
    for (const kw of KEPWIL_LIST) {
      kcByKepwil.set(kw, new Map());
    }

    let skippedUserRows = 0;

    for (const row of userRows) {
      const kepwil = String(row['Kepwil'] || '').trim();
      // Column header has trailing space: "KC "
      const kcRaw = String(row['KC '] || row['KC'] || '').trim();
      const kakabRaw = String(row['Kantor Kabupaten/Kota'] || '').trim();

      if (!kepwil || !KEPWIL_LIST.includes(kepwil)) {
        skippedUserRows++;
        continue;
      }

      if (!kcRaw) {
        skippedUserRows++;
        continue;
      }

      // Normalize KC name: strip common prefixes like "KC ", "KC-"
      let kcName = kcRaw
        .replace(/^KC[\s\-]+/i, '')  // Remove "KC ", "KC-" prefix
        .trim();

      // Skip entries that are Kepwil-level references (not actual KC)
      const kcLower = kcName.toLowerCase();
      if (kcLower.startsWith('kepwil') || kcLower.startsWith('kedeputian wilayah')) {
        skippedUserRows++;
        continue;
      }

      const kcMap = kcByKepwil.get(kepwil);
      if (!kcMap.has(kcLower)) {
        kcMap.set(kcLower, {
          displayName: kcName, // Store first occurrence's casing
          kabupatens: new Map(), // kakabLower -> displayName
        });
      }

      // Add KantorKabupaten if present
      if (kakabRaw) {
        const entry = kcMap.get(kcLower);
        const kakabLower = kakabRaw.toLowerCase();
        if (!entry.kabupatens.has(kakabLower)) {
          entry.kabupatens.set(kakabLower, kakabRaw); // Store first occurrence's casing
        }
      }
    }

    if (skippedUserRows > 0) {
      console.log(`  Skipped ${skippedUserRows} user rows (Kepwil-level or empty KC)`);
    }

    // ── 5. Parse Admin sheet for additional KC entries ──
    console.log('Parsing Admin sheet for additional KC entries...');

    let adminKcAdded = 0;

    for (const row of adminRows) {
      const kepwil = String(row['Kepwil'] || '').trim();
      const unitKerja = String(row['UNIT KERJA'] || '').trim();

      // Skip non-Kepwil entries (like "KP" for Kantor Pusat)
      if (!kepwil || !KEPWIL_LIST.includes(kepwil)) {
        continue;
      }

      if (!unitKerja) continue;

      // Extract KC name from various formats:
      // "KC Banda Aceh", "KC.Padangsidimpuan", "KCU SURABAYA",
      // "Kantor Cabang Makassar", "Cabang Kabanjahe"
      // Also plain names like "Medan", "Batam", "TAPAKTUAN"
      let kcName = unitKerja;

      // Skip Kepwil-level entries
      const lower = kcName.toLowerCase();
      if (lower.startsWith('kepwil') || lower.startsWith('kedeputian wilayah') || lower.startsWith('kantor kedeputian')) {
        continue;
      }

      // Strip prefixes
      kcName = kcName
        .replace(/^KCU[\s]+/i, '')      // "KCU SURABAYA" -> "SURABAYA"
        .replace(/^KC[\s.\-]+/i, '')     // "KC Banda Aceh", "KC.Padangsidimpuan" -> name
        .replace(/^Kantor\s+Cabang\s+/i, '') // "Kantor Cabang Makassar" -> "Makassar"
        .replace(/^Cabang\s+/i, '')      // "Cabang Kabanjahe" -> "Kabanjahe"
        .trim();

      if (!kcName) continue;

      const kcMap = kcByKepwil.get(kepwil);
      if (!kcMap) continue;

      const kcLower = kcName.toLowerCase();
      if (!kcMap.has(kcLower)) {
        kcMap.set(kcLower, {
          displayName: kcName,
          kabupatens: new Map(),
        });
        adminKcAdded++;
      }
    }

    console.log(`  Additional KC from Admin sheet: ${adminKcAdded}`);

    // ── 6. Insert KantorCabang and KantorKabupaten ──
    console.log('\nInserting KantorCabang and KantorKabupaten records...');

    let totalKc = 0;
    let totalKakab = 0;
    const kcIdMap = new Map(); // "kepwil|kcLower" -> id (for reference)

    for (const [kepwilNama, kcMap] of kcByKepwil) {
      const kepwilId = kepwilMap.get(kepwilNama);

      for (const [kcLower, kcData] of kcMap) {
        // Insert KantorCabang
        const [kcResult] = await conn.execute(
          'INSERT INTO `KantorCabang` (`nama`, `kepwilId`, `createdAt`) VALUES (?, ?, NOW())',
          [kcData.displayName, kepwilId]
        );
        const kcId = kcResult.insertId;
        kcIdMap.set(`${kepwilNama}|${kcLower}`, kcId);
        totalKc++;

        // Insert KantorKabupaten records for this KC
        for (const [kakabLower, kakabName] of kcData.kabupatens) {
          await conn.execute(
            'INSERT INTO `KantorKabupaten` (`nama`, `kantorCabangId`, `createdAt`) VALUES (?, ?, NOW())',
            [kakabName, kcId]
          );
          totalKakab++;
        }
      }
    }

    // ── 7. Print Summary ──
    console.log('\n══════════════════════════════════════');
    console.log('  SEED LOKASI COMPLETE');
    console.log('══════════════════════════════════════');
    console.log(`  Kepwil:          ${kepwilMap.size}`);
    console.log(`  KantorCabang:    ${totalKc}`);
    console.log(`  KantorKabupaten: ${totalKakab}`);
    console.log('══════════════════════════════════════');

    // Detail per Kepwil
    console.log('\nDetail per Kepwil:');
    for (const [kepwilNama, kcMap] of kcByKepwil) {
      let kakabCount = 0;
      for (const [, kcData] of kcMap) {
        kakabCount += kcData.kabupatens.size;
      }
      console.log(`  Kepwil ${kepwilNama.padEnd(4)}: ${kcMap.size} KC, ${kakabCount} Kantor Kabupaten`);
    }

  } catch (err) {
    console.error('\nERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await conn.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
