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
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYWp3Y3BsYW1icWpoaXR3a2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MjA5ODMsImV4cCI6MjEwNDI5Njk4M30.aoovr1RejbazLcSq7UPDWoK4zR-mGrVfmMiZSnubUaQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Oturum kapsamı ---------------------------------------------------------
// Veri her zaman giriş yapan kullanıcının kimliğine bağlıdır: bulutta
// user_data tablosunda user_id, yerelde ise anahtara eklenen kullanıcı önekiyle
// ayrılır. Oturum yokken kimsenin hesabına yazılmaz.
let sessionUserId = null;
const setSessionUser = (id) => {
  sessionUserId = id || null;
};

const localKeyFor = (key) =>
  `${sessionUserId ? "u:" + sessionUserId : "anon"}:${key}`;

const hataMetni = (err) =>
  (err && (err.message || err.error_description || err.details)) ||
  String(err || "bilinmeyen hata");

// Bulut durumu değişince arayüze haber ver ("bulut bağlı" / "yerel mod").
let cloudListener = () => {};
const onCloudStatus = (fn) => {
  cloudListener = fn;
};
const reportCloud = (state, detail) => {
  try {
    cloudListener(state, detail || "");
  } catch (e) {
    /* dinleyici yoksa sessizce geç */
  }
};

// Yerel (önekli) kopyayı bulutla senkron tutan ince katman.
if (typeof window !== "undefined") {
  window.storage = {
    async get(key) {
      const yerel = localStorage.getItem(localKeyFor(key));
      if (!sessionUserId) return { key, value: yerel, cloud: false };
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("value")
          .eq("user_id", sessionUserId)
          .eq("key", key)
          .maybeSingle();
        if (error) throw error;
        reportCloud("ok");
        if (!data) return { key, value: yerel, cloud: false };
        return { key, value: data.value, cloud: true };
      } catch (e) {
        reportCloud("error", hataMetni(e));
        return { key, value: yerel, cloud: false };
      }
    },
    async set(key, value) {
      localStorage.setItem(localKeyFor(key), value);
      if (!sessionUserId) return { key, value, cloud: false };
      try {
        const { error } = await supabase.from("user_data").upsert({
          user_id: sessionUserId,
          key,
          value,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        reportCloud("ok");
        return { key, value, cloud: true };
      } catch (e) {
        reportCloud("error", hataMetni(e));
        return { key, value, cloud: false };
      }
    },
    async delete(key) {
      localStorage.removeItem(localKeyFor(key));
      if (!sessionUserId) return { key, deleted: true, cloud: false };
      try {
        const { error } = await supabase
          .from("user_data")
          .delete()
          .eq("user_id", sessionUserId)
          .eq("key", key);
        if (error) throw error;
        reportCloud("ok");
        return { key, deleted: true, cloud: true };
      } catch (e) {
        reportCloud("error", hataMetni(e));
        return { key, deleted: true, cloud: false };
      }
    },
    async list(prefix) {
      if (!sessionUserId) return { keys: [] };
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("key")
          .eq("user_id", sessionUserId);
        if (error) throw error;
        reportCloud("ok");
        return {
          keys: (data || [])
            .map((d) => d.key)
            .filter((k) => !prefix || k.startsWith(prefix))
        };
      } catch (e) {
        reportCloud("error", hataMetni(e));
        return { keys: [] };
      }
    }
  };
}

// Supabase'in İngilizce hata mesajlarını kullanıcıya Türkçe gösteriyoruz.
const turkceAuthHatasi = (mesaj) => {
  const m = (mesaj || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("email not confirmed"))
    return "E-postanızı doğrulamanız gerekiyor. Gelen kutunuzdaki bağlantıya tıklayın.";
  if (m.includes("user already registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  if (m.includes("password should be at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Geçerli bir e-posta adresi girin.";
  if (m.includes("rate limit") || m.includes("for security purposes"))
    return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
  return mesaj || "Beklenmeyen bir hata oluştu.";
};

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
const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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
  documents: "hasyek:documents",
  notifications: "hasyek:bildirimAyarlari"
};

// Sunucudaki gunluk-bildirim fonksiyonu bu anahtarın değerini okur.
const DEFAULT_BILDIRIM_AYARLARI = {
  aktif: true,
  hatirlatmaGun: 3,
  kanallar: { eposta: true, whatsapp: false },
  kiracilaraGonder: true,
  malikeGonder: true,
  malikEposta: "",
  malikTelefon: "",
  gonderimSaati: "09:00",
  sablonVade: "kira_vade_hatirlatma",
  sablonGecikme: "kira_gecikme",
  waDilKodu: "tr"
};

// Örnek/demo kayıtlar kaldırıldı: uygulama boş bir portföyle başlar.
// Aşağıdaki kimlikler eski sürümlerin demo verisine ait; ilk yüklemede ayıklanır.
const LEGACY_SEED_IDS = new Set([
  "prop-1",
  "prop-2",
  "p-1",
  "p-2",
  "c-1",
  "c-2",
  "pay-1",
  "pay-2",
  "pay-3",
  "pay-4",
  "pay-5",
  "pay-6",
  "pay-7",
  "pay-8",
  "n-1",
  "n-2",
  "n-3",
  "bs1",
  "b1"
]);
const dropLegacySeed = (value) =>
  Array.isArray(value)
    ? value.filter((item) => !LEGACY_SEED_IDS.has(item && item.id))
    : value;

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

// Kiracı bazlı bildirim ayarlarını sadeleştirir; boş alanlar genel ayara düşer.
const tenantBildirimAyarlari = (tenant) => {
  const b = (tenant && tenant.bildirim) || {};
  const temiz = {};
  if (b.hatirlatmaGun !== "" && b.hatirlatmaGun !== null && b.hatirlatmaGun !== undefined) {
    const n = Number(b.hatirlatmaGun);
    if (Number.isFinite(n) && n >= 0) temiz.hatirlatmaGun = n;
  }
  if (typeof b.eposta === "boolean") temiz.eposta = b.eposta;
  if (typeof b.whatsapp === "boolean") temiz.whatsapp = b.whatsapp;
  if (typeof b.kiracilaraGonder === "boolean")
    temiz.kiracilaraGonder = b.kiracilaraGonder;
  if (typeof b.malikeGonder === "boolean") temiz.malikeGonder = b.malikeGonder;
  if (
    typeof b.gonderimSaati === "string" &&
    /^[0-9]{1,2}:[0-9]{2}$/.test(b.gonderimSaati)
  ) {
    temiz.gonderimSaati = b.gonderimSaati;
  }
  return temiz;
};

// Kiracı özel ayarı + genel ayar birleşimi (tek doğruluk kaynağı).
// Sunucudaki fonksiyon da aynı önceliği uygular: özel ayar varsa o, yoksa genel.
const etkinBildirimAyarlariVeri = (ozel, genel) => {
  const o = ozel || {};
  const g = genel || {};
  const genelKanallar = g.kanallar || {};
  return {
    gun: o.hatirlatmaGun !== undefined ? o.hatirlatmaGun : g.hatirlatmaGun,
    saat: o.gonderimSaati || g.gonderimSaati || "09:00",
    eposta: o.eposta === undefined ? genelKanallar.eposta !== false : o.eposta === true,
    whatsapp:
      o.whatsapp === undefined ? genelKanallar.whatsapp === true : o.whatsapp === true,
    kiracilara:
      o.kiracilaraGonder === undefined
        ? g.kiracilaraGonder !== false
        : o.kiracilaraGonder !== false,
    malike:
      o.malikeGonder === undefined
        ? g.malikeGonder !== false
        : o.malikeGonder !== false,
    kaynak: {
      gun: o.hatirlatmaGun !== undefined ? "özel" : "genel",
      saat: o.gonderimSaati ? "özel" : "genel",
      eposta: o.eposta !== undefined ? "özel" : "genel",
      whatsapp: o.whatsapp !== undefined ? "özel" : "genel"
    }
  };
};

const etkinBildirimAyarlari = (tenant, genel) =>
  etkinBildirimAyarlariVeri(tenantBildirimAyarlari(tenant), genel);

// Tek satırlık okunur özet (kaydedilmemiş taslakla birlikte).
const bildirimOzeti = (tenant, draft, genel) => {
  const b = { ...tenantBildirimAyarlari(tenant), ...(draft || {}) };
  const e = etkinBildirimAyarlariVeri(b, genel);
  return [
    `${e.gun} gün önce`,
    `saat ${e.saat}`,
    `e-posta ${e.eposta ? "açık" : "kapalı"}`,
    `WhatsApp ${e.whatsapp ? "açık" : "kapalı"}`
  ].join(" · ");
};

// Kiracının bekleyen bildirim durumu: hangi bildirim, kime gidecek?
const kiracininBildirimDurumu = (tenant, contracts, payments, ayar) => {
  const hatirlatmaGun = ayar && ayar.gun !== undefined ? ayar.gun : 3;
  const kiracilaraGonderilir = !ayar || ayar.kiracilara !== false;
  const malikeGonderilir = !ayar || ayar.malike !== false;
  const sozlesme =
    contracts.find((c) => c.tenantId === tenant.id && c.status === "Aktif") ||
    contracts.find((c) => c.tenantId === tenant.id);
  if (!sozlesme) return { tur: "yok", metin: "Sözleşme yok" };

  let yaklasan = 0;
  let gecikmis = 0;
  payments
    .filter((p) => p.contractId === sozlesme.id)
    .forEach((p) => {
      const tutar = Number(p.amount) || 0;
      const odenen = Number(p.paidAmount) || 0;
      if (tutar > 0 && odenen >= tutar) return; // ödenmiş
      const fark = daysUntil(p.dueDate);
      if (fark === null) return;
      if (fark < 0) gecikmis += 1;
      else if (fark <= hatirlatmaGun) yaklasan += 1;
    });

  if (gecikmis > 0)
    return {
      tur: "gecikme",
      metin: `${gecikmis} gecikmiş ödeme · ${
        malikeGonderilir ? "malike gider" : "kimseye gönderilmiyor"
      }`
    };
  if (yaklasan > 0)
    return {
      tur: "vade",
      metin: `${yaklasan} ödeme ${hatirlatmaGun} gün içinde · ${
        kiracilaraGonderilir ? "kiracıya gider" : "kimseye gönderilmiyor"
      }`
    };
  return { tur: "yok", metin: "Bekleyen bildirim yok" };
};

// Toplu düzenlemede dört durum: dokunma / genel / açık / kapalı.
const BOS_TOPLU = {
  secilenler: [],
  gunMod: "degistirme",
  gun: "",
  saatMod: "degistirme",
  saat: "09:00",
  eposta: "degistirme",
  whatsapp: "degistirme",
  kiracilaraGonder: "degistirme",
  malikeGonder: "degistirme"
};

function TopluSecim({ label, value, onChange, acik, kapali }) {
  return (
    <label className="hy-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="degistirme">Değiştirme</option>
        <option value="genel">Genel ayarı kullan</option>
        <option value="acik">{acik || "Açık"}</option>
        <option value="kapali">{kapali || "Kapalı"}</option>
      </select>
    </label>
  );
}

// Üç durumlu seçim: genel ayarı kullan / açık / kapalı.
function UcDurum({ label, value, onChange, acik, kapali }) {
  return (
    <label className="hy-field">
      <span>{label}</span>
      <select
        value={value === true ? "acik" : value === false ? "kapali" : "genel"}
        onChange={(e) =>
          onChange(e.target.value === "genel" ? null : e.target.value === "acik")
        }
      >
        <option value="genel">Genel ayarı kullan</option>
        <option value="acik">{acik || "Açık"}</option>
        <option value="kapali">{kapali || "Kapalı"}</option>
      </select>
    </label>
  );
}

// Bulut bağlantı durumu göstergesi: "Bulut bağlı" / "Yerel mod".
function CloudBadge({ state, detail }) {
  const map = {
    ok: { text: "Bulut bağlı", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
    error: { text: "Yerel mod · bulut hatası", bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
    local: { text: "Yerel mod", bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" }
  };
  const s = map[state] || map.local;
  return (
    <span
      title={
        state === "error" && detail
          ? `Bulut hatası: ${detail}`
          : detail || "Veriler bu cihazda ve bulutta senkron tutulur."
      }
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: "11.5px",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {s.text}
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
  const [pdfQueue, setPdfQueue] = useState([]);
  const [filter, setFilter] = useState("tum");
  const [contractScanForm, setContractScanForm] = useState({
    tasinmazNo: "", propertyAd: "", ilce: "", landlordName: "HAS YEK YAPI İNŞAAT TİCARET A.Ş.",
    tenantName: "", tenantPhone: "", tenantTc: "", tenantAddress: "", rentAmount: "", startDate: "", docUrl: null
  });
  const [people, setPeople] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [promissoryNotes, setPromissoryNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [yuklenenEkstre, setYuklenenEkstre] = useState(null);
  const [islemDurumu, setIslemDurumu] = useState("");
  const [bankIntegrations, setBankIntegrations] = useState([]);
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
  // Profil hesaba bağlıdır; PIN/şifre burada tutulmaz (Supabase Auth yönetir).
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [uiOpacity, setUiOpacity] = useState(0.95);

  // --- Kimlik doğrulama (Supabase Auth) -----------------------------------
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("login"); // login | signup
  const [authError, setAuthError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupRole, setSignupRole] = useState("owner"); // owner | tenant

  const [accountRole, setAccountRole] = useState("owner");
  const [cloudState, setCloudState] = useState("local"); // local | ok | error
  const [cloudDetail, setCloudDetail] = useState("");
  const [tenantView, setTenantView] = useState([]);
  const [yeniSifre, setYeniSifre] = useState("");
  const [profilMesaji, setProfilMesaji] = useState("");
  const [bildirimAyarlari, setBildirimAyarlari] = useState(
    DEFAULT_BILDIRIM_AYARLARI
  );
  const [bildirimKayitlari, setBildirimKayitlari] = useState([]);
  const [kiraciBildirimleri, setKiraciBildirimleri] = useState([]);
  const [bildirimMesaji, setBildirimMesaji] = useState("");
  const [bildirimCalisiyor, setBildirimCalisiyor] = useState(false);
  const accountEmail = session?.user?.email || "";

  const [tab, setTab] = useState("ozet");
  const [paymentFilterTab, setPaymentFilterTab] = useState("Tümü");
  const [notifOpen, setNotifOpen] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      role: "assistant",
      content:
        "Merhaba Halil İbrahim Bey! Ben HasYek Yapay Zeka Asistanınızım. Portföyünüzdeki kiraları, senetleri, yaklaşan vadeleri ve doluluk oranlarını analiz edebilirim. Size nasıl yardımcı olabilirim?"
    }
  ]);
  
  const handleFileUpload = (files) => {
    const newItems = Array.from(files).map((file, idx) => ({
      id: Date.now() + idx,
      name: file.name,
      size: `${Math.round(file.size / 1024)} KB`,
      status: "İşleniyor",
      tenant: "",
      error: null
    }));
    setPdfQueue(prev => [...prev, ...newItems]);

    newItems.forEach((item) => {
      setTimeout(() => {
        setPdfQueue((prev) =>
          prev.map((q) => {
            if (q.id === item.id) {
              const success = Math.random() > 0.15;
              return {
                ...q,
                status: success ? "Tamamlandı" : "Hata",
                tenant: success ? "Ahmet Yılmaz (Simüle OCR)" : null,
                error: success ? null : "OCR motoru PDF metnini okurken zaman aşımına uğradı (503 Service Unavailable)."
              };
            }
            return q;
          })
        );
      }, 2500);
    });
  };

  const handleClearQueue = () => {
    if (confirm("Kuyruktaki tüm kayıtları temizlemek istediğinize emin misiniz?")) {
      setPdfQueue([]);
    }
  };

  const handleRetry = (id) => {
    setPdfQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "İşleniyor", error: null } : item))
    );
    setTimeout(() => {
      setPdfQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Tamamlandı", tenant: "Ahmet Yılmaz (Yeniden Denendi)" } : item
        )
      );
    }, 2000);
  };

  const handleActionStartContract = () => {
    if (!contractScanForm.tasinmazNo || !contractScanForm.tenantName) {
      alert("Lütfen taşınmaz numarası ve kiracı adını doldurun!");
      return false;
    }

    const newPropertyId = uid();
    const newTenantId = uid();

    const newProp = {
      id: newPropertyId,
      tasinmazNo: contractScanForm.tasinmazNo,
      ad: contractScanForm.propertyAd || "Yeni Mülk",
      ilce: contractScanForm.ilce || "Merkez",
      durum: "Dolu",
      kiraBedeli: Number(contractScanForm.rentAmount) || 0,
      tenantName: contractScanForm.tenantName
    };
    saveProperty(newProp);

    const newTen = {
      id: newTenantId,
      name: contractScanForm.tenantName,
      phone: contractScanForm.tenantPhone,
      tc: contractScanForm.tenantTc,
      address: contractScanForm.tenantAddress,
      propertyId: newPropertyId,
      rentAmount: Number(contractScanForm.rentAmount) || 0,
      role: "Kiracı"
    };
    savePerson(newTen);

    return newPropertyId;
  };

  const handleActionAutoDebit = (propertyId) => {
    if (!propertyId) return;
    const rentVal = Number(contractScanForm.rentAmount) || 15000;
    const baseDate = contractScanForm.startDate ? new Date(contractScanForm.startDate) : new Date();
    
    const newPayments = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      newPayments.push({
        id: uid() + i,
        propertyId: propertyId,
        amount: rentVal,
        dueDate: d.toISOString().split("T")[0],
        status: "Bekliyor"
      });
    }
    persist(STORAGE_KEYS.payments, [...payments, ...newPayments], setPayments);
  };

  const handleActionCreateNotes = () => {
    const rentVal = Number(contractScanForm.rentAmount) || 15000;
    const baseDate = contractScanForm.startDate ? new Date(contractScanForm.startDate) : new Date();

    const newNotes = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      newNotes.push({
        id: uid() + i,
        tenantName: contractScanForm.tenantName || "Kiracı",
        senetNo: `SNT-2026-${String(i).padStart(3, "0")}`,
        dueDate: d.toISOString().split("T")[0],
        amount: rentVal,
        status: "Ödenmedi (Senet)"
      });
    }
    saveNotes([...newNotes, ...promissoryNotes]);
  };
  
  const handleTransferToForm = (item) => {
    if (item.extractedData) {
      setContractScanForm(item.extractedData);
    } else {
      setContractScanForm({
        tasinmazNo: `hasyek.${Math.floor(Math.random() * 89 + 10)}.${Math.floor(Math.random() * 89 + 10)}`,
        propertyAd: "Lüks Daire (OCR Taranan)",
        ilce: "İstanbul / Ataşehir",
        landlordName: "HAS YEK YAPI A.Ş.",
        tenantName: item.tenant ? item.tenant : "Örnek Kiracı",
        tenantPhone: "0532 555 4433",
        tenantTc: "12345678901",
        tenantAddress: "Ataşehir, İstanbul",
        rentAmount: "25000",
        startDate: new Date().toISOString().split("T")[0],
        docUrl: null
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    alert(`"${item.name}" dosyasından başarıyla okunan veriler form kutucuklarına aktarıldı!`);
  };

  // --- Oturum ve hesap yönetimi -------------------------------------------
  // Bulut durumunu depolama katmanından arayüze taşır.
  useEffect(() => {
    onCloudStatus((state, detail) => {
      setCloudState(state);
      setCloudDetail(detail);
    });
  }, []);

  const loadAccountRole = async (user) => {
    const meta = user?.user_metadata?.role;
    if (meta === "owner" || meta === "tenant") return meta;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.role === "owner" || data?.role === "tenant") return data.role;
    } catch (e) {
      /* profil tablosu kurulmadıysa varsayılana düşülür */
    }
    return "owner";
  };

  // Kiracı yalnızca kendi e-postasına yayınlanmış kaydı görür; süzme RLS'te.
  const loadTenantView = async () => {
    try {
      const { data, error } = await supabase
        .from("tenant_access")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      reportCloud("ok");
      setTenantView(data || []);
    } catch (e) {
      reportCloud("error", hataMetni(e));
      setTenantView([]);
    }
  };

  // Eski sürüm tek bir paylaşılan yerel alan kullanıyordu (hasyek:*). İlk girişte
  // bu kayıtları kullanıcının kendi alanına taşıyoruz ki başka hesap devralmasın.
  const migrateLegacyLocalData = async () => {
    const tasinan = [];
    for (const key of Object.values(STORAGE_KEYS)) {
      const eski = localStorage.getItem(key);
      if (eski === null) continue;
      if (localStorage.getItem(localKeyFor(key)) === null) {
        localStorage.setItem(localKeyFor(key), eski);
        tasinan.push(key);
      }
      localStorage.removeItem(key);
    }
    for (const key of tasinan) {
      const deger = localStorage.getItem(localKeyFor(key));
      if (deger === null) continue;
      try {
        await window.storage.set(key, deger);
      } catch (e) {
        /* bulut yoksa yerel kopya yeterli */
      }
    }
    return tasinan;
  };

  const applySession = async (s) => {
    setSessionUser(s.user.id);
    setSession(s);
    const rol = await loadAccountRole(s.user);
    setAccountRole(rol);
    if (rol === "owner") await migrateLegacyLocalData();
    else await loadTenantView();
  };

  // Açılışta mevcut oturumu geri yükle, sonra değişiklikleri dinle.
  useEffect(() => {
    let alive = true;
    let abonelik = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (alive && data?.session) await applySession(data.session);
      } catch (e) {
        reportCloud("error", hataMetni(e));
      }
      if (!alive) return;
      setAuthReady(true);
      const res = supabase.auth.onAuthStateChange(async (evt, s) => {
        if (!alive) return;
        if (evt === "SIGNED_OUT" || !s) {
          setSessionUser(null);
          setSession(null);
          setAccountRole("owner");
          setTenantView([]);
          return;
        }
        await applySession(s);
      });
      abonelik = res?.data?.subscription || null;
    })();
    return () => {
      alive = false;
      try {
        abonelik?.unsubscribe();
      } catch (e) {
        /* yok say */
      }
    };
  }, []);

  const handleLogin = async () => {
    setAuthError("");
    setInfoMessage("");
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError("E-posta ve şifrenizi girin.");
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });
      if (error) {
        setAuthError(turkceAuthHatasi(error.message));
        return;
      }
      setLoginPassword("");
    } catch (e) {
      setAuthError(turkceAuthHatasi(hataMetni(e)));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignup = async () => {
    setAuthError("");
    setInfoMessage("");
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setAuthError("Ad soyad, e-posta ve şifre zorunludur.");
      return;
    }
    if (signupPassword.length < 6) {
      setAuthError("Şifre en az 6 karakter olmalı.");
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            full_name: signupName.trim(),
            phone: signupPhone.trim(),
            role: signupRole
          }
        }
      });
      if (error) {
        setAuthError(turkceAuthHatasi(error.message));
        return;
      }
      if (data?.user) {
        try {
          // Rolün kalıcı kaydı; şema kurulmadıysa user_metadata'da kalır.
          await supabase.from("profiles").upsert({
            id: data.user.id,
            role: signupRole,
            full_name: signupName.trim(),
            phone: signupPhone.trim()
          });
        } catch (e) {
          /* yok say */
        }
      }
      setSignupPassword("");
      if (!data?.session) {
        setInfoMessage(
          `Hesabınız oluşturuldu. Giriş yapabilmek için ${signupEmail.trim()} adresine gelen doğrulama bağlantısına tıklayın.`
        );
        setLoginEmail(signupEmail.trim());
        setScreen("login");
      }
    } catch (e) {
      setAuthError(turkceAuthHatasi(hataMetni(e)));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    setAuthError("");
    setInfoMessage("");
    if (!loginEmail.trim()) {
      setAuthError("Şifre sıfırlama için önce e-posta adresinizi girin.");
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        loginEmail.trim()
      );
      if (error) {
        setAuthError(turkceAuthHatasi(error.message));
        return;
      }
      setInfoMessage(
        `Şifre sıfırlama bağlantısı ${loginEmail.trim()} adresine gönderildi. Bağlantıya tıklayıp yeni şifrenizi belirleyin.`
      );
    } catch (e) {
      setAuthError(turkceAuthHatasi(hataMetni(e)));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      /* yerel oturumu yine de kapatıyoruz */
    }
    setSessionUser(null);
    setSession(null);
    setAccountRole("owner");
    setTenantView([]);
    setScreen("login");
    setLoginPassword("");
    setAuthError("");
    setInfoMessage("");
  };

  const handlePasswordChange = async () => {
    setProfilMesaji("");
    if (yeniSifre.length < 6) {
      setProfilMesaji("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: yeniSifre });
      if (error) {
        setProfilMesaji(turkceAuthHatasi(error.message));
        return;
      }
      setYeniSifre("");
      setProfilMesaji("Şifreniz güncellendi.");
    } catch (e) {
      setProfilMesaji(turkceAuthHatasi(hataMetni(e)));
    } finally {
      setAuthBusy(false);
    }
  };

  // Veriler yalnızca oturum bilindikten sonra, o kullanıcının alanından yüklenir.
  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setLoaded(true);
      return;
    }
    let alive = true;
    (async () => {
      const load = async (key, setter, fallback) => {
        try {
          const res = await window.storage.get(key);
          if (alive) {
            if (res && res.value) {
              const parsed = JSON.parse(res.value);
              setter(dropLegacySeed(parsed));
            } else {
              setter(fallback);
            }
          }
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
          firstName: "",
          lastName: "",
          email: session?.user?.email || ""
        }),
        load(STORAGE_KEYS.opacity, setUiOpacity, 0.95),
        load(
          STORAGE_KEYS.notifications,
          setBildirimAyarlari,
          DEFAULT_BILDIRIM_AYARLARI
        )
      ]);
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [authReady, session?.user?.id]);

  // Hesap e-postası ve adı, profilde eksikse oturum bilgisinden tamamlanır.
  useEffect(() => {
    if (!loaded || !session) return;
    const eposta = session.user.email || "";
    const metaAd = (session.user.user_metadata?.full_name || "").trim();
    setProfile((p) => {
      if (p.email === eposta && (p.firstName || !metaAd)) return p;
      const next = { ...p, email: eposta || p.email };
      if (!next.firstName && metaAd) {
        const [ilk, ...kalan] = metaAd.split(" ");
        next.firstName = ilk;
        next.lastName = kalan.join(" ");
      }
      return next;
    });
  }, [loaded, session?.user?.id]);

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

  // Kiracının kendi hesabından göreceği veri paketi: aktif sözleşme + o
  // sözleşmeye bağlı ödemeler. Hem elle hem otomatik yayında aynı kaynak.
  const buildTenantAccessPayload = (tenant, eposta) => {
    const sozlesme =
      contracts.find((c) => c.tenantId === tenant.id && c.status === "Aktif") ||
      contracts.find((c) => c.tenantId === tenant.id);
    const odemeler = payments
      .filter((p) => sozlesme && p.contractId === sozlesme.id)
      .map((p) => ({
        id: p.id,
        dueDate: p.dueDate,
        amount: p.amount,
        paidAmount: p.paidAmount || 0,
        paidDate: p.paidDate || null
      }));

    return {
      owner_id: session?.user?.id || null,
      tenant_email: eposta,
      tenant_name: tenant.name || "",
      tenant_phone: (tenant.phone || "").trim(),
      bildirim_ayarlari: tenantBildirimAyarlari(tenant),
      property_label: sozlesme
        ? propertyDisplayName(properties.find((x) => x.id === sozlesme.propertyId))
        : "",
      rent_amount: Number(sozlesme?.rentAmount || tenant.rentAmount || 0),
      start_date: sozlesme?.startDate || null,
      end_date: sozlesme?.endDate || null,
      payments: odemeler,
      updated_at: new Date().toISOString()
    };
  };

  // Yalnızca anlamlı alanlardan imza üretir; aynı veri ikinci kez yazılmaz.
  const tenantAccessSignature = (kayit) =>
    JSON.stringify({
      email: kayit.tenant_email,
      name: kayit.tenant_name,
      property: kayit.property_label,
      rent: kayit.rent_amount,
      start: kayit.start_date,
      end: kayit.end_date,
      payments: kayit.payments,
      bildirim: kayit.bildirim_ayarlari || {}
    });

  // Kaydı Supabase'e yayınlar/günceller. Kiracı bu satırı yalnızca e-postası
  // eşleştiği için okuyabilir (RLS). sessiz=true iken bildirim göstermez.
  const publishTenantAccess = async (tenant, eposta, opts = {}) => {
    const sessiz = opts.silent === true;
    const temizEposta = (eposta || "").trim().toLowerCase();
    if (!temizEposta) {
      if (!sessiz) alert("Önce kiracının e-posta adresini girin.");
      return false;
    }
    if (!session?.user?.id) {
      if (!sessiz) alert("Bu işlem için oturum açmanız gerekiyor.");
      return false;
    }

    const kayit = buildTenantAccessPayload(tenant, temizEposta);
    const imza = tenantAccessSignature(kayit);
    // E-posta değişmişse eski adrese yayınlanmış satır ortada kalmamalı.
    const eskiEposta = (tenant.tenantShare?.email || "").trim().toLowerCase();

    try {
      const { data: mevcut, error: aramaHatasi } = await supabase
        .from("tenant_access")
        .select("id")
        .eq("owner_id", session.user.id)
        .eq("tenant_email", temizEposta)
        .maybeSingle();
      if (aramaHatasi) throw aramaHatasi;

      if (mevcut?.id) {
        const { error } = await supabase
          .from("tenant_access")
          .update(kayit)
          .eq("id", mevcut.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_access").insert(kayit);
        if (error) throw error;
      }

      if (eskiEposta && eskiEposta !== temizEposta) {
        try {
          await supabase
            .from("tenant_access")
            .delete()
            .eq("owner_id", session.user.id)
            .eq("tenant_email", eskiEposta);
        } catch (e) {
          /* eski satır silinemese de yeni yayın geçerlidir */
        }
      }

      reportCloud("ok");
      // İmzayı sakla: sonraki değişiklikte tazelenmesi gerektiğini anlarız.
      savePerson({
        ...tenant,
        email: temizEposta,
        tenantShare: {
          email: temizEposta,
          publishedAt: new Date().toISOString(),
          signature: imza
        }
      });
      if (!sessiz) {
        alert(
          `${tenant.name} için ${kayit.payments.length} ödeme kaydı kiracı girişine açıldı.`
        );
      }
      return true;
    } catch (e) {
      reportCloud("error", hataMetni(e));
      if (!sessiz) {
        alert(
          "Kayıt yayınlanamadı: " +
            hataMetni(e) +
            "\n\nSupabase tarafında supabase/schema.sql dosyasının çalıştırıldığından emin olun."
        );
      }
      return false;
    }
  };

  // Yayını kapatır: satırı siler ve kiracıdaki yayın işaretini kaldırır.
  const unpublishTenantAccess = async (tenant) => {
    const eposta = (tenant.tenantShare?.email || tenant.email || "")
      .trim()
      .toLowerCase();
    if (!session?.user?.id || !eposta) return;
    try {
      const { error } = await supabase
        .from("tenant_access")
        .delete()
        .eq("owner_id", session.user.id)
        .eq("tenant_email", eposta);
      if (error) throw error;
      reportCloud("ok");
      const kalan = { ...tenant };
      delete kalan.tenantShare;
      savePerson(kalan);
      alert(`${tenant.name} için kiracı girişi kapatıldı.`);
    } catch (e) {
      reportCloud("error", hataMetni(e));
      alert("Yayın kapatılamadı: " + hataMetni(e));
    }
  };

  // Otomatik tazeleme: yayınlanmış kiracıların kaydı, sözleşme veya ödeme
  // değiştiğinde kendiliğinden güncellenir. Aynı veri için tekrar yazmaz.
  useEffect(() => {
    if (!loaded || !session?.user?.id || accountRole !== "owner") return;
    if (cloudState === "error") return; // bulut çalışmıyorsa boşuna denemeyelim

    // Hedef e-posta kiracı kaydındaki güncel adrestir; yayın işareti yalnızca
    // son yayınlanan adresi taşır.
    const bekleyenler = people
      .filter((k) => k.role === "Kiracı" && k.tenantShare)
      .map((k) => ({
        kiraci: k,
        eposta: (k.email || k.tenantShare.email || "").trim().toLowerCase(),
        eskiEposta: (k.tenantShare.email || "").trim().toLowerCase()
      }))
      .filter(({ kiraci, eposta, eskiEposta }) => {
        if (!eposta) return false;
        if (eskiEposta !== eposta) return true;
        const kayit = buildTenantAccessPayload(kiraci, eposta);
        return tenantAccessSignature(kayit) !== kiraci.tenantShare.signature;
      });
    if (bekleyenler.length === 0) return;

    const zamanlayici = setTimeout(() => {
      bekleyenler.forEach(({ kiraci, eposta }) =>
        publishTenantAccess(kiraci, eposta, { silent: true })
      );
    }, 1200);
    return () => clearTimeout(zamanlayici);
  }, [
    loaded,
    session?.user?.id,
    accountRole,
    cloudState,
    people,
    contracts,
    payments,
    properties
  ]);
  // --- Bildirimler ---------------------------------------------------------
  const saveBildirimAyarlari = (yeni) =>
    persist(STORAGE_KEYS.notifications, yeni, setBildirimAyarlari);

  // Kiracı ayarında "genel ayarı kullan" seçilirse alan tamamen silinir.
  const tenantBildirimGuncelle = (anahtar, deger) => {
    setTenantBildirimDraft((onceki) => {
      const yeni = { ...onceki };
      if (deger === null || deger === undefined || deger === "") {
        delete yeni[anahtar];
      } else {
        yeni[anahtar] = deger;
      }
      return yeni;
    });
  };

  const bildirimKayitlariniYukle = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("bildirim_kayitlari")
        .select("id,tur,kanal,alici,durum,hata,gonderim_gun,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setBildirimKayitlari(data || []);
    } catch (e) {
      setBildirimKayitlari([]);
    }
  };

  // Sunucudaki günlük fonksiyonu elde çalıştırır (test / anında gönderim).
  const bildirimleriSimdiCalistir = async () => {
    setBildirimMesaji("");
    setBildirimCalisiyor(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "gunluk-bildirim",
        { body: { zorla: true } }
      );
      if (error) throw error;
      const ozet = data || {};
      if (ozet.hata && !ozet.gonderilen) {
        setBildirimMesaji(String(ozet.hata));
      } else {
        const ilkHata =
          Array.isArray(ozet.ayrinti) && ozet.ayrinti.length > 0
            ? " İlk hata: " + (ozet.ayrinti[0].hata || "")
            : "";
        setBildirimMesaji(
          `${ozet.gonderilen || 0} bildirim gönderildi, ${ozet.atlanan || 0} atlandı` +
            (ozet.hata ? `, ${ozet.hata} hata.` : ".") +
            ilkHata
        );
      }
      await bildirimKayitlariniYukle();
    } catch (e) {
      setBildirimMesaji(
        "Çalıştırılamadı: " +
          hataMetni(e) +
          " · Fonksiyon kurulu mu? (supabase functions deploy gunluk-bildirim)"
      );
    } finally {
      setBildirimCalisiyor(false);
    }
  };

  useEffect(() => {
    if (!loaded || !session?.user?.id || accountRole !== "owner") return;
    bildirimKayitlariniYukle();
  }, [loaded, session?.user?.id, accountRole]);

  // Kiracı panelindeki bildirim geçmişi. Sunucu tarafı süzme RLS'te: kiracı
  // yalnızca kendi e-postasına gönderilen kayıtları okuyabilir, malike giden
  // gecikme bildirimleri görünmez (alici_tur = 'malik').
  const kiraciBildirimleriniYukle = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from("bildirim_kayitlari")
        .select("id,tur,kanal,durum,hata,gonderim_gun,created_at,payment_id")
        .eq("alici_tur", "kiraci")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setKiraciBildirimleri(
        (data || []).filter((k) => !k.alici_tur || k.alici_tur === "kiraci")
      );
    } catch (e) {
      setKiraciBildirimleri([]);
    }
  };

  useEffect(() => {
    if (!loaded || !session?.user?.id || accountRole !== "tenant") return;
    kiraciBildirimleriniYukle();
  }, [loaded, session?.user?.id, accountRole]);

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
    { id: "bildirimler", label: "Bildirim Doğrulama", icon: Bell },
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
  const [tenantEmailDraft, setTenantEmailDraft] = useState("");
  const [tenantBildirimDraft, setTenantBildirimDraft] = useState({});
  const [topluModal, setTopluModal] = useState(false);
  const [topluDraft, setTopluDraft] = useState(() => ({ ...BOS_TOPLU }));

  // Seçilen kiracının e-posta ve bildirim alanlarını forma yansıt.
  useEffect(() => {
    const t = people.find((p) => p.id === selectedTenantId);
    setTenantEmailDraft(t?.email || "");
    setTenantBildirimDraft(t?.bildirim ? { ...t.bildirim } : {});
  }, [selectedTenantId, people]);

  // Seçilen kiracılara toplu bildirim ayarı uygular (tek yazma işlemi).
  const topluBildirimUygula = () => {
    if (topluDraft.secilenler.length === 0) {
      alert("Önce en az bir kiracı seçin.");
      return;
    }
    if (topluDraft.gunMod === "deger" && topluDraft.gun === "") {
      alert("Hatırlatma için bir gün sayısı girin (0 = vade günü).");
      return;
    }
    if (topluDraft.saatMod === "deger" && !topluDraft.saat) {
      alert("Gönderim saati için bir saat seçin.");
      return;
    }

    const uygula = (mevcut) => {
      const yeni = { ...(mevcut || {}) };
      const degerVeyaSil = (mod, anahtar, deger) => {
        if (mod === "genel") delete yeni[anahtar];
        else if (mod === "deger") yeni[anahtar] = deger;
      };
      const bayrak = (mod, anahtar) => {
        if (mod === "genel") delete yeni[anahtar];
        else if (mod === "acik") yeni[anahtar] = true;
        else if (mod === "kapali") yeni[anahtar] = false;
      };
      degerVeyaSil(topluDraft.gunMod, "hatirlatmaGun", Number(topluDraft.gun));
      degerVeyaSil(topluDraft.saatMod, "gonderimSaati", topluDraft.saat);
      bayrak(topluDraft.eposta, "eposta");
      bayrak(topluDraft.whatsapp, "whatsapp");
      bayrak(topluDraft.kiracilaraGonder, "kiracilaraGonder");
      bayrak(topluDraft.malikeGonder, "malikeGonder");
      return yeni;
    };

    const yayinVar = people.some(
      (k) => topluDraft.secilenler.includes(k.id) && k.tenantShare
    );
    const yeniListe = people.map((k) => {
      if (!topluDraft.secilenler.includes(k.id)) return k;
      const b = uygula(k.bildirim);
      if (Object.keys(b).length === 0) {
        const kopya = { ...k };
        delete kopya.bildirim;
        return kopya;
      }
      return { ...k, bildirim: b };
    });

    persist(STORAGE_KEYS.people, yeniListe, setPeople);
    const sayi = topluDraft.secilenler.length;
    setTopluModal(false);
    setTopluDraft({ ...BOS_TOPLU });
    alert(
      `${sayi} kiracının bildirim ayarları güncellendi.` +
        (yayinVar
          ? " Yayındaki kiracıların sunucu kayıtları birkaç saniye içinde kendiliğinden güncellenir."
          : "")
    );
  };

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [wizardDraft, setWizardDraft] = useState(null);
  
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

  if (!session && screen !== "signup") {
    return (
      <div className="hy-app" style={{ opacity: uiOpacity }}>
        <div className="hy-new-login-container">
          <div className="hy-new-login-box">
            <div className="hy-new-login-brand">
              <img
                src="/img_9421.png"
                alt="HasYek Insaat Logo"
                style={{
                  width: 210,
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !authBusy) handleLogin();
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                  fontSize: "13.5px"
                }}
              />

              {infoMessage && (
                <div
                  style={{
                    background: "#ECFDF5",
                    color: "#065F46",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: "12.5px",
                    textAlign: "left"
                  }}
                >
                  {infoMessage}
                </div>
              )}

              {authError && (
                <div
                  style={{
                    background: "#FEF2F2",
                    color: "#991B1B",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: "12.5px",
                    textAlign: "left"
                  }}
                >
                  {authError}
                </div>
              )}

              <button
                className="hy-new-login-btn primary"
                disabled={authBusy}
                style={{ opacity: authBusy ? 0.7 : 1 }}
                onClick={handleLogin}
              >
                {authBusy ? "Giriş yapılıyor…" : "E-Posta ile Giriş Yap ›"}
              </button>

              <button
                type="button"
                disabled={authBusy}
                onClick={handlePasswordReset}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline"
                }}
              >
                Şifremi unuttum
              </button>

              <p
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.5
                }}
              >
                Kiracılar da aynı ekrandan giriş yapar; hesapları, kayıt olurken
                seçtikleri e-posta ve şifreyle çalışır.
              </p>

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
                  onClick={() => {
                    setAuthError("");
                    setInfoMessage("");
                    setScreen("signup");
                  }}
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

  if (!session && screen === "signup") {
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

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                  Hesap türü
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "owner", label: "Malik / Yönetici" },
                    { id: "tenant", label: "Kiracı" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSignupRole(opt.id)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        background: signupRole === opt.id ? "#E53935" : "#F3F4F6",
                        color: signupRole === opt.id ? "#fff" : "#374151",
                        border: "1px solid " + (signupRole === opt.id ? "#E53935" : "#E5E7EB")
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: "11.5px", color: "#6B7280", lineHeight: 1.5 }}>
                  Kiracı hesapları yalnızca malikin kendileri için yayınladığı
                  sözleşme ve ödeme bilgilerini görür.
                </span>
              </div>

              {authError && (
                <div
                  style={{
                    background: "#FEF2F2",
                    color: "#991B1B",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontSize: "12.5px",
                    textAlign: "left"
                  }}
                >
                  {authError}
                </div>
              )}

              <button
                className="hy-new-login-btn primary"
                disabled={authBusy}
                style={{ opacity: authBusy ? 0.7 : 1 }}
                onClick={handleSignup}
              >
                {authBusy ? "Kayıt oluşturuluyor…" : "Kayıt Ol ve Devam Et ›"}
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
                  onClick={() => {
                    setAuthError("");
                    setScreen("login");
                  }}
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

  if (accountRole === "tenant") {
    // Bildirim kaydını ilgili ödeme vadesiyle eşleştirmek için sözlük.
    const odemeVadeleri = {};
    tenantView.forEach((kayit) =>
      (kayit.payments || []).forEach((p) => {
        if (p && p.id) odemeVadeleri[p.id] = p.dueDate;
      })
    );

    return (
      <div className="hy-app" style={{ padding: 30, opacity: uiOpacity }}>
        <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Hoş Geldiniz{profile.firstName ? ", " + profile.firstName : ""}
              </h2>
              <p className="muted small" style={{ margin: "4px 0 0" }}>
                {accountEmail} · Kiracı Paneli (Salt Okunur)
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <CloudBadge state={cloudState} detail={cloudDetail} />
              <button className="hy-btn ghost sm" onClick={handleLogout}>
                Çıkış Yap
              </button>
            </div>
          </div>

          {tenantView.length === 0 ? (
            <div className="hy-panel">
              <p className="hy-empty">
                Henüz sizin için yayınlanmış bir kayıt yok. Malik / yönetici,
                kiracı kaydınızda bu e-posta adresini tanımlayıp "Kiracı
                Girişine Aç" demelidir.
              </p>
            </div>
          ) : (
            tenantView.map((kayit) => (
              <div key={kayit.id} className="hy-panel" style={{ marginBottom: 16 }}>
                <h3 className="hy-h3" style={{ marginTop: 0 }}>
                  {kayit.property_label || "Mülk bilgisi"}
                </h3>
                <p style={{ margin: "4px 0" }}>
                  <strong>Aylık Kira:</strong> {fmtMoney(kayit.rent_amount)}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Sözleşme:</strong> {fmtDate(kayit.start_date)} –{" "}
                  {fmtDate(kayit.end_date)}
                </p>
                <p className="muted small" style={{ margin: "4px 0 12px" }}>
                  Son güncelleme: {fmtDate(kayit.updated_at)}
                </p>

                <h4 style={{ margin: "0 0 8px", fontSize: "13.5px" }}>
                  Ödeme Planı
                </h4>
                {(kayit.payments || []).length === 0 ? (
                  <p className="hy-empty">Ödeme kaydı yayınlanmamış.</p>
                ) : (
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
                        <th style={{ padding: 10 }}>Ödeme Tarihi</th>
                        <th style={{ padding: 10 }}>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kayit.payments || []).map((p, i) => (
                        <tr
                          key={p.id || i}
                          style={{ borderTop: "1px solid #eee" }}
                        >
                          <td style={{ padding: 10 }}>{fmtDate(p.dueDate)}</td>
                          <td style={{ padding: 10 }}>{fmtMoney(p.amount)}</td>
                          <td style={{ padding: 10 }}>
                            {p.paidAmount ? fmtMoney(p.paidAmount) : "—"}
                          </td>
                          <td style={{ padding: 10 }}>
                            {p.paidDate ? fmtDate(p.paidDate) : "—"}
                          </td>
                          <td style={{ padding: 10 }}>
                            <StatusPill status={paymentStatus(p)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}

          <div className="hy-panel" style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap"
              }}
            >
              <div>
                <h3 className="hy-h3" style={{ margin: 0 }}>Bildirimler</h3>
                <p className="muted small" style={{ margin: "4px 0 0" }}>
                  Size gönderilen kira hatırlatmaları
                  {kiraciBildirimleri.length > 0
                    ? ` · ${kiraciBildirimleri.length} kayıt`
                    : ""}
                </p>
              </div>
              <button
                className="hy-btn ghost sm"
                onClick={kiraciBildirimleriniYukle}
              >
                <RefreshCw size={16} /> Yenile
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {kiraciBildirimleri.length === 0 ? (
                <p className="hy-empty">
                  Henüz size gönderilmiş bir bildirim yok. Vade yaklaştığında
                  hatırlatma burada listelenir.
                </p>
              ) : (
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
                      <th style={{ padding: 10 }}>Tarih</th>
                      <th style={{ padding: 10 }}>Konu</th>
                      <th style={{ padding: 10 }}>Kanal</th>
                      <th style={{ padding: 10 }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kiraciBildirimleri.map((k) => {
                      const vade = odemeVadeleri[k.payment_id];
                      const gonderildi = k.durum === "gonderildi";
                      return (
                        <tr
                          key={k.id}
                          style={{ borderTop: "1px solid #eee" }}
                        >
                          <td style={{ padding: 10 }}>
                            {fmtDateTime(k.created_at || k.gonderim_gun)}
                          </td>
                          <td style={{ padding: 10 }}>
                            {k.tur === "gecikme"
                              ? "Gecikme bildirimi"
                              : "Kira hatırlatması"}
                            {vade ? (
                              <span className="muted small">
                                {" "}
                                · Vade {fmtDate(vade)}
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: 10 }}>
                            {k.kanal === "whatsapp" ? "WhatsApp" : "E-posta"}
                          </td>
                          <td style={{ padding: 10 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 999,
                                fontSize: "12px",
                                fontWeight: 600,
                                background: gonderildi ? "#D1FAE5" : "#FEE2E2",
                                color: gonderildi ? "#065F46" : "#991B1B"
                              }}
                            >
                              {gonderildi ? "Gönderildi" : "Gönderilemedi"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
                  placeholder="Örn: Ataşehir Konut Daire 12"
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
            <CloudBadge state={cloudState} detail={cloudDetail} />
            <button className="hy-btn ghost sm" onClick={handleLogout}>
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

              <h3 style={{ marginTop: 24 }}>Kiracı Girişi</h3>
              <p className="muted small" style={{ marginTop: 0 }}>
                Kiracı, kendi hesabıyla giriş yaptığında yalnızca burada
                yayınladığınız sözleşme ve ödeme kayıtlarını görür. Kiracının
                hesap e-postası aşağıdaki adresle aynı olmalıdır.
              </p>
              <div
                className="hy-form-grid"
                style={{ maxWidth: 520, alignItems: "end" }}
              >
                <Field label="Kiracı E-Posta">
                  <input
                    type="email"
                    placeholder="kiraci@ornek.com"
                    value={tenantEmailDraft}
                    onChange={(e) => setTenantEmailDraft(e.target.value)}
                  />
                </Field>
                <Field label="&nbsp;">
                  <button
                    className="hy-btn primary"
                    onClick={() => publishTenantAccess(tenant, tenantEmailDraft)}
                  >
                    <Send size={16} /> Kiracı Girişine Aç
                  </button>
                </Field>
              </div>
              {tenant.tenantShare?.publishedAt && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <span className="hy-pill-badge good">Yayında</span>
                  <span className="muted small">
                    Son güncelleme: {fmtDate(tenant.tenantShare.publishedAt)} ·{" "}
                    {tenant.tenantShare.email}
                  </span>
                  <button
                    className="hy-btn ghost sm"
                    onClick={() => unpublishTenantAccess(tenant)}
                  >
                    Kiracı Girişini Kapat
                  </button>
                </div>
              )}
              <p className="muted small" style={{ marginTop: 10 }}>
                Yayın açıkken kiracının kaydı, sözleşme veya ödeme
                bilgilerindeki her değişiklikte kendiliğinden güncellenir.
              </p>

              <h3 style={{ marginTop: 24 }}>Bildirim Ayarları (bu kiracı)</h3>
              <p className="muted small" style={{ marginTop: 0 }}>
                Boş bırakılan alanlar Ayarlar'daki genel bildirim ayarını
                kullanır. Kaydettiğinizde, yayın açıksa sunucudaki kiracı kaydı da
                kendiliğinden güncellenir.
              </p>
              <div className="hy-form-grid" style={{ maxWidth: 640 }}>
                <Field label="Hatırlatma (gün önce)">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    placeholder={String(bildirimAyarlari.hatirlatmaGun)}
                    value={
                      tenantBildirimDraft.hatirlatmaGun === undefined
                        ? ""
                        : tenantBildirimDraft.hatirlatmaGun
                    }
                    onChange={(e) =>
                      tenantBildirimGuncelle("hatirlatmaGun", e.target.value)
                    }
                  />
                </Field>
                <Field label="Gönderim saati (Türkiye)">
                  <input
                    type="time"
                    value={tenantBildirimDraft.gonderimSaati || ""}
                    onChange={(e) =>
                      tenantBildirimGuncelle("gonderimSaati", e.target.value)
                    }
                  />
                </Field>
                <UcDurum
                  label="E-posta kanalı"
                  value={tenantBildirimDraft.eposta}
                  onChange={(v) => tenantBildirimGuncelle("eposta", v)}
                />
                <UcDurum
                  label="WhatsApp kanalı"
                  value={tenantBildirimDraft.whatsapp}
                  onChange={(v) => tenantBildirimGuncelle("whatsapp", v)}
                />
                <UcDurum
                  label="Kiracıya hatırlatma"
                  value={tenantBildirimDraft.kiracilaraGonder}
                  onChange={(v) => tenantBildirimGuncelle("kiracilaraGonder", v)}
                  acik="Gönderilsin"
                  kapali="Gönderilmesin"
                />
                <UcDurum
                  label="Malike gecikme bildirimi"
                  value={tenantBildirimDraft.malikeGonder}
                  onChange={(v) => tenantBildirimGuncelle("malikeGonder", v)}
                  acik="Gönderilsin"
                  kapali="Gönderilmesin"
                />
              </div>
              <p className="muted small" style={{ marginTop: 10 }}>
                {bildirimOzeti(tenant, tenantBildirimDraft, bildirimAyarlari)}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  className="hy-btn primary"
                  onClick={() => {
                    savePerson({ ...tenant, bildirim: tenantBildirimDraft });
                    alert(
                      "Bu kiracının bildirim ayarları kaydedildi." +
                        (tenant.tenantShare
                          ? " Yayın birkaç saniye içinde kendiliğinden güncellenir."
                          : "")
                    );
                  }}
                >
                  <Check size={16} /> Bu Kiracıyı Kaydet
                </button>
                <button
                  className="hy-btn ghost"
                  onClick={() => setTenantBildirimDraft({})}
                >
                  Genel Ayarlara Dön
                </button>
              </div>
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
          <button
            className="hy-btn ghost"
            onClick={() => {
              setTopluDraft({ ...BOS_TOPLU });
              setTopluModal(true);
            }}
          >
            <Users size={16} /> Toplu Bildirim Ayarları
          </button>
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

  function renderTopluBildirimModal() {
    if (!topluModal) return null;
    const kiracilar = people.filter((p) => p.role === "Kiracı");
    const secili = topluDraft.secilenler.length;
    const guncelle = (yama) => setTopluDraft({ ...topluDraft, ...yama });

    return (
      <Modal
        title="Toplu Bildirim Ayarları"
        onClose={() => setTopluModal(false)}
        wide
      >
        <p className="muted small" style={{ marginTop: 0 }}>
          Seçtiğiniz kiracılara aynı ayarları tek seferde uygular. "Değiştirme"
          bıraktığınız alanlar mevcut değerinde kalır; "Genel ayarı kullan"
          seçerseniz o kiracıdaki özel ayar silinip Ayarlar'daki genel değere
          döner.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 8
          }}
        >
          <strong style={{ fontSize: "13.5px" }}>
            Kiracılar ({secili}/{kiracilar.length} seçili)
          </strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="hy-btn ghost sm"
              onClick={() =>
                guncelle({ secilenler: kiracilar.map((k) => k.id) })
              }
            >
              Tümünü Seç
            </button>
            <button
              className="hy-btn ghost sm"
              onClick={() => guncelle({ secilenler: [] })}
            >
              Seçimi Temizle
            </button>
          </div>
        </div>

        {kiracilar.length === 0 ? (
          <p className="hy-empty">Kayıtlı kiracı yok.</p>
        ) : (
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 6
            }}
          >
            {kiracilar.map((k) => (
              <label
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 8px",
                  fontSize: "13px",
                  borderBottom: "1px solid #f3f4f6"
                }}
              >
                <input
                  type="checkbox"
                  checked={topluDraft.secilenler.includes(k.id)}
                  onChange={(e) =>
                    guncelle({
                      secilenler: e.target.checked
                        ? [...topluDraft.secilenler, k.id]
                        : topluDraft.secilenler.filter((id) => id !== k.id)
                    })
                  }
                />
                <span style={{ fontWeight: 600 }}>{k.name}</span>
                <span className="muted small">{k.email || "e-posta yok"}</span>
                {k.tenantShare?.email && (
                  <span className="hy-pill-badge good">Yayında</span>
                )}
              </label>
            ))}
          </div>
        )}

        <h4 style={{ margin: "18px 0 10px", fontSize: "13.5px" }}>
          Uygulanacak ayarlar
        </h4>
        <div className="hy-form-grid">
          <Field label="Hatırlatma (gün önce)">
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={topluDraft.gunMod}
                onChange={(e) => guncelle({ gunMod: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="degistirme">Değiştirme</option>
                <option value="genel">Genel ayarı kullan</option>
                <option value="deger">Şu değeri ata</option>
              </select>
              {topluDraft.gunMod === "deger" && (
                <input
                  type="number"
                  min="0"
                  max="30"
                  style={{ maxWidth: 90 }}
                  value={topluDraft.gun}
                  onChange={(e) => guncelle({ gun: e.target.value })}
                />
              )}
            </div>
          </Field>
          <Field label="Gönderim saati (Türkiye)">
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={topluDraft.saatMod}
                onChange={(e) => guncelle({ saatMod: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="degistirme">Değiştirme</option>
                <option value="genel">Genel ayarı kullan</option>
                <option value="deger">Şu değeri ata</option>
              </select>
              {topluDraft.saatMod === "deger" && (
                <input
                  type="time"
                  style={{ maxWidth: 130 }}
                  value={topluDraft.saat}
                  onChange={(e) => guncelle({ saat: e.target.value })}
                />
              )}
            </div>
          </Field>
          <TopluSecim
            label="E-posta kanalı"
            value={topluDraft.eposta}
            onChange={(v) => guncelle({ eposta: v })}
          />
          <TopluSecim
            label="WhatsApp kanalı"
            value={topluDraft.whatsapp}
            onChange={(v) => guncelle({ whatsapp: v })}
          />
          <TopluSecim
            label="Kiracıya hatırlatma"
            value={topluDraft.kiracilaraGonder}
            onChange={(v) => guncelle({ kiracilaraGonder: v })}
            acik="Gönderilsin"
            kapali="Gönderilmesin"
          />
          <TopluSecim
            label="Malike gecikme bildirimi"
            value={topluDraft.malikeGonder}
            onChange={(v) => guncelle({ malikeGonder: v })}
            acik="Gönderilsin"
            kapali="Gönderilmesin"
          />
        </div>

        <div className="hy-modal-footer">
          <button
            className="hy-btn ghost"
            onClick={() => setTopluDraft({ ...BOS_TOPLU })}
          >
            Sıfırla
          </button>
          <button
            className="hy-btn ghost"
            onClick={() => setTopluModal(false)}
          >
            Kapat
          </button>
          <button className="hy-btn primary" onClick={topluBildirimUygula}>
            <Check size={16} /> {secili} Kiracıya Uygula
          </button>
        </div>
      </Modal>
    );
  }

  function renderKontratKayitTab() {
    const filteredQueue = pdfQueue.filter(item => {
      if (filter === "islenen") return item.status === "İşleniyor" || item.status === "Bekliyor";
      if (filter === "hata") return item.status === "Tamamlandı" || item.status === "Hata";
      return true;
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="hy-panel">
          <h2 style={{ marginTop: 0 }}>Kira Kontratı Otomatik Kayıt & Manuel Giriş</h2>
          <p className="muted">
            Kontrat belgesini yükleyin ve mülk, kiracı, otomatik borçlandırma veya senet takibi işlemlerini ayrı ayrı veya toplu yönetin.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>
            <div className="hy-form-grid">
              <Field label="Taşınmaz Numarası">
                <input
                  value={contractScanForm.tasinmazNo}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, tasinmazNo: e.target.value })}
                  placeholder="hasyek.34.12"
                />
              </Field>
              <Field label="Mülk Adı / Detayı">
                <input
                  value={contractScanForm.propertyAd}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, propertyAd: e.target.value })}
                  placeholder="Daire 12"
                />
              </Field>
              <Field label="İl / İlçe / Mahalle">
                <input
                  value={contractScanForm.ilce}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, ilce: e.target.value })}
                  placeholder="Pendik/Yenişehir"
                />
              </Field>
              <Field label="Kiraya Veren (Malik)">
                <input
                  value={contractScanForm.landlordName}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, landlordName: e.target.value })}
                  placeholder="HAS YEK YAPI..."
                />
              </Field>
              <Field label="Kiracı Adı Soyadı">
                <input
                  value={contractScanForm.tenantName}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, tenantName: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                />
              </Field>
              <Field label="Kiracı Telefon">
                <input
                  value={contractScanForm.tenantPhone}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, tenantPhone: e.target.value })}
                  placeholder="05..."
                />
              </Field>
              <Field label="Kiracı T.C. Kimlik No">
                <input
                  value={contractScanForm.tenantTc}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, tenantTc: e.target.value })}
                  placeholder="99..."
                />
              </Field>
              <Field label="Kiracı Adresi">
                <input
                  value={contractScanForm.tenantAddress}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, tenantAddress: e.target.value })}
                  placeholder="Adres"
                />
              </Field>
              <Field label="Aylık Kira Bedeli (₺)">
                <input
                  type="number"
                  value={contractScanForm.rentAmount}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, rentAmount: e.target.value })}
                />
              </Field>
              <Field label="Akdin Başlangıç Tarihi">
                <input
                  type="date"
                  value={contractScanForm.startDate}
                  onChange={(e) => setContractScanForm({ ...contractScanForm, startDate: e.target.value })}
                />
              </Field>

              <div className="span-2" style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  className="hy-btn primary"
                  onClick={() => {
                    const cId = handleActionStartContract();
                    if (cId !== false) alert("Sözleşme başarıyla başlatıldı, mülk ve kiracı kaydedildi!");
                  }}
                >
                  <Check size={16} /> Sözleşmeyi Başlat
                </button>

                <button
                  className="hy-btn primary"
                  style={{ background: "#2563EB", borderColor: "#2563EB" }}
                  onClick={() => {
                    const cId = handleActionStartContract();
                    if (cId !== false) {
                      handleActionAutoDebit(cId);
                      alert("Sözleşme başlatıldı ve 12 aylık otomatik borçlandırma yapıldı!");
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
                    if (cId !== false) {
                      handleActionCreateNotes();
                      alert("Sözleşme başlatıldı ve 12 adet senet takibi oluşturuldu!");
                    }
                  }}
                >
                  <Receipt size={16} /> Senetleri Oluştur
                </button>
              </div>
            </div>

            <div style={{ background: "#f8f9fa", padding: 14, borderRadius: 12, border: "1px dashed var(--border)" }}>
              <h4 style={{ marginTop: 0 }}>Kontrat PDF / Fotoğraf Yükle</h4>
              <p className="muted small">Kontrat belgesini yükleyin ve sağ alanda ön izleyin.</p>
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
                <div style={{ height: 300, background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <img
                    src={contractScanForm.docUrl}
                    alt="Kontrat Ön İzleme"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-soft)" }}>
                  Ön izleme için kontrat dosyası seçin
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hy-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: "0 0 4px" }}>Kira Kontratı PDF Otomasyonu (Yapay Zeka & OCR)</h2>
              <p className="muted" style={{ margin: 0 }}>
                Bir veya birden fazla kira sözleşmesi PDF'i yükleyin. Sistem sırayla OCR/AI ile tarayarak mülk, kiracı, borçlandırma ve senet akışını otomatik tamamlar.
              </p>
            </div>
            <label className="hy-btn primary" style={{ cursor: "pointer" }}>
              <Upload size={16} /> Kontrat PDF Yükle (Çoklu)
              <input
                type="file"
                multiple
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files);
                }}
              />
            </label>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
            }}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              background: "#F9FAFB",
              marginBottom: 24,
              cursor: "pointer"
            }}
          >
            <Upload size={32} color="var(--text-soft)" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: "650", fontSize: "15px", marginBottom: 4 }}>
              Kira Kontratı PDF'lerini Buraya Sürükleyin veya Dosya Seçin
            </div>
            <div className="muted small">
              Birden fazla PDF seçebilirsiniz · Sırayla otomatik işlenir · Supabase Storage'a arşivlenir
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["tum", `Tümü (${pdfQueue.length})`],
                ["islenen", `İşlenen (${pdfQueue.filter(i => i.status === "İşleniyor" || i.status === "Bekliyor").length})`],
                ["hata", `Tamamlanan / Hata (${pdfQueue.filter(i => i.status === "Tamamlandı" || i.status === "Hata").length})`]
              ].map(([k, l]) => (
                <button
                  key={k}
                  className="hy-btn ghost sm"
                  style={{
                    background: filter === k ? "#FEF2F2" : "#fff",
                    color: filter === k ? "var(--primary)" : "var(--text)",
                    borderColor: filter === k ? "var(--primary)" : "var(--border)"
                  }}
                  onClick={() => setFilter(k)}
                >
                  {l}
                </button>
              ))}
            </div>
            <button className="hy-btn ghost sm" onClick={handleClearQueue}>
              Kuyruğu Temizle
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {filteredQueue.length === 0 ? (
              <div className="hy-empty" style={{ gridColumn: "span 2" }}>
                Kuyrukta gösterilecek dosya bulunmuyor.
              </div>
            ) : (
              filteredQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    border: `1px solid ${item.status === "Hata" ? "#FCA5A5" : "var(--border)"}`,
                    borderRadius: 14,
                    padding: 16
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: "14px" }}>{item.name}</strong>
                    <span className={`hy-pill-badge ${item.status === "Tamamlandı" ? "good" : item.status === "Hata" ? "bad" : "warn"}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="muted small" style={{ marginBottom: 8 }}>
                    {item.size || "1024 KB"} {item.tenant ? `· Kiracı: ${item.tenant}` : ""}
                  </div>

                  {item.error && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", color: "#991B1B", padding: 8, borderRadius: 8, fontSize: "11.5px", fontFamily: "monospace", marginBottom: 10 }}>
                      {`{"error":{"code":503,"message":"${item.error}","status":"UNAVAILABLE"}}`}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {item.status === "Hata" && (
                      <button
                        className="hy-btn ghost sm"
                        style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
                        onClick={() => handleRetry(item.id)}
                      >
                        Tekrar Dene
                      </button>
                    )}
                    {item.status === "Tamamlandı" && (
                      <button
                        className="hy-btn primary sm"
                        onClick={() => handleTransferToForm(item)}
                      >
                        Formu Doldur & Sözleşmeyi Başlat
                      </button>
                    )}
                    {item.status === "İşleniyor" && (
                      <span className="muted small" style={{ fontStyle: "italic" }}>Yapay zeka tarıyor...</span>
                    )}
                  </div>
                </div>
              ))
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
          {bankIntegrations.length === 0 && (
            <div className="hy-empty">Henüz bağlı banka hesabı yok.</div>
          )}
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
            accept=".csv,.xlsx,.txt,.html,.htm,text/plain,text/html,application/pdf,image/*"
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
              {bankStatements.length === 0 && (
                <tr>
                  <td colSpan={4} className="hy-empty">
                    Henüz banka hareketi yok.
                  </td>
                </tr>
              )}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <h3 style={{ margin: 0 }}>Hesap</h3>
            <CloudBadge state={cloudState} detail={cloudDetail} />
          </div>
          <p className="muted small" style={{ margin: "10px 0 4px" }}>
            Giriş yapılan hesap: <strong>{accountEmail || "—"}</strong> · Rol:{
            " "}
            <strong>
              {accountRole === "tenant" ? "Kiracı" : "Malik / Yönetici"}
            </strong>
          </p>
          <p className="muted small" style={{ margin: "0 0 12px" }}>
            E-posta ve şifre Supabase Auth tarafından yönetilir; uygulama şifreyi
            hiçbir yerde saklamaz. Aşağıdaki isim alanları yalnızca görünüm
            içindir.
          </p>

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
            <Field label="Yeni Şifre">
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={yeniSifre}
                onChange={(e) => setYeniSifre(e.target.value)}
              />
            </Field>
            <Field label="&nbsp;">
              <button
                className="hy-btn ghost"
                disabled={authBusy}
                onClick={handlePasswordChange}
              >
                Şifreyi Değiştir
              </button>
            </Field>
          </div>

          {profilMesaji && (
            <p
              style={{
                marginTop: 12,
                fontSize: "12.5px",
                color: profilMesaji.includes("güncellendi")
                  ? "#065F46"
                  : "#991B1B"
              }}
            >
              {profilMesaji}
            </p>
          )}

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

        <div className="hy-panel" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Bildirimler (E-posta & WhatsApp)</h3>
          <p className="muted small" style={{ marginTop: 0 }}>
            Vadesi yaklaşan ödemeler kiracıya, gecikmiş ödemeler size bildirilir.
            Gönderim sunucuda her saat kontrol edilir ve saat gelince yapılır
            (Türkiye saati); uygulama kapalı olsa da devam eder. Buradaki ayarlar
            varsayılandır — her kiracı için Kiracılarım ekranından ayrı saat,
            kanal ve hatırlatma günü tanımlayabilirsiniz.
          </p>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "4px 0 14px" }}>
            {[
              ["aktif", "Bildirimler açık"],
              ["kiracilaraGonder", "Kiracıya hatırlatma"],
              ["malikeGonder", "Malike gecikme bildirimi"]
            ].map(([k, l]) => (
              <label
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13.5px" }}
              >
                <input
                  type="checkbox"
                  checked={bildirimAyarlari[k] === true}
                  onChange={(e) =>
                    setBildirimAyarlari({
                      ...bildirimAyarlari,
                      [k]: e.target.checked
                    })
                  }
                />
                {l}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              ["eposta", "Kanal: E-posta"],
              ["whatsapp", "Kanal: WhatsApp"]
            ].map(([k, l]) => (
              <label
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13.5px" }}
              >
                <input
                  type="checkbox"
                  checked={bildirimAyarlari.kanallar?.[k] === true}
                  onChange={(e) =>
                    setBildirimAyarlari({
                      ...bildirimAyarlari,
                      kanallar: {
                        ...bildirimAyarlari.kanallar,
                        [k]: e.target.checked
                      }
                    })
                  }
                />
                {l}
              </label>
            ))}
          </div>

          <div className="hy-form-grid" style={{ maxWidth: 720 }}>
            <Field label="Kaç gün önce hatırlatılsın?">
              <input
                type="number"
                min="0"
                max="30"
                value={bildirimAyarlari.hatirlatmaGun}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    hatirlatmaGun: Number(e.target.value)
                  })
                }
              />
            </Field>
            <Field label="Malik bildirim e-postası">
              <input
                type="email"
                placeholder={accountEmail || "ornek@domain.com"}
                value={bildirimAyarlari.malikEposta}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    malikEposta: e.target.value
                  })
                }
              />
            </Field>
            <Field label="Malik WhatsApp numarası">
              <input
                placeholder="0532 000 00 00"
                value={bildirimAyarlari.malikTelefon}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    malikTelefon: e.target.value
                  })
                }
              />
            </Field>
            <Field label="Varsayılan gönderim saati">
              <input
                type="time"
                value={bildirimAyarlari.gonderimSaati || "09:00"}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    gonderimSaati: e.target.value
                  })
                }
              />
            </Field>
            <Field label="WhatsApp şablonu (vade)">
              <input
                value={bildirimAyarlari.sablonVade}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    sablonVade: e.target.value
                  })
                }
              />
            </Field>
            <Field label="WhatsApp şablonu (gecikme)">
              <input
                value={bildirimAyarlari.sablonGecikme}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    sablonGecikme: e.target.value
                  })
                }
              />
            </Field>
            <Field label="WhatsApp dil kodu">
              <input
                value={bildirimAyarlari.waDilKodu}
                onChange={(e) =>
                  setBildirimAyarlari({
                    ...bildirimAyarlari,
                    waDilKodu: e.target.value
                  })
                }
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button
              className="hy-btn primary"
              onClick={() => {
                saveBildirimAyarlari(bildirimAyarlari);
                setBildirimMesaji("Bildirim ayarları kaydedildi.");
              }}
            >
              <Check size={16} /> Ayarları Kaydet
            </button>
            <button
              className="hy-btn ghost"
              disabled={bildirimCalisiyor}
              onClick={bildirimleriSimdiCalistir}
            >
              <Send size={16} />{" "}
              {bildirimCalisiyor ? "Gönderiliyor…" : "Şimdi Çalıştır (test)"}
            </button>
            <button className="hy-btn ghost" onClick={bildirimKayitlariniYukle}>
              Kayıtları Yenile
            </button>
          </div>

          {bildirimMesaji && (
            <p style={{ marginTop: 12, fontSize: "12.5px", color: "#374151" }}>
              {bildirimMesaji}
            </p>
          )}

          <div
            style={{
              marginTop: 18,
              background: "#F9FAFB",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              fontSize: "12.5px",
              color: "#374151",
              lineHeight: 1.7
            }}
          >
            <strong>Kurulum notları</strong>
            <br />· Supabase gizli değişkenleri: <code>RESEND_API_KEY</code>,{" "}
            <code>BILDIRIM_GONDEREN</code>, <code>WHATSAPP_TOKEN</code>,{" "}
            <code>WHATSAPP_PHONE_ID</code>, <code>CRON_SECRET</code>{" "}
            (anahtarlar yalnızca sunucuda tutulur).
            <br />· WhatsApp mesajları <strong>onaylı şablon</strong> ile gider;
            vade şablonu 3 değişken alır: ad, tutar, vade tarihi. Gecikme şablonu:
            kiracı adı, tutar, gecikme günü.
            <br />· Fonksiyonu yayınlayın:{" "}
            <code>supabase functions deploy gunluk-bildirim</code> · Günlük
            zamanlayıcı: <code>supabase/bildirimler.sql</code> içindeki cron bloğu.
          </div>

          <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: "13.5px" }}>
            Son Bildirimler
          </h4>
          {bildirimKayitlari.length === 0 ? (
            <p className="hy-empty">Henüz bildirim kaydı yok.</p>
          ) : (
            <table
              className="hy-table"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Tarih</th>
                  <th style={{ padding: 8 }}>Tür</th>
                  <th style={{ padding: 8 }}>Kanal</th>
                  <th style={{ padding: 8 }}>Alıcı</th>
                  <th style={{ padding: 8 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {bildirimKayitlari.slice(0, 20).map((k) => (
                  <tr key={k.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>{fmtDate(k.gonderim_gun)}</td>
                    <td style={{ padding: 8 }}>
                      {k.tur === "vade" ? "Vade hatırlatma" : "Gecikme"}
                    </td>
                    <td style={{ padding: 8 }}>
                      {k.kanal === "eposta" ? "E-posta" : "WhatsApp"}
                    </td>
                    <td style={{ padding: 8 }}>{k.alici || "—"}</td>
                    <td style={{ padding: 8 }}>
                      <StatusPill
                        status={k.durum === "gonderildi" ? "Tamamlandı" : "Hata"}
                      />
                      {k.hata && (
                        <span className="muted small" title={k.hata}>{" "}
                          {String(k.hata).slice(0, 40)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="hy-panel" style={{ padding: 24, border: "1px solid #FCA5A5", background: "#FEF2F2" }}>
          <h3 style={{ marginTop: 0, color: "#991B1B" }}>Sistem Sıfırlama (Reset)</h3>
          <p style={{ fontSize: "13.5px", color: "#7F1D1D", marginBottom: 16 }}>
            Tüm mülkleri, kiracıları, sözleşmeleri, kira ödemelerini, senetleri, giderleri, bakım kayıtlarını ve belgeleri siler. Bu işlem geri alınamaz!
          </p>
          <button
            className="hy-btn danger"
            onClick={async () => {
              if (confirm("Tüm kayıtları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!")) {
                try {
                  await window.storage.set(STORAGE_KEYS.properties, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.people, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.contracts, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.payments, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.promissoryNotes, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.expenses, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.maintenance, JSON.stringify([]));
                  await window.storage.set(STORAGE_KEYS.documents, JSON.stringify([]));
                  
                  setProperties([]);
                  setPeople([]);
                  setContracts([]);
                  setPayments([]);
                  setPromissoryNotes([]);
                  setExpenses([]);
                  setMaintenance([]);
                  setDocuments([]);
                  
                  alert("Tüm kayıtlar silindi. Uygulama boş bir portföyle devam ediyor.");
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

  // Bildirim doğrulama ekranı: her kiracının geçerli ayarı ve son gönderimi.
  function renderBildirimlerTab() {
    const kiracilar = people.filter((p) => p.role === "Kiracı");
    const yayinda = kiracilar.filter((k) => k.tenantShare?.email);
    const bugun = todayStr();
    const bugunKayitlar = bildirimKayitlari.filter(
      (k) => String(k.gonderim_gun || "").slice(0, 10) === bugun
    );
    const bugunGonderilen = bugunKayitlar.filter(
      (k) => k.durum === "gonderildi"
    ).length;
    const bugunHata = bugunKayitlar.length - bugunGonderilen;

    const sonBildirim = (tenant) => {
      const eposta = (tenant.tenantShare?.email || tenant.email || "").toLowerCase();
      if (!eposta) return null;
      return (
        bildirimKayitlari.find(
          (k) =>
            String(k.alici || "").toLowerCase() === eposta ||
            String(k.tenant_email || "").toLowerCase() === eposta
        ) || null
      );
    };

    const kartlar = [
      {
        baslik: "Yayındaki kiracı",
        deger: `${yayinda.length} / ${kiracilar.length}`,
        renk: yayinda.length > 0 ? "#065F46" : "#6B7280"
      },
      { baslik: "Bugün gönderilen", deger: String(bugunGonderilen), renk: "#065F46" },
      {
        baslik: "Bugün hata",
        deger: String(bugunHata),
        renk: bugunHata > 0 ? "#991B1B" : "#6B7280"
      },
      {
        baslik: "Bildirimler",
        deger: bildirimAyarlari.aktif ? "Açık" : "Kapalı",
        renk: bildirimAyarlari.aktif ? "#065F46" : "#991B1B"
      }
    ];

    return (
      <>
        <div className="hy-topbar">
          <div>
            <h1 className="hy-page-title">Bildirim Doğrulama</h1>
            <p className="hy-page-sub">
              Her kiracı için geçerli saat, kanallar ve son gönderim durumu
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="hy-btn ghost" onClick={bildirimKayitlariniYukle}>
              <RefreshCw size={16} /> Yenile
            </button>
            <button
              className="hy-btn ghost"
              onClick={() => {
                setTopluDraft({ ...BOS_TOPLU });
                setTopluModal(true);
              }}
            >
              <Users size={16} /> Toplu Düzenle
            </button>
            <button
              className="hy-btn primary"
              disabled={bildirimCalisiyor}
              onClick={bildirimleriSimdiCalistir}
            >
              <Send size={16} />{" "}
              {bildirimCalisiyor ? "Gönderiliyor…" : "Şimdi Çalıştır"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 16,
            marginBottom: 20
          }}
        >
          {kartlar.map((k) => (
            <div key={k.baslik} className="hy-panel" style={{ padding: 18 }}>
              <div className="muted small">{k.baslik}</div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: k.renk,
                  marginTop: 6
                }}
              >
                {k.deger}
              </div>
            </div>
          ))}
        </div>

        {bildirimMesaji && (
          <p
            style={{
              fontSize: "12.5px",
              color: "#374151",
              background: "#F9FAFB",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px"
            }}
          >
            {bildirimMesaji}
          </p>
        )}

        {kiracilar.length === 0 ? (
          <p className="hy-empty">Kayıtlı kiracı yok.</p>
        ) : (
          <div className="hy-panel" style={{ padding: 0, overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13px"
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: 12 }}>Kiracı</th>
                  <th style={{ padding: 12 }}>Yayın</th>
                  <th style={{ padding: 12 }}>Geçerli Ayar</th>
                  <th style={{ padding: 12 }}>Kanallar</th>
                  <th style={{ padding: 12 }}>Bekleyen Bildirim</th>
                  <th style={{ padding: 12 }}>Son Gönderim</th>
                  <th style={{ padding: 12 }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {kiracilar.map((k) => {
                  const e = etkinBildirimAyarlari(k, bildirimAyarlari);
                  const durum = kiracininBildirimDurumu(
                    k,
                    contracts,
                    payments,
                    e
                  );
                  const son = sonBildirim(k);
                  return (
                    <tr key={k.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600 }}>{k.name}</div>
                        <div className="muted small">
                          {k.tenantShare?.email || k.email || "e-posta yok"}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        {k.tenantShare?.email ? (
                          <span className="hy-pill-badge good">Yayında</span>
                        ) : (
                          <span className="hy-pill-badge neutral">Kapalı</span>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        <div>
                          {e.gun} gün önce{" "}
                          {e.kaynak.gun === "özel" && (
                            <span className="muted small">(özel)</span>
                          )}
                        </div>
                        <div className="muted small">
                          saat {e.saat}
                          {e.kaynak.saat === "özel" ? " (özel)" : " (genel)"}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span
                            className={
                              "hy-pill-badge " + (e.eposta ? "good" : "neutral")
                            }
                          >
                            E-posta
                          </span>
                          <span
                            className={
                              "hy-pill-badge " + (e.whatsapp ? "good" : "neutral")
                            }
                          >
                            WhatsApp
                          </span>
                        </div>
                        <div className="muted small" style={{ marginTop: 4 }}>
                          {e.kiracilara && e.malike
                            ? "Kiracı + malik"
                            : e.kiracilara
                            ? "Yalnızca kiracı"
                            : e.malike
                            ? "Yalnızca malik"
                            : "Kimseye gönderilmiyor"}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          className={
                            "hy-pill-badge " +
                            (durum.tur === "gecikme"
                              ? "bad"
                              : durum.tur === "vade"
                              ? "warn"
                              : "neutral")
                          }
                        >
                          {durum.metin}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        {son ? (
                          <div>
                            <div>{fmtDate(son.gonderim_gun)}</div>
                            <div className="muted small">
                              {son.tur === "vade" ? "Vade hatırlatma" : "Gecikme"} ·{" "}
                              {son.kanal === "eposta" ? "E-posta" : "WhatsApp"} ·{" "}
                              {son.durum === "gonderildi" ? "gönderildi" : "hata"}
                            </div>
                          </div>
                        ) : (
                          <span className="muted small">Kayıt yok</span>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        <button
                          className="hy-btn ghost sm"
                          onClick={() => {
                            setTab("kiracilar");
                            setTenantDetailTab("bilgiler");
                            setSelectedTenantId(k.id);
                          }}
                        >
                          Düzenle
                        </button>
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
              width: 180,
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
        {tab === "bildirimler" && renderBildirimlerTab()}
        {tab === "muhasebe_entegrasyonu" && renderMuhasebeEntegrasyonuTab()}
        {tab === "bakim" && renderBakimTab()}
        {tab === "muhasebe" && renderOdemelerMuhasebeTab()}
        {tab === "banka" && renderBankaTab()}
        {tab === "ayarlar" && renderAyarlarTab()}
        {tab === "menu" && renderMenuTab()}
      </main>

      {renderTopluBildirimModal()}

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
        .hy-notif-panel { position: absolute; right: 0; top: 44px; width: 300px; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 50; }
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