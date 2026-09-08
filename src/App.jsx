import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bsajwcplambqjhitwkew.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWp3Y3BsYW1icWpoaXR3a2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjA5ODMsImV4cCI6MjEwNDI5Njk4M30.aoovr1RejbazLcSq7UPDWoK4zR-mGrVfmMiZSnubUaQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
import { useState, useEffect, useMemo } from "react";
import {
  Home, Store, Users, Wrench, Menu as MenuIcon, Bell,
  Plus, Trash2, X, Check, ArrowLeft,
  FileText, Building2, Banknote, Download, Pencil, ArrowRight, MoreHorizontal, Settings, Printer, Receipt
} from "lucide-react";

if (typeof window !== "undefined") {
  window.storage = {
    async get(key) {
      const { data, error } = await supabase.from('app_data').select('value').eq('key', key).maybeSingle();
      if (error || !data) {
        return { key, value: null, shared: false };
      }
      return { key, value: data.value, shared: false };
    },
    async set(key, value) {
      const { error } = await supabase.from('app_data').upsert({ key, value });
      if (error) console.error("Supabase kayit hatasi:", error);
      return { key, value, shared: false };
    },
    async delete(key) {
      const { error } = await supabase.from('app_data').delete().eq('key', key);
      if (error) {
        console.error("Supabase silme hatasi:", error);
        return { key, deleted: false, error };
      }
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
  promissoryNotes: "hasyek:promissoryNotes",
};

function paymentStatus(p) {
  if (p.paidAmount && Number(p.paidAmount) >= Number(p.amount)) return "Ödendi";
  if (p.paidAmount && Number(p.paidAmount) > 0) return "Kısmi";
  const d = daysUntil(p.dueDate);
  if (d !== null && d < 0) return "Gecikti";
  return "Bekliyor";
}

function Field({ label, children, span }) {
  return (
    <label className={"hy-field" + (span ? " span-2" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }) {
  const map = {
    "Kirada": "good", "Aktif": "good", "Ödendi": "good", "Tamamlandı": "good",
    "Boşta": "neutral", "Bekliyor": "neutral", "Açık": "neutral", "Sona Erdi": "neutral",
    "Kısmi": "warn", "Gecikti": "bad", "Feshedildi": "bad", "Alındı": "good", "Eksik": "bad"
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
  const [promissoryNotes, setPromissoryNotes] = useState([]);
  const [profile, setProfile] = useState({ firstName: "Halil", lastName: "Aslan", email: "halilasslan@gmail.com", adminPin: "1234" });

  const [authRole, setAuthRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("ozet");
  const [paymentFilterTab, setPaymentFilterTab] = useState("Tümü");
  const [notifOpen, setNotifOpen] = useState(false);

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
        load(STORAGE_KEYS.promissoryNotes, setPromissoryNotes, []),
        load(STORAGE_KEYS.profile, setProfile, { firstName: "Halil", lastName: "Aslan", email: "halilasslan@gmail.com", adminPin: "1234" }),
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
  const deletePropertyCompletely = (id) => {
    persist(STORAGE_KEYS.properties, removeById(properties, id), setProperties);
    setSelectedPropertyId(null);
  };
  const savePerson = (p) => persist(STORAGE_KEYS.people, upsert(people, p), setPeople);
  const deleteTenantCompletely = (id) => {
    persist(STORAGE_KEYS.people, removeById(people, id), setPeople);
    setSelectedTenantId(null);
  };
  const saveContract = (c) => persist(STORAGE_KEYS.contracts, upsert(contracts, c), setContracts);
  const saveMaintenance = (m) => persist(STORAGE_KEYS.maintenance, upsert(maintenance, m), setMaintenance);
  const deleteMaintenance = (id) => persist(STORAGE_KEYS.maintenance, removeById(maintenance, id), setMaintenance);
  const saveProfile = (p) => persist(STORAGE_KEYS.profile, p, setProfile);
  const saveNotes = (notes) => persist(STORAGE_KEYS.promissoryNotes, notes, setPromissoryNotes);

  const propertyDisplayName = (p) => (p ? `${p.tasinmazNo || ""} ${p.ad ? "· " + p.ad : ""}` : "—");
  const propertyName = (id) => propertyDisplayName(properties.find((x) => x.id === id));
  const activeContractOf = (propertyId) => {
    const today = new Date();
    return contracts.find((c) => c.propertyId === propertyId && c.status === "Aktif" && new Date(c.startDate) <= today && (!c.endDate || new Date(c.endDate) >= today));
  };
  const propertyStatus = (propertyId) => (activeContractOf(propertyId) ? "Kirada" : "Boşta");

  const thisMonthDue = useMemo(() => { const now = new Date(); return payments.filter((p) => { const d = new Date(p.dueDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, p) => s + (Number(p.amount) || 0), 0); }, [payments]);
  const thisMonthCollected = useMemo(() => { const now = new Date(); return payments.filter((p) => p.paidDate && new Date(p.paidDate).getMonth() === now.getMonth() && new Date(p.paidDate).getFullYear() === now.getFullYear()).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0); }, [payments]);
  const overdue = useMemo(() => payments.filter((p) => paymentStatus(p) === "Gecikti"), [payments]);

  const notifications = useMemo(() => {
    const list = [];
    payments.forEach(p => {
      const d = daysUntil(p.dueDate);
      const st = paymentStatus(p);
      if (st === "Gecikti") {
        list.push({ type: "bad", text: `Gecikmiş kira ödemesi var (${fmtMoney(p.amount)})` });
      } else if (d !== null && d >= 0 && d <= 5) {
        list.push({ type: "warn", text: `Vadesi yaklaşan ödeme var (${d} gün kaldı, ${fmtMoney(p.amount)})` });
      }
    });
    contracts.forEach(c => {
      const d = daysUntil(c.endDate);
      if (d !== null && d >= 0 && d <= 30) {
        list.push({ type: "warn", text: `${propertyName(c.propertyId)} sözleşmesinin bitmesine ${d} gün kaldı!` });
      }
    });
    promissoryNotes.forEach(n => {
      if (n.status === "Eksik") {
        list.push({ type: "bad", text: `Eksik Senet Uyarısı: ${n.tenantName} için ${n.senetNo} nolu senet henüz alınmadı!` });
      }
    });
    return list;
  }, [payments, contracts, properties, promissoryNotes]);

  const NAV = [
    { id: "ozet", label: "Özet", icon: Home },
    { id: "mulkler", label: "Mülklerim", icon: Building2 },
    { id: "kontrat_kayit", label: "Kontrat ile Otomatik Kayıt", icon: FileText },
    { id: "senetler", label: "Senet Yönetimi", icon: Receipt },
    { id: "kiracilar", label: "Kiracılarım", icon: Users },
    { id: "bakim", label: "Bakım & Onarım", icon: Wrench },
    { id: "muhasebe", label: "Ödemeler & Muhasebe", icon: Banknote },
    { id: "ayarlar", label: "Ayarlar", icon: Settings },
    { id: "menu", label: "Menü", icon: MenuIcon },
  ];

  const goTab = (id) => {
    setTab(id);
    if (id === "mulkler") setSelectedPropertyId(null);
    if (id === "kiracilar") setSelectedTenantId(null);
  };

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyDetailTab, setPropertyDetailTab] = useState("odeme_akisi");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("Tümü");
  const [propMenuOpen, setPropMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    kdvLi: false, kdvDurumu: "KDV Dahil", kdvOrani: "20", tutar: "30000", donemAy: "Eylül", donemYil: "2026", durum: "Ödenmedi"
  });

  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [tenantSubTab, setTenantSubTab] = useState("aktif");
  const [tenantDetailTab, setTenantDetailTab] = useState("borclar");
  const [tenantEditModalOpen, setTenantEditModalOpen] = useState(false);
  const [tenantEditDraft, setTenantEditDraft] = useState(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [wizardDraft, setWizardDraft] = useState(null);

  const [contractScanForm, setContractScanForm] = useState({
    tasinmazNo: "", propertyAd: "", ilce: "", landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.", tenantName: "", tenantPhone: "", tenantTc: "", tenantAddress: "", rentAmount: "", startDate: todayStr(), docUrl: ""
  });

  // Senet Oluşturucu Modalı State'leri
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printNoteData, setPrintNoteData] = useState({
    kesideTarihi: todayStr(),
    kesideYeri: "İSTANBUL",
    odemeTarihi: todayStr(),
    tutar: "33000",
    senetNo: "1/12",
    borcluAdi: "",
    borcluTc: "",
    borcluAdres: ""
  });

  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [maintForm, setMaintForm] = useState({ propertyId: "", category: "", service: "", description: "", technicianPhone: "" });
  const [acctSubTab, setAcctSubTab] = useState("tablo");
  const [settingsSubTab, setSettingsSubTab] = useState("hesap");

  const downloadExcelReport = (period) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `Tür,Tarih,Açıklama,Tutar\n`;
    payments.forEach(p => {
      if (p.paidDate) csvContent += `Kira Geliri,${p.paidDate},Kira Ödemesi,${p.paidAmount || p.amount}\n`;
    });
    expenses.forEach(e => {
      csvContent += `Gider,${e.date},${e.category || "Genel"},-${e.amount}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HasYek_Muhasebe_${period}_Raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!loaded) {
    return <div className="hy-app"><p className="hy-empty" style={{ margin: "auto" }}>Yükleniyor…</p></div>;
  }

  if (!authRole) {
    return (
      <div className="hy-app">
        <div className="hy-login-container">
          <div className="hy-login-header">
            <div className="hy-login-logo-img">
              <span className="logo-hasyek">HASYEK</span>
              <div className="logo-line"></div>
              <span className="logo-insaat">İNŞAAT</span>
            </div>
            <h1>Mülk yönetiminiz artık çok daha kolay[cite: 3].</h1>
            <p>Mülklerinizin takibini ve yönetimini tek bir yerden profesyonelce gerçekleştirin[cite: 3].</p>
          </div>

          <div className="hy-login-cards-grid">
            <div className="hy-login-card">
              <div className="hy-login-card-top">
                <div>
                  <h3>Mülk Sahibi</h3>
                  <p>Mülklerinizi, sözleşmelerinizi ve tahsilatlarınızı yönetmeye başlayın.</p>
                </div>
                <div className="hy-login-icon-wrap"><Building2 size={24} /></div>
              </div>
              <button className="hy-login-action-btn" onClick={() => {
                const pin = prompt("Yönetici Şifresini Girin:");
                if (pin === (profile.adminPin || "1234")) { setAuthRole("admin"); }
                else if (pin) { alert("Hatalı şifre!"); }
              }}>
                Mülk sahibiyim <ArrowRight size={16} />
              </button>
            </div>

            <div className="hy-login-card">
              <div className="hy-login-card-top">
                <div>
                  <h3>Kiracı</h3>
                  <p>Kiraladığınız mülk ile ilgili ödeme planına ve bilgilere erişin.</p>
                </div>
                <div className="hy-login-icon-wrap"><Users size={24} /></div>
              </div>
              <button className="hy-login-action-btn" onClick={() => {
                const tName = prompt("Kiracı Adınızı Girin:");
                const found = people.find(p => p.role === "Kiracı" && p.name.toLowerCase().includes((tName || "").toLowerCase()));
                if (found) {
                  setAuthRole("tenant");
                  setCurrentUser(found);
                } else {
                  alert("Kiracı sistemde bulunamadı!");
                }
              }}>
                Kiracıyım <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .hy-login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; width: 100vw; background: #F9FAFB; padding: 40px 20px; }
          .hy-login-header { text-align: center; max-width: 650px; margin-bottom: 40px; }
          .hy-login-logo-img { display: inline-flex; flex-direction: column; align-items: center; margin-bottom: 16px; }
          .logo-hasyek { font-size: 32px; font-weight: 800; color: #111C2E; letter-spacing: 1px; }
          .logo-line { width: 120px; height: 3px; background: #C5A059; margin: 6px 0; }
          .logo-insaat { font-size: 14px; font-weight: 700; color: #C5A059; letter-spacing: 3px; }
          .hy-login-header h1 { font-size: 28px; font-weight: 800; color: #111827; margin: 0 0 10px; letter-spacing: -0.5px; }
          .hy-login-header p { font-size: 15px; color: #4B5563; margin: 0; line-height: 1.5; }
          .hy-login-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; width: 100%; max-width: 740px; }
          .hy-login-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.2s, box-shadow 0.2s; }
          .hy-login-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.06); border-color: #D1D5DB; }
          .hy-login-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
          .hy-login-card-top h3 { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 6px; }
          .hy-login-card-top p { font-size: 13.5px; color: #6B7280; margin: 0; line-height: 1.4; }
          .hy-login-icon-wrap { width: 48px; height: 48px; border-radius: 12px; background: #F3F4F6; color: #374151; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .hy-login-action-btn { background: #E53935; color: #fff; border: none; border-radius: 10px; padding: 12px 18px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s; width: 100%; }
          .hy-login-action-btn:hover { background: #C62828; }
        `}</style>
      </div>
    );
  }

  if (authRole === "tenant") {
    const myContracts = contracts.filter(c => c.tenantId === currentUser.id);
    const myPayments = payments.filter(p => myContracts.some(c => c.id === p.contractId));
    return (
      <div className="hy-app" style={{ padding: 30 }}>
        <div style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2>Hoş Geldiniz, {currentUser.name} (Kiracı Paneli - Salt Okunur)</h2>
            <button className="hy-btn ghost sm" onClick={() => setAuthRole(null)}>Çıkış Yap</button>
          </div>
          <h3 className="hy-h3">Sözleşmelerim & Mülk Bilgilerim</h3>
          {myContracts.length === 0 ? <p className="hy-empty">Aktif sözleşmeniz bulunmuyor.</p> : (
            myContracts.map(c => (
              <div key={c.id} className="hy-panel">
                <p><strong>Mülk:</strong> {propertyName(c.propertyId)}</p>
                <p><strong>Aylık Kira:</strong> {fmtMoney(c.rentAmount)}</p>
                <p><strong>Sözleşme Tarihi:</strong> {fmtDate(c.startDate)} – {fmtDate(c.endDate)}</p>
              </div>
            ))
          )}
          <h3 className="hy-h3" style={{ marginTop: 20 }}>Ödeme Planı ve Durumunuz</h3>
          <table className="hy-table" style={{ width: "100%", background: "#fff", borderCollapse: "collapse", borderRadius: 8, overflow: "hidden" }}>
            <thead><tr style={{ background: "#f8f9fa", textAlign: "left" }}><th style={{padding: 10}}>Vade Tarihi</th><th style={{padding: 10}}>Tutar</th><th style={{padding: 10}}>Ödenen</th><th style={{padding: 10}}>Durum</th></tr></thead>
            <tbody>
              {myPayments.map(p => (
                <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{padding: 10}}>{fmtDate(p.dueDate)}</td>
                  <td style={{padding: 10}}>{fmtMoney(p.amount)}</td>
                  <td style={{padding: 10}}>{p.paidAmount ? fmtMoney(p.paidAmount) : "—"}</td>
                  <td style={{padding: 10}}><StatusPill status={paymentStatus(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderOzet() {
    const filteredPayments = payments.filter(p => {
      const st = paymentStatus(p);
      if (paymentFilterTab === "Tümü") return true;
      if (paymentFilterTab === "Ödendi" && st === "Ödendi") return true;
      if (paymentFilterTab === "Gecikmiş" && st === "Gecikti") return true;
      if (paymentFilterTab === "Bekleyen" && st === "Bekliyor") return true;
      return false;
    });

    const missingNotesCount = promissoryNotes.filter(n => n.status === "Eksik").length;

    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Özet</h1>
            <p className="hy-page-sub">İyi günler, {profile.firstName || "Halil"} {profile.lastName || "Aslan"}</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="hy-bell-wrap">
              <div className="hy-bell" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={20} />
                {notifications.length > 0 && <span className="hy-notif-badge">{notifications.length}</span>}
              </div>
              {notifOpen && (
                <div className="hy-notif-panel">
                  <h4 style={{ margin: "0 0 8px", fontSize: "13px" }}>Bildirimler & Uyarılar</h4>
                  {notifications.length === 0 ? <p className="hy-empty">Yeni bildirim yok.</p> : (
                    notifications.map((n, i) => (
                      <div key={i} className={"hy-notif-item " + n.type}>{n.text}</div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", padding: "6px 14px", borderRadius: 99, display: "flex", alignItems: "center", gap: 8, fontSize: "13px" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E53935", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>{initials(profile.firstName + " " + profile.lastName)}</div>
              <span><strong>{profile.firstName} {profile.lastName}</strong> · Mülk Sahibi</span>
            </div>
            <button className="hy-btn ghost sm" onClick={() => setAuthRole(null)}>Çıkış Yap</button>
          </div>
        </div>

        {missingNotesCount > 0 && (
          <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#991B1B" }}>
              <Receipt size={20} />
              <div>
                <strong>Dikkat: Alınmamış / Eksik Senetler Var!</strong>
                <div style={{ fontSize: "12.5px" }}>Sistemde takibi yapılan {missingNotesCount} adet senet henüz teslim alınmadı veya taranmadı.</div>
              </div>
            </div>
            <button className="hy-btn primary sm" style={{ background: "#991B1B" }} onClick={() => goTab("senetler")}>Senetleri İncele</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
          <div style={{ background: "#2E7D32", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(46,125,50,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Gerçekleşen Ödemeler</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(thisMonthCollected)}</div>
          </div>
          <div style={{ background: "#F57C00", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(245,124,0,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Gelecek Ödemeler</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(thisMonthDue)}</div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <span style={{ fontSize: "13px", color: "var(--text-soft)" }}>Ödenen Kiralar</span>
            <div style={{ fontSize: "12px", color: "var(--text-soft)", marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", color: "var(--text)", marginTop: 12 }}>{payments.filter(p => paymentStatus(p) === "Ödendi").length}</div>
          </div>
          <div style={{ background: "#C62828", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(198,40,40,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Ödenmemiş Kiralar</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{payments.filter(p => paymentStatus(p) !== "Ödendi").length}</div>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700" }}>Kira Ödeme Akışı</h3>
          <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 16 }}>
            {["Tümü", "Ödendi", "Gecikmiş", "Bekleyen"].map(tabName => (
              <button key={tabName} onClick={() => setPaymentFilterTab(tabName)} style={{ background: paymentFilterTab === tabName ? "#111827" : "#F3F4F6", color: paymentFilterTab === tabName ? "#fff" : "#4B5563", border: "none", padding: "8px 16px", borderRadius: 99, fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                {tabName}
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 12px" }}>Durum</th>
                  <th style={{ padding: "10px 12px" }}>Mülk</th>
                  <th style={{ padding: "10px 12px" }}>Kiracı</th>
                  <th style={{ padding: "10px 12px" }}>Kira Dönemi / Vade</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Kayıtlı ödeme akışı bulunamadı.</td></tr>
                ) : (
                  filteredPayments.map(p => {
                    const contract = contracts.find(c => c.id === p.contractId);
                    const prop = properties.find(pr => pr.id === (contract ? contract.propertyId : ""));
                    const tenant = people.find(t => t.id === (contract ? contract.tenantId : ""));
                    const st = paymentStatus(p);
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px" }}><StatusPill status={st} /></td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{prop ? prop.tasinmazNo : "—"}</td>
                        <td style={{ padding: "12px" }}>{tenant ? tenant.name : "—"}</td>
                        <td style={{ padding: "12px", color: "var(--text-soft)" }}>{fmtDate(p.dueDate)}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{fmtMoney(p.amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={20} color="#C62828" /> Borçlu Kiracılar
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 12px" }}>Kiracı</th>
                  <th style={{ padding: "10px 12px" }}>Mülk</th>
                  <th style={{ padding: "10px 12px" }}>Borç Tutarı</th>
                  <th style={{ padding: "10px 12px" }}>Geciken Durum</th>
                </tr>
              </thead>
              <tbody>
                {overdue.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Borçlu kiracınız bulunmuyor. 🎉</td></tr>
                ) : (
                  overdue.map(p => {
                    const contract = contracts.find(c => c.id === p.contractId);
                    const prop = properties.find(pr => pr.id === (contract ? contract.propertyId : ""));
                    const tenant = people.find(t => t.id === (contract ? contract.tenantId : ""));
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FDEAEA", color: "#C62828", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>{initials(tenant ? tenant.name : "")}</div>
                          <strong>{tenant ? tenant.name : "—"}</strong>
                        </td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{prop ? prop.tasinmazNo : "—"}</td>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#C62828" }}>{fmtMoney(p.amount)}</td>
                        <td style={{ padding: "12px" }}><span style={{ background: "#C62828", color: "#fff", padding: "4px 10px", borderRadius: 99, fontSize: "11.5px", fontWeight: "600" }}>Gecikmiş</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function openWizard(propToEdit = null) {
    const existingLandlords = [...new Set(properties.map(p => p.malikAdi).filter(Boolean))];
    if (propToEdit) {
      setEditingProperty(propToEdit);
      setWizardDraft({ ...propToEdit, existingLandlords });
    } else {
      setEditingProperty(null);
      setWizardDraft({
        id: uid(), mülkTipi: "Konut", konutTürü: "Daire", tasinmazNo: "", ad: "", il: "", ilce: "", mahalle: "", sokak: "", binaNo: "", kat: "", daireNo: "",
        brutM2: "", netM2: "", binaYasi: "0-5", odaSayisi: "2+1", banyoSayisi: "1", binaKatSayisi: "3-5", isinmaSistemi: "Doğalgaz (Kombi)",
        satisFiyati: "", aidat: "", malikAdi: "Halil Aslan", hisseOrani: "%100",
        asansör: "Var", otopark: "Kapalı", balkon: "Var", esyali: "Hayır", internet: "Fiber", manzara: "Şehir", hayvanDostu: "Hayır",
        photos: ["", "", "", "", "", ""], existingLandlords
      });
    }
    setWizardOpen(true);
  }
  function closeWizard() { setWizardOpen(false); setWizardDraft(null); setEditingProperty(null); }

  function finishWizard() {
    if (!wizardDraft.tasinmazNo) { alert("Lütfen taşınmaz numarasını giriniz."); return; }
    saveProperty(wizardDraft);
    closeWizard();
  }

  function renderPropertyWizard() {
    if (!wizardOpen || !wizardDraft) return null;
    const d = wizardDraft;
    const set = (patch) => setWizardDraft({ ...d, ...patch });
    return (
      <Modal title={editingProperty ? "Mülk Bilgilerini Düzenle" : "Mülk Ekle"} onClose={closeWizard} wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Mülk Tipi ve Türü</h4>
            <div className="hy-form-grid">
              <Field label="Mülk Tipi"><select value={d.mülkTipi} onChange={e=>set({mülkTipi: e.target.value})}><option>Konut</option><option>İş Yeri</option></select></Field>
              <Field label="Konut Türü"><select value={d.konutTürü} onChange={e=>set({konutTürü: e.target.value})}><option>Daire</option><option>Villa</option><option>Yazlık</option></select></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Temel Bilgiler</h4>
            <div className="hy-form-grid">
              <Field label="Taşınmaz Numarası"><input value={d.tasinmazNo} onChange={e=>set({tasinmazNo: e.target.value})} placeholder="Örn: hasyek.34.01" required /></Field>
              <Field label="Mülk Adı"><input value={d.ad} onChange={e=>set({ad: e.target.value})} placeholder="Örn: Sima Garden Daire 12" /></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Konum Bilgileri</h4>
            <div className="hy-form-grid">
              <Field label="İl"><input value={d.il} onChange={e=>set({il: e.target.value})} placeholder="İstanbul" /></Field>
              <Field label="İlçe"><input value={d.ilce} onChange={e=>set({ilce: e.target.value})} placeholder="Pendik" /></Field>
              <Field label="Mahalle"><input value={d.mahalle} onChange={e=>set({mahalle: e.target.value})} placeholder="Yenişehir Mah." /></Field>
              <Field label="Sokak / Cadde"><input value={d.sokak} onChange={e=>set({sokak: e.target.value})} placeholder="Reyhan Cad." /></Field>
              <Field label="Bina No"><input value={d.binaNo} onChange={e=>set({binaNo: e.target.value})} placeholder="43" /></Field>
              <Field label="Kat"><input value={d.kat} onChange={e=>set({kat: e.target.value})} placeholder="1" /></Field>
              <Field label="Daire Numarası"><input value={d.daireNo} onChange={e=>set({daireNo: e.target.value})} placeholder="12" /></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Yapı Bilgileri</h4>
            <div className="hy-form-grid">
              <Field label="Brüt m²"><input type="number" value={d.brutM2} onChange={e=>set({brutM2: e.target.value})} placeholder="100" /></Field>
              <Field label="Net m²"><input type="number" value={d.netM2} onChange={e=>set({netM2: e.target.value})} placeholder="85" /></Field>
              <Field label="Bina Yaşı"><select value={d.binaYasi} onChange={e=>set({binaYasi: e.target.value})}><option>0 (Sıfır)</option><option>0-5</option><option>5-10</option><option>10-20</option><option>20+</option></select></Field>
              <Field label="Oda Sayısı"><select value={d.odaSayisi} onChange={e=>set({odaSayisi: e.target.value})}><option>1+0</option><option>1+1</option><option>2+1</option><option>3+1</option><option>4+1</option></select></Field>
              <Field label="Banyo Sayısı"><select value={d.banyoSayisi} onChange={e=>set({banyoSayisi: e.target.value})}><option>1</option><option>2</option><option>3</option></select></Field>
              <Field label="Bina Kat Sayısı"><select value={d.binaKatSayisi} onChange={e=>set({binaKatSayisi: e.target.value})}><option>1-3</option><option>3-5</option><option>5-10</option><option>10+</option></select></Field>
              <Field label="Isınma Sistemi"><select value={d.isinmaSistemi} onChange={e=>set({isinmaSistemi: e.target.value})}><option>Doğalgaz (Kombi)</option><option>Merkezi</option><option>Klima</option><option>Yerden Isıtma</option></select></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Finansal Bilgiler</h4>
            <div className="hy-form-grid">
              <Field label="Liste Satış Fiyatı (₺)"><input type="number" value={d.satisFiyati} onChange={e=>set({satisFiyati: e.target.value})} placeholder="5000000" /></Field>
              <Field label="Aidat (₺)"><input type="number" value={d.aidat} onChange={e=>set({aidat: e.target.value})} placeholder="1500" /></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Malik Bilgileri</h4>
            <div className="hy-form-grid">
              <Field label="Malik Adı Soyadı"><input list="l-list" value={d.malikAdi} onChange={e=>set({malikAdi: e.target.value})} placeholder="Halil Aslan" /></Field>
              <datalist id="l-list">{(d.existingLandlords||[]).map(l=><option key={l} value={l}/>)}</datalist>
              <Field label="Hisse Oranı"><input value={d.hisseOrani} onChange={e=>set({hisseOrani: e.target.value})} placeholder="%100" /></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Ek Bilgiler (Özellikler)</h4>
            <div className="hy-form-grid">
              <Field label="Asansör"><select value={d.asansör} onChange={e=>set({asansör: e.target.value})}><option>Var</option><option>Yok</option></select></Field>
              <Field label="Otopark"><select value={d.otopark} onChange={e=>set({otopark: e.target.value})}><option>Kapalı</option><option>Açık</option><option>Yok</option></select></Field>
              <Field label="Balkon"><select value={d.balkon} onChange={e=>set({balkon: e.target.value})}><option>Var</option><option>Yok</option></select></Field>
              <Field label="Eşyalı"><select value={d.esyali} onChange={e=>set({esyali: e.target.value})}><option>Evet</option><option>Hayır</option></select></Field>
              <Field label="İnternet Altyapısı"><select value={d.internet} onChange={e=>set({internet: e.target.value})}><option>Fiber</option><option>ADSL</option><option>Yok</option></select></Field>
              <Field label="Manzara"><select value={d.manzara} onChange={e=>set({manzara: e.target.value})}><option>Şehir</option><option>Doğa</option><option>Park & Yeşil Alan</option><option>Deniz</option></select></Field>
              <Field label="Hayvan Dostu"><select value={d.hayvanDostu} onChange={e=>set({hayvanDostu: e.target.value})}><option>Evet</option><option>Hayır</option></select></Field>
            </div>
          </div>
          <div style={{ background: "#F9FAFB", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text)" }}>Mülk Fotoğrafları (6 Adet)</h4>
            <div className="hy-form-grid">
              {[0,1,2,3,4,5].map(idx=>(
                <input key={idx} placeholder={`Fotoğraf URL ${idx+1}`} value={d.photos[idx]||""} onChange={e=>{
                  const p = [...(d.photos || ["","","","","",""])]; p[idx] = e.target.value; set({photos: p});
                }} style={{marginBottom: 6}} />
              ))}
            </div>
          </div>
        </div>
        <div className="hy-modal-footer">
          <button type="button" className="hy-btn primary" onClick={finishWizard}><Check size={15}/> {editingProperty ? "Değişiklikleri Kaydet" : "Mülkü Kaydet"}</button>
        </div>
      </Modal>
    );
  }

  function handleSimulateOCR(type) {
    if (type === 'adam') {
      setContractScanForm({
        tasinmazNo: "hasyek.34.12",
        propertyAd: "Sima Garden C Blok Daire 12 (1+1)",
        ilce: "Pendik/Yenişehir Mah.",
        landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
        tenantName: "ADAM KHODR",
        tenantPhone: "05352393129",
        tenantTc: "99258838596",
        tenantAddress: "OKAN ÜNİVERSİTESİNDE TIP ÖĞRENCİ 5. SENE",
        rentAmount: "30000",
        startDate: "2026-06-25",
        docUrl: contractScanForm.docUrl
      });
    } else {
      setContractScanForm({
        tasinmazNo: "hasyek.34.02",
        propertyAd: "Sima Garden Giriş Kat Daire 02 (2+1)",
        ilce: "Pendik/Yenişehir Mah.",
        landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
        tenantName: "BERKAY KAFALI",
        tenantPhone: "05438560195",
        tenantTc: "34336927052",
        tenantAddress: "YENİŞEHİR MAH. SİMA GARDEN REYHAN CAD. NO:43A BLOK DAİRE 2 PENDİK İSTANBUL",
        rentAmount: "33000",
        startDate: "2026-06-13",
        docUrl: contractScanForm.docUrl
      });
    }
  }

  function renderKontratKayitTab() {
    return (
      <div className="hy-panel">
        <h2 style={{marginTop:0}}>Kira Kontratı Otomatik Kayıt</h2>
        <p className="muted">Kontrat belgesini yükleyin ve tek tıkla mülk, kiracı ve 12 aylık ödemeleri / senet takiplerini otomatik başlatın.</p>
        
        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
          <button className="hy-btn ghost sm" onClick={() => handleSimulateOCR('adam')}>📄 Adam Khodr Örneğini Yükle</button>
          <button className="hy-btn ghost sm" onClick={() => handleSimulateOCR('berkay')}>📄 Berkay Kafalı Örneğini Yükle</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
          <div className="hy-form-grid">
            <Field label="Taşınmaz Numarası"><input value={contractScanForm.tasinmazNo} onChange={e=>setContractScanForm({...contractScanForm, tasinmazNo: e.target.value})} placeholder="hasyek.34.12" /></Field>
            <Field label="Mülk Adı / Detayı"><input value={contractScanForm.propertyAd} onChange={e=>setContractScanForm({...contractScanForm, propertyAd: e.target.value})} placeholder="Daire 12" /></Field>
            <Field label="İl / İlçe / Mahalle"><input value={contractScanForm.ilce} onChange={e=>setContractScanForm({...contractScanForm, ilce: e.target.value})} placeholder="Pendik/Yenişehir" /></Field>
            <Field label="Kiraya Veren (Malik)"><input value={contractScanForm.landlordName} onChange={e=>setContractScanForm({...contractScanForm, landlordName: e.target.value})} placeholder="HAS YEK YAPI..." /></Field>
            <Field label="Kiracı Adı Soyadı"><input value={contractScanForm.tenantName} onChange={e=>setContractScanForm({...contractScanForm, tenantName: e.target.value})} placeholder="ADAM KHODR" /></Field>
            <Field label="Kiracı Telefon"><input value={contractScanForm.tenantPhone} onChange={e=>setContractScanForm({...contractScanForm, tenantPhone: e.target.value})} placeholder="05..." /></Field>
            <Field label="Kiracı T.C. Kimlik No"><input value={contractScanForm.tenantTc} onChange={e=>setContractScanForm({...contractScanForm, tenantTc: e.target.value})} placeholder="99..." /></Field>
            <Field label="Kiracı Adresi"><input value={contractScanForm.tenantAddress} onChange={e=>setContractScanForm({...contractScanForm, tenantAddress: e.target.value})} placeholder="Adres" /></Field>
            <Field label="Aylık Kira Bedeli (₺)"><input type="number" value={contractScanForm.rentAmount} onChange={e=>setContractScanForm({...contractScanForm, rentAmount: e.target.value})} /></Field>
            <Field label="Akdin Başlangıç Tarihi"><input type="date" value={contractScanForm.startDate} onChange={e=>setContractScanForm({...contractScanForm, startDate: e.target.value})} /></Field>
            
            <div className="span-2" style={{marginTop: 10}}>
              <button className="hy-btn primary" onClick={() => {
                if(!contractScanForm.tasinmazNo || !contractScanForm.tenantName) {
                  alert("Taşınmaz Numarası ve Kiracı Adı alanları boş bırakılamaz!");
                  return;
                }
                
                const propertyId = uid();
                const newProp = {
                  id: propertyId,
                  tasinmazNo: contractScanForm.tasinmazNo,
                  ad: contractScanForm.propertyAd,
                  ilce: contractScanForm.ilce,
                  malikAdi: contractScanForm.landlordName,
                  photos: contractScanForm.docUrl ? [contractScanForm.docUrl] : ["","","","","",""]
                };
                saveProperty(newProp);

                const tenantId = uid();
                const newTenant = {
                  id: tenantId,
                  name: contractScanForm.tenantName,
                  phone: contractScanForm.tenantPhone,
                  tc: contractScanForm.tenantTc,
                  address: contractScanForm.tenantAddress,
                  role: "Kiracı"
                };
                savePerson(newTenant);

                const startDt = new Date(contractScanForm.startDate);
                const endDt = new Date(startDt);
                endDt.setFullYear(endDt.getFullYear() + 1);
                const endDateStr = endDt.toISOString().slice(0, 10);

                const contractId = uid();
                const newContract = {
                  id: contractId,
                  propertyId,
                  tenantId,
                  rentAmount: contractScanForm.rentAmount,
                  startDate: contractScanForm.startDate,
                  endDate: endDateStr,
                  status: "Aktif"
                };
                saveContract(newContract);

                const generatedPayments = [];
                const generatedNotes = [];
                let currDt = new Date(startDt);
                for (let i = 0; i < 12; i++) {
                  const dueDateStr = currDt.toISOString().slice(0, 10);
                  generatedPayments.push({
                    id: uid(),
                    contractId,
                    amount: contractScanForm.rentAmount,
                    dueDate: dueDateStr,
                    paidAmount: i === 0 ? contractScanForm.rentAmount : 0,
                    paidDate: i === 0 ? dueDateStr : null
                  });

                  generatedNotes.push({
                    id: uid(),
                    tenantId,
                    tenantName: contractScanForm.tenantName,
                    senetNo: `${i+1}/12`,
                    amount: contractScanForm.rentAmount,
                    dueDate: dueDateStr,
                    status: i === 0 ? "Alındı" : "Eksik",
                    scanUrl: ""
                  });

                  currDt.setMonth(currDt.getMonth() + 1);
                }

                persist(STORAGE_KEYS.payments, [...payments, ...generatedPayments], setPayments);
                saveNotes([...promissoryNotes, ...generatedNotes]);

                alert("Sözleşme, mülk, kiracı, ödemeler ve 12 adet senet takibi başarıyla oluşturuldu!");
                setContractScanForm({ tasinmazNo: "", propertyAd: "", ilce: "", landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.", tenantName: "", tenantPhone: "", tenantTc: "", tenantAddress: "", rentAmount: "", startDate: todayStr(), docUrl: "" });
              }}>
                <Check size={16}/> Sözleşmeyi Başlat & Otomatik Borçlandır & Senetleri Oluştur
              </button>
            </div>
          </div>

          <div style={{ background: "#f8f9fa", padding: 14, borderRadius: 12, border: "1px dashed var(--border)" }}>
            <h4 style={{marginTop:0}}>Kontrat PDF / Fotoğraf Yükle</h4>
            <p className="muted small">Kontrat belgesini yükleyin ve sağ alanda ön izleyin.</p>
            <input type="file" accept="image/*,.pdf" onChange={(e)=>{
              const file = e.target.files[0];
              if(file) {
                const url = URL.createObjectURL(file);
                setContractScanForm({...contractScanForm, docUrl: url});
              }
            }} style={{marginBottom: 10}} />

            {contractScanForm.docUrl ? (
              <div style={{ height: 300, background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                <img src={contractScanForm.docUrl} alt="Kontrat Ön İzleme" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            ) : (
              <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-soft)" }}>
                Ön izleme için kontrat dosyası seçin
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // AYRI BİR HEADER (SEKME) OLAN SENET YÖNETİMİ EKRANI
  function renderSenetlerTab() {
    const missingCount = promissoryNotes.filter(n => n.status === "Eksik").length;
    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Senet Yönetimi</h1>
            <p className="hy-page-sub">Kiracılardan alınan 12 adet ıslak imzalı senetlerin takibi ve şablona uygun senet oluşturma</p>
          </div>
          <div>
            <button className="hy-btn primary" onClick={() => {
              setPrintNoteData({
                kesideTarihi: todayStr(),
                kesideYeri: "İSTANBUL",
                odemeTarihi: todayStr(),
                tutar: "33000",
                senetNo: "1/12",
                borcluAdi: "",
                borcluTc: "",
                borcluAdres: ""
              });
              setPrintModalOpen(true);
            }}>
              <Printer size={16}/> Yeni Senet Taslağı Hazırla / Yazdır
            </button>
          </div>
        </div>

        {missingCount > 0 && (
          <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: "#991B1B" }}>
            <Receipt size={20} />
            <div>
              <strong>Eksik Senet Uyarısı:</strong> Sistemde teslim alınmamış veya taranmamış {missingCount} adet senet bulunmaktadır.
            </div>
          </div>
        )}

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Tüm Senet Listesi</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left", color: "var(--text-soft)" }}>
                <th style={{ padding: 12 }}>Kiracı</th>
                <th style={{ padding: 12 }}>Senet No</th>
                <th style={{ padding: 12 }}>Vade Tarihi</th>
                <th style={{ padding: 12 }}>Tutar</th>
                <th style={{ padding: 12 }}>Senet Durumu</th>
                <th style={{ padding: 12, textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {promissoryNotes.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 20, textAlign: "center", color: "var(--text-soft)" }}>Kayıtlı senet bulunmuyor. Kontrat kayıt sekmesinden sözleşme başlattığınızda senetler otomatik oluşur.</td></tr>
              ) : (
                promissoryNotes.map(n => (
                  <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: "600" }}>{n.tenantName}</td>
                    <td style={{ padding: 12 }}>{n.senetNo}</td>
                    <td style={{ padding: 12 }}>{fmtDate(n.dueDate)}</td>
                    <td style={{ padding: 12, fontWeight: "600" }}>{fmtMoney(n.amount)}</td>
                    <td style={{ padding: 12 }}><StatusPill status={n.status} /></td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="hy-btn ghost sm" onClick={() => {
                          const newSt = n.status === "Alındı" ? "Eksik" : "Alındı";
                          const updated = promissoryNotes.map(item => item.id === n.id ? {...item, status: newSt} : item);
                          saveNotes(updated);
                        }}>
                          {n.status === "Alındı" ? "Eksik İşaretle" : "Alındı Yap"}
                        </button>
                        <button className="hy-btn primary sm" onClick={() => {
                          setPrintNoteData({
                            kesideTarihi: todayStr(),
                            kesideYeri: "İSTANBUL",
                            odemeTarihi: n.dueDate,
                            tutar: n.amount,
                            senetNo: n.senetNo,
                            borcluAdi: n.tenantName,
                            borcluTc: "",
                            borcluAdres: ""
                          });
                          setPrintModalOpen(true);
                        }}>
                          Yazdır
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Senet Düzenleme & Yazdırma Modalı */}
        {printModalOpen && (
          <Modal title="Senet Taslağı Oluştur ve Yazdır" onClose={() => setPrintModalOpen(false)} wide>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="hy-form-grid">
                  <Field label="Keşide Tarihi"><input type="date" value={printNoteData.kesideTarihi} onChange={e=>setPrintNoteData({...printNoteData, kesideTarihi: e.target.value})} /></Field>
                  <Field label="Keşide Yeri"><input value={printNoteData.kesideYeri} onChange={e=>setPrintNoteData({...printNoteData, kesideYeri: e.target.value})} /></Field>
                  <Field label="Ödeme Vade Tarihi"><input type="date" value={printNoteData.odemeTarihi} onChange={e=>setPrintNoteData({...printNoteData, odemeTarihi: e.target.value})} /></Field>
                  <Field label="Senet No"><input value={printNoteData.senetNo} onChange={e=>setPrintNoteData({...printNoteData, senetNo: e.target.value})} /></Field>
                  <Field label="Tutar (₺)"><input type="number" value={printNoteData.tutar} onChange={e=>setPrintNoteData({...printNoteData, tutar: e.target.value})} /></Field>
                  <Field label="Borçlu Adı Soyadı"><input value={printNoteData.borcluAdi} onChange={e=>setPrintNoteData({...printNoteData, borcluAdi: e.target.value})} /></Field>
                  <Field label="Borçlu T.C. No"><input value={printNoteData.borcluTc} onChange={e=>setPrintNoteData({...printNoteData, borcluTc: e.target.value})} /></Field>
                  <Field label="Borçlu Adresi" span><input value={printNoteData.borcluAdres} onChange={e=>setPrintNoteData({...printNoteData, borcluAdres: e.target.value})} /></Field>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button className="hy-btn primary" onClick={() => window.print()}><Printer size={16}/> Yazdır / PDF İndir</button>
                </div>
              </div>

              {/* Senet Önizleme Alanı */}
              <div id="printable-senet" style={{ background: "#fff", border: "2px solid #111", padding: 20, borderRadius: 8, fontSize: "12px", fontFamily: "monospace", color: "#000" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #111", paddingBottom: 8, marginBottom: 10 }}>
                  <div><strong>Keşide Tarihi:</strong> {fmtDate(printNoteData.kesideTarihi)}</div>
                  <div><strong>Keşide Yeri:</strong> {printNoteData.kesideYeri}</div>
                  <div><strong>Ödeme Tarihi:</strong> {fmtDate(printNoteData.odemeTarihi)}</div>
                  <div><strong>Tutar:</strong> #{fmtMoney(printNoteData.tutar)}#</div>
                  <div><strong>Senet No:</strong> {printNoteData.senetNo}</div>
                </div>
                <p style={{ lineHeight: 1.6 }}>
                  İşbu emre yazılı senet mukabilinde <strong>{fmtDate(printNoteData.odemeTarihi)}</strong> tarihinde <strong>HAS YEK YAPI İNŞAAT TİCARET A.Ş.</strong> veyahut emrühavalesine yukarıda yazılı #{printNoteData.tutar} Türk Lirası# ödeyeceğim. Bedeli NAKDEN ahzolunmuştur. İşbu bononun gününde ödenmemesi halinde diğer bonoların da muacceliyet kazanacağını, bu durumda icra masraflarını ve avukatlık ücretini ödeyeceğimi, ihtilaf halinde <strong>ANADOLU MAHKEMELERİ</strong> mahkemeleri ve icra dairelerinin yetkili olduğunu şimdiden kabul ediyorum.
                </p>
                <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>Borçlu:</strong> {printNoteData.borcluAdi || "—"}<br/>
                    <strong>T.C./Vergi No:</strong> {printNoteData.borcluTc || "—"}<br/>
                    <strong>Adres:</strong> {printNoteData.borcluAdres || "—"}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>İmza:</strong><br/><br/><br/>
                    (Islak İmza)
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderPropertiesList() {
    const filtered = properties.filter((p) => propertyStatusFilter === "Tümü" || propertyStatus(p.id) === propertyStatusFilter);
    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Mülklerim</h1><p className="hy-page-sub">{properties.length} kayıtlı mülk</p></div>
          <div className="hy-toolbar-right">
            <select value={propertyStatusFilter} onChange={(e) => setPropertyStatusFilter(e.target.value)}><option>Tümü</option><option>Kirada</option><option>Boşta</option></select>
          </div>
        </div>
        {filtered.length === 0 ? <p className="hy-empty">Henüz mülk eklenmedi.</p> : (
          <div className="hy-property-grid">
            {filtered.map((p) => {
              const active = activeContractOf(p.id);
              const status = propertyStatus(p.id);
              return (
                <div key={p.id} className="hy-property-card" onClick={() => { setSelectedPropertyId(p.id); setPropertyDetailTab("odeme_akisi"); }}>
                  <div className="hy-property-img">
                    {p.photos && p.photos[0] ? <img src={p.photos[0]} alt="" /> : <Building2 size={30} />}
                    <span className={"hy-status-badge " + (status === "Kirada" ? "good" : "neutral")}>{status}</span>
                  </div>
                  <div className="hy-property-body">
                    <div className="hy-property-title">{p.tasinmazNo} {p.ad && <span className="muted">· {p.ad}</span>}</div>
                    <div className="hy-property-addr">{[p.ilce, p.il].filter(Boolean).join(", ") || "Adres yok"}</div>
                    <div className="hy-property-meta" style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                      <span><strong>{active ? fmtMoney(active.rentAmount) : "Boş"}</strong></span>
                      <button className="hy-btn ghost sm" onClick={(e) => { e.stopPropagation(); openWizard(p); }}><Pencil size={12}/> Düzenle</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button className="hy-fab" onClick={() => openWizard()} title="Mülk Ekle"><Plus size={22} /></button>
        {renderPropertyWizard()}
      </>
    );
  }

  function renderPropertyDetail() {
    const p = properties.find((x) => x.id === selectedPropertyId);
    if (!p) { setSelectedPropertyId(null); return null; }

    const activeContract = activeContractOf(p.id);
    const tenant = activeContract ? people.find(t => t.id === activeContract.tenantId) : null;
    const propPayments = activeContract ? payments.filter(pt => pt.contractId === activeContract.id) : [];

    const totalDebt = propPayments.filter(pt => paymentStatus(pt) === "Gecikti").reduce((s, x) => s + Number(x.amount), 0);
    const overdueCount = propPayments.filter(pt => paymentStatus(pt) === "Gecikti").length;

    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, position: "relative" }}>
          <button className="hy-back-link" onClick={() => setSelectedPropertyId(null)}><ArrowLeft size={15} /> Mülklerime Dön</button>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="hy-btn ghost sm" style={{ padding: "6px 10px", borderRadius: 8, background: "#fff", border: "1px solid var(--border)" }} onClick={() => setPropMenuOpen(!propMenuOpen)}>
              <MoreHorizontal size={18} />
            </button>

            {propMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: 40, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 50, width: 160, padding: 6 }}>
                <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setPropMenuOpen(false); alert("Talep iletildi."); }}>Talep ilet</button>
                <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setPropMenuOpen(false); openWizard(p); }}>Mülküyü düzenle</button>
                <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 12px", fontSize: "13px", cursor: "pointer", borderRadius: 6, color: "#C62828", fontWeight: "600" }} onClick={() => { setPropMenuOpen(false); setDeleteConfirmOpen(true); }}>Mülkü sil</button>
              </div>
            )}
          </div>
        </div>

        {deleteConfirmOpen && (
          <div className="hy-modal-backdrop" onClick={() => setDeleteConfirmOpen(false)}>
            <div className="hy-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "18px" }}>Mülkü silmek istediğinizden emin misiniz?</h3>
              <p className="muted" style={{ fontSize: "13.5px", marginBottom: 24 }}>Bu işlem geri alınamaz. Mülke ait tüm veriler kalıcı olarak silinecek.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="hy-btn ghost" onClick={() => setDeleteConfirmOpen(false)}>Vazgeç</button>
                <button className="hy-btn primary" style={{ background: "#C62828", borderColor: "#C62828" }} onClick={() => {
                  deletePropertyCompletely(p.id);
                  setDeleteConfirmOpen(false);
                }}>Sil</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "16px", color: "#374151" }}>
              {initials(tenant ? tenant.name : "Yok")}
            </div>
            <div>
              <h4 style={{ margin: "0 0 2px", fontSize: "15px" }}>{tenant ? tenant.name : "Kiracı Yok"}</h4>
              <span className="muted small">{tenant ? "Aktif kiracı" : "Boş Mülk"}</span>
            </div>
          </div>
          
          <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "18px", fontWeight: "700" }}>{activeContract ? fmtMoney(activeContract.rentAmount) : "—"}</div>
            <div style={{ fontSize: "11.5px", color: "var(--success)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>Ödendi <Check size={12}/></div>
          </div>

          <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "18px", fontWeight: "700" }}>{overdueCount} Dönem</div>
            <div className="muted small" style={{ marginTop: 6 }}>Geciken kira sayısı</div>
          </div>

          <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: totalDebt > 0 ? "#C62828" : "inherit" }}>{fmtMoney(totalDebt)}</div>
            <div className="muted small" style={{ marginTop: 6 }}>Kiracı borcu</div>
          </div>
        </div>

        <div className="hy-tabs2" style={{ background: "#fff", padding: "0 10px", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 }}>
          {[
            ["odeme_akisi", "Ödeme akışı"],
            ["detaylar", "Mülk detayları"],
            ["sozlesme", "Kira sözleşmesi bilgileri"],
            ["senetler", "Senetler Takibi"],
            ["belgeler", "Belgeler"]
          ].map(([k, l]) => (
            <button key={k} className={"hy-tab2" + (propertyDetailTab === k ? " active" : "")} onClick={() => setPropertyDetailTab(k)}>{l}</button>
          ))}
        </div>

        {propertyDetailTab === "odeme_akisi" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Kira ödeme akışı</h3>
              <button className="hy-btn primary sm" onClick={() => setAddPaymentModalOpen(true)}><Plus size={14} /> Geçmiş ödeme ekle +</button>
            </div>
            
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 12px" }}>Durum</th>
                  <th style={{ padding: "10px 12px" }}>Kira dönemi</th>
                  <th style={{ padding: "10px 12px" }}>Ödeme tarihi</th>
                  <th style={{ padding: "10px 12px" }}>Kiracı</th>
                  <th style={{ padding: "10px 12px" }}>Tutar</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Ödenen</th>
                </tr>
              </thead>
              <tbody>
                {propPayments.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Bu mülke ait ödeme akışı kaydı bulunamadı.</td></tr>
                ) : (
                  propPayments.map(pt => (
                    <tr key={pt.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px" }}><StatusPill status={paymentStatus(pt)} /></td>
                      <td style={{ padding: "12px" }}>{fmtDate(pt.dueDate)}</td>
                      <td style={{ padding: "12px" }}>{fmtDate(pt.paidDate)}</td>
                      <td style={{ padding: "12px" }}>{tenant ? tenant.name : "—"}</td>
                      <td style={{ padding: "12px" }}>{fmtMoney(pt.amount)}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{fmtMoney(pt.paidAmount || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {propertyDetailTab === "senetler" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3>Mülke Ait Senetler</h3>
            <p className="muted small">Bu mülkte oturan kiracıya ait senetlerin listesi.</p>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left", color: "var(--text-soft)" }}>
                  <th style={{ padding: 10 }}>Senet No</th>
                  <th style={{ padding: 10 }}>Vade</th>
                  <th style={{ padding: 10 }}>Tutar</th>
                  <th style={{ padding: 10 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {tenant ? (
                  promissoryNotes.filter(n => n.tenantId === tenant.id).map(n => (
                    <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10 }}>{n.senetNo}</td>
                      <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                      <td style={{ padding: 10 }}>{fmtMoney(n.amount)}</td>
                      <td style={{ padding: 10 }}><StatusPill status={n.status} /></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ padding: 16, textAlign: "center" }}>Kiracı bulunmuyor.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {addPaymentModalOpen && (
          <Modal title="Geçmiş Ödeme Ekle" onClose={() => setAddPaymentModalOpen(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="kdvCheck" checked={paymentForm.kdvLi} onChange={e=>setPaymentForm({...paymentForm, kdvLi: e.target.checked})} />
                <label htmlFor="kdvCheck" style={{ fontSize: "13.5px", fontWeight: "600", cursor: "pointer" }}>KDV'li Kiralama</label>
              </div>

              {paymentForm.kdvLi && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#F9FAFB", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <Field label="KDV Durumu*">
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}><input type="radio" name="kdv" defaultChecked /> KDV Dahil</label>
                      <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}><input type="radio" name="kdv" /> KDV Hariç</label>
                    </div>
                  </Field>
                  <Field label="KDV Oranı (%)*"><input type="number" value={paymentForm.kdvOrani} onChange={e=>setPaymentForm({...paymentForm, kdvOrani: e.target.value})} /></Field>
                </div>
              )}

              <Field label="Aylık Kira Tutarı*">
                <input type="number" value={paymentForm.tutar} onChange={e=>setPaymentForm({...paymentForm, tutar: e.target.value})} />
              </Field>

              <div className="hy-form-grid">
                <Field label="Dönem Seçimi*">
                  <select value={paymentForm.donemAy} onChange={e=>setPaymentForm({...paymentForm, donemAy: e.target.value})}>
                    {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Yıl*">
                  <select value={paymentForm.donemYil} onChange={e=>setPaymentForm({...paymentForm, donemYil: e.target.value})}>
                    {["2025", "2026", "2027"].map(y=><option key={y}>{y}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Ödeme Durumu*">
                <select value={paymentForm.durum} onChange={e=>setPaymentForm({...paymentForm, durum: e.target.value})}>
                  <option>Ödenmedi</option>
                  <option>Ödendi</option>
                </select>
              </Field>
            </div>

            <div className="hy-modal-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="hy-btn ghost" onClick={() => setAddPaymentModalOpen(false)}>‹ İptal</button>
              <button className="hy-btn primary" onClick={() => {
                if(!activeContract) { alert("Aktif sözleşme bulunamadı!"); return; }
                const isPaid = paymentForm.durum === "Ödendi";
                const newP = {
                  id: uid(),
                  contractId: activeContract.id,
                  amount: paymentForm.tutar,
                  dueDate: todayStr(),
                  paidAmount: isPaid ? paymentForm.tutar : 0,
                  paidDate: isPaid ? todayStr() : null
                };
                persist(STORAGE_KEYS.payments, [...payments, newP], setPayments);
                setAddPaymentModalOpen(false);
                alert("Geçmiş ödeme başarıyla eklendi!");
              }}>Ekle ›</button>
            </div>
          </Modal>
        )}

        {propertyDetailTab === "detaylar" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3>Mülk Detayları & Fotoğraflar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "16px 0" }}>
              {(p.photos || []).filter(Boolean).length === 0 ? <p className="hy-empty">Fotoğraf eklenmemiş.</p> : (
                p.photos.filter(Boolean).map((img, i) => (
                  <div key={i} style={{ height: 160, background: "#eee", borderRadius: 8, overflow: "hidden" }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {propertyDetailTab === "sozlesme" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3>Kira Sözleşmesi Bilgileri</h3>
            {activeContract ? (
              <div style={{ marginTop: 14 }}>
                <p><strong>Kiracı:</strong> {tenant ? tenant.name : "—"}</p>
                <p><strong>Aylık Kira Bedeli:</strong> {fmtMoney(activeContract.rentAmount)}</p>
                <p><strong>Başlangıç Tarihi:</strong> {fmtDate(activeContract.startDate)}</p>
                <p><strong>Bitiş Tarihi:</strong> {fmtDate(activeContract.endDate)}</p>
              </div>
            ) : <p className="hy-empty">Bu mülkte aktif sözleşme bulunmuyor.</p>}
          </div>
        )}

        {propertyDetailTab === "belgeler" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3>Mülk Belgeleri</h3>
            <p className="muted">Kontrat ve senet belgelerini buraya yükleyebilirsiniz.</p>
          </div>
        )}
      </>
    );
  }

  function renderTenantsList() {
    if (selectedTenantId) {
      const tenant = people.find(t => t.id === selectedTenantId);
      if (!tenant) { setSelectedTenantId(null); return null; }
      const tenantContracts = contracts.filter(c => c.tenantId === tenant.id);
      const prop = tenantContracts[0] ? properties.find(pr => pr.id === tenantContracts[0].propertyId) : null;
      const tenantPayments = payments.filter(pt => tenantContracts.some(c => c.id === pt.contractId));
      const totalDebt = tenantPayments.filter(pt => paymentStatus(pt) === "Gecikti").reduce((s, x) => s + Number(x.amount), 0);
      const rentAmount = tenantContracts[0] ? tenantContracts[0].rentAmount : 0;
      const remDays = tenantContracts[0] && tenantContracts[0].endDate ? daysUntil(tenantContracts[0].endDate) : null;
      const remMonths = remDays !== null ? Math.round(remDays / 30) : 11;

      return (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button className="hy-back-link" onClick={() => setSelectedTenantId(null)}><ArrowLeft size={15} /> Kiracılara Dön</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="hy-btn ghost sm" onClick={() => { setTenantEditDraft(tenant); setTenantEditModalOpen(true); }}><Pencil size={14}/> Düzenle</button>
              <button className="hy-btn danger sm" onClick={() => {
                if(confirm("Bu kiracıyı silmek istediğinizden emin misiniz?")) {
                  deleteTenantCompletely(tenant.id);
                }
              }}><Trash2 size={14}/> Sil</button>
              {prop && (
                <button className="hy-btn ghost sm" onClick={() => { setSelectedPropertyId(prop.id); setTab("mulkler"); }}>
                  Mülke Git <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="hy-topbar" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 className="hy-page-title" style={{ margin: 0 }}>{tenant.name}</h1>
                <span className="hy-pill-badge good" style={{ padding: "4px 10px", fontSize: "12px" }}>Aktif Kiracı</span>
              </div>
              <p className="hy-page-sub" style={{ marginTop: 4 }}>
                {prop ? `${prop.tasinmazNo} · ${[prop.ilce, prop.il].filter(Boolean).join(", ")}` : "Mülk atanmamış"}
              </p>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
              <span className="muted small">Toplam Borç</span>
              <div style={{ fontSize: "20px", fontWeight: "700", marginTop: 4, color: totalDebt > 0 ? "#C62828" : "inherit" }}>{fmtMoney(totalDebt)}</div>
            </div>
            <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
              <span className="muted small">Güncel Kira Bedeli</span>
              <div style={{ fontSize: "20px", fontWeight: "700", marginTop: 4 }}>{fmtMoney(rentAmount)}</div>
            </div>
            <div style={{ background: "#F9FAFB", padding: 14, borderRadius: 14, border: "1px solid var(--border)" }}>
              <span className="muted small">Sözleşme Bitişine Kalan Süre</span>
              <div style={{ fontSize: "20px", fontWeight: "700", marginTop: 4 }}>{remMonths > 0 ? `${remMonths} ay` : `${Math.max(0, remDays)} gün`}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", marginBottom: 20, paddingBottom: 2 }}>
            {[["borclar", "Borçlar"], ["senetler", "Senetler"], ["bilgiler", "Kiracı Bilgileri"]].map(([k, l]) => (
              <button key={k} onClick={() => setTenantDetailTab(k)} style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14px", fontWeight: tenantDetailTab === k ? "700" : "500", color: tenantDetailTab === k ? "var(--text)" : "var(--text-soft)", borderBottom: tenantDetailTab === k ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>

          {tenantDetailTab === "borclar" && (
            <div className="hy-panel" style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Borç Kalemleri</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 12px" }}>Borç Türü</th>
                    <th style={{ padding: "10px 12px" }}>Vade Tarihi</th>
                    <th style={{ padding: "10px 12px" }}>Durum</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantPayments.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Borç kaydı bulunmuyor.</td></tr>
                  ) : (
                    tenantPayments.map(pt => (
                      <tr key={pt.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px", fontWeight: "600" }}>Kira</td>
                        <td style={{ padding: "12px" }}>{fmtDate(pt.dueDate)}</td>
                        <td style={{ padding: "12px" }}><StatusPill status={paymentStatus(pt)} /></td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{fmtMoney(pt.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tenantDetailTab === "senetler" && (
            <div className="hy-panel" style={{ padding: 24 }}>
              <h3>Kiracıya Ait Senetler (12 Adet)</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa", textAlign: "left", color: "var(--text-soft)" }}>
                    <th style={{ padding: 10 }}>Senet No</th>
                    <th style={{ padding: 10 }}>Vade</th>
                    <th style={{ padding: 10 }}>Tutar</th>
                    <th style={{ padding: 10 }}>Senet Durumu</th>
                    <th style={{ padding: 10, textAlign: "right" }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {promissoryNotes.filter(n => n.tenantId === tenant.id).length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 16, textAlign: "center" }}>Senet kaydı bulunamadı.</td></tr>
                  ) : (
                    promissoryNotes.filter(n => n.tenantId === tenant.id).map(n => (
                      <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10 }}>{n.senetNo}</td>
                        <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                        <td style={{ padding: 10 }}>{fmtMoney(n.amount)}</td>
                        <td style={{ padding: 10 }}><StatusPill status={n.status} /></td>
                        <td style={{ padding: 10, textAlign: "right" }}>
                          <button className="hy-btn ghost sm" onClick={() => {
                            const newSt = n.status === "Alındı" ? "Eksik" : "Alındı";
                            const updated = promissoryNotes.map(item => item.id === n.id ? {...item, status: newSt} : item);
                            saveNotes(updated);
                          }}>
                            {n.status === "Alındı" ? "Eksik Yap" : "Alındı Yap"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tenantDetailTab === "bilgiler" && (
            <div className="hy-panel" style={{ padding: 24 }}>
              <h3>Kiracı İletişim Bilgileri</h3>
              <p><strong>Ad Soyad:</strong> {tenant.name}</p>
              <p><strong>Telefon:</strong> {tenant.phone || "—"}</p>
              <p><strong>T.C. Kimlik No:</strong> {tenant.tc || "—"}</p>
              <p><strong>Adres:</strong> {tenant.address || "—"}</p>
            </div>
          )}

          {tenantEditModalOpen && tenantEditDraft && (
            <Modal title="Kiracı Bilgilerini Düzenle" onClose={() => setTenantEditModalOpen(false)}>
              <div className="hy-form-grid">
                <Field label="Ad Soyad"><input value={tenantEditDraft.name} onChange={e=>setTenantEditDraft({...tenantEditDraft, name: e.target.value})} /></Field>
                <Field label="Telefon"><input value={tenantEditDraft.phone||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, phone: e.target.value})} /></Field>
                <Field label="T.C. Kimlik No"><input value={tenantEditDraft.tc||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, tc: e.target.value})} /></Field>
                <Field label="Adres" span><input value={tenantEditDraft.address||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, address: e.target.value})} /></Field>
              </div>
              <div className="hy-modal-footer">
                <button className="hy-btn primary" onClick={() => {
                  savePerson(tenantEditDraft);
                  setTenantEditModalOpen(false);
                }}><Check size={14}/> Kaydet</button>
              </div>
            </Modal>
          )}
        </>
      );
    }

    const tenants = people.filter((p) => p.role === "Kiracı");
    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Kiracılarım</h1><p className="hy-page-sub">{tenants.length} kayıtlı kiracı</p></div>
        </div>

        <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", marginBottom: 20, paddingBottom: 2 }}>
          {[["aktif", "Aktif Kiracılar"], ["eski", "Eski Kiracılar"]].map(([k, l]) => (
            <button key={k} onClick={() => setTenantSubTab(k)} style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14.5px", fontWeight: tenantSubTab === k ? "700" : "500", color: tenantSubTab === k ? "var(--text)" : "var(--text-soft)", borderBottom: tenantSubTab === k ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>

        {tenants.length === 0 ? <p className="hy-empty">Kayıtlı kiracı yok.</p> : (
          <div className="hy-panel" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
                  <th style={{ padding: "12px 16px" }}>Kiracı</th>
                  <th style={{ padding: "12px 16px" }}>Mülk</th>
                  <th style={{ padding: "12px 16px" }}>Sözleşme & Süre</th>
                  <th style={{ padding: "12px 16px" }}>Kira Tutarı</th>
                  <th style={{ padding: "12px 16px" }}>Toplam Borç</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const tCont = contracts.find(c => c.tenantId === t.id);
                  const prop = tCont ? properties.find(pr => pr.id === tCont.propertyId) : null;
                  const tPay = tCont ? payments.filter(pt => pt.contractId === tCont.id) : [];
                  const debt = tPay.filter(pt => paymentStatus(pt) === "Gecikti").reduce((s, x) => s + Number(x.amount), 0);
                  const remDays = tCont && tCont.endDate ? daysUntil(tCont.endDate) : null;
                  const remMonths = remDays !== null ? Math.round(remDays / 30) : 11;
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }} onClick={() => setSelectedTenantId(t.id)}>
                      <td style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="hy-avatar">{initials(t.name)}</div>
                        <div><strong>{t.name}</strong><br/><span className="muted small">{t.phone || "Telefon yok"}</span></div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600" }}>{prop ? prop.tasinmazNo : "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        {tCont ? `${fmtDate(tCont.startDate)} – ${fmtDate(tCont.endDate)}` : "—"}<br/>
                        <span className="muted small">{remMonths > 0 ? `${remMonths} ay` : `${Math.max(0, remDays)} gün`} kaldı</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600" }}>{tCont ? fmtMoney(tCont.rentAmount) : "—"}</td>
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: debt > 0 ? "#C62828" : "inherit" }}>{fmtMoney(debt)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                          <button className="hy-btn ghost sm" title="Düzenle" onClick={() => { setTenantEditDraft(t); setTenantEditModalOpen(true); setSelectedTenantId(t.id); }}><Pencil size={12}/></button>
                          <button className="hy-btn danger sm" title="Sil" onClick={() => {
                            if(confirm("Bu kiracıyı silmek istediğinizden emin misiniz?")) {
                              deleteTenantCompletely(t.id);
                            }
                          }}><Trash2 size={12}/></button>
                          <button className="hy-btn primary sm" onClick={() => setSelectedTenantId(t.id)}>Detaya Git</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tenantEditModalOpen && tenantEditDraft && (
          <Modal title="Kiracı Bilgilerini Düzenle" onClose={() => setTenantEditModalOpen(false)}>
            <div className="hy-form-grid">
              <Field label="Ad Soyad"><input value={tenantEditDraft.name} onChange={e=>setTenantEditDraft({...tenantEditDraft, name: e.target.value})} /></Field>
              <Field label="Telefon"><input value={tenantEditDraft.phone||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, phone: e.target.value})} /></Field>
              <Field label="T.C. Kimlik No"><input value={tenantEditDraft.tc||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, tc: e.target.value})} /></Field>
              <Field label="Adres" span><input value={tenantEditDraft.address||""} onChange={e=>setTenantEditDraft({...tenantEditDraft, address: e.target.value})} /></Field>
            </div>
            <div className="hy-modal-footer">
              <button className="hy-btn primary" onClick={() => {
                savePerson(tenantEditDraft);
                setTenantEditModalOpen(false);
              }}><Check size={14}/> Kaydet</button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderMaintenance() {
    const CATEGORIES = {
      "Usta Hizmetleri": ["Usta Elektrikçi", "Usta Tesisatçı", "Usta Boyacı", "Usta Klimacı", "Usta Kombici", "Usta Mobilyacı"],
      "Taşıma Hizmetleri": ["Evden Eve Taşınma", "Şehirler Arası Taşınma"],
      "Temizlik Hizmetleri": ["Dezenfeksiyon", "Haşere ve Böcek İlaçlama", "Koltuk & Halı Yıkama", "Kuru Temizleme"],
      "Renovasyon Hizmetleri": ["Mimari Tasarım", "İnşai İşler", "Renovasyon (Banyo/Mutfak/Oda)", "Özel Mobilya Üretimi"],
      "Diğer Hizmetler": ["Genel Destek"]
    };

    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Bakım & Onarım</h1></div>
          <button className="hy-btn primary" onClick={() => setMaintModalOpen(true)}><Plus size={16} /> Talep oluştur</button>
        </div>

        {maintenance.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid var(--border)", borderRadius: 16 }}>
            <div style={{ width: 80, height: 80, background: "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#DC2626" }}>
              <Wrench size={36} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Bakım & onarım taleplerinizi iletin.</h3>
            <p className="muted" style={{ maxWidth: 450, margin: "0 auto 24px", fontSize: "13.5px" }}>Mülklerinizdeki bakım ve onarım ihtiyaçları için ilk talebinizi şimdi oluşturun.</p>
            <button className="hy-btn primary" onClick={() => setMaintModalOpen(true)}><Plus size={16} /> Talep oluştur</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {maintenance.map(m => (
              <div key={m.id} className="hy-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{m.category} / {m.service}</strong> — <span className="muted">{propertyName(m.propertyId)}</span>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>{m.description || "Açıklama girilmemiş"}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="hy-btn danger sm" onClick={() => deleteMaintenance(m.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {maintModalOpen && (
          <Modal title="Bakım & Onarım Talebi" onClose={() => setMaintModalOpen(false)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Mülk seçin">
                <select value={maintForm.propertyId} onChange={e=>setMaintForm({...maintForm, propertyId: e.target.value})}>
                  <option value="">Seçin…</option>
                  {properties.map(pr => <option key={pr.id} value={pr.id}>{propertyDisplayName(pr)}</option>)}
                </select>
              </Field>

              <Field label="Kategori seçin">
                <select value={maintForm.category} onChange={e=>{
                  const cat = e.target.value;
                  const firstServ = CATEGORIES[cat] ? CATEGORIES[cat][0] : "";
                  setMaintForm({...maintForm, category: cat, service: firstServ});
                }}>
                  <option value="">Seçin…</option>
                  {Object.keys(CATEGORIES).map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </Field>

              <Field label="Hizmet seçin">
                <select value={maintForm.service} onChange={e=>setMaintForm({...maintForm, service: e.target.value})}>
                  <option value="">Seçin…</option>
                  {(CATEGORIES[maintForm.category] || []).map(serv => <option key={serv}>{serv}</option>)}
                </select>
              </Field>

              <Field label="Açıklama">
                <textarea rows={3} value={maintForm.description} onChange={e=>setMaintForm({...maintForm, description: e.target.value})} placeholder="Arıza detayını yazın..." />
              </Field>
            </div>

            <div className="hy-modal-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="hy-btn ghost" onClick={() => setMaintModalOpen(false)}>‹ İptal et</button>
              <button className="hy-btn primary" onClick={() => {
                if(!maintForm.category || !maintForm.service) { alert("Lütfen kategori ve hizmet seçiniz!"); return; }
                saveMaintenance({ ...maintForm, id: uid() });
                setMaintModalOpen(false);
                setMaintForm({ propertyId: "", category: "", service: "", description: "", technicianPhone: "" });
              }}>Talep oluştur ›</button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderMuhasebe() {
    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Ödemeler & Muhasebe</h1></div>
          <div className="hy-filter-pills">
            <button className={"hy-pill" + (acctSubTab === "tablo" ? " active" : "")} onClick={() => setAcctSubTab("tablo")}>Tablolar</button>
            <button className={"hy-pill" + (acctSubTab === "excel" ? " active" : "")} onClick={() => setAcctSubTab("excel")}>Excel Raporları İndir</button>
          </div>
        </div>
        {acctSubTab === "tablo" && (
          <div className="hy-panel">
            <h3>Finansal Özet</h3>
            <p className="muted">Bu ay tahsil edilen: <strong>{fmtMoney(thisMonthCollected)}</strong></p>
          </div>
        )}
        {acctSubTab === "excel" && (
          <div className="hy-panel">
            <h3>Excel Raporu Olarak İndir</h3>
            <p className="muted">Aylık, yıllık veya günlük tüm gelir-gider hareketlerini Excel formatında bilgisayarınıza indirebilirsiniz.</p>
            <div style={{display: "flex", gap: 10, marginTop: 14}}>
              <button className="hy-btn primary" onClick={() => downloadExcelReport("Gunluk")}><Download size={15} /> Günlük Excel İndir</button>
              <button className="hy-btn primary" onClick={() => downloadExcelReport("Aylik")}><Download size={15} /> Aylık Excel İndir</button>
              <button className="hy-btn primary" onClick={() => downloadExcelReport("Yillik")}><Download size={15} /> Yıllık Excel İndir</button>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderAyarlar() {
    return (
      <>
        <div className="hy-topbar">
          <div><h1 className="hy-page-title">Ayarlar</h1></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "flex-start" }}>
          <div className="hy-panel" style={{ padding: 10 }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-soft)", padding: "8px 10px", textTransform: "uppercase" }}>Hesabım</div>
            <button onClick={() => setSettingsSubTab("hesap")} style={{ width: "100%", textAlign: "left", background: settingsSubTab === "hesap" ? "var(--primary-soft)" : "none", color: settingsSubTab === "hesap" ? "var(--primary-dark)" : "var(--text)", border: "none", padding: "10px 12px", borderRadius: 8, fontSize: "13.5px", fontWeight: settingsSubTab === "hesap" ? "600" : "500", cursor: "pointer" }}>Hesap Ayarları</button>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 10 }}>
              <button onClick={() => setAuthRole(null)} style={{ width: "100%", textAlign: "left", background: "none", color: "#C62828", border: "none", padding: "10px 12px", borderRadius: 8, fontSize: "13.5px", fontWeight: "600", cursor: "pointer" }}>Çıkış yap</button>
            </div>
          </div>

          <div className="hy-panel" style={{ padding: 28 }}>
            <h2 style={{ marginTop: 0, fontSize: "20px" }}>Hesap Ayarları</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
              <Field label="Adınız"><input value={profile.firstName || ""} onChange={e => setProfile({...profile, firstName: e.target.value})} /></Field>
              <Field label="Soyadınız"><input value={profile.lastName || ""} onChange={e => setProfile({...profile, lastName: e.target.value})} /></Field>
              <Field label="E-posta adresiniz" span><input value={profile.email || ""} onChange={e => setProfile({...profile, email: e.target.value})} /></Field>
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button className="hy-btn primary" onClick={() => {
                saveProfile(profile);
                alert("Değişiklikler başarıyla kaydedildi!");
              }}>Değişiklikleri Kaydet</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  function renderMenu() {
    return (
      <>
        <div className="hy-topbar"><div><h1 className="hy-page-title">Menü & Ayarlar</h1></div></div>
        <div className="hy-profile-card">
          <div className="hy-avatar lg">{initials(profile.firstName + " " + profile.lastName)}</div>
          <div style={{ flex: 1 }}>
            <input className="hy-profile-name-input" value={profile.firstName + " " + profile.lastName} placeholder="Adınızı girin" onChange={(e) => {
              const parts = e.target.value.split(" ");
              saveProfile({ ...profile, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" });
            }} />
            <span className="muted small">Yönetici</span>
          </div>
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
          color: var(--text); background: var(--bg); display: flex; min-height: 100vh; width: 100%;
        }
        .hy-app * { box-sizing: border-box; }
        .hy-sidebar { width: 250px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
        .hy-logo { display: flex; align-items: center; gap: 10px; padding: 6px 8px 22px; }
        .sidebar-logo-box { display: flex; flex-direction: column; }
        .sidebar-hasyek { font-size: 15px; font-weight: 800; color: #111C2E; letter-spacing: 0.5px; }
        .sidebar-line { width: 60px; height: 2px; background: #C5A059; margin: 2px 0; }
        .sidebar-insaat { font-size: 9.5px; font-weight: 700; color: #C5A059; letter-spacing: 2px; }
        .hy-nav { display: flex; flex-direction: column; gap: 3px; }
        .hy-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: none; background: none; color: var(--text-soft); font-size: 13.5px; text-align: left; cursor: pointer; }
        .hy-nav-item:hover { background: var(--bg); color: var(--text); }
        .hy-nav-item.active { background: var(--primary-soft); color: var(--primary-dark); font-weight: 600; }
        .hy-main { flex: 1; min-width: 0; padding: 28px 34px 60px; overflow-x: hidden; }
        .hy-topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; gap: 12px; flex-wrap: wrap; }
        .hy-page-title { font-size: 24px; font-weight: 700; margin: 0 0 2px; }
        .hy-page-sub { font-size: 13px; color: var(--text-soft); margin: 0; }
        .hy-bell-wrap { position: relative; }
        .hy-bell { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
        .hy-notif-badge { position: absolute; top: -4px; right: -4px; background: var(--primary); color: #fff; font-size: 10px; min-width: 17px; height: 17px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
        .hy-notif-panel { position: absolute; right: 0; top: 50px; width: 320px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 12px 28px rgba(0,0,0,0.12); padding: 10px; z-index: 30; }
        .hy-notif-item { font-size: 12.5px; padding: 8px 10px; border-radius: 8px; margin-bottom: 4px; }
        .hy-notif-item.bad { background: var(--primary-soft); color: var(--primary-dark); }
        .hy-notif-item.warn { background: var(--warning-soft); color: #9A5300; }
        .hy-property-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .hy-property-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; }
        .hy-property-img { position: relative; height: 110px; background: var(--bg); display: flex; align-items: center; justify-content: center; color: var(--text-soft); }
        .hy-property-img img { width: 100%; height: 100%; object-fit: cover; }
        .hy-status-badge { position: absolute; top: 8px; right: 8px; font-size: 10.5px; padding: 3px 9px; border-radius: 999px; font-weight: 600; }
        .hy-status-badge.good { background: var(--success-soft); color: var(--success); }
        .hy-status-badge.neutral { background: #EEF0F2; color: var(--text-soft); }
        .hy-property-body { padding: 12px 14px; }
        .hy-property-title { font-weight: 700; font-size: 14.5px; margin-bottom: 4px; }
        .hy-property-addr { font-size: 12px; color: var(--text-soft); margin-bottom: 8px; }
        .hy-fab { position: fixed; bottom: 32px; right: 40px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; box-shadow: 0 10px 22px rgba(229,57,53,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 20; }
        .hy-back-link { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--text-soft); font-size: 13px; cursor: pointer; }
        .hy-tabs2 { display: flex; gap: 4px; }
        .hy-tab2 { padding: 11px 18px; border: none; background: none; color: var(--text-soft); font-size: 13.5px; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; }
        .hy-tab2.active { color: var(--primary-dark); border-bottom-color: var(--primary); font-weight: 700; }
        .hy-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-soft); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .hy-avatar.lg { width: 56px; height: 56px; font-size: 18px; }
        .hy-profile-card { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
        .hy-profile-name-input { border: none; background: none; font-size: 16px; font-weight: 700; width: 100%; outline: none; }
        .hy-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 18px; }
        .hy-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .hy-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--text-soft); }
        .hy-field.span-2 { grid-column: span 2; }
        .hy-field input, .hy-field select, .hy-field textarea, select, input, textarea { font-family: inherit; font-size: 13px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--text); }
        .hy-btn { font-size: 12.5px; padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .hy-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
        .hy-btn.primary:hover { background: var(--primary-dark); }
        .hy-btn.ghost { background: var(--surface); color: var(--text-soft); }
        .hy-btn.danger { background: #fff; border-color: var(--primary); color: var(--primary-dark); }
        .hy-btn.sm { padding: 6px 10px; font-size: 11.5px; }
        .hy-empty { color: var(--text-soft); font-size: 12.5px; padding: 14px 0; font-style: italic; }
        .muted { color: var(--text-soft); }
        .muted.small { font-size: 11px; }
        .hy-modal-backdrop { position: fixed; inset: 0; background: rgba(15,17,20,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .hy-modal { background: var(--surface); border-radius: 18px; width: 100%; max-width: 500px; max-height: 88vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.25); }
        .hy-modal.wide { max-width: 900px; }
        .hy-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 2; }
        .hy-modal-head h3 { margin: 0; font-size: 16px; }
        .hy-modal-close { background: none; border: none; cursor: pointer; color: var(--text-soft); }
        .hy-modal-body { padding: 20px; }
        .hy-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); }
        .hy-filter-pills { display: flex; gap: 6px; }
        .hy-pill { font-size: 11.5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-soft); cursor: pointer; }
        .hy-pill.active { background: var(--text); color: #fff; border-color: var(--text); }
        @media print {
          body * { visibility: hidden; }
          #printable-senet, #printable-senet * { visibility: visible; }
          #printable-senet { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        }
        @media (max-width: 980px) {
          .hy-sidebar { width: 76px; padding: 16px 8px; }
          .sidebar-logo-box, .hy-nav-item span { display: none; }
          .hy-nav-item { justify-content: center; }
        }
      `}</style>

      <aside className="hy-sidebar">
        <div>
          <div className="hy-logo">
            <div className="sidebar-logo-box">
              <span className="sidebar-hasyek">HASYEK</span>
              <div className="sidebar-line"></div>
              <span className="sidebar-insaat">İNŞAAT</span>
            </div>
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
        </div>
      </aside>

      <main className="hy-main">
        {tab === "ozet" && renderOzet()}
        {tab === "mulkler" && (selectedPropertyId ? renderPropertyDetail() : renderPropertiesList())}
        {tab === "kontrat_kayit" && renderKontratKayitTab()}
        {tab === "senetler" && renderSenetlerTab()}
        {tab === "kiracilar" && renderTenantsList()}
        {tab === "bakim" && renderMaintenance()}
        {tab === "muhasebe" && renderMuhasebe()}
        {tab === "ayarlar" && renderAyarlar()}
        {tab === "menu" && renderMenu()}
      </main>
    </div>
  );
}