import React from "react";
import { useState, useEffect, useRef } from "react";

// ─── Supabase config ──────────────────────────────────────────────────────────
const SUPA_URL = "https://tawgfibmeymxjgwkgnsc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhd2dmaWJtZXlteGpnd2tnbnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzIzODcsImV4cCI6MjA5NTMwODM4N30.iWVX276PbFNt8rC2ZGO58Kc8nOuEjVcahhMh7vzZk3Q";

// Admin emails — agrega los emails de quienes son admins
const ADMIN_EMAILS = ["arodriguezr@axtel.com.mx"];

async function supa(path, opts = {}) {
  const { method = "GET", body, token, params } = opts;
  let url = `${SUPA_URL}/rest/v1/${path}`;
  if (params) url += "?" + new URLSearchParams(params).toString();
  const headers = {
    "apikey": SUPA_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function authRequest(path, body) {
  const res = await fetch(`${SUPA_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error || data.error_description) throw new Error(data.error_description || data.error?.message || "Error de autenticación");
  return data;
}

// ─── Datos México ─────────────────────────────────────────────────────────────
const MEXICO = {
  "Aguascalientes": ["Aguascalientes", "Jesús María", "San Francisco de los Romo"],
  "Baja California": ["Tijuana", "Mexicali", "Ensenada", "Rosarito", "Tecate"],
  "Baja California Sur": ["La Paz", "Los Cabos", "Loreto", "Comondú"],
  "Campeche": ["Campeche", "Ciudad del Carmen", "Champotón"],
  "Chiapas": ["Tuxtla Gutiérrez", "San Cristóbal de las Casas", "Tapachula", "Comitán", "Palenque"],
  "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Delicias", "Cuauhtémoc", "Parral"],
  "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa", "Cuauhtémoc", "Gustavo A. Madero", "Iztapalapa", "Miguel Hidalgo", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
  "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña"],
  "Colima": ["Colima", "Manzanillo", "Tecomán"],
  "Durango": ["Durango", "Gómez Palacio", "Lerdo"],
  "Estado de México": ["Toluca", "Ecatepec", "Naucalpan", "Tlalnepantla", "Nezahualcóyotl", "Texcoco", "Metepec", "Atizapán"],
  "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Guanajuato", "San Miguel de Allende"],
  "Guerrero": ["Acapulco", "Chilpancingo", "Zihuatanejo", "Taxco", "Iguala"],
  "Hidalgo": ["Pachuca", "Tulancingo", "Tula", "Actopan"],
  "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta"],
  "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas"],
  "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco"],
  "Nayarit": ["Tepic", "Bahía de Banderas"],
  "Nuevo León": ["Monterrey", "Guadalupe", "San Nicolás", "Apodaca", "Santa Catarina", "San Pedro Garza García"],
  "Oaxaca": ["Oaxaca de Juárez", "Salina Cruz", "Juchitán", "Tuxtepec"],
  "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "Atlixco", "Cholula"],
  "Querétaro": ["Querétaro", "San Juan del Río", "Corregidora", "El Marqués"],
  "Quintana Roo": ["Cancún", "Playa del Carmen", "Chetumal", "Cozumel", "Tulum"],
  "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Matehuala", "Cd. Valles"],
  "Sinaloa": ["Culiacán", "Mazatlán", "Los Mochis", "Guasave"],
  "Sonora": ["Hermosillo", "Cd. Obregón", "Nogales", "San Luis Río Colorado", "Guaymas"],
  "Tabasco": ["Villahermosa", "Cárdenas", "Comalcalco"],
  "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Tampico", "Victoria"],
  "Tlaxcala": ["Tlaxcala", "Apizaco", "Huamantla"],
  "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica", "Minatitlán"],
  "Yucatán": ["Mérida", "Valladolid", "Progreso", "Umán"],
  "Zacatecas": ["Zacatecas", "Guadalupe", "Fresnillo", "Jerez"],
};
const ESTADOS = Object.keys(MEXICO).sort();

const CATEGORIAS = ["Medición eléctrica", "Análisis de señal", "Radiofrecuencia", "Temperatura", "Presión", "Flujo", "Vibración", "Óptico", "Otro"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDias(fechaISO) {
  const diff = new Date() - new Date(fechaISO);
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  return d === 0 ? `${h}h` : `${d}d ${h}h`;
}
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

// ─── Estilos base ─────────────────────────────────────────────────────────────
const C = {
  bg: "#07070f", card: "#0e0e1c", border: "#1c1c30",
  green: "#00e87a", greenDark: "#001f0e",
  orange: "#ff9500", orangeDark: "#1a0e00",
  red: "#ff3b3b", blue: "#4a9eff",
  text: "#eee", muted: "#666", subtle: "#333",
};

const inputSt = {
  width:"100%", padding:"13px 15px", boxSizing:"border-box",
  background:"#12121f", border:`1px solid ${C.border}`,
  borderRadius:"11px", color:C.text, fontSize:"14px",
  outline:"none", fontFamily:"inherit",
};

const btnPrimary = (disabled) => ({
  width:"100%", padding:"15px", border:"none", borderRadius:"13px",
  background: disabled ? C.subtle : `linear-gradient(135deg, ${C.green}, #00c066)`,
  color: disabled ? C.muted : "#001a0d",
  fontWeight:"800", fontSize:"15px", cursor: disabled ? "not-allowed" : "pointer",
  fontFamily:"inherit", transition:"all 0.2s",
});

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function Row({ label, value, last }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
      borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <span style={{ color:C.muted, fontSize:"12px" }}>{label}</span>
      <span style={{ color:"#ccc", fontSize:"13px", fontWeight:"600", textAlign:"right", maxWidth:"65%" }}>{value}</span>
    </div>
  );
}

function Badge({ registro }) {
  if (!registro) return <span style={{ background:`linear-gradient(135deg,${C.green},#00c066)`,
    color:"#001a0d", padding:"3px 12px", borderRadius:"20px", fontSize:"11px",
    fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.05em" }}>Disponible</span>;
  const dias = getDias(registro.fecha_retiro);
  const alerta = parseInt(dias) > 7;
  const esEnvio = registro.tipo === "paqueteria";
  return <span style={{
    background: esEnvio ? `linear-gradient(135deg,${C.blue},#2266cc)`
      : alerta ? `linear-gradient(135deg,${C.red},#cc0000)`
      : `linear-gradient(135deg,${C.orange},#cc7700)`,
    color:"#fff", padding:"3px 12px", borderRadius:"20px", fontSize:"11px",
    fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.04em" }}>
    {esEnvio ? `📦 En tránsito · ${dias}` : `En uso · ${dias}`}
  </span>;
}

function Toast({ msg, ok }) {
  return (
    <div style={{ position:"fixed", top:"18px", left:"50%", transform:"translateX(-50%)",
      background: ok ? C.greenDark : "#1a0000",
      border:`1px solid ${ok ? C.green : C.red}`,
      borderRadius:"40px", padding:"11px 22px",
      color: ok ? C.green : C.red, fontSize:"13px", fontWeight:"700",
      zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
      animation:"fadeIn 0.25s ease" }}>
      {msg}
    </div>
  );
}

function Spinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
    padding:"60px", color:C.muted, fontSize:"13px", gap:"10px" }}>
    <div style={{ width:"18px", height:"18px", border:`2px solid ${C.border}`,
      borderTop:`2px solid ${C.green}`, borderRadius:"50%",
      animation:"spin 0.7s linear infinite" }} />
    Cargando…
  </div>;
}

// ─── Selector Estado/Ciudad ───────────────────────────────────────────────────
function EstadoCiudadSelect({ estado, ciudad, onEstado, onCiudad, required }) {
  const ciudades = estado ? MEXICO[estado] || [] : [];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      <div>
        <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
          ESTADO {required && <span style={{ color:C.red }}>*</span>}
        </label>
        <select value={estado} onChange={e => { onEstado(e.target.value); onCiudad(""); }}
          style={{ ...inputSt, cursor:"pointer", color: estado ? C.text : C.muted }}>
          <option value="">Selecciona estado…</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {estado && (
        <div>
          <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
            CIUDAD / MUNICIPIO {required && <span style={{ color:C.red }}>*</span>}
          </label>
          <select value={ciudad} onChange={e => onCiudad(e.target.value)}
            style={{ ...inputSt, cursor:"pointer", color: ciudad ? C.text : C.muted }}>
            <option value="">Selecciona ciudad…</option>
            {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Cámara ───────────────────────────────────────────────────────────────────
function CamaraModal({ titulo, onCaptura, onCerrar }) {
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);
  const [live, setLive] = useState(false), [cap, setCap] = useState(null), [err, setErr] = useState(false);

  useEffect(() => { init(); return stop; }, []);

  async function init() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" }, audio:false });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); setLive(true); }
    } catch { setErr(true); }
  }
  function stop() { streamRef.current?.getTracks().forEach(t => t.stop()); }

  function capturar() {
    if (live && videoRef.current && canvasRef.current) {
      const cv = canvasRef.current, ctx = cv.getContext("2d");
      cv.width = videoRef.current.videoWidth; cv.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      setCap(cv.toDataURL("image/jpeg", 0.8)); stop();
    } else {
      const cv = document.createElement("canvas"); cv.width=400; cv.height=300;
      const ctx = cv.getContext("2d");
      ctx.fillStyle="#12121f"; ctx.fillRect(0,0,400,300);
      ctx.fillStyle=C.green; ctx.font="bold 15px monospace"; ctx.textAlign="center";
      ctx.fillText("📷 Evidencia simulada", 200, 130);
      ctx.fillStyle=C.muted; ctx.font="12px monospace";
      ctx.fillText(new Date().toLocaleString("es-MX"), 200, 165);
      setCap(cv.toDataURL("image/jpeg", 0.8));
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.95)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"20px",
        padding:"22px", width:"100%", maxWidth:"460px" }}>
        <h3 style={{ color:C.green, margin:"0 0 14px", fontSize:"12px",
          letterSpacing:"0.12em", textTransform:"uppercase" }}>📷 {titulo}</h3>
        {err && <p style={{ color:C.orange, fontSize:"12px", marginBottom:"10px",
          background:"#1a1200", padding:"8px 12px", borderRadius:"8px" }}>
          Cámara no disponible — modo simulado</p>}
        {!cap ? (
          <>
            <div style={{ background:"#000", borderRadius:"12px", overflow:"hidden",
              aspectRatio:"4/3", display:"flex", alignItems:"center", justifyContent:"center",
              marginBottom:"14px", position:"relative" }}>
              <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover" }} playsInline muted />
              {!live && <div style={{ position:"absolute", color:C.muted, textAlign:"center" }}>
                <div style={{ fontSize:"36px", marginBottom:"6px" }}>📷</div>
                <div style={{ fontSize:"12px" }}>Iniciando…</div>
              </div>}
            </div>
            <canvas ref={canvasRef} style={{ display:"none" }} />
            <button onClick={capturar} style={{ ...btnPrimary(false), marginBottom:"8px" }}>
              {live ? "📸 Capturar" : "📸 Simular captura"}
            </button>
          </>
        ) : (
          <>
            <img src={cap} alt="ev" style={{ width:"100%", borderRadius:"12px", marginBottom:"14px" }} />
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={() => { setCap(null); init(); }}
                style={{ flex:1, padding:"12px", background:"transparent",
                  border:`1px solid ${C.border}`, borderRadius:"11px", color:C.muted,
                  cursor:"pointer", fontFamily:"inherit" }}>🔄 Repetir</button>
              <button onClick={() => { onCaptura(cap); onCerrar(); }}
                style={{ flex:2, ...btnPrimary(false) }}>✅ Usar foto</button>
            </div>
          </>
        )}
        <button onClick={onCerrar} style={{ width:"100%", marginTop:"8px", padding:"9px",
          background:"transparent", border:"none", color:C.muted,
          cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState(""), [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false), [err, setErr] = useState("");

  async function login(e) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const data = await authRequest("token?grant_type=password", { email, password: pass });
      onLogin({ token: data.access_token, email: data.user.email, user: data.user });
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:"20px",
      fontFamily:"'Sora',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"380px" }}>
        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ width:"64px", height:"64px", margin:"0 auto 16px",
            background:`linear-gradient(135deg,${C.green},#00c066)`,
            borderRadius:"20px", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:"28px" }}>⚡</div>
          <h1 style={{ fontSize:"26px", fontWeight:"800", margin:"0 0 6px", color:C.text }}>EquipoTrack</h1>
          <p style={{ color:C.muted, fontSize:"13px", letterSpacing:"0.08em",
            fontFamily:"'JetBrains Mono',monospace" }}>CONTROL DE INSTRUMENTOS</p>
        </div>

        <form onSubmit={login} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em",
              display:"block", marginBottom:"6px" }}>CORREO ELECTRÓNICO</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ingeniero@empresa.com" style={inputSt} required />
          </div>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em",
              display:"block", marginBottom:"6px" }}>CONTRASEÑA</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••" style={inputSt} required />
          </div>
          {err && <p style={{ color:C.red, fontSize:"13px", background:"#1a0000",
            padding:"10px 14px", borderRadius:"9px", margin:0 }}>⚠️ {err}</p>}
          <button type="submit" disabled={loading} style={{ ...btnPrimary(loading), marginTop:"8px" }}>
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p style={{ textAlign:"center", color:C.muted, fontSize:"11px", marginTop:"24px" }}>
          ¿No tienes acceso? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}

// ─── ADMIN: Alta de equipo ────────────────────────────────────────────────────
function AdminPanel({ token, onClose, onEquipoCreado }) {
  const [nombre, setNombre]   = useState("");
  const [serie, setSerie]     = useState("");
  const [cat, setCat]         = useState("");
  const [estadoB, setEstadoB] = useState("");
  const [ciudadB, setCiudadB] = useState("");
  const [sitio, setSitio]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  async function crear() {
    if (!nombre || !serie || !cat || !estadoB || !ciudadB || !sitio) {
      setErr("Todos los campos son requeridos"); return;
    }
    setLoading(true); setErr("");
    try {
      // Generar ID secuencial simple
      const existentes = await supa("equipos", { token, params: { select:"id", order:"created_at.desc", limit:"1" } });
      let nextNum = 1;
      if (existentes && existentes.length > 0) {
        const lastId = existentes[0].id; // EQ-001
        const num = parseInt(lastId.replace("EQ-", "")) || 0;
        nextNum = num + 1;
      }
      const id = `EQ-${String(nextNum).padStart(3, "0")}`;
      await supa("equipos", { method:"POST", token, body: {
        id, nombre, serie, categoria: cat,
        estado_base: estadoB, ciudad_base: ciudadB, sitio_base: sitio, activo: true,
      }});
      onEquipoCreado();
      onClose();
    } catch (ex) { setErr(ex.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.88)",
      display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`,
        borderTopLeftRadius:"22px", borderTopRightRadius:"22px",
        padding:"26px 22px", width:"100%", maxWidth:"520px",
        maxHeight:"92vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"22px" }}>
          <div>
            <p style={{ color:C.blue, fontSize:"11px", letterSpacing:"0.15em",
              textTransform:"uppercase", margin:"0 0 4px" }}>PANEL ADMIN</p>
            <h2 style={{ color:C.text, margin:0, fontSize:"19px", fontWeight:"800" }}>Nuevo equipo</h2>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:C.muted, fontSize:"22px", cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
              NOMBRE DEL EQUIPO <span style={{ color:C.red }}>*</span>
            </label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Multímetro Fluke 87V" style={inputSt} />
          </div>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
              NÚMERO DE SERIE <span style={{ color:C.red }}>*</span>
            </label>
            <input value={serie} onChange={e => setSerie(e.target.value)}
              placeholder="Ej. FL87V-2024-001" style={inputSt} />
          </div>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
              CATEGORÍA <span style={{ color:C.red }}>*</span>
            </label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              style={{ ...inputSt, cursor:"pointer", color: cat ? C.text : C.muted }}>
              <option value="">Selecciona categoría…</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"14px" }}>
            <p style={{ color:C.blue, fontSize:"11px", letterSpacing:"0.1em",
              textTransform:"uppercase", marginBottom:"12px" }}>📍 UBICACIÓN BASE</p>
            <EstadoCiudadSelect estado={estadoB} ciudad={ciudadB}
              onEstado={setEstadoB} onCiudad={setCiudadB} required />
          </div>
          <div>
            <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
              SITIO / EDIFICIO BASE <span style={{ color:C.red }}>*</span>
            </label>
            <input value={sitio} onChange={e => setSitio(e.target.value)}
              placeholder="Ej. Puente de Vigas — Piso 3" style={inputSt} />
          </div>
        </div>

        {err && <p style={{ color:C.red, fontSize:"13px", background:"#1a0000",
          padding:"10px 14px", borderRadius:"9px", marginTop:"12px" }}>⚠️ {err}</p>}

        <button onClick={crear} disabled={loading}
          style={{ ...btnPrimary(loading), marginTop:"20px" }}>
          {loading ? "Creando…" : "✅ Crear equipo"}
        </button>
      </div>
    </div>
  );
}

// ─── Modal CHECK-OUT ──────────────────────────────────────────────────────────
function ModalCheckout({ equipo, token, onConfirmar, onCerrar }) {
  const [paso, setPaso]       = useState(1);
  const [ingeniero, setIng]   = useState("");
  const [estado, setEstado]   = useState("");
  const [ciudad, setCiudad]   = useState("");
  const [tipo, setTipo]       = useState("directo"); // directo | paqueteria
  const [guia, setGuia]       = useState("");
  const [foto, setFoto]       = useState(null);
  const [showCam, setShowCam] = useState(false);
  const [loading, setLoading] = useState(false);

  const paso1ok = ingeniero && estado && ciudad;
  const paso2ok = foto;

  async function confirmar() {
    setLoading(true);
    try {
      await supa("registros", { method:"POST", token, body: {
        equipo_id: equipo.id, ingeniero, estado, ciudad,
        tipo, guia_paqueteria: guia || null,
        foto_retiro: foto, fecha_retiro: new Date().toISOString(),
      }});
      onConfirmar();
    } catch (ex) { alert("Error: " + ex.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      {showCam && <CamaraModal titulo="Foto de RETIRO" onCaptura={img => { setFoto(img); setShowCam(false); }} onCerrar={() => setShowCam(false)} />}
      <div style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.85)",
        display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderTopLeftRadius:"22px", borderTopRightRadius:"22px",
          padding:"26px 22px", width:"100%", maxWidth:"520px",
          maxHeight:"92vh", overflowY:"auto" }}>

          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"18px" }}>
            <div>
              <p style={{ color:C.green, fontSize:"11px", letterSpacing:"0.15em",
                textTransform:"uppercase", margin:"0 0 3px" }}>CHECK-OUT · {equipo.id}</p>
              <h2 style={{ color:C.text, margin:0, fontSize:"17px", fontWeight:"800" }}>{equipo.nombre}</h2>
              <p style={{ color:C.muted, fontSize:"11px", marginTop:"2px" }}>
                Base: {equipo.sitio_base} — {equipo.ciudad_base}, {equipo.estado_base}
              </p>
            </div>
            <button onClick={onCerrar} style={{ background:"none", border:"none", color:C.muted, fontSize:"22px", cursor:"pointer" }}>✕</button>
          </div>

          {/* Barra pasos */}
          <div style={{ display:"flex", gap:"5px", marginBottom:"22px" }}>
            {[1,2,3].map(p => <div key={p} style={{ flex:1, height:"3px", borderRadius:"2px",
              background: p <= paso ? C.green : C.border, transition:"background 0.3s" }} />)}
          </div>

          {/* Paso 1 — Datos ingeniero */}
          {paso === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
              <div>
                <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
                  NOMBRE DEL INGENIERO <span style={{ color:C.red }}>*</span>
                </label>
                <input value={ingeniero} onChange={e => setIng(e.target.value)}
                  placeholder="Ej. Carlos Mendoza" style={inputSt} />
              </div>

              <EstadoCiudadSelect estado={estado} ciudad={ciudad}
                onEstado={setEstado} onCiudad={setCiudad} required />

              <div>
                <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"8px" }}>
                  TIPO DE TRASLADO
                </label>
                <div style={{ display:"flex", gap:"8px" }}>
                  {[{ k:"directo", label:"🤝 Retiro directo" }, { k:"paqueteria", label:"📦 Paquetería" }].map(t => (
                    <button key={t.k} onClick={() => setTipo(t.k)}
                      style={{ flex:1, padding:"11px", border:`1px solid ${tipo === t.k ? C.green : C.border}`,
                        borderRadius:"11px", background: tipo === t.k ? "#001a0d" : "transparent",
                        color: tipo === t.k ? C.green : C.muted, cursor:"pointer",
                        fontFamily:"inherit", fontSize:"13px", fontWeight:"600" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === "paqueteria" && (
                <div>
                  <label style={{ color:"#999", fontSize:"11px", letterSpacing:"0.08em", display:"block", marginBottom:"6px" }}>
                    NÚMERO DE GUÍA
                  </label>
                  <input value={guia} onChange={e => setGuia(e.target.value)}
                    placeholder="Ej. 1Z999AA10123456784" style={inputSt} />
                  <p style={{ color:C.muted, fontSize:"11px", marginTop:"5px" }}>
                    El check-in lo hará quien reciba el equipo en destino.
                  </p>
                </div>
              )}

              <button onClick={() => paso1ok && setPaso(2)} disabled={!paso1ok}
                style={btnPrimary(!paso1ok)}>Continuar →</button>
            </div>
          )}

          {/* Paso 2 — Foto obligatoria */}
          {paso === 2 && (
            <div>
              <p style={{ color:"#aaa", fontSize:"13px", marginBottom:"5px" }}>
                📸 <strong style={{ color:C.text }}>Foto obligatoria</strong> — estado del equipo al retirarlo.
              </p>
              <p style={{ color:C.muted, fontSize:"11px", marginBottom:"16px" }}>Esta imagen es evidencia del estado inicial.</p>
              {!foto ? (
                <button onClick={() => setShowCam(true)}
                  style={{ width:"100%", aspectRatio:"16/9", background:"#12121f",
                    border:`2px dashed ${C.border}`, borderRadius:"14px", color:C.muted,
                    cursor:"pointer", display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"16px" }}>
                  <span style={{ fontSize:"38px" }}>📷</span>
                  <span style={{ fontSize:"13px" }}>Toca para abrir cámara</span>
                  <span style={{ fontSize:"11px", color:C.red, fontWeight:"700" }}>REQUERIDA</span>
                </button>
              ) : (
                <div style={{ marginBottom:"16px", position:"relative" }}>
                  <img src={foto} alt="ev" style={{ width:"100%", borderRadius:"14px", display:"block" }} />
                  <button onClick={() => { setFoto(null); setShowCam(true); }}
                    style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(0,0,0,0.7)",
                      border:"none", borderRadius:"20px", color:"#fff",
                      padding:"5px 11px", fontSize:"11px", cursor:"pointer" }}>🔄 Repetir</button>
                </div>
              )}
              <button onClick={() => foto && setPaso(3)} disabled={!foto} style={btnPrimary(!foto)}>
                {foto ? "Continuar →" : "📷 Foto requerida"}
              </button>
            </div>
          )}

          {/* Paso 3 — Confirmación */}
          {paso === 3 && (
            <div>
              <p style={{ color:"#aaa", fontSize:"13px", marginBottom:"14px" }}>Confirma el retiro:</p>
              <div style={{ background:"#12121f", border:`1px solid ${C.border}`,
                borderRadius:"13px", padding:"14px", marginBottom:"14px" }}>
                <Row label="Ingeniero" value={ingeniero} />
                <Row label="Destino" value={`${ciudad}, ${estado}`} />
                <Row label="Tipo" value={tipo === "paqueteria" ? `📦 Paquetería${guia ? ` · ${guia}` : ""}` : "🤝 Retiro directo"} />
                <Row label="Equipo" value={equipo.nombre} />
                <Row label="Fecha" value={fmt(new Date().toISOString())} last />
              </div>
              <img src={foto} alt="ev" style={{ width:"100%", borderRadius:"13px", marginBottom:"16px", display:"block", opacity:0.9 }} />
              <button onClick={confirmar} disabled={loading} style={btnPrimary(loading)}>
                {loading ? "Guardando…" : "✅ Confirmar retiro"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Modal CHECK-IN ───────────────────────────────────────────────────────────
function ModalCheckin({ equipo, registro, token, onConfirmar, onCerrar }) {
  const [foto, setFoto]       = useState(null);
  const [showCam, setShowCam] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listo, setListo]     = useState(false);
  // Para paquetería: el receptor puede ser diferente ciudad
  const [estado, setEstado]   = useState(registro.estado || "");
  const [ciudad, setCiudad]   = useState(registro.ciudad || "");
  const esPaq = registro.tipo === "paqueteria";

  async function confirmar() {
    if (!foto) return;
    setLoading(true);
    try {
      // Guardar en historial
      await supa("historial", { method:"POST", token, body: {
        equipo_id: equipo.id, equipo_nombre: equipo.nombre,
        ingeniero: registro.ingeniero, estado, ciudad,
        fecha_retiro: registro.fecha_retiro, fecha_devolucion: new Date().toISOString(),
        foto_retiro: registro.foto_retiro, foto_devolucion: foto,
        dias: getDias(registro.fecha_retiro), tipo: registro.tipo,
        guia_paqueteria: registro.guia_paqueteria,
      }});
      // Borrar de registros activos
      await supa(`registros?equipo_id=eq.${equipo.id}`, { method:"DELETE", token });
      setListo(true);
      setTimeout(() => { onConfirmar(); onCerrar(); }, 2000);
    } catch (ex) { alert("Error: " + ex.message); }
    finally { setLoading(false); }
  }

  if (listo) return (
    <div style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.92)",
      display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"12px" }}>
      <div style={{ fontSize:"70px" }}>✅</div>
      <p style={{ color:C.green, fontSize:"20px", fontWeight:"800" }}>¡Equipo devuelto!</p>
      <p style={{ color:C.muted, fontSize:"13px" }}>Registro actualizado en Supabase</p>
    </div>
  );

  return (
    <>
      {showCam && <CamaraModal titulo="Foto de DEVOLUCIÓN"
        onCaptura={img => { setFoto(img); setShowCam(false); }} onCerrar={() => setShowCam(false)} />}
      <div style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.85)",
        display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`,
          borderTopLeftRadius:"22px", borderTopRightRadius:"22px",
          padding:"26px 22px", width:"100%", maxWidth:"520px",
          maxHeight:"92vh", overflowY:"auto" }}>

          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"18px" }}>
            <div>
              <p style={{ color:C.orange, fontSize:"11px", letterSpacing:"0.15em",
                textTransform:"uppercase", margin:"0 0 3px" }}>CHECK-IN · {equipo.id}</p>
              <h2 style={{ color:C.text, margin:0, fontSize:"17px", fontWeight:"800" }}>{equipo.nombre}</h2>
            </div>
            <button onClick={onCerrar} style={{ background:"none", border:"none", color:C.muted, fontSize:"22px", cursor:"pointer" }}>✕</button>
          </div>

          <div style={{ background:"#12121f", border:`1px solid ${C.border}`,
            borderRadius:"13px", padding:"14px", marginBottom:"18px" }}>
            <Row label="Ingeniero"    value={registro.ingeniero} />
            <Row label="Tiempo en uso" value={getDias(registro.fecha_retiro)} />
            {registro.tipo === "paqueteria" && registro.guia_paqueteria &&
              <Row label="Guía" value={registro.guia_paqueteria} />}
            <Row label="Retiro" value={fmt(registro.fecha_retiro)} last />
          </div>

          {/* Si es paquetería, confirmar ciudad de recepción */}
          {esPaq && (
            <div style={{ marginBottom:"16px" }}>
              <p style={{ color:C.blue, fontSize:"11px", letterSpacing:"0.1em",
                textTransform:"uppercase", marginBottom:"10px" }}>📍 Ciudad de recepción</p>
              <EstadoCiudadSelect estado={estado} ciudad={ciudad}
                onEstado={setEstado} onCiudad={setCiudad} required />
            </div>
          )}

          <p style={{ color:"#aaa", fontSize:"13px", marginBottom:"5px" }}>
            📸 <strong style={{ color:C.text }}>Foto obligatoria</strong> — estado al devolver.
          </p>
          <p style={{ color:C.muted, fontSize:"11px", marginBottom:"14px" }}>Evidencia del estado al regresarlo.</p>

          {!foto ? (
            <button onClick={() => setShowCam(true)}
              style={{ width:"100%", aspectRatio:"16/9", background:"#12121f",
                border:`2px dashed ${C.border}`, borderRadius:"14px", color:C.muted,
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"16px" }}>
              <span style={{ fontSize:"38px" }}>📷</span>
              <span style={{ fontSize:"13px" }}>Foto de devolución</span>
              <span style={{ fontSize:"11px", color:C.red, fontWeight:"700" }}>REQUERIDA</span>
            </button>
          ) : (
            <div style={{ marginBottom:"16px", position:"relative" }}>
              <img src={foto} alt="ev" style={{ width:"100%", borderRadius:"14px", display:"block" }} />
              <button onClick={() => { setFoto(null); setShowCam(true); }}
                style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(0,0,0,0.7)",
                  border:"none", borderRadius:"20px", color:"#fff",
                  padding:"5px 11px", fontSize:"11px", cursor:"pointer" }}>🔄 Repetir</button>
            </div>
          )}

          <button onClick={confirmar} disabled={!foto || loading || (esPaq && (!estado || !ciudad))}
            style={btnPrimary(!foto || loading || (esPaq && (!estado || !ciudad)))}>
            {loading ? "Guardando…" : foto ? "📦 Confirmar devolución" : "📷 Foto requerida"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Mapa ─────────────────────────────────────────────────────────────────────
const COORDS = {
  "Aguascalientes":[21.88,-102.28],"Baja California":[32.51,-117.04],"Baja California Sur":[24.14,-110.31],
  "Campeche":[19.84,-90.52],"Chiapas":[16.75,-93.11],"Chihuahua":[28.63,-106.07],
  "Ciudad de México":[19.43,-99.13],"Coahuila":[27.05,-101.53],"Colima":[19.24,-103.72],
  "Durango":[24.02,-104.66],"Estado de México":[19.29,-99.65],"Guanajuato":[21.12,-101.68],
  "Guerrero":[17.55,-99.5],"Hidalgo":[20.09,-98.76],"Jalisco":[20.66,-103.35],
  "Michoacán":[19.7,-101.18],"Morelos":[18.92,-99.23],"Nayarit":[21.75,-104.85],
  "Nuevo León":[25.69,-100.32],"Oaxaca":[17.07,-96.72],"Puebla":[19.04,-98.2],
  "Querétaro":[20.59,-100.39],"Quintana Roo":[21.16,-86.8],"San Luis Potosí":[22.15,-100.98],
  "Sinaloa":[24.8,-107.38],"Sonora":[29.07,-110.96],"Tabasco":[17.99,-92.93],
  "Tamaulipas":[23.74,-99.15],"Tlaxcala":[19.31,-98.24],"Veracruz":[19.17,-96.13],
  "Yucatán":[20.97,-89.62],"Zacatecas":[22.77,-102.58],
};

function MapaModal({ registros, equipos, onCerrar }) {
  const mapRef = useRef(null), mapInst = useRef(null);

  useEffect(() => {
    if (!document.getElementById("lf-css")) {
      const l = document.createElement("link");
      l.id="lf-css"; l.rel="stylesheet";
      l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
    function init() {
      if (mapInst.current || !mapRef.current) return;
      const L = window.L;
      mapInst.current = L.map(mapRef.current, { zoomControl:true }).setView([23.5,-102], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution:"© OpenStreetMap contributors", maxZoom:18 }).addTo(mapInst.current);

      // Agrupar por estado
      const porEstado = {};
      equipos.forEach(eq => {
        const reg = registros[eq.id]; if (!reg) return;
        const key = reg.estado;
        if (!porEstado[key]) porEstado[key] = [];
        porEstado[key].push({ eq, reg });
      });

      Object.entries(porEstado).forEach(([estado, items]) => {
        const coords = COORDS[estado]; if (!coords) return;
        const alerta = items.some(({ reg }) => parseInt(getDias(reg.fecha_retiro)) > 7);
        const icon = L.divIcon({ className:"",
          html:`<div style="background:${alerta?C.red:C.orange};color:${alerta?"#fff":"#1a0a00"};
            border-radius:50%;width:34px;height:34px;display:flex;align-items:center;
            justify-content:center;font-weight:800;font-size:13px;border:3px solid #fff;
            box-shadow:0 2px 12px rgba(0,0,0,0.4)">${items.length}</div>`,
          iconSize:[34,34], iconAnchor:[17,17] });
        const popup = items.map(({ eq, reg }) =>
          `<b>${eq.nombre}</b><br>👤 ${reg.ingeniero}<br>📍 ${reg.ciudad}<br>⏱ ${getDias(reg.fecha_retiro)}${reg.tipo==="paqueteria"?"<br>📦 En tránsito":""}`
        ).join("<hr style='margin:6px 0;border-color:#333'>");
        L.marker(coords, { icon }).addTo(mapInst.current)
          .bindPopup(`<div style="font-family:sans-serif;font-size:13px;min-width:190px">
            <b style="color:${C.orange}">📍 ${estado}</b><hr style="margin:6px 0;border-color:#ddd">${popup}</div>`);
      });
    }
    if (window.L) init();
    else {
      const s = document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      s.onload=init; document.head.appendChild(s);
    }
    return () => { mapInst.current?.remove(); mapInst.current=null; };
  }, []);

  const enUso = Object.keys(registros).length;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1500, background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"20px 20px 10px", display:"flex", justifyContent:"space-between",
        alignItems:"center", background:`linear-gradient(180deg,${C.card},transparent)` }}>
        <div>
          <h2 style={{ margin:0, fontSize:"17px", fontWeight:"800", color:C.text }}>🗺 Mapa de equipos</h2>
          <p style={{ color:C.muted, fontSize:"11px", margin:"2px 0 0", fontFamily:"'JetBrains Mono',monospace" }}>
            {enUso} en campo · OpenStreetMap (sin costo)
          </p>
        </div>
        <button onClick={onCerrar} style={{ background:"#12121f", border:`1px solid ${C.border}`,
          borderRadius:"11px", color:"#aaa", padding:"8px 15px",
          cursor:"pointer", fontSize:"13px", fontFamily:"inherit" }}>✕ Cerrar</button>
      </div>
      <div style={{ display:"flex", gap:"12px", padding:"0 20px 10px" }}>
        {[{c:C.orange,l:"En uso"},{c:C.red,l:"+7 días"},{c:C.blue,l:"En tránsito"}].map(x=>(
          <div key={x.l} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
            <div style={{ width:"12px", height:"12px", borderRadius:"50%", background:x.c }} />
            <span style={{ fontSize:"10px", color:C.muted }}>{x.l}</span>
          </div>
        ))}
      </div>
      <div ref={mapRef} style={{ flex:1 }} />
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]       = useState(null);
  const [equipos, setEquipos]       = useState([]);
  const [registrosArr, setRegArr]   = useState([]);
  const [historial, setHistorial]   = useState([]);
  const [loading, setLoading]       = useState(false);

  const [seleccionado, setSel]      = useState(null);
  const [modoModal, setModo]        = useState(null);
  const [showAdmin, setShowAdmin]   = useState(false);
  const [showMapa, setShowMapa]     = useState(false);
  const [vista, setVista]           = useState("equipos");
  const [filtroCiudad, setFiltro]   = useState("todas");
  const [busqueda, setBusq]         = useState("");
  const [toast, setToast]           = useState(null);

  const isAdmin = session && ADMIN_EMAILS.includes(session.email);

  // registros como map { equipo_id -> registro }
  const registros = {};
  registrosArr.forEach(r => { registros[r.equipo_id] = r; });

  function mostrarToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3200); }

  async function cargar(token) {
    setLoading(true);
    try {
      const [eqs, regs, hist] = await Promise.all([
        supa("equipos", { token, params:{ order:"created_at.asc", activo:"eq.true" } }),
        supa("registros", { token, params:{ order:"fecha_retiro.desc" } }),
        supa("historial", { token, params:{ order:"fecha_devolucion.desc", limit:"50" } }),
      ]);
      setEquipos(eqs || []); setRegArr(regs || []); setHistorial(hist || []);
    } catch (ex) { mostrarToast("Error cargando datos: "+ex.message, false); }
    finally { setLoading(false); }
  }

  function handleLogin(s) { setSession(s); cargar(s.token); }

  function cerrarModal() { setSel(null); setModo(null); }

  function abrirEquipo(equipo) {
    setSel(equipo);
    setModo(registros[equipo.id] ? "checkin" : "checkout");
  }

  function onAccion(msg) { mostrarToast(msg); cargar(session.token); cerrarModal(); }

  // Ciudades con equipos en uso
  const ciudadesEnUso = [...new Set(registrosArr.map(r => r.ciudad))].sort();

  const equiposFiltrados = equipos.filter(eq => {
    const matchB = eq.nombre.toLowerCase().includes(busqueda.toLowerCase()) || eq.id.toLowerCase().includes(busqueda.toLowerCase());
    const reg = registros[eq.id];
    const matchC = filtroCiudad === "todas" || (filtroCiudad === "disponibles" && !reg) || (reg && reg.ciudad === filtroCiudad);
    return matchB && matchC;
  });

  const enUso = registrosArr.length;
  const disponibles = equipos.length - enUso;

  if (!session) return <Login onLogin={handleLogin} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        input::placeholder{color:${C.muted}}
        select option{background:#12121f;color:#fff}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .eq-card{transition:transform 0.1s}
        .eq-card:active{transform:scale(0.985)}
      `}</style>

      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Sora',sans-serif",
        color:C.text, maxWidth:"600px", margin:"0 auto", paddingBottom:"100px" }}>

        {toast && <Toast {...toast} />}

        {/* ── Header ── */}
        <div style={{ padding:"34px 20px 0", background:`linear-gradient(180deg,${C.card} 60%,transparent)`,
          position:"sticky", top:0, zIndex:100, backdropFilter:"blur(20px)" }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"11px" }}>
              <div style={{ width:"40px", height:"40px", background:`linear-gradient(135deg,${C.green},#00c066)`,
                borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>⚡</div>
              <div>
                <h1 style={{ fontSize:"19px", fontWeight:"800", lineHeight:1 }}>EquipoTrack</h1>
                <p style={{ fontSize:"10px", color:C.muted, letterSpacing:"0.1em", fontFamily:"'JetBrains Mono',monospace" }}>
                  {session.email}
                  {isAdmin && <span style={{ color:C.blue, marginLeft:"6px" }}>· ADMIN</span>}
                </p>
              </div>
            </div>

            <div style={{ display:"flex", gap:"8px" }}>
              {/* Botón admin */}
              {isAdmin && (
                <button onClick={() => setShowAdmin(true)}
                  style={{ background:"#0a0a20", border:`1px solid ${C.blue}33`,
                    borderRadius:"12px", padding:"9px 14px", cursor:"pointer",
                    color:C.blue, fontFamily:"'Sora',sans-serif", fontSize:"12px", fontWeight:"700" }}>
                  ⚙️ Admin
                </button>
              )}
              {/* Botón mapa */}
              <button onClick={() => setShowMapa(true)}
                style={{ display:"flex", alignItems:"center", gap:"6px",
                  background: enUso > 0 ? "#12121f" : C.card,
                  border:`1px solid ${enUso > 0 ? C.border : C.subtle}`,
                  borderRadius:"12px", padding:"9px 14px", cursor:"pointer",
                  color: enUso > 0 ? C.text : C.muted,
                  fontFamily:"'Sora',sans-serif", fontSize:"12px", fontWeight:"700" }}>
                <span>🗺</span>
                {enUso > 0 && <span style={{ background:C.orange, color:"#1a0a00",
                  borderRadius:"10px", padding:"1px 7px", fontSize:"10px", fontWeight:"800" }}>{enUso}</span>}
              </button>
              {/* Logout */}
              <button onClick={() => setSession(null)}
                style={{ background:"transparent", border:`1px solid ${C.border}`,
                  borderRadius:"12px", padding:"9px 12px", cursor:"pointer",
                  color:C.muted, fontFamily:"'Sora',sans-serif", fontSize:"12px" }}>
                ↩
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:"9px", marginBottom:"14px" }}>
            {[{label:"Disponibles",val:disponibles,color:C.green},{label:"En uso",val:enUso,color:C.orange},{label:"Total",val:equipos.length,color:"#888"}].map(s=>(
              <div key={s.label} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`,
                borderRadius:"13px", padding:"11px", textAlign:"center" }}>
                <div style={{ fontSize:"22px", fontWeight:"800", color:s.color }}>{s.val}</div>
                <div style={{ fontSize:"9px", color:C.muted, letterSpacing:"0.08em",
                  textTransform:"uppercase", marginTop:"2px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Búsqueda */}
          {vista === "equipos" && (
            <input value={busqueda} onChange={e=>setBusq(e.target.value)}
              placeholder="Buscar equipo o código…"
              style={{ ...inputSt, marginBottom:"10px" }} />
          )}

          {/* Filtros */}
          {vista === "equipos" && (
            <div style={{ display:"flex", gap:"7px", overflowX:"auto", paddingBottom:"14px", scrollbarWidth:"none" }}>
              {[{key:"todas",label:"Todos"},{key:"disponibles",label:"Disponibles"},
                ...ciudadesEnUso.map(c=>({key:c,label:c}))].map(f=>(
                <button key={f.key} onClick={()=>setFiltro(f.key)}
                  style={{ flexShrink:0, padding:"6px 13px",
                    background: filtroCiudad===f.key ? C.green : C.card,
                    border:`1px solid ${filtroCiudad===f.key ? C.green : C.border}`,
                    borderRadius:"20px", cursor:"pointer", whiteSpace:"nowrap",
                    color: filtroCiudad===f.key ? "#001a0d" : C.muted,
                    fontWeight: filtroCiudad===f.key ? "700" : "500",
                    fontSize:"11px", fontFamily:"'Sora',sans-serif" }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"0 20px 18px" }}>
          {["equipos","historial"].map(v=>(
            <button key={v} onClick={()=>setVista(v)} style={{
              flex:1, padding:"10px", background: vista===v ? C.card : "transparent",
              border:"1px solid", borderColor: vista===v ? C.border : "transparent",
              borderRadius: v==="equipos" ? "10px 0 0 10px" : "0 10px 10px 0",
              color: vista===v ? C.green : C.muted, fontWeight:"700", fontSize:"12px",
              cursor:"pointer", letterSpacing:"0.05em", textTransform:"uppercase",
              fontFamily:"'Sora',sans-serif", transition:"all 0.2s" }}>
              {v==="equipos" ? "⚡ Equipos" : "📋 Historial"}
            </button>
          ))}
        </div>

        {/* Lista equipos */}
        {vista === "equipos" && (
          loading ? <Spinner /> :
          <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:"11px" }}>
            {equiposFiltrados.length === 0 && (
              <div style={{ textAlign:"center", padding:"50px 20px", color:C.muted }}>
                <div style={{ fontSize:"38px", marginBottom:"10px" }}>🔍</div>
                <p style={{ fontSize:"14px" }}>Sin resultados</p>
              </div>
            )}
            {equiposFiltrados.map((equipo, i) => {
              const reg = registros[equipo.id];
              const alerta = reg && parseInt(getDias(reg.fecha_retiro)) > 7;
              return (
                <div key={equipo.id} className="eq-card" onClick={()=>abrirEquipo(equipo)}
                  style={{ background:C.card,
                    border:`1px solid ${alerta?"#ff3b3b33":reg?"#ff950022":C.border}`,
                    borderRadius:"17px", padding:"17px", cursor:"pointer",
                    animation:`slideUp 0.3s ease ${i*0.04}s both`, position:"relative", overflow:"hidden" }}>
                  {alerta && <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px",
                    background:`linear-gradient(90deg,${C.red},${C.orange})` }} />}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:C.muted,
                          background:"#12121f", padding:"2px 7px", borderRadius:"5px" }}>{equipo.id}</span>
                        <Badge registro={reg} />
                      </div>
                      <h3 style={{ fontSize:"14px", fontWeight:"700", marginBottom:"3px", color:"#eee" }}>
                        {equipo.nombre}
                      </h3>
                      <p style={{ fontSize:"11px", color:C.muted }}>
                        {equipo.categoria} · Base: {equipo.sitio_base}, {equipo.ciudad_base}
                      </p>
                      {reg && (
                        <div style={{ marginTop:"11px", paddingTop:"11px", borderTop:`1px solid ${C.border}` }}>
                          <p style={{ fontSize:"13px", color:"#aaa" }}>
                            👤 <strong style={{ color:"#ddd" }}>{reg.ingeniero}</strong>
                          </p>
                          <p style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>
                            📍 {reg.ciudad}, {reg.estado} · desde {fmt(reg.fecha_retiro)}
                          </p>
                          {reg.tipo === "paqueteria" && <p style={{ fontSize:"11px", color:C.blue, marginTop:"3px" }}>
                            📦 En tránsito{reg.guia_paqueteria ? ` · ${reg.guia_paqueteria}` : ""}
                          </p>}
                          {alerta && <p style={{ fontSize:"11px", color:C.red, marginTop:"5px", fontWeight:"700" }}>
                            ⚠️ Más de 7 días — requiere atención
                          </p>}
                        </div>
                      )}
                    </div>
                    <div style={{ width:"42px", height:"42px", background: reg ? C.orangeDark : C.greenDark,
                      borderRadius:"11px", flexShrink:0, marginLeft:"11px",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>
                      {reg ? "📤" : "📥"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Historial */}
        {vista === "historial" && (
          loading ? <Spinner /> :
          <div style={{ padding:"0 20px" }}>
            {historial.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:C.muted }}>
                <div style={{ fontSize:"46px", marginBottom:"12px" }}>📋</div>
                <p style={{ fontSize:"14px" }}>Aún no hay devoluciones registradas</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"11px" }}>
                {historial.map((h, i) => (
                  <div key={h.id} style={{ background:C.card, border:`1px solid ${C.border}`,
                    borderRadius:"15px", overflow:"hidden", animation:`slideUp 0.3s ease ${i*0.04}s both` }}>
                    <div style={{ padding:"15px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"9px" }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"10px", color:C.muted,
                          background:"#12121f", padding:"2px 7px", borderRadius:"5px" }}>{h.equipo_id}</span>
                        <span style={{ fontSize:"10px", color:C.green, background:C.greenDark,
                          padding:"2px 9px", borderRadius:"20px", fontWeight:"700" }}>{h.dias} en uso</span>
                      </div>
                      <p style={{ fontWeight:"700", fontSize:"14px", marginBottom:"8px" }}>{h.equipo_nombre}</p>
                      <Row label="Ingeniero"   value={h.ingeniero} />
                      <Row label="Ciudad"      value={`${h.ciudad}, ${h.estado}`} />
                      {h.guia_paqueteria && <Row label="Guía" value={h.guia_paqueteria} />}
                      <Row label="Retiro"      value={fmt(h.fecha_retiro)} />
                      <Row label="Devolución"  value={fmt(h.fecha_devolucion)} last />
                    </div>
                    {(h.foto_retiro || h.foto_devolucion) && (
                      <div style={{ display:"flex", gap:"2px" }}>
                        {h.foto_retiro && <div style={{ flex:1, position:"relative" }}>
                          <img src={h.foto_retiro} alt="retiro"
                            style={{ width:"100%", height:"80px", objectFit:"cover", display:"block" }} />
                          <span style={{ position:"absolute", bottom:"5px", left:"5px",
                            background:"rgba(0,0,0,0.75)", fontSize:"9px", color:"#aaa",
                            padding:"2px 5px", borderRadius:"4px" }}>📤 Retiro</span>
                        </div>}
                        {h.foto_devolucion && <div style={{ flex:1, position:"relative" }}>
                          <img src={h.foto_devolucion} alt="dev"
                            style={{ width:"100%", height:"80px", objectFit:"cover", display:"block" }} />
                          <span style={{ position:"absolute", bottom:"5px", left:"5px",
                            background:"rgba(0,0,0,0.75)", fontSize:"9px", color:"#aaa",
                            padding:"2px 5px", borderRadius:"4px" }}>📦 Dev.</span>
                        </div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {showAdmin && <AdminPanel token={session.token}
        onClose={() => setShowAdmin(false)}
        onEquipoCreado={() => { cargar(session.token); mostrarToast("✅ Equipo creado en Supabase"); }} />}

      {modoModal === "checkout" && seleccionado && (
        <ModalCheckout equipo={seleccionado} token={session.token}
          onConfirmar={() => onAccion(`✅ ${seleccionado.nombre} asignado`)}
          onCerrar={cerrarModal} />
      )}
      {modoModal === "checkin" && seleccionado && (
        <ModalCheckin equipo={seleccionado} registro={registros[seleccionado.id]} token={session.token}
          onConfirmar={() => onAccion(`📦 ${seleccionado.nombre} devuelto`)}
          onCerrar={cerrarModal} />
      )}
      {showMapa && <MapaModal registros={registros} equipos={equipos} onCerrar={() => setShowMapa(false)} />}
    </>
  );
}

