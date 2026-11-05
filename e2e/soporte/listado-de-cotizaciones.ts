// El terreno del listado `/cotizaciones` (paso 4.16-4a): un origen con su fórmula, la dueña con un lead, tres personas (Ana «propios», quien sólo ve y quien no ve cotizaciones),
// dos vehículos y cotizaciones sembradas por SQL de cada clase. Lo deshace `limpiarGuardado()`; los roles, `borrarRolesDePrueba()`.
import { CONTRASENA } from './alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './base'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { prepararGuardado } from './cotizar-guardar'
import { crearLead } from './leads'
import { telefonoAlAzar } from './leads-alta'
import { literal, sql } from './sql'

export const TITULO_UNO = 'Listado Hilux uno'
export const TITULO_DOS = 'Listado Hilux dos'

export function crearVehiculoEn(origenId: string, titulo: string): string {
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origenId)}::uuid, ${literal(titulo)})`,
  )
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origenId)}::uuid and titulo = ${literal(titulo)}`,
  )
}

const nombreDelLead = (id: string): string =>
  sql(`select nombre from public.leads where id = ${literal(id)}::uuid`)

// Ana (ve y cotiza «propios» y ve leads «propios»), quien sólo ve cotizaciones de todos y quien no las ve.
async function prepararPersonas(proyecto: string, origenId: string) {
  const ana = correoDePrueba(`ana-listado-${proyecto}`)
  const soloVer = correoDePrueba(`solover-listado-${proyecto}`)
  const sinVer = correoDePrueba(`sinver-listado-${proyecto}`)
  for (const [email, nombre] of [
    [ana, 'Ana Propios'],
    [soloVer, 'Vera Sólo Ve'],
    [sinVer, 'Sara Sin Ver'],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  }
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado propios`, clave: 'e2e_listado_propios' },
    permisos: [
      { clave: 'leads.ver', alcance: 'propios' },
      'cotizaciones.crear',
      { clave: 'cotizaciones.ver', origenId, alcance: 'propios' },
    ],
  })
  await darRolDePrueba({
    email: soloVer,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado sólo ve`, clave: 'e2e_listado_solo_ve' },
    permisos: [{ clave: 'cotizaciones.ver', origenId, alcance: 'todos' }],
  })
  await darRolDePrueba({
    email: sinVer,
    rol: { nombre: `${PREFIJO_ROL_E2E}Listado sin ver`, clave: 'e2e_listado_sin_ver' },
    permisos: ['vehiculos.ver'],
  })
  return { ana, soloVer, sinVer }
}

export type TerrenoDelListado = Awaited<ReturnType<typeof prepararListado>>

// La dueña: tres preventas con lead y vehículo, una final en otro vehículo, una vieja sin vehículo (10 días: vencida con los 7 de vigencia) y doce más, para tener más de
// una página de a 10. Ana: dos, sobre su propio lead (total: 19 para la dueña y 2 para Ana).
export async function prepararListado(proyecto: string) {
  await borrarRolesDePrueba()
  const { origen, duena, lead: leadDeLaDuena } = await prepararGuardado(proyecto, 'listado')
  const personas = await prepararPersonas(proyecto, origen.id)
  const leadDeAna = await crearLead({
    nombre: `listado ana ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: personas.ana,
  })
  const vehiculos = {
    uno: crearVehiculoEn(origen.id, TITULO_UNO),
    dos: crearVehiculoEn(origen.id, TITULO_DOS),
  }
  const base = { origenId: origen.id, leadId: leadDeLaDuena, creadoPor: idDePersona(duena) }
  sembrarCotizaciones({ ...base, vehiculoId: vehiculos.uno, cuantas: 3 })
  sembrarCotizaciones({ ...base, vehiculoId: vehiculos.dos, cuantas: 1, clase: 'final', desde: 5 })
  sembrarCotizaciones({ ...base, cuantas: 1, desde: 14_400 })
  sembrarCotizaciones({ ...base, cuantas: 12, desde: 30 })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.uno,
    leadId: leadDeAna,
    creadoPor: idDePersona(personas.ana),
    cuantas: 2,
    desde: 10,
  })
  return {
    origen,
    duena,
    ...personas,
    vehiculos,
    nombreDelLeadDeLaDuena: nombreDelLead(leadDeLaDuena),
    nombreDelLeadDeAna: nombreDelLead(leadDeAna),
  }
}
