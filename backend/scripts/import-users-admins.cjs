/**
 * Import real User and Admin data from Excel into database.
 *
 * Source: Data Satpam_Compile_normal-insert to DB_20260312.xlsx
 * - Sheet "Data USER": 1,712 satpam users
 * - Sheet "Data ADMIN": 154 admins (9 KP + 145 Kepwil)
 * - Sheet "New Data NIP Duplicate": 42 corrected NPP entries
 *
 * Usage: node scripts/import-users-admins.cjs
 */

const path = require('path');
const XLSX = require(path.join(__dirname, '../../node_modules/xlsx'));
const mysql = require(path.join(__dirname, '../../node_modules/mysql2/promise'));
const bcrypt = require(path.join(__dirname, '../../node_modules/bcryptjs'));

const EXCEL_FILE = '/mnt/c/Users/adhik/Downloads/Data Satpam_Compile_normal-insert to DB_20260312.xlsx';
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'bpjs_kuesioner',
};

// Normalize name for matching: lowercase, strip common prefixes, trim
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^kantor\s+cabang\s+/i, '')
    .replace(/^kcu[\s.]+/i, '')
    .replace(/^kc[\s.\-]+/i, '')
    .replace(/^cabang\s+/i, '')
    .replace(/^kab\.\s*/i, 'kabupaten ')
    .replace(/^kabupaten\s+/i, 'kabupaten ')
    .replace(/^kota\s+/i, 'kota ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple similarity for fuzzy matching (Levenshtein-based)
function similarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  // Simple containment check
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return shorter.length / longer.length;
  }

  // Levenshtein distance
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Connected to MySQL database.\n');

  try {
    // ── 1. Read Excel ──
    console.log('Reading Excel file...');
    const wb = XLSX.readFile(EXCEL_FILE);
    const userRows = XLSX.utils.sheet_to_json(wb.Sheets['Data USER']);
    const adminRows = XLSX.utils.sheet_to_json(wb.Sheets['Data ADMIN']);
    const dupRows = XLSX.utils.sheet_to_json(wb.Sheets['New Data NIP Duplicate']);
    console.log(`  Users: ${userRows.length}`);
    console.log(`  Admins: ${adminRows.length}`);
    console.log(`  NIP corrections: ${dupRows.length}`);

    // ── 2. Build NIP correction map ──
    const nppCorrections = new Map();
    for (const row of dupRows) {
      const original = String(row['Nomor Karyawan'] || '').trim();
      const corrected = String(row['Nomor Karyawan_final'] || '').trim();
      if (original && corrected && original !== corrected) {
        nppCorrections.set(original, corrected);
      }
    }
    console.log(`  NIP corrections loaded: ${nppCorrections.size}`);

    // ── 3. Load location data from DB ──
    console.log('\nLoading location data from database...');

    const [kepwils] = await conn.execute('SELECT id, nama FROM Kepwil');
    const kepwilMap = new Map(); // nama -> id
    for (const k of kepwils) {
      kepwilMap.set(k.nama, k.id);
    }
    console.log(`  Kepwil: ${kepwilMap.size}`);

    const [kcs] = await conn.execute('SELECT id, nama, kepwilId FROM KantorCabang');
    // Build KC lookup: Map<kepwilId, Map<normalizedName, {id, nama}>>
    const kcByKepwil = new Map();
    for (const kc of kcs) {
      if (!kcByKepwil.has(kc.kepwilId)) kcByKepwil.set(kc.kepwilId, new Map());
      const norm = normalizeName(kc.nama);
      kcByKepwil.get(kc.kepwilId).set(norm, { id: kc.id, nama: kc.nama });
    }
    console.log(`  KantorCabang: ${kcs.length}`);

    const [kakabs] = await conn.execute('SELECT id, nama, kantorCabangId FROM KantorKabupaten');
    // Build Kakab lookup: Map<kcId, Map<normalizedName, {id, nama}>>
    const kakabByKc = new Map();
    for (const k of kakabs) {
      if (!kakabByKc.has(k.kantorCabangId)) kakabByKc.set(k.kantorCabangId, new Map());
      const norm = normalizeName(k.nama);
      kakabByKc.get(k.kantorCabangId).set(norm, { id: k.id, nama: k.nama });
    }
    console.log(`  KantorKabupaten: ${kakabs.length}`);

    // Helper: find KC by name within a Kepwil (with fuzzy matching)
    function findKc(kepwilId, kcName) {
      const kcMap = kcByKepwil.get(kepwilId);
      if (!kcMap) return null;

      const norm = normalizeName(kcName);

      // Exact match
      if (kcMap.has(norm)) return kcMap.get(norm);

      // Try without "kabupaten"/"kota" prefix
      const stripped = norm.replace(/^(kabupaten|kota)\s+/, '');
      if (kcMap.has(stripped)) return kcMap.get(stripped);

      // Fuzzy match - find best match above threshold
      let bestMatch = null;
      let bestScore = 0;
      for (const [key, val] of kcMap) {
        const score = similarity(norm, key);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = val;
        }
        // Also try stripped version
        const score2 = similarity(stripped, key);
        if (score2 > bestScore) {
          bestScore = score2;
          bestMatch = val;
        }
      }

      if (bestScore >= 0.75) return bestMatch;
      return null;
    }

    // Helper: find Kakab by name within a KC (with fuzzy matching)
    function findKakab(kcId, kakabName) {
      const kakabMap = kakabByKc.get(kcId);
      if (!kakabMap) return null;

      const norm = normalizeName(kakabName);

      // Exact match
      if (kakabMap.has(norm)) return kakabMap.get(norm);

      // Try variants
      // "Kantor Cabang Kisaran" → might be referencing the KC itself, not a Kakab
      const stripped = norm
        .replace(/^kantor\s+cabang\s+/, '')
        .replace(/^(kabupaten|kota)\s+/, '');

      for (const [key, val] of kakabMap) {
        const keyStripped = key.replace(/^(kabupaten|kota)\s+/, '');
        if (keyStripped === stripped || keyStripped === norm || key === stripped) {
          return val;
        }
      }

      // Fuzzy match
      let bestMatch = null;
      let bestScore = 0;
      for (const [key, val] of kakabMap) {
        const score = similarity(norm, key);
        if (score > bestScore) { bestScore = score; bestMatch = val; }
        const score2 = similarity(stripped, key);
        if (score2 > bestScore) { bestScore = score2; bestMatch = val; }
      }

      if (bestScore >= 0.7) return bestMatch;
      return null;
    }

    // ── 4. Hash passwords ──
    console.log('\nHashing passwords...');
    const userPasswordHash = await bcrypt.hash('usersehat26!', 10);
    const adminPasswordHash = await bcrypt.hash('bpjscore26#', 10);
    console.log('  Done.');

    // ── 5. Clear existing dummy data ──
    console.log('\nClearing existing data...');

    // Delete related data first (test sessions, jawabans, hasil, progress)
    await conn.execute('DELETE FROM JawabanPeriode');
    await conn.execute('DELETE FROM HasilTestPeriode');
    await conn.execute('DELETE FROM TestSessionPeriode');
    await conn.execute('DELETE FROM MateriProgressPeriode');
    await conn.execute('DELETE FROM Jawaban');
    await conn.execute('DELETE FROM HasilTest');
    await conn.execute('DELETE FROM TestSession');
    await conn.execute('DELETE FROM MateriProgress');
    console.log('  Cleared test/progress data.');

    // Delete existing users
    const [userDel] = await conn.execute('DELETE FROM User');
    console.log(`  Deleted ${userDel.affectedRows} existing users.`);

    // Delete existing admins EXCEPT the SUPER_ADMIN (id=1, username="admin")
    const [adminDel] = await conn.execute('DELETE FROM Admin WHERE username != "admin"');
    console.log(`  Deleted ${adminDel.affectedRows} existing admins (preserved SUPER_ADMIN).`);

    // ── 6. Import Users ──
    console.log('\nImporting users...');

    const SATPAM_SUBKATEGORI_ID = 1; // SubKategori "Satpam"
    let userInserted = 0;
    let userSkipped = 0;
    const userErrors = [];
    const unmatchedKc = new Map(); // For logging
    const unmatchedKakab = new Map(); // For logging
    const seenNpps = new Set();

    for (const row of userRows) {
      let npp = String(row['NPP'] || '').trim();
      const nama = String(row['Nama'] || '').trim();
      const email = (row['Alamat email'] || '').toString().trim() || null;
      const kepwilNama = String(row['Kepwil'] || '').trim();
      const kcNama = String(row['KC '] || row['KC'] || '').trim();
      const kakabNama = String(row['Kantor Kabupaten/Kota'] || '').trim();

      // Apply NIP corrections
      if (nppCorrections.has(npp)) {
        npp = nppCorrections.get(npp);
      }

      if (!npp || !nama) {
        userSkipped++;
        continue;
      }

      // Skip duplicate NPPs
      if (seenNpps.has(npp)) {
        userSkipped++;
        userErrors.push(`Duplicate NPP skipped: ${npp} (${nama})`);
        continue;
      }
      seenNpps.add(npp);

      // Match locations
      const kepwilId = kepwilMap.get(kepwilNama) || null;
      let kcId = null;
      let kakabId = null;

      if (kepwilId && kcNama) {
        const kcMatch = findKc(kepwilId, kcNama);
        if (kcMatch) {
          kcId = kcMatch.id;

          if (kakabNama) {
            const kakabMatch = findKakab(kcId, kakabNama);
            if (kakabMatch) {
              kakabId = kakabMatch.id;
            } else {
              const key = `${kcNama} > ${kakabNama}`;
              unmatchedKakab.set(key, (unmatchedKakab.get(key) || 0) + 1);
            }
          }
        } else {
          const key = `Kepwil ${kepwilNama} > ${kcNama}`;
          unmatchedKc.set(key, (unmatchedKc.get(key) || 0) + 1);
        }
      }

      try {
        await conn.execute(
          `INSERT INTO User (npp, password, nama, email, vendor, posisi, kepwilId, kcId, kakabId, subKategoriId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NULL, 'Satpam', ?, ?, ?, ?, NOW(), NOW())`,
          [npp, userPasswordHash, nama, email, kepwilId, kcId, kakabId, SATPAM_SUBKATEGORI_ID]
        );
        userInserted++;
      } catch (err) {
        userErrors.push(`Failed to insert ${npp} (${nama}): ${err.message}`);
        userSkipped++;
      }
    }

    console.log(`  Inserted: ${userInserted}`);
    console.log(`  Skipped: ${userSkipped}`);

    if (unmatchedKc.size > 0) {
      console.log(`\n  ⚠ Unmatched KC (${unmatchedKc.size} unique):`);
      for (const [key, count] of [...unmatchedKc.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${key} (${count} users)`);
      }
    }

    if (unmatchedKakab.size > 0) {
      console.log(`\n  ⚠ Unmatched Kakab (${unmatchedKakab.size} unique):`);
      for (const [key, count] of [...unmatchedKakab.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
        console.log(`    ${key} (${count} users)`);
      }
      if (unmatchedKakab.size > 20) {
        console.log(`    ... and ${unmatchedKakab.size - 20} more`);
      }
    }

    if (userErrors.length > 0) {
      console.log(`\n  Errors (${userErrors.length}):`);
      userErrors.slice(0, 10).forEach(e => console.log(`    ${e}`));
      if (userErrors.length > 10) console.log(`    ... and ${userErrors.length - 10} more`);
    }

    // ── 7. Import Admins ──
    console.log('\nImporting admins...');

    let adminInserted = 0;
    let adminSkipped = 0;
    const adminErrors = [];
    const unmatchedAdminKc = [];
    const seenUsernames = new Set(['admin']); // Preserve existing SUPER_ADMIN

    for (const row of adminRows) {
      const kepwilNama = String(row['Kepwil'] || '').trim();
      const unitKerja = String(row['UNIT KERJA'] || '').trim();
      const nama = String(row['Nama'] || '').trim();
      const npp = String(row['NPP'] || '').trim();
      const email = (row['Alamat email'] || '').toString().trim() || null;

      if (!npp || !nama) {
        adminSkipped++;
        continue;
      }

      // Use NPP as username
      const username = npp;

      if (seenUsernames.has(username)) {
        adminSkipped++;
        adminErrors.push(`Duplicate username skipped: ${username} (${nama})`);
        continue;
      }
      seenUsernames.add(username);

      // Determine role and location
      let role, kepwilId = null, kcId = null;

      if (kepwilNama === 'KP') {
        role = 'ADMIN_KP';
      } else {
        role = 'ADMIN_KEPWIL';
        kepwilId = kepwilMap.get(kepwilNama) || null;

        if (kepwilId && unitKerja) {
          // Check if unit kerja is a Kepwil-level entry (not a KC)
          const lower = unitKerja.toLowerCase();
          const isKepwilLevel = lower.startsWith('kepwil') ||
                                lower.startsWith('kedeputian wilayah') ||
                                lower.startsWith('kantor kedeputian');

          if (!isKepwilLevel) {
            const kcMatch = findKc(kepwilId, unitKerja);
            if (kcMatch) {
              kcId = kcMatch.id;
            } else {
              unmatchedAdminKc.push(`Kepwil ${kepwilNama} > ${unitKerja} (${nama})`);
            }
          }
          // Kepwil-level admins: kepwilId set, kcId stays null
        }
      }

      try {
        await conn.execute(
          `INSERT INTO Admin (username, password, nama, role, kepwilId, kcId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [username, adminPasswordHash, nama, role, kepwilId, kcId]
        );
        adminInserted++;
      } catch (err) {
        adminErrors.push(`Failed to insert ${username} (${nama}): ${err.message}`);
        adminSkipped++;
      }
    }

    console.log(`  Inserted: ${adminInserted}`);
    console.log(`  Skipped: ${adminSkipped}`);
    console.log(`  Preserved: SUPER_ADMIN (username: admin)`);

    if (unmatchedAdminKc.length > 0) {
      console.log(`\n  ⚠ Unmatched Admin KC (${unmatchedAdminKc.length}):`);
      unmatchedAdminKc.forEach(e => console.log(`    ${e}`));
    }

    if (adminErrors.length > 0) {
      console.log(`\n  Errors (${adminErrors.length}):`);
      adminErrors.forEach(e => console.log(`    ${e}`));
    }

    // ── 8. Summary ──
    console.log('\n══════════════════════════════════════');
    console.log('  IMPORT COMPLETE');
    console.log('══════════════════════════════════════');

    const [[{finalUsers}]] = await conn.execute('SELECT COUNT(*) as finalUsers FROM User');
    const [[{finalAdmins}]] = await conn.execute('SELECT COUNT(*) as finalAdmins FROM Admin');
    const [roleCounts] = await conn.execute('SELECT role, COUNT(*) as cnt FROM Admin GROUP BY role');

    console.log(`  Total Users: ${finalUsers}`);
    console.log(`  Total Admins: ${finalAdmins}`);
    console.log('  Admin by role:');
    roleCounts.forEach(r => console.log(`    ${r.role}: ${r.cnt}`));
    console.log('══════════════════════════════════════');

    // Login info
    console.log('\n  Login credentials:');
    console.log('  ─────────────────');
    console.log('  SUPER_ADMIN: username=admin, password=admin123');
    console.log('  ADMIN_KP:    username=[NPP], password=bpjscore26#');
    console.log('  ADMIN_KEPWIL: username=[NPP], password=bpjscore26#');
    console.log('  Users:       npp=[NPP], password=usersehat26!');

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
