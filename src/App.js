import React, { useState, useEffect, useRef, useCallback } from "react";
// QRCode via npm (instalar: npm install qrcode)
// Se importa dinámicamente para compatibilidad con React build

// - Supabase -
const SUPA_URL = "https://tawgfibmeymxjgwkgnsc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhd2dmaWJtZXlteGpnd2tnbnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzIzODcsImV4cCI6MjA5NTMwODM4N30.iWVX276PbFNt8rC2ZGO58Kc8nOuEjVcahhMh7vzZk3Q";

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

async function authReq(path, body) {
  const res = await fetch(`${SUPA_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Verificar primero el status HTTP
  if (!res.ok) {
    var msg = data.error_description
      || (data.error && typeof data.error === "string" ? data.error : null)
      || (data.error && data.error.message)
      || data.msg
      || data.message
      || "Error de autenticación";
    if(msg.indexOf("Invalid login credentials")!==-1||msg.indexOf("invalid_grant")!==-1){
      msg = "Correo o contraseña incorrectos. Verifica tus datos.";
    } else if(msg.indexOf("Email not confirmed")!==-1){
      msg = "Debes confirmar tu correo antes de entrar.";
    } else if(msg.indexOf("User not found")!==-1){
      msg = "No existe una cuenta con ese correo.";
    } else if(msg.indexOf("too many requests")!==-1||msg.indexOf("rate limit")!==-1){
      msg = "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
    } else if(msg.indexOf("captcha")!==-1||msg.indexOf("hcaptcha")!==-1){
      msg = "Verificacion de seguridad invalida. Intenta de nuevo.";
    }
    throw new Error(msg);
  }

  // Verificar también errores en el body aunque el status sea 200
  if (data.error || data.error_description) {
    var msg2 = data.error_description
      || (data.error && data.error.message)
      || data.error
      || "Error";
    if(msg2.indexOf("Invalid login credentials")!==-1){
      msg2 = "Correo o contraseña incorrectos. Verifica tus datos.";
    } else if(msg2.indexOf("Email not confirmed")!==-1){
      msg2 = "Debes confirmar tu correo antes de entrar.";
    }
    throw new Error(msg2);
  }

  // Verificar que la respuesta tenga access_token (login exitoso)
  if(path.indexOf("token")!==-1 && !data.access_token){
    throw new Error("No se pudo iniciar sesión. Verifica tus credenciales.");
  }

  return data;
}

// - México -
const MEXICO = {
  "Aguascalientes":["Aguascalientes","Jesús María","San Francisco de los Romo"],
  "Baja California":["Tijuana","Mexicali","Ensenada","Rosarito","Tecate"],
  "Baja California Sur":["La Paz","Los Cabos","Loreto","Comondú"],
  "Campeche":["Campeche","Ciudad del Carmen","Champotón"],
  "Chiapas":["Tuxtla Gutiérrez","San Cristóbal de las Casas","Tapachula","Comitán","Palenque"],
  "Chihuahua":["Chihuahua","Ciudad Juárez","Delicias","Cuauhtémoc","Parral"],
  "Ciudad de México":["Álvaro Obregón","Azcapotzalco","Benito Juárez","Coyoacán","Cuajimalpa","Cuauhtémoc","Gustavo A. Madero","Iztapalapa","Miguel Hidalgo","Tlalpan","Venustiano Carranza","Xochimilco"],
  "Coahuila":["Saltillo","Torreón","Monclova","Piedras Negras","Acuña"],
  "Colima":["Colima","Manzanillo","Tecomán"],
  "Durango":["Durango","Gómez Palacio","Lerdo"],
  "Estado de México":["Toluca","Ecatepec","Naucalpan","Tlalnepantla","Nezahualcóyotl","Texcoco","Metepec","Atizapán"],
  "Guanajuato":["León","Irapuato","Celaya","Salamanca","Guanajuato","San Miguel de Allende"],
  "Guerrero":["Acapulco","Chilpancingo","Zihuatanejo","Taxco","Iguala"],
  "Hidalgo":["Pachuca","Tulancingo","Tula","Actopan"],
  "Jalisco":["Guadalajara","Zapopan","Tlaquepaque","Tonalá","Puerto Vallarta"],
  "Michoacán":["Morelia","Uruapan","Zamora","Lázaro Cárdenas"],
  "Morelos":["Cuernavaca","Jiutepec","Cuautla","Temixco"],
  "Nayarit":["Tepic","Bahía de Banderas"],
  "Nuevo León":["Monterrey","Guadalupe","San Nicolás","Apodaca","Santa Catarina","San Pedro Garza García"],
  "Oaxaca":["Oaxaca de Juárez","Salina Cruz","Juchitán","Tuxtepec"],
  "Puebla":["Puebla","Tehuacán","San Martín Texmelucan","Atlixco","Cholula"],
  "Querétaro":["Querétaro","San Juan del Río","Corregidora","El Marqués"],
  "Quintana Roo":["Cancún","Playa del Carmen","Chetumal","Cozumel","Tulum"],
  "San Luis Potosí":["San Luis Potosí","Soledad de Graciano Sánchez","Matehuala","Cd. Valles"],
  "Sinaloa":["Culiacán","Mazatlán","Los Mochis","Guasave"],
  "Sonora":["Hermosillo","Cd. Obregón","Nogales","San Luis Río Colorado","Guaymas"],
  "Tabasco":["Villahermosa","Cárdenas","Comalcalco"],
  "Tamaulipas":["Reynosa","Matamoros","Nuevo Laredo","Tampico","Victoria"],
  "Tlaxcala":["Tlaxcala","Apizaco","Huamantla"],
  "Veracruz":["Veracruz","Xalapa","Coatzacoalcos","Córdoba","Poza Rica","Minatitlán"],
  "Yucatán":["Mérida","Valladolid","Progreso","Umán"],
  "Zacatecas":["Zacatecas","Guadalupe","Fresnillo","Jerez"],
};
const ESTADOS = Object.keys(MEXICO).sort();

const COORDS_ESTADO = {
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

// - Helpers -
// Obtener userId desde sesión de forma segura (el hook JWT puede alterar data.user)
function getUserId(session){
  if(!session) return null;
  if(session.user&&session.user.id&&session.user.id!=="null") return session.user.id;
  try{
    var parts=session.token.split(".");
    if(parts.length===3){
      var pl=JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
      return pl.sub||null;
    }
  }catch(e){}
  return null;
}
// Leer rol desde JWT app_metadata (no desde perfiles - evita recursión RLS)
// ─── SONIDOS ─────────────────────────────────────────
function playSound(tipo){
  try{
    var ctx=new (window.AudioContext||window.webkitAudioContext)();
    var g=ctx.createGain();
    g.connect(ctx.destination);
    function note(freq,start,dur,vol){
      var o=ctx.createOscillator();
      o.type="sine";
      o.frequency.value=freq;
      o.connect(g);
      g.gain.setValueAtTime(0,ctx.currentTime+start);
      g.gain.linearRampToValueAtTime(vol||0.18,ctx.currentTime+start+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur);
      o.start(ctx.currentTime+start);
      o.stop(ctx.currentTime+start+dur+0.05);
    }
    if(tipo==="checkout"){
      // Dos notas ascendentes — acción positiva
      note(523,0,0.15); note(659,0.16,0.2);
    } else if(tipo==="checkin"){
      // Dos notas descendentes — cierre de ciclo
      note(659,0,0.15); note(523,0.16,0.2);
    } else if(tipo==="guia"){
      // Pop suave — personalidad Lumi
      note(880,0,0.08,0.12); note(1046,0.09,0.12,0.1);
    } else if(tipo==="paqueteria"){
      // Campanita — evento especial
      note(1046,0,0.1,0.12); note(1318,0.11,0.15,0.1); note(1568,0.22,0.2,0.08);
    } else if(tipo==="error"){
      // Nota grave corta — feedback de error
      note(220,0,0.2,0.15);
    }
    setTimeout(function(){try{ctx.close();}catch{}},1000);
  }catch(e){}
}

function getRolFromSession(session){
  if(!session) return "ingeniero";
  try{
    var token=session.token;
    var parts=token.split(".");
    if(parts.length===3){
      var payload=JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
      if(payload.app_metadata&&payload.app_metadata.rol){
        return payload.app_metadata.rol;
      }
    }
  }catch(e){}
  return session.rol||"ingeniero";
}
function isAdminOrSuper(session){
  var rol=getRolFromSession(session);
  return rol==="admin"||rol==="super_admin";
}
function isGerente(session){
  return getRolFromSession(session)==="gerente";
}
function isSuperAdmin(session){
  return getRolFromSession(session)==="super_admin";
}
function getDias(iso) {
  const diff = new Date() - new Date(iso);
  const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000);
  return d===0?`${h}h`:`${d}d ${h}h`;
}
function getDiasNum(iso) {
  return Math.floor((new Date() - new Date(iso)) / 86400000);
}
function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-MX",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

// - Colores -
const C = {
  bg:"#07070f",card:"#0e0e1c",border:"#1c1c30",
  green:"#00e87a",greenDk:"#001f0e",
  orange:"#ff9500",orangeDk:"#1a0e00",
  red:"#ff3b3b",blue:"#4a9eff",blueDk:"#020d1a",
  text:"#eee",muted:"#666",subtle:"#252538",
};

const inp = {
  width:"100%",padding:"13px 15px",boxSizing:"border-box",
  background:"#12121f",border:`1px solid ${C.border}`,
  borderRadius:"11px",color:C.text,fontSize:"15px",
  outline:"none",fontFamily:"inherit",
};
const btnP = (dis)=>({
  width:"100%",padding:"15px",border:"none",borderRadius:"13px",
  background:dis?C.subtle:`linear-gradient(135deg,${C.green},#00c066)`,
  color:dis?C.muted:"#001a0d",fontWeight:"800",fontSize:"15px",
  cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s",
});

// - Pequeños -
function Row({label,value,last}){
  return <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
    borderBottom:last?"none":`1px solid ${C.border}`}}>
    <span style={{color:C.muted,fontSize:"12px"}}>{label}</span>
    <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600",textAlign:"right",maxWidth:"65%"}}>{value}</span>
  </div>;
}

function Badge({reg,enRep}){
  if(enRep) return <span style={{background:"linear-gradient(135deg,#ff9500,#cc7700)",
    color:"#fff",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",
    fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.04em"}}>🔧 No disponible</span>;
  if(!reg) return <span style={{background:`linear-gradient(135deg,${C.green},#00c066)`,
    color:"#001a0d",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",
    fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"}}>Disponible</span>;
  const dias=getDias(reg.fecha_retiro), alerta=getDiasNum(reg.fecha_retiro)>5;
  if(reg.tipo==="paqueteria") return <span style={{background:`linear-gradient(135deg,${C.blue},#2266cc)`,
    color:"#fff",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"700",
    textTransform:"uppercase",letterSpacing:"0.04em"}}>📦 Tránsito · {dias}</span>;
  return <span style={{background:alerta?`linear-gradient(135deg,${C.red},#cc0000)`:`linear-gradient(135deg,${C.orange},#cc7700)`,
    color:"#fff",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"700",
    textTransform:"uppercase",letterSpacing:"0.04em"}}>En uso · {dias}</span>;
}

function Toast({msg,ok}){
  return <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",
    background:ok?C.greenDk:"#1a0000",border:`1px solid ${ok?C.green:C.red}`,
    borderRadius:"40px",padding:"11px 22px",color:ok?C.green:C.red,
    fontSize:"13px",fontWeight:"700",zIndex:9999,whiteSpace:"nowrap",
    boxShadow:"0 8px 32px rgba(0,0,0,0.6)",animation:"fadeIn 0.25s ease"}}>{msg}</div>;
}

function Spin(){
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",
    padding:"50px",color:C.muted,fontSize:"13px",gap:"10px"}}>
    <div style={{width:"18px",height:"18px",border:`2px solid ${C.border}`,
      borderTop:`2px solid ${C.green}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
    Cargando…
  </div>;
}

// - Estado/Ciudad -
function EstadoCiudad({estado,ciudad,onEstado,onCiudad}){
  return <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
    <div>
      <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
        ESTADO <span style={{color:C.red}}>*</span>
      </label>
      <select value={estado} onChange={e=>{onEstado(e.target.value);onCiudad("");}}
        style={{...inp,cursor:"pointer",color:estado?C.text:C.muted}}>
        <option value="">Selecciona estado…</option>
        {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
      </select>
    </div>
    {estado&&<div>
      <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
        CIUDAD / MUNICIPIO <span style={{color:C.red}}>*</span>
      </label>
      <select value={ciudad} onChange={e=>onCiudad(e.target.value)}
        style={{...inp,cursor:"pointer",color:ciudad?C.text:C.muted}}>
        <option value="">Selecciona ciudad…</option>
        {(MEXICO[estado]||[]).map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </div>}
  </div>;
}

// - Cámara -
function CamaraModal({titulo,onCaptura,onCerrar}){
  const vRef=useRef(),cRef=useRef(),sRef=useRef();
  const [live,setLive]=useState(false),[cap,setCap]=useState(null),[err,setErr]=useState(false);
  useEffect(()=>{init();return stop;},[]);
  async function init(){
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});
      sRef.current=s;
      if(vRef.current){vRef.current.srcObject=s;vRef.current.play();setLive(true);}
    }catch{setErr(true);}
  }
  function stop(){sRef.current && sRef.current.getTracks().forEach(function(t){t.stop();});}
  function capturar(){
    if(live&&vRef.current&&cRef.current){
      const cv=cRef.current,ctx=cv.getContext("2d");
      // Limitar resolución máxima a 1280px para controlar tamaño
      const maxW=1280, ratio=vRef.current.videoWidth/vRef.current.videoHeight;
      cv.width=Math.min(vRef.current.videoWidth,maxW);
      cv.height=Math.round(cv.width/ratio);
      ctx.drawImage(vRef.current,0,0,cv.width,cv.height);
      const dataUrl=cv.toDataURL("image/jpeg",0.7);
      // Validar tamaño máximo 4MB en base64
      if(dataUrl.length > 4*1024*1024){
        alert("La imagen es demasiado grande. Intenta de nuevo.");
        return;
      }
      setCap(dataUrl);stop();
    }else{
      const cv=document.createElement("canvas");cv.width=400;cv.height=300;
      const ctx=cv.getContext("2d");
      ctx.fillStyle="#12121f";ctx.fillRect(0,0,400,300);
      ctx.fillStyle=C.green;ctx.font="bold 15px monospace";ctx.textAlign="center";
      ctx.fillText("📷 Evidencia simulada",200,130);
      ctx.fillStyle=C.muted;ctx.font="12px monospace";
      ctx.fillText(new Date().toLocaleString("es-MX"),200,165);
      setCap(cv.toDataURL("image/jpeg",0.8));
    }
  }
  return(
    <div style={{position:"fixed",top:"6vh",left:0,right:0,zIndex:20000,width:"100%",boxSizing:"border-box"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",
        padding:"20px",width:"100%",maxWidth:"500px",margin:"0 auto",
        maxHeight:"88vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <h3 style={{color:C.green,margin:"0 0 12px",fontSize:"12px",letterSpacing:"0.12em",textTransform:"uppercase"}}>
          📷 {titulo}
        </h3>
        {err&&<p style={{color:C.orange,fontSize:"12px",marginBottom:"10px",background:"#1a1200",padding:"8px 12px",borderRadius:"8px"}}>
          Cámara no disponible  modo simulado</p>}
        {!cap?<>
          <div style={{background:"#000",borderRadius:"12px",overflow:"hidden",aspectRatio:"4/3",
            display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"12px",position:"relative"}}>
            <video ref={vRef} style={{width:"100%",height:"100%",objectFit:"cover"}} playsInline muted/>
            {!live&&<div style={{position:"absolute",color:C.muted,textAlign:"center"}}>
              <div style={{fontSize:"36px",marginBottom:"6px"}}>📷</div>
              <div style={{fontSize:"12px"}}>Iniciando…</div>
            </div>}
          </div>
          <canvas ref={cRef} style={{display:"none"}}/>
          <button onClick={capturar} style={{...btnP(false),marginBottom:"8px"}}>
            {live?"📸 Capturar":"📸 Simular captura"}
          </button>
        </>:<>
          <img src={cap} alt="ev" style={{width:"100%",borderRadius:"12px",marginBottom:"12px"}}/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={()=>{setCap(null);init();}}
              style={{flex:1,padding:"12px",background:"transparent",border:`1px solid ${C.border}`,
                borderRadius:"11px",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:"14px"}}>🔄 Repetir</button>
            <button onClick={()=>{onCaptura(cap);onCerrar();}} style={{flex:2,...btnP(false)}}>✅ Usar foto</button>
          </div>
        </>}
        <button onClick={onCerrar} style={{width:"100%",marginTop:"8px",padding:"9px",
          background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:"13px"}}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// - QR Label (inline) -
// Sanitizar strings para uso en HTML (prevención XSS)
function sanitize(str){
  if(!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#x27;");
}

function QRLabel({equipo,onCerrar}){
  const qrRef=useRef();
  const APP_URL="https://equipotrack-app.vercel.app";
  const url=`${APP_URL}?equipo=${equipo.id}`;

  useEffect(()=>{
    function genQR(){
      if(!qrRef.current||!window.QRCode) return;
      while(qrRef.current.firstChild){qrRef.current.removeChild(qrRef.current.firstChild);}
      new window.QRCode(qrRef.current,{text:url,width:140,height:140,
        colorDark:"#111",colorLight:"#fff",correctLevel:window.QRCode.CorrectLevel.H});
    }
    if(window.QRCode){genQR();}
    else{
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.onload=genQR;document.head.appendChild(s);
    }
  },[]);

  function imprimir(){
    // Extraer QR como imagen PNG desde canvas (sin innerHTML)
    var qrCanvas=qrRef.current?qrRef.current.querySelector("canvas"):null;
    var qrDataUrl=qrCanvas?qrCanvas.toDataURL("image/png"):"";

    // Construir HTML de impresión con createElement (sin document.write)
    var w=window.open("","_blank");
    if(!w)return;
    var doc=w.document;
    doc.open();
    var style=doc.createElement("style");
    style.textContent=[
      "body{margin:0;padding:0;font-family:'Sora',sans-serif;background:#07070f}",
      ".et{border:2px solid #111;border-radius:8px;overflow:hidden;max-width:280px;margin:0 auto;}",
      ".eh{background:#111;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;}",
      ".logo{display:flex;align-items:center;gap:6px;}",
      ".icon{width:22px;height:22px;background:#00e87a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;}",
      ".brand{color:#fff;font-size:13px;font-weight:800;}",
      ".eid{color:#00e87a;font-size:12px;font-weight:700;font-family:monospace;}",
      ".eb{padding:14px;display:flex;gap:14px;align-items:flex-start;}",
      ".qrimg{width:140px;height:140px;flex-shrink:0;}",
      ".name{font-size:14px;font-weight:800;color:#111;margin-bottom:4px;}",
      ".serie{font-size:11px;color:#333;font-family:monospace;font-weight:600;}",
      ".cat{font-size:10px;color:#555;background:#f5f5f5;padding:2px 8px;border-radius:20px;display:inline-block;margin-top:4px;}",
      ".ef{background:#f8f8f8;border-top:1px solid #eee;padding:7px 12px;}",
      ".scan{font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;}",
      "@media print{body{padding:0;}}"
    ].join("");

    var html=doc.createElement("html");
    var head=doc.createElement("head");
    var meta=doc.createElement("meta");
    meta.setAttribute("charset","UTF-8");
    head.appendChild(meta);
    head.appendChild(style);
    html.appendChild(head);

    var body=doc.createElement("body");

    // Construir etiqueta con textContent (seguro, sin XSS)
    var et=doc.createElement("div"); et.className="et";
    var eh=doc.createElement("div"); eh.className="eh";
    var logo=doc.createElement("div"); logo.className="logo";
    var icon=doc.createElement("div"); icon.className="icon";
    icon.style.cssText="width:24px;height:24px;background:radial-gradient(circle at 38% 32%, #003322, #000d07);border:1px solid #00e87a33;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;";
    icon.innerHTML='<svg width="20" height="20" viewBox="0 0 28 28" fill="none"><defs><radialGradient id="ps" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="#003322"/><stop offset="100%" stop-color="#000d07"/></radialGradient><radialGradient id="pd" cx="38%" cy="28%" r="65%"><stop offset="0%" stop-color="#00ff88"/><stop offset="55%" stop-color="#00e87a"/><stop offset="100%" stop-color="#00a854"/></radialGradient></defs><circle cx="14" cy="14" r="13" fill="url(#ps)"/><path d="M 14 4 C 14 4 22 11 22 16 C 22 21 18.4 24 14 24 C 9.6 24 6 21 6 16 C 6 11 14 4 14 4 Z" fill="url(#pd)"/><circle cx="11" cy="15.5" r="2" fill="#001a0d"/><circle cx="17" cy="15.5" r="2" fill="#001a0d"/><circle cx="12" cy="14" r=".9" fill="white" opacity=".9"/><circle cx="18" cy="14" r=".9" fill="white" opacity=".9"/><line x1="14" y1="4" x2="14" y2="1.5" stroke="#00e87a" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="1" r="1.5" fill="#00e87a"/></svg>';
    var brand=doc.createElement("span"); brand.className="brand"; brand.textContent="Lumo";
    logo.appendChild(icon); logo.appendChild(brand);
    var eid=doc.createElement("span"); eid.className="eid"; eid.textContent=equipo.id;
    eh.appendChild(logo); eh.appendChild(eid);

    var eb=doc.createElement("div"); eb.className="eb";
    var qrDiv=doc.createElement("div");
    if(qrDataUrl){
      var img=doc.createElement("img");
      img.className="qrimg"; img.src=qrDataUrl; img.alt="QR";
      qrDiv.appendChild(img);
    }
    var info=doc.createElement("div");
    var name=doc.createElement("div"); name.className="name"; name.textContent=equipo.nombre;
    var serie=doc.createElement("div"); serie.className="serie"; serie.textContent="S/N: "+equipo.serie;
    var cat=doc.createElement("div"); cat.className="cat"; cat.textContent=equipo.categoria;
    info.appendChild(name); info.appendChild(serie); info.appendChild(cat);
    eb.appendChild(qrDiv); eb.appendChild(info);

    var ef=doc.createElement("div"); ef.className="ef";
    var scan=doc.createElement("span"); scan.className="scan"; scan.textContent="📱 Escanea para registrar";
    ef.appendChild(scan);

    et.appendChild(eh); et.appendChild(eb); et.appendChild(ef);
    body.appendChild(et);
    html.appendChild(body);
    doc.appendChild(html);
    doc.close();

    setTimeout(function(){w.print();},600);
  }

  return(
    <div style={{position:"fixed",inset:0,zIndex:20000,background:"rgba(0,0,0,0.97)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"20px",
        padding:"24px",width:"100%",maxWidth:"380px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"18px"}}>
          <div>
            <p style={{color:C.green,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
              ETIQUETA QR
            </p>
            <h2 style={{color:C.text,margin:0,fontSize:"16px",fontWeight:"800"}}>{equipo.nombre}</h2>
          </div>
          <button onClick={onCerrar} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>

        {/* Preview etiqueta */}
        <div style={{border:`2px solid ${C.border}`,borderRadius:"12px",overflow:"hidden",marginBottom:"16px"}}>
          <div style={{background:"#111",padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{width:"24px",height:"24px",
                background:"radial-gradient(circle at 38% 32%, #003322, #000d07)",
                border:"1px solid #00e87a33",borderRadius:"6px",
                display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                  <defs>
                    <radialGradient id="qls" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="#003322"/><stop offset="100%" stop-color="#000d07"/></radialGradient>
                    <radialGradient id="qld" cx="38%" cy="28%" r="65%"><stop offset="0%" stop-color="#00ff88"/><stop offset="55%" stop-color="#00e87a"/><stop offset="100%" stop-color="#00a854"/></radialGradient>
                  </defs>
                  <circle cx="14" cy="14" r="13" fill="url(#qls)"/>
                  <path d="M 14 4 C 14 4 22 11 22 16 C 22 21 18.4 24 14 24 C 9.6 24 6 21 6 16 C 6 11 14 4 14 4 Z" fill="url(#qld)"/>
                  <circle cx="11" cy="15.5" r="2" fill="#001a0d"/>
                  <circle cx="17" cy="15.5" r="2" fill="#001a0d"/>
                  <circle cx="12" cy="14" r=".9" fill="white" opacity=".9"/>
                  <circle cx="18" cy="14" r=".9" fill="white" opacity=".9"/>
                  <line x1="14" y1="4" x2="14" y2="1.5" stroke="#00e87a" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="14" cy="1" r="1.5" fill="#00e87a"/>
                </svg>
              </div>
              <span style={{color:"#fff",fontSize:"12px",fontWeight:"800"}}>Lumo</span>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.green,fontSize:"11px",fontWeight:"700"}}>
              {equipo.id}
            </span>
          </div>
          <div style={{padding:"14px",display:"flex",gap:"12px",alignItems:"flex-start",background:"#fff"}}>
            <div ref={qrRef} style={{width:"140px",height:"140px",flexShrink:0}}/>
            <div>
              <p style={{fontWeight:"800",fontSize:"13px",color:"#111",lineHeight:1.3,marginBottom:"4px"}}>{equipo.nombre}</p>
              <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",color:"#444",fontWeight:"600"}}>S/N: {equipo.serie}</p>
              <span style={{fontSize:"10px",color:"#555",background:"#f5f5f5",padding:"2px 8px",
                borderRadius:"20px",display:"inline-block",marginTop:"4px"}}>{equipo.categoria}</span>
            </div>
          </div>
          <div style={{background:"#f8f8f8",borderTop:"1px solid #eee",padding:"6px 12px",
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"9px",color:"#999",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:"600"}}>
              📱 Escanea para registrar
            </span>
          </div>
        </div>

        <button onClick={imprimir} style={{...btnP(false)}}>🖨️ Imprimir etiqueta</button>
      </div>
    </div>
  );
}

// - PANTALLA REGISTRO DE NOMBRE -
function RegistroNombre({sessionTemp,token,onComplete}){
  const [nombre,setNombre]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  // Usar token prop directamente — más confiable que sessionTemp.token
  const tkn=token||(sessionTemp&&sessionTemp.token)||"";

  async function guardar(e){
    e.preventDefault();
    if(!nombre.trim()){setErr("Por favor ingresa tu nombre completo");return;}
    setLoading(true);setErr("");
    try{
      // Extraer userId del JWT usando tkn (prop directo, más confiable)
      var userId=null;
      try{
        var parts=tkn.split(".");
        if(parts.length===3){
          var payload=JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
          // Mostrar todos los campos del payload para diagnóstico
          var keys=Object.keys(payload).join(",");
          userId=payload.sub||payload.user_id||payload.uid||payload.id||null;
          if(!userId){
            setErr("Campos JWT: "+keys);
            setLoading(false);return;
          }
        }
      }catch(je){}
      // Fallback a sessionTemp.user.id si existe
      if(!userId&&sessionTemp&&sessionTemp.user&&sessionTemp.user.id&&sessionTemp.user.id!=="null"){
        userId=sessionTemp.user.id;
      }
      if(!userId){
        setErr("No se pudo identificar el usuario. Cierra sesión e intenta de nuevo.");
        setLoading(false);return;
      }
      try{
        await supa("perfiles",{method:"POST",token:tkn,
          body:{id:userId,nombre:nombre.trim(),email:sessionTemp.email}});
      }catch{
        await supa("perfiles?id=eq."+userId,{method:"PATCH",token:tkn,
          body:{nombre:nombre.trim()}});
      }
      const updated={};
      for(var k in sessionTemp) updated[k]=sessionTemp[k];
      updated.nombre=nombre.trim();
      updated.necesitaNombre=false;
      updated.user={id:userId,email:sessionTemp.email};
      updated.token=tkn;
      onComplete(updated);
    }catch(ex){
      setErr(ex.message);
      // Reset captcha para que el usuario pueda intentar de nuevo
      setCaptchaToken(null);
      if(window.hcaptcha&&captchaRef.current){
        try{window.hcaptcha.reset(captchaRef.current);}catch{}
      }
    }
    finally{setLoading(false);}
  }

  // Inyectar animación CSS para Lumi
  React.useEffect(function(){
    if(document.getElementById("lumi-style")) return;
    var s=document.createElement("style");
    s.id="lumi-style";
    s.textContent="@keyframes lumiPulse{0%,100%{box-shadow:0 0 0 0 #00e87a33}50%{box-shadow:0 0 0 5px #00e87a00}}";
    document.head.appendChild(s);
  },[]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{width:"64px",height:"64px",margin:"0 auto 14px",
            background:`linear-gradient(135deg,${C.green},#00c066)`,
            borderRadius:"20px",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:"28px"}}>👤</div>
          <h1 style={{fontSize:"22px",fontWeight:"800",margin:"0 0 8px",color:C.text}}>
            ¡Bienvenido!
          </h1>
          <p style={{color:C.muted,fontSize:"13px",lineHeight:1.5}}>
            Es tu primera vez entrando.<br/>
            ¿Cómo quieres que aparezca tu nombre en los registros?
          </p>
        </div>

        <form onSubmit={guardar} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",
              display:"block",marginBottom:"6px"}}>NOMBRE COMPLETO</label>
            <input
              value={nombre}
              onChange={e=>setNombre(e.target.value)}
              placeholder="Ej. Carlos Mendoza López"
              style={inp}
              autoFocus
              required/>
            <p style={{color:C.muted,fontSize:"11px",marginTop:"6px"}}>
              Este nombre aparecerá en todos los registros de equipos.
            </p>
          </div>

          {err&&<p style={{color:C.red,fontSize:"13px",background:"#1a0000",
            padding:"10px 14px",borderRadius:"9px",margin:0}}>⚠️ {err}</p>}

          <button type="submit" disabled={loading||!nombre.trim()} style={{...btnP(loading||!nombre.trim()),marginTop:"6px"}}>
            {loading?"Guardando…":"Continuar →"}
          </button>
        </form>

        <p style={{textAlign:"center",color:C.muted,fontSize:"11px",marginTop:"20px"}}>
          El administrador puede modificar tu nombre si es necesario.
        </p>
      </div>
    </div>
  );
}

// - NUEVA CONTRASEÑA (desde link de email) -
function NuevaContrasena({token}){
  const [pass,setPass]=useState("");
  const [pass2,setPass2]=useState("");
  const [loading,setLoading]=useState(false);
  const [listo,setListo]=useState(false);
  const [err,setErr]=useState("");

  async function guardar(e){
    e.preventDefault();
    if(pass.length<6){setErr("Mínimo 6 caracteres");return;}
    if(pass!==pass2){setErr("Las contraseñas no coinciden");return;}
    setLoading(true);setErr("");
    try{
      const res=await fetch(SUPA_URL+"/auth/v1/user",{
        method:"PUT",
        headers:{
          "apikey":SUPA_KEY,
          "Content-Type":"application/json",
          "Authorization":"Bearer "+token,
        },
        body:JSON.stringify({password:pass}),
      });
      if(!res.ok){const d=await res.json();throw new Error(d.error_description||d.msg||"Error");}
      if(window.history&&window.history.replaceState){
        window.history.replaceState(null,null," ");
      }
      setListo(true);
    }catch(ex){
      setErr(ex.message);
      // Reset captcha para que el usuario pueda intentar de nuevo
      setCaptchaToken(null);
      if(window.hcaptcha&&captchaRef.current){
        try{window.hcaptcha.reset(captchaRef.current);}catch{}
      }
    }
    finally{setLoading(false);}
  }

  if(listo) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px",textAlign:"center"}}>
        <div style={{fontSize:"64px",marginBottom:"16px"}}>✅</div>
        <h2 style={{fontSize:"20px",fontWeight:"800",color:C.text,marginBottom:"10px"}}>
          ¡Contraseña actualizada!
        </h2>
        <p style={{color:C.muted,fontSize:"13px",marginBottom:"24px"}}>
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <button onClick={function(){window.location.href=window.location.pathname;}}
          style={btnP(false)}>Ir al login</button>
      </div>
    </div>
  );

  // Inyectar animación CSS para Lumi
  React.useEffect(function(){
    if(document.getElementById("lumi-style")) return;
    var s=document.createElement("style");
    s.id="lumi-style";
    s.textContent="@keyframes lumiPulse{0%,100%{box-shadow:0 0 0 0 #00e87a33}50%{box-shadow:0 0 0 5px #00e87a00}}";
    document.head.appendChild(s);
  },[]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"64px",height:"64px",margin:"0 auto 14px",
            background:"linear-gradient(135deg,"+C.green+",#00c066)",
            borderRadius:"20px",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:"28px"}}>🔐</div>
          <h1 style={{fontSize:"22px",fontWeight:"800",margin:"0 0 8px",color:C.text}}>
            Nueva contraseña
          </h1>
          <p style={{color:C.muted,fontSize:"13px",lineHeight:1.5}}>
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>
        <form onSubmit={guardar} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",
              display:"block",marginBottom:"6px"}}>NUEVA CONTRASEÑA</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="Mínimo 6 caracteres" style={inp} required/>
          </div>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",
              display:"block",marginBottom:"6px"}}>CONFIRMAR CONTRASEÑA</label>
            <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)}
              placeholder="Repite la contraseña" style={inp} required/>
          </div>
          {err&&<p style={{color:C.red,fontSize:"13px",background:"#1a0000",
            padding:"10px 14px",borderRadius:"9px",margin:0}}>⚠️ {err}</p>}
          <button type="submit" disabled={loading||!pass||!pass2}
            style={btnP(loading||!pass||!pass2)}>
            {loading?"Guardando…":"Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

// - RESET CONTRASEÑA -
function ResetPassword({onVolver}){
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);
  const [enviado,setEnviado]=useState(false);
  const [err,setErr]=useState("");
  async function enviar(e){
    e.preventDefault();setLoading(true);setErr("");
    try{
      const res=await fetch(SUPA_URL+"/auth/v1/recover",{
        method:"POST",
        headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({email:email}),
      });
      if(!res.ok){const d=await res.json();throw new Error(d.error_description||d.msg||"Error");}
      setEnviado(true);
    }catch(ex){
      setErr(ex.message);
      // Reset captcha para que el usuario pueda intentar de nuevo
      setCaptchaToken(null);
      if(window.hcaptcha&&captchaRef.current){
        try{window.hcaptcha.reset(captchaRef.current);}catch{}
      }
    }
    finally{setLoading(false);}
  }
  if(enviado) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px",textAlign:"center"}}>
        <div style={{fontSize:"64px",marginBottom:"16px"}}>📬</div>
        <h2 style={{fontSize:"20px",fontWeight:"800",color:C.text,marginBottom:"10px"}}>Revisa tu correo</h2>
        <p style={{color:C.muted,fontSize:"13px",lineHeight:1.6,marginBottom:"20px"}}>
          Si el correo <strong style={{color:C.text}}>{email}</strong> está registrado,
          recibirás un enlace para restablecer tu contraseña. Revisa también spam.
        </p>
        <button onClick={onVolver} style={btnP(false)}>← Volver al login</button>
      </div>
    </div>
  );
  // Inyectar animación CSS para Lumi
  React.useEffect(function(){
    if(document.getElementById("lumi-style")) return;
    var s=document.createElement("style");
    s.id="lumi-style";
    s.textContent="@keyframes lumiPulse{0%,100%{box-shadow:0 0 0 0 #00e87a33}50%{box-shadow:0 0 0 5px #00e87a00}}";
    document.head.appendChild(s);
  },[]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"64px",height:"64px",margin:"0 auto 14px",
            background:"linear-gradient(135deg,#ff9500,#cc7700)",
            borderRadius:"20px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px"}}>🔑</div>
          <h1 style={{fontSize:"22px",fontWeight:"800",margin:"0 0 8px",color:C.text}}>Restablecer contraseña</h1>
          <p style={{color:C.muted,fontSize:"13px",lineHeight:1.5}}>
            Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>
        <form onSubmit={enviar} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
              CORREO ELECTRÓNICO
            </label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="ingeniero@empresa.com" style={inp} required/>
          </div>
          {err&&<p style={{color:C.red,fontSize:"13px",background:"#1a0000",
            padding:"10px 14px",borderRadius:"9px",margin:0}}>⚠️ {err}</p>}
          <button type="submit" disabled={loading||!email} style={btnP(loading||!email)}>
            {loading?"Enviando…":"Enviar enlace"}
          </button>
        </form>
        <button onClick={onVolver}
          style={{width:"100%",marginTop:"14px",padding:"11px",background:"transparent",
            border:"none",color:C.muted,cursor:"pointer",fontSize:"13px",fontFamily:"inherit"}}>
          ← Volver al login
        </button>
      </div>
    </div>
  );
}

// - LOGIN -
function Login({onLogin}){
  const [email,setEmail]=useState(""),[pass,setPass]=useState("");
  const [loading,setLoading]=useState(false),[err,setErr]=useState("");
  const [captchaToken,setCaptchaToken]=useState(null);
  const captchaRef=useRef(null);
  const [showReset,setShowReset]=useState(false);

  // Cargar script hCaptcha y renderizar widget programáticamente
  React.useEffect(function(){
    var widgetId=null;

    function renderWidget(){
      if(!captchaRef.current||!window.hcaptcha) return;
      // Limpiar contenido previo del div
      captchaRef.current.innerHTML="";
      try{
        widgetId=window.hcaptcha.render(captchaRef.current,{
          sitekey:"c8541066-98c2-474a-8d3e-0f0c4748f016",
          theme:"dark",
          callback:function(token){setCaptchaToken(token);},
          "expired-callback":function(){setCaptchaToken(null);},
          "error-callback":function(){setCaptchaToken(null);}
        });
      }catch(e){}
    }

    if(window.hcaptcha){
      // Script ya cargado — renderizar inmediatamente
      renderWidget();
    } else if(!document.getElementById("hcaptcha-script")){
      // Cargar script por primera vez
      var s=document.createElement("script");
      s.id="hcaptcha-script";
      s.src="https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaLoad";
      s.async=true; s.defer=true;
      window.onHCaptchaLoad=function(){renderWidget();};
      document.head.appendChild(s);
    } else {
      // Script existe pero aún cargando — esperar
      var interval=setInterval(function(){
        if(window.hcaptcha){
          clearInterval(interval);
          renderWidget();
        }
      },100);
    }

    // Cleanup al desmontar
    return function(){
      if(widgetId!=null&&window.hcaptcha){
        try{window.hcaptcha.reset(widgetId);}catch{}
      }
    };
  },[]);
  if(showReset) return React.createElement(ResetPassword,{onVolver:function(){setShowReset(false);}});
  async function login(e){
    e.preventDefault();setLoading(true);setErr("");
    try{
      // Verificar que captcha fue completado
      if(!captchaToken){setErr("Por favor completa la verificación de seguridad.");setLoading(false);return;}
      const data=await authReq("token?grant_type=password",{email,password:pass,gotrue_meta_security:{captcha_token:captchaToken}});

      // Extraer user del JWT directamente (más robusto que data.user)
      var userId=null, jwtRol="ingeniero";
      try{
        var parts=data.access_token.split(".");
        if(parts.length===3){
          var payload=JSON.parse(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")));
          userId=payload.sub||null;
          if(payload.app_metadata&&payload.app_metadata.rol){
            jwtRol=payload.app_metadata.rol;
          }
        }
      }catch(je){}

      // Fallback: intentar data.user si existe
      if(!userId&&data.user){userId=data.user.id;}

      // Cargar perfil
      let perfil=null;
      if(userId){
        try{
          const p=await supa("perfiles",{token:data.access_token,
            params:{id:"eq."+userId,limit:"1"}});
          perfil=p&&p[0]?p[0]:null;
        }catch{}
      }

      const pNombre=perfil&&perfil.nombre?perfil.nombre:null;
      const pRol=perfil&&perfil.rol?perfil.rol:"ingeniero";
      const rolFinal=jwtRol==="admin"?"admin":pRol;
      const userEmail=(data.user&&data.user.email)||email;

      const sessionData={
        token:data.access_token,
        email:userEmail,
        user:{id:userId,email:userEmail},
        nombre:pNombre,
        rol:rolFinal,
        gerencia:perfil&&perfil.gerencia?perfil.gerencia:"",
        necesitaNombre:!pNombre
      };
      onLogin(sessionData);
    }catch(ex){
      playSound("error");
      setErr(ex.message);
      // Reset captcha para que el usuario pueda intentar de nuevo
      setCaptchaToken(null);
      if(window.hcaptcha&&captchaRef.current){
        try{window.hcaptcha.reset(captchaRef.current);}catch{}
      }
    }
    finally{setLoading(false);}
  }
  // Inyectar animación CSS para Lumi
  React.useEffect(function(){
    if(document.getElementById("lumi-style")) return;
    var s=document.createElement("style");
    s.id="lumi-style";
    s.textContent="@keyframes lumiPulse{0%,100%{box-shadow:0 0 0 0 #00e87a33}50%{box-shadow:0 0 0 5px #00e87a00}}";
    document.head.appendChild(s);
  },[]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:"20px",fontFamily:"'Sora',sans-serif"}}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"36px"}}>
          <div style={{width:"64px",height:"64px",margin:"0 auto 14px",
            background:"radial-gradient(circle at 38% 32%, #003322, #000d07)",
            border:"1px solid #00e87a44",
            borderRadius:"20px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            <svg width="50" height="50" viewBox="0 0 28 28" fill="none">
              <defs>
                <radialGradient id="lls" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="#003322"/><stop offset="100%" stop-color="#000d07"/></radialGradient>
                <radialGradient id="lld" cx="38%" cy="28%" r="65%"><stop offset="0%" stop-color="#00ff88"/><stop offset="55%" stop-color="#00e87a"/><stop offset="100%" stop-color="#00a854"/></radialGradient>
              </defs>
              <circle cx="14" cy="14" r="13" fill="url(#lls)"/>
              <ellipse cx="14" cy="14" rx="13" ry="4" stroke="#00e87a" stroke-width="0.8" opacity="0.25" fill="none" transform="rotate(-25 14 14)"/>
              <path d="M 14 4 C 14 4 22 11 22 16 C 22 21 18.4 24 14 24 C 9.6 24 6 21 6 16 C 6 11 14 4 14 4 Z" fill="url(#lld)"/>
              <ellipse cx="11" cy="10" rx="2.5" ry="3.5" fill="white" opacity="0.15" transform="rotate(-15 11 10)"/>
              <circle cx="11" cy="15.5" r="2.2" fill="#001a0d"/>
              <circle cx="17" cy="15.5" r="2.2" fill="#001a0d"/>
              <circle cx="12" cy="14" r="1" fill="white" opacity="0.9"/>
              <circle cx="18" cy="14" r="1" fill="white" opacity="0.9"/>
              <path d="M 10 19 Q 14 22 18 19" stroke="#001a0d" stroke-width="1.3" stroke-linecap="round" fill="none"/>
              <ellipse cx="8" cy="17" rx="2" ry="1.2" fill="#00e87a" opacity="0.3"/>
              <ellipse cx="20" cy="17" rx="2" ry="1.2" fill="#00e87a" opacity="0.3"/>
              <line x1="14" y1="4" x2="14" y2="1.5" stroke="#00e87a" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="14" cy="1" r="1.5" fill="#00e87a"/>
            </svg>
          </div>
          <h1 style={{fontSize:"26px",fontWeight:"800",margin:"0 0 4px",color:C.text}}>Lumo</h1>
          <p style={{color:C.muted,fontSize:"12px",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace"}}>
            TRACK DE ACTIVOS
          </p>
          <p style={{color:"#555",fontSize:"12px",fontStyle:"italic",marginTop:"4px"}}>
            Cada activo en su lugar
          </p>
        </div>
        <form onSubmit={login} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
              CORREO ELECTRÓNICO
            </label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="ingeniero@empresa.com" style={inp} required/>
          </div>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
              CONTRASEÑA
            </label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="••••••••" style={inp} required/>
          </div>
          {err&&<p style={{color:C.red,fontSize:"13px",background:"#1a0000",padding:"10px 14px",borderRadius:"9px",margin:0}}>
            ⚠️ {err}</p>}
          <div style={{display:"flex",justifyContent:"center",margin:"4px 0"}}>
            <div ref={captchaRef} style={{minHeight:"78px"}}/>
          </div>
          <button type="submit" disabled={loading||!captchaToken} style={{...btnP(loading||!captchaToken),marginTop:"6px"}}>
            {loading?"Verificando…":"Iniciar sesión"}
          </button>
          <button type="button" onClick={function(){setShowReset(true);}}
            style={{background:"transparent",border:"none",color:C.muted,
              cursor:"pointer",fontSize:"13px",fontFamily:"inherit",
              padding:"6px",textDecoration:"underline"}}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
        <p style={{textAlign:"center",color:C.muted,fontSize:"11px",marginTop:"20px"}}>
          ¿Sin acceso? Contacta al administrador · v0.27.0
        </p>
      </div>
    </div>
  );
}

// - MODAL CHECKOUT -
function ModalCheckout({equipo,token,session,perfiles,onConfirmar,onCerrar}){
  const isAdmin=isAdminOrSuper(session);
  const [paso,setPaso]=useState(1);
  const [ingeniero,setIng]=useState(isAdmin?"":session.nombre);
  const [estado,setEstado]=useState(""),[ciudad,setCiudad]=useState("");
  const [tipo,setTipo]=useState("directo"),[guia,setGuia]=useState("");
  const [foto,setFoto]=useState(null),[showCam,setShowCam]=useState(false);
  const [loading,setLoading]=useState(false);

  const ok1=ingeniero&&estado&&ciudad;

  async function confirmar(){
    setLoading(true);
    try{
      // NOTA: el trigger set_ingeniero en DB fue actualizado para no sobreescribir si ya viene valor
      // ingeniero = nombre seleccionado del dropdown (admin) o propio (ingeniero)
      // enviado_por = quien hace el registro (siempre el usuario logueado)
      await supa("registros",{method:"POST",token,body:{
        equipo_id:equipo.id,
        user_id:getUserId(session),
        ingeniero:ingeniero||session.nombre,
        estado,ciudad,
        tipo,guia_paqueteria:guia||null,
        foto_retiro:foto,
        enviado_por:session.nombre,
        // fecha_retiro la genera el trigger en DB
      }});
      playSound("checkout");
      onConfirmar(`✅ ${equipo.nombre} asignado a ${ingeniero}`);
    }catch(ex){
      if(ex.message.indexOf("no_duplicate_checkout")!==-1||ex.message.indexOf("unique")!==-1){
        alert("Este equipo ya está asignado. Recarga la app y verifica.");
      }else{
        alert("Error: "+ex.message);
      }
    }
    finally{setLoading(false);}
  }

  return(<>
    {showCam&&<CamaraModal titulo="Foto de RETIRO" onCaptura={img=>{setFoto(img);setShowCam(false);}} onCerrar={()=>setShowCam(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)"}} onClick={onCerrar}/>
    <div style={{position:"fixed",top:"6vh",left:"0",right:"0",zIndex:10000,width:"100%",boxSizing:"border-box",
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:"22px",
      padding:"24px 20px",
      maxWidth:"600px",margin:"0 auto",
      maxHeight:"88vh",overflowY:"auto",
      WebkitOverflowScrolling:"touch"}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{color:C.green,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
              CHECK-OUT · {equipo.id}
            </p>
            <h2 style={{color:C.text,margin:0,fontSize:"17px",fontWeight:"800"}}>{equipo.nombre}</h2>
            <p style={{color:C.muted,fontSize:"11px",marginTop:"2px"}}>
              Base: {equipo.sitio_base}  {equipo.ciudad_base}
              {equipo.serie&&<span style={{color:"#555",fontFamily:"monospace",marginLeft:"8px"}}>· S/N: {equipo.serie}</span>}
            </p>
            {equipo.notas&&<div style={{marginTop:"8px",background:"#1a1200",border:"1px solid "+C.orange+"44",
              borderRadius:"10px",padding:"8px 12px"}}>
              <p style={{color:C.orange,fontSize:"10px",fontWeight:"700",marginBottom:"3px",letterSpacing:"0.08em"}}>
                ⚠️ VERIFICA ACCESORIOS ANTES DE ACEPTAR
              </p>
              <p style={{color:"#ccc",fontSize:"12px",lineHeight:"1.5",margin:0}}>{equipo.notas}</p>
            </div>}
          </div>
          <button onClick={onCerrar} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>

        <div style={{display:"flex",gap:"5px",marginBottom:"20px"}}>
          {[1,2,3].map(p=><div key={p} style={{flex:1,height:"3px",borderRadius:"2px",
            background:p<=paso?C.green:C.border,transition:"background 0.3s"}}/>)}
        </div>

        {paso===1&&<div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
              INGENIERO <span style={{color:C.red}}>*</span>
            </label>
            {isAdmin?(
              <select value={ingeniero} onChange={e=>setIng(e.target.value)}
                style={{...inp,cursor:"pointer",color:ingeniero?C.text:C.muted}}>
                <option value="">Selecciona ingeniero…</option>
                {perfiles.map(p=><option key={p.id} value={p.nombre}>{p.nombre}  {p.email}</option>)}
              </select>
            ):(
              <input value={ingeniero} readOnly
                style={{...inp,background:"#0a0a18",color:C.green,fontWeight:"700",cursor:"default"}}/>
            )}
          </div>

          <EstadoCiudad estado={estado} ciudad={ciudad} onEstado={setEstado} onCiudad={setCiudad}/>

          <div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"8px"}}>
              TIPO DE TRASLADO
            </label>
            <div style={{display:"flex",gap:"8px"}}>
              {[{k:"directo",l:"🤝 Retiro directo"},{k:"paqueteria",l:"📦 Paquetería"}].map(t=>(
                <button key={t.k} onClick={()=>setTipo(t.k)}
                  style={{flex:1,padding:"11px",border:`1px solid ${tipo===t.k?C.green:C.border}`,
                    borderRadius:"11px",background:tipo===t.k?"#001a0d":"transparent",
                    color:tipo===t.k?C.green:C.muted,cursor:"pointer",
                    fontFamily:"inherit",fontSize:"13px",fontWeight:"600"}}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {tipo==="paqueteria"&&<div>
            <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
              NÚMERO DE GUÍA
            </label>
            <input value={guia} onChange={e=>setGuia(e.target.value)}
              placeholder="Ej. 1Z999AA10123456784" style={inp}/>
            <p style={{color:C.muted,fontSize:"11px",marginTop:"5px"}}>
              El check-in lo hará quien reciba el equipo en destino.
            </p>
          </div>}

          <button onClick={()=>ok1&&setPaso(2)} disabled={!ok1} style={btnP(!ok1)}>Continuar →</button>
        </div>}

        {paso===2&&<div>
          <p style={{color:"#aaa",fontSize:"13px",marginBottom:"4px"}}>
            📸 <strong style={{color:C.text}}>Foto obligatoria</strong>  estado al retirar.
          </p>
          <p style={{color:C.muted,fontSize:"11px",marginBottom:"14px"}}>Evidencia del estado inicial del equipo.</p>
          {!foto?(
            <button onClick={()=>setShowCam(true)}
              style={{width:"100%",aspectRatio:"16/9",background:"#12121f",border:`2px dashed ${C.border}`,
                borderRadius:"14px",color:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"14px"}}>
              <span style={{fontSize:"36px"}}>📷</span>
              <span style={{fontSize:"13px"}}>Toca para abrir cámara</span>
              <span style={{fontSize:"11px",color:C.red,fontWeight:"700"}}>REQUERIDA</span>
            </button>
          ):(
            <div style={{marginBottom:"14px",position:"relative"}}>
              <img src={foto} alt="ev" style={{width:"100%",borderRadius:"14px",display:"block"}}/>
              <button onClick={()=>{setFoto(null);setShowCam(true);}}
                style={{position:"absolute",top:"8px",right:"8px",background:"rgba(0,0,0,0.7)",
                  border:"none",borderRadius:"20px",color:"#fff",padding:"5px 11px",fontSize:"11px",cursor:"pointer"}}>
                🔄 Repetir
              </button>
            </div>
          )}
          <button onClick={()=>foto&&setPaso(3)} disabled={!foto} style={btnP(!foto)}>
            {foto?"Continuar →":"📷 Foto requerida"}
          </button>
        </div>}

        {paso===3&&<div>
          <p style={{color:"#aaa",fontSize:"13px",marginBottom:"12px"}}>Confirma el retiro:</p>
          <div style={{background:"#12121f",border:`1px solid ${C.border}`,borderRadius:"13px",padding:"14px",marginBottom:"12px"}}>
            <Row label="Ingeniero" value={ingeniero}/>
            <Row label="Destino" value={`${ciudad}, ${estado}`}/>
            <Row label="Tipo" value={tipo==="paqueteria"?`📦 Paquetería${guia?` · ${guia}`:""}` :"🤝 Retiro directo"}/>
            <Row label="Equipo" value={equipo.nombre}/>
            <Row label="Fecha" value={fmt(new Date().toISOString())} last/>
          </div>
          {foto&&<img src={foto} alt="ev" style={{width:"100%",borderRadius:"13px",marginBottom:"14px",display:"block",opacity:0.9}}/>}
          <button onClick={confirmar} disabled={loading} style={btnP(loading)}>
            {loading?"Guardando…":"✅ Confirmar retiro"}
          </button>
        </div>}
    </div>
  </>);
}

// - MODAL RECEPCIÓN PAQUETERÍA -
function ModalRecepcion({equipo,registro,token,session,onConfirmar,onCerrar}){
  const [estado,setEstado]=useState(""),[ciudad,setCiudad]=useState("");
  const [foto,setFoto]=useState(null),[showCam,setShowCam]=useState(false);
  const [loading,setLoading]=useState(false);

  async function confirmar(){
    if(!foto||!estado||!ciudad)return;
    setLoading(true);
    try{
      // Actualizar registro: cambia tipo a "directo" y actualiza ciudad de recepción
      await supa("registros?equipo_id=eq."+equipo.id,{method:"PATCH",token,body:{
        tipo:"directo",estado,ciudad,
        foto_retiro:foto,
        fecha_retiro:new Date().toISOString(),
        ingeniero:session.nombre,
        user_id:getUserId(session), // actualizar user_id al receptor
      }});
      playSound("paqueteria");
      onConfirmar("📦 "+equipo.nombre+" recibido en "+ciudad);
    }catch(ex){alert("Error en recepción: "+ex.message);}
    finally{setLoading(false);}
  }

  return(<>
    {showCam&&<CamaraModal titulo="Foto de RECEPCIÓN" onCaptura={img=>{setFoto(img);setShowCam(false);}} onCerrar={()=>setShowCam(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)"}} onClick={onCerrar}/>
    <div style={{position:"fixed",top:"6vh",left:"0",right:"0",zIndex:10000,width:"100%",boxSizing:"border-box",
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:"22px",
      padding:"24px 20px",
      maxWidth:"600px",margin:"0 auto",
      maxHeight:"88vh",overflowY:"auto",
      WebkitOverflowScrolling:"touch"}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{color:C.blue,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
              RECEPCIÓN DE PAQUETE · {equipo.id}
            </p>
            <h2 style={{color:C.text,margin:0,fontSize:"17px",fontWeight:"800"}}>{equipo.nombre}</h2>
          </div>
          <button onClick={onCerrar} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>

        <div style={{background:C.blueDk,border:`1px solid ${C.blue}33`,borderRadius:"12px",padding:"12px",marginBottom:"16px"}}>
          <p style={{color:C.blue,fontSize:"12px",fontWeight:"700",marginBottom:"6px"}}>📦 Equipo en tránsito</p>
          <Row label="Enviado por" value={registro.enviado_por||registro.ingeniero}/>
          {registro.guia_paqueteria&&<Row label="Guía" value={registro.guia_paqueteria}/>}
          <Row label="Salida" value={fmt(registro.fecha_retiro)} last/>
        </div>

        <p style={{color:"#aaa",fontSize:"13px",marginBottom:"12px",fontWeight:"700"}}>
          ¿Dónde estás recibiendo el equipo?
        </p>
        <div style={{marginBottom:"14px"}}>
          <EstadoCiudad estado={estado} ciudad={ciudad} onEstado={setEstado} onCiudad={setCiudad}/>
        </div>

        <p style={{color:"#aaa",fontSize:"13px",marginBottom:"4px"}}>
          📸 <strong style={{color:C.text}}>Foto obligatoria</strong>  confirma que lo recibiste en buen estado.
        </p>
        <p style={{color:C.muted,fontSize:"11px",marginBottom:"14px"}}>Esta foto es evidencia de la recepción.</p>

        {!foto?(
          <button onClick={()=>setShowCam(true)}
            style={{width:"100%",aspectRatio:"16/9",background:"#12121f",border:`2px dashed ${C.border}`,
              borderRadius:"14px",color:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"14px"}}>
            <span style={{fontSize:"36px"}}>📷</span>
            <span style={{fontSize:"13px"}}>Foto de recepción</span>
            <span style={{fontSize:"11px",color:C.red,fontWeight:"700"}}>REQUERIDA</span>
          </button>
        ):(
          <div style={{marginBottom:"14px",position:"relative"}}>
            <img src={foto} alt="ev" style={{width:"100%",borderRadius:"14px",display:"block"}}/>
            <button onClick={()=>{setFoto(null);setShowCam(true);}}
              style={{position:"absolute",top:"8px",right:"8px",background:"rgba(0,0,0,0.7)",
                border:"none",borderRadius:"20px",color:"#fff",padding:"5px 11px",fontSize:"11px",cursor:"pointer"}}>
              🔄 Repetir
            </button>
          </div>
        )}

        <button onClick={confirmar} disabled={!foto||!estado||!ciudad||loading}
          style={{...btnP(!foto||!estado||!ciudad||loading),
            background:(!foto||!estado||!ciudad||loading)?C.subtle:`linear-gradient(135deg,${C.blue},#2266cc)`}}>
          {loading?"Guardando…":"📦 Confirmar recepción"}
        </button>
    </div>
  </>);
}

// - MODAL CHECKIN -
function ModalCheckin({equipo,registro,token,session,onConfirmar,onCerrar}){
  const [foto,setFoto]=useState(null),[showCam,setShowCam]=useState(false);
  const [loading,setLoading]=useState(false),[listo,setListo]=useState(false);

  async function confirmar(){
    if(!foto)return;setLoading(true);
    try{
      await supa("historial",{method:"POST",token,body:{
        equipo_id:equipo.id,equipo_nombre:equipo.nombre,
        user_id:getUserId(session),
        ingeniero:registro.ingeniero,estado:registro.estado,ciudad:registro.ciudad,
        fecha_retiro:registro.fecha_retiro,
        foto_retiro:registro.foto_retiro,foto_devolucion:foto,
        dias:getDias(registro.fecha_retiro),tipo:registro.tipo,
        guia_paqueteria:registro.guia_paqueteria,
        // fecha_devolucion la genera el trigger en DB
      }});
      // Borrar registro activo - requiere política RLS que permita al usuario borrar su propio registro
      await supa("registros?equipo_id=eq."+equipo.id,{method:"DELETE",token});
      setListo(true);
      playSound("checkin");
      setTimeout(()=>{onConfirmar(`📦 ${equipo.nombre} devuelto correctamente`);onCerrar();},1800);
    }catch(ex){alert("Error: "+ex.message);}
    finally{setLoading(false);}
  }

  if(listo)return(
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.92)",
      display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"12px"}}>
      <div style={{fontSize:"70px"}}>✅</div>
      <p style={{color:C.green,fontSize:"20px",fontWeight:"800"}}>¡Equipo devuelto!</p>
    </div>
  );

  return(<>
    {showCam&&<CamaraModal titulo="Foto de DEVOLUCIÓN" onCaptura={img=>{setFoto(img);setShowCam(false);}} onCerrar={()=>setShowCam(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)"}} onClick={onCerrar}/>
    <div style={{position:"fixed",top:"6vh",left:"0",right:"0",zIndex:10000,width:"100%",boxSizing:"border-box",
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:"22px",
      padding:"24px 20px",
      maxWidth:"600px",margin:"0 auto",
      maxHeight:"88vh",overflowY:"auto",
      WebkitOverflowScrolling:"touch"}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"16px"}}>
          <div>
            <p style={{color:C.orange,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
              CHECK-IN · {equipo.id}
            </p>
            <h2 style={{color:C.text,margin:0,fontSize:"17px",fontWeight:"800"}}>{equipo.nombre}</h2>
          </div>
          <button onClick={onCerrar} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>

        <div style={{background:"#12121f",border:`1px solid ${C.border}`,borderRadius:"13px",padding:"14px",marginBottom:"16px"}}>
          <Row label="Ingeniero" value={registro.ingeniero}/>
          <Row label="Ciudad" value={`${registro.ciudad}, ${registro.estado}`}/>
          <Row label="Tiempo en uso" value={getDias(registro.fecha_retiro)}/>
          <Row label="Retiro" value={fmt(registro.fecha_retiro)}/>
          {equipo.serie&&<Row label="S/N" value={equipo.serie} last/>}
          {!equipo.serie&&<Row label="Retiro" value={fmt(registro.fecha_retiro)} last/>}
        </div>
        {equipo.notas&&<div style={{marginBottom:"14px",background:"#1a1200",border:"1px solid "+C.orange+"44",
          borderRadius:"10px",padding:"8px 12px"}}>
          <p style={{color:C.orange,fontSize:"10px",fontWeight:"700",marginBottom:"3px",letterSpacing:"0.08em"}}>
            ⚠️ VERIFICA ACCESORIOS ANTES DE DEVOLVER
          </p>
          <p style={{color:"#ccc",fontSize:"12px",lineHeight:"1.5",margin:0}}>{equipo.notas}</p>
        </div>}

        <p style={{color:"#aaa",fontSize:"13px",marginBottom:"4px"}}>
          📸 <strong style={{color:C.text}}>Foto obligatoria</strong>  estado al devolver.
        </p>
        <p style={{color:C.muted,fontSize:"11px",marginBottom:"14px"}}>Evidencia del estado de devolución.</p>

        {!foto?(
          <button onClick={()=>setShowCam(true)}
            style={{width:"100%",aspectRatio:"16/9",background:"#12121f",border:`2px dashed ${C.border}`,
              borderRadius:"14px",color:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:"8px",marginBottom:"14px"}}>
            <span style={{fontSize:"36px"}}>📷</span>
            <span style={{fontSize:"13px"}}>Foto de devolución</span>
            <span style={{fontSize:"11px",color:C.red,fontWeight:"700"}}>REQUERIDA</span>
          </button>
        ):(
          <div style={{marginBottom:"14px",position:"relative"}}>
            <img src={foto} alt="ev" style={{width:"100%",borderRadius:"14px",display:"block"}}/>
            <button onClick={()=>{setFoto(null);setShowCam(true);}}
              style={{position:"absolute",top:"8px",right:"8px",background:"rgba(0,0,0,0.7)",
                border:"none",borderRadius:"20px",color:"#fff",padding:"5px 11px",fontSize:"11px",cursor:"pointer"}}>
              🔄 Repetir
            </button>
          </div>
        )}

        <button onClick={confirmar} disabled={!foto||loading} style={btnP(!foto||loading)}>
          {loading?"Guardando…":foto?"📦 Confirmar devolución":"📷 Foto requerida"}
        </button>
    </div>
  </>);
}

// - PANEL ADMIN -
function AdminPanel({token,onClose,onEquipoCreado,perfilesAdmin=[],isSA=false}){
  const [tab,setTab]=useState("equipos"); // equipos | categorias | ingenieros
  // Equipo form
  const [nombre,setNombre]=useState(""),[serie,setSerie]=useState("");
  const [adminEq,setAdminEq]=useState(""); // admin responsable del equipo
  const [notas,setNotas]=useState(""); // notas y accesorios del equipo
  const [gerenciaEq,setGerenciaEq]=useState(""); // gerencia del equipo
  const [cat,setCat]=useState(""),[estadoB,setEstadoB]=useState("");
  const [ciudadB,setCiudadB]=useState(""),[sitio,setSitio]=useState("");
  const [loading,setLoading]=useState(false),[err,setErr]=useState("");
  const [nuevoEq,setNuevoEq]=useState(null); // para mostrar QR
  // Categorias
  const [cats,setCats]=useState([]),[nuevaCat,setNuevaCat]=useState("");
  const [loadCat,setLoadCat]=useState(false);
  // Perfiles
  const [perfiles,setPerfiles]=useState([]),[nuevoNombre,setNuevoNombre]=useState("");
  const [editPerfil,setEditPerfil]=useState(null);
  const [gerenciaPerfil,setGerenciaPerfil]=useState(""); // gerencia del usuario en edicion

  // Lista de equipos
  const [listaEqs,setListaEqs]=useState([]),[loadEqs,setLoadEqs]=useState(false);
  const [subTab,setSubTab]=useState("lista"); // lista | nuevo
  const [editEq,setEditEq]=useState(null); // equipo en edición

  useEffect(()=>{
    if(tab==="categorias")cargarCats();
    if(tab==="ingenieros")cargarPerfiles();
    if(tab==="equipos"){cargarEquipos();}
  },[tab]);

  async function cargarEquipos(){
    setLoadEqs(true);
    try{const r=await supa("equipos",{token,params:{order:"created_at.asc"}});setListaEqs(r||[]);}
    catch{}finally{setLoadEqs(false);}
  }

  async function guardarEdicion(){
    if(!editEq)return;
    try{
      await supa("equipos?id=eq."+editEq.id,{method:"PATCH",token,body:{
        nombre:editEq.nombre,
        serie:editEq.serie,
        estado_base:editEq.estado_base,
        ciudad_base:editEq.ciudad_base,
        sitio_base:editEq.sitio_base,
        admin_email:editEq.admin_email||null,
        notas:editEq.notas||null,
        gerencia:editEq.gerencia||null,
      }});
      setEditEq(null);cargarEquipos();onEquipoCreado();
    }catch(ex){alert("Error: "+ex.message);}
  }

  function exportarCSV(){
    var headers=["ID","Nombre","Serie","Categoria","Gerencia","Estado Base","Ciudad Base","Sitio Base","Administrador","Estatus"];
    var rows=listaEqs.map(function(eq){
      return [
        eq.id,
        eq.nombre,
        eq.serie,
        eq.categoria,
        eq.estado_base,
        eq.ciudad_base,
        eq.sitio_base,
        eq.gerencia||"Sin asignar",
        eq.admin_email||"Sin asignar",
        eq.activo?(eq.estatus==="reparacion"?"En reparación":"Activo"):"Eliminado"
      ].map(function(v){return '"'+(v||"").replace(/"/g,'""')+'"';}).join(",");
    });
    var csv=[headers.join(",")].concat(rows).join("\n");
    var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download="equipos_auditoria_"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function cambiarEstatus(eq,nuevoEstatus){
    var msg=nuevoEstatus==="reparacion"
      ?("Poner en reparacion: "+eq.nombre+"?\nNo estara disponible para los ingenieros.")
      :("Reactivar: "+eq.nombre+"?\nVolvera a estar disponible.");
    if(!confirm(msg))return;
    try{
      await supa("equipos?id=eq."+eq.id,{method:"PATCH",token,body:{estatus:nuevoEstatus}});
      cargarEquipos();onEquipoCreado();
    }catch(ex){alert("Error: "+ex.message);}
  }

  async function eliminarEquipo(eq){
    if(!confirm("Eliminar: "+eq.nombre+"?\n\nEsta accion no se puede deshacer.\nEl equipo dejara de aparecer en el dashboard."))return;
    try{
      await supa("equipos?id=eq."+eq.id,{method:"PATCH",token,body:{activo:false}});
      cargarEquipos();onEquipoCreado();
    }catch(ex){alert("Error: "+ex.message);}
  }

  async function cargarCats(){
    setLoadCat(true);
    try{const r=await supa("categorias",{token,params:{order:"nombre.asc"}});setCats(r||[]);}
    catch{}finally{setLoadCat(false);}
  }

  async function crearCat(){
    if(!nuevaCat.trim())return;
    try{
      await supa("categorias",{method:"POST",token,body:{nombre:nuevaCat.trim()}});
      setNuevaCat("");cargarCats();
    }catch(ex){alert("Error: "+ex.message);}
  }

  async function borrarCat(id){
    if(!confirm("¿Eliminar esta categoría?"))return;
    try{await supa(`categorias?id=eq.${id}`,{method:"DELETE",token});cargarCats();}
    catch(ex){alert("Error: "+ex.message);}
  }

  async function cargarPerfiles(){
    try{
      // Cargar todos los perfiles  la política RLS permite al admin ver todos
      const r=await supa("perfiles",{token,params:{order:"nombre.asc",select:"*"}});
      setPerfiles(r||[]);
    }catch(ex){console.error("Error cargando perfiles:",ex.message);}
  }

  async function guardarNombre(perfil){
    if(!nuevoNombre.trim())return;
    try{
      await supa(`perfiles?id=eq.${perfil.id}`,{method:"PATCH",token,body:{
        nombre:nuevoNombre.trim(),
        gerencia:gerenciaPerfil||null,
      }});
      setEditPerfil(null);setNuevoNombre("");setGerenciaPerfil("");cargarPerfiles();
    }catch(ex){alert("Error: "+ex.message);}
  }

  async function cambiarRol(perfil,nuevoRol){
    if(perfil.rol===nuevoRol)return;
    if(!confirm("Cambiar rol de "+perfil.nombre+" a "+nuevoRol+"?"))return;
    try{
      const res=await fetch(SUPA_URL+"/rest/v1/rpc/cambiar_rol_usuario",{
        method:"POST",
        headers:{
          "apikey":SUPA_KEY,
          "Content-Type":"application/json",
          "Authorization":"Bearer "+token
        },
        body:JSON.stringify({target_email:perfil.email,nuevo_rol:nuevoRol}),
      });
      if(!res.ok){
        const d=await res.json();
        throw new Error(d.message||d.hint||"Error al cambiar rol");
      }
      alert("Rol actualizado. El usuario debe cerrar sesion y volver a entrar para que aplique.");
      cargarPerfiles();
    }catch(ex){alert("Error: "+ex.message);}
  }

  async function crearEquipo(){
    if(!nombre||!serie||!cat||!estadoB||!ciudadB||!sitio){setErr("Todos los campos son requeridos");return;}
    setLoading(true);setErr("");
    try{
      const existentes=await supa("equipos",{token,params:{select:"id",order:"created_at.desc",limit:"1"}});
      let next=1;
      if(existentes&&existentes.length>0){
        const num=parseInt(existentes[0].id.replace("EQ-",""))||0;next=num+1;
      }
      const id=`EQ-${String(next).padStart(3,"0")}`;
      const eq={id,nombre,serie,categoria:cat,estado_base:estadoB,ciudad_base:ciudadB,sitio_base:sitio,activo:true,admin_email:adminEq||null,notas:notas.trim()||null,gerencia:gerenciaEq||null};
      await supa("equipos",{method:"POST",token,body:eq});
      setNuevoEq(eq);
      onEquipoCreado();
      setNombre("");setSerie("");setCat("");setEstadoB("");setCiudadB("");setSitio("");
    }catch(ex){
      setErr(ex.message);
      // Reset captcha para que el usuario pueda intentar de nuevo
      setCaptchaToken(null);
      if(window.hcaptcha&&captchaRef.current){
        try{window.hcaptcha.reset(captchaRef.current);}catch{}
      }
    }
    finally{setLoading(false);}
  }

  return(<>
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,background:"rgba(0,0,0,0.6)"}} onClick={onClose}/>
    {nuevoEq&&<QRLabel equipo={nuevoEq} onCerrar={()=>setNuevoEq(null)}/>}
    <div style={{position:"fixed",top:"6vh",left:0,right:0,zIndex:10000,
      width:"100%",boxSizing:"border-box",
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:"22px",
      padding:"24px 20px",maxWidth:"600px",margin:"0 auto",maxHeight:"88vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"18px"}}>
          <div>
            <p style={{color:C.blue,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
              PANEL ADMINISTRADOR
            </p>
            <h2 style={{color:C.text,margin:0,fontSize:"18px",fontWeight:"800"}}>Gestión</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>

        {/* Tabs admin */}
        <div style={{display:"flex",gap:"6px",marginBottom:"20px"}}>
          {[{k:"equipos",l:"⚡ Equipos"},{k:"categorias",l:"🏷 Categorías"},{k:"ingenieros",l:"👤 Ingenieros"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{flex:1,padding:"8px 4px",background:tab===t.k?C.subtle:"transparent",
                border:`1px solid ${tab===t.k?C.border:"transparent"}`,
                borderRadius:"9px",color:tab===t.k?C.text:C.muted,
                fontWeight:"700",fontSize:"11px",cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Tab: Equipos  sub-tabs */}
        {tab==="equipos"&&<div>
          <div style={{display:"flex",gap:"6px",marginBottom:"14px"}}>
            {[{k:"lista",l:"📋 Lista"},{k:"nuevo",l:"➕ Nuevo"}].map(t=>(
              <button key={t.k} onClick={()=>setSubTab(t.k)}
                style={{flex:1,padding:"9px",
                  background:subTab===t.k?C.green:"transparent",
                  border:"1px solid "+(subTab===t.k?C.green:C.border),
                  borderRadius:"10px",
                  color:subTab===t.k?"#001a0d":C.muted,
                  fontWeight:"700",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Sub-tab: Lista */}
          {subTab==="lista"&&(loadEqs?<Spin/>:
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {listaEqs.length>0&&<button onClick={exportarCSV}
                style={{width:"100%",padding:"10px",background:"transparent",
                  border:"1px solid "+C.green+"44",borderRadius:"10px",
                  color:C.green,cursor:"pointer",fontSize:"12px",
                  fontWeight:"700",fontFamily:"inherit",marginBottom:"4px"}}>
                📊 Exportar CSV de auditoría ({listaEqs.length} equipos)
              </button>}
              {listaEqs.length===0&&<p style={{textAlign:"center",color:C.muted,padding:"20px",fontSize:"13px"}}>
                Sin equipos registrados
              </p>}
              {listaEqs.map(function(eq){
                var enRep=eq.estatus==="reparacion";
                var inactivo=!eq.activo;
                return(
                  <div key={eq.id} style={{background:"#12121f",
                    border:"1px solid "+(enRep?"#ff950044":inactivo?"#ff3b3b33":C.border),
                    borderRadius:"12px",padding:"12px 14px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",flexWrap:"wrap"}}>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:C.muted,
                            background:"#0a0a18",padding:"2px 6px",borderRadius:"4px"}}>{eq.id}</span>
                          {enRep&&<span style={{fontSize:"10px",color:C.orange,background:C.orangeDk,
                            padding:"2px 8px",borderRadius:"20px",fontWeight:"700"}}>🔧 Reparación</span>}
                          {inactivo&&<span style={{fontSize:"10px",color:C.red,background:"#1a0000",
                            padding:"2px 8px",borderRadius:"20px",fontWeight:"700"}}>❌ Eliminado</span>}
                          {!enRep&&!inactivo&&<span style={{fontSize:"10px",color:C.green,background:C.greenDk,
                            padding:"2px 8px",borderRadius:"20px",fontWeight:"700"}}>✓ Activo</span>}
                        </div>
                        <p style={{fontSize:"13px",fontWeight:"700",color:C.text,margin:"0 0 2px",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eq.nombre}</p>
                        <p style={{fontSize:"11px",color:C.muted,margin:0}}>{eq.categoria}</p>
                        <p style={{fontSize:"10px",color:C.muted,margin:"2px 0 0",
                          fontFamily:"'JetBrains Mono',monospace",fontSize:"12px"}}>Base: {eq.ciudad_base} · {eq.sitio_base}{eq.gerencia&&<span style={{color:"#9966ff",marginLeft:"8px",fontSize:"11px"}}>· {eq.gerencia}</span>}</p>
                        {eq.admin_email&&<p style={{fontSize:"10px",color:C.blue,margin:"2px 0 0"}}>
                          👤 Admin: {eq.admin_email}
                        </p>}
                      </div>
                    </div>
                    {eq.activo&&<div style={{display:"flex",gap:"6px",marginTop:"10px",
                      paddingTop:"10px",borderTop:"1px solid "+C.border}}>
                      {!enRep?(
                        <button onClick={function(){cambiarEstatus(eq,"reparacion");}}
                          style={{flex:1,padding:"8px",background:"transparent",
                            border:"1px solid "+C.orange+"44",borderRadius:"8px",
                            color:C.orange,cursor:"pointer",fontSize:"11px",
                            fontWeight:"700",fontFamily:"inherit"}}>
                          🔧 Reparación
                        </button>
                      ):(
                        <button onClick={function(){cambiarEstatus(eq,"activo");}}
                          style={{flex:1,padding:"8px",background:"transparent",
                            border:"1px solid "+C.green+"44",borderRadius:"8px",
                            color:C.green,cursor:"pointer",fontSize:"11px",
                            fontWeight:"700",fontFamily:"inherit"}}>
                          ✓ Reactivar
                        </button>
                      )}
                      <button onClick={function(){eliminarEquipo(eq);}}
                        style={{flex:1,padding:"8px",background:"transparent",
                          border:"1px solid "+C.red+"44",borderRadius:"8px",
                          color:C.red,cursor:"pointer",fontSize:"11px",
                          fontWeight:"700",fontFamily:"inherit"}}>
                        🗑 Eliminar
                      </button>
                      <button onClick={function(){setEditEq(Object.assign({},eq));}}
                        style={{padding:"8px 10px",background:"transparent",
                          border:"1px solid "+C.blue+"44",borderRadius:"8px",
                          color:C.blue,cursor:"pointer",fontSize:"11px",fontFamily:"inherit",fontWeight:"700"}}>
                        ✏️
                      </button>
                      <button onClick={function(){setNuevoEq(eq);}}
                        style={{padding:"8px 10px",background:"transparent",
                          border:"1px solid "+C.border,borderRadius:"8px",
                          color:C.muted,cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                        QR
                      </button>
                    </div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sub-tab: Nuevo equipo */}
          {subTab==="nuevo"&&<div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                NOMBRE DEL EQUIPO <span style={{color:C.red}}>*</span>
              </label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Multímetro Fluke 87V" style={inp}/>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                NÚMERO DE SERIE <span style={{color:C.red}}>*</span>
              </label>
              <input value={serie} onChange={e=>setSerie(e.target.value)} placeholder="Ej. FL87V-2024-001" style={inp}/>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                CATEGORÍA <span style={{color:C.red}}>*</span>
              </label>
              <CatSelect token={token} value={cat} onChange={setCat}/>
            </div>
            <div style={{borderTop:"1px solid "+C.border,paddingTop:"14px"}}>
              <p style={{color:C.blue,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"}}>
                📍 UBICACIÓN BASE
              </p>
              <EstadoCiudad estado={estadoB} ciudad={ciudadB} onEstado={setEstadoB} onCiudad={setCiudadB}/>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                SITIO / EDIFICIO BASE <span style={{color:C.red}}>*</span>
              </label>
              <input value={sitio} onChange={e=>setSitio(e.target.value)} placeholder="Ej. Puente de Vigas  Piso 3" style={inp}/>
            </div>
            {err&&<p style={{color:C.red,fontSize:"13px",background:"#1a0000",padding:"10px 14px",borderRadius:"9px"}}>⚠️ {err}</p>}
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                GERENCIA
              </label>
              <select value={gerenciaEq} onChange={e=>setGerenciaEq(e.target.value)}
                style={{...inp,cursor:"pointer",color:gerenciaEq?C.text:C.muted}}>
                <option value="">Sin asignar</option>
                <option value="Centro-Sur">Centro-Sur</option>
                <option value="Norte-Occidente">Norte-Occidente</option>
              </select>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                NOTAS Y ACCESORIOS
              </label>
              <textarea value={notas} onChange={e=>setNotas(e.target.value)}
                placeholder="Ej: Incluye cable FC/APC, estuche rigido y manual..."
                rows={3}
                style={{...inp,resize:"vertical",lineHeight:"1.5"}}/>
              <p style={{color:"#555",fontSize:"10px",marginTop:"4px"}}>
                Esta nota sera visible para el ingeniero al hacer check-out.
              </p>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>
                ADMINISTRADOR RESPONSABLE
              </label>
              <select value={adminEq} onChange={e=>setAdminEq(e.target.value)}
                style={{...inp,cursor:"pointer",color:adminEq?C.text:C.muted}}>
                <option value="">Sin asignar</option>
                {perfilesAdmin.map(function(p){return(
                  <option key={p.id} value={p.email}>{p.nombre} — {p.email}</option>
                );})}
              </select>
            </div>
            <button onClick={crearEquipo} disabled={loading} style={btnP(loading)}>
              {loading?"Creando…":"✅ Crear equipo"}
            </button>
            <p style={{color:C.muted,fontSize:"11px",textAlign:"center"}}>
              Al crear el equipo se genera automáticamente su etiqueta QR.
            </p>
          </div>}
        </div>}

        {/* Tab: Categorías */}
        {tab==="categorias"&&<div>
          <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
            <input value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)}
              placeholder="Nueva categoría…" style={{...inp,flex:1}}
              onKeyDown={e=>e.key==="Enter"&&crearCat()}/>
            <button onClick={crearCat}
              style={{padding:"13px 18px",background:`linear-gradient(135deg,${C.green},#00c066)`,
                border:"none",borderRadius:"11px",color:"#001a0d",fontWeight:"800",
                cursor:"pointer",fontFamily:"inherit",fontSize:"20px"}}>+</button>
          </div>
          {loadCat?<Spin/>:(
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {cats.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:"#12121f",border:`1px solid ${C.border}`,borderRadius:"11px",padding:"12px 14px"}}>
                  <span style={{fontSize:"14px",color:C.text}}>🏷 {c.nombre}</span>
                  <button onClick={()=>borrarCat(c.id)}
                    style={{background:"transparent",border:`1px solid ${C.red}33`,borderRadius:"8px",
                      color:C.red,padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                    Borrar
                  </button>
                </div>
              ))}
              {cats.length===0&&<p style={{textAlign:"center",color:C.muted,padding:"20px",fontSize:"13px"}}>
                Sin categorías aún
              </p>}
            </div>
          )}
        </div>}

        {/* Tab: Ingenieros */}
        {tab==="ingenieros"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          <p style={{color:C.muted,fontSize:"12px",marginBottom:"4px"}}>
            {isSA?"Gestiona nombres, roles y gerencias de todos los usuarios.":"Edita el nombre y gerencia de cada usuario."}
          </p>
          {perfiles.map(function(p){
            var rolColor=p.rol==="super_admin"?C.green:p.rol==="admin"?C.blue:C.muted;
            var rolLabel=p.rol==="super_admin"?"Super Admin":p.rol==="admin"?"Admin":p.rol==="gerente"?"Gerente":"Ingeniero";
            var gerenciaColor="#9966ff";
            return(
            <div key={p.id} style={{background:"#12121f",border:"1px solid "+C.border,
              borderRadius:"11px",padding:"12px 14px"}}>
              {editPerfil===p.id?(
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  <div style={{display:"flex",gap:"8px"}}>
                    <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
                      style={{...inp,flex:1,padding:"9px 12px",fontSize:"13px"}}
                      placeholder="Nombre completo"/>
                    <button onClick={()=>guardarNombre(p)}
                      style={{padding:"9px 14px",background:"linear-gradient(135deg,"+C.green+",#00c066)",
                        border:"none",borderRadius:"9px",color:"#001a0d",fontWeight:"800",
                        cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                    <button onClick={()=>{setEditPerfil(null);setNuevoNombre("");setGerenciaPerfil("");}}
                      style={{padding:"9px 12px",background:"transparent",border:"1px solid "+C.border,
                        borderRadius:"9px",color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                  </div>
                  <div>
                    <p style={{fontSize:"10px",color:C.muted,marginBottom:"5px",letterSpacing:"0.08em"}}>GERENCIA</p>
                    <div style={{display:"flex",gap:"6px"}}>
                      {["","Centro-Sur","Norte-Occidente"].map(function(g){return(
                        <button key={g||"sin"} onClick={function(){setGerenciaPerfil(g);}}
                          style={{flex:1,padding:"7px 4px",fontSize:"11px",fontWeight:"700",
                            background:gerenciaPerfil===g?"#1a0a2a":"transparent",
                            border:"1px solid "+(gerenciaPerfil===g?"#9966ff":C.border),
                            borderRadius:"8px",color:gerenciaPerfil===g?"#9966ff":C.muted,
                            cursor:"pointer",fontFamily:"inherit"}}>
                          {g||"Ninguna"}
                        </button>
                      );})}
                    </div>
                  </div>
                  {isSA&&<div style={{display:"flex",gap:"6px"}}>
                    {["ingeniero","gerente","admin","super_admin"].map(function(r){
                      return <button key={r} onClick={()=>cambiarRol(p,r)}
                        style={{flex:1,padding:"7px",fontSize:"11px",fontWeight:"700",
                          background:p.rol===r?"#001a0d":"transparent",
                          border:"1px solid "+(p.rol===r?C.green:C.border),
                          borderRadius:"8px",color:p.rol===r?C.green:C.muted,
                          cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>
                        {r==="super_admin"?"Super Admin":r==="admin"?"Admin":r==="gerente"?"Gerente":"Ingeniero"}
                      </button>;
                    })}
                  </div>}
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                      <p style={{fontSize:"14px",fontWeight:"700",color:C.text,margin:0}}>{p.nombre}</p>
                      <span style={{fontSize:"10px",color:rolColor,background:rolColor+"22",
                        padding:"1px 7px",borderRadius:"20px",fontWeight:"700"}}>{rolLabel}</span>
                    </div>
                    <p style={{fontSize:"11px",color:C.muted,margin:0}}>{p.email}</p>
                    {p.gerencia&&<span style={{fontSize:"10px",color:"#9966ff",background:"#9966ff22",
                      padding:"1px 7px",borderRadius:"20px",fontWeight:"700",display:"inline-block",marginTop:"3px"}}>
                      🏢 {p.gerencia}
                    </span>}
                  </div>
                  {(isSA||(isAdmin&&(p.rol==="ingeniero"||p.rol==="gerente")))?<button onClick={function(){setEditPerfil(p.id);setNuevoNombre(p.nombre);setGerenciaPerfil(p.gerencia||"");}}
                    style={{background:"transparent",border:"1px solid "+C.border,borderRadius:"8px",
                      color:C.muted,padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
                    Editar
                  </button>:<span style={{fontSize:"11px",color:C.muted}}>-</span>}
                </div>
              )}
            </div>
          );})}
          {perfiles.length===0&&<p style={{textAlign:"center",color:C.muted,padding:"20px",fontSize:"13px"}}>
            Sin usuarios registrados aún
          </p>}
        </div>}
    </div>

    {editEq&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:19999,background:"rgba(0,0,0,0.6)"}} onClick={function(){setEditEq(null);}}/>}
    {editEq&&<div style={{position:"fixed",top:"6vh",left:0,right:0,zIndex:20000,
      width:"100%",boxSizing:"border-box",
      background:C.card,border:"1px solid "+C.border,
      borderRadius:"22px",
      padding:"24px 20px",maxWidth:"600px",margin:"0 auto",maxHeight:"88vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"16px"}}>
        <div>
          <p style={{color:C.blue,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 3px"}}>
            EDITAR EQUIPO
          </p>
          <h2 style={{color:C.text,margin:0,fontSize:"17px",fontWeight:"800"}}>{editEq.id}</h2>
        </div>
        <button onClick={function(){setEditEq(null);}} style={{background:"none",border:"none",color:C.muted,fontSize:"22px",cursor:"pointer"}}>x</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>NOMBRE</label>
          <input value={editEq.nombre}
            onChange={function(e){setEditEq(Object.assign({},editEq,{nombre:e.target.value}));}}
            style={inp}/>
        </div>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>NUMERO DE SERIE</label>
          <input value={editEq.serie}
            onChange={function(e){setEditEq(Object.assign({},editEq,{serie:e.target.value}));}}
            style={inp}/>
        </div>
        <div style={{borderTop:"1px solid "+C.border,paddingTop:"12px"}}>
          <p style={{color:C.blue,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"}}>
            UBICACION BASE
          </p>
          <EstadoCiudad
            estado={editEq.estado_base} ciudad={editEq.ciudad_base}
            onEstado={function(v){setEditEq(Object.assign({},editEq,{estado_base:v,ciudad_base:""}));}}
            onCiudad={function(v){setEditEq(Object.assign({},editEq,{ciudad_base:v}));}}/>
        </div>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>SITIO / EDIFICIO</label>
          <input value={editEq.sitio_base||""}
            onChange={function(e){setEditEq(Object.assign({},editEq,{sitio_base:e.target.value}));}}
            style={inp}/>
        </div>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>NOTAS Y ACCESORIOS</label>
          <textarea value={editEq.notas||""}
            onChange={function(e){setEditEq(Object.assign({},editEq,{notas:e.target.value}));}}
            placeholder="Ej: Incluye cable FC/APC, estuche rigido..."
            rows={3}
            style={{...inp,resize:"vertical",lineHeight:"1.5"}}/>
        </div>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>GERENCIA</label>
          <select value={editEq.gerencia||""}
            onChange={function(e){setEditEq(Object.assign({},editEq,{gerencia:e.target.value}));}}
            style={{...inp,cursor:"pointer",color:editEq.gerencia?C.text:C.muted}}>
            <option value="">Sin asignar</option>
            <option value="Centro-Sur">Centro-Sur</option>
            <option value="Norte-Occidente">Norte-Occidente</option>
          </select>
        </div>
        <div>
          <label style={{color:"#999",fontSize:"11px",letterSpacing:"0.08em",display:"block",marginBottom:"6px"}}>ADMINISTRADOR RESPONSABLE</label>
          <select value={editEq.admin_email||""}
            onChange={function(e){setEditEq(Object.assign({},editEq,{admin_email:e.target.value}));}}
            style={{...inp,cursor:"pointer",color:editEq.admin_email?C.text:C.muted}}>
            <option value="">Sin asignar</option>
            {perfilesAdmin.map(function(p){return(
              <option key={p.id} value={p.email}>{p.nombre} - {p.email}</option>
            );})}
          </select>
        </div>
        <button onClick={guardarEdicion} style={btnP(false)}>
          Guardar cambios
        </button>
      </div>
    </div>}
  </>);
}

// Selector de categoría con carga dinámica desde Supabase
function CatSelect({token,value,onChange}){
  const [cats,setCats]=useState([]);
  useEffect(()=>{
    supa("categorias",{token,params:{order:"nombre.asc"}}).then(r=>setCats(r||[])).catch(()=>{});
  },[]);
  return(
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{...inp,cursor:"pointer",color:value?C.text:C.muted}}>
      <option value="">Selecciona categoría…</option>
      {cats.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
    </select>
  );
}

// - MAPA -
function MapaModal({registros,equipos,onCerrar}){ // font heredado de App via Sora
  const mapRef=useRef(),mapInst=useRef();
  useEffect(()=>{
    if(!document.getElementById("lf-css")){
      const l=document.createElement("link");
      l.id="lf-css";l.rel="stylesheet";
      l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
    function init(){
      if(mapInst.current||!mapRef.current)return;
      const L=window.L;
      mapInst.current=L.map(mapRef.current,{zoomControl:true}).setView([23.5,-102],5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {attribution:"© OpenStreetMap",maxZoom:18}).addTo(mapInst.current);

      // Agrupar equipos disponibles y en reparación por estado base
      var porEstadoBase={};
      equipos.filter(function(eq){return !registros[eq.id];}).forEach(function(eq){
        var key=eq.estado_base;
        if(!porEstadoBase[key])porEstadoBase[key]={disponibles:[],reparacion:[]};
        if(eq.estatus==="reparacion"){porEstadoBase[key].reparacion.push(eq);}
        else{porEstadoBase[key].disponibles.push(eq);}
      });

      Object.entries(porEstadoBase).forEach(function(entry){
        var estado=entry[0], grupo=entry[1];
        var coords=COORDS_ESTADO[estado]; if(!coords)return;
        var totalDisp=grupo.disponibles.length, totalRep=grupo.reparacion.length;

        // Pin verde si hay disponibles, gris si solo hay en reparación
        if(totalDisp>0){
          var iconDisp=L.divIcon({className:"",
            html:'<div style="background:'+C.green+';color:#001a0d;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">'+(totalDisp>1?totalDisp:'✓')+'</div>',
            iconSize:[28,28],iconAnchor:[14,14]});
          var popupDisp='<div style="font-size:13px;font-family:sans-serif;min-width:180px"><b style="color:#00aa55">✅ Disponibles en '+estado+'</b><hr style="margin:5px 0">';
          popupDisp+=grupo.disponibles.map(function(eq){
            return '<b>'+eq.nombre+'</b><br><small>'+eq.sitio_base+' · '+eq.ciudad_base+'</small>';
          }).join("<hr style='margin:4px 0'>");
          popupDisp+='</div>';
          L.marker([coords[0]-0.05,coords[1]],{icon:iconDisp}).addTo(mapInst.current).bindPopup(popupDisp);
        }

        // Pin gris para equipos en reparación
        if(totalRep>0){
          var iconRep=L.divIcon({className:"",
            html:'<div style="background:#555;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🔧</div>',
            iconSize:[28,28],iconAnchor:[14,14]});
          var popupRep='<div style="font-size:13px;font-family:sans-serif;min-width:180px"><b style="color:#ff9500">🔧 En reparación en '+estado+'</b><hr style="margin:5px 0">';
          popupRep+=grupo.reparacion.map(function(eq){
            return '<b>'+eq.nombre+'</b><br><small>'+eq.sitio_base+'</small>';
          }).join("<hr style='margin:4px 0'>");
          popupRep+='</div>';
          L.marker([coords[0]+0.05,coords[1]],{icon:iconRep}).addTo(mapInst.current).bindPopup(popupRep);
        }
      });

      // Equipos en uso  agrupar por estado
      const porEstado={};
      equipos.filter(function(eq){return registros[eq.id];}).forEach(function(eq){
        const reg=registros[eq.id];
        const key=reg.estado;
        if(!porEstado[key])porEstado[key]=[];
        porEstado[key].push({eq:eq,reg:reg});
      });

      Object.entries(porEstado).forEach(function(entry){
        const estado=entry[0], items=entry[1];
        const coords=COORDS_ESTADO[estado];if(!coords)return;
        const tienePaq=items.some(function(x){return x.reg.tipo==="paqueteria";});
        const alerta=items.some(function(x){return getDiasNum(x.reg.fecha_retiro)>5;});
        const color=tienePaq?C.blue:alerta?C.red:C.orange;
        const icon=L.divIcon({className:"",
          html:'<div style="background:'+color+';color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.4)">'+items.length+'</div>',
          iconSize:[34,34],iconAnchor:[17,17]});
        const popup=items.map(function(x){
          return '<b>'+x.eq.nombre+'</b><br>👤 '+x.reg.ingeniero+'<br>📍 '+x.reg.ciudad+'<br>⏱ '+getDias(x.reg.fecha_retiro)+(x.reg.tipo==="paqueteria"?"<br>📦 En tránsito":"");
        }).join("<hr style='margin:5px 0'>");
        L.marker(coords,{icon}).addTo(mapInst.current)
          .bindPopup('<div style="font-size:13px;font-family:sans-serif;min-width:180px"><b style="color:'+C.orange+'">📍 '+estado+'</b><hr style="margin:5px 0">'+popup+'</div>');
      });
    }
    if(window.L){init();}
    else{
      const s=document.createElement("script");
      s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      s.onload=init;document.head.appendChild(s);
    }
    return function(){if(mapInst.current){mapInst.current.remove();}mapInst.current=null;};
  },[]);

  const enUso=Object.keys(registros).length;
  const enRep=equipos.filter(function(e){return e.estatus==="reparacion"&&!registros[e.id];}).length;
  const disponibles=equipos.length-enUso-enRep;
  return(
    <div style={{position:"fixed",inset:0,zIndex:15000,background:C.bg,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"18px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",
        background:`linear-gradient(180deg,${C.card},transparent)`}}>
        <div>
          <h2 style={{margin:0,fontSize:"17px",fontWeight:"800",color:C.text}}>🗺 Mapa de equipos</h2>
          <p style={{color:C.muted,fontSize:"11px",margin:"2px 0 0",fontFamily:"'JetBrains Mono',monospace"}}>
            {enUso} en campo · {disponibles} disponibles · OpenStreetMap (sin costo)
          </p>
        </div>
        <button onClick={onCerrar} style={{background:"#12121f",border:`1px solid ${C.border}`,
          borderRadius:"11px",color:"#aaa",padding:"8px 14px",cursor:"pointer",fontSize:"13px",fontFamily:"inherit"}}>
          ✕ Cerrar
        </button>
      </div>
      <div style={{display:"flex",gap:"10px",padding:"0 20px 10px",flexWrap:"wrap"}}>
        {[{c:C.green,l:"✓ Disponible"},{c:"#555",l:"🔧 Reparación"},{c:C.orange,l:"En uso"},{c:C.red,l:"+5 días"},{c:C.blue,l:"📦 Tránsito"}].map(function(x){return(
          <div key={x.l} style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"12px",height:"12px",borderRadius:"50%",background:x.c}}/>
            <span style={{fontSize:"10px",color:C.muted}}>{x.l}</span>
          </div>
        );})}
      </div>
      <div ref={mapRef} style={{flex:1}}/>
    </div>
  );
}

// - APP -
export default function App(){
  // Detectar token de recovery ANTES del primer render usando lazy useState
  const [recoveryToken] = useState(function(){
    try{
      var h = window.location.hash;
      if(h.indexOf("type=recovery")===-1) return null;
      var m = h.match(/access_token=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }catch(e){ return null; }
  });

  // Detectar equipoId en URL (?equipo=EQ-001) para QR
  const [qrEquipoId] = useState(function(){
    try{
      var params = new URLSearchParams(window.location.search);
      return params.get("equipo") || null;
    }catch(e){ return null; }
  });

  const [session,setSession]=useState(null);
  const sessionRef=useRef(null); // ref síncrono para evitar stale en RegistroNombre
  const [equipos,setEquipos]=useState([]);
  const [regsArr,setRegsArr]=useState([]);
  const [historial,setHistorial]=useState([]);
  const [perfiles,setPerfiles]=useState([]);
  const [loading,setLoading]=useState(false);
  const [sel,setSel]=useState(null);
  const [modo,setModo]=useState(null); // checkout|checkin|recepcion
  const [showAdmin,setShowAdmin]=useState(false);
  const [showMapa,setShowMapa]=useState(false);
  const [showGuia,setShowGuia]=useState(false);
  const [vista,setVista]=useState("equipos");
  const [filtro,setFiltro]=useState("todas");
  const [busq,setBusq]=useState("");
  const [filtroHistEq,setFiltroHistEq]=useState("");
  const [filtroHistIng,setFiltroHistIng]=useState("");
  const [imgZoom,setImgZoom]=useState(null);
  const [filtroGerencia,setFiltroGerencia]=useState(""); // filtro por gerencia

  function exportarActivosCSV(){
    // Exporta equipos filtrados por gerencia actual
    var lista=filtroGerencia
      ?equipos.filter(function(e){return (e.gerencia||"")===filtroGerencia;})
      :equipos;
    var headers=["ID","Nombre","Serie","Categoria","Gerencia","Estado Base","Ciudad Base","Sitio Base","Administrador","Estatus"];
    var rows=lista.map(function(eq){
      return [
        eq.id, eq.nombre, eq.serie, eq.categoria,
        eq.gerencia||"Sin asignar",
        eq.estado_base, eq.ciudad_base, eq.sitio_base,
        eq.admin_email||"Sin asignar",
        eq.activo?(eq.estatus==="reparacion"?"En reparacion":"Activo"):"Eliminado"
      ].map(function(v){return '"'+(String(v||"")).replace(/"/g,'""')+'"';}).join(",");
    });
    var sufijo=filtroGerencia?"_"+filtroGerencia.replace(/[^a-zA-Z0-9]/g,"_"):"_nacional";
    var csv=[headers.join(",")].concat(rows).join("\n");
    var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;
    a.download="lumo_activos"+sufijo+"_"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportarHistorialCSV(){
    var headers=["Equipo ID","Equipo","Ingeniero","Ciudad","Estado","Tipo","Fecha Retiro","Fecha Devolucion","Dias en uso","Guia Paqueteria"];
    var rows=historialFiltrado.map(function(h){
      return [
        h.equipo_id||"",
        h.equipo_nombre||"",
        h.ingeniero||"",
        h.ciudad||"",
        h.estado||"",
        h.tipo==="paqueteria"?"Paqueteria":"Retiro directo",
        h.fecha_retiro?fmt(h.fecha_retiro):"",
        h.fecha_devolucion?fmt(h.fecha_devolucion):"",
        h.dias||"",
        h.guia_paqueteria||"",
      ].map(function(v){return '"'+(String(v)).replace(/"/g,'""')+'"';}).join(",");
    });
    var filtro=(filtroHistEq||filtroHistIng)?("_filtro_"+(filtroHistEq||filtroHistIng).replace(/\s+/g,"_")):"_completo";
    var csv=[headers.join(",")].concat(rows).join("\n");
    var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;
    a.download="historial_lumo"+filtro+"_"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  const [toast,setToast]=useState(null);

  const isAdmin=isAdminOrSuper(session);
  const isSA=isSuperAdmin(session);
  const isGer=isGerente(session);
  const registros={};
  regsArr.forEach(r=>{registros[r.equipo_id]=r;});

  function showToast(msg,ok=true){setToast({msg,ok});setTimeout(()=>setToast(null),3200);}

  async function cargar(token,intento){
    setLoading(true);
    try{
      // allSettled: si una query falla, las demás siguen funcionando
      const [eqsR,regsR,histR,prfsR]=await Promise.allSettled([
        supa("equipos",{token,params:{order:"created_at.asc",activo:"eq.true"}}),
        supa("registros",{token,params:{order:"fecha_retiro.desc"}}),
        supa("historial",{token,params:{order:"fecha_devolucion.desc",limit:"50"}}),
        supa("perfiles",{token,params:{order:"nombre.asc",select:"*"}}),
      ]);

      // Extraer valores — usar [] si la query falló
      var eqList=eqsR.status==="fulfilled"?(eqsR.value||[]):[];
      var regs=regsR.status==="fulfilled"?(regsR.value||[]):[];
      var hist=histR.status==="fulfilled"?(histR.value||[]):[];
      var prfs=prfsR.status==="fulfilled"?(prfsR.value||[]):[];

      // Si todos fallaron y es el primer intento, reintentar una vez silenciosamente
      var todosFallaron=eqsR.status==="rejected"&&regsR.status==="rejected";
      if(todosFallaron&&!intento){
        setLoading(false);
        setTimeout(function(){cargar(token,1);},1500);
        return;
      }

      setEquipos(eqList);setRegsArr(regs);setHistorial(hist);setPerfiles(prfs);

      // Si venimos de un QR, abrir ese equipo automáticamente
      if(qrEquipoId){
        const eq=eqList.find(function(e){return e.id===qrEquipoId;});
        if(eq){
          const regsMap={};
          regs.forEach(function(r){regsMap[r.equipo_id]=r;});
          setSel(eq);
          const reg=regsMap[eq.id];
          if(!reg){setModo("checkout");}
          else if(reg.tipo==="paqueteria"){setModo("recepcion");}
          else{setModo("checkin");}
        }
      }
    }catch(ex){
      // Solo mostrar error si es el segundo intento
      if(intento){showToast("Error cargando datos. Recarga la página.",false);}
      else{setTimeout(function(){cargar(token,1);},1500);}
    }
    finally{setLoading(false);}
  }

  function handleLogin(s){
    sessionRef.current=s;
    setSession(s);
    // Si es gerente con gerencia asignada, pre-filtrar su dashboard
    if(getRolFromSession(s)==="gerente"&&s.gerencia){
      setFiltroGerencia(s.gerencia);
    }
    // Mostrar guía automáticamente en el primer login del usuario
    var guiaKey="lumo_guia_vista_"+s.email;
    if(!localStorage.getItem(guiaKey)){
      localStorage.setItem(guiaKey,"1");
      setTimeout(function(){playSound("guia");setShowGuia(true);},800);
    }
    if(!s.necesitaNombre) cargar(s.token);
  }
  function cerrar(){
    setSel(null);setModo(null);
    // Limpiar ?equipo=XXX de la URL al cerrar modal
    if(window.history&&window.history.replaceState){
      window.history.replaceState(null,"",window.location.pathname);
    }
  }
  function onAccion(msg){showToast(msg);cargar(session.token);cerrar();}

  async function abrir(eq){
    // Recargar registros frescos antes de abrir para evitar estado desactualizado
    try{
      const regs=await supa("registros",{token:session.token,params:{order:"fecha_retiro.desc"}});
      setRegsArr(regs||[]);
      const regFresco=(regs||[]).find(function(r){return r.equipo_id===eq.id;});
      setSel(eq);
      if(!regFresco){setModo("checkout");return;}
      if(regFresco.tipo==="paqueteria"){setModo("recepcion");return;}
      setModo("checkin");
    }catch(e){
      // Si falla la recarga usar estado local
      setSel(eq);
      const reg=registros[eq.id];
      if(!reg){setModo("checkout");return;}
      if(reg.tipo==="paqueteria"){setModo("recepcion");return;}
      setModo("checkin");
    }
  }

  const ciudadesEnUso=[...new Set(regsArr.map(r=>r.ciudad))].sort();
  const filtrados=equipos.filter(eq=>{
    const mb=eq.nombre.toLowerCase().includes(busq.toLowerCase())||eq.id.toLowerCase().includes(busq.toLowerCase());
    const reg=registros[eq.id];
    const enRep=eq.estatus==="reparacion";
    const mc=filtro==="todas"
      ||(filtro==="disponibles"&&!reg&&!enRep)
      ||(filtro==="reparacion"&&enRep)
      ||(reg&&reg.ciudad===filtro);
    // Filtro por gerencia (si está activo)
    const mg=!filtroGerencia||(eq.gerencia||"")=== filtroGerencia;
    return mb&&mc&&mg;
  });

  // Historial filtrado por gerencia también
  const equiposPorGerencia=filtroGerencia
    ?equipos.filter(function(e){return (e.gerencia||"")===filtroGerencia;}).map(function(e){return e.id;})
    :null;

  // Historial filtrado
  const historialFiltrado=historial.filter(function(h){
    var matchEq=!filtroHistEq||
      h.equipo_nombre.toLowerCase().includes(filtroHistEq.toLowerCase())||
      h.equipo_id.toLowerCase().includes(filtroHistEq.toLowerCase());
    var matchIng=!filtroHistIng||
      h.ingeniero.toLowerCase().includes(filtroHistIng.toLowerCase());
    // Filtro por gerencia en historial
    var matchGer=!equiposPorGerencia||equiposPorGerencia.indexOf(h.equipo_id)!==-1;
    return matchEq&&matchIng&&matchGer;
  });

  // Equipos filtrados por gerencia para los indicadores
  const equiposFiltradosGer=filtroGerencia
    ?equipos.filter(function(e){return (e.gerencia||"")===filtroGerencia;})
    :equipos;
  const regsArrFiltrados=filtroGerencia
    ?regsArr.filter(function(r){
        var eq=equipos.find(function(e){return e.id===r.equipo_id;});
        return eq&&(eq.gerencia||"")===filtroGerencia;
      })
    :regsArr;
  const enUso=regsArrFiltrados.length;
  const enReparacion=equiposFiltradosGer.filter(function(e){return e.estatus==="reparacion"&&!registros[e.id];}).length;
  const disponibles=equiposFiltradosGer.length-enUso-enReparacion;

  // Si hay token de recovery, mostrar pantalla de nueva contraseña
  if(recoveryToken) return <NuevaContrasena token={recoveryToken}/>;

  if(!session)return <Login onLogin={handleLogin}/>;
  if(session.necesitaNombre)return <RegistroNombre sessionTemp={session}
    token={sessionRef.current?sessionRef.current.token:session.token}
    onComplete={function(s){ sessionRef.current=s; setSession(s); cargar(s.token); }}/>;

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{background:${C.bg};-webkit-text-size-adjust:100%;text-size-adjust:100%}
      input,select,textarea{font-size:16px !important}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
      input::placeholder,textarea::placeholder{color:${C.muted}}
      select option{background:#12121f;color:#fff}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .eq-card{transition:transform 0.1s}
      .eq-card:active{transform:scale(0.985)}
    `}</style>

    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Sora',sans-serif",
      color:C.text,
      maxWidth:"600px",
      margin:"0 auto",paddingBottom:"80px"}}>

      {toast&&<Toast {...toast}/>}

      {/* Header */}
      <div style={{padding:"16px 16px 0",
        background:C.card,
        position:"sticky",top:0,zIndex:100,
        borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"38px",height:"38px",
              background:"radial-gradient(circle at 38% 32%, #003322, #000d07)",
              border:"1px solid #00e87a33",
              borderRadius:"11px",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
                <defs>
                  <radialGradient id="hls" cx="38%" cy="32%" r="68%"><stop offset="0%" stop-color="#003322"/><stop offset="100%" stop-color="#000d07"/></radialGradient>
                  <radialGradient id="hld" cx="38%" cy="28%" r="65%"><stop offset="0%" stop-color="#00ff88"/><stop offset="55%" stop-color="#00e87a"/><stop offset="100%" stop-color="#00a854"/></radialGradient>
                </defs>
                <circle cx="14" cy="14" r="13" fill="url(#hls)"/>
                <ellipse cx="14" cy="14" rx="13" ry="4" stroke="#00e87a" stroke-width="0.8" opacity="0.25" fill="none" transform="rotate(-25 14 14)"/>
                <path d="M 14 4 C 14 4 22 11 22 16 C 22 21 18.4 24 14 24 C 9.6 24 6 21 6 16 C 6 11 14 4 14 4 Z" fill="url(#hld)"/>
                <circle cx="11" cy="15.5" r="2.2" fill="#001a0d"/>
                <circle cx="17" cy="15.5" r="2.2" fill="#001a0d"/>
                <circle cx="12" cy="14" r="1" fill="white" opacity="0.9"/>
                <circle cx="18" cy="14" r="1" fill="white" opacity="0.9"/>
                <path d="M 10 19 Q 14 22 18 19" stroke="#001a0d" stroke-width="1.3" stroke-linecap="round" fill="none"/>
                <line x1="14" y1="4" x2="14" y2="1.5" stroke="#00e87a" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="14" cy="1" r="1.5" fill="#00e87a"/>
              </svg>
            </div>        <div>
              <h1 style={{fontSize:"17px",fontWeight:"800",lineHeight:1}}>Lumo</h1>
              <p style={{fontSize:"10px",color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>
                {session.nombre}
                {isAdmin&&<span style={{color:C.blue,marginLeft:"6px"}}>{isSA?"· SUPER ADMIN":"· ADMIN"}</span>}
                {isGer&&<span style={{color:"#9966ff",marginLeft:"6px"}}>· GERENTE</span>}
              </p>
            </div>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            {isAdmin&&(
              <button onClick={()=>setShowAdmin(true)}
                style={{background:"#0a0a20",border:`1px solid ${C.blue}44`,borderRadius:"10px",
                  padding:"8px 12px",cursor:"pointer",color:C.blue,
                  fontFamily:"'Sora',sans-serif",fontSize:"12px",fontWeight:"700"}}>
                ⚙️
              </button>
            )}
            <button onClick={()=>setShowMapa(true)}
              style={{display:"flex",alignItems:"center",gap:"5px",
                background:enUso>0?"#12121f":C.card,border:`1px solid ${C.border}`,
                borderRadius:"10px",padding:"8px 12px",cursor:"pointer",
                color:enUso>0?C.text:C.muted,fontFamily:"'Sora',sans-serif",fontSize:"12px",fontWeight:"700"}}>
              🗺
              {enUso>0&&<span style={{background:C.orange,color:"#1a0a00",borderRadius:"10px",
                padding:"1px 6px",fontSize:"10px",fontWeight:"800"}}>{enUso}</span>}
            </button>
            <button onClick={function(){playSound("guia");setShowGuia(true);}}
              style={{background:"transparent",border:"1px solid #00e87a33",
                borderRadius:"10px",padding:"6px 8px",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                animation:"lumiPulse 2.5s ease-in-out infinite"}}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <defs>
                  <radialGradient id="bls" cx="38%" cy="32%" r="68%"><stop offset="0%" stopColor="#003322"/><stop offset="100%" stopColor="#000d07"/></radialGradient>
                  <radialGradient id="bld" cx="38%" cy="28%" r="65%"><stop offset="0%" stopColor="#00ff88"/><stop offset="55%" stopColor="#00e87a"/><stop offset="100%" stopColor="#00a854"/></radialGradient>
                </defs>
                <circle cx="14" cy="14" r="13" fill="url(#bls)"/>
                <ellipse cx="14" cy="14" rx="13" ry="4" stroke="#00e87a" strokeWidth="0.8" opacity="0.25" fill="none" transform="rotate(-25 14 14)"/>
                <path d="M 14 4 C 14 4 22 11 22 16 C 22 21 18.4 24 14 24 C 9.6 24 6 21 6 16 C 6 11 14 4 14 4 Z" fill="url(#bld)"/>
                <circle cx="11" cy="15.5" r="2.2" fill="#001a0d"/><circle cx="17" cy="15.5" r="2.2" fill="#001a0d"/>
                <circle cx="12" cy="14" r="1" fill="white" opacity="0.9"/><circle cx="18" cy="14" r="1" fill="white" opacity="0.9"/>
                <path d="M 10 19 Q 14 22 18 19" stroke="#001a0d" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                <line x1="14" y1="4" x2="14" y2="1.5" stroke="#00e87a" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="14" cy="1" r="1.5" fill="#00e87a"/>
              </svg>
            </button>
            <button onClick={function(){
              // Limpiar todos los estados al cerrar sesión
              setSession(null);
              setEquipos([]); setRegsArr([]); setHistorial([]); setPerfiles([]);
              setFiltro("todas"); setBusq("");
              setFiltroGerencia("");
              setFiltroHistEq(""); setFiltroHistIng("");
              setVista("equipos");
              setSel(null); setModo(null);
              if(window.history&&window.history.replaceState){
                window.history.replaceState(null,"",window.location.pathname);
              }
            }}
              style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:"10px",
                padding:"8px 10px",cursor:"pointer",color:C.muted,fontSize:"13px"}}>↩</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
          {[{label:"Disponibles",val:disponibles,color:C.green,icon:"✓"},
            {label:"En uso",val:enUso,color:C.orange,icon:"↗"},
            {label:"Total",val:disponibles+enUso,color:"#aaa",icon:"#"}].map(s=>(
            <div key={s.label} style={{flex:1,
              background:s.color==="C.green"?C.card:C.card,
              border:"1px solid "+(s.val>0?s.color+"44":C.border),
              borderRadius:"14px",padding:"14px 8px",textAlign:"center",
              boxShadow:s.val>0?"0 0 12px "+s.color+"22":"none",
              transition:"all 0.3s"}}>
              <div style={{fontSize:"32px",fontWeight:"900",color:s.color,
                lineHeight:"1",letterSpacing:"-0.02em"}}>{s.val}</div>
              <div style={{fontSize:"10px",color:s.color,letterSpacing:"0.1em",
                textTransform:"uppercase",marginTop:"5px",fontWeight:"700",opacity:0.8}}>{s.label}</div>
            </div>
          ))}
        </div>

      {/* Tabs — SIEMPRE primero */}
      <div style={{display:"flex",padding:"0 16px 12px"}}>
        {["equipos","historial"].map(v=>(
          <button key={v} onClick={()=>setVista(v)}
            style={{flex:1,padding:"10px",background:vista===v?C.card:"transparent",
              border:"1px solid",borderColor:vista===v?C.border:"transparent",
              borderRadius:v==="equipos"?"10px 0 0 10px":"0 10px 10px 0",
              color:vista===v?C.green:C.muted,fontWeight:"700",fontSize:"12px",
              cursor:"pointer",letterSpacing:"0.05em",textTransform:"uppercase",
              fontFamily:"inherit",transition:"all 0.2s"}}>
            {v==="equipos"?"⚡ Equipos":"📋 Historial"}
          </button>
        ))}
      </div>

      {/* Export activos para gerente */}
      {isGer&&vista==="equipos"&&<div style={{padding:"0 16px 8px"}}>
        <button onClick={exportarActivosCSV}
          style={{width:"100%",padding:"10px",background:"transparent",
            border:"1px solid #9966ff44",borderRadius:"10px",
            color:"#9966ff",cursor:"pointer",fontSize:"12px",
            fontWeight:"700",fontFamily:"inherit"}}>
          📊 Exportar activos {filtroGerencia?"— "+filtroGerencia:"(Nacional)"} ({filtroGerencia?(equiposFiltradosGer.length):equipos.length} equipos)
        </button>
      </div>}

      {/* Búsqueda — solo en equipos */}
      {vista==="equipos"&&(
        <div style={{padding:"0 16px"}}>
          <input value={busq} onChange={e=>setBusq(e.target.value)}
            placeholder="Buscar equipo o código…"
            style={{...inp,marginBottom:"10px",fontSize:"14px"}}/>
        </div>
      )}

      {/* Filtros — una sola fila con scroll horizontal, solo en equipos */}
      {vista==="equipos"&&(
        <div style={{overflowX:"auto",paddingBottom:"10px",paddingLeft:"16px",
          scrollbarWidth:"none",WebkitOverflowScrolling:"touch",msOverflowStyle:"none"}}>
          <div style={{display:"flex",gap:"6px",paddingRight:"16px",width:"max-content",minWidth:"100%"}}>
            {(isAdmin||isGer)&&["","Centro-Sur","Norte-Occidente"].map(function(g){
              var activo=filtroGerencia===g;
              return(
                <button key={g||"nac"} onClick={function(){setFiltroGerencia(g);}}
                  style={{flexShrink:0,padding:"7px 13px",borderRadius:"20px",fontSize:"12px",fontWeight:"700",
                    cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                    border:"1px solid "+(activo?"#4a9eff":"#1a1a3a"),
                    background:activo?"#020d1a":"transparent",
                    color:activo?"#4a9eff":"#445"}}>
                  {g?"🏢 "+g:"🌎 Nacional"}
                </button>
              );
            })}
            {(isAdmin||isGer)&&<div style={{width:"1px",background:"#2a2a4a",flexShrink:0,margin:"4px 2px"}}/>}
            {[{key:"todas",label:"Todos"},{key:"disponibles",label:"Disponibles"},
              {key:"reparacion",label:"🔧 Reparación"},
              ...ciudadesEnUso.map(c=>({key:c,label:"📍 "+c}))].map(function(f){
              var activo=filtro===f.key;
              return(
                <button key={f.key} onClick={function(){setFiltro(f.key);}}
                  style={{flexShrink:0,padding:"7px 13px",
                    background:activo?C.green:"transparent",
                    border:"1px solid "+(activo?C.green:"#1a1a3a"),
                    borderRadius:"20px",cursor:"pointer",whiteSpace:"nowrap",
                    color:activo?"#001a0d":"#667",
                    fontWeight:activo?"700":"500",
                    fontSize:"12px",fontFamily:"inherit",transition:"all 0.15s"}}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* Lista equipos */}
      {vista==="equipos"&&(loading?<Spin/>:
        <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:"10px"}}>
          {filtrados.length===0&&(
            <div style={{textAlign:"center",padding:"50px 20px",color:C.muted}}>
              <div style={{fontSize:"36px",marginBottom:"10px"}}>🔍</div>
              <p style={{fontSize:"14px"}}>Sin resultados</p>
            </div>
          )}
          {filtrados.map((eq,i)=>{
            const reg=registros[eq.id];
            const alerta=reg&&getDiasNum(reg.fecha_retiro)>5;
            const esPaq=reg&&reg.tipo==="paqueteria";
            const enRep=eq.estatus==="reparacion";
            return(
              <div key={eq.id} className={enRep?"":"eq-card"}
                onClick={function(){if(!enRep&&!isGer)abrir(eq);}}
                style={{background:C.card,
                  border:"1px solid "+(enRep?"#ff950055":alerta?"#ff3b3b33":esPaq?"#4a9eff22":reg?"#ff950022":C.border),
                  borderRadius:"16px",padding:"16px",
                  cursor:enRep?"default":"pointer",
                  opacity:enRep?0.7:1,
                  animation:"slideUp 0.3s ease "+(i*0.04)+"s both",
                  position:"relative",overflow:"hidden"}}>
                {enRep&&<div style={{position:"absolute",top:0,left:0,right:0,height:"2px",
                  background:"linear-gradient(90deg,"+C.orange+",#ffcc00)"}}/>}
                {alerta&&!enRep&&<div style={{position:"absolute",top:0,left:0,right:0,height:"2px",
                  background:"linear-gradient(90deg,"+C.red+","+C.orange+")"}}/>}
                {esPaq&&<div style={{position:"absolute",top:0,left:0,right:0,height:"2px",
                  background:"linear-gradient(90deg,"+C.blue+",#2266cc)"}}/>}

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"5px",flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:C.muted,
                        background:"#12121f",padding:"2px 6px",borderRadius:"5px",flexShrink:0}}>{eq.id}</span>
                      <Badge reg={reg} enRep={enRep}/>
                      {enRep&&<span style={{fontSize:"10px",color:C.orange,background:C.orangeDk,
                        padding:"2px 8px",borderRadius:"20px",fontWeight:"700",flexShrink:0}}>🔧 Reparación</span>}
                    </div>
                    <h3 style={{fontSize:"14px",fontWeight:"700",marginBottom:"2px",color:"#eee",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eq.nombre}</h3>
                    <p style={{fontSize:"11px",color:C.muted}}>{eq.categoria} · Base: {eq.ciudad_base}</p>
                    {reg&&(
                      <div style={{marginTop:"10px",paddingTop:"10px",borderTop:`1px solid ${C.border}`}}>
                        <p style={{fontSize:"13px",color:"#aaa"}}>
                          👤 <strong style={{color:"#ddd"}}>{reg.ingeniero}</strong>
                        </p>
                        <p style={{fontSize:"13px",color:C.muted,marginTop:"3px"}}>
                          📍 {reg.ciudad}, {reg.estado} · {getDias(reg.fecha_retiro)}
                        </p>
                        {esPaq&&<p style={{fontSize:"13px",color:C.blue,marginTop:"3px",fontWeight:"700"}}>
                          📦 En tránsito{reg.guia_paqueteria?` · ${reg.guia_paqueteria}`:""}  Toca para confirmar recepción
                        </p>}
                        {alerta&&!esPaq&&<p style={{fontSize:"13px",color:C.red,marginTop:"4px",fontWeight:"700"}}>
                          ⚠️ +5 días  requiere atención
                        </p>}
                      </div>
                    )}
                    {enRep&&<p style={{fontSize:"13px",color:C.orange,marginTop:"6px",fontWeight:"700"}}>
                      🔧 En reparación  no disponible
                    </p>}
                  </div>
                  <div style={{width:"48px",height:"48px",
                    background:esPaq?C.blueDk:reg?C.orangeDk:C.greenDk,
                    borderRadius:"12px",flexShrink:0,marginLeft:"10px",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>
                    {esPaq?"📦":reg?"📤":"📥"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historial */}
      {vista==="historial"&&(loading?<Spin/>:
        <div style={{padding:"0 16px"}}>
          {historial.length>0&&<div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"12px"}}>
            <input value={filtroHistEq} onChange={e=>setFiltroHistEq(e.target.value)}
              placeholder="Filtrar por equipo..."
              style={{...inp,fontSize:"13px",padding:"10px 14px"}}/>
            <input value={filtroHistIng} onChange={e=>setFiltroHistIng(e.target.value)}
              placeholder="Filtrar por ingeniero..."
              style={{...inp,fontSize:"13px",padding:"10px 14px"}}/>
            {(filtroHistEq||filtroHistIng)&&<p style={{fontSize:"11px",color:C.muted}}>
              {historialFiltrado.length} resultado{historialFiltrado.length!==1?"s":""}
            </p>}
            {(isAdmin||isGer)&&<button onClick={exportarHistorialCSV}
              style={{width:"100%",padding:"10px",background:"transparent",
                border:"1px solid "+C.blue+"44",borderRadius:"10px",
                color:C.blue,cursor:"pointer",fontSize:"12px",
                fontWeight:"700",fontFamily:"inherit"}}>
              📊 Exportar CSV {(filtroHistEq||filtroHistIng)?"(filtro aplicado)":"(historial completo)"} — {historialFiltrado.length} registros
            </button>}
          </div>}
          {historialFiltrado.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
              <div style={{fontSize:"44px",marginBottom:"12px"}}>📋</div>
              <p style={{fontSize:"14px"}}>{historial.length===0?"Aún no hay devoluciones":"Sin resultados para ese filtro"}</p>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {historialFiltrado.map((h,i)=>(
                <div key={h.id} style={{background:C.card,border:`1px solid ${C.border}`,
                  borderRadius:"14px",overflow:"hidden",
                  animation:`slideUp 0.3s ease ${i*0.04}s both`}}>
                  <div style={{padding:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"10px",color:C.muted,
                        background:"#12121f",padding:"2px 6px",borderRadius:"5px"}}>{h.equipo_id}</span>
                      <span style={{fontSize:"10px",color:C.green,background:C.greenDk,
                        padding:"2px 8px",borderRadius:"20px",fontWeight:"700"}}>{h.dias} en uso</span>
                    </div>
                    <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"8px"}}>{h.equipo_nombre}</p>
                    <Row label="Ingeniero" value={h.ingeniero}/>
                    <Row label="Ciudad" value={`${h.ciudad}, ${h.estado}`}/>
                    {h.guia_paqueteria&&<Row label="Guía" value={h.guia_paqueteria}/>}
                    <Row label="Retiro" value={fmt(h.fecha_retiro)}/>
                    <Row label="Devolución" value={fmt(h.fecha_devolucion)} last/>
                  </div>
                  {(h.foto_retiro||h.foto_devolucion)&&(
                    <div style={{display:"flex",gap:"2px"}}>
                      {h.foto_retiro&&<div style={{flex:1,position:"relative",cursor:"pointer"}}
                        onClick={()=>setImgZoom(h.foto_retiro)}>
                        <img src={h.foto_retiro} alt="r" style={{width:"100%",height:"72px",objectFit:"cover",display:"block"}}/>
                        <span style={{position:"absolute",bottom:"4px",left:"4px",background:"rgba(0,0,0,0.75)",
                          fontSize:"9px",color:"#aaa",padding:"2px 5px",borderRadius:"4px"}}>📤 Retiro</span>
                        <span style={{position:"absolute",top:"4px",right:"4px",background:"rgba(0,0,0,0.6)",
                          fontSize:"11px",padding:"2px 5px",borderRadius:"4px"}}>🔍</span>
                      </div>}
                      {h.foto_devolucion&&<div style={{flex:1,position:"relative",cursor:"pointer"}}
                        onClick={()=>setImgZoom(h.foto_devolucion)}>
                        <img src={h.foto_devolucion} alt="d" style={{width:"100%",height:"72px",objectFit:"cover",display:"block"}}/>
                        <span style={{position:"absolute",bottom:"4px",left:"4px",background:"rgba(0,0,0,0.75)",
                          fontSize:"9px",color:"#aaa",padding:"2px 5px",borderRadius:"4px"}}>📦 Dev.</span>
                        <span style={{position:"absolute",top:"4px",right:"4px",background:"rgba(0,0,0,0.6)",
                          fontSize:"11px",padding:"2px 5px",borderRadius:"4px"}}>🔍</span>
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

    {/* Modal imagen ampliada */}
    {imgZoom&&<div style={{position:"fixed",inset:0,zIndex:20000,background:"rgba(0,0,0,0.95)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={()=>setImgZoom(null)}>
      <div style={{position:"relative",maxWidth:"100%",maxHeight:"100%"}}>
        <img src={imgZoom} alt="zoom" style={{maxWidth:"100%",maxHeight:"85vh",
          borderRadius:"12px",display:"block",objectFit:"contain"}}/>
        <button onClick={()=>setImgZoom(null)}
          style={{position:"absolute",top:"-12px",right:"-12px",width:"32px",height:"32px",
            background:C.card,border:"1px solid "+C.border,borderRadius:"50%",
            color:C.text,cursor:"pointer",fontSize:"16px",fontFamily:"inherit"}}>✕</button>
      </div>
    </div>}

    {/* Modales */}
    {showAdmin&&<AdminPanel token={session.token}
      perfilesAdmin={perfiles.filter(function(p){return p.rol==="admin"||p.rol==="super_admin";})}
      isSA={isSA}
      onClose={()=>setShowAdmin(false)}
      onEquipoCreado={()=>cargar(session.token)}/>}

    {modo==="checkout"&&sel&&<ModalCheckout equipo={sel} token={session.token}
      session={session} perfiles={perfiles}
      onConfirmar={onAccion} onCerrar={cerrar}/>}

    {modo==="recepcion"&&sel&&<ModalRecepcion equipo={sel} registro={registros[sel.id]}
      token={session.token} session={session}
      onConfirmar={onAccion} onCerrar={cerrar}/>}

    {modo==="checkin"&&sel&&<ModalCheckin equipo={sel} registro={registros[sel.id]}
      token={session.token} session={session}
      onConfirmar={onAccion} onCerrar={cerrar}/>}

    {showMapa&&<MapaModal registros={registros} equipos={equipos} onCerrar={()=>setShowMapa(false)}/>}

    {/* ── GUÍA RÁPIDA LUMI ── */}
    {showGuia&&<>
      <div style={{position:"fixed",inset:0,zIndex:19998,background:"rgba(0,0,0,0.7)"}}
        onClick={function(){setShowGuia(false);}}/>
      <div style={{position:"fixed",top:"6vh",left:0,right:0,zIndex:19999,
        width:"100%",boxSizing:"border-box",fontFamily:"'Sora',sans-serif"}}>
        <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:"22px",
          padding:"0",maxWidth:"600px",margin:"0 auto",
          maxHeight:"88vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

          {/* Header con Lumi completo (brazos y piernas) */}
          <div style={{background:"radial-gradient(circle at 30% 40%, #003322, #000d07)",
            borderRadius:"22px 22px 0 0",padding:"20px 20px 0",
            borderBottom:"1px solid #00e87a22",position:"relative",
            display:"flex",flexDirection:"column",alignItems:"center"}}>
            <button onClick={function(){setShowGuia(false);}}
              style={{position:"absolute",top:"14px",right:"14px",
                background:"transparent",border:"none",color:"#555",
                fontSize:"20px",cursor:"pointer",lineHeight:1,fontFamily:"inherit"}}>✕</button>
            {/* Lumi con cuerpo completo */}
            <div style={{filter:"drop-shadow(0 0 16px #00e87a55)",marginBottom:"-8px"}}>
              <svg width="120" height="140" viewBox="0 0 160 160" fill="none">
                <defs>
                  <radialGradient id="gls2" cx="38%" cy="32%" r="68%"><stop offset="0%" stopColor="#003322"/><stop offset="100%" stopColor="#000d07"/></radialGradient>
                  <radialGradient id="gld2" cx="38%" cy="28%" r="65%"><stop offset="0%" stopColor="#00ff88"/><stop offset="55%" stopColor="#00e87a"/><stop offset="100%" stopColor="#00a854"/></radialGradient>
                  <radialGradient id="glowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#00e87a" stopOpacity="0.12"/><stop offset="100%" stopColor="#00e87a" stopOpacity="0"/></radialGradient>
                </defs>
                {/* Glow fondo */}
                <circle cx="80" cy="75" r="65" fill="url(#glowG)"/>
                {/* Esfera base */}
                <circle cx="80" cy="75" r="52" fill="url(#gls2)"/>
                {/* Anillos orbitales */}
                <ellipse cx="80" cy="75" rx="63" ry="20" stroke="#00e87a" strokeWidth="1.2" opacity="0.22" fill="none" transform="rotate(-25 80 75)"/>
                <ellipse cx="80" cy="75" rx="63" ry="20" stroke="#4a9eff" strokeWidth="0.9" opacity="0.15" fill="none" transform="rotate(25 80 75)"/>
                {/* Puntos orbitales */}
                <circle cx="140" cy="58" r="3.5" fill="#00e87a" opacity="0.9"/>
                <circle cx="22" cy="95" r="2.5" fill="#4a9eff" opacity="0.8"/>
                {/* Brillo esfera */}
                <ellipse cx="64" cy="50" rx="14" ry="9" fill="white" opacity="0.08" transform="rotate(-20 64 50)"/>
                {/* Cuerpo gota */}
                <path d="M 80 26 C 80 26 112 55 112 76 C 112 95 97 110 80 110 C 63 110 48 95 48 76 C 48 55 80 26 80 26 Z" fill="url(#gld2)" opacity="0.96"/>
                {/* Brillo interno gota */}
                <ellipse cx="67" cy="52" rx="9" ry="13" fill="white" opacity="0.18" transform="rotate(-15 67 52)"/>
                {/* Visor oscuro */}
                <rect x="54" y="62" width="52" height="32" rx="10" fill="#001a0d" opacity="0.85"/>
                {/* Ojos */}
                <ellipse cx="67" cy="76" rx="8" ry="9" fill="#00e87a" opacity="0.95"/>
                <ellipse cx="93" cy="76" rx="8" ry="9" fill="#00e87a" opacity="0.95"/>
                <circle cx="67" cy="77" r="4" fill="#001a0d"/>
                <circle cx="93" cy="77" r="4" fill="#001a0d"/>
                <circle cx="70" cy="74" r="2" fill="white" opacity="0.9"/>
                <circle cx="96" cy="74" r="2" fill="white" opacity="0.9"/>
                {/* Sonrisa */}
                <path d="M 63 88 Q 80 97 97 88" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8"/>
                {/* Mejillas */}
                <ellipse cx="50" cy="82" rx="6" ry="3.5" fill="#00e87a" opacity="0.25"/>
                <ellipse cx="110" cy="82" rx="6" ry="3.5" fill="#00e87a" opacity="0.25"/>
                {/* Rayos / antenas */}
                <line x1="80" y1="26" x2="80" y2="10" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="80" cy="8" r="4" fill="#00e87a"/>
                <line x1="95" y1="32" x2="105" y2="18" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                <circle cx="106" cy="16" r="3" fill="#00e87a" opacity="0.8"/>
                <line x1="65" y1="32" x2="55" y2="18" stroke="#00e87a" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                <circle cx="54" cy="16" r="3" fill="#00e87a" opacity="0.8"/>
                {/* Brazos */}
                <path d="M 48 80 Q 34 72 37 62" stroke="url(#gld2)" strokeWidth="10" strokeLinecap="round" fill="none"/>
                <path d="M 112 80 Q 126 72 123 62" stroke="url(#gld2)" strokeWidth="10" strokeLinecap="round" fill="none"/>
                {/* Piernas */}
                <path d="M 68 108 Q 63 126 59 132" stroke="url(#gld2)" strokeWidth="9" strokeLinecap="round" fill="none"/>
                <path d="M 92 108 Q 97 126 101 132" stroke="url(#gld2)" strokeWidth="9" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <div style={{textAlign:"center",paddingBottom:"20px"}}>
              <p style={{fontSize:"11px",color:"#00e87a",fontWeight:"700",
                letterSpacing:"0.14em",textTransform:"uppercase",
                margin:"0 0 4px",fontFamily:"'Sora',sans-serif"}}>
                GUIA RAPIDA
              </p>
              <h2 style={{fontSize:"22px",fontWeight:"900",color:"#eee",
                margin:"0 0 4px",fontFamily:"'Sora',sans-serif"}}>
                Hola, soy Lumi
              </h2>
              <p style={{fontSize:"13px",color:"#555",margin:0,fontFamily:"'Sora',sans-serif"}}>
                Te explico como usar la app en segundos
              </p>
            </div>
          </div>

          {/* Contenido por rol */}
          <div style={{padding:"20px",fontFamily:"'Sora',sans-serif"}}>

            {/* INGENIERO */}
            {(!isAdmin&&!isGer)&&<>
              <p style={{fontSize:"11px",color:C.green,fontWeight:"700",
                letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px",
                fontFamily:"'Sora',sans-serif"}}>
                COMO INGENIERO
              </p>
              {[
                {icon:"📱",titulo:"Escanea el QR",desc:"Apunta la camara al QR del equipo. La app se abre directo en ese equipo."},
                {icon:"📸",titulo:"Foto obligatoria",desc:"Toma una foto clara del equipo antes de confirmar. Es tu evidencia."},
                {icon:"✅",titulo:"Confirma el retiro",desc:"Selecciona tu estado y ciudad, revisa el resumen y da Confirmar."},
                {icon:"🔄",titulo:"Para devolver",desc:"Escanea el QR de nuevo. El sistema detecta que el equipo esta contigo."},
                {icon:"📦",titulo:"Paqueteria",desc:"Badge azul 'En transito' significa que el equipo viene para ti. Escanea para confirmar."},
              ].map(function(s){return(
                <div key={s.titulo} style={{display:"flex",gap:"12px",padding:"12px 0",
                  borderBottom:"1px solid "+C.border}}>
                  <div style={{fontSize:"22px",flexShrink:0,width:"34px",textAlign:"center",
                    marginTop:"1px"}}>{s.icon}</div>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:"700",color:"#eee",
                      margin:"0 0 3px",fontFamily:"'Sora',sans-serif"}}>{s.titulo}</p>
                    <p style={{fontSize:"12px",color:"#666",margin:0,lineHeight:"1.6",
                      fontFamily:"'Sora',sans-serif"}}>{s.desc}</p>
                  </div>
                </div>
              );})}
              {/* Tips ingenieros */}
              <div style={{background:"#0a0a18",borderRadius:"12px",padding:"14px 16px",marginTop:"16px"}}>
                <p style={{fontSize:"10px",color:"#444",fontWeight:"700",letterSpacing:"0.1em",
                  textTransform:"uppercase",marginBottom:"10px",fontFamily:"'Sora',sans-serif"}}>
                  RECUERDA
                </p>
                {["La foto es obligatoria — te protege ante cualquier reclamacion de danos",
                  "Badge rojo +5 dias significa que llevas mucho tiempo con el equipo",
                  "Puedes buscar tu equipo por nombre o codigo en el buscador",
                  "Si el equipo tiene notas de accesorios, verifica que esten completos"
                ].map(function(t){return(
                  <p key={t} style={{fontSize:"12px",color:"#555",margin:"0 0 6px",
                    paddingLeft:"14px",position:"relative",lineHeight:"1.5",
                    fontFamily:"'Sora',sans-serif"}}>
                    <span style={{position:"absolute",left:0,color:C.green}}>·</span>{t}
                  </p>
                );})}
              </div>
            </>}

            {/* ADMIN */}
            {isAdmin&&<>
              <p style={{fontSize:"11px",color:C.blue,fontWeight:"700",
                letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px",
                fontFamily:"'Sora',sans-serif"}}>
                COMO ADMINISTRADOR
              </p>
              {[
                {icon:"⚙️",titulo:"Panel Admin",desc:"Icono de engranaje en el header para gestionar equipos, categorias e ingenieros."},
                {icon:"📤",titulo:"Asignar equipo",desc:"Toca un equipo disponible, selecciona el ingeniero y el tipo de traslado."},
                {icon:"🏢",titulo:"Filtrar por gerencia",desc:"Pills azules (Nacional / Centro-Sur / Norte-Occidente) — los indicadores se actualizan al filtrar."},
                {icon:"📊",titulo:"Exportar CSV",desc:"Panel Admin > Equipos > Lista > boton verde. Incluye gerencia y administrador."},
                {icon:"📋",titulo:"Historial filtrado",desc:"Filtra por equipo o ingeniero y exporta solo esos registros en CSV."},
                {icon:"👤",titulo:"Gestionar usuarios",desc:"Panel Admin > Ingenieros: nombres, gerencias y roles (super admin)."},
              ].map(function(s){return(
                <div key={s.titulo} style={{display:"flex",gap:"12px",padding:"12px 0",
                  borderBottom:"1px solid "+C.border}}>
                  <div style={{fontSize:"22px",flexShrink:0,width:"34px",textAlign:"center",
                    marginTop:"1px"}}>{s.icon}</div>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:"700",color:"#eee",
                      margin:"0 0 3px",fontFamily:"'Sora',sans-serif"}}>{s.titulo}</p>
                    <p style={{fontSize:"12px",color:"#666",margin:0,lineHeight:"1.6",
                      fontFamily:"'Sora',sans-serif"}}>{s.desc}</p>
                  </div>
                </div>
              );})}
              {/* Tips admin */}
              <div style={{background:"#0a0a18",borderRadius:"12px",padding:"14px 16px",marginTop:"16px"}}>
                <p style={{fontSize:"10px",color:"#444",fontWeight:"700",letterSpacing:"0.1em",
                  textTransform:"uppercase",marginBottom:"10px",fontFamily:"'Sora',sans-serif"}}>
                  TIPS ADMIN
                </p>
                {["Asigna un administrador responsable a cada equipo para trazabilidad regional",
                  "El CSV de equipos incluye gerencia — util para reportes a gerencia nacional",
                  "Los cambios de rol aplican en el proximo inicio de sesion del usuario",
                  "El historial muestra fotos de retiro y devolucion lado a lado para comparar"
                ].map(function(t){return(
                  <p key={t} style={{fontSize:"12px",color:"#555",margin:"0 0 6px",
                    paddingLeft:"14px",position:"relative",lineHeight:"1.5",
                    fontFamily:"'Sora',sans-serif"}}>
                    <span style={{position:"absolute",left:0,color:C.blue}}>·</span>{t}
                  </p>
                );})}
              </div>
            </>}

            {/* GERENTE */}
            {isGer&&<>
              <p style={{fontSize:"11px",color:"#9966ff",fontWeight:"700",
                letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"12px",
                fontFamily:"'Sora',sans-serif"}}>
                COMO GERENTE
              </p>
              {[
                {icon:"🏢",titulo:"Filtrar tu gerencia",desc:"Pills azules arriba del dashboard. Tu gerencia se pre-selecciona al entrar."},
                {icon:"📊",titulo:"Exportar activos",desc:"Boton morado debajo de los filtros — exporta equipos de tu gerencia en CSV."},
                {icon:"📋",titulo:"Historial filtrado",desc:"Filtra por equipo o ingeniero y exporta los movimientos de tu region."},
                {icon:"🗺",titulo:"Mapa en tiempo real",desc:"Icono de mapa en el header — ubicacion de todos los equipos con estado actual."},
              ].map(function(s){return(
                <div key={s.titulo} style={{display:"flex",gap:"12px",padding:"12px 0",
                  borderBottom:"1px solid "+C.border}}>
                  <div style={{fontSize:"22px",flexShrink:0,width:"34px",textAlign:"center",
                    marginTop:"1px"}}>{s.icon}</div>
                  <div>
                    <p style={{fontSize:"13px",fontWeight:"700",color:"#eee",
                      margin:"0 0 3px",fontFamily:"'Sora',sans-serif"}}>{s.titulo}</p>
                    <p style={{fontSize:"12px",color:"#666",margin:0,lineHeight:"1.6",
                      fontFamily:"'Sora',sans-serif"}}>{s.desc}</p>
                  </div>
                </div>
              );})}
              {/* Tips gerente */}
              <div style={{background:"#0a0a18",borderRadius:"12px",padding:"14px 16px",marginTop:"16px"}}>
                <p style={{fontSize:"10px",color:"#444",fontWeight:"700",letterSpacing:"0.1em",
                  textTransform:"uppercase",marginBottom:"10px",fontFamily:"'Sora',sans-serif"}}>
                  TIPS GERENTE
                </p>
                {["Los indicadores (Disponibles, En uso, Total) se actualizan al filtrar por gerencia",
                  "Badge rojo en el mapa = equipo con mas de 5 dias fuera — requiere atencion",
                  "El CSV de auditoria incluye el administrador responsable de cada equipo",
                  "No puedes hacer check-out — contacta al admin de zona si necesitas asignar un equipo"
                ].map(function(t){return(
                  <p key={t} style={{fontSize:"12px",color:"#555",margin:"0 0 6px",
                    paddingLeft:"14px",position:"relative",lineHeight:"1.5",
                    fontFamily:"'Sora',sans-serif"}}>
                    <span style={{position:"absolute",left:0,color:"#9966ff"}}>·</span>{t}
                  </p>
                );})}
              </div>
            </>}

            <p style={{textAlign:"center",fontSize:"11px",color:"#333",
              marginTop:"20px",fontStyle:"italic",fontFamily:"'Sora',sans-serif"}}>
              Cada activo en su lugar ✦ Lumo v0.27.0
            </p>
          </div>
        </div>
      </div>
    </>}

  </>);
}
