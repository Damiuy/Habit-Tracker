import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const THEMES = [
  { id: "purple", name: "퍼플",     p: "#8B72E0", s: "#F4F0FF", m: "#D4C8FA", card: "#EDE8FF", d: "#3D2B8E" },
  { id: "blue",   name: "블루",     p: "#4A90D9", s: "#EEF6FF", m: "#C5DEFF", card: "#DCF0FF", d: "#1A4A8E" },
  { id: "green",  name: "그린",     p: "#3DB87A", s: "#EDFBF3", m: "#B8EDD3", card: "#D4F5E7", d: "#1A6040" },
  { id: "pink",   name: "핑크",     p: "#E56FA0", s: "#FEF2F7", m: "#F9C6DE", card: "#FAD8EC", d: "#8E2255" },
  { id: "yellow", name: "옐로우",   p: "#C9920A", s: "#FFFBEC", m: "#F6DFA0", card: "#FFF0C0", d: "#7A5500" },
  { id: "rose",   name: "로즈",     p: "#E8705A", s: "#FFF2EF", m: "#F9C5BA", card: "#FAD6CC", d: "#8E3020" },
  { id: "teal",   name: "민트",     p: "#2AADA8", s: "#EDFBFA", m: "#A9E8E6", card: "#C8F0EE", d: "#0E5754" },
  { id: "slate",  name: "슬레이트", p: "#607D9E", s: "#F0F4F9", m: "#C2D0E0", card: "#D5E0EE", d: "#2A4060" },
];

const FONTS = [
  { id: "system",     name: "시스템 기본", family: "system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif", url: null },
  { id: "pretendard", name: "Pretendard",  family: "'Pretendard Variable', Pretendard, sans-serif", url: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable.min.css" },
  { id: "noto",       name: "Noto Sans KR",family: "'Noto Sans KR', sans-serif", url: "https://unpkg.com/@fontsource/noto-sans-kr/400.css" },
  { id: "gowun",      name: "고운돋움",    family: "'Gowun Dodum', sans-serif", url: "https://unpkg.com/@fontsource/gowun-dodum/400.css" },
  { id: "custom",     name: "업로드 폰트", family: "'UploadedFont', system-ui, sans-serif", url: null },
];

const DEFAULT_CATS = [
  { id: "morning", label: "아침 루틴", color: "#EF9F27", fixed: false },
  { id: "health",  label: "건강",      color: "#2CB87A", fixed: false },
  { id: "growth",  label: "자기계발", color: "#D85A30", fixed: false },
  { id: "other",   label: "기타",      color: "#8C9AB5", fixed: false },
];

const GREETINGS = [
  "오늘도 파이팅!",
  "시작이 절반이다!",
  "0%에서 1%로!",
  "다 할 필요는 없어요, 하나라도 해 볼까요?",
  "휴식하고 싶은 날에는 푹 쉬기!",
  "아무것도 못해도 자책 금지!",
  "오늘은 뭘 해 볼까요?",
];

const CAT_COLOR_OPTIONS = [
  "#EF9F27","#2CB87A","#9070E0","#378ADD","#D85A30","#D4537E",
  "#E8705A","#2AADA8","#607D9E","#C4A020","#5B9E3D","#B05AC4",
];

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const WDAYS  = ["일","월","화","수","목","금","토"];

const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const wd  = (y, m, d) => new Date(y, m, d).getDay();
const uid = () => Math.random().toString(36).slice(2, 9);
const defaultHabits = () => [
  { id: uid(), name: "물 한 잔 마시기", category: "morning" },
  { id: uid(), name: "스트레칭",         category: "health"  },
  { id: uid(), name: "독서",             category: "growth"  },
];

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)}`;
}

// ── localStorage helpers (캐시용) ─────────────────────────────────────────────
const lsGet = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false); // 회원가입 완료

  const handleSubmit = async () => {
    setError("");
    if (!email || !pw) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    if (mode === "register" && pw !== pwConfirm) { setError("비밀번호가 일치하지 않아요."); return; }
    if (pw.length < 6) { setError("비밀번호는 6자 이상이어야 해요."); return; }
    setLoading(true);
    if (mode === "login") {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (e) setError(e.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 틀렸어요." : e.message);
    } else {
      const { error: e } = await supabase.auth.signUp({ email, password: pw });
      if (e) setError(e.message);
      else setDone(true);
    }
    setLoading(false);
  };

  const inp = {
    width: "100%", padding: "13px 16px", fontSize: 14,
    border: "1.5px solid #E8E0FF", borderRadius: 12,
    outline: "none", background: "#FAFAFE",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#1A1A2E",
  };

  if (done) return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#8B72E0", marginBottom: 8 }}>이메일을 확인해주세요</div>
      <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7 }}>
        <strong>{email}</strong>으로<br />인증 링크를 보냈어요.<br />확인 후 다시 로그인해주세요.
      </div>
      <button onClick={() => { setDone(false); setMode("login"); }} style={{ marginTop: 24, padding: "12px 28px", background: "#8B72E0", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        로그인으로 돌아가기
      </button>
    </div>
  );

  return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", background: "#FAFAFF" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#8B72E0", marginBottom: 6 }}>작심삼일 탈출 🌱</div>
        <div style={{ fontSize: 14, color: "#AAA" }}>{mode === "login" ? "로그인하고 습관을 이어가요" : "계정을 만들고 시작해요"}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" style={inp} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 (6자 이상)" style={inp} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        {mode === "register" && (
          <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="비밀번호 확인" style={inp} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        )}

        {error && <div style={{ fontSize: 12, color: "#E05555", padding: "8px 12px", background: "#FFF0F0", borderRadius: 8 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          padding: "14px", background: loading ? "#C4B5F5" : "#8B72E0",
          color: "#fff", border: "none", borderRadius: 12,
          fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer", marginTop: 4,
        }}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#AAA" }}>
        {mode === "login" ? "아직 계정이 없으신가요? " : "이미 계정이 있으신가요? "}
        <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ color: "#8B72E0", fontWeight: 600, cursor: "pointer" }}>
          {mode === "login" ? "회원가입" : "로그인"}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HABIT TRACKER (main app)
// ══════════════════════════════════════════════════════════════════════════════
function HabitTracker({ user }) {
  const today  = new Date();
  const userId = user.id;

  const [yr, setYr]         = useState(today.getFullYear());
  const [mo, setMo]         = useState(today.getMonth());
  const [selDay, setSelDay] = useState(today.getDate() - 1);
  const [showCal, setShowCal] = useState(false);
  const [tab, setTab]       = useState("tracker");

  const [habits, setHabits] = useState([]);
  const [rec, setRec]       = useState({});
  const [memos, setMemos]   = useState({});
  const [userCats, setUserCats] = useState([]);
  const [theme, setTheme]   = useState(THEMES[0]);
  const [fontId, setFontId] = useState("system");
  const [customFontName, setCustomFontName] = useState("");
  const [ready, setReady]   = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [newName, setNewName]         = useState("");
  const [newCat, setNewCat]           = useState("morning");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState(CAT_COLOR_OPTIONS[0]);
  const [showCatForm, setShowCatForm] = useState(false);

  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const loadedFonts = useRef(new Set());
 const [userCats, setUserCats] = useState([...DEFAULT_CATS]);
const allCats = userCats;

  // ── Theme CSS vars ────────────────────────────────────────────────────────
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--tp", theme.p);
    r.style.setProperty("--ts", theme.s);
    r.style.setProperty("--tm", theme.m);
  }, [theme]);

  // ── Font loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const f = FONTS.find(x => x.id === fontId);
    if (f?.url && !loadedFonts.current.has(fontId)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = f.url;
      document.head.appendChild(link);
      loadedFonts.current.add(fontId);
    }
  }, [fontId]);

  // ── Initial load: Supabase → localStorage fallback ───────────────────────
  useEffect(() => {
    (async () => {
      // Habits
      const { data: hData } = await supabase.from("habits").select("*").eq("user_id", userId).order("created_at");
      if (hData && hData.length > 0) {
        const h = hData.map(r => ({ id: r.id, name: r.name, category: r.category }));
        setHabits(h); lsSet(`ht-habits-${userId}`, h);
      } else {
        const cached = lsGet(`ht-habits-${userId}`);
        const h = cached?.length > 0 ? cached : defaultHabits();
        setHabits(h);
        if (!cached || cached.length === 0) {
          // Seed defaults into Supabase
          await supabase.from("habits").insert(h.map((x, i) => ({ id: x.id, user_id: userId, name: x.name, category: x.category, position: i })));
        }
      }

      // Settings
      const { data: sData } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
      if (sData) {
        const t = THEMES.find(x => x.id === sData.theme_id);
        if (t) setTheme(t);
        if (sData.font_id) setFontId(sData.font_id);
        if (sData.custom_font_name) setCustomFontName(sData.custom_font_name);
        if (sData.user_cats && sData.user_cats.length > 0) setUserCats(sData.user_cats);
else setUserCats([...DEFAULT_CATS]);
        lsSet(`ht-settings-${userId}`, sData);
      } else {
        const cached = lsGet(`ht-settings-${userId}`);
        if (cached) {
          const t = THEMES.find(x => x.id === cached.theme_id);
          if (t) setTheme(t);
          if (cached.font_id) setFontId(cached.font_id);
          if (cached.custom_font_name) setCustomFontName(cached.custom_font_name);
          if (cached.user_cats) setUserCats(cached.user_cats);
        }
      }
      setReady(true);
    })();
  }, [userId]);

  // ── Load records & memos when month changes ───────────────────────────────
  useEffect(() => {
    if (!ready) return;
    (async () => {
      // Records
      const { data: rData } = await supabase.from("monthly_records").select("data").eq("user_id", userId).eq("year", yr).eq("month", mo).maybeSingle();
      if (rData) { setRec(rData.data); lsSet(`ht-rec-${userId}-${yr}-${mo}`, rData.data); }
      else { setRec(lsGet(`ht-rec-${userId}-${yr}-${mo}`) || {}); }

      // Memos
      const { data: mData } = await supabase.from("monthly_memos").select("data").eq("user_id", userId).eq("year", yr).eq("month", mo).maybeSingle();
      if (mData) { setMemos(mData.data); lsSet(`ht-memos-${userId}-${yr}-${mo}`, mData.data); }
      else { setMemos(lsGet(`ht-memos-${userId}-${yr}-${mo}`) || {}); }
    })();
  }, [yr, mo, ready, userId]);

  // ── Save helpers (localStorage 즉시 + Supabase 비동기) ────────────────────
  const saveRec = useCallback(async (r) => {
    lsSet(`ht-rec-${userId}-${yr}-${mo}`, r);
    await supabase.from("monthly_records").upsert({ user_id: userId, year: yr, month: mo, data: r }, { onConflict: "user_id,year,month" });
  }, [userId, yr, mo]);

  const saveMemos = useCallback(async (m) => {
    lsSet(`ht-memos-${userId}-${yr}-${mo}`, m);
    await supabase.from("monthly_memos").upsert({ user_id: userId, year: yr, month: mo, data: m }, { onConflict: "user_id,year,month" });
  }, [userId, yr, mo]);

  const saveSettings = useCallback(async (tid, fid, cfn, cats) => {
    const payload = { user_id: userId, theme_id: tid, font_id: fid, custom_font_name: cfn, user_cats: cats };
    lsSet(`ht-settings-${userId}`, payload);
    await supabase.from("user_settings").upsert(payload, { onConflict: "user_id" });
  }, [userId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggle = (hid, di) => {
    setRec(prev => {
      const next = { ...prev, [hid]: [...(prev[hid] || new Array(31).fill(false))] };
      next[hid][di] = !next[hid][di];
      saveRec(next);
      return next;
    });
  };

  const handleMemoChange = (val) => {
    setMemos(prev => {
      const next = { ...prev, [selDay]: val };
      saveMemos(next);
      return next;
    });
  };

  const addHabit = async () => {
    if (!newName.trim()) return;
    const h = { id: uid(), name: newName.trim(), category: newCat };
    const next = [...habits, h];
    setHabits(next); lsSet(`ht-habits-${userId}`, next); setNewName("");
    await supabase.from("habits").insert({ id: h.id, user_id: userId, name: h.name, category: h.category, position: next.length - 1 });
  };

  const removeHabit = async (id) => {
    const next = habits.filter(x => x.id !== id);
    setHabits(next); lsSet(`ht-habits-${userId}`, next);
    await supabase.from("habits").delete().eq("id", id).eq("user_id", userId);
  };

  const addUserCat = async () => {
    if (!newCatLabel.trim()) return;
    const cat = { id: uid(), label: newCatLabel.trim(), color: newCatColor, fixed: false };
    const next = [...userCats, cat];
    setUserCats(next); setNewCatLabel(""); setShowCatForm(false);
    await saveSettings(theme.id, fontId, customFontName, next);
  };

  const removeUserCat = async (id) => {
    const next = userCats.filter(c => c.id !== id);
    setUserCats(next);
    await saveSettings(theme.id, fontId, customFontName, next);
  };

  const pickTheme = async (t) => { setTheme(t); await saveSettings(t.id, fontId, customFontName, userCats); };
  const pickFont  = async (fid) => { setFontId(fid); await saveSettings(theme.id, fid, customFontName, userCats); };

  const handleFontUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const style = document.createElement("style");
    style.textContent = `@font-face { font-family: 'UploadedFont'; src: url('${url}'); }`;
    document.head.appendChild(style);
    const name = file.name.replace(/\.[^.]+$/, "");
    setCustomFontName(name); setFontId("custom");
    await saveSettings(theme.id, "custom", name, userCats);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const prevDay = () => { if (selDay > 0) setSelDay(d => d-1); else { const nm=mo===0?11:mo-1,ny=mo===0?yr-1:yr; setYr(ny);setMo(nm);setSelDay(dim(ny,nm)-1); } };
  const nextDay = () => { const max=dim(yr,mo)-1; if (selDay<max) setSelDay(d=>d+1); else { const nm=mo===11?0:mo+1,ny=mo===11?yr+1:yr; setYr(ny);setMo(nm);setSelDay(0); } };
  const prevMo  = () => { if (mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); };
  const nextMo  = () => { if (mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); };
  const goToday = () => { setYr(today.getFullYear());setMo(today.getMonth());setSelDay(today.getDate()-1); };

  const days = Array.from({ length: dim(yr, mo) }, (_, i) => i);
  const catColor = (id) => allCats.find(c => c.id === id)?.color || "#8C9AB5";
  const catLabel = (id) => allCats.find(c => c.id === id)?.label || "기타";
  const ff = FONTS.find(f => f.id === fontId) || FONTS[0];
  const fontFamily = ff.id === "custom" ? "'UploadedFont', system-ui, sans-serif" : ff.family;
  const fs = { fontFamily };

  const dailyData = days.map(d => ({
    day: d + 1,
    pct: habits.length > 0 ? Math.round(habits.filter(h => (rec[h.id]||[])[d]).length / habits.length * 100) : 0,
  }));

  const sectionCard = { background: "#F8F8FC", borderRadius: 16, padding: "16px", marginBottom: 12 };
  const inputStyle  = { padding: "10px 14px", border: `1.5px solid ${theme.m}`, borderRadius: 10, fontSize: 13, background: "#fff", fontFamily, outline: "none", width: "100%", boxSizing: "border-box", color: "#1A1A2E" };

  if (!ready) return (
    <div style={{ height: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFF", fontFamily: "system-ui", color: "#8B72E0", fontSize: 14 }}>불러오는 중...</div>
  );

  return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#FFFFFF", ...fs, color: "#1A1A2E", fontSize: 14 }}>

      {/* ── Scrollable content ─── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* ════ TRACKER ════════════════════════════════════════════════════ */}
        {tab === "tracker" && (
          <div style={{ padding: "24px 20px 16px" }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: theme.p, margin: "0 0 18px", lineHeight: 1.3, ...fs }}>{greeting}</h1>

            {/* 이번 달 완료율 */}
            {(() => {
              const total = habits.length * days.length;
              const done  = habits.reduce((s,h) => s + (rec[h.id]||[]).slice(0,days.length).filter(Boolean).length, 0);
              const pct   = total > 0 ? Math.round(done/total*100) : 0;
              const best  = [...habits].sort((a,b) => {
                const pa = Math.round((rec[a.id]||[]).slice(0,days.length).filter(Boolean).length/days.length*100);
                const pb = Math.round((rec[b.id]||[]).slice(0,days.length).filter(Boolean).length/days.length*100);
                return pb - pa;
              })[0];
              return (
                <>
                  <div style={{ background: theme.card, borderRadius: 16, padding: "14px 18px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: theme.d, opacity: 0.7, marginBottom: 3, ...fs }}>이번 달 완료율</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: theme.p, marginBottom: 3, ...fs }}>{pct} %</div>
                    <div style={{ fontSize: 11, color: theme.d, opacity: 0.6, ...fs }}>{done} / {total}개 완료</div>
                  </div>
                  <div style={{ background: theme.card, borderRadius: 16, padding: "14px 18px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: theme.d, opacity: 0.7, marginBottom: 3, ...fs }}>베스트 습관</div>
                    <div style={{ fontSize: 19, fontWeight: 600, color: "#1A1A2E", marginBottom: 3, ...fs }}>{best?.name || "[아직 없어요]"}</div>
                    <div style={{ fontSize: 11, color: theme.d, opacity: 0.6, ...fs }}>{best ? `${Math.round((rec[best.id]||[]).slice(0,days.length).filter(Boolean).length/days.length*100)}% 달성` : "습관을 추가해보세요"}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12, color: theme.p, marginBottom: 14, ...fs }}>등록된 습관 {habits.length} 개</div>
                </>
              );
            })()}

            {/* 일별 차트 */}
            <div style={{ ...sectionCard, padding: "14px 8px 10px" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#555", marginLeft: 10, marginBottom: 4, ...fs }}>일별 완료율</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily, fill: "#888" }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tick={{ fontSize: 10, fontFamily, fill: "#888" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => [`${v}%`,"완료율"]} labelFormatter={l => `${l}일`} contentStyle={{ fontSize: 11, fontFamily, borderRadius: 10, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }} />
                  <Line type="monotone" dataKey="pct" stroke={theme.p} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 날짜 선택 + 체크리스트 */}
            {(() => {
              const isToday = yr===today.getFullYear() && mo===today.getMonth() && selDay===today.getDate()-1;
              const todayDone = habits.filter(h => !!(rec[h.id]||[])[selDay]).length;
              const todayPct  = habits.length > 0 ? Math.round(todayDone/habits.length*100) : 0;
              const firstDay  = wd(yr, mo, 1);
              const totalD    = dim(yr, mo);
              const cells     = [...Array(firstDay).fill(null), ...Array.from({length:totalD},(_,i)=>i+1)];
              while (cells.length % 7 !== 0) cells.push(null);
              return (
                <div style={{ marginBottom: 12 }}>
                  {/* Date nav */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showCal ? 0 : 10 }}>
                    <button onClick={prevDay} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: theme.p, padding: "4px 10px" }}>‹</button>
                    <div style={{ textAlign: "center" }}>
                      <div onClick={() => setShowCal(o=>!o)} style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E", cursor: "pointer", padding: "4px 14px", borderRadius: 20, background: showCal ? theme.card : "transparent", border: `1.5px solid ${showCal ? theme.m : "transparent"}`, ...fs }}>
                        {yr}년 {MONTHS[mo]} {selDay+1}일 ({WDAYS[wd(yr,mo,selDay+1)]}) {showCal ? "▲" : "▼"}
                      </div>
                      {!isToday && !showCal && (
                        <button onClick={goToday} style={{ marginTop: 3, fontSize: 11, color: theme.p, background: theme.card, border: "none", borderRadius: 20, padding: "2px 10px", cursor: "pointer", fontFamily }}>오늘로 돌아가기</button>
                      )}
                    </div>
                    <button onClick={nextDay} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: theme.p, padding: "4px 10px" }}>›</button>
                  </div>

                  {/* 인라인 달력 */}
                  {showCal && (
                    <div style={{ background: "#FAFAFA", borderRadius: 14, padding: "12px", margin: "8px 0 12px", border: `1px solid ${theme.m}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <button onClick={prevMo} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.p, padding: "2px 8px" }}>‹</button>
                        <span style={{ fontSize: 13, fontWeight: 500, ...fs }}>{yr}년 {MONTHS[mo]}</span>
                        <button onClick={nextMo} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: theme.p, padding: "2px 8px" }}>›</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                        {WDAYS.map((d,i) => (
                          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 500, color: i===0?"#E05555":i===6?"#4A7CC5":"#AAA", padding: "2px 0", ...fs }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                        {cells.map((d, i) => {
                          if (!d) return <div key={i} />;
                          const col = i % 7;
                          const isSel = d === selDay+1;
                          const isTdCell = yr===today.getFullYear()&&mo===today.getMonth()&&d===today.getDate();
                          return (
                            <div key={i} onClick={() => { setSelDay(d-1); setShowCal(false); }} style={{ textAlign: "center", fontSize: 12, padding: "6px 2px", borderRadius: 8, cursor: "pointer", fontWeight: isSel||isTdCell?600:400, background: isSel?theme.p:isTdCell?theme.card:"transparent", color: isSel?"#FFF":col===0?"#E05555":col===6?"#4A7CC5":"#1A1A2E", ...fs }}>{d}</div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#AAA", ...fs }}>{todayDone} / {habits.length}개 완료</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: todayPct===100?"#2CB87A":theme.p, lineHeight: 1, ...fs }}>{todayPct}%</div>
                  </div>
                  <div style={{ background: "#EDEDF5", borderRadius: 6, height: 6, marginBottom: 14, overflow: "hidden" }}>
                    <div style={{ background: todayPct===100?"#2CB87A":theme.p, width: `${todayPct}%`, height: "100%", borderRadius: 6, transition: "width 0.4s ease" }} />
                  </div>

                  {/* Checklist */}
                  {habits.length === 0 ? (
                    <div style={{ ...sectionCard, textAlign: "center", color: "#AAA", fontSize: 12, ...fs }}>습관 관리 탭에서 습관을 추가해보세요</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {habits.map(h => {
                        const checked = !!(rec[h.id]||[])[selDay];
                        const cc = catColor(h.category);
                        return (
                          <div key={h.id} onClick={() => toggle(h.id, selDay)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: checked?theme.card:"#F8F8FC", borderRadius: 14, border: checked?`1.5px solid ${theme.m}`:"1.5px solid transparent", cursor: "pointer", transition: "all 0.18s" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: checked?cc:"transparent", border: `2px solid ${checked?cc:"#D0D0E0"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}>
                              {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: checked?theme.d:"#1A1A2E", textDecoration: checked?"line-through":"none", opacity: checked?0.6:1, ...fs }}>{h.name}</div>
                              <div style={{ fontSize: 10, color: cc, marginTop: 2, ...fs }}>{catLabel(h.category)}</div>
                            </div>
                            {checked && <div style={{ fontSize: 10, color: cc, fontWeight: 500, background: "#FFFFFF", padding: "3px 8px", borderRadius: 20, flexShrink: 0, ...fs }}>완료 ✓</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {habits.length > 0 && todayPct === 100 && (
                    <div style={{ textAlign: "center", padding: "14px", marginTop: 8, background: theme.card, borderRadius: 14, fontSize: 13, color: theme.d, ...fs }}>
                      🎉 {isToday?"오늘":"이 날"} 모든 습관을 완료했어요!
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 한 줄 메모 */}
            <div style={{ background: theme.s, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: theme.d, marginBottom: 8, ...fs }}>오늘의 한 줄 메모</div>
              <input value={memos[selDay]||""} onChange={e => handleMemoChange(e.target.value)} placeholder="오늘 하루는 어땠나요?" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "none", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.65)", fontFamily, outline: "none", color: "#1A1A2E" }} />
            </div>
          </div>
        )}

        {/* ════ 습관 관리 ══════════════════════════════════════════════════ */}
        {tab === "manage" && (
          <div style={{ padding: "24px 20px 16px" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.p, margin: "0 0 18px", ...fs }}>습관 관리</h1>

            <div style={{ ...sectionCard }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 10, ...fs }}>새 습관 추가</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()} placeholder="습관 이름 입력" style={inputStyle} />
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={newCat} onChange={e=>setNewCat(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    {allCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <button onClick={addHabit} style={{ padding: "10px 20px", background: theme.p, color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily, flexShrink: 0 }}>추가</button>
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 10, ...fs }}>등록된 습관 ({habits.length}개)</div>
              {habits.length === 0 ? <div style={{ fontSize: 12, color: "#AAA", ...fs }}>아직 없어요!</div> : habits.map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "0.5px solid #EDEDF5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 18, background: catColor(h.category), borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "#1A1A2E", ...fs }}>{h.name}</div>
                      <div style={{ fontSize: 10, color: theme.p, marginTop: 1, ...fs }}>{catLabel(h.category)}</div>
                    </div>
                  </div>
                  <button onClick={() => removeHabit(h.id)} style={{ background: "none", border: "none", color: "#CCC", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>×</button>
                </div>
              ))}
            </div>

            {/* 카테고리 관리 */}
            <div style={sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#555", ...fs }}>카테고리 관리</div>
                <button onClick={() => setShowCatForm(o=>!o)} style={{ padding: "4px 12px", background: showCatForm?"#EDEDF5":theme.card, border: `1px solid ${theme.m}`, borderRadius: 20, fontSize: 11, color: theme.p, cursor: "pointer", fontFamily }}>
                  {showCatForm ? "닫기" : "+ 카테고리 추가"}
                </button>
              </div>
              {showCatForm && (
                <div style={{ background: "#FFFFFF", borderRadius: 10, padding: "12px", marginBottom: 10, border: `1px dashed ${theme.m}` }}>
                  <input value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addUserCat()} placeholder="카테고리 이름" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {CAT_COLOR_OPTIONS.map(c => (
                      <div key={c} onClick={() => setNewCatColor(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", outline: newCatColor===c?`3px solid ${c}`:"3px solid transparent", outlineOffset: 2, transform: newCatColor===c?"scale(1.15)":"scale(1)", transition: "all 0.12s" }} />
                    ))}
                  </div>
                  <button onClick={addUserCat} style={{ width: "100%", padding: "9px", background: theme.p, color: "white", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily }}>추가</button>
                </div>
              )}
              {allCats.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "0.5px solid #F0F0F8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
                    <span style={{ fontSize: 12, color: "#1A1A2E", ...fs }}>{c.label}</span>
                  </div>
                <button onClick={() => removeUserCat(c.id)} style={{ background: "none", border: "none", color: "#CCC", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* ════ 설정 ═══════════════════════════════════════════════════════ */}
        {tab === "settings" && (
          <div style={{ padding: "24px 20px 16px" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: theme.p, margin: "0 0 18px", ...fs }}>설정</h1>

            <div style={sectionCard}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 12, ...fs }}>테마 컬러</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {THEMES.map(t => (
                  <div key={t.id} onClick={() => pickTheme(t)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: t.p, outline: theme.id===t.id?`3px solid ${t.p}`:"3px solid transparent", outlineOffset: 2, transform: theme.id===t.id?"scale(1.15)":"scale(1)", transition: "all 0.15s" }} />
                    <span style={{ fontSize: 10, color: "#888", ...fs }}>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 12, ...fs }}>폰트</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {FONTS.filter(f => !(f.id==="custom"&&!customFontName)).map(f => (
                  <div key={f.id} onClick={() => pickFont(f.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: fontId===f.id?theme.card:"#FFFFFF", border: fontId===f.id?`1.5px solid ${theme.m}`:"1.5px solid #EDEDF5", borderRadius: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 13, fontFamily: f.id==="system"?"system-ui":f.id==="custom"?"'UploadedFont', system-ui":f.family, color: fontId===f.id?theme.p:"#1A1A2E", fontWeight: fontId===f.id?500:400 }}>
                      {f.id==="custom"?customFontName:f.name}
                    </span>
                    {fontId===f.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.p }} />}
                  </div>
                ))}
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFFFFF", border: "1.5px dashed #D8D8E8", borderRadius: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 13, color: "#AAA", ...fs }}>+ 폰트 파일 업로드</span>
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} style={{ display: "none" }} />
                </label>
                <div style={{ fontSize: 11, color: "#AAA", lineHeight: 1.6, ...fs }}>조선굴림체, 오뮤다예쁨체 등 다운로드한 폰트는 업로드로 사용할 수 있어요</div>
              </div>
            </div>

            {/* 계정 */}
            <div style={sectionCard}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#555", marginBottom: 10, ...fs }}>계정</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12, ...fs }}>{user.email}</div>
              <button onClick={handleLogout} style={{ width: "100%", padding: "11px", background: "none", border: "1.5px solid #EDEDF5", borderRadius: 10, fontSize: 13, color: "#E05555", cursor: "pointer", fontFamily }}>로그아웃</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: "8px 16px 16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "0.5px solid #EDEDF5" }}>
        <div style={{ display: "flex", background: "#F2F2F8", borderRadius: 100, padding: 5, gap: 4 }}>
          {[["tracker","트래커"],["manage","습관 관리"],["settings","설정"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "10px 4px", borderRadius: 100, background: tab===id?`rgba(${hexToRgb(theme.p)},0.13)`:"transparent", border: tab===id?`1px solid rgba(${hexToRgb(theme.p)},0.22)`:"1px solid transparent", cursor: "pointer", fontSize: 13, fontFamily, color: tab===id?theme.p:"#999", fontWeight: tab===id?600:400, transition: "all 0.18s" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP — auth gate
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ height: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFF", fontFamily: "system-ui", color: "#8B72E0", fontSize: 14 }}>불러오는 중...</div>
  );

  return user ? <HabitTracker user={user} /> : <AuthScreen />;
}
