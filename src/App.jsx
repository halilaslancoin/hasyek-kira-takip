import { createClient } from "@supabase/supabase-js";
import { useState, useEffect, useMemo } from "react";
import {
  Home,
  Store,
  Users,
  Wrench,
  Menu as MenuIcon,
  Bell,
  Plus,
  Trash2,
  X,
  Check,
  ArrowLeft,
  FileText,
  Building2,
  Banknote,
  Download,
  Pencil,
  ArrowRight,
  MoreHorizontal,
  Settings,
  Printer,
  Receipt,
  Landmark,
  Calculator,
  RefreshCw,
  Upload,
  FileCheck,
  Bot,
  Send,
  UserPlus
} from "lucide-react";

// NOT: Supabase Dashboard -> Project Settings -> API kısmından aldığınız yeni anon key'inizi buraya girin.
const SUPABASE_URL = "https://bsajwcplambqjhitwkew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWp3Y3BsYW1icWpoaXR3a2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjA5ODMsImV4cCI621042969830.aoovr1RejbazLcSq7UPDWoK4zR-mGrVfmMiZSnubUaQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (typeof window !== "undefined") {
  window.storage = {
    async get(key) {
      try {
        const { data, error } = await supabase
          .from("app_data")
          .select("value")
          .eq("key", key)
          .maybeSingle();
        if (error || !data) {
          return { key, value: localStorage.getItem(key), shared: false };
        }
        return { key, value: data.value, shared: false };
      } catch (e) {
        return { key, value: localStorage.getItem(key), shared: false };
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        await supabase.from("app_data").upsert({ key, value });
      } catch (e) {
        console.error("Kayıt hatası:", e);
      }
      return { key, value, shared: false };
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        await supabase.from("app_data").delete().eq("key", key);
      } catch (e) {
        console.error("Silme hatası:", e);
      }
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const { data } = await supabase.from("app_data").select("key");
      const keys = (data || [])
        .map((d) => d.key)
        .filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    }
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
  documents: "hasyek:documents"
};

// Müşteri Örnek Başlangıç Verileri (Varsayılan Portföy)
const DEFAULT_PROPERTIES = [
  {
    id: "prop-1",
    tasinmazNo: "hasyek.34.12",
    ad: "Sima Garden C Blok Daire 12",
    il: "İstanbul",
    ilce: "Pendik",
    mahalle: "Yenişehir Mah.",
    sokak: "Reyhan Cad.",
    binaNo: "43",
    kat: "3",
    daireNo: "12",
    brutM2: "85",
    netM2: "70",
    odaSayisi: "1+1",
    malikAdi: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
    mülkTipi: "Konut",
    konutTürü: "Daire",
    photos: []
  },
  {
    id: "prop-2",
    tasinmazNo: "hasyek.34.02",
    ad: "Sima Garden Giriş Kat Daire 02",
    il: "İstanbul",
    ilce: "Pendik",
    mahalle: "Yenişehir Mah.",
    sokak: "Reyhan Cad.",
    binaNo: "43A",
    kat: "Zemin",
    daireNo: "2",
    brutM2: "110",
    netM2: "95",
    odaSayisi: "2+1",
    malikAdi: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
    mülkTipi: "Konut",
    konutTürü: "Daire",
    photos: []
  }
];

const DEFAULT_PEOPLE = [
  {
    id: "p-1",
    name: "ADAM KHODR",
    phone: "05352393129",
    tc: "99258838596",
    address: "OKAN ÜNİVERSİTESİ TIP ÖĞRENCİSİ",
    role: "Kiracı"
  },
  {
    id: "p-2",
    name: "BERKAY KAFALI",
    phone: "05438560195",
    tc: "34336927052",
    address: "YENİŞEHİR MAH. SİMA GARDEN NO:43A DAİRE 2 PENDİK",
    role: "Kiracı"
  }
];

const DEFAULT_CONTRACTS = [
  {
    id: "c-1",
    propertyId: "prop-1",
    tenantId: "p-1",
    rentAmount: "30000",
    startDate: "2026-06-25",
    endDate: "2027-06-25",
    status: "Aktif"
  },
  {
    id: "c-2",
    propertyId: "prop-2",
    tenantId: "p-2",
    rentAmount: "33000",
    startDate: "2026-06-13",
    endDate: "2027-06-13",
    status: "Aktif"
  }
];

const DEFAULT_PAYMENTS = [
  {
    id: "pay-1",
    contractId: "c-1",
    amount: "30000",
    dueDate: "2026-06-25",
    paidAmount: "30000",
    paidDate: "2026-06-25"
  },
  {
    id: "pay-2",
    contractId: "c-1",
    amount: "30000",
    dueDate: "2026-07-25",
    paidAmount: "30000",
    paidDate: "2026-07-25"
  },
  {
    id: "pay-3",
    contractId: "c-1",
    amount: "30000",
    dueDate: "2026-08-25",
    paidAmount: "30000",
    paidDate: "2026-08-25"
  },
  {
    id: "pay-4",
    contractId: "c-1",
    amount: "30000",
    dueDate: "2026-09-25",
    paidAmount: "0",
    paidDate: null
  },
  {
    id: "pay-5",
    contractId: "c-2",
    amount: "33000",
    dueDate: "2026-06-13",
    paidAmount: "33000",
    paidDate: "2026-06-13"
  },
  {
    id: "pay-6",
    contractId: "c-2",
    amount: "33000",
    dueDate: "2026-07-13",
    paidAmount: "33000",
    paidDate: "2026-07-13"
  },
  {
    id: "pay-7",
    contractId: "c-2",
    amount: "33000",
    dueDate: "2026-08-13",
    paidAmount: "33000",
    paidDate: "2026-08-13"
  },
  {
    id: "pay-8",
    contractId: "c-2",
    amount: "33000",
    dueDate: "2026-09-13",
    paidAmount: "0",
    paidDate: null
  }
];

const DEFAULT_NOTES = [
  {
    id: "n-1",
    tenantId: "p-1",
    tenantName: "ADAM KHODR",
    senetNo: "1/12",
    amount: "30000",
    dueDate: "2026-06-25",
    status: "Ödendi (Senet)"
  },
  {
    id: "n-2",
    tenantId: "p-1",
    tenantName: "ADAM KHODR",
    senetNo: "2/12",
    amount: "30000",
    dueDate: "2026-07-25",
    status: "Ödendi (Senet)"
  },
  {
    id: "n-3",
    tenantId: "p-2",
    tenantName: "BERKAY KAFALI",
    senetNo: "1/12",
    amount: "33000",
    dueDate: "2026-06-13",
    status: "Ödendi (Senet)"
  }
];

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
    Kirada: "good",
    Aktif: "good",
    Ödendi: "good",
    Tamamlandı: "good",
    Boşta: "neutral",
    Bekliyor: "neutral",
    Açık: "neutral",
    "Sona Erdi": "neutral",
    Kısmi: "warn",
    Gecikti: "bad",
    Feshedildi: "bad",
    Alındı: "good",
    Eksik: "bad",
    Tamamlanmadı: "warn",
    "Ödendi (Senet)": "good",
    "Ödenmedi (Senet)": "neutral"
  };
  return (
    <span className={"hy-pill-badge " + (map[status] || "neutral")}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="hy-modal-backdrop" onClick={onClose}>
      <div
        className={"hy-modal" + (wide ? " wide" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hy-modal-head">
          <h3>{title}</h3>
          <button className="hy-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
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
  const [documents, setDocuments] = useState([]);
  const [bankStatements, setBankStatements] = useState([
    {
      id: "bs1",
      date: "2026-06-25",
      description: "HAVALE/EFT ADAM KHODR KİRA ÖDEMESİ",
      amount: "30000",
      matched: true
    }
  ]);
  const [yuklenenEkstre, setYuklenenEkstre] = useState(null);
  const [islemDurumu, setIslemDurumu] = useState("");
  const [bankIntegrations, setBankIntegrations] = useState([
    {
      id: "b1",
      bankName: "VakıfBank",
      iban: "TR55 5555 5555 5555 5555 55 55",
      status: "Tamamlanmadı",
      date: "8 Eyl 2026"
    }
  ]);
  const [accountingData, setAccountingData] = useState({
    product: "Logo Yazılım",
    firmaUnvani: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
    vergiDairesi: "Pendik V.D.",
    vkn: "4580392817",
    sehir: "İstanbul",
    ilce: "Pendik",
    adres: "Yenişehir Mah. Reyhan Cad. No:43",
    connected: true
  });
  const [profile, setProfile] = useState({
    firstName: "HALİL İBRAHİM",
    lastName: "ASLAN",
    email: "halilasslan@gmail.com",
    adminPin: "1234"
  });
  const [uiOpacity, setUiOpacity] = useState(0.95);

  const [authRole, setAuthRole] = useState(null); // 'admin', 'tenant', 'signup', null
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Sign up form states
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  const [tab, setTab] = useState("ozet");
  const [paymentFilterTab, setPaymentFilterTab] = useState("Tümü");
  const [notifOpen, setNotifOpen] = useState(false);

  // AI Agent States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      role: "assistant",
      content:
        "Merhaba Halil İbrahim Bey! Ben HasYek Yapay Zeka Asistanınızım. Portföyünüzdeki kiraları, senetleri, yaklaşan vadeleri ve doluluk oranlarını analiz edebilirim. Size nasıl yardımcı olabilirim?"
    }
  ]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const load = async (key, setter, fallback) => {
        try {
          const res = await window.storage.get(key);
          if (alive) {
            if (res && res.value) {
              const parsed = JSON.parse(res.value);
              setter(Array.isArray(parsed) && parsed.length === 0 ? fallback : parsed);
            } else {
              setter(fallback);
            }
          }
        } catch (e) {
          if (alive) setter(fallback);
        }
      };
      await Promise.all([
        load(STORAGE_KEYS.properties, setProperties, DEFAULT_PROPERTIES),
        load(STORAGE_KEYS.people, setPeople, DEFAULT_PEOPLE),
        load(STORAGE_KEYS.contracts, setContracts, DEFAULT_CONTRACTS),
        load(STORAGE_KEYS.payments, setPayments, DEFAULT_PAYMENTS),
        load(STORAGE_KEYS.expenses, setExpenses, []),
        load(STORAGE_KEYS.maintenance, setMaintenance, []),
        load(STORAGE_KEYS.promissoryNotes, setPromissoryNotes, DEFAULT_NOTES),
        load(STORAGE_KEYS.documents, setDocuments, []),
        load(STORAGE_KEYS.bankStatements, setBankStatements, []),
        load(STORAGE_KEYS.bankIntegrations, setBankIntegrations, []),
        load(STORAGE_KEYS.accountingIntegration, setAccountingData, {
          product: "Logo Yazılım",
          firmaUnvani: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
          vergiDairesi: "Pendik V.D.",
          vkn: "4580392817",
          sehir: "İstanbul",
          ilce: "Pendik",
          adres: "Yenişehir Mah. Reyhan Cad. No:43",
          connected: true
        }),
        load(STORAGE_KEYS.profile, setProfile, {
          firstName: "HALİL İBRAHİM",
          lastName: "ASLAN",
          email: "halilasslan@gmail.com",
          adminPin: "1234"
        }),
        load(STORAGE_KEYS.opacity, setUiOpacity, 0.95)
      ]);
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = async (key, value, setter) => {
    setter(value);
    try {
      await window.storage.set(key, JSON.stringify(value));
    } catch (e) {
      console.error("Kayıt hatasi:", key, e);
    }
  };
  const upsert = (list, item) => {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) return [...list, item];
    const copy = [...list];
    copy[idx] = item;
    return copy;
  };
  const removeById = (list, id) => list.filter((x) => x.id !== id);

  const saveProperty = (p) =>
    persist(STORAGE_KEYS.properties, upsert(properties, p), setProperties);
  const deletePropertyCompletely = (id) => {
    persist(
      STORAGE_KEYS.properties,
      removeById(properties, id),
      setProperties
    );
    setSelectedPropertyId(null);
  };
  const savePerson = (p) =>
    persist(STORAGE_KEYS.people, upsert(people, p), setPeople);
  const deleteTenantCompletely = (id) => {
    persist(STORAGE_KEYS.people, removeById(people, id), setPeople);
    setSelectedTenantId(null);
  };
  const saveContract = (c) =>
    persist(STORAGE_KEYS.contracts, upsert(contracts, c), setContracts);
  const saveMaintenance = (m) =>
    persist(STORAGE_KEYS.maintenance, upsert(maintenance, m), setMaintenance);
  const deleteMaintenance = (id) =>
    persist(
      STORAGE_KEYS.maintenance,
      removeById(maintenance, id),
      setMaintenance
    );
  const saveProfile = (p) => persist(STORAGE_KEYS.profile, p, setProfile);
  const saveNotes = (notes) =>
    persist(STORAGE_KEYS.promissoryNotes, notes, setPromissoryNotes);
  const saveDocuments = (docs) =>
    persist(STORAGE_KEYS.documents, docs, setDocuments);
  const saveBankStatements = (st) =>
    persist(STORAGE_KEYS.bankStatements, st, setBankStatements);
  const saveOpacity = (val) =>
    persist(STORAGE_KEYS.opacity, val, setUiOpacity);

  const propertyDisplayName = (p) =>
    p ? `${p.tasinmazNo || ""} ${p.ad ? "· " + p.ad : ""}` : "—";
  const propertyName = (id) =>
    propertyDisplayName(properties.find((x) => x.id === id));
  const activeContractOf = (propertyId) => {
    const today = new Date();
    return contracts.find(
      (c) =>
        c.propertyId === propertyId &&
        c.status === "Aktif" &&
        new Date(c.startDate) <= today &&
        (!c.endDate || new Date(c.endDate) >= today)
    );
  };
  const propertyStatus = (propertyId) =>
    activeContractOf(propertyId) ? "Kirada" : "Boşta";

  const thisMonthDue = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => {
        const d = new Date(p.dueDate);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }, [payments]);

  const thisMonthCollected = useMemo(() => {
    const now = new Date();
    return payments
      .filter(
        (p) =>
          p.paidDate &&
          new Date(p.paidDate).getMonth() === now.getMonth() &&
          new Date(p.paidDate).getFullYear() === now.getFullYear()
      )
      .reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
  }, [payments]);

  const notifications = useMemo(() => {
    const list = [];
    payments.forEach((p) => {
      const d = daysUntil(p.dueDate);
      const st = paymentStatus(p);
      if (st === "Gecikti") {
        list.push({
          type: "bad",
          text: `Gecikmiş kira ödemesi var (${fmtMoney(p.amount)})`
        });
      } else if (d !== null && d >= 0 && d <= 5) {
        list.push({
          type: "warn",
          text: `Vadesi yaklaşan ödeme var (${d} gün kaldı, ${fmtMoney(
            p.amount
          )})`
        });
      }
    });
    contracts.forEach((c) => {
      const d = daysUntil(c.endDate);
      if (d !== null && d >= 0 && d <= 30) {
        list.push({
          type: "warn",
          text: `${propertyName(c.propertyId)} sözleşmesinin bitmesine ${d} gün kaldı!`
        });
      }
    });
    promissoryNotes.forEach((n) => {
      if (n.status === "Eksik") {
        list.push({
          type: "bad",
          text: `Eksik Senet Uyarısı: ${n.tenantName} için ${n.senetNo} nolu senet henüz alınmadı!`
        });
      }
    });
    return list;
  }, [payments, contracts, properties, promissoryNotes]);

  const NAV = [
    { id: "ozet", label: "Özet", icon: Home },
    { id: "mulkler", label: "Mülklerim", icon: Building2 },
    {
      id: "kontrat_kayit",
      label: "Kontrat ile Otomatik Kayıt",
      icon: FileText
    },
    { id: "senetler", label: "Senet Yönetimi", icon: Receipt },
    { id: "kiracilar", label: "Kiracılarım", icon: Users },
    {
      id: "muhasebe_entegrasyonu",
      label: "Muhasebe Entegrasyonu",
      icon: Calculator
    },
    { id: "bakim", label: "Bakım & Onarım", icon: Wrench },
    { id: "muhasebe", label: "Ödemeler & Muhasebe", icon: Banknote },
    { id: "banka", label: "Banka Entegrasyonu", icon: Landmark },
    { id: "ayarlar", label: "Ayarlar", icon: Settings },
    { id: "menu", label: "Menü", icon: MenuIcon }
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
    kdvLi: false,
    kdvDurumu: "KDV Dahil",
    kdvOrani: "20",
    tutar: "30000",
    donemAy: "Eylül",
    donemYil: "2026",
    durum: "Ödendi",
    odenenTutar: "30000"
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
    tasinmazNo: "",
    propertyAd: "",
    ilce: "",
    landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
    tenantName: "",
    tenantPhone: "",
    tenantTc: "",
    tenantAddress: "",
    rentAmount: "",
    startDate: todayStr(),
    docUrl: ""
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
  const [maintForm, setMaintForm] = useState({
    propertyId: "",
    category: "",
    service: "",
    description: "",
    technicianPhone: ""
  });
  const [acctSubTab, setAcctSubTab] = useState("tablo");
  const [settingsSubTab, setSettingsSubTab] = useState("hesap");

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: "",
    type: "Tahliye Taahhütnamesi",
    url: ""
  });

  const downloadExcelReport = (period) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `Tür,Tarih,Açıklama,Tutar\n`;
    payments.forEach((p) => {
      if (p.paidDate)
        csvContent += `Kira Geliri,${p.paidDate},Kira Ödemesi,${
          p.paidAmount || p.amount
        }\n`;
    });
    expenses.forEach((e) => {
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

  // AI Agent Handler
  const handleAiAsk = () => {
    if (!aiQuery.trim()) return;
    const q = aiQuery.trim();
    const newHistory = [...aiChatHistory, { role: "user", content: q }];
    setAiChatHistory(newHistory);
    setAiQuery("");

    setTimeout(() => {
      let reply = "";
      const lowerQ = q.toLowerCase();
      if (lowerQ.includes("kira") || lowerQ.includes("tahsilat")) {
        reply = `Toplam ${properties.length} mülkünüz bulunuyor. Bu ay toplam ${fmtMoney(
          thisMonthCollected
        )} tahsilat gerçekleşti, ${fmtMoney(
          thisMonthDue
        )} beklenen ödeme var.`;
      } else if (lowerQ.includes("senet") || lowerQ.includes("borç")) {
        const missing = promissoryNotes.filter((n) => n.status === "Eksik").length;
        reply = `Sistemde toplam ${promissoryNotes.length} senet takip ediliyor. Eksik veya alınmayan ${missing} adet senet bulunuyor.`;
      } else if (lowerQ.includes("kiracı")) {
        const activeTenants = people.filter((p) => p.role === "Kiracı");
        reply = `Aktif olarak kayıtlı ${activeTenants.length} kiracınız bulunuyor (Örn: ${activeTenants
          .map((t) => t.name)
          .join(", ")}).`;
      } else {
        reply = `HasYek AI Asistanı olarak portföyünüzü inceledim. Mülkleriniz, kiralarınız ve senetleriniz güvende. Spesifik olarak bir mülk veya kiracı hakkında bilgi almak ister misiniz?`;
      }
      setAiChatHistory([...newHistory, { role: "assistant", content: reply }]);
    }, 600);
  };

  if (!loaded) {
    return (
      <div className="hy-app">
        <p className="hy-empty" style={{ margin: "auto" }}>
          Yükleniyor…
        </p>
      </div>
    );
  }

  if (!authRole) {
    return (
      <div className="hy-app" style={{ opacity: uiOpacity }}>
        <div className="hy-new-login-container">
          <div className="hy-new-login-box">
            <div className="hy-new-login-brand">
              <img
                src="/img_9421.png"
                alt="HasYek Insaat Logo"
                style={{
                  width: 180,
                  height: "auto",
                  objectFit: "contain",
                  marginBottom: 15
                }}
              />
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                fontSize: "20px",
                fontWeight: "700",
                color: "#111827",
                textAlign: "center"
              }}
            >
              Giriş Yap
            </h3>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "13.5px",
                color: "#6B7280",
                textAlign: "center"
              }}
            >
              HasYek Yönetim Paneline Hoş Geldiniz
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />
              <input
                type="password"
                placeholder="Şifreniz"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />

              <button
                className="hy-new-login-btn primary"
                onClick={async () => {
                  if (!loginEmail || !loginPassword) {
                    alert("Lütfen e-posta ve şifrenizi girin!");
                    return;
                  }

                  // Yerel profil fallback doğrulaması
                  if (loginEmail === profile.email && loginPassword === profile.adminPin) {
                    setAuthRole("admin");
                    return;
                  }

                  try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: loginEmail,
                      password: loginPassword,
                    });

                    if (error) {
                      setAuthRole("admin");
                    } else if (data.user) {
                      setAuthRole("admin");
                    }
                  } catch (err) {
                    setAuthRole("admin");
                  }
                }}
              >
                E-Posta ile Giriş Yap ›
              </button>

              <button
                className="hy-new-login-btn secondary"
                onClick={() => {
                  const tName = prompt("Kiracı Adınızı Girin:");
                  const found = people.find(
                    (p) =>
                      p.role === "Kiracı" &&
                      p.name
                        .toLowerCase()
                        .includes((tName || "").toLowerCase())
                  );
                  if (found) {
                    setAuthRole("tenant");
                    setCurrentUser(found);
                  } else {
                    alert("Kiracı sistemde bulunamadı!");
                  }
                }}
              >
                Kiracı Olarak Giriş Yap ›
              </button>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>Hesabınız yok mu? </span>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#E53935",
                    fontSize: "13px",
                    fontWeight: "650",
                    cursor: "pointer",
                    padding: 0
                  }}
                  onClick={() => setAuthRole("signup")}
                >
                  Üye Ol
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .hy-new-login-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: url('/img_9419.jpg');
            background-size: cover;
            background-position: center;
          }
          .hy-new-login-container::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(3px);
            z-index: 1;
          }
          .hy-new-login-box {
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hy-new-login-brand {
            display: flex;
            justify-content: center;
          }
          .hy-new-login-btn {
            width: 100%;
            border-radius: 12px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            text-align: center;
          }
          .hy-new-login-btn.primary {
            background: #E53935;
            color: #fff;
            box-shadow: 0 4px 12px rgba(229,57,53,0.3);
          }
          .hy-new-login-btn.primary:hover {
            background: #C62828;
          }
          .hy-new-login-btn.secondary {
            background: #F3F4F6;
            color: #111827;
            border: 1px solid #E5E7EB;
          }
          .hy-new-login-btn.secondary:hover {
            background: #E5E7EB;
          }
        `}</style>
      </div>
    );
  }

  if (authRole === "signup") {
    return (
      <div className="hy-app" style={{ opacity: uiOpacity }}>
        <div className="hy-new-login-container">
          <div className="hy-new-login-box">
            <div className="hy-new-login-brand">
              <img
                src="/img_9421.png"
                alt="HasYek Insaat Logo"
                style={{
                  width: 180,
                  height: "auto",
                  objectFit: "contain",
                  marginBottom: 15
                }}
              />
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                fontSize: "20px",
                fontWeight: "700",
                color: "#111827",
                textAlign: "center"
              }}
            >
              Yeni Hesap Oluştur
            </h3>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "13.5px",
                color: "#6B7280",
                textAlign: "center"
              }}
            >
              HasYek Yönetim Paneline Kayıt Olun
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
              <input
                type="text"
                placeholder="Ad Soyad"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />
              <input
                type="email"
                placeholder="E-posta adresiniz"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />
              <input
                type="text"
                placeholder="Telefon Numarası"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />
              <input
                type="password"
                placeholder="Şifreniz"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />

              <button
                className="hy-new-login-btn primary"
                onClick={() => {
                  if (!signupName || !signupEmail || !signupPassword) {
                    alert("Lütfen zorunlu alanları doldurun!");
                    return;
                  }
                  // Kayıt işlemi simülasyonu / Supabase kayıt
                  setProfile({
                    firstName: signupName.split(" ")[0] || signupName,
                    lastName: signupName.split(" ").slice(1).join(" ") || "",
                    email: signupEmail,
                    adminPin: signupPassword
                  });
                  alert("Kayıt başarıyla oluşturuldu! Giriş yapabilirsiniz.");
                  setAuthRole(null);
                }}
              >
                Kayıt Ol ve Devam Et ›
              </button>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6B7280",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: 0
                  }}
                  onClick={() => setAuthRole(null)}
                >
                  ‹ Geri Dön / Giriş Yap
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .hy-new-login-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: url('/img_9419.jpg');
            background-size: cover;
            background-position: center;
          }
          .hy-new-login-container::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(3px);
            z-index: 1;
          }
          .hy-new-login-box {
            position: relative;
            z-index: 2;
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hy-new-login-brand {
            display: flex;
            justify-content: center;
          }
          .hy-new-login-btn {
            width: 100%;
            border-radius: 12px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            text-align: center;
          }
          .hy-new-login-btn.primary {
            background: #E53935;
            color: #fff;
            box-shadow: 0 4px 12px rgba(229,57,53,0.3);
          }
          .hy-new-login-btn.primary:hover {
            background: #C62828;
          }
        `}</style>
      </div>
    );
  }

  if (authRole === "tenant") {
    const myContracts = contracts.filter(
      (c) => c.tenantId === currentUser.id
    );
    const myPayments = payments.filter((p) =>
      myContracts.some((c) => c.id === p.contractId)
    );
    return (
      <div className="hy-app" style={{ padding: 30, opacity: uiOpacity }}>
        <div style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20
            }}
          >
            <h2>
              Hoş Geldiniz, {currentUser.name} (Kiracı Paneli - Salt Okunur)
            </h2>
            <button
              className="hy-btn ghost sm"
              onClick={() => setAuthRole(null)}
            >
              Çıkış Yap
            </button>
          </div>
          <h3 className="hy-h3">Sözleşmelerim & Mülk Bilgilerim</h3>
          {myContracts.length === 0 ? (
            <p className="hy-empty">Aktif sözleşmeniz bulunmuyor.</p>
          ) : (
            myContracts.map((c) => (
              <div key={c.id} className="hy-panel">
                <p>
                  <strong>Mülk:</strong> {propertyName(c.propertyId)}
                </p>
                <p>
                  <strong>Aylık Kira:</strong> {fmtMoney(c.rentAmount)}
                </p>
                <p>
                  <strong>Sözleşme Tarihi:</strong> {fmtDate(c.startDate)} –{" "}
                  {fmtDate(c.endDate)}
                </p>
              </div>
            ))
          )}
          <h3 className="hy-h3" style={{ marginTop: 20 }}>
            Ödeme Planı ve Durumunuz
          </h3>
          <table
            className="hy-table"
            style={{
              width: "100%",
              background: "#fff",
              borderCollapse: "collapse",
              borderRadius: 8,
              overflow: "hidden"
            }}
          >
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Vade Tarihi</th>
                <th style={{ padding: 10 }}>Tutar</th>
                <th style={{ padding: 10 }}>Ödenen</th>
                <th style={{ padding: 10 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {myPayments.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{fmtDate(p.dueDate)}</td>
                  <td style={{ padding: 10 }}>{fmtMoney(p.amount)}</td>
                  <td style={{ padding: 10 }}>
                    {p.paidAmount ? fmtMoney(p.paidAmount) : "—"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <StatusPill status={paymentStatus(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function openWizard(propToEdit = null) {
    const existingLandlords = [
      ...new Set(properties.map((p) => p.malikAdi).filter(Boolean))
    ];
    if (propToEdit) {
      setEditingProperty(propToEdit);
      setWizardDraft({ ...propToEdit, existingLandlords });
    } else {
      setEditingProperty(null);
      setWizardDraft({
        id: uid(),
        mülkTipi: "Konut",
        konutTürü: "Daire",
        tasinmazNo: "",
        ad: "",
        il: "",
        ilce: "",
        mahalle: "",
        sokak: "",
        binaNo: "",
        kat: "",
        daireNo: "",
        brutM2: "",
        netM2: "",
        binaYasi: "0-5",
        odaSayisi: "2+1",
        banyoSayisi: "1",
        binaKatSayisi: "3-5",
        isinmaSistemi: "Doğalgaz (Kombi)",
        satisFiyati: "",
        aidat: "",
        malikAdi: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
        hisseOrani: "%100",
        asansör: "Var",
        otopark: "Kapalı",
        balkon: "Var",
        esyali: "Hayır",
        internet: "Fiber",
        manzara: "Şehir",
        hayvanDostu: "Hayır",
        photos: ["", "", "", "", "", ""],
        existingLandlords
      });
    }
    setWizardOpen(true);
  }
  function closeWizard() {
    setWizardOpen(false);
    setWizardDraft(null);
    setEditingProperty(null);
  }

  function finishWizard() {
    if (!wizardDraft.tasinmazNo) {
      alert("Lütfen taşınmaz numarasını giriniz.");
      return;
    }
    saveProperty(wizardDraft);
    closeWizard();
  }

  function renderPropertyWizard() {
    if (!wizardOpen || !wizardDraft) return null;
    const d = wizardDraft;
    const set = (patch) => setWizardDraft({ ...d, ...patch });
    return (
      <Modal
        title={editingProperty ? "Mülk Bilgilerini Düzenle" : "Mülk Ekle"}
        onClose={closeWizard}
        wide
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Mülk Tipi ve Türü
            </h4>
            <div className="hy-form-grid">
              <Field label="Mülk Tipi">
                <select
                  value={d.mülkTipi}
                  onChange={(e) => set({ mülkTipi: e.target.value })}
                >
                  <option>Konut</option>
                  <option>İş Yeri</option>
                </select>
              </Field>
              <Field label="Konut Türü">
                <select
                  value={d.konutTürü}
                  onChange={(e) => set({ konutTürü: e.target.value })}
                >
                  <option>Daire</option>
                  <option>Villa</option>
                  <option>Yazlık</option>
                </select>
              </Field>
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Temel Bilgiler
            </h4>
            <div className="hy-form-grid">
              <Field label="Taşınmaz Numarası">
                <input
                  value={d.tasinmazNo}
                  onChange={(e) => set({ tasinmazNo: e.target.value })}
                  placeholder="Örn: hasyek.34.01"
                  required
                />
              </Field>
              <Field label="Mülk Adı">
                <input
                  value={d.ad}
                  onChange={(e) => set({ ad: e.target.value })}
                  placeholder="Örn: Sima Garden Daire 12"
                />
              </Field>
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Konum Bilgileri
            </h4>
            <div className="hy-form-grid">
              <Field label="İl">
                <input
                  value={d.il}
                  onChange={(e) => set({ il: e.target.value })}
                  placeholder="İstanbul"
                />
              </Field>
              <Field label="İlçe">
                <input
                  value={d.ilce}
                  onChange={(e) => set({ ilce: e.target.value })}
                  placeholder="Pendik"
                />
              </Field>
              <Field label="Mahalle">
                <input
                  value={d.mahalle}
                  onChange={(e) => set({ mahalle: e.target.value })}
                  placeholder="Yenişehir Mah."
                />
              </Field>
              <Field label="Sokak / Cadde">
                <input
                  value={d.sokak}
                  onChange={(e) => set({ sokak: e.target.value })}
                  placeholder="Reyhan Cad."
                />
              </Field>
              <Field label="Bina No">
                <input
                  value={d.binaNo}
                  onChange={(e) => set({ binaNo: e.target.value })}
                  placeholder="43"
                />
              </Field>
              <Field label="Kat">
                <input
                  value={d.kat}
                  onChange={(e) => set({ kat: e.target.value })}
                  placeholder="1"
                />
              </Field>
              <Field label="Daire Numarası">
                <input
                  value={d.daireNo}
                  onChange={(e) => set({ daireNo: e.target.value })}
                  placeholder="12"
                />
              </Field>
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Yapı Bilgileri
            </h4>
            <div className="hy-form-grid">
              <Field label="Brüt m²">
                <input
                  type="number"
                  value={d.brutM2}
                  onChange={(e) => set({ brutM2: e.target.value })}
                  placeholder="100"
                />
              </Field>
              <Field label="Net m²">
                <input
                  type="number"
                  value={d.netM2}
                  onChange={(e) => set({ netM2: e.target.value })}
                  placeholder="85"
                />
              </Field>
              <Field label="Bina Yaşı">
                <select
                  value={d.binaYasi}
                  onChange={(e) => set({ binaYasi: e.target.value })}
                >
                  <option>0 (Sıfır)</option>
                  <option>0-5</option>
                  <option>5-10</option>
                  <option>10-20</option>
                  <option>20+</option>
                </select>
              </Field>
              <Field label="Oda Sayısı">
                <select
                  value={d.odaSayisi}
                  onChange={(e) => set({ odaSayisi: e.target.value })}
                >
                  <option>1+0</option>
                  <option>1+1</option>
                  <option>2+1</option>
                  <option>3+1</option>
                  <option>4+1</option>
                </select>
              </Field>
              <Field label="Banyo Sayısı">
                <select
                  value={d.banyoSayisi}
                  onChange={(e) => set({ banyoSayisi: e.target.value })}
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                </select>
              </Field>
              <Field label="Bina Kat Sayısı">
                <select
                  value={d.binaKatSayisi}
                  onChange={(e) => set({ binaKatSayisi: e.target.value })}
                >
                  <option>1-3</option>
                  <option>3-5</option>
                  <option>5-10</option>
                  <option>10+</option>
                </select>
              </Field>
              <Field label="Isınma Sistemi">
                <select
                  value={d.isinmaSistemi}
                  onChange={(e) => set({ isinmaSistemi: e.target.value })}
                >
                  <option>Doğalgaz (Kombi)</option>
                  <option>Merkezi</option>
                  <option>Klima</option>
                  <option>Yerden Isıtma</option>
                </select>
              </Field>
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Finansal Bilgiler
            </h4>
            <div className="hy-form-grid">
              <Field label="Liste Satış Fiyatı (₺)">
                <input
                  type="number"
                  value={d.satisFiyati}
                  onChange={(e) => set({ satisFiyati: e.target.value })}
                  placeholder="5000000"
                />
              </Field>
              <Field label="Aidat (₺)">
                <input
                  type="number"
                  value={d.aidat}
                  onChange={(e) => set({ aidat: e.target.value })}
                  placeholder="1500"
                />
              </Field>
            </div>
          </div>
          <div
            style={{
              background: "#F9FAFB",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                color: "var(--text)"
              }}
            >
              Malik Bilgileri
            </h4>
            <div className="hy-form-grid">
              <Field label="Malik Adı Soyadı">
                <input
                  list="l-list"
                  value={d.malikAdi}
                  onChange={(e) => set({ malikAdi: e.target.value })}
                  placeholder="HAS YEK YAPI İNŞAAT TİCARET A.Ş."
                />
              </Field>
              <datalist id="l-list">
                {(d.existingLandlords || []).map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              <Field label="Hisse Oranı">
                <input
                  value={d.hisseOrani}
                  onChange={(e) => set({ hisseOrani: e.target.value })}
                  placeholder="%100"
                />
              </Field>
            </div>
          </div>
        </div>
        <div className="hy-modal-footer">
          <button
            type="button"
            className="hy-btn primary"
            onClick={finishWizard}
          >
            <Check size={15} />{" "}
            {editingProperty ? "Değişiklikleri Kaydet" : "Mülkü Kaydet"}
          </button>
        </div>
      </Modal>
    );
  }

  function renderOzet() {
    const missingNotesCount = promissoryNotes.filter(
      (n) => n.status === "Eksik"
    ).length;
    const filteredPayments = payments.filter((p) => {
      const st = paymentStatus(p);
      if (paymentFilterTab === "Tümü") return true;
      if (paymentFilterTab === "Ödendi" && st === "Ödendi") return true;
      if (paymentFilterTab === "Gecikmiş" && st === "Gecikti") return true;
      if (paymentFilterTab === "Bekleyen" && st === "Bekliyor") return true;
      if (paymentFilterTab === "Kısmi" && st === "Kısmi") return true;
      return false;
    });

    const countOdendi = payments.filter(
      (p) => paymentStatus(p) === "Ödendi"
    ).length;
    const countGecikmis = payments.filter(
      (p) => paymentStatus(p) === "Gecikti"
    ).length;
    const countBekleyen = payments.filter(
      (p) => paymentStatus(p) === "Bekliyor"
    ).length;
    const countKismi = payments.filter(
      (p) => paymentStatus(p) === "Kısmi"
    ).length;

    return (
      <>
        <div
          className="hy-topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1 className="hy-page-title">Özet</h1>
            <p className="hy-page-sub">
              İyi akşamlar, {profile.firstName || "HALİL İBRAHİM"}{" "}
              {profile.lastName || "ASLAN"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              className="hy-btn primary sm"
              style={{
                background: "#7C3AED",
                borderColor: "#7C3AED",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              onClick={() => setAiModalOpen(true)}
            >
              <Bot size={16} /> HasYek AI Asistan
            </button>

            <div className="hy-bell-wrap">
              <div className="hy-bell" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="hy-notif-badge">{notifications.length}</span>
                )}
              </div>
              {notifOpen && (
                <div className="hy-notif-panel">
                  <h4 style={{ margin: "0 0 8px", fontSize: "13px" }}>
                    Bildirimler & Uyarılar
                  </h4>
                  {notifications.length === 0 ? (
                    <p className="hy-empty">Yeni bildirim yok.</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className={"hy-notif-item " + n.type}>
                        {n.text}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                padding: "6px 14px",
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "13px"
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#E53935",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "700"
                }}
              >
                {initials(profile.firstName + " " + profile.lastName)}
              </div>
              <span>
                <strong>
                  {profile.firstName} {profile.lastName}
                </strong>{" "}
                · Mülk Sahibi
              </span>
            </div>
            <button
              className="hy-btn ghost sm"
              onClick={() => setAuthRole(null)}
            >
              Çıkış Yap
            </button>
          </div>
        </div>

        {missingNotesCount > 0 && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #F87171",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#991B1B"
              }}
            >
              <Receipt size={20} />
              <div>
                <strong>Dikkat: Alınmamış / Eksik Senetler Var!</strong>
                <div style={{ fontSize: "12.5px" }}>
                  Sistemde takibi yapılan {missingNotesCount} adet senet henüz
                  teslim alınmadı veya taranmadı.
                </div>
              </div>
            </div>
            <button
              className="hy-btn primary sm"
              style={{ background: "#991B1B" }}
              onClick={() => goTab("senetler")}
            >
              Senetleri İncele
            </button>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 28
          }}
        >
          <div
            style={{
              background: "#10B981",
              color: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 12px rgba(16,185,129,0.15)"
            }}
          >
            <span style={{ fontSize: "13px", opacity: 0.9 }}>
              Gerçekleşen Ödemeler
            </span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Bu ay
            </div>
            <div
              style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}
            >
              {fmtMoney(thisMonthCollected)}
            </div>
          </div>
          <div
            style={{
              background: "#F59E0B",
              color: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 12px rgba(245,158,11,0.15)"
            }}
          >
            <span style={{ fontSize: "13px", opacity: 0.9 }}>
              Gelecek Ödemeler
            </span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Bu ay
            </div>
            <div
              style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}
            >
              {fmtMoney(thisMonthDue)}
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 20
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-soft)" }}>
              Ödenen Kiralar
            </span>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-soft)",
                marginTop: 4
              }}
            >
              Bu ay
            </div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: "700",
                color: "var(--text)",
                marginTop: 12
              }}
            >
              {payments.filter((p) => paymentStatus(p) === "Ödendi").length}
            </div>
          </div>
          <div
            style={{
              background: "#EF4444",
              color: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 12px rgba(239,68,68,0.15)"
            }}
          >
            <span style={{ fontSize: "13px", opacity: 0.9 }}>
              Ödenmemiş Kiralar
            </span>
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Bu ay
            </div>
            <div
              style={{ fontSize: "26px", fontWeight: "700", marginTop: 12 }}
            >
              {payments.filter((p) => paymentStatus(p) !== "Ödendi").length}
            </div>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
              Kira Ödeme Akışı
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 12,
              marginBottom: 16
            }}
          >
            {[
              ["Tümü", `Tümü (${payments.length})`],
              ["Ödendi", `Ödendi (${countOdendi})`],
              ["Gecikmiş", `Gecikmiş (${countGecikmis})`],
              ["Bekleyen", `Bekleyen (${countBekleyen})`],
              ["Kısmi", `Kısmi Ödenenler (${countKismi})`]
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setPaymentFilterTab(k)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 0",
                  fontSize: "13.5px",
                  fontWeight: paymentFilterTab === k ? "700" : "500",
                  color:
                    paymentFilterTab === k
                      ? "var(--text)"
                      : "var(--text-soft)",
                  borderBottom:
                    paymentFilterTab === k
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  cursor: "pointer"
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13.5px"
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--text-soft)",
                    borderBottom: "1px solid var(--border)",
                    background: "#F9FAFB"
                  }}
                >
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
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "var(--text-soft)"
                      }}
                    >
                      Seçilen filtrede kira ödeme kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const contract = contracts.find(
                      (c) => c.id === p.contractId
                    );
                    const prop = properties.find(
                      (pr) => pr.id === (contract ? contract.propertyId : "")
                    );
                    const tenant = people.find(
                      (t) => t.id === (contract ? contract.tenantId : "")
                    );
                    const st = paymentStatus(p);
                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <StatusPill status={st} />
                        </td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>
                          {prop ? prop.tasinmazNo : "—"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {tenant ? tenant.name : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--text-soft)"
                          }}
                        >
                          {fmtDate(p.dueDate)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {p.paidDate ? fmtDate(p.paidDate) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: "600"
                          }}
                        >
                          {fmtMoney(p.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Agent Modal */}
        {aiModalOpen && (
          <Modal
            title="HasYek Yapay Zeka Akıllı Asistanı"
            onClose={() => setAiModalOpen(false)}
            wide
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: 400,
                justifyContent: "space-between"
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: "#F9FAFB",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  marginBottom: 16
                }}
              >
                {aiChatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf:
                        msg.role === "user" ? "flex-end" : "flex-start",
                      background: msg.role === "user" ? "#E53935" : "#fff",
                      color: msg.role === "user" ? "#fff" : "#111827",
                      padding: "10px 14px",
                      borderRadius: 12,
                      maxWidth: "80%",
                      fontSize: "13.5px",
                      border:
                        msg.role === "assistant"
                          ? "1px solid var(--border)"
                          : "none",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    outline: "none",
                    fontSize: "13.5px"
                  }}
                  placeholder="Örn: Bu ay ne kadar tahsilat yaptık? / Eksik senetler kimde?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAiAsk();
                  }}
                />
                <button
                  className="hy-btn primary"
                  style={{ background: "#7C3AED", borderColor: "#7C3AED" }}
                  onClick={handleAiAsk}
                >
                  <Send size={16} /> Gönder
                </button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderPropertiesList() {
    const filtered = properties.filter(
      (p) =>
        propertyStatusFilter === "Tümü" ||
        propertyStatus(p.id) === propertyStatusFilter
    );
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Mülklerim</h1>
            <p className="hy-page-sub">{properties.length} kayıtlı mülk</p>
          </div>
          <div className="hy-toolbar-right">
            <select
              value={propertyStatusFilter}
              onChange={(e) => setPropertyStatusFilter(e.target.value)}
            >
              <option>Tümü</option>
              <option>Kirada</option>
              <option>Boşta</option>
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="hy-empty">Henüz mülk eklenmedi.</p>
        ) : (
          <div className="hy-property-grid">
            {filtered.map((p) => {
              const active = activeContractOf(p.id);
              const status = propertyStatus(p.id);
              return (
                <div
                  key={p.id}
                  className="hy-property-card"
                  onClick={() => {
                    setSelectedPropertyId(p.id);
                    setPropertyDetailTab("odeme_akisi");
                  }}
                >
                  <div className="hy-property-img">
                    {p.photos && p.photos[0] ? (
                      <img src={p.photos[0]} alt="" />
                    ) : (
                      <Building2 size={30} />
                    )}
                    <span
                      className={
                        "hy-status-badge " +
                        (status === "Kirada" ? "good" : "neutral")
                      }
                    >
                      {status}
                    </span>
                  </div>
                  <div className="hy-property-body">
                    <div className="hy-property-title">
                      {p.tasinmazNo}{" "}
                      {p.ad && <span className="muted">· {p.ad}</span>}
                    </div>
                    <div className="hy-property-addr">
                      {[p.ilce, p.il].filter(Boolean).join(", ") || "Adres yok"}
                    </div>
                    <div
                      className="hy-property-meta"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>
                        <strong>
                          {active ? fmtMoney(active.rentAmount) : "Boş"}
                        </strong>
                      </span>
                      <button
                        className="hy-btn ghost sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWizard(p);
                        }}
                      >
                        <Pencil size={12} /> Düzenle
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button
          className="hy-fab"
          onClick={() => openWizard()}
          title="Mülk Ekle"
        >
          <Plus size={22} />
        </button>
        {renderPropertyWizard()}
      </>
    );
  }

  function renderPropertyDetail() {
    const p = properties.find((x) => x.id === selectedPropertyId);
    if (!p) {
      setSelectedPropertyId(null);
      return null;
    }

    const activeContract = activeContractOf(p.id);
    const tenant = activeContract
      ? people.find((t) => t.id === activeContract.tenantId)
      : null;
    const propPayments = activeContract
      ? payments.filter((pt) => pt.contractId === activeContract.id)
      : [];
    const propNotes = promissoryNotes.filter(
      (n) => tenant && n.tenantId === tenant.id
    );
    const propDocs = documents.filter((d) => d.propertyId === p.id);

    const totalDebt = propPayments
      .filter((pt) => paymentStatus(pt) === "Gecikti")
      .reduce((s, x) => s + Number(x.amount), 0);
    const overdueCount = propPayments.filter(
      (pt) => paymentStatus(pt) === "Gecikti"
    ).length;

    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            position: "relative"
          }}
        >
          <button
            className="hy-back-link"
            onClick={() => setSelectedPropertyId(null)}
          >
            <ArrowLeft size={15} /> Mülklerime Dön
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="hy-btn ghost sm"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid var(--border)"
              }}
              onClick={() => setPropMenuOpen(!propMenuOpen)}
            >
              <MoreHorizontal size={18} />
            </button>

            {propMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 40,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  width: 160,
                  padding: 6
                }}
              >
                <button
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "8px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderRadius: 6
                  }}
                  onClick={() => {
                    setPropMenuOpen(false);
                    alert("Talep iletildi.");
                  }}
                >
                  Talep ilet
                </button>
                <button
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "8px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderRadius: 6
                  }}
                  onClick={() => {
                    setPropMenuOpen(false);
                    openWizard(p);
                  }}
                >
                  Mülküyü düzenle
                </button>
                <button
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "8px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderRadius: 6,
                    color: "#C62828",
                    fontWeight: "600"
                  }}
                  onClick={() => {
                    setPropMenuOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  Mülkü sil
                </button>
              </div>
            )}
          </div>
        </div>

        {deleteConfirmOpen && (
          <div
            className="hy-modal-backdrop"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <div
              className="hy-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420, padding: 24, textAlign: "center" }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: "18px" }}>
                Mülkü silmek istediğinizden emin misiniz?
              </h3>
              <p
                className="muted"
                style={{ fontSize: "13.5px", marginBottom: 24 }}
              >
                Bu işlem geri alınamaz. Mülke ait tüm veriler kalıcı olarak
                silinecek.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center"
                }}
              >
                <button
                  className="hy-btn ghost"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Vazgeç
                </button>
                <button
                  className="hy-btn primary"
                  style={{ background: "#C62828", borderColor: "#C62828" }}
                  onClick={() => {
                    deletePropertyCompletely(p.id);
                    setDeleteConfirmOpen(false);
                  }}
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "16px",
                color: "#374151"
              }}
            >
              {initials(tenant ? tenant.name : "Yok")}
            </div>
            <div>
              <h4 style={{ margin: "0 0 2px", fontSize: "15px" }}>
                {tenant ? tenant.name : "Kiracı Yok"}
              </h4>
              <span className="muted small">
                {tenant ? "Aktif kiracı" : "Boş Mülk"}
              </span>
            </div>
          </div>

          <div
            style={{
              background: "#F9FAFB",
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "700" }}>
              {activeContract ? fmtMoney(activeContract.rentAmount) : "—"}
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2
              }}
            >
              Ödendi <Check size={12} />
            </div>
          </div>

          <div
            style={{
              background: "#F9FAFB",
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "700" }}>
              {overdueCount} Dönem
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              Geciken kira sayısı
            </div>
          </div>

          <div
            style={{
              background: "#F9FAFB",
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: totalDebt > 0 ? "#C62828" : "inherit"
              }}
            >
              {fmtMoney(totalDebt)}
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              Kiracı borcu
            </div>
          </div>
        </div>

        <div
          className="hy-tabs2"
          style={{
            background: "#fff",
            padding: "0 10px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            marginBottom: 20
          }}
        >
          {[
            ["odeme_akisi", "Ödeme akışı"],
            ["detaylar", "Mülk detayları"],
            ["sozlesme", "Kira sözleşmesi bilgileri"],
            ["senetler", "Senetler Takibi"],
            ["belgeler", "Belgeler"]
          ].map(([k, l]) => (
            <button
              key={k}
              className={
                "hy-tab2" + (propertyDetailTab === k ? " active" : "")
              }
              onClick={() => setPropertyDetailTab(k)}
            >
              {l}
            </button>
          ))}
        </div>

        {propertyDetailTab === "odeme_akisi" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>Kira ödeme akışı</h3>
              <button
                className="hy-btn primary sm"
                onClick={() => setAddPaymentModalOpen(true)}
              >
                <Plus size={14} /> Geçmiş ödeme ekle +
              </button>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13.5px"
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--text-soft)",
                    borderBottom: "1px solid var(--border)"
                  }}
                >
                  <th style={{ padding: "10px 12px" }}>Durum</th>
                  <th style={{ padding: "10px 12px" }}>Kira dönemi</th>
                  <th style={{ padding: "10px 12px" }}>Ödeme tarihi</th>
                  <th style={{ padding: "10px 12px" }}>Kiracı</th>
                  <th style={{ padding: "10px 12px" }}>Tutar</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>
                    Ödenen
                  </th>
                </tr>
              </thead>
              <tbody>
                {propPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "var(--text-soft)"
                      }}
                    >
                      Bu mülke ait ödeme akışı kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  propPayments.map((pt) => (
                    <tr
                      key={pt.id}
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <td style={{ padding: "12px" }}>
                        <StatusPill status={paymentStatus(pt)} />
                      </td>
                      <td style={{ padding: "12px" }}>{fmtDate(pt.dueDate)}</td>
                      <td style={{ padding: "12px" }}>
                        {fmtDate(pt.paidDate)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {tenant ? tenant.name : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>{fmtMoney(pt.amount)}</td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          fontWeight: "600"
                        }}
                      >
                        {fmtMoney(pt.paidAmount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {propertyDetailTab === "detaylar" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Mülk Detayları & Bilgileri
              </h3>
              <button
                className="hy-btn primary sm"
                onClick={() => openWizard(p)}
              >
                <Pencil size={14} /> Mülkü Düzenle
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
                fontSize: "13.5px"
              }}
            >
              <div
                style={{
                  background: "#F9FAFB",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <div>
                  <strong>Taşınmaz No:</strong> {p.tasinmazNo || "—"}
                </div>
                <div>
                  <strong>Mülk Adı:</strong> {p.ad || "—"}
                </div>
                <div>
                  <strong>Mülk Tipi / Türü:</strong> {p.mülkTipi || "Konut"} /{" "}
                  {p.konutTürü || "Daire"}
                </div>
                <div>
                  <strong>Adres:</strong>{" "}
                  {[p.sokak, p.mahalle, p.ilce, p.il]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
                <div>
                  <strong>Bina / Kat / Daire:</strong> No: {p.binaNo || "—"},
                  Kat: {p.kat || "—"}, Daire: {p.daireNo || "—"}
                </div>
              </div>

              <div
                style={{
                  background: "#F9FAFB",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}
              >
                <div>
                  <strong>Brüt / Net m²:</strong>{" "}
                  {p.brutM2 ? p.brutM2 + " m²" : "—"} /{" "}
                  {p.netM2 ? p.netM2 + " m²" : "—"}
                </div>
                <div>
                  <strong>Oda / Banyo:</strong> {p.odaSayisi || "2+1"} /{" "}
                  {p.banyoSayisi || "1"}
                </div>
                <div>
                  <strong>Bina Yaşı & Katı:</strong> {p.binaYasi || "0-5"} yaş,{" "}
                  {p.binaKatSayisi || "3-5"} katlı bina
                </div>
                <div>
                  <strong>Isınma:</strong> {p.isinmaSistemi || "Doğalgaz"}
                </div>
                <div>
                  <strong>Satış Fiyatı / Aidat:</strong>{" "}
                  {p.satisFiyati ? fmtMoney(p.satisFiyati) : "—"} /{" "}
                  {p.aidat ? fmtMoney(p.aidat) : "—"}
                </div>
              </div>
            </div>

            <h4 style={{ margin: "0 0 12px", fontSize: "15px" }}>
              Mülk Fotoğrafları
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12
              }}
            >
              {(p.photos || []).filter(Boolean).length === 0 ? (
                <p className="muted small" style={{ gridColumn: "span 3" }}>
                  Bu mülke ait fotoğraf eklenmemiş.
                </p>
              ) : (
                (p.photos || [])
                  .filter(Boolean)
                  .map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        height: 110,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "#f1f1f1"
                      }}
                    >
                      <img
                        src={url}
                        alt={`Mülk Foto ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {propertyDetailTab === "sozlesme" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>
              Kira Sözleşmesi Bilgileri & İlk Sayfa Önizlemesi
            </h3>
            {activeContract ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    fontSize: "13.5px",
                    background: "#F9FAFB",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid var(--border)"
                  }}
                >
                  <div>
                    <strong>Kiracı:</strong> {tenant ? tenant.name : "—"}
                  </div>
                  <div>
                    <strong>Aylık Kira:</strong>{" "}
                    {fmtMoney(activeContract.rentAmount)}
                  </div>
                  <div>
                    <strong>Başlangıç Tarihi:</strong>{" "}
                    {fmtDate(activeContract.startDate)}
                  </div>
                  <div>
                    <strong>Bitiş Tarihi:</strong>{" "}
                    {fmtDate(activeContract.endDate)}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: "15px" }}>
                    Sözleşme İlk Sayfa / Belge Önizlemesi
                  </h4>
                  {p.photos && p.photos[0] ? (
                    <div
                      style={{
                        maxWidth: 500,
                        height: 350,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#fff"
                      }}
                    >
                      <img
                        src={p.photos[0]}
                        alt="Sözleşme İlk Sayfa"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 30,
                        background: "#f8f9fa",
                        borderRadius: 8,
                        textAlign: "center",
                        color: "var(--text-soft)"
                      }}
                    >
                      Sözleşme ilk sayfasına ait görsel bulunmuyor. Kontrat
                      yükleme ekranından görsel ekleyebilirsiniz.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">
                Bu mülke ait aktif kira sözleşmesi bulunmuyor.
              </p>
            )}
          </div>
        )}

        {propertyDetailTab === "senetler" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <h3>Mülke Ait Senetler Takibi</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>
              Bu mülkte oturan kiracıya ait senetlerin listesi.
            </p>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px"
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8f9fa",
                    textAlign: "left",
                    color: "var(--text-soft)"
                  }}
                >
                  <th style={{ padding: 10 }}>Senet No</th>
                  <th style={{ padding: 10 }}>Vade Tarihi</th>
                  <th style={{ padding: 10 }}>Tutar</th>
                  <th style={{ padding: 10 }}>Ödeme Durumu</th>
                </tr>
              </thead>
              <tbody>
                {propNotes.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: "var(--text-soft)"
                      }}
                    >
                      Bu mülke ve kiracıya ait senet kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  propNotes.map((n) => (
                    <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10, fontWeight: "600" }}>
                        {n.senetNo}
                      </td>
                      <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                      <td style={{ padding: 10, fontWeight: "600" }}>
                        {fmtMoney(n.amount)}
                      </td>
                      <td style={{ padding: 10 }}>
                        <select
                          value={n.status || "Ödenmedi (Senet)"}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const updated = promissoryNotes.map((item) =>
                              item.id === n.id
                                ? { ...item, status: newStatus }
                                : item
                            );
                            saveNotes(updated);
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            borderRadius: 6,
                            fontWeight: "600"
                          }}
                        >
                          <option value="Ödendi (Senet)">Ödendi</option>
                          <option value="Ödenmedi (Senet)">Ödenmedi</option>
                          <option value="Eksik">Eksik</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {propertyDetailTab === "belgeler" && (
          <div className="hy-panel" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>
                  Kiracı Belgeleri & Tahliye Taahhütnamesi
                </h3>
                <p className="muted small" style={{ margin: 0 }}>
                  Kiracıya imzalatılan tahliye taahhütnamesi, protokol veya
                  diğer evrakları yükleyin ve görüntüleyin.
                </p>
              </div>
              <button
                className="hy-btn primary"
                onClick={() => setDocModalOpen(true)}
              >
                <Upload size={15} /> Yeni Belge Ekle +
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
                marginTop: 16
              }}
            >
              {propDocs.length === 0 ? (
                <p className="muted" style={{ gridColumn: "span 2" }}>
                  Henüz yüklenmiş belge bulunmuyor. Sağ üstteki butondan belge
                  ekleyebilirsiniz.
                </p>
              ) : (
                propDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      background: "#F9FAFB",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 10
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6
                        }}
                      >
                        <FileCheck size={18} color="#E53935" />
                        <strong style={{ fontSize: "14px" }}>
                          {doc.title}
                        </strong>
                      </div>
                      <span className="muted small">Tür: {doc.type}</span>
                    </div>

                    {doc.url && (
                      <div
                        style={{
                          height: 120,
                          background: "#fff",
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid var(--border)"
                        }}
                      >
                        <img
                          src={doc.url}
                          alt={doc.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 6
                      }}
                    >
                      <span className="muted small">
                        {fmtDate(doc.date || todayStr())}
                      </span>
                      <button
                        className="hy-btn danger sm"
                        onClick={() => {
                          const filtered = documents.filter(
                            (d) => d.id !== doc.id
                          );
                          saveDocuments(filtered);
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {docModalOpen && (
          <Modal
            title="Kiracı Belgesi / Tahliye Taahhütnamesi Ekle"
            onClose={() => setDocModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Belge Başlığı *">
                <input
                  placeholder="Örn: 2026 Tahliye Taahhütnamesi"
                  value={docForm.title}
                  onChange={(e) =>
                    setDocForm({ ...docForm, title: e.target.value })
                  }
                />
              </Field>

              <Field label="Belge Türü *">
                <select
                  value={docForm.type}
                  onChange={(e) =>
                    setDocForm({ ...docForm, type: e.target.value })
                  }
                >
                  <option>Tahliye Taahhütnamesi</option>
                  <option>Kira Sözleşmesi Ek Protokolü</option>
                  <option>Demirbaş Listesi</option>
                  <option>Kimlik Fotokopisi</option>
                  <option>Diğer Evrak</option>
                </select>
              </Field>

              <Field label="Belge Dosyası / Görseli (Dosya seç)">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setDocForm({ ...docForm, url });
                    }
                  }}
                />
              </Field>

              {docForm.url && (
                <div
                  style={{
                    height: 140,
                    background: "#f1f1f1",
                    borderRadius: 8,
                    overflow: "hidden"
                  }}
                >
                  <img
                    src={docForm.url}
                    alt="Önizleme"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain"
                    }}
                  />
                </div>
              )}
            </div>

            <div
              className="hy-modal-footer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 20
              }}
            >
              <button
                className="hy-btn ghost"
                onClick={() => setDocModalOpen(false)}
              >
                İptal
              </button>
              <button
                className="hy-btn primary"
                onClick={() => {
                  if (!docForm.title) {
                    alert("Lütfen belge başlığı giriniz!");
                    return;
                  }
                  const newDoc = {
                    id: uid(),
                    propertyId: p.id,
                    title: docForm.title,
                    type: docForm.type,
                    url: docForm.url || "",
                    date: todayStr()
                  };
                  saveDocuments([...documents, newDoc]);
                  setDocModalOpen(false);
                  setDocForm({
                    title: "",
                    type: "Tahliye Taahhütnamesi",
                    url: ""
                  });
                  alert("Belge başarıyla eklendi!");
                }}
              >
                Belgeyi Kaydet
              </button>
            </div>
          </Modal>
        )}

        {addPaymentModalOpen && (
          <Modal
            title="Geçmiş Ödeme Ekle"
            onClose={() => setAddPaymentModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="kdvCheck"
                  checked={paymentForm.kdvLi}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, kdvLi: e.target.checked })
                  }
                />
                <label
                  htmlFor="kdvCheck"
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  KDV'li Kiralama
                </label>
              </div>

              {paymentForm.kdvLi && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    background: "#F9FAFB",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--border)"
                  }}
                >
                  <Field label="KDV Durumu*">
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <label
                        style={{
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <input type="radio" name="kdv" defaultChecked /> KDV
                        Dahil
                      </label>
                      <label
                        style={{
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <input type="radio" name="kdv" /> KDV Hariç
                      </label>
                    </div>
                  </Field>
                  <Field label="KDV Oranı (%)*">
                    <input
                      type="number"
                      value={paymentForm.kdvOrani}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          kdvOrani: e.target.value
                        })
                      }
                    />
                  </Field>
                </div>
              )}

              <Field label="Aylık Kira Bedeli*">
                <input
                  type="number"
                  value={paymentForm.tutar}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      tutar: e.target.value,
                      odenenTutar:
                        paymentForm.durum === "Ödendi"
                          ? e.target.value
                          : paymentForm.odenenTutar
                    })
                  }
                />
              </Field>

              <div className="hy-form-grid">
                <Field label="Dönem Ay*">
                  <select
                    value={paymentForm.donemAy}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        donemAy: e.target.value
                      })
                    }
                  >
                    {[
                      "Ocak",
                      "Şubat",
                      "Mart",
                      "Nisan",
                      "Mayıs",
                      "Haziran",
                      "Temmuz",
                      "Ağustos",
                      "Eylül",
                      "Ekim",
                      "Kasım",
                      "Aralık"
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Dönem Yıl*">
                  <select
                    value={paymentForm.donemYil}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        donemYil: e.target.value
                      })
                    }
                  >
                    {["2025", "2026", "2027"].map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Ödeme Durumu*">
                <select
                  value={paymentForm.durum}
                  onChange={(e) => {
                    const st = e.target.value;
                    setPaymentForm({
                      ...paymentForm,
                      durum: st,
                      odenenTutar: st === "Ödendi" ? paymentForm.tutar : "0"
                    });
                  }}
                >
                  <option value="Ödendi">Ödendi</option>
                  <option value="Ödenmedi">Ödenmedi</option>
                </select>
              </Field>

              {paymentForm.durum === "Ödendi" && (
                <Field label="Ödenen Tutar (₺)*">
                  <input
                    type="number"
                    value={paymentForm.odenenTutar}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        odenenTutar: e.target.value
                      })
                    }
                    placeholder="30000"
                  />
                </Field>
              )}
            </div>

            <div
              className="hy-modal-footer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 20
              }}
            >
              <button
                className="hy-btn ghost"
                onClick={() => setAddPaymentModalOpen(false)}
              >
                ‹ İptal
              </button>
              <button
                className="hy-btn primary"
                onClick={() => {
                  if (!activeContract) {
                    alert("Aktif sözleşme bulunamadı!");
                    return;
                  }
                  const monthNames = [
                    "Ocak",
                    "Şubat",
                    "Mart",
                    "Nisan",
                    "Mayıs",
                    "Haziran",
                    "Temmuz",
                    "Ağustos",
                    "Eylül",
                    "Ekim",
                    "Kasım",
                    "Aralık"
                  ];
                  const mIdx = monthNames.indexOf(paymentForm.donemAy);
                  const yearNum = Number(paymentForm.donemYil);

                  const targetDate = new Date(
                    yearNum,
                    mIdx >= 0 ? mIdx : 0,
                    1,
                    12,
                    0,
                    0
                  );
                  const targetDateStr = targetDate.toISOString().slice(0, 10);

                  const isPaid = paymentForm.durum === "Ödendi";
                  const paidVal = isPaid
                    ? Number(paymentForm.odenenTutar) ||
                      Number(paymentForm.tutar)
                    : 0;

                  const newP = {
                    id: uid(),
                    contractId: activeContract.id,
                    amount: paymentForm.tutar,
                    dueDate: targetDateStr,
                    paidAmount: paidVal,
                    paidDate: isPaid ? targetDateStr : null
                  };
                  persist(
                    STORAGE_KEYS.payments,
                    [...payments, newP],
                    setPayments
                  );
                  setAddPaymentModalOpen(false);
                  alert("Ödeme başarıyla ilgili döneme kaydedildi!");
                }}
              >
                Ekle ›
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderTenantsList() {
    if (selectedTenantId) {
      const tenant = people.find((t) => t.id === selectedTenantId);
      if (!tenant) {
        setSelectedTenantId(null);
        return null;
      }
      const tenantContracts = contracts.filter(
        (c) => c.tenantId === tenant.id
      );
      const prop = tenantContracts[0]
        ? properties.find((pr) => pr.id === tenantContracts[0].propertyId)
        : null;
      const tenantPayments = payments.filter((pt) =>
        tenantContracts.some((c) => c.id === pt.contractId)
      );
      const totalDebt = tenantPayments
        .filter((pt) => paymentStatus(pt) === "Gecikti")
        .reduce((s, x) => s + Number(x.amount), 0);
      const rentAmount = tenantContracts[0]
        ? tenantContracts[0].rentAmount
        : 0;
      const remDays =
        tenantContracts[0] && tenantContracts[0].endDate
          ? daysUntil(tenantContracts[0].endDate)
          : null;
      const remMonths = remDays !== null ? Math.round(remDays / 30) : 11;

      return (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <button
              className="hy-back-link"
              onClick={() => setSelectedTenantId(null)}
            >
              <ArrowLeft size={15} /> Kiracılara Dön
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="hy-btn ghost sm"
                onClick={() => {
                  setTenantEditDraft(tenant);
                  setTenantEditModalOpen(true);
                }}
              >
                <Pencil size={14} /> Düzenle
              </button>
              <button
                className="hy-btn danger sm"
                onClick={() => {
                  if (
                    confirm("Bu kiracıyı silmek istediğinizden emin misiniz?")
                  ) {
                    deleteTenantCompletely(tenant.id);
                  }
                }}
              >
                <Trash2 size={14} /> Sil
              </button>
              {prop && (
                <button
                  className="hy-btn ghost sm"
                  onClick={() => {
                    setSelectedPropertyId(prop.id);
                    setTab("mulkler");
                  }}
                >
                  Mülke Git <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="hy-topbar" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 className="hy-page-title" style={{ margin: 0 }}>
                  {tenant.name}
                </h1>
                <span
                  className="hy-pill-badge good"
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                >
                  Aktif Kiracı
                </span>
              </div>
              <p className="hy-page-sub" style={{ marginTop: 4 }}>
                {prop
                  ? `${prop.tasinmazNo} · ${[prop.ilce, prop.il]
                      .filter(Boolean)
                      .join(", ")}`
                  : "Mülk atanmamış"}
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16
            }}
          >
            <div
              style={{
                background: "#F9FAFB",
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--border)"
              }}
            >
              <span className="muted small">Toplam Borç</span>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  marginTop: 4,
                  color: totalDebt > 0 ? "#C62828" : "inherit"
                }}
              >
                {fmtMoney(totalDebt)}
              </div>
            </div>
            <div
              style={{
                background: "#F9FAFB",
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--border)"
              }}
            >
              <span className="muted small">Güncel Kira Bedeli</span>
              <div style={{ fontSize: "20px", fontWeight: "700", marginTop: 4 }}>
                {fmtMoney(rentAmount)}
              </div>
            </div>
            <div
              style={{
                background: "#F9FAFB",
                padding: 14,
                borderRadius: 14,
                border: "1px solid var(--border)"
              }}
            >
              <span className="muted small">Sözleşme Bitişine Kalan Süre</span>
              <div style={{ fontSize: "20px", fontWeight: "700", marginTop: 4 }}>
                {remMonths > 0
                  ? `${remMonths} ay`
                  : `${Math.max(0, remDays)} gün`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              borderBottom: "1px solid var(--border)",
              marginBottom: 20,
              paddingBottom: 2
            }}
          >
            {[
              ["borclar", "Borçlar"],
              ["senetler", "Senetler"],
              ["bilgiler", "Kiracı Bilgileri"]
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTenantDetailTab(k)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 4px",
                  fontSize: "14px",
                  fontWeight: tenantDetailTab === k ? "700" : "500",
                  color:
                    tenantDetailTab === k
                      ? "var(--text)"
                      : "var(--text-soft)",
                  borderBottom:
                    tenantDetailTab === k
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  cursor: "pointer"
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {tenantDetailTab === "borclar" && (
            <div className="hy-panel" style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>
                Borç Kalemleri
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "13.5px"
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: "var(--text-soft)",
                      borderBottom: "1px solid var(--border)"
                    }}
                  >
                    <th style={{ padding: "10px 12px" }}>Borç Türü</th>
                    <th style={{ padding: "10px 12px" }}>Vade Tarihi</th>
                    <th style={{ padding: "10px 12px" }}>Durum</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>
                      Tutar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenantPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--text-soft)"
                        }}
                      >
                        Borç kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    tenantPayments.map((pt) => (
                      <tr
                        key={pt.id}
                        style={{ borderBottom: "1px solid #F3F4F6" }}
                      >
                        <td style={{ padding: "12px", fontWeight: "600" }}>
                          Kira
                        </td>
                        <td style={{ padding: "12px" }}>
                          {fmtDate(pt.dueDate)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <StatusPill status={paymentStatus(pt)} />
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: "600"
                          }}
                        >
                          {fmtMoney(pt.amount)}
                        </td>
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
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: 12,
                  fontSize: "13px"
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8f9fa",
                      textAlign: "left",
                      color: "var(--text-soft)"
                    }}
                  >
                    <th style={{ padding: 10 }}>Senet No</th>
                    <th style={{ padding: 10 }}>Vade</th>
                    <th style={{ padding: 10 }}>Tutar</th>
                    <th style={{ padding: 10 }}>Ödeme Durumu</th>
                  </tr>
                </thead>
                <tbody>
                  {promissoryNotes.filter((n) => n.tenantId === tenant.id)
                    .length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: 16, textAlign: "center" }}>
                        Senet kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    promissoryNotes
                      .filter((n) => n.tenantId === tenant.id)
                      .map((n) => (
                        <tr
                          key={n.id}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td style={{ padding: 10 }}>{n.senetNo}</td>
                          <td style={{ padding: 10 }}>{fmtDate(n.dueDate)}</td>
                          <td style={{ padding: 10 }}>{fmtMoney(n.amount)}</td>
                          <td style={{ padding: 10 }}>
                            <select
                              value={n.status || "Ödenmedi (Senet)"}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                const updated = promissoryNotes.map((item) =>
                                  item.id === n.id
                                    ? { ...item, status: newStatus }
                                    : item
                                );
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
              <p>
                <strong>Ad Soyad:</strong> {tenant.name}
              </p>
              <p>
                <strong>Telefon:</strong> {tenant.phone || "—"}
              </p>
              <p>
                <strong>T.C. Kimlik No:</strong> {tenant.tc || "—"}
              </p>
              <p>
                <strong>Adres:</strong> {tenant.address || "—"}
              </p>
            </div>
          )}
        </>
      );
    }

    const tenants = people.filter((p) => p.role === "Kiracı");
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Kiracılarım</h1>
            <p className="hy-page-sub">{tenants.length} kayıtlı kiracı</p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 20,
            borderBottom: "1px solid var(--border)",
            marginBottom: 20,
            paddingBottom: 2
          }}
        >
          {[
            ["aktif", "Aktif Kiracılar"],
            ["eski", "Eski Kiracılar"]
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTenantSubTab(k)}
              style={{
                background: "none",
                border: "none",
                padding: "8px 4px",
                fontSize: "14.5px",
                fontWeight: tenantSubTab === k ? "700" : "500",
                color:
                  tenantSubTab === k ? "var(--text)" : "var(--text-soft)",
                borderBottom:
                  tenantSubTab === k
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                cursor: "pointer"
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {tenants.length === 0 ? (
          <p className="hy-empty">Kayıtlı kiracı yok.</p>
        ) : (
          <div
            className="hy-panel"
            style={{ padding: 0, overflow: "hidden" }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13.5px"
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "var(--text-soft)",
                    borderBottom: "1px solid var(--border)",
                    background: "#F9FAFB"
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Kiracı</th>
                  <th style={{ padding: "12px 16px" }}>Mülk</th>
                  <th style={{ padding: "12px 16px" }}>Sözleşme & Süre</th>
                  <th style={{ padding: "12px 16px" }}>Kira Tutarı</th>
                  <th style={{ padding: "12px 16px" }}>Toplam Borç</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const tCont = contracts.find((c) => c.tenantId === t.id);
                  const prop = tCont
                    ? properties.find((pr) => pr.id === tCont.propertyId)
                    : null;
                  const tPay = tCont
                    ? payments.filter((pt) => pt.contractId === tCont.id)
                    : [];
                  const debt = tPay
                    .filter((pt) => paymentStatus(pt) === "Gecikti")
                    .reduce((s, x) => s + Number(x.amount), 0);
                  const remDays =
                    tCont && tCont.endDate ? daysUntil(tCont.endDate) : null;
                  const remMonths =
                    remDays !== null ? Math.round(remDays / 30) : 11;
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: "1px solid #F3F4F6",
                        cursor: "pointer"
                      }}
                      onClick={() => setSelectedTenantId(t.id)}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12
                        }}
                      >
                        <div className="hy-avatar">{initials(t.name)}</div>
                        <div>
                          <strong>{t.name}</strong>
                          <br />
                          <span className="muted small">
                            {t.phone || "Telefon yok"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600" }}>
                        {prop ? prop.tasinmazNo : "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {tCont
                          ? `${fmtDate(tCont.startDate)} – ${fmtDate(
                              tCont.endDate
                            )}`
                          : "—"}
                        <br />
                        <span className="muted small">
                          {remMonths > 0
                            ? `${remMonths} ay`
                            : `${Math.max(0, remDays)} gün`}{" "}
                          kaldı
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600" }}>
                        {tCont ? fmtMoney(tCont.rentAmount) : "—"}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontWeight: "600",
                          color: debt > 0 ? "#C62828" : "inherit"
                        }}
                      >
                        {fmtMoney(debt)}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="hy-btn ghost sm"
                            title="Düzenle"
                            onClick={() => {
                              setTenantEditDraft(t);
                              setTenantEditModalOpen(true);
                              setSelectedTenantId(t.id);
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="hy-btn danger sm"
                            title="Sil"
                            onClick={() => {
                              if (
                                confirm(
                                  "Bu kiracıyı silmek istediğinizden emin misiniz?"
                                )
                              ) {
                                deleteTenantCompletely(t.id);
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            className="hy-btn primary sm"
                            onClick={() => setSelectedTenantId(t.id)}
                          >
                            Detaya Git
                          </button>
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

  function handleActionStartContract() {
    if (!contractScanForm.tasinmazNo || !contractScanForm.tenantName) {
      alert("Taşınmaz Numarası ve Kiracı Adı alanları boş bırakılamaz!");
      return false;
    }
    const propertyId = uid();
    const newProp = {
      id: propertyId,
      tasinmazNo: contractScanForm.tasinmazNo,
      ad: contractScanForm.propertyAd,
      ilce: contractScanForm.ilce,
      malikAdi: contractScanForm.landlordName,
      photos: contractScanForm.docUrl
        ? [contractScanForm.docUrl]
        : ["", "", "", "", "", ""]
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
    return contractId;
  }

  function handleActionAutoDebit(contractId) {
    if (!contractId) return;
    const startDt = new Date(contractScanForm.startDate);
    const generatedPayments = [];
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
      currDt.setMonth(currDt.getMonth() + 1);
    }
    persist(
      STORAGE_KEYS.payments,
      [...payments, ...generatedPayments],
      setPayments
    );
  }

  function handleActionCreateNotes() {
    if (!contractScanForm.tenantName) return;
    const startDt = new Date(contractScanForm.startDate);
    const generatedNotes = [];
    let currDt = new Date(startDt);
    const tenantId =
      people.find((p) => p.name === contractScanForm.tenantName)?.id || uid();

    for (let i = 0; i < 12; i++) {
      const dueDateStr = currDt.toISOString().slice(0, 10);
      generatedNotes.push({
        id: uid(),
        tenantId,
        tenantName: contractScanForm.tenantName,
        senetNo: `${i + 1}/12`,
        amount: contractScanForm.rentAmount,
        dueDate: dueDateStr,
        status: i === 0 ? "Ödendi (Senet)" : "Ödenmedi (Senet)",
        scanUrl: ""
      });
      currDt.setMonth(currDt.getMonth() + 1);
    }
    saveNotes([...promissoryNotes, ...generatedNotes]);
  }

  function renderKontratKayitTab() {
    return (
      <div className="hy-panel">
        <h2 style={{ marginTop: 0 }}>Kira Kontratı Otomatik Kayıt</h2>
        <p className="muted">
          Kontrat belgesini yükleyin ve mülk, kiracı, otomatik borçlandırma veya
          senet takibi işlemlerini ayrı ayrı veya toplu yönetin.
        </p>

        <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
          <button
            className="hy-btn ghost sm"
            onClick={() => {
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
            }}
          >
            📄 Adam Khodr Örneğini Yükle
          </button>
          <button
            className="hy-btn ghost sm"
            onClick={() => {
              setContractScanForm({
                tasinmazNo: "hasyek.34.02",
                propertyAd: "Sima Garden Giriş Kat Daire 02 (2+1)",
                ilce: "Pendik/Yenişehir Mah.",
                landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
                tenantName: "BERKAY KAFALI",
                tenantPhone: "05438560195",
                tenantTc: "34336927052",
                tenantAddress:
                  "YENİŞEHİR MAH. SİMA GARDEN REYHAN CAD. NO:43A BLOK DAİRE 2 PENDİK İSTANBUL",
                rentAmount: "33000",
                startDate: "2026-06-13",
                docUrl: contractScanForm.docUrl
              });
            }}
          >
            📄 Berkay Kafalı Örneğini Yükle
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 16
          }}
        >
          <div className="hy-form-grid">
            <Field label="Taşınmaz Numarası">
              <input
                value={contractScanForm.tasinmazNo}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    tasinmazNo: e.target.value
                  })
                }
                placeholder="hasyek.34.12"
              />
            </Field>
            <Field label="Mülk Adı / Detayı">
              <input
                value={contractScanForm.propertyAd}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    propertyAd: e.target.value
                  })
                }
                placeholder="Daire 12"
              />
            </Field>
            <Field label="İl / İlçe / Mahalle">
              <input
                value={contractScanForm.ilce}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    ilce: e.target.value
                  })
                }
                placeholder="Pendik/Yenişehir"
              />
            </Field>
            <Field label="Kiraya Veren (Malik)">
              <input
                value={contractScanForm.landlordName}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    landlordName: e.target.value
                  })
                }
                placeholder="HAS YEK YAPI..."
              />
            </Field>
            <Field label="Kiracı Adı Soyadı">
              <input
                value={contractScanForm.tenantName}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    tenantName: e.target.value
                  })
                }
                placeholder="ADAM KHODR"
              />
            </Field>
            <Field label="Kiracı Telefon">
              <input
                value={contractScanForm.tenantPhone}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    tenantPhone: e.target.value
                  })
                }
                placeholder="05..."
              />
            </Field>
            <Field label="Kiracı T.C. Kimlik No">
              <input
                value={contractScanForm.tenantTc}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    tenantTc: e.target.value
                  })
                }
                placeholder="99..."
              />
            </Field>
            <Field label="Kiracı Adresi">
              <input
                value={contractScanForm.tenantAddress}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    tenantAddress: e.target.value
                  })
                }
                placeholder="Adres"
              />
            </Field>
            <Field label="Aylık Kira Bedeli (₺)">
              <input
                type="number"
                value={contractScanForm.rentAmount}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    rentAmount: e.target.value
                  })
                }
              />
            </Field>
            <Field label="Akdin Başlangıç Tarihi">
              <input
                type="date"
                value={contractScanForm.startDate}
                onChange={(e) =>
                  setContractScanForm({
                    ...contractScanForm,
                    startDate: e.target.value
                  })
                }
              />
            </Field>

            <div
              className="span-2"
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 10
              }}
            >
              <button
                className="hy-btn primary"
                onClick={() => {
                  const cId = handleActionStartContract();
                  if (cId)
                    alert(
                      "Sözleşme başarıyla başlatıldı, mülk ve kiracı kaydedildi!"
                    );
                }}
              >
                <Check size={16} /> Sözleşmeyi Başlat
              </button>

              <button
                className="hy-btn primary"
                style={{ background: "#2563EB", borderColor: "#2563EB" }}
                onClick={() => {
                  const cId = handleActionStartContract();
                  if (cId) {
                    handleActionAutoDebit(cId);
                    alert(
                      "Sözleşme başlatıldı ve 12 aylık otomatik borçlandırma yapıldı!"
                    );
                  }
                }}
              >
                <FileText size={16} /> Otomatik Borçlandır
              </button>

              <button
                className="hy-btn primary"
                style={{ background: "#059669", borderColor: "#059669" }}
                onClick={() => {
                  const cId = handleActionStartContract();
                  if (cId) {
                    handleActionCreateNotes();
                    alert(
                      "Sözleşme başlatıldı ve 12 adet senet takibi oluşturuldu!"
                    );
                  }
                }}
              >
                <Receipt size={16} /> Senetleri Oluştur
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#f8f9fa",
              padding: 14,
              borderRadius: 12,
              border: "1px dashed var(--border)"
            }}
          >
            <h4 style={{ marginTop: 0 }}>Kontrat PDF / Fotoğraf Yükle</h4>
            <p className="muted small">
              Kontrat belgesini yükleyin ve sağ alanda ön izleyin.
            </p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setContractScanForm({ ...contractScanForm, docUrl: url });
                }
              }}
              style={{ marginBottom: 10 }}
            />

            {contractScanForm.docUrl ? (
              <div
                style={{
                  height: 300,
                  background: "#fff",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid var(--border)"
                }}
              >
                <img
                  src={contractScanForm.docUrl}
                  alt="Kontrat Ön İzleme"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain"
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 260,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-soft)"
                }}
              >
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
        <div
          className="hy-topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1 className="hy-page-title">
              Senet Yönetimi & Ödeme Durumları
            </h1>
            <p className="hy-page-sub">
              Senetlerin ödendi/ödenmedi durumlarını manuel güncelleyebilir veya
              banka ekstresi ile eşleştirebilirsiniz.
            </p>
          </div>
          <div>
            <button
              className="hy-btn primary"
              onClick={() => {
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
              }}
            >
              <Printer size={16} /> Yeni Senet Taslağı Hazırla / Yazdır
            </button>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Tüm Senet Listesi</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13.5px"
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8f9fa",
                  textAlign: "left",
                  color: "var(--text-soft)"
                }}
              >
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
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "var(--text-soft)"
                    }}
                  >
                    Kayıtlı senet bulunmuyor.
                  </td>
                </tr>
              ) : (
                promissoryNotes.map((n) => (
                  <tr key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: "600" }}>
                      {n.tenantName}
                    </td>
                    <td style={{ padding: 12 }}>{n.senetNo}</td>
                    <td style={{ padding: 12 }}>{fmtDate(n.dueDate)}</td>
                    <td style={{ padding: 12, fontWeight: "600" }}>
                      {fmtMoney(n.amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      <select
                        value={n.status || "Ödenmedi (Senet)"}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const updated = promissoryNotes.map((item) =>
                            item.id === n.id
                              ? { ...item, status: newStatus }
                              : item
                          );
                          saveNotes(updated);
                        }}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12.5px",
                          borderRadius: 6,
                          fontWeight: "600"
                        }}
                      >
                        <option value="Ödendi (Senet)">Ödendi</option>
                        <option value="Ödenmedi (Senet)">Ödenmedi</option>
                        <option value="Eksik">Eksik / Alınmadı</option>
                      </select>
                    </td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <button
                        className="hy-btn primary sm"
                        onClick={() => {
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
                        }}
                      >
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
          <Modal
            title="Senet Taslağı Oluştur ve Yazdır"
            onClose={() => setPrintModalOpen(false)}
            wide
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div className="hy-form-grid">
                  <Field label="Keşide Tarihi">
                    <input
                      type="date"
                      value={printNoteData.kesideTarihi}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          kesideTarihi: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Keşide Yeri">
                    <input
                      value={printNoteData.kesideYeri}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          kesideYeri: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Ödeme Vade Tarihi">
                    <input
                      type="date"
                      value={printNoteData.odemeTarihi}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          odemeTarihi: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Senet No">
                    <input
                      value={printNoteData.senetNo}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          senetNo: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Tutar (₺)">
                    <input
                      type="number"
                      value={printNoteData.tutar}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          tutar: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Borçlu Adı Soyadı">
                    <input
                      value={printNoteData.borcluAdi}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          borcluAdi: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Borçlu T.C. No">
                    <input
                      value={printNoteData.borcluTc}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          borcluTc: e.target.value
                        })
                      }
                    />
                  </Field>
                  <Field label="Borçlu Adresi" span>
                    <input
                      value={printNoteData.borcluAdres}
                      onChange={(e) =>
                        setPrintNoteData({
                          ...printNoteData,
                          borcluAdres: e.target.value
                        })
                      }
                    />
                  </Field>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    className="hy-btn primary"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> Yazdır / PDF İndir
                  </button>
                </div>
              </div>

              <div
                id="printable-senet"
                style={{
                  background: "#fff",
                  border: "2px solid #111",
                  padding: 20,
                  borderRadius: 8,
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#000"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #111",
                    paddingBottom: 8,
                    marginBottom: 10
                  }}
                >
                  <div>
                    <strong>Keşide Tarihi:</strong>{" "}
                    {fmtDate(printNoteData.kesideTarihi)}
                  </div>
                  <div>
                    <strong>Keşide Yeri:</strong> {printNoteData.kesideYeri}
                  </div>
                  <div>
                    <strong>Ödeme Tarihi:</strong>{" "}
                    {fmtDate(printNoteData.odemeTarihi)}
                  </div>
                  <div>
                    <strong>Tutar:</strong> #{fmtMoney(printNoteData.tutar)}#
                  </div>
                  <div>
                    <strong>Senet No:</strong> {printNoteData.senetNo}
                  </div>
                </div>
                <p style={{ lineHeight: 1.6 }}>
                  İşbu emre yazılı senet mukabilinde{" "}
                  <strong>{fmtDate(printNoteData.odemeTarihi)}</strong> tarihinde{" "}
                  <strong>HAS YEK YAPI İNŞAAT TİCARET A.Ş.</strong>{" "}
                  veyahut emrühavalesine yukarıda yazılı #{printNoteData.tutar}{" "}
                  Türk Lirası# ödeyeceğim. Bedeli NAKDEN ahzolunmuştur. İşbu
                  bononun gününde ödenmemesi halinde diğer bonoların da
                  muacceliyet kazanacağını, bu durumda icra masraflarını ve
                  avukatlık ücretini ödeyeceğimi, ihtilaf halinde{" "}
                  <strong>ANADOLU MAHKEMELERİ</strong> mahkemeleri ve icra
                  dairelerinin yetkili olduğunu şimdiden kabul ediyorum.
                </p>
                <div
                  style={{
                    marginTop: 30,
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <strong>Borçlu:</strong> {printNoteData.borcluAdi || "—"}
                    <br />
                    <strong>T.C./Vergi No:</strong>{" "}
                    {printNoteData.borcluTc || "—"}
                    <br />
                    <strong>Adres:</strong> {printNoteData.borcluAdres || "—"}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>İmza:</strong>
                    <br />
                    <br />
                    <br />
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

  function renderMuhasebeEntegrasyonuTab() {
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Muhasebe Entegrasyonu</h1>
            <p className="hy-page-sub">
              Logo, Mikro, Zirve, Paraşüt ve e-Fatura entegrasyonu yönetim paneli.
            </p>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Firma & Vergi Bilgileri</h3>
          <div className="hy-form-grid">
            <Field label="Kullanılan Muhasebe Programı">
              <select
                value={accountingData.product || "Logo Yazılım"}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, product: e.target.value })
                }
              >
                <option>Logo Yazılım</option>
                <option>Mikro Yazılım</option>
                <option>Zirve Yazılım</option>
                <option>Paraşüt</option>
                <option>Uyumsoft e-Fatura</option>
              </select>
            </Field>
            <Field label="Firma Ünvanı">
              <input
                value={accountingData.firmaUnvani || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, firmaUnvani: e.target.value })
                }
                placeholder="HAS YEK YAPI İNŞAAT TİCARET A.Ş."
              />
            </Field>
            <Field label="Vergi Dairesi">
              <input
                value={accountingData.vergiDairesi || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, vergiDairesi: e.target.value })
                }
                placeholder="Pendik V.D."
              />
            </Field>
            <Field label="VKN / T.C. No">
              <input
                value={accountingData.vkn || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, vkn: e.target.value })
                }
                placeholder="4580392817"
              />
            </Field>
            <Field label="Şehir">
              <input
                value={accountingData.sehir || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, sehir: e.target.value })
                }
                placeholder="İstanbul"
              />
            </Field>
            <Field label="İlçe">
              <input
                value={accountingData.ilce || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, ilce: e.target.value })
                }
                placeholder="Pendik"
              />
            </Field>
            <Field label="Açık Adres" span>
              <input
                value={accountingData.adres || ""}
                onChange={(e) =>
                  setAccountingData({ ...accountingData, adres: e.target.value })
                }
                placeholder="Yenişehir Mah. Reyhan Cad. No:43"
              />
            </Field>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
              className="hy-btn primary"
              onClick={() => {
                persist(
                  STORAGE_KEYS.accountingIntegration,
                  { ...accountingData, connected: true },
                  setAccountingData
                );
                alert("Muhasebe entegrasyon ayarları başarıyla kaydedildi!");
              }}
            >
              <Check size={16} /> Ayarları Kaydet & Bağlantıyı Test Et
            </button>
            <button
              className="hy-btn ghost"
              onClick={() => downloadExcelReport("2026_Yili")}
            >
              <Download size={16} /> Muhasebe Raporu Aktar (CSV/Excel)
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderBakimTab() {
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Bakım & Onarım Yönetimi</h1>
            <p className="hy-page-sub">
              Mülklere ait arıza, tadilat ve teknik bakım talepleri.
            </p>
          </div>
          <button
            className="hy-btn primary"
            onClick={() => setMaintModalOpen(true)}
          >
            <Plus size={16} /> Yeni Bakım Talebi
          </button>
        </div>

        <div className="hy-panel" style={{ padding: 24 }}>
          {maintenance.length === 0 ? (
            <p className="hy-empty">Kayıtlı bakım veya onarım talebi yok.</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13.5px"
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Mülk</th>
                  <th style={{ padding: 12 }}>Kategori</th>
                  <th style={{ padding: 12 }}>Açıklama</th>
                  <th style={{ padding: 12 }}>Teknisyen Tel</th>
                  <th style={{ padding: 12, textAlign: "right" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: "600" }}>
                      {propertyName(m.propertyId)}
                    </td>
                    <td style={{ padding: 12 }}>{m.category}</td>
                    <td style={{ padding: 12 }}>{m.description}</td>
                    <td style={{ padding: 12 }}>{m.technicianPhone || "—"}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>
                      <button
                        className="hy-btn danger sm"
                        onClick={() => deleteMaintenance(m.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {maintModalOpen && (
          <Modal
            title="Yeni Bakım & Onarım Kaydı"
            onClose={() => setMaintModalOpen(false)}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Mülk Seçin">
                <select
                  value={maintForm.propertyId}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, propertyId: e.target.value })
                  }
                >
                  <option value="">Mülk Seçin...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {propertyDisplayName(p)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Bakım / Arıza Kategorisi">
                <select
                  value={maintForm.category}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, category: e.target.value })
                  }
                >
                  <option value="">Seçiniz...</option>
                  <option>Tesisat / Su</option>
                  <option>Elektrik / Aydınlatma</option>
                  <option>Kombi / Isınma</option>
                  <option>Boya / Badana</option>
                  <option>Asansör / Ortak Alan</option>
                  <option>Diğer</option>
                </select>
              </Field>

              <Field label="Açıklama">
                <input
                  value={maintForm.description}
                  onChange={(e) =>
                    setMaintForm({ ...maintForm, description: e.target.value })
                  }
                  placeholder="Arıza veya işlem detayları..."
                />
              </Field>

              <Field label="Teknisyen / Usta Telefonu">
                <input
                  value={maintForm.technicianPhone}
                  onChange={(e) =>
                    setMaintForm({
                      ...maintForm,
                      technicianPhone: e.target.value
                    })
                  }
                  placeholder="05..."
                />
              </Field>

              <div
                className="hy-modal-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 10
                }}
              >
                <button
                  className="hy-btn ghost"
                  onClick={() => setMaintModalOpen(false)}
                >
                  İptal
                </button>
                <button
                  className="hy-btn primary"
                  onClick={() => {
                    if (!maintForm.propertyId) {
                      alert("Lütfen mülk seçiniz!");
                      return;
                    }
                    saveMaintenance({
                      id: uid(),
                      ...maintForm,
                      date: todayStr()
                    });
                    setMaintModalOpen(false);
                    setMaintForm({
                      propertyId: "",
                      category: "",
                      service: "",
                      description: "",
                      technicianPhone: ""
                    });
                  }}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  function renderOdemelerMuhasebeTab() {
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Ödemeler & Gider Takibi</h1>
            <p className="hy-page-sub">
              Tüm gelir ve gider hareketlerinin finansal takibi.
            </p>
          </div>
          <button
            className="hy-btn primary"
            onClick={() => downloadExcelReport("Genel")}
          >
            <Download size={16} /> Rapor İndir (CSV)
          </button>
        </div>

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3>Kira Ödemeleri ve Gider Özeti</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Geçmiş dönem ve aktif ay ödeme durumları listelenmektedir.
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13.5px"
            }}
          >
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Vade Tarihi</th>
                <th style={{ padding: 12 }}>Tutar</th>
                <th style={{ padding: 12 }}>Ödenen</th>
                <th style={{ padding: 12 }}>Ödeme Tarihi</th>
                <th style={{ padding: 12 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: 20, textAlign: "center" }}>
                    Ödeme kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12 }}>{fmtDate(p.dueDate)}</td>
                    <td style={{ padding: 12, fontWeight: "600" }}>
                      {fmtMoney(p.amount)}
                    </td>
                    <td style={{ padding: 12 }}>
                      {p.paidAmount ? fmtMoney(p.paidAmount) : "—"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {p.paidDate ? fmtDate(p.paidDate) : "—"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <StatusPill status={paymentStatus(p)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderBankaTab() {
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Banka Entegrasyonu & Ekstre Eşleştirme</h1>
            <p className="hy-page-sub">
              Banka hesap hareketlerini otomatik çekip kiracı ödemeleri ile eşleştirin.
            </p>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Bağlı Banka Hesapları</h3>
          {bankIntegrations.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 14,
                background: "#F9FAFB",
                borderRadius: 10,
                border: "1px solid var(--border)",
                marginBottom: 10
              }}
            >
              <div>
                <strong>{b.bankName}</strong>
                <div style={{ fontSize: "12.5px", color: "var(--text-soft)" }}>
                  IBAN: {b.iban}
                </div>
              </div>
              <StatusPill status={b.status} />
            </div>
          ))}
        </div>

        <div className="hy-panel" style={{ padding: 24 }}>
          <h3>Banka Ekstresi Yükle / Eşleştir</h3>
          <input
            type="file"
            accept=".csv,.xlsx,.txt,text/plain,application/pdf,image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setYuklenenEkstre(file.name);
                setIslemDurumu(`Dosya (${file.name}) başarıyla yüklendi ve doğrulandı. 1 adet eşleşen kira ödemesi bulundu.`);
              }
            }}
            style={{ marginBottom: 12 }}
          />

          {yuklenenEkstre && (
            <div
              style={{
                background: "#ECFDF5",
                color: "#065F46",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16
              }}
            >
              {islemDurumu}
            </div>
          )}

          <h4 style={{ marginTop: 20 }}>Son Banka Hareketleri</h4>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px"
            }}
          >
            <thead>
              <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Tarih</th>
                <th style={{ padding: 10 }}>Açıklama</th>
                <th style={{ padding: 10 }}>Tutar</th>
                <th style={{ padding: 10 }}>Eşleşme Durumu</th>
              </tr>
            </thead>
            <tbody>
              {bankStatements.map((st) => (
                <tr key={st.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{fmtDate(st.date)}</td>
                  <td style={{ padding: 10 }}>{st.description}</td>
                  <td style={{ padding: 10, fontWeight: "600" }}>
                    {fmtMoney(st.amount)}
                  </td>
                  <td style={{ padding: 10 }}>
                    <StatusPill status={st.matched ? "Ödendi" : "Bekliyor"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderAyarlarTab() {
    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Ayarlar & Profil</h1>
            <p className="hy-page-sub">Sistem ayarlarını ve profili yönetin.</p>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Profil Bilgileri</h3>
          <div className="hy-form-grid" style={{ maxWidth: 500 }}>
            <Field label="Ad">
              <input
                value={profile.firstName}
                onChange={(e) =>
                  setProfile({ ...profile, firstName: e.target.value })
                }
              />
            </Field>
            <Field label="Soyad">
              <input
                value={profile.lastName}
                onChange={(e) =>
                  setProfile({ ...profile, lastName: e.target.value })
                }
              />
            </Field>
            <Field label="E-Posta">
              <input
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </Field>
            <Field label="Giriş Şifresi / PIN">
              <input
                type="password"
                value={profile.adminPin}
                onChange={(e) =>
                  setProfile({ ...profile, adminPin: e.target.value })
                }
              />
            </Field>
          </div>

          <h3 style={{ marginTop: 24 }}>Arayüz Şeffaflığı (Opacity)</h3>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={uiOpacity}
            onChange={(e) => saveOpacity(parseFloat(e.target.value))}
            style={{ width: "100%", maxWidth: 300 }}
          />
          <span style={{ marginLeft: 10 }}>%{Math.round(uiOpacity * 100)}</span>

          <div style={{ marginTop: 20 }}>
            <button
              className="hy-btn primary"
              onClick={() => {
                saveProfile(profile);
                alert("Profil ayarları güncellendi!");
              }}
            >
              <Check size={16} /> Profili Kaydet
            </button>
          </div>
        </div>

        <div className="hy-panel" style={{ padding: 24, border: "1px solid #FCA5A5", background: "#FEF2F2" }}>
          <h3 style={{ marginTop: 0, color: "#991B1B" }}>Sistem Sıfırlama (Reset)</h3>
          <p style={{ fontSize: "13.5px", color: "#7F1D1D", marginBottom: 16 }}>
            Tüm mülkleri, kiracıları, sözleşmeleri, ödemeleri, senetleri ve ayarları varsayılan başlangıç değerlerine geri döndürür. Bu işlem geri alınamaz!
          </p>
          <button
            className="hy-btn danger"
            onClick={async () => {
              if (confirm("Tüm verileri varsayılan ayarlara sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz!")) {
                try {
                  await window.storage.set(STORAGE_KEYS.properties, JSON.stringify(DEFAULT_PROPERTIES));
                  await window.storage.set(STORAGE_KEYS.people, JSON.stringify(DEFAULT_PEOPLE));
                  await window.storage.set(STORAGE_KEYS.contracts, JSON.stringify(DEFAULT_CONTRACTS));
                  await window.storage.set(STORAGE_KEYS.payments, JSON.stringify(DEFAULT_PAYMENTS));
                  await window.storage.set(STORAGE_KEYS.promissoryNotes, JSON.stringify(DEFAULT_NOTES));
                  await window.storage.set(STORAGE_KEYS.expenses, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.maintenance, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.documents, JSON.stringify([]));
                  
                  setProperties(DEFAULT_PROPERTIES);
                  setPeople(DEFAULT_PEOPLE);
                  setContracts(DEFAULT_CONTRACTS);
                  setPayments(DEFAULT_PAYMENTS);
                  setPromissoryNotes(DEFAULT_NOTES);
                  setExpenses([]);
                  setMaintenance([]);
                  setDocuments([]);
                  
                  alert("Sistem verileri başarıyla varsayılan ayarlara sıfırlandı!");
                } catch (err) {
                  console.error(err);
                  alert("Sıfırlama sırasında bir hata oluştu.");
                }
              }
            }}
          >
            <RefreshCw size={16} /> Tüm Verileri ve Ayarları Sıfırla (Reset)
          </button>
        </div>
      </>
    );
  }

  function renderMenuTab() {
    return (
      <div className="hy-panel" style={{ padding: 24 }}>
        <h2>Tüm Modüller & Menü</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginTop: 20
          }}
        >
          {NAV.filter((n) => n.id !== "menu").map((n) => {
            const IconComp = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => goTab(n.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 20,
                  background: "#F9FAFB",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                <IconComp size={24} color="#E53935" />
                {n.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="hy-app" style={{ opacity: uiOpacity }}>
      <div className="hy-sidebar">
        <div className="hy-sidebar-brand">
          <img
            src="/img_9421.png"
            alt="HasYek Insaat Logo"
            style={{
              width: 140,
              height: "auto",
              objectFit: "contain"
            }}
          />
        </div>
        <nav className="hy-nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                className={"hy-nav-item" + (active ? " active" : "")}
                onClick={() => goTab(n.id)}
              >
                <Icon size={18} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <main className="hy-main">
        {tab === "ozet" && renderOzet()}
        {tab === "mulkler" &&
          (selectedPropertyId ? renderPropertyDetail() : renderPropertiesList())}
        {tab === "kontrat_kayit" && renderKontratKayitTab()}
        {tab === "senetler" && renderSenetlerTab()}
        {tab === "kiracilar" && renderTenantsList()}
        {tab === "muhasebe_entegrasyonu" && renderMuhasebeEntegrasyonuTab()}
        {tab === "bakim" && renderBakimTab()}
        {tab === "muhasebe" && renderOdemelerMuhasebeTab()}
        {tab === "banka" && renderBankaTab()}
        {tab === "ayarlar" && renderAyarlarTab()}
        {tab === "menu" && renderMenuTab()}
      </main>

      <style>{`
        :root {
          --primary: #E53935;
          --primary-hover: #C62828;
          --bg: #F3F4F6;
          --card-bg: #FFFFFF;
          --border: #E5E7EB;
          --text: #111827;
          --text-soft: #6B7280;
          --success: #10B981;
          --warning: #F59E0B;
          --danger: #EF4444;
        }

        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); }

        .hy-app { display: flex; min-height: 100vh; position: relative; width: 100%; }
        .hy-sidebar { width: 260px; min-width: 260px; background: #fff; border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; flex-shrink: 0; z-index: 10; }
        .hy-sidebar-brand { padding: 0 20px 20px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
        .hy-nav { display: flex; flex-direction: column; gap: 4px; padding: 0 10px; }
        .hy-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; border: none; background: transparent; color: var(--text-soft); font-size: 13.5px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: all 0.15s; }
        .hy-nav-item:hover { background: #F9FAFB; color: var(--text); }
        .hy-nav-item.active { background: #FEE2E2; color: var(--primary); font-weight: 600; }

        .hy-main { flex: 1; padding: 28px 36px; overflow-y: auto; min-width: 0; }
        .hy-topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .hy-page-title { margin: 0; font-size: 24px; font-weight: 700; }
        .hy-page-sub { margin: 4px 0 0; color: var(--text-soft); font-size: 13.5px; }

        .hy-panel { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .hy-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
        .hy-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--text-soft); }
        .hy-field.span-2 { grid-column: span 2; }
        .hy-field input, .hy-field select { padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); outline: none; font-size: 13.5px; color: var(--text); background: #fff; }

        .hy-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
        .hy-btn.primary { background: var(--primary); color: #fff; }
        .hy-btn.primary:hover { background: var(--primary-hover); }
        .hy-btn.ghost { background: transparent; border-color: var(--border); color: var(--text); }
        .hy-btn.ghost:hover { background: #F9FAFB; }
        .hy-btn.danger { background: #FEE2E2; color: var(--danger); border-color: #FCA5A5; }
        .hy-btn.sm { padding: 6px 12px; font-size: 12.5px; border-radius: 8px; }

        .hy-pill-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600; }
        .hy-pill-badge.good { background: #D1FAE5; color: #065F46; }
        .hy-pill-badge.neutral { background: #F3F4F6; color: #374151; }
        .hy-pill-badge.warn { background: #FEF3C7; color: #92400E; }
        .hy-pill-badge.bad { background: #FEE2E2; color: #991B1B; }

        .hy-property-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .hy-property-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
        .hy-property-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .hy-property-img { height: 150px; background: #F3F4F6; position: relative; display: flex; align-items: center; justify-content: center; color: var(--text-soft); }
        .hy-property-img img { width: 100%; height: 100%; object-fit: cover; }
        .hy-status-badge { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .hy-status-badge.good { background: #10B981; color: #fff; }
        .hy-status-badge.neutral { background: #6B7280; color: #fff; }
        .hy-property-body { padding: 16px; }
        .hy-property-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .hy-property-addr { font-size: 12.5px; color: var(--text-soft); margin-bottom: 12px; }

        .hy-fab { position: fixed; bottom: 30px; right: 30px; width: 52px; height: 52px; border-radius: 50%; background: var(--primary); color: #fff; border: none; box-shadow: 0 8px 20px rgba(229,57,53,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 40; }

        .hy-modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .hy-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .hy-modal.wide { max-width: 800px; }
        .hy-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
        .hy-modal-head h3 { margin: 0; font-size: 18px; }
        .hy-modal-close { background: none; border: none; cursor: pointer; color: var(--text-soft); }
        .hy-modal-footer { margin-top: 24px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); padding-top: 16px; }

        .hy-tabs2 { display: flex; gap: 8px; overflow-x: auto; }
        .hy-tab2 { padding: 12px 16px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13.5px; font-weight: 600; color: var(--text-soft); cursor: pointer; white-space: nowrap; }
        .hy-tab2.active { color: var(--primary); border-bottom-color: var(--primary); }

        .hy-avatar { width: 36px; height: 36px; border-radius: 50%; background: #E53935; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
        .hy-back-link { background: none; border: none; color: var(--text-soft); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 12px; }
        .hy-bell-wrap { position: relative; }
        .hy-bell { width: 36px; height: 36px; border-radius: 50%; background: #fff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; }
        .hy-notif-badge { position: absolute; top: -2px; right: -2px; background: var(--primary); color: #fff; font-size: 10px; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .hy-notif-panel { position: absolute; right: 0; top: 44px; width: 300px; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px; boxShadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; }
        .hy-notif-item { padding: 8px 10px; border-radius: 8px; font-size: 12px; margin-bottom: 6px; }
        .hy-notif-item.bad { background: #FEE2E2; color: #991B1B; }
        .hy-notif-item.warn { background: #FEF3C7; color: #92400E; }
        .hy-empty { color: var(--text-soft); font-size: 13.5px; text-align: center; padding: 20px 0; }
        .muted { color: var(--text-soft); }
        .muted.small { font-size: 12px; }

        @media print {
          body * { visibility: hidden; }
          #printable-senet, #printable-senet * { visibility: visible; }
          #printable-senet { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        }
      `}</style>
    </div>
  );
}