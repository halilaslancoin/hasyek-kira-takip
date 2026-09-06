import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bsajwcplambqjhitwkew.supabase.co'
const SUPABASE_ANON_KEY = 'SENIN_ANON_KEY_BURAYA' // Supabase Settings > API kısmından aldığın public anon key'i buraya yapıştır

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
import { useState, useEffect, useMemo } from "react";
import {
  Home, Store, Users, Wrench, Menu as MenuIcon, Bell, LayoutGrid, List as ListIcon,
  Plus, Trash2, Pencil, X, Check, ChevronLeft, ChevronRight, ArrowLeft,
  FileText, FolderOpen, ClipboardList, Wallet, Receipt, Landmark,
  AlertTriangle, ImagePlus, MessageCircle, UserPlus, Copy, Mail,
  Zap, Droplet, PaintRoller, Truck, Flame, Sofa, Settings, ShieldCheck, Banknote, Building2
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

if (typeof window !== "undefined") {
  window.storage = {
    async get(key) {
      const { data, error } = await supabase.from('app_data').select('value').eq('key', key).single();
      if (error || !data) throw new Error("key not found: " + key);
      return { key, value: data.value, shared: false };
    },
    async set(key, value) {
      const { error } = await supabase.from('app_data').upsert({ key, value });
      if (error) console.error("Supabase kayit hatasi:", error);
      return { key, value, shared: false };
    },
    async delete(key) {
      await supabase.from('app_data').delete().eq('key', key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const { data } = await supabase.from('app_data').select('key');
      const keys = (data || []).map(d => d.key).filter(k => !prefix || k.startsWith(prefix));
      return { keys };
    },
  };
}

const uid = () =>
  window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);

const fmtMoney = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
};
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("tr-TR");
};
const daysUntil = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  const today = new Date();
  dt.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((dt - today) / 86400000);
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const pad2 = (n) => String(n).padStart(2, "0");
const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const STORAGE_KEYS = {
  properties: "hasyek:properties",
  people: "hasyek:people",
  contracts: "hasyek:contracts",
  payments: "hasyek:payments",
  expenses: "hasyek:expenses",
  maintenance: "hasyek:maintenance",
  profile: "hasyek:profile",
};

const KONUT_TURLERI = ["Daire", "Rezidans", "Müstakil Ev", "Villa", "Çiftlik Evi", "Köşk & Konak", "Yalı", "Yalı Dairesi", "Yazlık", "Prefabrik Ev", "Kooperatif", "Diğer"];
const ISYERI_TURLERI = ["Ofis", "Dükkan", "Depo", "Atölye", "Diğer"];
const ISINMA_TIPLERI = ["Doğalgaz Kombi", "Doğalgaz Sobası", "Merkezi Sistem", "Klima", "Soba", "Yok", "Diğer"];
const TAPU_NITELIKLERI = ["Mesken", "Arsa", "Tarla", "İşyeri", "Diğer"];
const BINA_YASI_ARALIKLARI = ["0-5", "6-10", "11-15", "16-20", "21-25", "26 ve üzeri"];
const EXPENSE_CATEGORIES = ["Boya/Badana", "Tamirat", "Sıhhi Tesisat", "Elektrik/Doğalgaz", "Aidat", "Sigorta", "Emlak Vergisi", "Temizlik", "Diğer"];
const MAINTENANCE_CATEGORIES = [
  { label: "Elektrikçi", icon: Zap },
  { label: "Tesisatçı", icon: Droplet },
  { label: "Boyacı", icon: PaintRoller },
  { label: "Taşınma Hizmetleri", icon: Truck },
  { label: "Kombici", icon: Flame },
  { label: "Koltuk & Halı Yıkama", icon: Sofa },
];

function generatePaymentPlan(contract) {
  if (!contract.startDate || !contract.rentAmount) return [];
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  const day = Number(contract.paymentDay) || start.getDate();
  const list = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), day);
  if (cur < start) cur = new Date(cur.getFullYear(), cur.getMonth() + 1, day);
  let guard = 0;
  while (cur <= end && guard < 240) {
    list.push({ id: uid(), contractId: contract.id, dueDate: cur.toISOString().slice(0, 10), amount: contract.rentAmount, paidAmount: "", paidDate: "", bankRef: "", kind: "kira", description: "" });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, day);
    guard++;
  }
  return list;
}

function paymentStatus(p) {
  if (p.paidAmount && Number(p.paidAmount) >= Number(p.amount)) return "Ödendi";
  if (p.paidAmount && Number(p.paidAmount) > 0) return "Kısmi";
  const d = daysUntil(p.dueDate);
  if (d !== null && d < 0) return "Gecikti";
  return "Bekliyor";
}

function parseBankAmount(raw) {
  if (!raw) return "";
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? "" : String(n);
}

function blankPersonDraft() {
  return { id: null, name: "", tcNo: "", phone: "", address: "" };
}

function blankContractDraft(propertyId) {
  return {
    id: uid(), propertyId: propertyId || "",
    landlord: blankPersonDraft(), tenant: blankPersonDraft(), guarantor: blankPersonDraft(),
    startDate: todayStr(), endDate: "", rentAmount: "", depositAmount: "", depositPaidDate: "",
    paymentDay: 1, renewalReminderDays: 30, status: "Aktif", notes: "", images: [],
  };
}

function blankWizardDraft() {
  return {
    id: uid(), mulkTipi: "", konutTuru: "",
    ad: "", il: "", ilce: "", mahalle: "", sokak: "", binaNo: "", kat: "", daireNo: "",
    brutM2: "", netM2: "", binaYasi: "", odaSayisi: "", banyoSayisi: "", binaKatSayisi: "", isinmaTipi: "",
    tasinmazNo: "", yuzolcum: "", tapuNiteligi: "", hisseli: "Hayır",
    satisFiyati: "", aidat: "", malikAdi: "", hisseOrani: "100",
    imageUrl: "", notes: "", documents: [],
  };
}

function nextPropertyCode(mulkTipi, properties) {
  const prefix = mulkTipi === "Konut" ? "A" : "B";
  const nums = properties
    .filter((p) => p.code && p.code.startsWith(prefix))
    .map((p) => parseInt(p.code.slice(1), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + pad2(next);
}

function Field({ label, children, span }) {
  return (
    <label className={"hy-field" + (span ? " span-2" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function IconBtn({ onClick, title, danger, children }) {
  return (
    <button type="button" className={"hy-icon-btn" + (danger ? " danger" : "")} onClick={onClick} title={title} aria-label={title}>
      {children}
    </button>
  );
}

function StatusPill({ status }) {
  const map = {
    "Kirada": "good", "Aktif": "good", "Ödendi": "good", "Tamamlandı": "good",
    "Boşta": "neutral", "Bekliyor": "neutral", "Açık": "neutral", "Sona Erdi": "neutral",
    "Kısmi": "warn", "Orta": "warn", "İşlemde": "warn",
    "Gecikti": "bad", "Feshedildi": "bad", "Yüksek": "bad",
    "Düşük": "neutral",
  };
  return <span className={"hy-pill-badge " + (map[status] || "neutral")}>{status}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="hy-modal-backdrop" onClick={onClose}>
      <div className={"hy-modal" + (wide ? " wide" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="hy-modal-head">
          <h3>{title}</h3>
          <button className="hy-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="hy-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [profile, setProfile] = useState({ name: "" });

  const [tab, setTab] = useState("ozet");

  useEffect(() => {
    let alive = true;
    (async () => {
      const load = async (key, setter, fallback) => {
        try {
          const res = await window.storage.get(key, false);
          if (alive) setter(res && res.value ? JSON.parse(res.value) : fallback);
        } catch (e) {
          if (alive) setter(fallback);
        }
      };
      await Promise.all([
        load(STORAGE_KEYS.properties, setProperties, []),
        load(STORAGE_KEYS.people, setPeople, []),
        load(STORAGE_KEYS.contracts, setContracts, []),
        load(STORAGE_KEYS.payments, setPayments, []),
        load(STORAGE_KEYS.expenses, setExpenses, []),
        load(STORAGE_KEYS.maintenance, setMaintenance, []),
        load(STORAGE_KEYS.profile, setProfile, { name: "" }),
      ]);
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const persist = async (key, value, setter) => {
    setter(value);
    try { await window.storage.set(key, JSON.stringify(value), false); }
    catch (e) { console.error("Kayıt hatası:", key, e); }
  };
  const upsert = (list, item) => {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) return [...list, item];
    const copy = [...list]; copy[idx] = item; return copy;
  };
  const removeById = (list, id) => list.filter((x) => x.id !== id);

  const saveProperty = (p) => persist(STORAGE_KEYS.properties, upsert(properties, p), setProperties);
  const deleteProperty = (id) => persist(STORAGE_KEYS.properties, removeById(properties, id), setProperties);
  const savePerson = (p) => persist(STORAGE_KEYS.people, upsert(people, p), setPeople);
  const saveContract = (c) => persist(STORAGE_KEYS.contracts, upsert(contracts, c), setContracts);
  const deleteContract = (id) => {
    persist(STORAGE_KEYS.contracts, removeById(contracts, id), setContracts);
    persist(STORAGE_KEYS.payments, payments.filter((p) => p.contractId !== id), setPayments);
  };
  const savePayment = (p) => persist(STORAGE_KEYS.payments, upsert(payments, p), setPayments);
  const savePayments = (list) => persist(STORAGE_KEYS.payments, list, setPayments);
  const saveExpense = (e) => persist(STORAGE_KEYS.expenses, upsert(expenses, e), setExpenses);
  const deleteExpense = (id) => persist(STORAGE_KEYS.expenses, removeById(expenses, id), setExpenses);
  const saveMaintenance = (m) => persist(STORAGE_KEYS.maintenance, upsert(maintenance, m), setMaintenance);
  const deleteMaintenance = (id) => persist(STORAGE_KEYS.maintenance, removeById(maintenance, id), setMaintenance);
  const saveProfile = (p) => persist(STORAGE_KEYS.profile, p, setProfile);

  const propertyDisplayName = (p) => (p ? `${p.code}${p.ad ? " · " + p.ad : ""}` : "—");
  const propertyName = (id) => propertyDisplayName(properties.find((x) => x.id === id));
  const personName = (id) => people.find((x) => x.id === id)?.name || "—";
  const personById = (id) => people.find((x) => x.id === id) || null;
  const contractOf = (id) => contracts.find((x) => x.id === id);
  const contractLabel = (id) => {
    const c = contractOf(id);
    if (!c) return "—";
    return propertyName(c.propertyId) + " · " + personName(c.tenantId);
  };
  const activeContractOf = (propertyId) => {
    const today = new Date();
    return contracts.find((c) => c.propertyId === propertyId && c.status === "Aktif" && new Date(c.startDate) <= today && (!c.endDate || new Date(c.endDate) >= today));
  };
  const propertyStatus = (propertyId) => (activeContractOf(propertyId) ? "Kirada" : "Boşta");

  const overdue = useMemo(() => payments.filter((p) => paymentStatus(p) === "Gecikti"), [payments]);
  const dueSoon = useMemo(() => payments.filter((p) => { const d = daysUntil(p.dueDate); return paymentStatus(p) === "Bekliyor" && d !== null && d >= 0 && d <= 7; }), [payments]);
  const expiringContracts = useMemo(() => contracts.filter((c) => { if (c.status !== "Aktif") return false; const d = daysUntil(c.endDate); const w = Number(c.renewalReminderDays) || 30; return d !== null && d >= 0 && d <= w; }), [contracts]);

  const overduePhones = useMemo(() => {
    const set = new Set();
    overdue.forEach((p) => { const c = contractOf(p.contractId); const t = c ? personById(c.tenantId) : null; if (t?.phone) set.add(t.phone); });
    return [...set];
  }, [overdue, contracts, people]);

  const thisMonthDue = useMemo(() => { const now = new Date(); return payments.filter((p) => { const d = new Date(p.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, p) => s + (Number(p.amount) || 0), 0); }, [payments]);
  const thisMonthCollected = useMemo(() => { const now = new Date(); return payments.filter((p) => p.paidDate && new Date(p.paidDate).getMonth() === now.getMonth() && new Date(p.paidDate).getFullYear() === now.getFullYear()).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0); }, [payments]);
  const thisMonthPaidOfDue = useMemo(() => { const now = new Date(); return payments.filter((p) => { const d = new Date(p.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && paymentStatus(p) === "Ödendi"; }).reduce((s, p) => s + (Number(p.amount) || 0), 0); }, [payments]);
  const thisMonthUnpaidOfDue = useMemo(() => { const now = new Date(); return payments.filter((p) => { const d = new Date(p.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && paymentStatus(p) !== "Ödendi"; }).reduce((s, p) => s + (Number(p.amount) || 0), 0); }, [payments]);
  const thisYearExpenseTotal = useMemo(() => { const y = new Date().getFullYear(); return expenses.filter((e) => e.date && new Date(e.date).getFullYear() === y).reduce((s, e) => s + (Number(e.amount) || 0), 0); }, [expenses]);

  const monthlyIncome = useMemo(() => {
    const arr = []; const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("tr-TR", { month: "short" });
      const total = payments.filter((p) => p.paidDate && new Date(p.paidDate).getMonth() === d.getMonth() && new Date(p.paidDate).getFullYear() === d.getFullYear()).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
      arr.push({ ay: label, tutar: total });
    }
    return arr;
  }, [payments]);

  const occupancy = useMemo(() => {
    const kirada = properties.filter((p) => propertyStatus(p.id) === "Kirada").length;
    const bosta = properties.length - kirada;
    return [{ name: "Kirada", value: kirada }, { name: "Boşta", value: bosta }];
  }, [properties, contracts]);

  const activityFeed = useMemo(() => {
    const items = [];
    payments.forEach((p) => { if (p.paidDate) items.push({ id: "pay-" + p.id, type: "odeme", date: p.paidDate, label: `Kira Ödemesi Alındı — ${propertyName(contractOf(p.contractId)?.propertyId)}`, amount: Number(p.paidAmount) || 0 }); });
    expenses.forEach((e) => { items.push({ id: "exp-" + e.id, type: "gider", date: e.date, label: `Gider: ${e.category} — ${propertyName(e.propertyId)}`, amount: -(Number(e.amount) || 0) }); });
    contracts.forEach((c) => { if (c.depositPaidDate) items.push({ id: "dep-" + c.id, type: "depozito", date: c.depositPaidDate, label: `Depozito Alındı — ${propertyName(c.propertyId)}`, amount: Number(c.depositAmount) || 0 }); });
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payments, expenses, contracts, properties]);

  const NAV = [
    { id: "ozet", label: "Özet", icon: Home },
    { id: "mulkler", label: "Mülklerim", icon: Building2 },
    { id: "kiracilar", label: "Kiracılarım", icon: Users },
    { id: "bakim", label: "Bakım & Onarım", icon: Wrench },
    { id: "muhasebe", label: "Ödemeler & Muhasebe", icon: Banknote },
    { id: "menu", label: "Menü", icon: MenuIcon },
  ];

  const goTab = (id) => {
    setTab(id);
    if (id === "mulkler") setSelectedPropertyId(null);
    if (id === "kiracilar") setSelectedTenantId(null);
  };

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyDetailTab, setPropertyDetailTab] = useState("detaylar");
  const [propertyViewMode, setPropertyViewMode] = useState("izgara");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("Tümü");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardDraft, setWizardDraft] = useState(null);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docDraft, setDocDraft] = useState({ name: "", url: "" });

  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState(null);
  const [imgDraft, setImgDraft] = useState({ url: "", caption: "" });

  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantDetailTab, setTenantDetailTab] = useState("borclar");
  const [tenantSubTab, setTenantSubTab] = useState("aktif");
  const [inviteModalFor, setInviteModalFor] = useState(null);
  const [extraDebtDraft, setExtraDebtDraft] = useState({ description: "", amount: "", date: todayStr() });
  const [tenantEditMode, setTenantEditMode] = useState(false);
  const [tenantEditDraft, setTenantEditDraft] = useState(null);

  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintForm, setMaintForm] = useState(null);
  const [maintStatusFilter, setMaintStatusFilter] = useState("Tümü");

  const [acctTab, setAcctTab] = useState("odemeler");
  const [quickPay, setQuickPay] = useState({ contractId: "", amount: "", date: todayStr(), note: "" });
  const [payFilter, setPayFilter] = useState("hepsi");
  const [expenseForm, setExpenseForm] = useState(null);
  const [bankText, setBankText] = useState("");
  const [bankRows, setBankRows] = useState([]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("tumu");
  const [confirmDelete, setConfirmDelete] = useState(null);

  function renderOzet() {
    const h = new Date().getHours();
    const base = h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
    const greet = profile.name ? `${base}, ${profile.name}` : `${base}!`;
    const notifCount = overdue.length + expiringContracts.length;
    const PIE_COLORS = ["#2E7D32", "#D1D5DB"];

    const filteredActivity = activityFeed.filter((a) => activityFilter === "tumu" || a.type === activityFilter).slice(0, 12);

    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">{greet}</h1>
            <p className="hy-page-sub">İşletmenizin genel durumuna hoş geldiniz.</p>
          </div>
          <div className="hy-bell-wrap">
            <button className="hy-bell" onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={20} />
              {notifCount > 0 && <span className="hy-notif-badge">{notifCount}</span>}
            </button>
            {notifOpen && (
              <div className="hy-notif-panel">
                {notifCount === 0 && <p className="hy-empty">Yeni bildirim yok.</p>}
                {overdue.map((p) => <div key={p.id} className="hy-notif-item bad">Gecikmiş ödeme: {contractLabel(p.contractId)}</div>)}
                {expiringContracts.map((c) => <div key={c.id} className="hy-notif-item warn">Sözleşme yenileme yaklaşıyor: {propertyName(c.propertyId)}</div>)}
              </div>
            )}
          </div>
        </div>

        <div className="hy-stat-grid">
          <div className="hy-stat-card">
            <span className="hy-stat-label">Gerçekleşen (Bu Ay)</span>
            <span className="hy-stat-value">{fmtMoney(thisMonthCollected)}</span>
          </div>
          <div className="hy-stat-card accent">
            <span className="hy-stat-label">Gelecek (Bu Ay)</span>
            <span className="hy-stat-value">{fmtMoney(thisMonthDue)}</span>
          </div>
          <div className="hy-stat-card good">
            <span className="hy-stat-label">Ödenen (Bu Ay)</span>
            <span className="hy-stat-value">{fmtMoney(thisMonthPaidOfDue)}</span>
          </div>
          <div className="hy-stat-card bad">
            <span className="hy-stat-label">Ödenmemiş (Bu Ay)</span>
            <span className="hy-stat-value">{fmtMoney(thisMonthUnpaidOfDue)}</span>
          </div>
        </div>

        <div className="hy-charts-grid">
          <div className="hy-chart-card">
            <h3>Mülk Dağılımı</h3>
            <div className="hy-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={occupancy} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {occupancy.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="hy-donut-center">{properties.length}<span>Toplam Mülk</span></div>
            </div>
          </div>
          <div className="hy-chart-card wide">
            <h3>Kira Ödemeleri (Son 6 Ay)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyIncome} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ay" tick={{ fontSize: 11, fill: "var(--text-soft)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-soft)" }} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="tutar" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hy-section-head">
          <h3>Hareket Akışı</h3>
          <div className="hy-filter-pills">
            {[["tumu", "Tümü"], ["odeme", "Ödemeler"], ["gider", "Giderler"], ["depozito", "Depozito"]].map(([k, l]) => (
              <button key={k} className={"hy-pill" + (activityFilter === k ? " active" : "")} onClick={() => setActivityFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        {overduePhones.length > 0 && (
          <a className="hy-btn danger sm" style={{ marginBottom: 12 }} href={`sms:${overduePhones.join(",")}?body=${encodeURIComponent("Sayin kiracimiz, kira odemenizde gecikme tespit edilmistir. En kisa surede odeme yapmanizi rica ederiz. - HasYek Kira Takip")}`}>
            <MessageCircle size={14} /> Gecikenlere Toplu Mesaj Gönder
          </a>
        )}
        {filteredActivity.length === 0 ? (
          <p className="hy-empty">Henüz bir hareket yok.</p>
        ) : (
          <div className="hy-activity-list">
            {filteredActivity.map((a) => (
              <div key={a.id} className="hy-activity-item">
                <div className={"hy-activity-icon " + a.type}>
                  {a.type === "odeme" ? <Wallet size={16} /> : a.type === "gider" ? <Receipt size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div className="hy-activity-info">
                  <span>{a.label}</span>
                  <span className="hy-activity-date">{fmtDate(a.date)}</span>
                </div>
                <span className={"hy-activity-amount " + (a.amount < 0 ? "neg" : "pos")}>{a.amount < 0 ? "-" : "+"}{fmtMoney(Math.abs(a.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function openWizard() {
    setWizardDraft(blankWizardDraft());
    setWizardStep(1);
    setWizardOpen(true);
  }
  function closeWizard() { setWizardOpen(false); setWizardDraft(null); setWizardStep(1); }

  function canProceedWizard() {
    const d = wizardDraft;
    if (!d) return false;
    if (wizardStep === 1) return !!d.mulkTipi;
    if (wizardStep === 2) return !!d.konutTuru;
    if (wizardStep === 3) return d.ad.trim() && d.il.trim() && d.ilce.trim();
    if (wizardStep === 6) return d.malikAdi.trim();
    return true;
  }

  function finishWizard() {
    const code = nextPropertyCode(wizardDraft.mulkTipi, properties);
    saveProperty({ ...wizardDraft, code, documents: [] });
    closeWizard();
  }

  function renderWizardStep() {
    const d = wizardDraft;
    const set = (patch) => setWizardDraft({ ...d, ...patch });

    if (wizardStep === 1) {
      return (
        <div className="hy-choice-grid">
          {[{ v: "Konut", icon: Home }, { v: "İş Yeri", icon: Store }].map((opt) => (
            <button key={opt.v} type="button" className={"hy-choice-card" + (d.mulkTipi === opt.v ? " selected" : "")} onClick={() => set({ mulkTipi: opt.v, konutTuru: "" })}>
              <opt.icon size={28} />
              <span>{opt.v}</span>
            </button>
          ))}
        </div>
      );
    }
    if (wizardStep === 2) {
      const list = d.mulkTipi === "Konut" ? KONUT_TURLERI : ISYERI_TURLERI;
      return (
        <div className="hy-choice-grid small">
          {list.map((t) => (
            <button key={t} type="button" className={"hy-choice-card" + (d.konutTuru === t ? " selected" : "")} onClick={() => set({ konutTuru: t })}>
              {d.mulkTipi === "Konut" ? <Home size={20} /> : <Store size={20} />}
              <span>{t}</span>
            </button>
          ))}
        </div>
      );
    }
    if (wizardStep === 3) {
      return (
        <div className="hy-form-grid">
          <Field label="Taşınmaz Numarası"><input value={d.tasinmazNo} onChange={(e) => set({ tasinmazNo: e.target.value })} /></Field>
          <Field label="Mülk Adı / Etiketi"><input value={d.ad} onChange={(e) => set({ ad: e.target.value })} placeholder="Örn. Heybeliada Dairesi" required /></Field>
          <Field label="İl"><input value={d.il} onChange={(e) => set({ il: e.target.value })} required /></Field>
          <Field label="İlçe"><input value={d.ilce} onChange={(e) => set({ ilce: e.target.value })} required /></Field>
          <Field label="Mahalle"><input value={d.mahalle} onChange={(e) => set({ mahalle: e.target.value })} /></Field>
          <Field label="Sokak / Cadde"><input value={d.sokak} onChange={(e) => set({ sokak: e.target.value })} /></Field>
          <Field label="Bina No"><input value={d.binaNo} onChange={(e) => set({ binaNo: e.target.value })} /></Field>
          <Field label="Kat"><input value={d.kat} onChange={(e) => set({ kat: e.target.value })} /></Field>
          <Field label="Daire / Kapı No"><input value={d.daireNo} onChange={(e) => set({ daireNo: e.target.value })} /></Field>
        </div>
      );
    }
    if (wizardStep === 4) {
      return (
        <div className="hy-form-grid">
          <Field label="Brüt m²"><input type="number" value={d.brutM2} onChange={(e) => set({ brutM2: e.target.value })} /></Field>
          <Field label="Net m²"><input type="number" value={d.netM2} onChange={(e) => set({ netM2: e.target.value })} /></Field>
          <Field label="Bina Yaşı">
            <select value={d.binaYasi} onChange={(e) => set({ binaYasi: e.target.value })}>
              <option value="">Seçin…</option>
              {BINA_YASI_ARALIKLARI.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Oda Sayısı"><input value={d.odaSayisi} onChange={(e) => set({ odaSayisi: e.target.value })} placeholder="Örn. 2+1" /></Field>
          <Field label="Banyo Sayısı"><input type="number" value={d.banyoSayisi} onChange={(e) => set({ banyoSayisi: e.target.value })} /></Field>
          <Field label="Bina Kat Sayısı"><input type="number" value={d.binaKatSayisi} onChange={(e) => set({ binaKatSayisi: e.target.value })} /></Field>
          <Field label="Isınma Tipi" span>
            <select value={d.isinmaTipi} onChange={(e) => set({ isinmaTipi: e.target.value })}>
              <option value="">Seçin…</option>
              {ISINMA_TIPLERI.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
      );
    }
    if (wizardStep === 5) {
      return (
        <div className="hy-form-grid">
          <Field label="Yüzölçümü (m²)"><input type="number" value={d.yuzolcum} onChange={(e) => set({ yuzolcum: e.target.value })} /></Field>
          <Field label="Tapu Niteliği">
            <select value={d.tapuNiteligi} onChange={(e) => set({ tapuNiteligi: e.target.value })}>
              <option value="">Seçin…</option>
              {TAPU_NITELIKLERI.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Hisseli mi?">
            <select value={d.hisseli} onChange={(e) => set({ hisseli: e.target.value })}>
              <option>Hayır</option><option>Evet</option>
            </select>
          </Field>
        </div>
      );
    }
    if (wizardStep === 6) {
      return (
        <>
          <div className="hy-form-grid">
            <Field label="Liste Satış Fiyatı (₺)"><input type="number" value={d.satisFiyati} onChange={(e) => set({ satisFiyati: e.target.value })} /></Field>
            <Field label="Aidat (₺)"><input type="number" value={d.aidat} onChange={(e) => set({ aidat: e.target.value })} /></Field>
            <Field label="Malik Adı Soyadı"><input value={d.malikAdi} onChange={(e) => set({ malikAdi: e.target.value })} required /></Field>
            <Field label="Hisse Oranı (%)"><input type="number" value={d.hisseOrani} onChange={(e) => set({ hisseOrani: e.target.value })} /></Field>
            <Field label="Görsel URL"><input value={d.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Notlar" span><textarea rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
          </div>
        </>
      );
    }
    return null;
  }

  const WIZARD_TITLES = ["Mülk Tipi", "Tür Seçimi", "Konum Bilgileri", "Yapı Bilgileri", "Tapu Bilgileri", "Finansal & Malik"];

  function renderPropertyWizard() {
    if (!wizardOpen || !wizardDraft) return null;
    return (
      <Modal title="Yeni Mülk Ekle" onClose={closeWizard} wide>
        <div className="hy-wizard-steps">
          {WIZARD_TITLES.map((t, i) => {
            const n = i + 1;
            return (
              <div key={t} className={"hy-wizard-step-dot" + (n === wizardStep ? " active" : n < wizardStep ? " done" : "")}>
                <span>{n < wizardStep ? <Check size={12} /> : n}</span>
                <label>{t}</label>
              </div>
            );
          })}
        </div>
        <div className="hy-wizard-body">{renderWizardStep()}</div>
        <div className="hy-modal-footer">
          <button type="button" className="hy-btn ghost" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => s - 1)}><ChevronLeft size={15} /> Geri</button>
          {wizardStep < 6 ? (
            <button type="button" className="hy-btn primary" disabled={!canProceedWizard()} onClick={() => setWizardStep((s) => s + 1)}>İleri <ChevronRight size={15} /></button>
          ) : (
            <button type="button" className="hy-btn primary" disabled={!canProceedWizard()} onClick={finishWizard}><Check size={15} /> Mülkü Kaydet</button>
          )}
        </div>
      </Modal>
    );
  }

  function renderPropertyCard(p) {
    const active = activeContractOf(p.id);
    const status = propertyStatus(p.id);
    const Icon = p.mulkTipi === "İş Yeri" ? Store : Home;
    const nextPay = active ? payments.filter((pm) => pm.contractId === active.id && paymentStatus(pm) !== "Ödendi").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] : null;
    return (
      <div key={p.id} className="hy-property-card" onClick={() => { setSelectedPropertyId(p.id); setPropertyDetailTab("detaylar"); }}>
        <div className="hy-property-img">
          {p.imageUrl ? <img src={p.imageUrl} alt={p.ad} /> : <Icon size={30} />}
          <span className={"hy-status-badge " + (status === "Kirada" ? "good" : "neutral")}>{status}</span>
        </div>
        <div className="hy-property-body">
          <div className="hy-property-title">{p.code} {p.ad && <span className="muted">· {p.ad}</span>}</div>
          <div className="hy-property-addr">{[p.mahalle, p.ilce, p.il].filter(Boolean).join(", ") || "Adres girilmedi"}</div>
          <div className="hy-property-meta">
            <span><strong>{active ? fmtMoney(active.rentAmount) : "—"}</strong> /ay</span>
            {active && <span>{personName(active.tenantId)}</span>}
          </div>
          <div className="hy-property-meta small">
            {nextPay && <span>Sıradaki ödeme: {fmtDate(nextPay.dueDate)}</span>}
            {active?.endDate && <span>Sözleşme bitişi: {fmtDate(active.endDate)}</span>}
          </div>
        </div>
      </div>
    );
  }

  function renderPropertiesList() {
    const filtered = properties.filter((p) => propertyStatusFilter === "Tümü" || propertyStatus(p.id) === propertyStatusFilter);
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Mülklerim</h1>
            <p className="hy-page-sub">{properties.length} kayıtlı mülk</p>
          </div>
          <div className="hy-toolbar-right">
            <select value={propertyStatusFilter} onChange={(e) => setPropertyStatusFilter(e.target.value)}>
              <option>Tümü</option><option>Kirada</option><option>Boşta</option>
            </select>
            <div className="hy-view-toggle">
              <button className={propertyViewMode === "izgara" ? "active" : ""} onClick={() => setPropertyViewMode("izgara")}><LayoutGrid size={15} /></button>
              <button className={propertyViewMode === "liste" ? "active" : ""} onClick={() => setPropertyViewMode("liste")}><ListIcon size={15} /></button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="hy-empty">Henüz mülk eklenmedi. Sağ alttaki "+" butonuyla ilk mülkünüzü ekleyin.</p>
        ) : (
          <div className={propertyViewMode === "izgara" ? "hy-property-grid" : "hy-property-list"}>
            {filtered.map(renderPropertyCard)}
          </div>
        )}

        <button className="hy-fab" onClick={openWizard} title="Mülk Ekle"><Plus size={22} /></button>
        {renderPropertyWizard()}
      </>
    );
  }

  function startContractCreate(propertyId) {
    setContractForm(blankContractDraft(propertyId));
    setContractModalOpen(true);
  }
  function startContractEdit(c) {
    const hydrate = (id) => { const p = personById(id); return p ? { id: p.id, name: p.name, tcNo: p.tcNo || "", phone: p.phone || "", address: p.address || "" } : blankPersonDraft(); };
    setContractForm({ ...c, images: c.images || [], landlord: hydrate(c.landlordId), tenant: hydrate(c.tenantId), guarantor: hydrate(c.guarantorId) });
    setContractModalOpen(true);
  }

  function personGroupFields(label, role, draft, setDraft) {
    const options = people.filter((p) => p.role === role);
    return (
      <div className="hy-person-group">
        <div className="hy-person-group-head">
          <span className="hy-field-label">{label}</span>
          <select value={draft.id || ""} onChange={(e) => { const pid = e.target.value; if (!pid) { setDraft(blankPersonDraft()); return; } const p = people.find((x) => x.id === pid); setDraft({ id: p.id, name: p.name, tcNo: p.tcNo || "", phone: p.phone || "", address: p.address || "" }); }}>
            <option value="">Yeni kişi girin…</option>
            {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="hy-form-grid">
          <Field label="Ad Soyad"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="TC Kimlik No"><input value={draft.tcNo} maxLength={11} onChange={(e) => setDraft({ ...draft, tcNo: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Telefon"><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="05xxxxxxxxx" /></Field>
          <Field label="Adres" span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
        </div>
      </div>
    );
  }

  function submitContract(e) {
    e.preventDefault();
    if (!contractForm.propertyId || !contractForm.tenant.name.trim() || !contractForm.landlord.name.trim() || !contractForm.rentAmount || !contractForm.startDate) return;
    const buildPerson = (draft, role) => { if (!draft.name.trim()) return null; return { id: draft.id || uid(), name: draft.name.trim(), role, tcNo: draft.tcNo || "", phone: draft.phone || "", email: "", address: draft.address || "", notes: "" }; };
    let updatedPeople = [...people];
    const landlordPerson = buildPerson(contractForm.landlord, "Kiraya Veren");
    if (landlordPerson) updatedPeople = upsert(updatedPeople, landlordPerson);
    const tenantPerson = buildPerson(contractForm.tenant, "Kiracı");
    if (tenantPerson) updatedPeople = upsert(updatedPeople, tenantPerson);
    const guarantorPerson = buildPerson(contractForm.guarantor, "Kefil");
    if (guarantorPerson) updatedPeople = upsert(updatedPeople, guarantorPerson);
    persist(STORAGE_KEYS.people, updatedPeople, setPeople);
    saveContract({
      id: contractForm.id, propertyId: contractForm.propertyId,
      landlordId: landlordPerson ? landlordPerson.id : "", tenantId: tenantPerson ? tenantPerson.id : "", guarantorId: guarantorPerson ? guarantorPerson.id : "",
      startDate: contractForm.startDate, endDate: contractForm.endDate, rentAmount: contractForm.rentAmount,
      depositAmount: contractForm.depositAmount, depositPaidDate: contractForm.depositPaidDate,
      paymentDay: contractForm.paymentDay, renewalReminderDays: contractForm.renewalReminderDays,
      status: contractForm.status, notes: contractForm.notes, images: contractForm.images || [],
    });
    setContractModalOpen(false);
    setContractForm(null);
  }

  function renderContractModal() {
    if (!contractModalOpen || !contractForm) return null;
    const addImage = () => { if (!imgDraft.url.trim()) return; setContractForm({ ...contractForm, images: [...(contractForm.images || []), { id: uid(), ...imgDraft }] }); setImgDraft({ url: "", caption: "" }); };
    const removeImage = (id) => setContractForm({ ...contractForm, images: contractForm.images.filter((i) => i.id !== id) });
    return (
      <Modal title="Kira Sözleşmesi" onClose={() => { setContractModalOpen(false); setContractForm(null); }} wide>
        <form onSubmit={submitContract}>
          <div className="hy-form-grid">
            <Field label="Mülk" span>
              <select value={contractForm.propertyId} onChange={(e) => setContractForm({ ...contractForm, propertyId: e.target.value })} required>
                <option value="">Seçin…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{propertyDisplayName(p)}</option>)}
              </select>
            </Field>
          </div>
          {personGroupFields("Kiraya Veren", "Kiraya Veren", contractForm.landlord, (v) => setContractForm({ ...contractForm, landlord: v }))}
          {personGroupFields("Kiracı", "Kiracı", contractForm.tenant, (v) => setContractForm({ ...contractForm, tenant: v }))}
          {personGroupFields("Kefil (opsiyonel)", "Kefil", contractForm.guarantor, (v) => setContractForm({ ...contractForm, guarantor: v }))}
          <div className="hy-form-grid" style={{ marginTop: 12 }}>
            <Field label="Durum"><select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}><option>Aktif</option><option>Sona Erdi</option><option>Feshedildi</option></select></Field>
            <Field label="Başlangıç"><input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} required /></Field>
            <Field label="Bitiş"><input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} /></Field>
            <Field label="Aylık Kira Bedeli (₺)"><input type="number" value={contractForm.rentAmount} onChange={(e) => setContractForm({ ...contractForm, rentAmount: e.target.value })} required /></Field>
            <Field label="Depozito Bedeli (₺)"><input type="number" value={contractForm.depositAmount} onChange={(e) => setContractForm({ ...contractForm, depositAmount: e.target.value })} /></Field>
            <Field label="Depozito Alınma Tarihi"><input type="date" value={contractForm.depositPaidDate} onChange={(e) => setContractForm({ ...contractForm, depositPaidDate: e.target.value })} /></Field>
            <Field label="Ödeme Günü"><input type="number" min="1" max="28" value={contractForm.paymentDay} onChange={(e) => setContractForm({ ...contractForm, paymentDay: e.target.value })} /></Field>
            <Field label="Bitişten kaç gün önce uyarılsın"><input type="number" value={contractForm.renewalReminderDays} onChange={(e) => setContractForm({ ...contractForm, renewalReminderDays: e.target.value })} /></Field>
            <Field label="Notlar" span><textarea rows={2} value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} /></Field>
          </div>
          <div className="hy-subsection">
            <span className="hy-field-label">Döneme ait görseller</span>
            <div className="hy-img-add-row">
              <input placeholder="Görsel URL" value={imgDraft.url} onChange={(e) => setImgDraft({ ...imgDraft, url: e.target.value })} />
              <input placeholder="Açıklama" value={imgDraft.caption} onChange={(e) => setImgDraft({ ...imgDraft, caption: e.target.value })} />
              <button type="button" className="hy-btn ghost sm" onClick={addImage}><ImagePlus size={13} /> Ekle</button>
            </div>
            {contractForm.images?.length > 0 && (
              <div className="hy-img-strip">
                {contractForm.images.map((im) => (
                  <div className="hy-img-chip" key={im.id}><img src={im.url} alt="" /><span>{im.caption}</span><button type="button" onClick={() => removeImage(im.id)}><X size={11} /></button></div>
                ))}
              </div>
            )}
          </div>
          <div className="hy-modal-footer">
            <button type="button" className="hy-btn ghost" onClick={() => { setContractModalOpen(false); setContractForm(null); }}>Vazgeç</button>
            <button type="submit" className="hy-btn primary"><Check size={15} /> Kaydet</button>
          </div>
        </form>
      </Modal>
    );
  }

  function renderPropertyDetail() {
    const p = properties.find((x) => x.id === selectedPropertyId);
    if (!p) { setSelectedPropertyId(null); return null; }
    const propContracts = contracts.filter((c) => c.propertyId === p.id).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const propRequests = maintenance.filter((m) => m.propertyId === p.id);

    const addDoc = () => {
      if (!docDraft.name.trim() || !docDraft.url.trim()) return;
      saveProperty({ ...p, documents: [...(p.documents || []), { id: uid(), ...docDraft }] });
      setDocDraft({ name: "", url: "" }); setDocModalOpen(false);
    };
    const removeDoc = (id) => saveProperty({ ...p, documents: (p.documents || []).filter((d) => d.id !== id) });

    return (
      <>
        <button className="hy-back-link" onClick={() => setSelectedPropertyId(null)}><ArrowLeft size={15} /> Mülklerime Dön</button>
        <div className="hy-detail-header">
          <div className="hy-detail-img">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : (p.mulkTipi === "İş Yeri" ? <Store size={34} /> : <Home size={34} />)}</div>
          <div>
            <h1 className="hy-page-title">{p.code} {p.ad && <span className="muted">· {p.ad}</span>}</h1>
            <p className="hy-page-sub">{[p.mahalle, p.sokak, p.ilce, p.il].filter(Boolean).join(", ") || "Adres girilmedi"}</p>
            <StatusPill status={propertyStatus(p.id)} />
          </div>
        </div>

        <div className="hy-tabs2">
          {[["detaylar", "Mülk Detayları"], ["sozlesme", "Kira Sözleşmesi"], ["belgeler", "Belgeler"], ["talepler", "Talepler"]].map(([k, l]) => (
            <button key={k} className={"hy-tab2" + (propertyDetailTab === k ? " active" : "")} onClick={() => setPropertyDetailTab(k)}>{l}</button>
          ))}
        </div>

        {propertyDetailTab === "detaylar" && (
          <div className="hy-detail-grid">
            <div className="hy-detail-card">
              <h4>Genel</h4>
              <dl><dt>Mülk Tipi</dt><dd>{p.mulkTipi || "—"}</dd><dt>Tür</dt><dd>{p.konutTuru || "—"}</dd><dt>Taşınmaz No</dt><dd>{p.tasinmazNo || "—"}</dd></dl>
            </div>
            <div className="hy-detail-card">
              <h4>Yapı Bilgileri</h4>
              <dl><dt>Brüt / Net m²</dt><dd>{p.brutM2 || "—"} / {p.netM2 || "—"}</dd><dt>Bina Yaşı</dt><dd>{p.binaYasi || "—"}</dd><dt>Oda Sayısı</dt><dd>{p.odaSayisi || "—"}</dd><dt>Banyo Sayısı</dt><dd>{p.banyoSayisi || "—"}</dd><dt>Bina Kat Sayısı</dt><dd>{p.binaKatSayisi || "—"}</dd><dt>Isınma Tipi</dt><dd>{p.isinmaTipi || "—"}</dd></dl>
            </div>
            <div className="hy-detail-card">
              <h4>Tapu Bilgileri</h4>
              <dl><dt>Yüzölçümü</dt><dd>{p.yuzolcum ? p.yuzolcum + " m²" : "—"}</dd><dt>Tapu Niteliği</dt><dd>{p.tapuNiteligi || "—"}</dd><dt>Hisseli mi?</dt><dd>{p.hisseli || "—"}</dd></dl>
            </div>
            <div className="hy-detail-card">
              <h4>Finansal & Malik Bilgileri</h4>
              <dl><dt>Liste Satış Fiyatı</dt><dd>{p.satisFiyati ? fmtMoney(p.satisFiyati) : "—"}</dd><dt>Aidat</dt><dd>{p.aidat ? fmtMoney(p.aidat) : "—"}</dd><dt>Malik</dt><dd>{p.malikAdi || "—"}</dd><dt>Hisse Oranı</dt><dd>%{p.hisseOrani || "—"}</dd></dl>
            </div>
            {p.notes && <div className="hy-detail-card span-2"><h4>Notlar</h4><p>{p.notes}</p></div>}
          </div>
        )}

        {propertyDetailTab === "sozlesme" && (
          <>
            <div className="hy-section-head"><h3>Kira Sözleşmeleri</h3><button className="hy-btn primary sm" onClick={() => startContractCreate(p.id)}><Plus size={14} /> Yeni Sözleşme</button></div>
            {propContracts.length === 0 ? <p className="hy-empty">Bu mülk için sözleşme kaydı yok.</p> : propContracts.map((c) => {
              const cPayments = payments.filter((pm) => pm.contractId === c.id).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
              return (
                <div className="hy-contract-card" key={c.id}>
                  <div className="hy-contract-head">
                    <div><strong>{personName(c.tenantId)}</strong> <span className="muted">(Kiracı)</span> — Kiraya Veren: {personName(c.landlordId)}{c.guarantorId && <> — Kefil: {personName(c.guarantorId)}</>}</div>
                    <StatusPill status={c.status} />
                  </div>
                  <div className="hy-contract-meta">
                    <span>{fmtDate(c.startDate)} – {fmtDate(c.endDate) || "Süresiz"}</span>
                    <span>Kira: <strong>{fmtMoney(c.rentAmount)}</strong></span>
                    <span>Depozito: {fmtMoney(c.depositAmount)}{c.depositPaidDate && ` (Alındı: ${fmtDate(c.depositPaidDate)})`}</span>
                    <div className="hy-row-actions">
                      <button className="hy-btn ghost sm" onClick={() => { const plan = generatePaymentPlan(c); if (plan.length) savePayments([...payments, ...plan]); }}>Ödeme Planı Oluştur</button>
                      <IconBtn title="Düzenle" onClick={() => startContractEdit(c)}><Pencil size={14} /></IconBtn>
                      {confirmDelete?.type === "contract" && confirmDelete.id === c.id ? (
                        <><button className="hy-btn danger sm" onClick={() => { deleteContract(c.id); setConfirmDelete(null); }}>Sil</button><button className="hy-btn ghost sm" onClick={() => setConfirmDelete(null)}>Vazgeç</button></>
                      ) : (
                        <IconBtn title="Sil" danger onClick={() => setConfirmDelete({ type: "contract", id: c.id })}><Trash2 size={14} /></IconBtn>
                      )}
                    </div>
                  </div>
                  {cPayments.length > 0 && (
                    <table className="hy-table sm">
                      <thead><tr><th>Vade</th><th className="num">Tutar</th><th className="num">Ödenen</th><th>Durum</th></tr></thead>
                      <tbody>{cPayments.map((pm) => (
                        <tr key={pm.id}><td>{fmtDate(pm.dueDate)}</td><td className="num">{fmtMoney(pm.amount)}</td><td className="num">{pm.paidAmount ? fmtMoney(pm.paidAmount) : "—"}</td><td><StatusPill status={paymentStatus(pm)} /></td></tr>
                      ))}</tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </>
        )}

        {propertyDetailTab === "belgeler" && (
          <>
            <div className="hy-section-head"><h3>Belgeler</h3><button className="hy-btn primary sm" onClick={() => setDocModalOpen(true)}><Plus size={14} /> Belge Ekle</button></div>
            {(!p.documents || p.documents.length === 0) ? <p className="hy-empty">Henüz belge eklenmedi.</p> : (
              <div className="hy-doc-list">
                {p.documents.map((doc) => (
                  <div className="hy-doc-item" key={doc.id}>
                    <FileText size={16} />
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
                    <IconBtn title="Sil" danger onClick={() => removeDoc(doc.id)}><Trash2 size={13} /></IconBtn>
                  </div>
                ))}
              </div>
            )}
            {docModalOpen && (
              <Modal title="Belge Ekle" onClose={() => setDocModalOpen(false)}>
                <div className="hy-form-grid">
                  <Field label="Belge Adı"><input value={docDraft.name} onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })} /></Field>
                  <Field label="Belge URL"><input value={docDraft.url} onChange={(e) => setDocDraft({ ...docDraft, url: e.target.value })} placeholder="https://…" /></Field>
                </div>
                <div className="hy-modal-footer"><button className="hy-btn ghost" onClick={() => setDocModalOpen(false)}>Vazgeç</button><button className="hy-btn primary" onClick={addDoc}><Check size={14} /> Ekle</button></div>
              </Modal>
            )}
          </>
        )}

        {propertyDetailTab === "talepler" && (
          <>
            <div className="hy-section-head"><h3>Bakım & Onarım Talepleri</h3><button className="hy-btn primary sm" onClick={() => { setMaintForm({ id: uid(), propertyId: p.id, category: "", description: "", priority: "Orta", status: "Açık", date: todayStr() }); setMaintModalOpen(true); }}><Plus size={14} /> Talep Oluştur</button></div>
            {propRequests.length === 0 ? <p className="hy-empty">Bu mülk için talep yok.</p> : (
              <table className="hy-table">
                <thead><tr><th>Kategori</th><th>Açıklama</th><th>Öncelik</th><th>Durum</th><th>Tarih</th></tr></thead>
                <tbody>{propRequests.map((m) => (
                  <tr key={m.id}><td>{m.category}</td><td className="muted">{m.description || "—"}</td><td><StatusPill status={m.priority} /></td><td><StatusPill status={m.status} /></td><td>{fmtDate(m.date)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </>
        )}
      </>
    );
  }

  function tenantDebt(tenantId, kindFilter) {
    const tenantContracts = contracts.filter((c) => c.tenantId === tenantId).map((c) => c.id);
    return payments.filter((p) => tenantContracts.includes(p.contractId) && paymentStatus(p) !== "Ödendi" && (!kindFilter || (p.kind || "kira") === kindFilter))
      .reduce((s, p) => s + (Number(p.amount) - (Number(p.paidAmount) || 0)), 0);
  }
  function tenantActiveContract(tenantId) { return contracts.find((c) => c.tenantId === tenantId && c.status === "Aktif"); }

  function renderTenantCard(t) {
    const c = tenantActiveContract(t.id) || contracts.find((x) => x.tenantId === t.id);
    const debt = tenantDebt(t.id);
    return (
      <div className="hy-tenant-card" key={t.id} onClick={() => { setSelectedTenantId(t.id); setTenantDetailTab("borclar"); }}>
        <div className="hy-avatar">{initials(t.name)}</div>
        <div className="hy-tenant-info">
          <strong>{t.name}</strong>
          <span className="muted">{c ? propertyName(c.propertyId) : "Mülk yok"}</span>
          <span className="muted small">{c ? `${fmtDate(c.startDate)} – ${fmtDate(c.endDate) || "Süresiz"}` : ""}</span>
        </div>
        <div className="hy-tenant-figures">
          <span>{c ? fmtMoney(c.rentAmount) : "—"} /ay</span>
          <span className={debt > 0 ? "hy-text-bad" : "hy-text-good"}>{debt > 0 ? "Borç: " + fmtMoney(debt) : "Borcu yok"}</span>
        </div>
      </div>
    );
  }

  function renderTenantsList() {
    const tenants = people.filter((p) => p.role === "Kiracı");
    const active = tenants.filter((t) => tenantActiveContract(t.id));
    const past = tenants.filter((t) => !tenantActiveContract(t.id));
    const list = tenantSubTab === "aktif" ? active : past;
    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Kiracılarım</h1><p className="hy-page-sub">{tenants.length} kayıtlı kiracı</p></div>
        </div>
        <div className="hy-tabs2">
          <button className={"hy-tab2" + (tenantSubTab === "aktif" ? " active" : "")} onClick={() => setTenantSubTab("aktif")}>Aktif Kiracılar ({active.length})</button>
          <button className={"hy-tab2" + (tenantSubTab === "eski" ? " active" : "")} onClick={() => setTenantSubTab("eski")}>Eski Kiracılar ({past.length})</button>
        </div>
        {list.length === 0 ? <p className="hy-empty">Kayıt yok.</p> : <div className="hy-tenant-list">{list.map(renderTenantCard)}</div>}
      </>
    );
  }

  function renderInviteModal() {
    const t = people.find((x) => x.id === inviteModalFor);
    if (!t) return null;
    const code = t.inviteCode || uid().slice(0, 8);
    if (!t.inviteCode) savePerson({ ...t, inviteCode: code });
    const link = `https://app.hasyek.com/tenant/start?invitation=${code}`;
    const copy = async () => { try { await navigator.clipboard.writeText(link); } catch (e) {} };
    return (
      <Modal title="HasYek'e Davet Et" onClose={() => setInviteModalFor(null)}>
        <p className="muted small" style={{ marginBottom: 10 }}>{t.name} adlı kiracınız bu bağlantı ile HasYek uygulamasına kayıt olup sözleşme ve ödeme bilgilerini görebilir.</p>
        <div className="hy-invite-link">{link}</div>
        <div className="hy-modal-footer">
          <button className="hy-btn ghost" onClick={copy}><Copy size={14} /> Kopyala</button>
          <a className="hy-btn primary" href={`mailto:${t.email || ""}?subject=${encodeURIComponent("HasYek Kira Takip Daveti")}&body=${encodeURIComponent("Merhaba " + t.name + ", HasYek uygulamasına katılmak için: " + link)}`}><Mail size={14} /> E-posta ile Gönder</a>
        </div>
      </Modal>
    );
  }

  function renderTenantDetail() {
    const t = people.find((x) => x.id === selectedTenantId);
    if (!t) { setSelectedTenantId(null); return null; }
    const c = tenantActiveContract(t.id) || contracts.find((x) => x.tenantId === t.id);
    const kiraDebt = tenantDebt(t.id, "kira");
    const ekDebt = tenantDebt(t.id, "ek");
    const totalDebt = kiraDebt + ekDebt;
    const kalan = c?.endDate ? Math.max(0, Math.round((daysUntil(c.endDate) || 0) / 30)) + " ay" : "Süresiz";

    const tenantContracts = contracts.filter((x) => x.tenantId === t.id).map((x) => x.id);
    const unpaidPayments = payments.filter((p) => tenantContracts.includes(p.contractId) && paymentStatus(p) !== "Ödendi").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const markPaid = (p) => savePayment({ ...p, paidAmount: p.amount, paidDate: todayStr() });
    const addExtraDebt = () => {
      if (!c || !extraDebtDraft.amount) return;
      savePayment({ id: uid(), contractId: c.id, dueDate: extraDebtDraft.date, amount: extraDebtDraft.amount, paidAmount: "", paidDate: "", bankRef: "", kind: "ek", description: extraDebtDraft.description });
      setExtraDebtDraft({ description: "", amount: "", date: todayStr() });
    };

    const startEditTenant = () => { setTenantEditDraft({ phone: t.phone || "", email: t.email || "", tcNo: t.tcNo || "", address: t.address || "" }); setTenantEditMode(true); };
    const saveEditTenant = () => { savePerson({ ...t, ...tenantEditDraft }); setTenantEditMode(false); };

    return (
      <>
        <button className="hy-back-link" onClick={() => setSelectedTenantId(null)}><ArrowLeft size={15} /> Kiracılarıma Dön</button>
        <div className="hy-detail-header">
          <div className="hy-avatar lg">{initials(t.name)}</div>
          <div>
            <h1 className="hy-page-title">{t.name}</h1>
            <p className="hy-page-sub">{c ? propertyName(c.propertyId) : "Aktif sözleşme yok"}</p>
          </div>
          <button className="hy-btn primary sm" style={{ marginLeft: "auto" }} onClick={() => setInviteModalFor(t.id)}><UserPlus size={14} /> HasYek'e Davet Et</button>
        </div>

        <div className="hy-stat-grid">
          <div className="hy-stat-card bad"><span className="hy-stat-label">Toplam Borç</span><span className="hy-stat-value">{fmtMoney(totalDebt)}</span></div>
          <div className="hy-stat-card"><span className="hy-stat-label">Kira Borcu</span><span className="hy-stat-value">{fmtMoney(kiraDebt)}</span></div>
          <div className="hy-stat-card good"><span className="hy-stat-label">Güncel Kira Bedeli</span><span className="hy-stat-value">{c ? fmtMoney(c.rentAmount) : "—"}</span></div>
          <div className="hy-stat-card accent"><span className="hy-stat-label">Sözleşme Bitişine Kalan</span><span className="hy-stat-value">{c ? kalan : "—"}</span></div>
        </div>

        <div className="hy-tabs2">
          {[["borclar", "Borçlar"], ["notlar", "Notlar"], ["bilgiler", "Kiracı Bilgileri"]].map(([k, l]) => (
            <button key={k} className={"hy-tab2" + (tenantDetailTab === k ? " active" : "")} onClick={() => setTenantDetailTab(k)}>{l}</button>
          ))}
        </div>

        {tenantDetailTab === "borclar" && (
          <>
            {unpaidPayments.length === 0 ? <p className="hy-empty">Açık borç yok.</p> : (
              <table className="hy-table">
                <thead><tr><th>Açıklama</th><th>Vade</th><th className="num">Tutar</th><th>Durum</th><th></th></tr></thead>
                <tbody>{unpaidPayments.map((p) => (
                  <tr key={p.id}><td>{p.kind === "ek" ? (p.description || "Ek Borç") : "Kira Ödemesi"}</td><td>{fmtDate(p.dueDate)}</td><td className="num">{fmtMoney(p.amount)}</td><td><StatusPill status={paymentStatus(p)} /></td><td><button className="hy-btn ghost sm" onClick={() => markPaid(p)}>Ödendi İşaretle</button></td></tr>
                ))}</tbody>
              </table>
            )}
            <div className="hy-subsection">
              <span className="hy-field-label">Ek Borç Ekle</span>
              <div className="hy-form-grid">
                <Field label="Açıklama"><input value={extraDebtDraft.description} onChange={(e) => setExtraDebtDraft({ ...extraDebtDraft, description: e.target.value })} placeholder="Örn. Cam kırığı onarımı" /></Field>
                <Field label="Tutar (₺)"><input type="number" value={extraDebtDraft.amount} onChange={(e) => setExtraDebtDraft({ ...extraDebtDraft, amount: e.target.value })} /></Field>
                <Field label="Tarih"><input type="date" value={extraDebtDraft.date} onChange={(e) => setExtraDebtDraft({ ...extraDebtDraft, date: e.target.value })} /></Field>
              </div>
              <button className="hy-btn primary sm" disabled={!c} onClick={addExtraDebt}><Plus size={14} /> Ekle</button>
              {!c && <p className="muted small" style={{ marginTop: 6 }}>Ek borç eklemek için aktif bir sözleşme gerekir.</p>}
            </div>
          </>
        )}

        {tenantDetailTab === "notlar" && (
          <div className="hy-form-grid">
            <Field label="Notlar" span><textarea rows={5} defaultValue={t.notes} onBlur={(e) => savePerson({ ...t, notes: e.target.value })} /></Field>
            <p className="muted small">Not alandan çıkınca otomatik kaydedilir.</p>
          </div>
        )}

        {tenantDetailTab === "bilgiler" && (
          <div className="hy-detail-grid">
            <div className="hy-detail-card">
              <h4>Sözleşme Özeti</h4>
              <dl><dt>Mülk</dt><dd>{c ? propertyName(c.propertyId) : "—"}</dd><dt>Tarih Aralığı</dt><dd>{c ? `${fmtDate(c.startDate)} – ${fmtDate(c.endDate) || "Süresiz"}` : "—"}</dd><dt>Ödeme Günü</dt><dd>{c ? "Ayın " + c.paymentDay + "." : "—"}</dd></dl>
            </div>
            <div className="hy-detail-card">
              <div className="hy-section-head" style={{ marginBottom: 8 }}><h4 style={{ margin: 0 }}>İletişim Bilgileri</h4>{!tenantEditMode && <IconBtn title="Düzenle" onClick={startEditTenant}><Pencil size={14} /></IconBtn>}</div>
              {tenantEditMode ? (
                <>
                  <div className="hy-form-grid">
                    <Field label="Telefon"><input value={tenantEditDraft.phone} onChange={(e) => setTenantEditDraft({ ...tenantEditDraft, phone: e.target.value })} /></Field>
                    <Field label="E-posta"><input value={tenantEditDraft.email} onChange={(e) => setTenantEditDraft({ ...tenantEditDraft, email: e.target.value })} /></Field>
                    <Field label="TC Kimlik No"><input value={tenantEditDraft.tcNo} maxLength={11} onChange={(e) => setTenantEditDraft({ ...tenantEditDraft, tcNo: e.target.value.replace(/\D/g, "") })} /></Field>
                    <Field label="Adres" span><input value={tenantEditDraft.address} onChange={(e) => setTenantEditDraft({ ...tenantEditDraft, address: e.target.value })} /></Field>
                  </div>
                  <div className="hy-modal-footer" style={{ padding: 0, marginTop: 10 }}><button className="hy-btn ghost sm" onClick={() => setTenantEditMode(false)}>Vazgeç</button><button className="hy-btn primary sm" onClick={saveEditTenant}><Check size={13} /> Kaydet</button></div>
                </>
              ) : (
                <dl><dt>Telefon</dt><dd>{t.phone || "—"}</dd><dt>E-posta</dt><dd>{t.email || "—"}</dd><dt>TC Kimlik No</dt><dd>{t.tcNo || "—"}</dd><dt>Adres</dt><dd>{t.address || "—"}</dd></dl>
              )}
            </div>
          </div>
        )}

        {inviteModalFor && renderInviteModal()}
      </>
    );
  }

  function submitMaintenance(e) {
    e.preventDefault();
    if (!maintForm.propertyId || !maintForm.category) return;
    saveMaintenance(maintForm);
    setMaintModalOpen(false); setMaintForm(null);
  }

  function renderMaintenanceModal() {
    if (!maintModalOpen || !maintForm) return null;
    return (
      <Modal title="Bakım / Onarım Talebi" onClose={() => { setMaintModalOpen(false); setMaintForm(null); }}>
        <form onSubmit={submitMaintenance}>
          <div className="hy-form-grid">
            <Field label="Mülk" span>
              <select value={maintForm.propertyId} onChange={(e) => setMaintForm({ ...maintForm, propertyId: e.target.value })} required>
                <option value="">Seçin…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{propertyDisplayName(p)}</option>)}
              </select>
            </Field>
            <Field label="Kategori">
              <select value={maintForm.category} onChange={(e) => setMaintForm({ ...maintForm, category: e.target.value })} required>
                <option value="">Seçin…</option>
                {MAINTENANCE_CATEGORIES.map((c) => <option key={c.label}>{c.label}</option>)}
                <option>Diğer</option>
              </select>
            </Field>
            <Field label="Öncelik"><select value={maintForm.priority} onChange={(e) => setMaintForm({ ...maintForm, priority: e.target.value })}><option>Düşük</option><option>Orta</option><option>Yüksek</option></select></Field>
            <Field label="Durum"><select value={maintForm.status} onChange={(e) => setMaintForm({ ...maintForm, status: e.target.value })}><option>Açık</option><option>İşlemde</option><option>Tamamlandı</option></select></Field>
            <Field label="Açıklama" span><textarea rows={3} value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} /></Field>
          </div>
          <div className="hy-modal-footer"><button type="button" className="hy-btn ghost" onClick={() => { setMaintModalOpen(false); setMaintForm(null); }}>Vazgeç</button><button type="submit" className="hy-btn primary"><Check size={14} /> Talebi Oluştur</button></div>
        </form>
      </Modal>
    );
  }

  function renderBakim() {
    const filtered = maintenance.filter((m) => maintStatusFilter === "Tümü" || m.status === maintStatusFilter).sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      <>
        <div className="hy-topbar"><div><h1 className="hy-page-title">Bakım & Onarım</h1><p className="hy-page-sub">{maintenance.length} talep kaydı</p></div></div>
        <div className="hy-category-grid">
          {MAINTENANCE_CATEGORIES.map((c) => (
            <button key={c.label} className="hy-category-btn" onClick={() => { setMaintForm({ id: uid(), propertyId: properties[0]?.id || "", category: c.label, description: "", priority: "Orta", status: "Açık", date: todayStr() }); setMaintModalOpen(true); }}>
              <c.icon size={22} /><span>{c.label}</span>
            </button>
          ))}
        </div>
        <div className="hy-section-head">
          <h3>Talepler</h3>
          <div className="hy-toolbar-right">
            <select value={maintStatusFilter} onChange={(e) => setMaintStatusFilter(e.target.value)}><option>Tümü</option><option>Açık</option><option>İşlemde</option><option>Tamamlandı</option></select>
            <button className="hy-btn primary sm" onClick={() => { setMaintForm({ id: uid(), propertyId: properties[0]?.id || "", category: "", description: "", priority: "Orta", status: "Açık", date: todayStr() }); setMaintModalOpen(true); }}><Plus size={14} /> Talep Oluştur</button>
          </div>
        </div>
        {filtered.length === 0 ? <p className="hy-empty">Kayıt yok.</p> : (
          <table className="hy-table">
            <thead><tr><th>Mülk</th><th>Kategori</th><th>Açıklama</th><th>Öncelik</th><th>Durum</th><th>Tarih</th><th></th></tr></thead>
            <tbody>{filtered.map((m) => (
              <tr key={m.id}>
                <td>{propertyName(m.propertyId)}</td><td>{m.category}</td><td className="muted">{m.description || "—"}</td>
                <td><StatusPill status={m.priority} /></td>
                <td><select value={m.status} onChange={(e) => saveMaintenance({ ...m, status: e.target.value })}><option>Açık</option><option>İşlemde</option><option>Tamamlandı</option></select></td>
                <td>{fmtDate(m.date)}</td>
                <td><IconBtn title="Sil" danger onClick={() => deleteMaintenance(m.id)}><Trash2 size={13} /></IconBtn></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {renderMaintenanceModal()}
      </>
    );
  }

  function renderOdemelerTab() {
    const receivePayment = (e) => {
      e.preventDefault();
      const { contractId, amount, date, note } = quickPay;
      if (!contractId || !amount) return;
      const openList = payments.filter((p) => p.contractId === contractId && paymentStatus(p) !== "Ödendi").sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (openList.length > 0) savePayment({ ...openList[0], paidAmount: amount, paidDate: date, bankRef: note });
      else savePayment({ id: uid(), contractId, dueDate: date, amount, paidAmount: amount, paidDate: date, bankRef: note, kind: "kira", description: "" });
      setQuickPay({ contractId: "", amount: "", date: todayStr(), note: "" });
    };
    const filtered = payments.filter((p) => (payFilter === "hepsi" ? true : paymentStatus(p) === payFilter));
    const sorted = [...filtered].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return (
      <>
        <h3 className="hy-h3">Ödeme Al</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>Banka bildirimi ya da elden alınan ödemeyi işleyin — en eski açık vadeye otomatik uygulanır.</p>
        {contracts.length === 0 ? <p className="hy-empty">Önce bir sözleşme eklemelisiniz.</p> : (
          <form className="hy-panel" onSubmit={receivePayment}>
            <div className="hy-form-grid">
              <Field label="Kiracı / Mülk" span>
                <select value={quickPay.contractId} onChange={(e) => setQuickPay({ ...quickPay, contractId: e.target.value })} required>
                  <option value="">Seçin…</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{contractLabel(c.id)}</option>)}
                </select>
              </Field>
              <Field label="Tutar (₺)"><input type="number" value={quickPay.amount} onChange={(e) => setQuickPay({ ...quickPay, amount: e.target.value })} required /></Field>
              <Field label="Tarih"><input type="date" value={quickPay.date} onChange={(e) => setQuickPay({ ...quickPay, date: e.target.value })} required /></Field>
              <Field label="Açıklama (ops.)" span><input value={quickPay.note} onChange={(e) => setQuickPay({ ...quickPay, note: e.target.value })} placeholder="Örn. Banka: Ahmet YILMAZ - EFT" /></Field>
            </div>
            <div className="hy-modal-footer" style={{ padding: 0, marginTop: 10 }}><button type="submit" className="hy-btn primary"><Check size={14} /> Ödemeyi Kaydet</button></div>
          </form>
        )}
        <div className="hy-section-head">
          <h3>Ödeme Kayıtları</h3>
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)}><option value="hepsi">Hepsi</option><option value="Bekliyor">Bekliyor</option><option value="Gecikti">Gecikti</option><option value="Kısmi">Kısmi</option><option value="Ödendi">Ödendi</option></select>
        </div>
        {sorted.length === 0 ? <p className="hy-empty">Kayıt yok.</p> : (
          <table className="hy-table">
            <thead><tr><th>Sözleşme</th><th>Vade</th><th className="num">Tutar</th><th className="num">Ödenen</th><th>Durum</th></tr></thead>
            <tbody>{sorted.map((p) => (<tr key={p.id}><td>{contractLabel(p.contractId)}</td><td>{fmtDate(p.dueDate)}</td><td className="num">{fmtMoney(p.amount)}</td><td className="num">{p.paidAmount ? fmtMoney(p.paidAmount) : "—"}</td><td><StatusPill status={paymentStatus(p)} /></td></tr>))}</tbody>
          </table>
        )}
      </>
    );
  }

  function renderGiderlerTab() {
    const startAdd = () => setExpenseForm({ id: uid(), propertyId: properties[0]?.id || "", date: todayStr(), category: EXPENSE_CATEGORIES[0], amount: "", description: "" });
    const submit = (e) => { e.preventDefault(); if (!expenseForm.propertyId || !expenseForm.amount) return; saveExpense(expenseForm); setExpenseForm(null); };
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const y = new Date().getFullYear(); 
    const map = {};
    EXPENSE_CATEGORIES.forEach((c) => (map[c] = 0));
    expenses.forEach((e) => { 
      if (e.date && new Date(e.date).getFullYear() === y) 
        map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0); 
    });
    const byCategory = Object.entries(map).filter(([, v]) => v > 0).map(([name, tutar]) => ({ name, tutar }));

    return (
      <>
        <div className="hy-section-head"><h3>Yıllık Giderler</h3>{!expenseForm && properties.length > 0 && <button className="hy-btn primary sm" onClick={startAdd}><Plus size={14} /> Gider Ekle</button>}</div>
        {properties.length === 0 && <p className="hy-empty">Önce bir mülk eklemelisiniz.</p>}
        {byCategory.length > 0 && (
          <div className="hy-chart-card" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCategory} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-soft)" }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-soft)" }} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="tutar" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {expenseForm && (
          <form className="hy-panel" onSubmit={submit}>
            <div className="hy-form-grid">
              <Field label="Mülk"><select value={expenseForm.propertyId} onChange={(e) => setExpenseForm({ ...expenseForm, propertyId: e.target.value })} required>{properties.map((p) => <option key={p.id} value={p.id}>{propertyDisplayName(p)}</option>)}</select></Field>
              <Field label="Tarih"><input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required /></Field>
              <Field label="Kategori"><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Tutar (₺)"><input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></Field>
              <Field label="Açıklama" span><input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></Field>
            </div>
            <div className="hy-modal-footer" style={{ padding: 0, marginTop: 10 }}><button type="button" className="hy-btn ghost" onClick={() => setExpenseForm(null)}>Vazgeç</button><button type="submit" className="hy-btn primary"><Check size={14} /> Kaydet</button></div>
          </form>
        )}
        {sorted.length === 0 ? <p className="hy-empty">Gider kaydı yok.</p> : (
          <table className="hy-table">
            <thead><tr><th>Tarih</th><th>Mülk</th><th>Kategori</th><th className="num">Tutar</th><th>Açıklama</th><th></th></tr></thead>
            <tbody>{sorted.map((e) => (<tr key={e.id}><td>{fmtDate(e.date)}</td><td>{propertyName(e.propertyId)}</td><td><span className="hy-tag">{e.category}</span></td><td className="num">{fmtMoney(e.amount)}</td><td className="muted">{e.description || "—"}</td><td><IconBtn title="Sil" danger onClick={() => deleteExpense(e.id)}><Trash2 size={13} /></IconBtn></td></tr>))}</tbody>
            <tfoot><tr><td colSpan={3}>Bu yıl toplam</td><td className="num total">{fmtMoney(thisYearExpenseTotal)}</td><td></td><td></td></tr></tfoot>
          </table>
        )}
      </>
    );
  }

  function renderBankaTab() {
    const openPayments = payments.filter((p) => paymentStatus(p) !== "Ödendi");
    const parseLines = () => {
      const lines = bankText.split("\n").map((l) => l.trim()).filter(Boolean);
      const rows = lines.map((line) => {
        const dm = line.match(/(\d{2})[.\/](\d{2})[.\/](\d{4})/);
        const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : "";
        const nums = line.match(/\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/g) || [];
        const amount = nums.length ? parseBankAmount(nums[nums.length - 1]) : "";
        let best = "", bestDiff = Infinity;
        openPayments.forEach((p) => { const diff = Math.abs(Number(p.amount) - Number(amount || 0)); if (diff < bestDiff) { bestDiff = diff; best = p.id; } });
        return { id: uid(), raw: line, date, amount, paymentId: best };
      });
      setBankRows(rows);
    };
    const updateRow = (id, patch) => setBankRows(bankRows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const confirmRow = (row) => { const target = payments.find((p) => p.id === row.paymentId); if (!target) return; savePayment({ ...target, paidAmount: row.amount || target.amount, paidDate: row.date || todayStr(), bankRef: row.raw }); setBankRows(bankRows.filter((r) => r.id !== row.id)); };

    return (
      <>
        <h3 className="hy-h3">Banka Ekstresi Eşleştirme</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>Ekstre satırlarını yapıştırın, tarih/tutar otomatik okunur ve en yakın açık ödemeyle eşleştirilir.</p>
        <textarea rows={5} className="hy-bank-textarea" placeholder={"05.09.2026  15.000,00 TL  AHMET YILMAZ KİRA ÖDEMESİ"} value={bankText} onChange={(e) => setBankText(e.target.value)} />
        <div className="hy-modal-footer" style={{ padding: 0, margin: "10px 0 16px" }}><button className="hy-btn primary" onClick={parseLines} disabled={!bankText.trim()}>Satırları Ayrıştır</button></div>
        {bankRows.length > 0 && (
          <table className="hy-table">
            <thead><tr><th>Satır</th><th>Tarih</th><th>Tutar</th><th>Eşleşen Ödeme</th><th></th></tr></thead>
            <tbody>{bankRows.map((r) => (
              <tr key={r.id}>
                <td className="muted small">{r.raw}</td>
                <td><input type="date" value={r.date} onChange={(e) => updateRow(r.id, { date: e.target.value })} /></td>
                <td><input type="number" value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })} style={{ width: 90 }} /></td>
                <td><select value={r.paymentId} onChange={(e) => updateRow(r.id, { paymentId: e.target.value })}><option value="">Seçin…</option>{openPayments.map((p) => <option key={p.id} value={p.id}>{contractLabel(p.contractId)} · {fmtMoney(p.amount)} · {fmtDate(p.dueDate)}</option>)}</select></td>
                <td><button className="hy-btn primary sm" disabled={!r.paymentId} onClick={() => confirmRow(r)}>Eşleştir</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </>
    );
  }

  function renderMuhasebe() {
    return (
      <>
        <div className="hy-topbar"><div><h1 className="hy-page-title">Ödemeler & Muhasebe</h1><p className="hy-page-sub">Tahsilat, gider ve banka eşleştirme</p></div></div>
        <div className="hy-tabs2">
          <button className={"hy-tab2" + (acctTab === "odemeler" ? " active" : "")} onClick={() => setAcctTab("odemeler")}><Wallet size={14} /> Ödemeler</button>
          <button className={"hy-tab2" + (acctTab === "giderler" ? " active" : "")} onClick={() => setAcctTab("giderler")}><Receipt size={14} /> Giderler</button>
          <button className={"hy-tab2" + (acctTab === "banka" ? " active" : "")} onClick={() => setAcctTab("banka")}><Landmark size={14} /> Banka Eşleştirme</button>
        </div>
        {acctTab === "odemeler" && renderOdemelerTab()}
        {acctTab === "giderler" && renderGiderlerTab()}
        {acctTab === "banka" && renderBankaTab()}
      </>
    );
  }

  function renderMenu() {
    const modules = [
      { label: "Özet", icon: Home, action: () => goTab("ozet") },
      { label: "Mülklerim", icon: Building2, action: () => goTab("mulkler") },
      { label: "Kiracılarım", icon: Users, action: () => goTab("kiracilar") },
      { label: "Ödemeler & Giderler", icon: Wallet, action: () => goTab("muhasebe") },
      { label: "Banka Eşleştirme", icon: Landmark, action: () => { setTab("muhasebe"); setAcctTab("banka"); } },
      { label: "Bakım & Onarım", icon: Wrench, action: () => goTab("bakim") },
      { label: "Muhasebe Entegrasyonu", icon: Banknote, soon: true },
      { label: "Ciro Beyanları", icon: FileText, soon: true },
      { label: "Hukuki Destek", icon: ShieldCheck, soon: true },
    ];
    return (
      <>
        <div className="hy-topbar"><div><h1 className="hy-page-title">Menü</h1></div></div>
        <div className="hy-profile-card">
          <div className="hy-avatar lg">{initials(profile.name)}</div>
          <div style={{ flex: 1 }}>
            <input className="hy-profile-name-input" value={profile.name} placeholder="Adınızı girin" onChange={(e) => saveProfile({ ...profile, name: e.target.value })} />
            <span className="muted small">Mülk Sahibi</span>
          </div>
        </div>
        <div className="hy-menu-list">
          {modules.map((m) => (
            <button key={m.label} className={"hy-menu-item" + (m.soon ? " disabled" : "")} onClick={m.action} disabled={m.soon}>
              <m.icon size={18} /> <span>{m.label}</span>
              {m.soon && <span className="hy-badge-soon">Yakında</span>}
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="hy-app">
      <style>{`
        .hy-app {
          --primary: #E53935; --primary-dark: #C62828; --primary-soft: #FDEAEA;
          --success: #2E7D32; --success-soft: #E8F5E9;
          --warning: #F57C00; --warning-soft: #FFF3E0;
          --bg: #F4F5F7; --surface: #FFFFFF; --border: #E5E7EB;
          --text: #16181D; --text-soft: #6B7280;
          --radius: 14px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-variant-numeric: tabular-nums;
          color: var(--text);
          background: var(--bg);
          display: flex;
          min-height: 100vh; width: 100%;
        }
        .hy-app * { box-sizing: border-box; }
        .hy-sidebar { width: 250px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
        .hy-logo { display: flex; align-items: center; gap: 10px; padding: 6px 8px 22px; }
        .hy-logo-mark { width: 34px; height: 34px; border-radius: 10px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
        .hy-logo-text strong { display: block; font-size: 15px; }
        .hy-logo-text span { display: block; font-size: 11px; color: var(--text-soft); }
        .hy-nav { display: flex; flex-direction: column; gap: 3px; }
        .hy-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: none; background: none; color: var(--text-soft); font-size: 13.5px; text-align: left; cursor: pointer; }
        .hy-nav-item:hover { background: var(--bg); color: var(--text); }
        .hy-nav-item.active { background: var(--primary-soft); color: var(--primary-dark); font-weight: 600; }
        .hy-main { flex: 1; min-width: 0; padding: 28px 34px 60px; overflow-x: hidden; }
        .hy-topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
        .hy-page-title { font-size: 24px; font-weight: 700; margin: 0 0 2px; }
        .hy-page-sub { font-size: 13px; color: var(--text-soft); margin: 0; }
        .hy-h3 { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
        .hy-bell-wrap { position: relative; }
        .hy-bell { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
        .hy-notif-badge { position: absolute; top: -4px; right: -4px; background: var(--primary); color: #fff; font-size: 10px; min-width: 17px; height: 17px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
        .hy-notif-panel { position: absolute; right: 0; top: 50px; width: 300px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 12px 28px rgba(0,0,0,0.12); padding: 10px; z-index: 30; }
        .hy-notif-item { font-size: 12.5px; padding: 8px 10px; border-radius: 8px; margin-bottom: 4px; }
        .hy-notif-item.bad { background: var(--primary-soft); color: var(--primary-dark); }
        .hy-notif-item.warn { background: var(--warning-soft); color: #9A5300; }
        .hy-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .hy-stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .hy-stat-card.accent { border-color: var(--primary); }
        .hy-stat-card.good { border-color: var(--success); }
        .hy-stat-card.bad { border-color: var(--primary-dark); }
        .hy-stat-label { display: block; font-size: 11.5px; color: var(--text-soft); margin-bottom: 6px; }
        .hy-stat-value { display: block; font-size: 21px; font-weight: 700; }
        .hy-charts-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 22px; }
        .hy-chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
        .hy-chart-card h3 { font-size: 14px; margin: 0 0 8px; }
        .hy-donut-wrap { position: relative; }
        .hy-donut-center { position: absolute; top: 48%; left: 50%; transform: translate(-50%,-58%); text-align: center; font-size: 20px; font-weight: 700; }
        .hy-donut-center span { display: block; font-size: 10px; font-weight: 400; color: var(--text-soft); }
        .hy-section-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin: 22px 0 10px; }
        .hy-section-head h3 { font-size: 15px; margin: 0; }
        .hy-filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .hy-pill { font-size: 11.5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-soft); cursor: pointer; }
        .hy-pill.active { background: var(--text); color: #fff; border-color: var(--text); }
        .hy-activity-list { display: flex; flex-direction: column; gap: 6px; }
        .hy-activity-item { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; }
        .hy-activity-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hy-activity-icon.odeme { background: var(--success-soft); color: var(--success); }
        .hy-activity-icon.gider { background: var(--warning-soft); color: #9A5300; }
        .hy-activity-icon.depozito { background: var(--primary-soft); color: var(--primary-dark); }
        .hy-activity-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .hy-activity-info span:first-child { font-size: 13px; }
        .hy-activity-date { font-size: 11px; color: var(--text-soft); }
        .hy-activity-amount { font-weight: 700; font-size: 13.5px; white-space: nowrap; }
        .hy-activity-amount.pos { color: var(--success); }
        .hy-activity-amount.neg { color: var(--primary-dark); }
        .hy-toolbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .hy-view-toggle { display: flex; border: 1px solid var(--border); border-radius: 9px; overflow: hidden; }
        .hy-view-toggle button { border: none; background: var(--surface); padding: 7px 9px; cursor: pointer; color: var(--text-soft); }
        .hy-view-toggle button.active { background: var(--primary); color: #fff; }
        .hy-property-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .hy-property-list { display: flex; flex-direction: column; gap: 10px; }
        .hy-property-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: box-shadow .15s, transform .15s; }
        .hy-property-card:hover { box-shadow: 0 10px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .hy-property-img { position: relative; height: 110px; background: var(--bg); display: flex; align-items: center; justify-content: center; color: var(--text-soft); }
        .hy-property-img img { width: 100%; height: 100%; object-fit: cover; }
        .hy-status-badge { position: absolute; top: 8px; right: 8px; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; font-weight: 600; }
        .hy-status-badge.good { background: var(--success-soft); color: var(--success); }
        .hy-status-badge.neutral { background: #EEF0F2; color: var(--text-soft); }
        .hy-property-body { padding: 12px 14px; }
        .hy-property-title { font-weight: 700; font-size: 14.5px; margin-bottom: 4px; }
        .hy-property-addr { font-size: 12px; color: var(--text-soft); margin-bottom: 8px; }
        .hy-property-meta { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px; }
        .hy-property-meta.small { font-size: 11px; color: var(--text-soft); flex-direction: column; gap: 2px; }
        .hy-fab { position: fixed; bottom: 32px; right: 40px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; box-shadow: 0 10px 22px rgba(229,57,53,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20; }
        .hy-fab:hover { background: var(--primary-dark); }
        .hy-back-link { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-soft); font-size: 13px; cursor: pointer; margin-bottom: 14px; padding: 0; }
        .hy-back-link:hover { color: var(--text); }
        .hy-detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .hy-detail-img { width: 68px; height: 68px; border-radius: 16px; background: var(--bg); display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--text-soft); flex-shrink: 0; }
        .hy-detail-img img { width: 100%; height: 100%; object-fit: cover; }
        .hy-tabs2 { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 18px; flex-wrap: wrap; }
        .hy-tab2 { display: flex; align-items: center; gap: 6px; padding: 9px 14px; border: none; background: none; color: var(--text-soft); font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; }
        .hy-tab2.active { color: var(--primary-dark); border-bottom-color: var(--primary); font-weight: 600; }
        .hy-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
        .hy-detail-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
        .hy-detail-card.span-2 { grid-column: span 2; }
        .hy-detail-card h4 { margin: 0 0 10px; font-size: 13.5px; }
        .hy-detail-card dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; font-size: 12.5px; }
        .hy-detail-card dt { color: var(--text-soft); }
        .hy-detail-card dd { margin: 0; text-align: right; font-weight: 500; }
        .hy-contract-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 12px; }
        .hy-contract-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
        .hy-contract-meta { display: flex; align-items: center; gap: 16px; font-size: 12.5px; color: var(--text-soft); flex-wrap: wrap; margin-bottom: 8px; }
        .hy-row-actions { display: flex; gap: 6px; align-items: center; margin-left: auto; }
        .hy-doc-list { display: flex; flex-direction: column; gap: 6px; }
        .hy-doc-item { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; }
        .hy-doc-item a { color: var(--primary-dark); text-decoration: none; flex: 1; }
        .hy-tenant-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .hy-tenant-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; cursor: pointer; }
        .hy-tenant-card:hover { box-shadow: 0 8px 18px rgba(0,0,0,0.06); }
        .hy-tenant-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .hy-tenant-figures { display: flex; flex-direction: column; align-items: flex-end; font-size: 12px; gap: 3px; }
        .hy-text-bad { color: var(--primary-dark); font-weight: 600; }
        .hy-text-good { color: var(--success); font-weight: 600; }
        .hy-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-soft); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .hy-avatar.lg { width: 56px; height: 56px; font-size: 18px; }
        .hy-invite-link { background: var(--bg); border: 1px dashed var(--border); border-radius: 10px; padding: 10px 12px; font-size: 12.5px; word-break: break-all; margin-bottom: 4px; }
        .hy-category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 10px; }
        .hy-category-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 8px; cursor: pointer; color: var(--text); font-size: 11.5px; }
        .hy-category-btn:hover { border-color: var(--primary); color: var(--primary-dark); }
        .hy-profile-card { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
        .hy-profile-name-input { border: none; background: none; font-size: 16px; font-weight: 700; padding: 0; width: 100%; }
        .hy-profile-name-input:focus { outline: none; border-bottom: 1px solid var(--primary); }
        .hy-menu-list { display: flex; flex-direction: column; gap: 4px; }
        .hy-menu-item { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 16px; font-size: 13.5px; cursor: pointer; color: var(--text); text-align: left; }
        .hy-menu-item:hover:not(.disabled) { border-color: var(--primary); }
        .hy-menu-item.disabled { color: var(--text-soft); cursor: not-allowed; }
        .hy-badge-soon { margin-left: auto; font-size: 10px; background: var(--warning-soft); color: #9A5300; padding: 2px 8px; border-radius: 999px; }
        .hy-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 18px; }
        .hy-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .hy-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--text-soft); }
        .hy-field.span-2 { grid-column: span 2; }
        .hy-field-label { font-size: 11.5px; color: var(--text-soft); display: block; margin-bottom: 6px; }
        .hy-field input, .hy-field select, .hy-field textarea, select, input, textarea, .hy-bank-textarea {
          font-family: inherit; font-size: 13px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--text);
        }
        .hy-field input:focus, .hy-field select:focus, .hy-field textarea:focus, select:focus, input:focus, textarea:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
        .hy-subsection { margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border); }
        .hy-img-add-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .hy-img-add-row input { flex: 1 1 160px; }
        .hy-img-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .hy-img-chip { position: relative; width: 90px; font-size: 10px; text-align: center; color: var(--text-soft); }
        .hy-img-chip img { width: 90px; height: 64px; object-fit: cover; border-radius: 8px; display: block; }
        .hy-img-chip button { position: absolute; top: -6px; right: -6px; background: var(--primary); border: none; color: #fff; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .hy-person-group { border: 1px dashed var(--border); border-radius: 12px; padding: 12px; margin-top: 12px; }
        .hy-person-group-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
        .hy-person-group-head select { max-width: 220px; }
        .hy-choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .hy-choice-grid.small { grid-template-columns: repeat(3, 1fr); }
        .hy-choice-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 10px; border: 1.5px solid var(--border); border-radius: 12px; background: var(--surface); cursor: pointer; font-size: 12.5px; color: var(--text); }
        .hy-choice-card.selected { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); }
        .hy-btn { font-size: 12.5px; padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
        .hy-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
        .hy-btn.primary:hover { background: var(--primary-dark); }
        .hy-btn.primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .hy-btn.ghost { background: var(--surface); color: var(--text-soft); }
        .hy-btn.ghost:hover { background: var(--bg); }
        .hy-btn.danger { background: #fff; border-color: var(--primary); color: var(--primary-dark); }
        .hy-btn.danger:hover { background: var(--primary); color: #fff; }
        .hy-btn.sm { padding: 6px 10px; font-size: 11.5px; }
        .hy-icon-btn { background: none; border: none; color: var(--text-soft); cursor: pointer; padding: 5px; display: inline-flex; border-radius: 7px; }
        .hy-icon-btn:hover { background: var(--bg); color: var(--text); }
        .hy-icon-btn.danger:hover { color: var(--primary-dark); }
        .hy-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 10px; }
        .hy-table.sm { font-size: 11.5px; }
        .hy-table th { text-align: left; font-size: 10.5px; color: var(--text-soft); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--border); }
        .hy-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); }
        .hy-table tfoot td { border-top: 2px solid var(--text); border-bottom: none; font-weight: 700; }
        .hy-table .num { text-align: right; }
        .hy-table .total { text-align: right; }
        .hy-pill-badge { font-size: 10.5px; padding: 3px 9px; border-radius: 999px; font-weight: 600; display: inline-block; }
        .hy-pill-badge.good { background: var(--success-soft); color: var(--success); }
        .hy-pill-badge.neutral { background: #EEF0F2; color: var(--text-soft); }
        .hy-pill-badge.warn { background: var(--warning-soft); color: #9A5300; }
        .hy-pill-badge.bad { background: var(--primary-soft); color: var(--primary-dark); }
        .hy-tag { font-size: 10.5px; color: var(--text-soft); border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px; }
        .hy-empty { color: var(--text-soft); font-size: 12.5px; padding: 14px 0; font-style: italic; }
        .muted { color: var(--text-soft); }
        .muted.small { font-size: 11px; }
        .hy-modal-backdrop { position: fixed; inset: 0; background: rgba(15,17,20,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .hy-modal { background: var(--surface); border-radius: 18px; width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.25); }
        .hy-modal.wide { max-width: 720px; }
        .hy-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 2; }
        .hy-modal-head h3 { margin: 0; font-size: 16px; }
        .hy-modal-close { background: none; border: none; cursor: pointer; color: var(--text-soft); }
        .hy-modal-body { padding: 20px; }
        .hy-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; }
        .hy-wizard-steps { display: flex; justify-content: space-between; margin-bottom: 22px; gap: 4px; }
        .hy-wizard-step-dot { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; font-size: 9.5px; color: var(--text-soft); text-align: center; }
        .hy-wizard-step-dot span { width: 26px; height: 26px; border-radius: 50%; background: var(--bg); border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .hy-wizard-step-dot.active span { background: var(--primary); border-color: var(--primary); color: #fff; }
        .hy-wizard-step-dot.done span { background: var(--success); border-color: var(--success); color: #fff; }
        .hy-wizard-body { min-height: 180px; }
        @media (max-width: 980px) {
          .hy-charts-grid { grid-template-columns: 1fr; }
          .hy-sidebar { width: 76px; padding: 16px 8px; }
          .hy-logo-text, .hy-nav-item span { display: none; }
          .hy-nav-item { justify-content: center; }
          .hy-logo { justify-content: center; padding-bottom: 16px; }
        }
        @media (max-width: 640px) {
          .hy-main { padding: 20px 16px 60px; }
          .hy-form-grid { grid-template-columns: 1fr; }
          .hy-field.span-2 { grid-column: span 1; }
          .hy-choice-grid.small { grid-template-columns: repeat(2, 1fr); }
          .hy-detail-card.span-2 { grid-column: span 1; }
          .hy-fab { right: 20px; bottom: 20px; }
        }
      `}</style>

      <aside className="hy-sidebar">
        <div className="hy-logo">
          <div className="hy-logo-mark">HY</div>
          <div className="hy-logo-text"><strong>HasYek</strong><span>Kira Takip</span></div>
        </div>
        <nav className="hy-nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <button key={n.id} className={"hy-nav-item" + (tab === n.id ? " active" : "")} onClick={() => goTab(n.id)}>
                <Icon size={17} /> <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="hy-main">
        {!loaded ? (
          <p className="hy-empty">Yükleniyor…</p>
        ) : (
          <>
            {tab === "ozet" && renderOzet()}
            {tab === "mulkler" && (selectedPropertyId ? renderPropertyDetail() : renderPropertiesList())}
            {tab === "kiracilar" && (selectedTenantId ? renderTenantDetail() : renderTenantsList())}
            {tab === "bakim" && renderBakim()}
            {tab === "muhasebe" && renderMuhasebe()}
            {tab === "menu" && renderMenu()}
          </>
        )}
      </main>

      {renderContractModal()}
    </div>
  );
}