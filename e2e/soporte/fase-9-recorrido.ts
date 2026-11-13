// El terreno del recorrido de la Fase 9 (`e2e/fase-9-recorrido.spec.ts`), en la base del Supabase LOCAL y sin pasar por la pantalla: la dueña, una asesora con
// el rol que el recorrido necesita, el vehículo del inventario que se cotiza, un lead ajeno (el de la dueña) y la rueda de la cola web encendida. Lo que el
// recorrido produce —el lead, la cotización, la final, el pago, el turno contactado y la importación— lo crea la interfaz, no esto.
// Todo lo que cambia lo guarda y lo deja como estaba.
import { CONTRASENA } from './alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './base'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { codigoDePaisDeLaEmpresa, fijarCatalogosDeLead, telefonoAlAzar } from './leads-alta'
import { literal, sql } from './sql'
import { cargarVehiculos, vehiculoPorTitulo } from './vehiculos'

export type AsesoraDeLaFase9 = { email: string; nombre: string; id: string }

export type TerrenoDeLaFase9 = {
  proyecto: string
  duena: string
  nombreDeLaDuena: string
  duenaId: string
  asesora: AsesoraDeLaFase9
  subasta: string
  vehiculo: { id: string; titulo: string }
  // El lead de la dueña: lo ajeno que la asesora no ve en `/actividad` (R6b).
  leadDeLaDuena: string
  codigoDePais: string
  restaurarLaCola: () => void
  restaurarCatalogos: () => Promise<void>
}

export const NOMBRE_DE_LA_DUENA = 'Dora Fase 9'
export const NOMBRE_DE_LA_ASESORA = 'Ana Fase 9'
export const PREFIJO_DEL_TOKEN = 'e2efase9'

// El token de un visitante del recorrido (16 a 64 letras y dígitos, `web.solicitar_asesor`).
export const tokenDe = (proyecto: string, n: number) =>
  `${PREFIJO_DEL_TOKEN}${proyecto}${String(n).padStart(3, '0')}`

const quitarSolicitudes = () =>
  sql(
    `delete from public.solicitudes_contacto_web where token_visitante like '${PREFIJO_DEL_TOKEN}%'`,
  )

// La cola encendida para que el turno de R5b se pueda pedir. Devuelve cómo dejarla como estaba (no se toca `integraciones`: el turno se pide
// por la API pública, como en la Fase 8, con la web pública como esté).
function encenderLaCola(): () => void {
  const antes = sql(`select cola_activa::text from public.ajustes_web where id = 1`)
  sql(`update public.ajustes_web set cola_activa = true where id = 1`)
  return () =>
    sql(
      `update public.ajustes_web set cola_activa = ${antes === 'true' ? 'true' : 'false'} where id = 1`,
    )
}

// El vehículo entra con la fase inicial de su flujo (`_vehiculo_fase_de_entrada`); si quedó sin ninguna, se le pone: el panel de la unidad y la
// cadena la necesitan.
function asegurarLaFase(vehiculo: string, origen: string): void {
  sql(`
    update public.vehiculos v
       set fase_id = (select fa.id from public.fases fa
                        join public.flujos fl on fl.id = fa.flujo_id
                       where fl.origen_id = ${literal(origen)}::uuid and fl.ambito = 'vehiculos'
                         and fa.es_inicial and fa.activa limit 1)
     where v.id = ${literal(vehiculo)}::uuid and v.fase_id is null`)
  const fase = sql(
    `select coalesce(fase_id::text, '') from public.vehiculos where id = ${literal(vehiculo)}::uuid`,
  )
  if (fase === '') {
    throw new Error(`El vehículo del recorrido quedó sin fase en el origen ${origen}.`)
  }
}

// La asesora del recorrido: lo que le pide y nada más. El rol `asesor` de la semilla no alcanza (no trae `actividad.ver`,
// `logistica.pagos.editar` ni `cotizaciones.final.gestionar`). `logistica.pagos.confirmar` no está: confirmar un pago es de la
// otra cuenta (R4). La invitación aceptada la exige el destino de una importación (R7); el WhatsApp, la rueda de la cola (R5b).
async function crearLaAsesora(proyecto: string, subasta: string): Promise<AsesoraDeLaFase9> {
  const email = correoDePrueba(`asesora-fase9-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: NOMBRE_DE_LA_ASESORA,
    invitada: true,
  })
  sql(`update public.perfiles
          set invitacion_aceptada_en = now(), whatsapp_web = '+59175550109'
        where email = ${literal(email)}`)
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Fase 9 ${proyecto}`,
      clave: `e2e_fase9_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [
      'leads.crear',
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.editar', alcance: 'propios' },
      'cotizaciones.crear',
      { clave: 'cotizaciones.ver', alcance: 'propios' },
      { clave: 'cotizaciones.editar', alcance: 'propios' },
      // Marcar final exige, además del permiso, estar en la cartera del lead (`puede_actuar_lead` › `en_cartera`): la final de este
      // recorrido la marca la asesora, que es la dueña del lead que ella misma registró (D11).
      { clave: 'cotizaciones.final.gestionar', origenId: subasta },
      'actividad.ver',
      'web.cola.participar',
      { clave: 'vehiculos.ver', origenId: subasta },
      { clave: 'logistica.ver', origenId: subasta },
      { clave: 'logistica.pagos.ver', origenId: subasta },
      { clave: 'logistica.pagos.editar', origenId: subasta },
    ],
  })
  const id = sql(`select id from public.perfiles where email = ${literal(email)}`)
  return { email, nombre: NOMBRE_DE_LA_ASESORA, id }
}

export async function prepararFase9(proyecto: string): Promise<TerrenoDeLaFase9> {
  // Borrar antes de crear: el equipo tiene que quedar vacío para que la dueña nazca dueña.
  quitarSolicitudes()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()

  const duena = correoDePrueba(`duena-fase9-${proyecto}`)
  await crearDuenaDePrueba({
    email: duena,
    contrasena: CONTRASENA,
    nombre: NOMBRE_DE_LA_DUENA,
  })
  const duenaId = sql(`select id from public.perfiles where email = ${literal(duena)}`)

  const subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  const asesora = await crearLaAsesora(proyecto, subasta)

  const titulo = `E2E Fase 9 ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2021, atributos: { tipo_vehiculo: 'autos' } }])
  const vehiculoId = (await vehiculoPorTitulo(titulo))?.id ?? ''
  if (vehiculoId === '') {
    throw new Error(`No quedó cargado el vehículo ${titulo}.`)
  }
  asegurarLaFase(vehiculoId, subasta)

  const codigoDePais = await codigoDePaisDeLaEmpresa()
  const leadDeLaDuena = await crearLead({
    nombre: `Fase 9 ajeno ${proyecto}`,
    telefono: `${codigoDePais}${telefonoAlAzar()}`,
    deQuien: duena,
  })

  // La rueda: sólo la asesora recibe turnos (los demás nacen `habilitado = false`).
  sql(`update public.cola_web_asesores
          set habilitado = true, disponible = true, max_abiertas = null, prioridad = 0, orden = 0,
              ultima_asignacion_en = null
        where usuario_id = ${literal(asesora.id)}`)
  const restaurarLaCola = encenderLaCola()
  // El cupo de exportación es de 3 por hora y por persona: un reintento no choca con lo de la corrida anterior.
  sql(
    `delete from public.actividad where accion = 'datos.exportado' and actor_id = ${literal(duenaId)}`,
  )

  return {
    proyecto,
    duena,
    nombreDeLaDuena: NOMBRE_DE_LA_DUENA,
    duenaId,
    asesora,
    subasta,
    vehiculo: { id: vehiculoId, titulo },
    leadDeLaDuena,
    codigoDePais,
    restaurarLaCola,
    restaurarCatalogos: await fijarCatalogosDeLead(),
  }
}

export async function limpiarFase9(t: TerrenoDeLaFase9 | undefined): Promise<void> {
  if (!t) return
  // En orden inverso al de las referencias: lo del vehículo, el vehículo, lo de los leads y recién después las personas.
  sql(`
    delete from public.pagos where vehiculo_id = ${literal(t.vehiculo.id)}::uuid;
    delete from public.gastos where vehiculo_id = ${literal(t.vehiculo.id)}::uuid;
    delete from public.cotizaciones_revisiones r
      using public.cotizaciones c
      where c.id = r.cotizacion_id and c.vehiculo_id = ${literal(t.vehiculo.id)}::uuid;
    delete from public.cotizaciones where vehiculo_id = ${literal(t.vehiculo.id)}::uuid;
    delete from public.vehiculos where id = ${literal(t.vehiculo.id)}::uuid;
    delete from public.actividad where tabla = 'leads'
       and registro_id in (select id::text from public.leads where nombre like 'E2E %');
    delete from public.notificaciones where usuario_id = ${literal(t.asesora.id)};
    delete from public.importaciones_leads v using public.importaciones i
      where i.id = v.importacion_id and i.usuario_id = ${literal(t.duenaId)};
    delete from public.importaciones where usuario_id = ${literal(t.duenaId)};`)
  quitarSolicitudes()
  await borrarLeadsDePrueba()
  t.restaurarLaCola()
  await t.restaurarCatalogos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

// El código del turno de ese visitante (vacío si fue al respaldo).
export const codigoDelToken = (token: string) =>
  sql(
    `select coalesce(codigo, '') from public.solicitudes_contacto_web where token_visitante = ${literal(token)} order by creado_en desc limit 1`,
  )
