// supabase/functions/notificar-fuera-horario/index.ts
// Deploy: supabase functions deploy notificar-fuera-horario
// Se dispara desde los triggers de PostgreSQL (registros/historial)
// No requiere autenticación de usuario porque solo la llama el trigger interno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credenciales SMTP de Gmail (mismas que usa Supabase Auth)
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";

async function enviarCorreo(destinatario: string, asunto: string, htmlBody: string) {
  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  });

  await client.send({
    from: `Lumo <${SMTP_USER}>`,
    to: destinatario,
    subject: asunto,
    content: "auto",
    html: htmlBody,
  });

  await client.close();
}

function plantillaFueraHorario(data: any): string {
  const accionTexto = data.accion === "checkout" ? "retiro" : "devolucion";
  const emoji = data.accion === "checkout" ? "&#128228;" : "&#128229;";
  const nombreLinea = data.equipo_nombre
    ? `<br/>Equipo: <strong style="color:#fff;">${data.equipo_nombre}</strong>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#07070f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#07070f;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#07070f;border-radius:16px;overflow:hidden;border:1px solid #1c1c30;">

  <tr><td style="background-color:#111111;padding:20px;text-align:center;">
    <span style="color:#00e87a;font-family:Arial,sans-serif;font-size:22px;font-weight:bold;">Lumo</span><br/>
    <span style="color:#888888;font-family:Arial,sans-serif;font-size:12px;">Alerta de movimiento fuera de horario</span>
  </td></tr>

  <tr><td style="padding:24px;background-color:#07070f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background-color:#1a0e00;border-left:3px solid #ff9500;border-radius:8px;padding:14px 16px;">
        <span style="color:#ff9500;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;">
          ${emoji} Movimiento fuera de horario laboral
        </span>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#cccccc;">
        El ingeniero <strong style="color:#ffffff;">${data.ingeniero}</strong> hizo ${accionTexto}
        del equipo <strong style="color:#00e87a;">${data.equipo_id}</strong>${nombreLinea}<br/><br/>
        Fecha: <strong style="color:#ffffff;">${data.hora_local}</strong> (hora local del equipo)
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#666666;">
        Este movimiento ocurrio fuera del horario laboral (L-V 8:30am-6:30pm) o en fin de semana.
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background-color:#0a0a18;padding:14px 24px;text-align:center;border-top:1px solid #1c1c30;">
    <span style="font-family:Arial,sans-serif;font-size:11px;color:#555555;">Lumo - Axtel 2026</span>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { equipo_id, equipo_nombre, ingeniero, admin_email, accion, hora_local, registro_id } = body;

    if (!admin_email) {
      throw new Error("Falta admin_email");
    }

    const html = plantillaFueraHorario({ equipo_id, equipo_nombre, ingeniero, accion, hora_local });
    const asunto = `Lumo - Movimiento fuera de horario: ${equipo_id}`;

    await enviarCorreo(admin_email, asunto, html);

    return new Response(
      JSON.stringify({ ok: true, mensaje: "Notificación enviada" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Error enviando notificación:", err.message);
    return new Response(
      JSON.stringify({ ok: false, mensaje: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
