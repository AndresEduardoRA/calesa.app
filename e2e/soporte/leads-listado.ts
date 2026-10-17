// Lo que los e2e del listado de leads preparan y cambian en la base del Supabase LOCAL, sin pasar
// por la pantalla: el terreno (personas, campos y leads), un lead en la papelera, un campo apagado
// y los cursores. Las dos specs del listado comparten este terreno.
import { expect, type Locator, type Page } from '@playwright/test'
import { CONTRASENA, limpiarAlta, prepararAlta, type PersonasDelAlta } from './alta'
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { aLaVista } from './inventario'
import { crearLead, exigir } from './leads'
import {
  codigoDePaisDeLaEmpresa,
  crearCampoDePrueba,
  leadsConTelefono,
  telefonoAlAzar,
} from './leads-alta'

// Los nombres de los leads del terreno: el prefijo «E2E » lo pone `crearLead()`.
export const PROPIO_BERTA = 'Propio Berta'
export const AJENO_CARLOS = 'Ajeno Carlos'
export const PROPIO_DALIA = 'Propio Dalia'
export const CI_DE_CARLOS = 'CI-CARLOS-7788'

export type TerrenoDelListado = {
  personas: PersonasDelAlta
  // Tiene la app pero no `leads.ver`.
  sinVer: string
  codigo: string
  telefonoDeCarlos: string
  numeroDeBerta: number
  // El número propio de ese lead (Berta no tiene el permiso del global: sólo ve éste).
  numeroPropioDeBerta: number
  restaurar: () => Promise<void>
}

export const nombre = (corto: string) => `E2E ${corto}`

// Un lead en la tabla (escritorio) o en las tarjetas (celular): sólo lo que se ve.
export const fila = (page: Page, corto: string): Locator =>
  aLaVista(page.getByText(nombre(corto), { exact: true }))
export const filas = (page: Page): Locator => aLaVista(page.locator('tbody tr, li article'))
export const delLead = (page: Page, corto: string): Locator =>
  aLaVista(page.locator('tr, article').filter({ hasText: nombre(corto) }))
export const sinResultados = (page: Page): Locator =>
  aLaVista(page.getByText('Nada coincide con los filtros'))

export const buscar = (texto: string) => `?${new URLSearchParams({ q: texto }).toString()}`

export async function irALeads(page: Page, consulta = ''): Promise<void> {
  await page.goto(`/leads${consulta}`)
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeAttached()
}

export async function numeroDe(telefono: string): Promise<number> {
  const [lead] = await leadsConTelefono(telefono)
  return lead?.numero ?? 0
}

export async function numeroPropioDe(telefono: string): Promise<number> {
  const [lead] = await leadsConTelefono(telefono)
  return lead?.numero_propio ?? 0
}

// Las personas del alta (la dueña, dos asesoras que ven lo suyo, una que ve «todos»), una más sin
// `leads.ver`, tres campos propios y tres leads: uno de Berta, uno de Carlos con la cédula privada
// y uno de la dueña.
export async function prepararListado(proyecto: string): Promise<TerrenoDelListado> {
  const terreno = await prepararAlta(proyecto)
  const codigo = await codigoDePaisDeLaEmpresa()
  const sinVer = correoDePrueba(`sinver-listado-${proyecto}`)
  await crearPersona({
    email: sinVer,
    contrasena: CONTRASENA,
    nombre: 'Sin Ver Listado',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinVer,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Listado sin ver ${proyecto}`,
      clave: `e2e_listado_sinver_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: ['chat.participar'],
  })

  // Un dato privado (la cédula) y uno que ve quien ve el lead (el color), los dos en la tabla y
  // filtrables; y una ciudad con muchas opciones.
  await crearCampoDePrueba({
    clave: 'e2e_ci',
    etiqueta: 'Cédula E2E',
    tipo: 'documento',
    soloCartera: true,
    enTabla: true,
    filtrable: true,
  })
  await crearCampoDePrueba({
    clave: 'e2e_color',
    etiqueta: 'Color E2E',
    tipo: 'texto',
    enTabla: true,
    filtrable: true,
  })
  await crearCampoDePrueba({
    clave: 'e2e_ciudad',
    etiqueta: 'Ciudad de nacimiento E2E',
    tipo: 'opcion',
    filtrable: true,
    opciones: opcionesDePrueba(60),
  })

  const telefono = () => `${codigo}${telefonoAlAzar()}`
  const telefonoDeBerta = telefono()
  await crearLead({
    nombre: PROPIO_BERTA,
    telefono: telefonoDeBerta,
    deQuien: terreno.personas.berta,
    atributos: { e2e_color: 'rojo' },
  })
  const telefonoDeCarlos = telefono()
  await crearLead({
    nombre: AJENO_CARLOS,
    telefono: telefonoDeCarlos,
    deQuien: terreno.personas.carlos,
    atributos: { e2e_ci: CI_DE_CARLOS, e2e_color: 'azul', e2e_ciudad: 'op_42' },
  })
  await crearLead({
    nombre: PROPIO_DALIA,
    telefono: telefono(),
    deQuien: terreno.personas.duena,
  })
  return {
    personas: terreno.personas,
    sinVer,
    codigo,
    telefonoDeCarlos,
    numeroDeBerta: await numeroDe(telefonoDeBerta),
    numeroPropioDeBerta: await numeroPropioDe(telefonoDeBerta),
    restaurar: terreno.restaurarCatalogos,
  }
}

export const limpiarListado = (terreno: TerrenoDelListado | undefined) =>
  limpiarAlta(terreno?.restaurar ?? (async () => {}))

// Lo manda a la papelera como lo vería la RLS: `eliminado_en` puesto (el listado no lo trae).
export async function mandarALaPapelera(leadId: string): Promise<void> {
  const { error } = await admin()
    .from('leads')
    .update({ eliminado_en: new Date().toISOString() })
    .eq('id', leadId)
  exigir(error, 'mandar el lead a la papelera')
}

export async function activarCampo(clave: string, activo: boolean): Promise<void> {
  const { error } = await admin().from('leads_campos').update({ activo }).eq('clave', clave)
  exigir(error, `${activo ? 'activar' : 'desactivar'} el campo ${clave}`)
}

// Un cursor como lo escribe `codificarCursor()`: la página que sigue a ese instante.
export function cursorHacia(
  creadoEn: string,
  id: string,
  sentido: 'siguiente' | 'anterior',
): string {
  const crudo = `${sentido === 'siguiente' ? 's' : 'a'}|${creadoEn}|${id}`
  return Buffer.from(crudo).toString('base64url')
}

// Opciones de un campo: `n` pares clave/etiqueta con nombres fáciles de buscar.
export function opcionesDePrueba(n: number): { clave: string; etiqueta: string }[] {
  return Array.from({ length: n }, (_, i) => ({
    clave: `op_${String(i)}`,
    etiqueta: `Ciudad E2E ${String(i)}`,
  }))
}
