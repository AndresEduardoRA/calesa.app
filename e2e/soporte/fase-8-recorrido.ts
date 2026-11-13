// El terreno del recorrido de la Fase 8 (`e2e/fase-8-recorrido.spec.ts`), en la base del Supabase LOCAL y sin pasar por la pantalla: el del portal
// (la dueña y Pía con sus leads), dos asesoras en la rueda de la cola web, los ajustes de la cola, la web pública apagada (el job de revalidar no vacía
// la cola), una guía en borrador y la espera de repuestos. Todo lo que cambia lo guarda y lo deja como estaba.
import { CONTRASENA } from './alta'
import {
  PREFIJO_ROL_E2E,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './base'
import { limpiarPortal, prepararPortal, type TerrenoDelPortal } from './leads-portal'
import { limpiarEspera, sembrarEspera, type EsperaSembrada } from './repuestos-espera'
import { literal, sql } from './sql'

export type AsesoraDelRecorrido = { email: string; nombre: string; id: string }

export type TerrenoDeLaFase8 = TerrenoDelPortal & {
  proyecto: string
  aida: AsesoraDelRecorrido
  bruna: AsesoraDelRecorrido
  guia: { slug: string; titulo: string }
  espera: EsperaSembrada
  claveDelOrigen: string
  restaurarLaWeb: () => void
}

export const PREFIJO_DEL_TOKEN = 'e2efase8'

// El token de un visitante del recorrido (16 a 64 letras, `web.solicitar_asesor`).
export const tokenDe = (proyecto: string, n: number) =>
  `${PREFIJO_DEL_TOKEN}${proyecto}${String(n).padStart(3, '0')}`

const quitarSolicitudes = () =>
  sql(
    `delete from public.solicitudes_contacto_web where token_visitante like '${PREFIJO_DEL_TOKEN}%'`,
  )

const quitarGuias = () => sql(`delete from public.web_guias where slug like 'e2e-guia-recorrido-%'`)

// Una asesora de la rueda: ve y crea sus leads, su rol recibe turnos, tiene WhatsApp y está habilitada y disponible. Parte con una asignada y ninguna
// contactada (tasa 0 %), para que el turno del recorrido se note en el tablero.
async function asesora(
  proyecto: string,
  clave: string,
  nombre: string,
  whatsapp: string,
): Promise<AsesoraDelRecorrido> {
  const email = correoDePrueba(`${clave}-fase8-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Fase 8 ${clave} ${proyecto}`,
      clave: `e2e_fase8_${clave}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    // Como la asesora de verdad: crea leads (el bloque de turnos de Inicio se muestra con `leads.crear` o `web.cola.gestionar`).
    permisos: [{ clave: 'leads.ver', alcance: 'propios' }, 'leads.crear', 'web.cola.participar'],
  })
  const id = sql(`select id from public.perfiles where email = ${literal(email)}`)
  sql(`
    update public.perfiles set whatsapp_web = ${literal(whatsapp)} where id = ${literal(id)};
    update public.cola_web_asesores
       set habilitado = true, disponible = true, max_abiertas = null, prioridad = 0, orden = 0,
           ultima_asignacion_en = null, asignadas_total = 1, contactadas_total = 0, vencidas_total = 0
     where usuario_id = ${literal(id)};`)
  return { email, nombre, id }
}

// La cola encendida, 30 días de pegajoso y un WhatsApp de respaldo; la web pública apagada. Devuelve cómo dejarlas como estaban.
function fijarLaWeb(): () => void {
  const ajustes = sql(
    `select cola_activa::text || '|' || dias_pegajoso::text || '|' || coalesce(whatsapp_respaldo, '') from public.ajustes_web where id = 1`,
  )
  const [cola = 'true', dias = '30', respaldo = ''] = ajustes.split('|')
  const activa = sql(`select activa::text from public.integraciones where clave = 'web_publica'`)
  const config = sql(`select config::text from public.integraciones where clave = 'web_publica'`)
  sql(`
    update public.ajustes_web set cola_activa = true, dias_pegajoso = 30, whatsapp_respaldo = '+59175550199' where id = 1;
    update public.integraciones set activa = false where clave = 'web_publica';`)
  return () =>
    sql(`
      update public.ajustes_web
         set cola_activa = ${cola === 'true' ? 'true' : 'false'}, dias_pegajoso = ${String(Number(dias))},
             whatsapp_respaldo = ${respaldo === '' ? 'null' : literal(respaldo)}
       where id = 1;
      update public.integraciones set activa = ${activa === 'true' ? 'true' : 'false'}, config = ${literal(config)}::jsonb
       where clave = 'web_publica';`)
}

export async function prepararFase8(proyecto: string): Promise<TerrenoDeLaFase8> {
  quitarSolicitudes()
  quitarGuias()
  const claveDelOrigen = `fase8_${proyecto}`
  await limpiarEspera(claveDelOrigen)
  // Va primero: borra las personas de prueba y crea a la dueña (la primera persona nace dueña).
  const t = await prepararPortal(proyecto)
  await exigirEquipoSinAjenos()
  const aida = await asesora(proyecto, 'aida', 'Aida Recorrido', '+59175550105')
  const bruna = await asesora(proyecto, 'bruna', 'Bruna Recorrido', '+59175550106')
  const restaurarLaWeb = fijarLaWeb()
  const guia = {
    slug: `e2e-guia-recorrido-${proyecto}`,
    titulo: `E2E Guía del recorrido ${proyecto}`,
  }
  const doc = JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Cómo importar sin sorpresas.' }] },
    ],
  })
  sql(`insert into public.web_guias (slug, titulo, cuerpo_doc)
       values (${literal(guia.slug)}, ${literal(guia.titulo)}, ${literal(doc)}::jsonb)`)
  const espera = await sembrarEspera(proyecto, claveDelOrigen)
  return { ...t, proyecto, aida, bruna, guia, espera, claveDelOrigen, restaurarLaWeb }
}

export async function limpiarFase8(t: TerrenoDeLaFase8 | undefined): Promise<void> {
  if (!t) return
  quitarSolicitudes()
  quitarGuias()
  await limpiarEspera(t.claveDelOrigen)
  t.restaurarLaWeb()
  await limpiarPortal(t)
}

// Quién quedó con la solicitud más nueva de ese visitante (vacío si fue al respaldo).
export const asesoraDelToken = (token: string) =>
  sql(
    `select coalesce(usuario_id::text, '') from public.solicitudes_contacto_web where token_visitante = ${literal(token)} order by creado_en desc limit 1`,
  )

export const codigoDelToken = (token: string) =>
  sql(
    `select codigo from public.solicitudes_contacto_web where token_visitante = ${literal(token)} order by creado_en desc limit 1`,
  )
