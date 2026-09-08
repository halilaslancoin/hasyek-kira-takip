import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bsajwcplambqjhitwkew.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWp3Y3BsYW1icWpoaXR3a2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjA5ODMsImV4cCI6MjEwNDI5Njk4M30.aoovr1RejbazLcSq7UPDWoK4zR-mGrVfmMiZSnubUaQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
import { useState, useEffect, useMemo } from "react";
import {
  Home, Store, Users, Wrench, Menu as MenuIcon, Bell,
  Plus, Trash2, X, Check, ArrowLeft,
  FileText, Building2, Banknote, Download, Pencil, ArrowRight, MoreHorizontal, Settings, Printer, Receipt, Landmark, Calculator, Layers, RefreshCw
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
  bankIntegrations: "hasyek:bankIntegrations",
  accountingIntegration: "hasyek:accountingIntegration",
  bankStatements: "hasyek:bankStatements",
  opacity: "hasyek:opacity",
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
    "Kısmi": "warn", "Gecikti": "bad", "Feshedildi": "bad", "Alındı": "good", "Eksik": "bad", "Tamamlanmadı": "warn",
    "Ödendi (Senet)": "good", "Ödenmedi (Senet)": "neutral"
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
  const [bankStatements, setBankStatements] = useState([
    { id: "bs1", date: "2026-06-25", description: "HAVALE/EFT ADAM KHODR KİRA ÖDEMESİ", amount: "30000", matched: true }
  ]);
  const [bankIntegrations, setBankIntegrations] = useState([
    { id: "b1", bankName: "VakıfBank", iban: "TR55 5555 5555 5555 5555 55 55", status: "Tamamlanmadı", date: "8 Eyl 2026" }
  ]);
  const [accountingData, setAccountingData] = useState({
    product: "Logo Yazılım",
    firmaUnvani: "",
    vergiDairesi: "",
    vkn: "",
    sehir: "",
    ilce: "",
    adres: "",
    connected: false
  });
  const [profile, setProfile] = useState({ firstName: "HALİL İBRAHİM", lastName: "ASLAN", email: "halilasslan@gmail.com", adminPin: "1234" });
  const [uiOpacity, setUiOpacity] = useState(0.95);

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
        load(STORAGE_KEYS.bankStatements, setBankStatements, []),
        load(STORAGE_KEYS.bankIntegrations, setBankIntegrations, [{ id: "b1", bankName: "VakıfBank", iban: "TR55 5555 5555 5555 5555 55 55", status: "Tamamlanmadı", date: "8 Eyl 2026" }]),
        load(STORAGE_KEYS.accountingIntegration, setAccountingData, { product: "Logo Yazılım", firmaUnvani: "", vergiDairesi: "", vkn: "", sehir: "", ilce: "", adres: "", connected: false }),
        load(STORAGE_KEYS.profile, setProfile, { firstName: "HALİL İBRAHİM", lastName: "ASLAN", email: "halilasslan@gmail.com", adminPin: "1234" }),
        load(STORAGE_KEYS.opacity, setUiOpacity, 0.95),
      ]);
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const persist = async (key, value, setter) => {
    setter(value);
    try { await window.storage.set(key, JSON.stringify(value), false); }
    catch (e) { console.error("Kayıt hatasi:", key, e); }
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
  const saveBankStatements = (st) => persist(STORAGE_KEYS.bankStatements, st, setBankStatements);
  const saveBankIntegrations = (banks) => persist(STORAGE_KEYS.bankIntegrations, banks, setBankIntegrations);
  const saveAccountingData = (data) => persist(STORAGE_KEYS.accountingIntegration, data, setAccountingData);
  const saveOpacity = (val) => persist(STORAGE_KEYS.opacity, val, setUiOpacity);

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
    { id: "muhasebe_entegrasyonu", label: "Muhasebe Entegrasyonu", icon: Calculator },
    { id: "bakim", label: "Bakım & Onarım", icon: Wrench },
    { id: "muhasebe", label: "Ödemeler & Muhasebe", icon: Banknote },
    { id: "banka", label: "Banka Entegrasyonu", icon: Landmark },
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
    kdvLi: false, kdvDurumu: "KDV Dahil", kdvOrani: "20", tutar: "30000", donemAy: "Eylül", donemYil: "2026", durum: "Ödendi", odenenTutar: "30000"
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

  // Banka Entegrasyonu State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("VakıfBank");
  const [bankIban, setBankIban] = useState("");
  const [formDownloaded, setFormDownloaded] = useState(false);

  // Muhasebe Entegrasyonu SubTab
  const [accountingSubTab, setAccountingSubTab] = useState("entegrasyon");

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
      <div className="hy-app" style={{ opacity: uiOpacity }}>
        <div className="hy-landing-split">
          
          {/* Sol Kolon: Giriş Kartları */}
          <div className="hy-landing-left">
            <div className="hy-landing-brand">
              <img src="/img_9421.png" alt="HasYek Insaat Logo" style={{ width: 220, height: "auto", objectFit: "contain" }} />
            </div>
            
            <div className="hy-landing-headline">
              <h2>Evinizin yönetimi hayatınızı zorlaştırmasın.</h2>
              <p>Kişisel hayatınıza ve kazançlarınıza odaklanmanızı sağlarken, kiracıların mutluluğunu, gelecek potansiyellerini ve fırsatlarını da gözetiyoruz.</p>
            </div>

            <div className="hy-landing-cards-stack">
              <div className="hy-landing-card">
                <div>
                  <h3>Mülk sahibi</h3>
                  <p>3 veya daha fazla mülcünüz varsa şimdi yönetmeye başlayın.</p>
                </div>
                <button className="hy-landing-btn" onClick={() => {
                  const pin = prompt("Yönetici Şifresini Girin:");
                  if (pin === (profile.adminPin || "1234")) { setAuthRole("admin"); }
                  else if (pin) { alert("Hatalı şifre!"); }
                }}>
                  Mülk sahibiyim →
                </button>
              </div>

              <div className="hy-landing-card">
                <div>
                  <h3>Kiracı</h3>
                  <p>Kiracısı olduğunuz mülk ile ilgili bilgilere erişin.</p>
                </div>
                <button className="hy-landing-btn" onClick={() => {
                  const tName = prompt("Kiracı Adınızı Girin:");
                  const found = people.find(p => p.role === "Kiracı" && p.name.toLowerCase().includes((tName || "").toLowerCase()));
                  if (found) {
                    setAuthRole("tenant");
                    setCurrentUser(found);
                  } else {
                    alert("Kiracı sistemde bulunamadı!");
                  }
                }}>
                  Kiracıyım →
                </button>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Vizyon ve Özellikler */}
          <div className="hy-landing-right">
            <h1>Siz kirayı alın, biz sorunları çözelim.</h1>
            <p className="hy-landing-sub">Kira takibinden bakım-onarıma, her şeyi sizin yerinize biz üstleniyoruz.</p>

            <div className="hy-landing-features">
              <div className="hy-landing-feature-item">
                <div className="hy-landing-feat-icon" style={{ background: "#FEE2E2", color: "#E53935" }}><Banknote size={20} /></div>
                <div>
                  <h4>Kira Takibi</h4>
                  <p>Tüm kira ödemelerini sizin yerinize takip ediyoruz.</p>
                </div>
              </div>

              <div className="hy-landing-feature-item">
                <div className="hy-landing-feat-icon" style={{ background: "#FEF3C7", color: "#F59E0B" }}><Wrench size={20} /></div>
                <div>
                  <h4>Bakım ve Onarım</h4>
                  <p>Kiracı bakım-onarım taleplerini dinliyor, tüm süreci sizin adınıza çözüyoruz.</p>
                </div>
              </div>

              <div className="hy-landing-feature-item">
                <div className="hy-landing-feat-icon" style={{ background: "#DBEAFE", color: "#2563EB" }}><FileText size={20} /></div>
                <div>
                  <h4>Hukuki Süreçler</h4>
                  <p>Sözleşmelerden hukuki işlemlere kadar tüm detaylarda size destek oluyoruz.</p>
                </div>
              </div>

              <div className="hy-landing-feature-item">
                <div className="hy-landing-feat-icon" style={{ background: "#D1FAE5", color: "#10B981" }}><Building2 size={20} /></div>
                <div>
                  <h4>Kiracı</h4>
                  <p>Evinizi hızlıca kiraya veriyor, en iyi geliri hedefliyoruz.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <style>{`
          .hy-landing-split { display: grid; grid-template-columns: 1fr 1.1fr; min-height: 100vh; width: 100vw; background: #fff; }
          .hy-landing-left { padding: 50px 60px; display: flex; flex-direction: column; justify-content: center; background: #FAF9F6; border-right: 1px solid #E5E7EB; }
          .hy-landing-brand { margin-bottom: 24px; }
          .hy-landing-headline h2 { font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 10px; letter-spacing: -0.5px; }
          .hy-landing-headline p { font-size: 14px; color: #4B5563; margin: 0 0 30px; line-height: 1.5; }
          .hy-landing-cards-stack { display: flex; flex-direction: column; gap: 16px; }
          .hy-landing-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: border-color 0.2s; gap: 16px; }
          .hy-landing-card:hover { border-color: #D1D5DB; }
          .hy-landing-card h3 { font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 4px; }
          .hy-landing-card p { font-size: 13px; color: #6B7280; margin: 0; line-height: 1.4; }
          .hy-landing-btn { background: #E53935; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; flex-shrink: 0; }
          .hy-landing-btn:hover { background: #C62828; }
          
          .hy-landing-right { padding: 60px; display: flex; flex-direction: column; justify-content: center; background: #FFFDF9; max-width: 650px; }
          .hy-landing-right h1 { font-size: 38px; font-weight: 800; color: #111827; margin: 0 0 12px; letter-spacing: -1px; line-height: 1.2; }
          .hy-landing-sub { font-size: 15px; color: #4B5563; margin: 0 0 36px; line-height: 1.5; }
          .hy-landing-features { display: flex; flex-direction: column; gap: 24px; }
          .hy-landing-feature-item { display: flex; align-items: flex-start; gap: 16px; }
          .hy-landing-feat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; alignItems: center; justifyContent: center; flex-shrink: 0; }
          .hy-landing-feature-item h4 { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 4px; }
          .hy-landing-feature-item p { font-size: 13.5px; color: #6B7280; margin: 0; line-height: 1.4; }
        `}</style>
      </div>
    );
  }

  if (authRole === "tenant") {
    const myContracts = contracts.filter(c => c.tenantId === currentUser.id);
    const myPayments = payments.filter(p => myContracts.some(c => c.id === p.contractId));
    return (
      <div className="hy-app" style={{ padding: 30, opacity: uiOpacity }}>
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

  function renderMuhasebeEntegrasyonuTab() {
    const tenantsList = people.filter(p => p.role === "Kiracı");
    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Muhasebe Entegrasyonu</h1>
            <p className="hy-page-sub">Muhasebe programınızı Ehane'ye bağlamak için gerekli bilgileri girin.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", marginBottom: 20, paddingBottom: 2 }}>
          {[
            ["entegrasyon", "Entegrasyon"],
            ["faturalar", "Cari Faturalar"],
            ["cariler", "Cariler"]
          ].map(([k, l]) => (
            <button key={k} onClick={() => setAccountingSubTab(k)} style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14px", fontWeight: accountingSubTab === k ? "700" : "500", color: accountingSubTab === k ? "var(--text)" : "var(--text-soft)", borderBottom: accountingSubTab === k ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>

        {accountingSubTab === "entegrasyon" && (
          <div className="hy-panel" style={{ padding: 24, background: "#fff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", borderBottom: "1px solid #F3F4F6", paddingBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E53935", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>1</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: "14.5px" }}>Ürün Seçin</h4>
                  <span className="muted small">Muhasebe programı entegrasyonu</span>
                  <div style={{ marginTop: 10 }}>
                    <select value={accountingData.product} onChange={e=>setAccountingData({...accountingData, product: e.target.value})} style={{ width: "100%", maxWidth: 400 }}>
                      <option>Logo Yazılım</option>
                      <option>Mikro Yazılım</option>
                      <option>Zirve Müşavirlik</option>
                      <option>Logo İşbaşı</option>
                      <option>Paraşüt</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", borderBottom: "1px solid #F3F4F6", paddingBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E53935", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>2</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: "14.5px" }}>Fatura Bilgilerinizi Girin</h4>
                  <span className="muted small">Faturalarınızda kullanılacak firma, vergi ve adres bilgilerinizi girin.</span>
                  
                  <div className="hy-form-grid" style={{ marginTop: 14 }}>
                    <Field label="Firma Ünvanı *" span>
                      <input placeholder="Lütfen yazın" value={accountingData.firmaUnvani} onChange={e=>setAccountingData({...accountingData, firmaUnvani: e.target.value})} />
                    </Field>
                    <Field label="Vergi Dairesi *">
                      <input placeholder="Lütfen yazın" value={accountingData.vergiDairesi} onChange={e=>setAccountingData({...accountingData, vergiDairesi: e.target.value})} />
                    </Field>
                    <Field label="VKN *">
                      <input placeholder="Lütfen yazın" value={accountingData.vkn} onChange={e=>setAccountingData({...accountingData, vkn: e.target.value})} />
                    </Field>
                    <Field label="Şehir *">
                      <select value={accountingData.sehir} onChange={e=>setAccountingData({...accountingData, sehir: e.target.value})}>
                        <option value="">Lütfen seçiniz</option>
                        <option>İstanbul</option>
                        <option>Ankara</option>
                        <option>İzmir</option>
                        <option>Mersin</option>
                        <option>Adana</option>
                      </select>
                    </Field>
                    <Field label="İlçe *">
                      <select value={accountingData.ilce} onChange={e=>setAccountingData({...accountingData, ilce: e.target.value})}>
                        <option value="">Lütfen seçiniz</option>
                        <option>Pendik</option>
                        <option>Kadıköy</option>
                        <option>Ataşehir</option>
                        <option>Akdeniz</option>
                        <option>Çukurova</option>
                      </select>
                    </Field>
                    <Field label="Adres *" span>
                      <input placeholder="Lütfen yazın" value={accountingData.adres} onChange={e=>setAccountingData({...accountingData, adres: e.target.value})} />
                    </Field>
                  </div>
                </div>
              </div>

              {[
                [3, "Şablon Seçin", "Fatura şablonu seçin. Ehane tarafından oluşturulan faturalar, seçtiğiniz şablon üzerinden hazırlanır."],
                [4, "Ön Ad Girin", "Fatura numaralarınızda kullanılacak ön adı belirleyin."],
                [5, "Entegrasyon Bilgilerini Girin", "Muhasebe entegrasyonu için web servis bilgilerini girin."]
              ].map(([num, title, desc]) => (
                <div key={num} style={{ display: "flex", gap: 16, alignItems: "flex-start", opacity: 0.6, borderBottom: "1px solid #F3F4F6", paddingBottom: 20 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#9CA3AF", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "13px", flexShrink: 0 }}>{num}</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "14.5px" }}>{title}</h4>
                    <span className="muted small">{desc}</span>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="hy-btn primary" onClick={() => {
                  saveAccountingData({ ...accountingData, connected: true });
                  alert("Muhasebe entegrasyon bilgileri başarıyla kaydedildi!");
                }}>
                  Entegrasyonu Tamamla ›
                </button>
              </div>

            </div>
          </div>
        )}

        {accountingSubTab === "faturalar" && (
          <div className="hy-panel" style={{ padding: 40, textAlign: "center", background: "#fff" }}>
            <div style={{ width: 70, height: 70, background: "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#E53935" }}>
              <FileText size={32} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Henüz cari fatura bulunmuyor.</h3>
            <p className="muted" style={{ maxWidth: 500, margin: "0 auto 20px", fontSize: "13.5px" }}>
              Cari hesap faturasının oluşturulabilmesi için entegrasyonunuzu tamamlayın. Entegrasyon tamamlandıktan sonra, faturalar ilgili kira dönemlerinde otomatik taslak olarak oluşturulacak.
            </p>
            <button className="hy-btn primary" onClick={() => setAccountingSubTab("entegrasyon")}>Entegrasyonu Tamamla ›</button>
          </div>
        )}

        {accountingSubTab === "cariler" && (
          <div className="hy-panel" style={{ padding: 24, background: "#fff" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Cariler Listesi</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>Kiracınızla ilişkilendirilmiş cari kayıtlarını görüntüleyin ve detaylarını inceleyin.</p>
            
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", textAlign: "left", color: "var(--text-soft)" }}>
                  <th style={{ padding: 12 }}>Kiracı Adı</th>
                  <th style={{ padding: 12 }}>Telefon</th>
                  <th style={{ padding: 12 }}>T.C. / VKN</th>
                  <th style={{ padding: 12 }}>Cari Durumu</th>
                </tr>
              </thead>
              <tbody>
                {tenantsList.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: 20, textAlign: "center", color: "var(--text-soft)" }}>Kayıtlı cari (kiracı) bulunmuyor.</td></tr>
                ) : (
                  tenantsList.map(t => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 12, fontWeight: "600" }}>{t.name}</td>
                      <td style={{ padding: 12 }}>{t.phone || "—"}</td>
                      <td style={{ padding: 12 }}>{t.tc || "—"}</td>
                      <td style={{ padding: 12 }}><StatusPill status="Aktif" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function renderBankaEntegrasyonu() {
    const registeredTenants = people.filter(p => p.role === "Kiracı");

    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Banka Entegrasyonu & Ekstre Eşleştirme</h1>
            <p className="hy-page-sub">Banka ekstrelerini yükleyerek ödemeleri senet and kiralarla otomatik eşleştirin.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="file" 
              id="bankStatementFileInput" 
              accept=".html, .htm, .csv, .xlsx" 
              style={{ display: "none" }} 
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                  const htmlContent = event.target.result;
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(htmlContent, 'text/html');
                  const rows = doc.querySelectorAll('tr');
                  
                  let parsedTransactions = [];
                  if (rows.length > 0) {
                    rows.forEach(row => {
                      const cols = row.querySelectorAll('td');
                      if (cols.length >= 3) {
                        parsedTransactions.push({
                          date: cols[0].innerText.trim() || todayStr(),
                          description: cols[1].innerText.trim(),
                          amount: cols[2].innerText.replace(/[^0-9]/g, '') || "30000"
                        });
                      }
                    });
                  }
                  
                  if (parsedTransactions.length === 0) {
                    parsedTransactions.push({
                      date: todayStr(),
                      description: `${file.name.toUpperCase()} EKSTRESİ`,
                      amount: "30000"
                    });
                  }

                  let newStatements = [...bankStatements];
                  let updatedNotes = [...promissoryNotes];

                  parsedTransactions.forEach(tx => {
                    const upperDesc = tx.description.toLocaleUpperCase('TR');
                    const matchedTenant = registeredTenants.find(tenant => upperDesc.includes(tenant.name.toLocaleUpperCase('TR')));

                    const isMatched = Boolean(matchedTenant);

                    newStatements.push({
                      id: uid(),
                      date: tx.date,
                      description: tx.description,
                      amount: tx.amount,
                      matched: isMatched
                    });

                    if (isMatched) {
                      updatedNotes = updatedNotes.map(n => {
                        if (n.tenantName.toLocaleUpperCase('TR') === matchedTenant.name.toLocaleUpperCase('TR') || Number(n.amount) === Number(tx.amount)) {
                          return { ...n, status: "Ödendi (Senet)" };
                        }
                        return n;
                      });
                    }
                  });

                  saveBankStatements(newStatements);
                  saveNotes(updatedNotes);

                  alert(`"${file.name}" başarıyla tarandı ve kiracı ödemeleri ile eşleştirildi!`);
                };
                reader.readAsText(file);
              }}
            />

            <button className="hy-btn primary" style={{ background: "#E53935", borderColor: "#E53935" }} onClick={() => {
              document.getElementById('bankStatementFileInput').click();
            }}>
              <Plus size={16} /> Banka Ekstresi Ekle & Eşleştir
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "flex-start" }}>
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, fontSize: "16px" }}>Banka Ekstresi Hareketleri ve Eşleşmeler</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>Banka hesap hareketleriniz ile senet/kira ödemelerinizin otomatik eşleşme durumu.</p>
            
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", textAlign: "left", color: "var(--text-soft)" }}>
                  <th style={{ padding: 12 }}>Tarih</th>
                  <th style={{ padding: 12 }}>Açıklama</th>
                  <th style={{ padding: 12 }}>Tutar</th>
                  <th style={{ padding: 12 }}>Eşleşme Durumu</th>
                  <th style={{ padding: 12, textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {bankStatements.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: 20, textAlign: "center", color: "var(--text-soft)" }}>Henüz banka ekstresi girilmedi.</td></tr>
                ) : (
                  bankStatements.map(bs => (
                    <tr key={bs.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 12 }}>{fmtDate(bs.date)}</td>
                      <td style={{ padding: 12, fontWeight: "600" }}>{bs.description}</td>
                      <td style={{ padding: 12 }}>{fmtMoney(bs.amount)}</td>
                      <td style={{ padding: 12 }}><StatusPill status={bs.matched ? "Ödendi" : "Bekliyor"} /></td>
                      <td style={{ padding: 12, textAlign: "right" }}>
                        <button className="hy-btn ghost sm" onClick={() => {
                          const updated = bankStatements.map(x => x.id === bs.id ? {...x, matched: !x.matched} : x);
                          saveBankStatements(updated);
                        }}>
                          {bs.matched ? "Eşleşmeyi Kaldır" : "Eşleştir"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  function renderOzet() {
    const missingNotesCount = promissoryNotes.filter(n => n.status === "Eksik").length;

    const totalProps = properties.length;
    const rentedProps = properties.filter(p => propertyStatus(p.id) === "Kirada").length;
    const emptyProps = properties.filter(p => propertyStatus(p.id) === "Boşta").length;

    const filteredPayments = payments.filter(p => {
      const st = paymentStatus(p);
      if (paymentFilterTab === "Tümü") return true;
      if (paymentFilterTab === "Ödendi" && st === "Ödendi") return true;
      if (paymentFilterTab === "Gecikmiş" && st === "Gecikti") return true;
      if (paymentFilterTab === "Bekleyen" && st === "Bekliyor") return true;
      if (paymentFilterTab === "Kısmi" && st === "Kısmi") return true;
      return false;
    });

    const countOdendi = payments.filter(p => paymentStatus(p) === "Ödendi").length;
    const countGecikmis = payments.filter(p => paymentStatus(p) === "Gecikti").length;
    const countBekleyen = payments.filter(p => paymentStatus(p) === "Bekliyor").length;
    const countKismi = payments.filter(p => paymentStatus(p) === "Kısmi").length;

    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Özet</h1>
            <p className="hy-page-sub">İyi akşamlar, {profile.firstName || "Halil İbrahim"} {profile.lastName || "Aslan"}</p>
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

        {/* 4 Özet Kartı */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
          <div style={{ background: "#10B981", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(16,185,129,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Gerçekleşen Ödemeler</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(thisMonthCollected)}</div>
          </div>
          <div style={{ background: "#F59E0B", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(245,158,11,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Gelecek Ödemeler</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(thisMonthDue)}</div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <span style={{ fontSize: "13px", color: "var(--text-soft)" }}>Ödenen Kiralar</span>
            <div style={{ fontSize: "12px", color: "var(--text-soft)", marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", color: "var(--text)", marginTop: 12 }}>{payments.filter(p => paymentStatus(p) === "Ödendi").length}</div>
          </div>
          <div style={{ background: "#EF4444", color: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(239,68,68,0.15)" }}>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Ödenmemiş Kiralar</span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>Bu ay</div>
            <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{payments.filter(p => paymentStatus(p) !== "Ödendi").length}</div>
          </div>
        </div>

        {/* Orta Alan: Hareket Akışı + Mülk Dağılımı / Sözleşme Bitişleri */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, marginBottom: 28 }}>
          
          <div className="hy-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Hareket Akışı</h3>
              <div style={{ display: "flex", gap: 6, background: "#F3F4F6", padding: 4, borderRadius: 8 }}>
                <button style={{ background: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "12px", fontWeight: "600", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>Tümü</button>
                <button style={{ background: "transparent", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "12px", color: "var(--text-soft)", cursor: "pointer" }}><Building2 size={14}/></button>
                <button style={{ background: "transparent", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "12px", color: "var(--text-soft)", cursor: "pointer" }}><Users size={14}/></button>
                <button style={{ background: "transparent", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "12px", color: "var(--text-soft)", cursor: "pointer" }}><Receipt size={14}/></button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 12, borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE2E2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wrench size={14} />
                </div>
                <div style={{ flex: 1, fontSize: "13px" }}>
                  <strong>Hukuki destek talebiniz iptal edildi.</strong>
                  <div style={{ color: "var(--text-soft)" }}>A01</div>
                </div>
                <span className="muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>⏱ 4 saat önce</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 12, borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEF3C7", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wrench size={14} />
                </div>
                <div style={{ flex: 1, fontSize: "13px" }}>
                  <strong>Hukuki destek talebiniz oluşturuldu ve şu anda değerlendirmede.</strong>
                  <div style={{ color: "var(--text-soft)" }}>A01</div>
                </div>
                <span className="muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>⏱ 4 saat önce</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#D1FAE5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText size={14} />
                </div>
                <div style={{ flex: 1, fontSize: "13px" }}>
                  <strong>Kira sözleşmesi eklendi.</strong>
                  <div style={{ color: "var(--text-soft)" }}>A01</div>
                </div>
                <span className="muted small" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>⏱ 22 gün önce</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="hy-panel" style={{ padding: 20, textAlign: "center" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "15px", textAlign: "left" }}>Mülk Dağılımı</h3>
              <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 130, height: 130, borderRadius: "50%", border: "14px solid #10B981", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-soft)" }}>Toplam</span>
                  <span style={{ fontSize: "20px", fontWeight: "800" }}>{totalProps}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: "12.5px", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }}></span>
                  <span>Kirada ({rentedProps})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }}></span>
                  <span>Boşta ({emptyProps})</span>
                </div>
              </div>
            </div>

            <div className="hy-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>Sözleşme Bitişleri</h3>
              <p className="muted small" style={{ margin: 0 }}>Yakında sona erecek bir kira sözleşmesi bulunmuyor.</p>
            </div>
          </div>

        </div>

        {/* Kira Ödeme Akışı */}
        <div className="hy-panel" style={{ padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Kira Ödeme Akışı</h3>
            <select style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "13px", background: "#fff" }}>
              <option>Eylül 2026</option>
              <option>Ağustos 2026</option>
              <option>Ekim 2026</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}>
            {[
              ["Tümü", `Tümü (${payments.length})`],
              ["Ödendi", `Ödendi (${countOdendi})`],
              ["Gecikmiş", `Gecikmiş (${countGecikmis})`],
              ["Bekleyen", `Bekleyen (${countBekleyen})`],
              ["Kısmi", `Kısmi Ödenenler (${countKismi})`]
            ].map(([k, l]) => (
              <button key={k} onClick={() => setPaymentFilterTab(k)} style={{ background: "none", border: "none", padding: "4px 0", fontSize: "13.5px", fontWeight: paymentFilterTab === k ? "700" : "500", color: paymentFilterTab === k ? "var(--text)" : "var(--text-soft)", borderBottom: paymentFilterTab === k ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
                  <th style={{ padding: "12px" }}>Durum</th>
                  <th style={{ padding: "12px" }}>Mülk</th>
                  <th style={{ padding: "12px" }}>Kiracı</th>
                  <th style={{ padding: "12px" }}>Kira Dönemi</th>
                  <th style={{ padding: "12px" }}>Ödeme tarihi</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "var(--text-soft)" }}>Seçilen filtrede kira ödeme kaydı bulunmuyor.</td></tr>
                ) : (
                  filteredPayments.map(p => {
                    const contract = contracts.find(c => c.id === p.contractId);
                    const prop = properties.find(pr => pr.id === (contract ? contract.propertyId : ""));
                    const tenant = people.find(t => t.id === (contract ? contract.tenantId : ""));
                    const st = paymentStatus(p);
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px" }}><StatusPill status={st} /></td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{prop ? prop.tasinmazNo : "A01"}</td>
                        <td style={{ padding: "12px" }}>{tenant ? tenant.name : "Ahmet"}</td>
                        <td style={{ padding: "12px", color: "var(--text-soft)" }}>{fmtDate(p.dueDate)}</td>
                        <td style={{ padding: "12px" }}>{p.paidDate ? fmtDate(p.paidDate) : "—"}</td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>{fmtMoney(p.amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Borçlu Kiracılar */}
        <div className="hy-panel" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={20} color="#EF4444" /> Borçlu Kiracılar
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
                  <th style={{ padding: "12px" }}>Kiracı</th>
                  <th style={{ padding: "12px" }}>Mülk</th>
                  <th style={{ padding: "12px" }}>Borç Tutarı</th>
                  <th style={{ padding: "12px" }}>Geciken Kira</th>
                  <th style={{ padding: "12px" }}>İletişim</th>
                </tr>
              </thead>
              <tbody>
                {overdue.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Borçlu kiracınız bulunmuyor. 🎉</td></tr>
                ) : (
                  overdue.map(p => {
                    const contract = contracts.find(c => c.id === p.contractId);
                    const prop = properties.find(pr => pr.id === (contract ? contract.propertyId : ""));
                    const tenant = people.find(t => t.id === (contract ? contract.tenantId : ""));
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE2E2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>{initials(tenant ? tenant.name : "Ahmet")}</div>
                          <strong>{tenant ? tenant.name : "Ahmet"}</strong>
                        </td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{prop ? prop.tasinmazNo : "A01"}</td>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#EF4444" }}>{fmtMoney(p.amount)}</td>
                        <td style={{ padding: "12px" }}><span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: 99, fontSize: "11.5px", fontWeight: "600" }}>1 dönem</span></td>
                        <td style={{ padding: "12px" }}>{tenant?.phone || "+90 (532) 468 83 03"}</td>
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
        satisFiyati: "", aidat: "", malikAdi: "Halil İbrahim Aslan", hisseOrani: "%100",
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
              <Field label="Malik Adı Soyadı"><input list="l-list" value={d.malikAdi} onChange={e=>set({malikAdi: e.target.value})} placeholder="Halil İbrahim Aslan" /></Field>
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
                    status: i === 0 ? "Ödendi (Senet)" : "Ödenmedi (Senet)",
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

  function renderSenetlerTab() {
    return (
      <>
        <div className="hy-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="hy-page-title">Senet Yönetimi & Ödeme Durumları</h1>
            <p className="hy-page-sub">Senetlerin ödendi/ödenmedi durumlarını manuel güncelleyebilir veya banka ekstresi ile eşleştirebilirsiniz.</p>
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

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Tüm Senet Listesi</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left", color: "var(--text-soft)" }}>
                <th style={{ padding: 12 }}>Kiracı</th>
                <th style={{ padding: 12 }}>Senet No</th>
                <th style={{ padding: 12 }}>Vade Tarihi</th>
                <th style={{ padding: 12 }}>Tutar</th>
                <th style={{ padding: 12 }}>Ödeme Durumu (Senet)</th>
                <th style={{ padding: 12, textAlign: "right" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {promissoryNotes.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 20, textAlign: "center", color: "var(--text-soft)" }}>Kayıtlı senet bulunmuyor.</td></tr>
              ) : (
                promissoryNotes.map(n => (
                  <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: "600" }}>{n.tenantName}</td>
                    <td style={{ padding: 12 }}>{n.senetNo}</td>
                    <td style={{ padding: 12 }}>{fmtDate(n.dueDate)}</td>
                    <td style={{ padding: 12, fontWeight: "600" }}>{fmtMoney(n.amount)}</td>
                    <td style={{ padding: 12 }}>
                      <select 
                        value={n.status || "Ödenmedi (Senet)"} 
                        onChange={e => {
                          const newStatus = e.target.value;
                          const updated = promissoryNotes.map(item => item.id === n.id ? {...item, status: newStatus} : item);
                          saveNotes(updated);
                        }}
                        style={{ padding: "4px 8px", fontSize: "12.5px", borderRadius: 6, fontWeight: "600" }}
                      >
                        <option value="Ödendi (Senet)">Ödendi</option>
                        <option value="Ödenmedi (Senet)">Ödenmedi</option>
                        <option value="Eksik">Eksik / Alınmadı</option>
                      </select>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  <th style={{ padding: 10 }}>Ödeme Durumu</th>
                </tr>
              </thead>
              <tbody>
                {tenant ? (
                  promissoryNotes.filter(n => n.tenantId === tenant.id).map(n => (
                    <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10 }}>{n.senetNo}</td>
                      <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                      <td style={{ padding: 10 }}>{fmtMoney(n.amount)}</td>
                      <td style={{ padding: 10 }}>
                        <select 
                          value={n.status || "Ödenmedi (Senet)"} 
                          onChange={e => {
                            const newStatus = e.target.value;
                            const updated = promissoryNotes.map(item => item.id === n.id ? {...item, status: newStatus} : item);
                            saveNotes(updated);
                          }}
                          style={{ padding: "2px 6px", fontSize: "12px" }}
                        >
                          <option value="Ödendi (Senet)">Ödendi</option>
                          <option value="Ödenmedi (Senet)">Ödenmedi</option>
                        </select>
                      </td>
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

              <Field label="Aylık Kira Bedeli*">
                <input type="number" value={paymentForm.tutar} onChange={e=>setPaymentForm({...paymentForm, tutar: e.target.value, odenenTutar: paymentForm.durum === "Ödendi" ? e.target.value : paymentForm.odenenTutar})} />
              </Field>

              <div className="hy-form-grid">
                <Field label="Dönem Ay*">
                  <select value={paymentForm.donemAy} onChange={e=>setPaymentForm({...paymentForm, donemAy: e.target.value})}>
                    {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map(m=><option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Dönem Yıl*">
                  <select value={paymentForm.donemYil} onChange={e=>setPaymentForm({...paymentForm, donemYil: e.target.value})}>
                    {["2025", "2026", "2027"].map(y=><option key={y}>{y}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Ödeme Durumu*">
                <select value={paymentForm.durum} onChange={e=>{
                  const st = e.target.value;
                  setPaymentForm({...paymentForm, durum: st, odenenTutar: st === "Ödendi" ? paymentForm.tutar : "0"});
                }}>
                  <option value="Ödendi">Ödendi</option>
                  <option value="Ödenmedi">Ödenmedi</option>
                </select>
              </Field>

              {paymentForm.durum === "Ödendi" && (
                <Field label="Ödenen Tutar (₺)*">
                  <input type="number" value={paymentForm.odenenTutar} onChange={e=>setPaymentForm({...paymentForm, odenenTutar: e.target.value})} placeholder="30000" />
                </Field>
              )}
            </div>

            <div className="hy-modal-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="hy-btn ghost" onClick={() => setAddPaymentModalOpen(false)}>‹ İptal</button>
              <button className="hy-btn primary" onClick={() => {
                if(!activeContract) { alert("Aktif sözleşme bulunamadı!"); return; }
                const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                const mIdx = monthNames.indexOf(paymentForm.donemAy);
                const yearNum = Number(paymentForm.donemYil);
                
                const targetDate = new Date(yearNum, mIdx >= 0 ? mIdx : 0, 1, 12, 0, 0);
                const targetDateStr = targetDate.toISOString().slice(0, 10);

                const isPaid = paymentForm.durum === "Ödendi";
                const paidVal = isPaid ? (Number(paymentForm.odenenTutar) || Number(paymentForm.tutar)) : 0;

                const newP = {
                  id: uid(),
                  contractId: activeContract.id,
                  amount: paymentForm.tutar,
                  dueDate: targetDateStr,
                  paidAmount: paidVal,
                  paidDate: isPaid ? targetDateStr : null
                };
                persist(STORAGE_KEYS.payments, [...payments, newP], setPayments);
                setAddPaymentModalOpen(false);
                alert("Ödeme başarıyla ilgili döneme kaydedildi!");
              }}>Ekle ›</button>
            </div>
          </Modal>
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
              <h3>Kiracıya Ait Senetler</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa", textAlign: "left", color: "var(--text-soft)" }}>
                    <th style={{ padding: 10 }}>Senet No</th>
                    <th style={{ padding: 10 }}>Vade</th>
                    <th style={{ padding: 10 }}>Tutar</th>
                    <th style={{ padding: 10 }}>Ödeme Durumu</th>
                  </tr>
                </thead>
                <tbody>
                  {promissoryNotes.filter(n => n.tenantId === tenant.id).length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: 16, textAlign: "center" }}>Senet kaydı bulunamadı.</td></tr>
                  ) : (
                    promissoryNotes.filter(n => n.tenantId === tenant.id).map(n => (
                      <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10 }}>{n.senetNo}</td>
                        <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                        <td style={{ padding: 10 }}>{fmtMoney(n.amount)}</td>
                        <td style={{ padding: 10 }}>
                          <select 
                            value={n.status || "Ödenmedi (Senet)"} 
                            onChange={e => {
                              const newStatus = e.target.value;
                              const updated = promissoryNotes.map(item => item.id === n.id ? {...item, status: newStatus} : item);
                              saveNotes(updated);
                            }}
                            style={{ padding: "2px 6px", fontSize: "12px" }}
                          >
                            <option value="Ödendi (Senet)">Ödendi</option>
                            <option value="Ödenmedi (Senet)">Ödenmedi</option>
                          </select>
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
    const totalCollectedAll = payments.filter(p => paymentStatus(p) === "Ödendi").reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalPendingAll = payments.filter(p => paymentStatus(p) === "Bekliyor").reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalOverdueAll = payments.filter(p => paymentStatus(p) === "Gecikti").reduce((s, p) => s + (Number(p.amount) || 0), 0);

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
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#2E7D32", color: "#fff", borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: "13px", opacity: 0.9 }}>Toplam Tahsil Edilen</span>
                <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(totalCollectedAll)}</div>
              </div>
              <div style={{ background: "#F57C00", color: "#fff", borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: "13px", opacity: 0.9 }}>Bekleyen Alacaklar</span>
                <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(totalPendingAll)}</div>
              </div>
              <div style={{ background: "#C62828", color: "#fff", borderRadius: 16, padding: 20 }}>
                <span style={{ fontSize: "13px", opacity: 0.9 }}>Geciken Alacaklar</span>
                <div style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}>{fmtMoney(totalOverdueAll)}</div>
              </div>
            </div>

            <div className="hy-panel" style={{ padding: 24 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Tüm Ödemeler ve Hareketler</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ color: "var(--text-soft)", borderBottom: "1px solid var(--border)", background: "#F9FAFB" }}>
                    <th style={{ padding: "12px" }}>Durum</th>
                    <th style={{ padding: "12px" }}>Mülk</th>
                    <th style={{ padding: "12px" }}>Kiracı</th>
                    <th style={{ padding: "12px" }}>Vade Tarihi</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "var(--text-soft)" }}>Kayıtlı ödeme hareketi bulunmuyor.</td></tr>
                  ) : (
                    payments.map(p => {
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
          </>
        )}

        {acctSubTab === "excel" && (
          <div className="hy-panel" style={{ padding: 30 }}>
            <h3 style={{ marginTop: 0 }}>Excel / CSV Rapor İndir</h3>
            <p className="muted small" style={{ marginBottom: 20 }}>Tüm tahsilatları ve finansal hareketleri dışa aktarın.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="hy-btn primary" onClick={() => downloadExcelReport("Aylık")}><Download size={16}/> Aylık Raporu İndir (.csv)</button>
              <button className="hy-btn ghost" onClick={() => downloadExcelReport("Yıllık")}><Download size={16}/> Yıllık Raporu İndir (.csv)</button>
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

        <div style={{ display: "flex", gap: 20, borderBottom: "1px solid var(--border)", marginBottom: 20, paddingBottom: 2 }}>
          {[["hesap", "Hesap Bilgileri"], ["guvenlik", "Şifre & Güvenlik"], ["gorunum", "Görünüm & Şeffaflık"], ["sistem", "Sistem & Sıfırlama"]].map(([k, l]) => (
            <button key={k} onClick={() => setSettingsSubTab(k)} style={{ background: "none", border: "none", padding: "8px 4px", fontSize: "14.5px", fontWeight: settingsSubTab === k ? "700" : "500", color: settingsSubTab === k ? "var(--text)" : "var(--text-soft)", borderBottom: settingsSubTab === k ? "2px solid var(--primary)" : "2px solid transparent", cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>

        {settingsSubTab === "hesap" && (
          <div className="hy-panel" style={{ padding: 24, maxWidth: 600 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Yönetici Bilgileri</h3>
            <div className="hy-form-grid" style={{ marginBottom: 16 }}>
              <Field label="Ad">
                <input value={profile.firstName} onChange={e=>setProfile({...profile, firstName: e.target.value})} />
              </Field>
              <Field label="Soyad">
                <input value={profile.lastName} onChange={e=>setProfile({...profile, lastName: e.target.value})} />
              </Field>
              <Field label="E-posta" span>
                <input value={profile.email} onChange={e=>setProfile({...profile, email: e.target.value})} />
              </Field>
            </div>
            <button className="hy-btn primary" onClick={() => {
              saveProfile(profile);
              alert("Bilgiler başarıyla güncellendi!");
            }}>Değişiklikleri Kaydet</button>
          </div>
        )}

        {settingsSubTab === "guvenlik" && (
          <div className="hy-panel" style={{ padding: 24, maxWidth: 600 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Yönetici Giriş Şifresi / PIN</h3>
            <Field label="Yeni Şifre / PIN">
              <input type="password" value={profile.adminPin || ""} onChange={e=>setProfile({...profile, adminPin: e.target.value})} placeholder="1234" />
            </Field>
            <div style={{ marginTop: 16 }}>
              <button className="hy-btn primary" onClick={() => {
                saveProfile(profile);
                alert("Şifre başarıyla güncellendi!");
              }}>Şifreyi Güncelle</button>
            </div>
          </div>
        )}

        {settingsSubTab === "gorunum" && (
          <div className="hy-panel" style={{ padding: 24, maxWidth: 600 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Arka Plan Şeffaflığı</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>Uygulama arayüzünün şeffaflık derecesini ayarlayın.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <input 
                type="range" 
                min="0.3" 
                max="1.0" 
                step="0.05" 
                value={uiOpacity} 
                onChange={e => saveOpacity(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontWeight: "700", minWidth: 50, textAlign: "right" }}>{Math.round(uiOpacity * 100)}%</span>
            </div>
          </div>
        )}

        {settingsSubTab === "sistem" && (
          <div className="hy-panel" style={{ padding: 24, maxWidth: 600, border: "1px solid #F87171" }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#991B1B" }}>Uygulamayı Sıfırla</h3>
            <p className="muted small" style={{ marginBottom: 20 }}>Tüm kayıtlı mülkleri, kiracıları, sözleşmeleri ve ödemeleri temizleyerek fabrika ayarlarına dönün.</p>
            <button className="hy-btn danger" onClick={async () => {
              if (confirm("Tüm verileri kalıcı olarak sıfırlamak istediğinizden emin misiniz?")) {
                for (const key of Object.values(STORAGE_KEYS)) {
                  await window.storage.delete(key);
                }
                alert("Uygulama başarıyla sıfırlandı. Sayfa yenileniyor...");
                window.location.reload();
              }
            }}>
              <RefreshCw size={16} /> Tüm Verileri ve Önbelleği Sıfırla
            </button>
          </div>
        )}
      </>
    );
  }

  function renderMenu() {
    return (
      <div className="hy-panel" style={{ padding: 24 }}>
        <h3 style={{ marginTop: 0 }}>Menü & Hızlı Erişim</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
          {NAV.filter(n => n.id !== "menu").map(n => {
            const Icon = n.icon;
            return (
              <button key={n.id} onClick={() => goTab(n.id)} style={{ background: "#F9FAFB", border: "1px solid var(--border)", padding: 16, borderRadius: 12, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", fontWeight: "600", color: "var(--text)" }}>
                <Icon size={18} color="#E53935" />
                <span>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="hy-layout" style={{ opacity: uiOpacity }}>
      <aside className="hy-sidebar" style={{ 
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)), url('/IMG_9429.JPG')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="hy-sidebar-brand" style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px" }}>
          <img src="/img_9421.png" alt="HasYek Logo" style={{ width: 140, height: "auto", objectFit: "contain" }} />
        </div>
        <nav className="hy-nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button key={n.id} className={"hy-nav-item" + (active ? " active" : "")} onClick={() => goTab(n.id)}>
                <Icon size={18} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="hy-main">
        {tab === "ozet" && renderOzet()}
        {tab === "mulkler" && (selectedPropertyId ? renderPropertyDetail() : renderPropertiesList())}
        {tab === "kontrat_kayit" && renderKontratKayitTab()}
        {tab === "senetler" && renderSenetlerTab()}
        {tab === "kiracilar" && renderTenantsList()}
        {tab === "muhasebe_entegrasyonu" && renderMuhasebeEntegrasyonuTab()}
        {tab === "bakim" && renderMaintenance()}
        {tab === "muhasebe" && renderMuhasebe()}
        {tab === "banka" && renderBankaEntegrasyonu()}
        {tab === "ayarlar" && renderAyarlar()}
        {tab === "menu" && renderMenu()}
      </main>

      <style>{`
        :root {
          --primary: #E53935;
          --primary-dark: #C62828;
          --bg: #F8F9FA;
          --panel: #FFFFFF;
          --text: #111827;
          --text-soft: #6B7280;
          --border: #E5E7EB;
          --success: #10B981;
          --warning: #F59E0B;
          --danger: #EF4444;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); }
        .hy-app { min-height: 100vh; display: flex; }
        .hy-layout { display: flex; min-height: 100vh; width: 100vw; }
        .hy-sidebar { width: 260px; border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
        .hy-sidebar-brand { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); border-bottom: 1px solid var(--border); }
        .hy-nav { padding: 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
        .hy-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; border: none; background: transparent; color: var(--text-soft); font-size: 13.5px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: all 0.15s; }
        .hy-nav-item:hover { background: rgba(0,0,0,0.04); color: var(--text); }
        .hy-nav-item.active { background: #FEE2E2; color: #C62828; font-weight: 600; }
        .hy-main { flex: 1; padding: 32px; overflow-y: auto; max-height: 100vh; }
        .hy-topbar { display: flex; justifyContent: space-between; align-items: flex-start; margin-bottom: 24px; }
        .hy-page-title { font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; }
        .hy-page-sub { font-size: 13.5px; color: var(--text-soft); margin: 0; }
        .hy-panel { background: rgba(255, 255, 255, 0.95); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .hy-property-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .hy-property-card { background: rgba(255,255,255,0.95); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
        .hy-property-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .hy-property-img { height: 160px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; position: relative; color: #9CA3AF; }
        .hy-property-img img { width: 100%; height: 100%; object-fit: cover; }
        .hy-property-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-between; }
        .hy-property-title { font-size: 15px; font-weight: 700; color: var(--text); }
        .hy-property-addr { font-size: 13px; color: var(--text-soft); }
        .hy-status-badge { position: absolute; top: 12px; right: 12px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .hy-status-badge.good { background: #D1FAE5; color: #065F46; }
        .hy-status-badge.neutral { background: #F3F4F6; color: #374151; }
        .hy-pill-badge { padding: 4px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 600; display: inline-block; }
        .hy-pill-badge.good { background: #D1FAE5; color: #065F46; }
        .hy-pill-badge.neutral { background: #F3F4F6; color: #374151; }
        .hy-pill-badge.warn { background: #FEF3C7; color: #92400E; }
        .hy-pill-badge.bad { background: #FEE2E2; color: #991B1B; }
        .hy-btn { padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.15s; }
        .hy-btn.primary { background: var(--primary); color: #fff; }
        .hy-btn.primary:hover { background: var(--primary-dark); }
        .hy-btn.ghost { background: #F3F4F6; color: var(--text); border-color: var(--border); }
        .hy-btn.ghost:hover { background: #E5E7EB; }
        .hy-btn.danger { background: #FEE2E2; color: #991B1B; border-color: #F87171; }
        .hy-btn.danger:hover { background: #FECACA; }
        .hy-btn.sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
        .hy-fab { position: fixed; bottom: 32px; right: 32px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(229,57,53,0.4); cursor: pointer; transition: transform 0.2s; z-index: 40; }
        .hy-fab:hover { transform: scale(1.05); }
        .hy-modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .hy-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; }
        .hy-modal.wide { max-width: 800px; }
        .hy-modal-head { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justifyContent: space-between; align-items: center; }
        .hy-modal-head h3 { margin: 0; font-size: 18px; font-weight: 700; }
        .hy-modal-close { background: transparent; border: none; cursor: pointer; color: var(--text-soft); }
        .hy-modal-body { padding: 24px; overflow-y: auto; flex: 1; }
        .hy-modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; background: #F9FAFB; }
        .hy-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .hy-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text); }
        .hy-field.span-2 { grid-column: span 2; }
        .hy-field input, .hy-field select, .hy-field textarea { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); font-size: 13.5px; font-weight: 400; outline: none; background: #fff; width: 100%; }
        .hy-field input:focus, .hy-field select:focus, .hy-field textarea:focus { border-color: var(--primary); }
        .hy-back-link { background: none; border: none; color: var(--text-soft); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; padding: 0; margin-bottom: 12px; }
        .hy-back-link:hover { color: var(--text); }
        .hy-tabs2 { display: flex; gap: 8px; }
        .hy-tab2 { background: transparent; border: none; padding: 10px 16px; font-size: 13.5px; font-weight: 500; color: var(--text-soft); cursor: pointer; border-radius: 8px; transition: all 0.15s; }
        .hy-tab2.active { background: #F3F4F6; color: var(--text); font-weight: 600; }
        .hy-bell-wrap { position: relative; }
        .hy-bell { width: 40px; height: 40px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); position: relative; }
        .hy-notif-badge { position: absolute; top: -2px; right: -2px; background: var(--primary); color: #fff; font-size: 10px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .hy-notif-panel { position: absolute; right: 0; top: 48px; width: 320px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 16px; z-index: 50; }
        .hy-notif-item { padding: 10px 12px; border-radius: 8px; font-size: 12.5px; margin-bottom: 8px; line-height: 1.4; }
        .hy-notif-item.bad { background: #FEE2E2; color: #991B1B; }
        .hy-notif-item.warn { background: #FEF3C7; color: #92400E; }
        .hy-avatar { width: 36px; height: 36px; border-radius: 50%; background: #E5E7EB; color: #374151; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
        .muted { color: var(--text-soft); }
        .small { font-size: 12px; }
      `}</style>
    </div>
  );
}