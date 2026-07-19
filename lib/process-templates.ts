export type ProcessDocumentTemplate = {
  key: string;
  title: string;
  description: string;
  required: boolean;
};

export type ProcessTemplate = {
  key: string;
  title: string;
  description: string;
  category: string;
  defaultCountry: string;
  documents: ProcessDocumentTemplate[];
};

export const countryOptions = [
  { value: "DE", label: "Almanya" },
  { value: "TR", label: "Türkiye" },
  { value: "AT", label: "Avusturya" },
  { value: "CH", label: "İsviçre" },
  { value: "NL", label: "Hollanda" },
  { value: "BE", label: "Belçika" },
  { value: "FR", label: "Fransa" },
  { value: "GB", label: "Birleşik Krallık" },
  { value: "OTHER", label: "Diğer" },
] as const;

export const countryLabels: Record<string, string> = Object.fromEntries(
  countryOptions.map((option) => [option.value, option.label]),
);

export const processTemplates: ProcessTemplate[] = [
  {
    key: "residence-renewal",
    title: "Oturum İzni Uzatma",
    description: "Mevcut oturum iznini süresi dolmadan yenile.",
    category: "residence",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Geçerli pasaport",
        description: "Kimlik bilgileri ve geçerlilik süresi görünür olmalı.",
        required: true,
      },
      {
        key: "biometric-photo",
        title: "Biyometrik fotoğraf",
        description: "Güncel biyometrik fotoğraf.",
        required: true,
      },
      {
        key: "address-registration",
        title: "Adres kayıt belgesi",
        description: "Güncel ikamet adresini gösteren resmî belge.",
        required: true,
      },
      {
        key: "health-insurance",
        title: "Sağlık sigortası belgesi",
        description: "Aktif sağlık sigortasını gösteren belge.",
        required: true,
      },
      {
        key: "income-proof",
        title: "Gelir kanıtı",
        description: "Maaş bordrosu, iş sözleşmesi veya eşdeğer kanıt.",
        required: true,
      },
    ],
  },
  {
    key: "family-reunion",
    title: "Aile Birleşimi",
    description: "Eş veya aile üyeleri için aile birleşimi sürecini yönet.",
    category: "family",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Geçerli pasaport",
        description: "Başvuru sahibinin geçerli pasaportu.",
        required: true,
      },
      {
        key: "marriage-certificate",
        title: "Evlilik veya aile bağını gösteren belge",
        description: "Apostil ve tercüme gerekebilir.",
        required: true,
      },
      {
        key: "sponsor-residence",
        title: "Sponsor oturum belgesi",
        description: "Almanya'daki aile üyesinin oturum veya kimlik belgesi.",
        required: true,
      },
      {
        key: "housing-proof",
        title: "Konut kanıtı",
        description: "Yeterli yaşam alanını gösteren kira sözleşmesi.",
        required: true,
      },
      {
        key: "language-certificate",
        title: "Dil sertifikası",
        description: "Süreç türüne göre gerekli dil seviyesi belgesi.",
        required: false,
      },
    ],
  },
  {
    key: "work-permit",
    title: "Çalışma İzni",
    description: "İş teklifi veya mevcut iş için çalışma izni sürecini takip et.",
    category: "employment",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Geçerli pasaport",
        description: "Kimlik ve geçerlilik sayfaları.",
        required: true,
      },
      {
        key: "employment-contract",
        title: "İş sözleşmesi",
        description: "İmzalı iş sözleşmesi veya bağlayıcı iş teklifi.",
        required: true,
      },
      {
        key: "qualification",
        title: "Mesleki yeterlilik belgesi",
        description: "Diploma, sertifika veya mesleki denklik belgesi.",
        required: true,
      },
      {
        key: "job-description",
        title: "Görev tanımı",
        description: "Pozisyon, çalışma süresi ve görevleri açıklayan belge.",
        required: false,
      },
    ],
  },
  {
    key: "eu-blue-card",
    title: "AB Mavi Kart",
    description: "Nitelikli çalışanlar için AB Mavi Kart başvurusunu yönet.",
    category: "employment",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Geçerli pasaport",
        description: "Kimlik ve geçerlilik sayfaları.",
        required: true,
      },
      {
        key: "employment-contract",
        title: "İş sözleşmesi",
        description: "Maaş ve pozisyon bilgilerini içeren imzalı sözleşme.",
        required: true,
      },
      {
        key: "degree",
        title: "Üniversite diploması",
        description: "Tanınan diploma veya denklik belgesi.",
        required: true,
      },
      {
        key: "recognition-proof",
        title: "Diploma tanınma kanıtı",
        description: "Anabin sonucu veya resmî denklik belgesi.",
        required: true,
      },
    ],
  },
  {
    key: "student-visa",
    title: "Öğrenci Vizesi",
    description: "Eğitim başlangıcına kadar öğrenci vizesi adımlarını takip et.",
    category: "education",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Geçerli pasaport",
        description: "Başvuru sahibinin geçerli pasaportu.",
        required: true,
      },
      {
        key: "admission-letter",
        title: "Kabul mektubu",
        description: "Üniversite veya eğitim kurumundan kabul belgesi.",
        required: true,
      },
      {
        key: "financial-proof",
        title: "Maddi yeterlilik kanıtı",
        description: "Bloke hesap, burs veya sponsor belgesi.",
        required: true,
      },
      {
        key: "health-insurance",
        title: "Sağlık sigortası belgesi",
        description: "Geçerli öğrenci sağlık sigortası.",
        required: true,
      },
      {
        key: "language-proof",
        title: "Dil yeterlilik belgesi",
        description: "Program diline uygun sertifika.",
        required: false,
      },
    ],
  },
  {
    key: "citizenship",
    title: "Vatandaşlık Başvurusu",
    description: "Vatandaşlık uygunluğu, belgeler ve başvuru tarihlerini yönet.",
    category: "citizenship",
    defaultCountry: "DE",
    documents: [
      {
        key: "passport",
        title: "Pasaport ve kimlik belgeleri",
        description: "Mevcut vatandaşlığı gösteren belgeler.",
        required: true,
      },
      {
        key: "residence-history",
        title: "İkamet geçmişi",
        description: "Yasal ikamet süresini kanıtlayan belgeler.",
        required: true,
      },
      {
        key: "language-certificate",
        title: "Dil sertifikası",
        description: "Gerekli dil seviyesini gösteren belge.",
        required: true,
      },
      {
        key: "citizenship-test",
        title: "Vatandaşlık testi belgesi",
        description: "Başarı belgesi veya muafiyet kanıtı.",
        required: true,
      },
      {
        key: "income-proof",
        title: "Gelir ve geçim kanıtı",
        description: "Gelir, vergi ve sosyal yardım durumunu gösteren belgeler.",
        required: true,
      },
    ],
  },
];

export function getProcessTemplate(templateKey: string) {
  return processTemplates.find((template) => template.key === templateKey);
}