import { useState, useCallback, useMemo } from "react";

const STAGES = [
  { key: "advance", label: "Аванс", pct: 0.5, color: "#3B82F6", bg: "#EFF6FF" },
  { key: "sketch", label: "Эскизы", pct: 0.3, color: "#F59E0B", bg: "#FFFBEB" },
  { key: "final", label: "Расчёт", pct: 0.2, color: "#10B981", bg: "#ECFDF5" },
];

const TAX_RATE = 0.08;
const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const RUB = " руб.";

const newPayment = () => ({ id: Date.now() + Math.random(), amount: "", date: "", payType: "cash" });

const emptyProject = () => ({
  id: Date.now(),
  client: "",
  area: "",
  priceMode: "perM2",
  pricePerM2: "",
  totalPrice: "",
  stages: {
    advance: { docsDone: false, payments: [newPayment()] },
    sketch: { docsDone: false, payments: [newPayment()] },
    final: { docsDone: false, payments: [newPayment()] },
  },
});

const fmt = (n) => {
  if (!n && n !== 0) return "—";
  return Math.round(n).toLocaleString("ru-RU");
};

const Chip = ({ active, label, onClick, activeColor, activeBg }) => (
  <button onClick={onClick} style={{
    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 700, background: active ? activeBg : "#F1F5F9",
    color: active ? activeColor : "#94A3B8", transition: "all 0.15s",
  }}>{label}</button>
);

const Toggle = ({ checked, onChange, color, labelOn, labelOff }) => (
  <button onClick={onChange} style={{
    display: "flex", alignItems: "center", gap: 7,
    background: "none", border: "none", cursor: "pointer", padding: 0,
  }}>
    <span style={{
      width: 36, height: 20, borderRadius: 10, position: "relative",
      background: checked ? color : "#D1D5DB", transition: "background 0.2s",
      display: "inline-block", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: 8, background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
      }} />
    </span>
    <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color: checked ? color : "#94A3B8" }}>
      {checked ? labelOn : labelOff}
    </span>
  </button>
);

const ModeSwitch = ({ mode, onChange }) => (
  <div style={{
    display: "inline-flex", borderRadius: 8, overflow: "hidden",
    border: "1px solid #E2E8F0", fontSize: 11, fontWeight: 700,
  }}>
    {[{ value: "perM2", label: "Цена/м² → Итого" },
      { value: "total", label: "Итого → Цена/м²" }].map((o) => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: "6px 12px", border: "none", cursor: "pointer",
        background: mode === o.value ? "#6D28D9" : "#F8FAFC",
        color: mode === o.value ? "#fff" : "#64748B",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}>{o.label}</button>
    ))}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginTop: 18,
  }}>{children}</div>
);

const ResultBox = ({ label, value }) => (
  <div style={{
    flex: "1 1 150px", background: "#F5F3FF", borderRadius: 12,
    padding: "10px 14px", border: "1px dashed #C4B5FD",
  }}>
    <div style={{ fontSize: 10, color: "#7C3AED", fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#4C1D95" }}>{value}</div>
  </div>
);

const getTotal = (p) => {
  const area = parseFloat(p.area);
  if (p.priceMode === "perM2") { const ppm = parseFloat(p.pricePerM2); return area && ppm ? area * ppm : null; }
  return parseFloat(p.totalPrice) || null;
};
const getCalc = (p) => {
  const area = parseFloat(p.area);
  if (p.priceMode === "total") { const t = parseFloat(p.totalPrice); return area && t ? t / area : null; }
  return parseFloat(p.pricePerM2) || null;
};

const getStagePaid = (p, sk) => {
  return p.stages[sk].payments.reduce((s, pay) => s + (parseFloat(pay.amount) || 0), 0);
};

const getStageTaxFromPayments = (p, sk) => {
  return p.stages[sk].payments.reduce((s, pay) => {
    const amt = parseFloat(pay.amount) || 0;
    return s + (pay.payType === "bank" ? amt * TAX_RATE : 0);
  }, 0);
};

const getTotalPaid = (p) => STAGES.reduce((s, x) => s + getStagePaid(p, x.key), 0);
const getTotalTax = (p) => STAGES.reduce((s, x) => s + getStageTaxFromPayments(p, x.key), 0);
const getTotalNet = (p) => getTotalPaid(p) - getTotalTax(p);

export default function FinanceTracker() {
  const [projects, setProjects] = useState([emptyProject()]);
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState("projects");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const update = useCallback((id, f, v) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [f]: v } : p)));
  }, []);

  const updateStageField = useCallback((id, sk, f, v) => {
    setProjects((prev) => prev.map((p) =>
      p.id === id ? { ...p, stages: { ...p.stages, [sk]: { ...p.stages[sk], [f]: v } } } : p
    ));
  }, []);

  const updatePayment = useCallback((projectId, sk, payId, field, value) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const payments = p.stages[sk].payments.map((pay) =>
        pay.id === payId ? { ...pay, [field]: value } : pay
      );
      return { ...p, stages: { ...p.stages, [sk]: { ...p.stages[sk], payments } } };
    }));
  }, []);

  const addPayment = useCallback((projectId, sk) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      return { ...p, stages: { ...p.stages, [sk]: { ...p.stages[sk], payments: [...p.stages[sk].payments, newPayment()] } } };
    }));
  }, []);

  const removePayment = useCallback((projectId, sk, payId) => {
    setProjects((prev) => prev.map((p) => {
      if (p.id !== projectId) return p;
      const payments = p.stages[sk].payments.filter((pay) => pay.id !== payId);
      return { ...p, stages: { ...p.stages, [sk]: { ...p.stages[sk], payments: payments.length ? payments : [newPayment()] } } };
    }));
  }, []);

  const addProject = () => { const np = emptyProject(); setProjects((prev) => [...prev, np]); setExpandedId(np.id); setTab("projects"); };
  const removeProject = (id) => { setProjects((prev) => prev.filter((p) => p.id !== id)); if (expandedId === id) setExpandedId(null); };

  const grandTotal = projects.reduce((s, p) => s + (getTotal(p) || 0), 0);
  const grandPaid = projects.reduce((s, p) => s + getTotalPaid(p), 0);
  const grandTax = projects.reduce((s, p) => s + getTotalTax(p), 0);
  const grandNet = grandPaid - grandTax;
  const docsCount = projects.reduce((s, p) => s + STAGES.filter((x) => p.stages[x.key].docsDone).length, 0);
  const totalStages = projects.length * 3;

  const monthlyData = useMemo(() => {
    const months = {};
    projects.forEach((p) => {
      const total = getTotal(p);
      STAGES.forEach((s) => {
        p.stages[s.key].payments.forEach((pay) => {
          const amt = parseFloat(pay.amount) || 0;
          if (!amt || !pay.date) return;
          const d = new Date(pay.date);
          if (isNaN(d.getTime())) return;
          const key = d.getFullYear() + "-" + String(d.getMonth()).padStart(2, "0");
          if (!months[key]) months[key] = { year: d.getFullYear(), month: d.getMonth(), gross: 0, tax: 0, net: 0, cash: 0, bank: 0, payments: [] };
          const tax = pay.payType === "bank" ? amt * TAX_RATE : 0;
          months[key].gross += amt;
          months[key].tax += tax;
          months[key].net += amt - tax;
          if (pay.payType === "cash") months[key].cash += amt; else months[key].bank += amt;
          months[key].payments.push({
            client: p.client || "Без названия",
            stage: s.label,
            amt, tax, net: amt - tax,
            payType: pay.payType,
            date: pay.date,
          });
        });
      });
    });
    return Object.values(months).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
  }, [projects]);

  const years = useMemo(() => {
    const s = new Set(monthlyData.map((m) => m.year));
    s.add(new Date().getFullYear());
    return [...s].sort();
  }, [monthlyData]);

  const filteredMonths = useMemo(() => monthlyData.filter((m) => m.year === selectedYear), [monthlyData, selectedYear]);
  const yearTotal = useMemo(() => filteredMonths.reduce((a, m) => ({ gross: a.gross + m.gross, tax: a.tax + m.tax, net: a.net + m.net }), { gross: 0, tax: 0, net: 0 }), [filteredMonths]);
  const chartMax = useMemo(() => Math.max(...filteredMonths.map((m) => m.gross), 1), [filteredMonths]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: "#1E293B" }}>

      <div style={{ background: "linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4C1D95 100%)", padding: "28px 20px 0", color: "#fff" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: "#A78BFA", marginBottom: 4, textTransform: "uppercase" }}>Дизайн интерьера</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Учёт финансов</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 18 }}>
            {[
              { label: "Проектов", value: projects.length },
              { label: "Бюджет", value: fmt(grandTotal) + RUB },
              { label: "Оплачено", value: fmt(grandPaid) + RUB, sub: "остаток " + fmt(grandTotal - grandPaid) },
              { label: "Налог 8%", value: fmt(grandTax) + RUB, sub: "безнал" },
              { label: "На руки", value: fmt(grandNet) + RUB, sub: "после налога" },
              { label: "Документы", value: docsCount + "/" + totalStages, sub: "закрыто" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#C4B5FD", fontWeight: 700, letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{s.value}</div>
                {s.sub && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 0, marginTop: 20 }}>
            {[{ key: "projects", label: "Проекты" }, { key: "income", label: "Доход по месяцам" }].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: tab === t.key ? "#F8FAFC" : "transparent",
                color: tab === t.key ? "#4C1D95" : "#A78BFA",
                borderRadius: "12px 12px 0 0", transition: "all 0.15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 14px 80px" }}>

        {tab === "projects" && (
          <>
            {projects.map((p, idx) => {
              const total = getTotal(p);
              const paid = getTotalPaid(p);
              const expanded = expandedId === p.id;
              const paidPct = total ? (paid / total) * 100 : 0;
              const fullyPaid = total && paid >= total;

              return (
                <div key={p.id} style={{
                  background: "#fff", borderRadius: 16, marginBottom: 10,
                  boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  border: expanded ? "1.5px solid #C4B5FD" : "1px solid #E2E8F0",
                  overflow: "hidden",
                }}>
                  <div onClick={() => setExpandedId(expanded ? null : p.id)} style={{
                    padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: fullyPaid ? "linear-gradient(135deg,#059669,#10B981)" : "linear-gradient(135deg,#6D28D9,#8B5CF6)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13,
                    }}>{fullyPaid ? "✓" : idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.client || "Новый проект"}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>
                        {p.area ? p.area + " м²" : "—"} · {total ? fmt(total) + RUB : "не указано"}
                        {paid > 0 && <span> · оплачено {fmt(paid)}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {STAGES.map((s) => {
                        const stageTarget = total ? total * s.pct : 0;
                        const stagePaid = getStagePaid(p, s.key);
                        const done = stageTarget > 0 && stagePaid >= stageTarget;
                        const partial = stagePaid > 0 && !done;
                        return (
                          <div key={s.key} style={{
                            width: 10, height: 10, borderRadius: 5,
                            background: done ? s.color : partial ? s.color + "60" : "#E2E8F0",
                            border: p.stages[s.key].docsDone ? "2px solid " + s.color : "2px solid transparent",
                          }} />
                        );
                      })}
                    </div>
                    {total && (
                      <div style={{ width: 60, textAlign: "right", flexShrink: 0 }}>
                        <div style={{ height: 5, borderRadius: 3, background: "#E2E8F0", overflow: "hidden", marginBottom: 3 }}>
                          <div style={{ height: "100%", borderRadius: 3, transition: "width 0.4s",
                            background: paidPct >= 100 ? "#10B981" : "linear-gradient(90deg,#6D28D9,#8B5CF6)",
                            width: Math.min(paidPct, 100) + "%" }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700 }}>{Math.round(paidPct)}%</div>
                      </div>
                    )}
                    <div style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: 16, color: "#94A3B8" }}>{"▾"}</div>
                  </div>

                  {expanded && (
                    <div style={{ padding: "0 18px 18px" }}>
                      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
                        <label style={lbl}>Клиент / Проект</label>
                        <input style={inp} placeholder="Иванов А. — квартира на Тверской" value={p.client} onChange={(e) => update(p.id, "client", e.target.value)} />

                        <SectionLabel>Расчёт стоимости</SectionLabel>
                        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ flex: "1 1 120px" }}>
                            <label style={lbl}>Площадь (м²)</label>
                            <input style={inp} type="number" placeholder="75" value={p.area} onChange={(e) => update(p.id, "area", e.target.value)} />
                          </div>
                          <div style={{ flex: "0 0 auto" }}>
                            <label style={lbl}>Режим</label>
                            <ModeSwitch mode={p.priceMode} onChange={(v) => update(p.id, "priceMode", v)} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
                          {p.priceMode === "perM2" ? (<>
                            <div style={{ flex: "1 1 150px" }}>
                              <label style={lbl}>Цена за м²</label>
                              <input style={inp} type="number" placeholder="4500" value={p.pricePerM2} onChange={(e) => update(p.id, "pricePerM2", e.target.value)} />
                            </div>
                            <ResultBox label="Общая сумма" value={total ? fmt(total) + RUB : "—"} />
                          </>) : (<>
                            <div style={{ flex: "1 1 150px" }}>
                              <label style={lbl}>Общая сумма</label>
                              <input style={inp} type="number" placeholder="500000" value={p.totalPrice} onChange={(e) => update(p.id, "totalPrice", e.target.value)} />
                            </div>
                            <ResultBox label="Цена за м²" value={getCalc(p) ? fmt(getCalc(p)) + RUB : "—"} />
                          </>)}
                        </div>

                        <SectionLabel>Этапы оплаты</SectionLabel>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {STAGES.map((s, sIdx) => {
                            const st = p.stages[s.key];
                            const stageTarget = total ? total * s.pct : null;
                            const stagePaid = getStagePaid(p, s.key);
                            const stageTax = getStageTaxFromPayments(p, s.key);
                            const stageNet = stagePaid - stageTax;
                            const stageComplete = stageTarget && stagePaid >= stageTarget;
                            const stageProgress = stageTarget ? Math.min((stagePaid / stageTarget) * 100, 100) : 0;

                            return (
                              <div key={s.key} style={{
                                background: stageComplete ? s.bg : "#FAFAFA", borderRadius: 14, padding: "14px 16px",
                                border: "1px solid " + (stageComplete ? s.color + "40" : "#E2E8F0"),
                              }}>
                                {/* Stage header */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap", marginBottom: 10 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ width: 24, height: 24, borderRadius: 12, background: s.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{sIdx + 1}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                                    <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, background: "#F1F5F9", borderRadius: 6, padding: "2px 7px" }}>{Math.round(s.pct * 100)}%</span>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontWeight: 800, fontSize: 16, color: stageComplete ? s.color : "#475569" }}>
                                      {stageTarget ? fmt(stageTarget) + RUB : "—"}
                                    </div>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                {stageTarget && (
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                      <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                                        Оплачено: {fmt(stagePaid)} из {fmt(stageTarget)}
                                      </span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: stageComplete ? s.color : "#64748B" }}>
                                        {Math.round(stageProgress)}%
                                      </span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}>
                                      <div style={{
                                        height: "100%", borderRadius: 3, transition: "width 0.3s",
                                        background: stageComplete ? s.color : s.color + "99",
                                        width: stageProgress + "%",
                                      }} />
                                    </div>
                                  </div>
                                )}

                                {/* Payments list */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {st.payments.map((pay, pi) => (
                                    <div key={pay.id} style={{
                                      display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                                      background: "#fff", borderRadius: 10, padding: "8px 10px",
                                      border: "1px solid #F1F5F9",
                                    }}>
                                      <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, width: 16, textAlign: "center", flexShrink: 0 }}>{pi + 1}</span>
                                      <input
                                        type="number" placeholder="Сумма"
                                        value={pay.amount}
                                        onChange={(e) => updatePayment(p.id, s.key, pay.id, "amount", e.target.value)}
                                        style={{ ...inp, width: 110, flex: "1 1 100px", padding: "6px 10px", fontSize: 13 }}
                                      />
                                      <input
                                        type="date" value={pay.date}
                                        onChange={(e) => updatePayment(p.id, s.key, pay.id, "date", e.target.value)}
                                        style={{ padding: "5px 8px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#1E293B", background: "#fff", outline: "none", width: 130 }}
                                      />
                                      <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                                        <Chip active={pay.payType === "cash"} label="Нал" onClick={() => updatePayment(p.id, s.key, pay.id, "payType", "cash")} activeColor="#059669" activeBg="#ECFDF5" />
                                        <Chip active={pay.payType === "bank"} label="Б/н" onClick={() => updatePayment(p.id, s.key, pay.id, "payType", "bank")} activeColor="#DC2626" activeBg="#FEF2F2" />
                                      </div>
                                      {pay.payType === "bank" && pay.amount && (
                                        <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 600 }}>
                                          -{fmt((parseFloat(pay.amount) || 0) * TAX_RATE)}
                                        </span>
                                      )}
                                      <button onClick={() => removePayment(p.id, s.key, pay.id)} style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        color: "#D1D5DB", fontSize: 16, padding: "0 4px", lineHeight: 1,
                                      }} title="Удалить">×</button>
                                    </div>
                                  ))}
                                </div>

                                {/* Add payment + docs */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                                  <button onClick={() => addPayment(p.id, s.key)} style={{
                                    background: "none", border: "1px dashed " + s.color + "80",
                                    borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                                    fontSize: 11, fontWeight: 700, color: s.color,
                                  }}>+ Добавить оплату</button>
                                  <Toggle checked={st.docsDone} onChange={() => updateStageField(p.id, s.key, "docsDone", !st.docsDone)}
                                    color="#8B5CF6" labelOn="Закр. док ✓" labelOff="Закр. док" />
                                </div>

                                {/* Stage tax summary */}
                                {stageTax > 0 && (
                                  <div style={{ marginTop: 8, fontSize: 11, color: "#991B1B", background: "#FEF2F2", borderRadius: 8, padding: "5px 10px", fontWeight: 600, display: "flex", gap: 14 }}>
                                    <span>Налог 8%: {fmt(stageTax) + RUB}</span>
                                    <span style={{ color: "#065F46" }}>На руки: {fmt(stageNet) + RUB}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Project footer */}
                        <div style={{ marginTop: 14, padding: "12px 14px", background: "#F8FAFC", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ fontSize: 12, display: "flex", gap: 14, flexWrap: "wrap" }}>
                            {total && (<>
                              <span><span style={{ color: "#64748B" }}>Оплачено </span><b style={{ color: "#10B981" }}>{fmt(paid) + RUB}</b></span>
                              <span><span style={{ color: "#64748B" }}>Остаток </span><b style={{ color: total - paid > 0 ? "#EF4444" : "#10B981" }}>{fmt(total - paid) + RUB}</b></span>
                              {getTotalTax(p) > 0 && <span><span style={{ color: "#64748B" }}>На руки </span><b style={{ color: "#6D28D9" }}>{fmt(getTotalNet(p)) + RUB}</b></span>}
                            </>)}
                          </div>
                          <button onClick={() => removeProject(p.id)} style={delBtn}>Удалить</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addProject} style={{
              width: "100%", padding: "14px", marginTop: 8, background: "#fff",
              border: "2px dashed #C4B5FD", borderRadius: 16, cursor: "pointer",
              fontSize: 14, fontWeight: 700, color: "#6D28D9",
            }}>+ Добавить проект</button>
          </>
        )}

        {tab === "income" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>Год:</span>
              <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                {years.map((y) => (
                  <button key={y} onClick={() => setSelectedYear(y)} style={{
                    padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    background: selectedYear === y ? "#6D28D9" : "#fff",
                    color: selectedYear === y ? "#fff" : "#64748B",
                  }}>{y}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Доход за год", value: fmt(yearTotal.gross) + RUB, color: "#6D28D9", bg: "#F5F3FF" },
                { label: "Налоги за год", value: fmt(yearTotal.tax) + RUB, color: "#DC2626", bg: "#FEF2F2" },
                { label: "На руки за год", value: fmt(yearTotal.net) + RUB, color: "#059669", bg: "#ECFDF5" },
              ].map((c) => (
                <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.color, opacity: 0.7 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
                </div>
              ))}
            </div>

            {filteredMonths.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 18px", border: "1px solid #E2E8F0", marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 16 }}>Доход по месяцам</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = filteredMonths.find((x) => x.month === i);
                    const gross = m ? m.gross : 0;
                    const net = m ? m.net : 0;
                    const h = chartMax ? (gross / chartMax) * 130 : 0;
                    const hNet = chartMax ? (net / chartMax) * 130 : 0;
                    const isNow = i === new Date().getMonth() && selectedYear === new Date().getFullYear();
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {gross > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: "#6D28D9", whiteSpace: "nowrap" }}>{fmt(gross)}</div>}
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 130 }}>
                          <div style={{ position: "relative", width: "80%", maxWidth: 48 }}>
                            <div style={{
                              width: "100%", height: Math.max(h, gross > 0 ? 4 : 0), borderRadius: "6px 6px 0 0",
                              background: isNow ? "linear-gradient(180deg,#8B5CF6,#6D28D9)" : "linear-gradient(180deg,#C4B5FD,#A78BFA)",
                              transition: "height 0.4s",
                            }} />
                            {net < gross && net > 0 && (
                              <div style={{
                                position: "absolute", bottom: 0, width: "100%",
                                height: Math.max(hNet, 4),
                                background: "rgba(16,185,129,0.3)",
                                borderTop: "2px dashed #10B981",
                              }} />
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: isNow ? 800 : 600, color: isNow ? "#6D28D9" : "#94A3B8" }}>{MONTHS_SHORT[i]}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "#A78BFA" }} />
                    <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>Доход</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(16,185,129,0.3)", borderTop: "2px dashed #10B981" }} />
                    <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>На руки</span>
                  </div>
                </div>
              </div>
            )}

            {filteredMonths.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Нет данных за {selectedYear} год</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Добавьте оплаты с датами в проектах</div>
              </div>
            )}

            {[...filteredMonths].reverse().map((m) => (
              <div key={m.year + "-" + m.month} style={{
                background: "#fff", borderRadius: 16, marginBottom: 10,
                border: "1px solid #E2E8F0", overflow: "hidden",
              }}>
                <div style={{
                  padding: "14px 18px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #F1F5F9",
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{MONTHS_RU[m.month]} {m.year}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{m.payments.length} оплат(а)</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#6D28D9" }}>{fmt(m.gross) + RUB}</div>
                    <div style={{ fontSize: 11, display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 2 }}>
                      {m.tax > 0 && <span style={{ color: "#EF4444", fontWeight: 600 }}>налог {fmt(m.tax)}</span>}
                      {m.tax > 0 && <span style={{ color: "#059669", fontWeight: 700 }}>на руки {fmt(m.net)}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #F1F5F9" }}>
                  {m.cash > 0 && <div style={{ flex: m.cash, padding: "8px 14px", background: "#ECFDF5" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>Нал: {fmt(m.cash) + RUB}</span></div>}
                  {m.bank > 0 && <div style={{ flex: m.bank, padding: "8px 14px", background: "#FEF2F2" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626" }}>Безнал: {fmt(m.bank) + RUB}</span></div>}
                </div>

                <div style={{ padding: "6px 0" }}>
                  {m.payments.sort((a, b) => a.date.localeCompare(b.date)).map((pay, i) => (
                    <div key={i} style={{
                      padding: "8px 18px", display: "flex", justifyContent: "space-between",
                      alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap",
                      borderBottom: i < m.payments.length - 1 ? "1px solid #F8FAFC" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: pay.payType === "cash" ? "#ECFDF5" : "#FEF2F2",
                          color: pay.payType === "cash" ? "#059669" : "#DC2626",
                        }}>{pay.payType === "cash" ? "НАЛ" : "Б/Н"}</span>
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pay.client}</span>
                        <span style={{ color: "#94A3B8", fontSize: 11 }}>{pay.stage}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(pay.date).toLocaleDateString("ru-RU")}</span>
                        <span style={{ fontWeight: 800 }}>{fmt(pay.amt) + RUB}</span>
                        {pay.tax > 0 && <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 600 }}>-{fmt(pay.tax)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.6 };
const inp = { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box" };
const delBtn = { background: "none", border: "1px solid #FCA5A5", color: "#EF4444", borderRadius: 8, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" };
