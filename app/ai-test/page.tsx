import {
  analyzeProcesses,
  buildSmartFormFields,
  compareDocuments,
  extractCommonFields,
} from "@/lib/ai";

import type {
  AiProcess,
  ExtractedDocumentData,
} from "@/lib/ai";

function getFutureDate(days: number): string {
  const date = new Date();

  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
}

export default function AiTestPage() {
  const processes: AiProcess[] = [
    {
      id: "opportunity-card",
      title: "Almanya Opportunity Card",
      description: "Almanya iş arama süreci",
      country: "Germany",
      category: "immigration",
      status: "active",
      progress: 50,
      deadline: getFutureDate(5),

      requiredDocuments: [
        {
          key: "passport",
          title: "Pasaport",
          required: true,
          status: "uploaded",
          fileName: "passport.pdf",
        },
        {
          key: "insurance",
          title: "Sağlık Sigortası",
          required: true,
          status: "uploaded",
          fileName: "insurance.pdf",
        },
        {
          key: "diploma",
          title: "Diploma",
          required: true,
          status: "missing",
        },
        {
          key: "appointment",
          title: "Randevu Belgesi",
          required: true,
          status: "missing",
        },
      ],
    },
  ];

  const analysis = analyzeProcesses(processes);

  const passportText = `
    Passport Number: TR1234567
    Date of Birth: 12.03.1995
    Nationality: Turkish
    Date of Expiry: 20.08.2031
  `;

  const extractedPassportFields =
    extractCommonFields(passportText);

  const extractedDocuments: ExtractedDocumentData[] = [
    {
      processId: "opportunity-card",
      documentKey: "passport",
      documentTitle: "Pasaport",
      fileName: "passport.pdf",
      rawText: passportText,

      fields: [
        ...extractedPassportFields,

        {
          key: "fullName",
          label: "Ad Soyad",
          value: "John Smith",
          confidence: 0.98,
          sourceDocumentKey: "passport",
        },

        {
          key: "address",
          label: "Adres",
          value: "Berlin, Germany",
          confidence: 0.92,
          sourceDocumentKey: "passport",
        },
      ],
    },

    {
      processId: "opportunity-card",
      documentKey: "application-form",
      documentTitle: "Başvuru Formu",
      fileName: "application-form.pdf",

      fields: [
        {
          key: "fullName",
          label: "Ad Soyad",
          value: "Jon Smith",
          confidence: 0.95,
          sourceDocumentKey: "application-form",
        },

        {
          key: "address",
          label: "Adres",
          value: "Berlin, Germany",
          confidence: 0.95,
          sourceDocumentKey: "application-form",
        },

        {
          key: "passportNumber",
          label: "Pasaport Numarası",
          value: "TR1234567",
          confidence: 0.99,
          sourceDocumentKey: "application-form",
        },
      ],
    },
  ];

  const comparisonIssues =
    compareDocuments(extractedDocuments);

  const smartFormFields =
    buildSmartFormFields(extractedDocuments);

  const allTestsPassed =
    analysis.readiness.score === 50 &&
    analysis.recommendations.length > 0 &&
    extractedPassportFields.length >= 4 &&
    comparisonIssues.length === 1 &&
    smartFormFields.length > 0;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              ALQEV
            </p>

            <h1 style={styles.title}>
              AI Core Test Merkezi
            </h1>

            <p style={styles.subtitle}>
              Readiness, öneriler, OCR, belge
              karşılaştırma ve Smart Form testleri.
            </p>
          </div>

          <div
            style={{
              ...styles.statusBadge,

              backgroundColor: allTestsPassed
                ? "#dcfce7"
                : "#fee2e2",

              color: allTestsPassed
                ? "#166534"
                : "#991b1b",
            }}
          >
            {allTestsPassed
              ? "✅ TÜM TESTLER BAŞARILI"
              : "❌ TEST HATASI VAR"}
          </div>
        </header>

        <section style={styles.grid}>
          <article style={styles.card}>
            <p style={styles.cardLabel}>
              READINESS SCORE
            </p>

            <div style={styles.scoreRow}>
              <strong style={styles.score}>
                {analysis.readiness.score}
              </strong>

              <span style={styles.scoreMaximum}>
                / 100
              </span>
            </div>

            <p style={styles.cardDescription}>
              {
                analysis.readiness
                  .completedItems
              }{" "}
              / {analysis.readiness.totalItems} belge
              tamamlandı.
            </p>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressBar,

                  width: `${analysis.readiness.score}%`,
                }}
              />
            </div>

            <div style={styles.list}>
              {analysis.readiness.items.map(
                (item) => (
                  <div
                    key={item.key}
                    style={styles.listItem}
                  >
                    <span>
                      {item.completed
                        ? "✅"
                        : "❌"}
                    </span>

                    <span>{item.label}</span>
                  </div>
                ),
              )}
            </div>
          </article>

          <article style={styles.card}>
            <p style={styles.cardLabel}>
              AI RECOMMENDATIONS
            </p>

            <h2 style={styles.cardTitle}>
              Öneriler
            </h2>

            <div style={styles.list}>
              {analysis.recommendations.map(
                (recommendation) => (
                  <div
                    key={recommendation.id}
                    style={styles.recommendation}
                  >
                    <div
                      style={{
                        ...styles.severityDot,

                        backgroundColor:
                          getSeverityColor(
                            recommendation.severity,
                          ),
                      }}
                    />

                    <div>
                      <strong>
                        {recommendation.title}
                      </strong>

                      <p style={styles.smallText}>
                        {recommendation.message}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </article>

          <article style={styles.card}>
            <p style={styles.cardLabel}>
              OCR TEST
            </p>

            <h2 style={styles.cardTitle}>
              Çıkarılan Alanlar
            </h2>

            <div style={styles.list}>
              {extractedPassportFields.map(
                (field) => (
                  <div
                    key={field.key}
                    style={styles.fieldRow}
                  >
                    <span style={styles.fieldLabel}>
                      {field.label}
                    </span>

                    <strong>{field.value}</strong>

                    <span
                      style={styles.confidence}
                    >
                      %
                      {Math.round(
                        field.confidence * 100,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </article>

          <article style={styles.card}>
            <p style={styles.cardLabel}>
              DOCUMENT COMPARE
            </p>

            <h2 style={styles.cardTitle}>
              Belge Uyuşmazlıkları
            </h2>

            {comparisonIssues.length === 0 ? (
              <p style={styles.successText}>
                ✅ Belgeler arasında uyuşmazlık
                bulunamadı.
              </p>
            ) : (
              <div style={styles.list}>
                {comparisonIssues.map(
                  (issue) => (
                    <div
                      key={issue.id}
                      style={styles.issueBox}
                    >
                      <strong>
                        ⚠️ {issue.message}
                      </strong>

                      {issue.values.map(
                        (value) => (
                          <p
                            key={`${issue.id}-${value.documentKey}`}
                            style={styles.smallText}
                          >
                            {value.documentTitle}:{" "}
                            <strong>
                              {value.value}
                            </strong>
                          </p>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </article>

          <article
            style={{
              ...styles.card,
              ...styles.fullWidthCard,
            }}
          >
            <p style={styles.cardLabel}>
              SMART FORM
            </p>

            <h2 style={styles.cardTitle}>
              Form İçin Önerilen Alanlar
            </h2>

            <div style={styles.formGrid}>
              {smartFormFields.map((field) => (
                <div
                  key={field.key}
                  style={styles.formField}
                >
                  <label style={styles.fieldLabel}>
                    {field.label}
                  </label>

                  <input
                    value={field.value}
                    readOnly
                    style={styles.input}
                  />

                  <span style={styles.helperText}>
                    Kaynak:{" "}
                    {field.source ??
                      "Bilinmiyor"}{" "}
                    · Güven: %
                    {Math.round(
                      field.confidence * 100,
                    )}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function getSeverityColor(
  severity:
    | "info"
    | "warning"
    | "critical"
    | "success",
): string {
  if (severity === "critical") {
    return "#dc2626";
  }

  if (severity === "warning") {
    return "#f59e0b";
  }

  if (severity === "success") {
    return "#16a34a";
  }

  return "#2563eb";
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "48px 24px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  container: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "32px",
  },

  eyebrow: {
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "#2563eb",
  },

  title: {
    margin: 0,
    fontSize: "36px",
    lineHeight: 1.15,
  },

  subtitle: {
    maxWidth: "650px",
    margin: "12px 0 0",
    color: "#64748b",
    lineHeight: 1.7,
  },

  statusBadge: {
    flexShrink: 0,
    padding: "12px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 800,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },

  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    padding: "24px",
    boxShadow:
      "0 12px 30px rgba(15, 23, 42, 0.06)",
  },

  fullWidthCard: {
    gridColumn: "1 / -1",
  },

  cardLabel: {
    margin: "0 0 12px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#64748b",
  },

  cardTitle: {
    margin: "0 0 20px",
    fontSize: "22px",
  },

  cardDescription: {
    margin: "10px 0 16px",
    color: "#64748b",
  },

  scoreRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
  },

  score: {
    fontSize: "64px",
    lineHeight: 1,
  },

  scoreMaximum: {
    fontSize: "22px",
    color: "#64748b",
  },

  progressTrack: {
    width: "100%",
    height: "10px",
    overflow: "hidden",
    borderRadius: "999px",
    backgroundColor: "#e2e8f0",
    marginBottom: "20px",
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    backgroundColor: "#2563eb",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  listItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
  },

  recommendation: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    borderRadius: "14px",
    backgroundColor: "#f8fafc",
  },

  severityDot: {
    width: "10px",
    height: "10px",
    flexShrink: 0,
    marginTop: "5px",
    borderRadius: "999px",
  },

  smallText: {
    margin: "5px 0 0",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#64748b",
  },

  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "12px",
    backgroundColor: "#f8fafc",
  },

  fieldLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#64748b",
  },

  confidence: {
    padding: "5px 8px",
    borderRadius: "999px",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
  },

  issueBox: {
    padding: "16px",
    border: "1px solid #fed7aa",
    borderRadius: "14px",
    backgroundColor: "#fff7ed",
  },

  successText: {
    padding: "16px",
    borderRadius: "14px",
    backgroundColor: "#f0fdf4",
    color: "#166534",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "18px",
  },

  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    outline: "none",
  },

  helperText: {
    fontSize: "12px",
    color: "#64748b",
  },
};