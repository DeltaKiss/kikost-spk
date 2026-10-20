// ============================================================
// frontend/src/mockData.js
// Synthetic Mock Dataset & Adapter for SPK Kikost Vercel Demo
// (100% Fictional Data — No Local DB / Real Credential Usage)
// ============================================================

const MOCK_PERIOD = '2026-03';
const MOCK_PERIODS = ['2026-03', '2026-02', '2026-01'];

// Fictional Criteria (Official SPK Kikost structure)
const INITIAL_CRITERIA = [
  { id: 1, kode: 'C1', nama_kriteria: 'Harga', bobot: '15.00', jenis: 'cost' },
  { id: 2, kode: 'C2', nama_kriteria: 'Kualitas Pencucian', bobot: '15.00', jenis: 'benefit' },
  { id: 3, kode: 'C3', nama_kriteria: 'Waktu Pengerjaan', bobot: '10.00', jenis: 'cost' },
  { id: 4, kode: 'C4', nama_kriteria: 'Ketepatan Waktu', bobot: '15.00', jenis: 'benefit' },
  { id: 5, kode: 'C5', nama_kriteria: 'Pelayanan Pelanggan', bobot: '10.00', jenis: 'benefit' },
  { id: 6, kode: 'C6', nama_kriteria: 'Keamanan Pakaian', bobot: '10.00', jenis: 'benefit' },
  { id: 7, kode: 'C7', nama_kriteria: 'Kemudahan Antar Jemput', bobot: '15.00', jenis: 'benefit' },
  { id: 8, kode: 'C8', nama_kriteria: 'Varian Pewangi', bobot: '10.00', jenis: 'benefit' },
];

// Fictional Vendors (Clean sample laundry data)
const INITIAL_VENDORS = [
  {
    id: 1,
    nama_vendor: 'Laundry Berkah Bersih',
    alamat: 'Jl. Flamboyan No. 12, Lingkungan Kampus',
    no_telepon: '0812-9900-1122',
    status: 'aktif',
    created_at: '2026-01-15 08:30:00',
  },
  {
    id: 2,
    nama_vendor: 'Kikost Express Wash',
    alamat: 'Jl. Melati Indah No. 45, Kompleks Kost Kikost',
    no_telepon: '0812-9900-3344',
    status: 'aktif',
    created_at: '2026-01-16 09:15:00',
  },
  {
    id: 3,
    nama_vendor: 'Clean & Fresh Kiloan',
    alamat: 'Jl. Cempaka Putih No. 8, Dekat Halte Utama',
    no_telepon: '0812-9900-5566',
    status: 'aktif',
    created_at: '2026-01-20 10:00:00',
  },
  {
    id: 4,
    nama_vendor: 'Family Laundry & Dry Clean',
    alamat: 'Jl. Mawar Asri No. 19, Area Pemukiman Barat',
    no_telepon: '0812-9900-7788',
    status: 'aktif',
    created_at: '2026-02-01 11:20:00',
  },
  {
    id: 5,
    nama_vendor: 'Sakura Laundry Premium',
    alamat: 'Jl. Kenanga Baru No. 27, Ruko Mahasiswa',
    no_telepon: '0812-9900-9900',
    status: 'aktif',
    created_at: '2026-02-05 13:45:00',
  },
];

// Fictional Assessments matrix (vendor_id -> criterion_id -> value)
const INITIAL_ASSESSMENTS = {
  // Vendor 1: Berkah Bersih (Balanced top performer)
  1: { 1: 6500, 2: 5, 3: 1.5, 4: 5, 5: 4, 6: 5, 7: 5, 8: 4 },
  // Vendor 2: Kikost Express (Fastest turn-around)
  2: { 1: 7000, 2: 4, 3: 1.0, 4: 4, 5: 5, 6: 5, 7: 4, 8: 5 },
  // Vendor 3: Clean & Fresh (Cheapest rate)
  3: { 1: 6000, 2: 4, 3: 2.0, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4 },
  // Vendor 4: Family Laundry
  4: { 1: 7500, 2: 4, 3: 2.5, 4: 4, 5: 3, 6: 4, 7: 3, 8: 4 },
  // Vendor 5: Sakura Laundry
  5: { 1: 8000, 2: 5, 3: 2.0, 4: 3, 5: 4, 6: 4, 7: 3, 8: 5 },
};

// Fictional Demo Users
const INITIAL_USERS = [
  {
    id: 1,
    username: 'demo_superadmin',
    nama: 'Super Administrator (Demo)',
    email: 'superadmin.demo@kikost.local',
    no_hp: '0812-0000-0001',
    role: 'superadmin',
    foto: null,
    status: 'aktif',
    last_login: '2026-10-20 08:30:00',
  },
  {
    id: 2,
    username: 'demo_admin',
    nama: 'Staff Admin Operasional (Demo)',
    email: 'admin.demo@kikost.local',
    no_hp: '0812-0000-0002',
    role: 'admin',
    foto: null,
    status: 'aktif',
    last_login: '2026-10-19 14:10:00',
  },
];

// Local state container for interactive demo session
class MockStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.user = { ...INITIAL_USERS[0] };
    this.users = INITIAL_USERS.map((u) => ({ ...u }));
    this.vendors = INITIAL_VENDORS.map((v) => ({ ...v }));
    this.criteria = INITIAL_CRITERIA.map((c) => ({ ...c }));
    this.assessments = JSON.parse(JSON.stringify(INITIAL_ASSESSMENTS));
    this.period = MOCK_PERIOD;
    this.periods = [...MOCK_PERIODS];
  }

  // Pure SAW Calculation algorithm matching calculation/saw.php
  computeSaw(targetPeriod = this.period) {
    const activeVendors = this.vendors.filter((v) => v.status === 'aktif');
    const criteriaList = this.criteria;

    if (activeVendors.length === 0 || criteriaList.length === 0) {
      return {
        periode: targetPeriod,
        periods: this.periods,
        criteria: criteriaList,
        total_bobot: 100,
        bobot_valid: true,
        ranking: [],
      };
    }

    // Step 1: Find Min and Max for each criterion
    const bounds = {};
    criteriaList.forEach((c) => {
      const vals = activeVendors.map((v) => {
        const val = this.assessments[v.id]?.[c.id];
        return typeof val === 'number' ? val : 0;
      });
      bounds[c.id] = {
        max: Math.max(...vals, 0.0001),
        min: Math.min(...vals.filter((x) => x > 0), 1),
      };
    });

    // Step 2 & 3: Normalization (rij) and Weighted Preference (Vi)
    const rankingResults = activeVendors.map((v) => {
      let finalVi = 0;
      const detail = criteriaList.map((c) => {
        const val = this.assessments[v.id]?.[c.id] ?? 0;
        const b = bounds[c.id];
        let rij = 0;
        if (c.jenis === 'cost') {
          rij = val > 0 ? b.min / val : 0;
        } else {
          rij = b.max > 0 ? val / b.max : 0;
        }
        const wj = Number(c.bobot) / 100;
        const kontribusi = wj * rij;
        finalVi += kontribusi;

        return {
          kriteria_id: c.id,
          kode: c.kode,
          nama: c.nama_kriteria,
          jenis: c.jenis,
          bobot: wj,
          nilai_asli: val,
          rij: rij,
          kontribusi: kontribusi,
        };
      });

      return {
        vendor_id: v.id,
        nama_vendor: v.nama_vendor,
        nilai_akhir: finalVi,
        detail: detail,
      };
    });

    // Sort descending by finalVi
    rankingResults.sort((a, b) => b.nilai_akhir - a.nilai_akhir);

    // Assign official ranks
    rankingResults.forEach((r, idx) => {
      r.officialRank = idx + 1;
      r.rank = idx + 1;
    });

    const totalBobot = criteriaList.reduce((acc, c) => acc + Number(c.bobot), 0);

    return {
      periode: targetPeriod,
      periods: this.periods,
      criteria: criteriaList,
      total_bobot: totalBobot,
      bobot_valid: Math.abs(totalBobot - 100) < 0.01,
      ranking: rankingResults,
    };
  }

  getDashboardData(targetPeriod = this.period) {
    const period = targetPeriod || this.period;
    const activeVendors = this.vendors.filter((v) => v.status === 'aktif');
    const criteriaList = this.criteria;

    let filled = 0;
    let complete = 0;
    const vendorStatus = [];

    activeVendors.forEach((vendor) => {
      const vAss = this.assessments[vendor.id] || {};
      const missing = [];
      criteriaList.forEach((criterion) => {
        const val = vAss[criterion.id];
        if (val !== undefined && val !== null && val !== '') {
          filled++;
        } else {
          missing.push({
            id: Number(criterion.id),
            kode: criterion.kode,
            nama_kriteria: criterion.nama_kriteria,
          });
        }
      });
      const terisi = criteriaList.length - missing.length;
      if (criteriaList.length > 0 && missing.length === 0) {
        complete++;
      }
      vendorStatus.push({
        id: Number(vendor.id),
        nama_vendor: vendor.nama_vendor,
        terisi: terisi,
        total: criteriaList.length,
        missing: missing,
        status: missing.length === 0 ? 'lengkap' : (terisi > 0 ? 'sebagian' : 'belum'),
      });
    });

    const totalExpected = activeVendors.length * criteriaList.length;
    const completenessPercent = totalExpected > 0 ? Math.round((filled / totalExpected) * 1000) / 10 : 0;

    const sawData = this.computeSaw(period);
    const weightTotal = criteriaList.reduce((acc, c) => acc + Number(c.bobot), 0);
    const weightValid = Math.abs(weightTotal - 100) < 0.01;
    const topRanking = sawData.ranking.slice(0, 5);
    const winner = topRanking[0] || null;

    const latestVendor = this.vendors.reduce((latest, v) => {
      return !latest || (v.created_at && v.created_at > latest) ? v.created_at : latest;
    }, null);

    return {
      periode: period,
      periods: this.periods,
      metrics: {
        total_vendors: this.vendors.length,
        active_vendors: activeVendors.length,
        criteria_count: criteriaList.length,
        weight_total: weightTotal,
        weight_valid: weightValid,
        complete_vendors: complete,
        ranking_winner: winner ? winner.nama_vendor : null,
        ranking_score: winner ? Number(winner.nilai_akhir) : null,
      },
      completeness: {
        filled: filled,
        expected: totalExpected,
        percent: completenessPercent,
        vendors: vendorStatus,
      },
      criteria: criteriaList,
      ranking: topRanking,
      activity: {
        last_login: this.user?.last_login || '2026-10-20 08:30:00',
        latest_vendor: latestVendor || '2026-02-05 13:45:00',
        latest_assessment: `${period}-01 10:00:00`,
      },
    };
  }
}

const store = new MockStore();

// Synthetic Request Handler for Demo Mode
export async function handleMockRequest(resource, action = '', options = {}) {
  const method = options.method || 'GET';
  const params = options.params || {};
  const data = options.data || {};

  // Artificial microscopic latency (20ms) for realistic UI responsiveness
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 1. Auth Endpoint
  if (resource === 'auth') {
    if (action === 'status' || method === 'GET') {
      return {
        authenticated: true,
        user: store.user,
        csrf: 'mock-csrf-token-demo',
      };
    }
    if (action === 'login') {
      return {
        authenticated: true,
        user: store.user,
        csrf: 'mock-csrf-token-demo',
      };
    }
    if (action === 'logout') {
      return { authenticated: false };
    }
  }

  // 2. Dashboard Endpoint
  if (resource === 'dashboard') {
    return store.getDashboardData(params.periode || store.period);
  }

  // 3. SAW Endpoint
  if (resource === 'saw') {
    return store.computeSaw(params.periode || store.period);
  }

  // 4. Vendors Endpoint
  if (resource === 'vendors') {
    if (method === 'GET') {
      if (params.id) {
        const vendor = store.vendors.find((v) => Number(v.id) === Number(params.id));
        if (!vendor) throw new Error('Vendor tidak ditemukan.');
        const vAss = store.assessments[vendor.id] || {};
        const history = store.criteria.map((c) => ({
          periode: store.period,
          kode: c.kode,
          nama_kriteria: c.nama_kriteria,
          bobot: c.bobot,
          jenis: c.jenis,
          nilai: vAss[c.id] !== undefined ? vAss[c.id] : '-',
        }));
        return { vendor, history };
      }
      return { vendors: [...store.vendors] };
    }
    if (method === 'POST') {
      const act = action || data.action || 'create';
      if (act === 'create') {
        const nextId = Math.max(...store.vendors.map((v) => v.id), 0) + 1;
        const newVendor = {
          id: nextId,
          nama_vendor: data.nama_vendor || 'Vendor Baru (Simulasi)',
          alamat: data.alamat || '',
          no_telepon: data.no_telepon || '',
          status: data.status || 'aktif',
          created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
        store.vendors.unshift(newVendor);
        return { id: nextId, message: 'Mode Demo — vendor berhasil ditambahkan (simulasi).' };
      }
      if (act === 'update') {
        const target = store.vendors.find((v) => Number(v.id) === Number(data.id));
        if (target) {
          target.nama_vendor = data.nama_vendor || target.nama_vendor;
          target.alamat = data.alamat || target.alamat;
          target.no_telepon = data.no_telepon || target.no_telepon;
          target.status = data.status || target.status;
        }
        return { id: data.id, message: 'Mode Demo — data vendor diperbarui (simulasi).' };
      }
      if (act === 'toggle') {
        const target = store.vendors.find((v) => Number(v.id) === Number(data.id));
        if (target) {
          target.status = data.status;
        }
        return { id: data.id, status: data.status };
      }
      if (act === 'delete') {
        store.vendors = store.vendors.filter((v) => Number(v.id) !== Number(data.id));
        return { id: data.id };
      }
    }
  }

  // 5. Criteria Endpoint
  if (resource === 'criteria') {
    if (method === 'GET') {
      return [...store.criteria];
    }
    if (method === 'POST') {
      const act = action || data.action || 'create';
      if (act === 'create') {
        const nextId = Math.max(...store.criteria.map((c) => c.id), 0) + 1;
        const item = {
          id: nextId,
          kode: data.kode || `C${nextId}`,
          nama_kriteria: data.nama_kriteria || 'Kriteria Baru',
          bobot: String(data.bobot || '10.00'),
          jenis: data.jenis || 'benefit',
        };
        store.criteria.push(item);
        return { id: nextId };
      }
      if (act === 'update') {
        const target = store.criteria.find((c) => Number(c.id) === Number(data.id));
        if (target) {
          target.kode = data.kode || target.kode;
          target.nama_kriteria = data.nama_kriteria || target.nama_kriteria;
          target.bobot = String(data.bobot || target.bobot);
          target.jenis = data.jenis || target.jenis;
        }
        return { id: data.id };
      }
      if (act === 'bobot') {
        if (data.weights) {
          Object.entries(data.weights).forEach(([id, val]) => {
            const target = store.criteria.find((c) => Number(c.id) === Number(id));
            if (target) target.bobot = String(val);
          });
        }
        return { ok: true };
      }
      if (act === 'delete') {
        store.criteria = store.criteria.filter((c) => Number(c.id) !== Number(data.id));
        return { id: data.id };
      }
    }
  }

  // 6. Assessments Endpoint
  if (resource === 'assessments' || resource === 'penilaian') {
    if (method === 'GET') {
      const curPeriod = params.periode || store.period;
      const activeVendors = store.vendors.filter((v) => v.status === 'aktif');
      const rows = activeVendors.map((vendor) => {
        const ratings = {};
        let filled = 0;
        store.criteria.forEach((c) => {
          const val = store.assessments[vendor.id]?.[c.id];
          if (val !== undefined && val !== null && val !== '') {
            ratings[c.id] = Number(val);
            filled++;
          } else {
            ratings[c.id] = null;
          }
        });
        return {
          vendor,
          ratings,
          filled,
          total: store.criteria.length,
        };
      });

      if (params.vendor_id) {
        const vendor = store.vendors.find((v) => Number(v.id) === Number(params.vendor_id));
        const nilai = store.assessments[params.vendor_id] || {};
        return {
          vendor: vendor || { nama_vendor: 'Vendor' },
          periode: curPeriod,
          criteria: store.criteria,
          nilai: nilai,
          rows: rows,
        };
      }
      return {
        periode: curPeriod,
        periods: store.periods,
        criteria: store.criteria,
        vendors: store.vendors,
        rows: rows,
      };
    }
    if (method === 'POST') {
      const act = action || data.action || 'create';
      if (act === 'delete') {
        const vId = Number(data.vendor_id);
        if (vId && store.assessments[vId]) {
          delete store.assessments[vId];
        }
        return { vendor_id: data.vendor_id, periode: data.periode };
      }
      const vId = Number(data.vendor_id);
      if (vId && data.nilai) {
        store.assessments[vId] = {
          ...(store.assessments[vId] || {}),
          ...data.nilai,
        };
      }
      return { ok: true, message: 'Mode Demo — penilaian disimpan (simulasi).' };
    }
  }

  // 7. Users Endpoint
  if (resource === 'users') {
    if (method === 'GET') {
      return {
        users: [...store.users],
        current_user_id: store.user.id,
      };
    }
    if (method === 'POST') {
      const act = action || data.action || 'create';
      if (act === 'create') {
        const nextId = Math.max(...store.users.map((u) => u.id), 0) + 1;
        const newUser = {
          id: nextId,
          username: data.username || `admin_${nextId}`,
          nama: data.nama || 'Staff Admin Baru',
          email: data.email || '',
          no_hp: data.no_hp || '',
          role: 'admin',
          foto: null,
          status: data.status || 'aktif',
          last_login: null,
        };
        store.users.push(newUser);
        return { id: nextId, message: 'Mode Demo — akun admin ditambahkan (simulasi).' };
      }
      if (act === 'update') {
        const target = store.users.find((u) => Number(u.id) === Number(data.id));
        if (target) {
          target.nama = data.nama || target.nama;
          target.email = data.email || target.email;
          target.no_hp = data.no_hp || target.no_hp;
          if (target.role !== 'superadmin') {
            target.status = data.status || target.status;
          }
        }
        return { id: data.id, message: 'Mode Demo — profil admin diperbarui (simulasi).' };
      }
      if (act === 'toggle') {
        const target = store.users.find((u) => Number(u.id) === Number(data.id));
        if (target && target.role !== 'superadmin') {
          target.status = data.status;
        }
        return { id: data.id, status: data.status };
      }
      if (act === 'delete') {
        const target = store.users.find((u) => Number(u.id) === Number(data.id));
        if (target && target.role !== 'superadmin') {
          target.status = 'nonaktif';
        }
        return { id: data.id };
      }
    }
  }

  // 8. Profile Endpoint
  if (resource === 'profile') {
    if (method === 'GET') {
      return { ...store.user };
    }
    if (method === 'POST') {
      const act = action || data.action || 'update';
      if (act === 'delete_photo') {
        store.user.foto = null;
        return { foto: null };
      }
      store.user.nama = data.nama || store.user.nama;
      store.user.email = data.email || store.user.email;
      store.user.no_hp = data.no_hp || store.user.no_hp;
      return { ...store.user, message: 'Mode Demo — profil diperbarui (simulasi).' };
    }
  }

  // Fallback if an unmocked resource is hit
  throw new Error(`[Mock API] Endpoint ${resource} belum didukung di Mode Demo.`);
}
