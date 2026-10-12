// La fila entera de `ajustes_empresa`, como la edita Configuración › Empresa. Lo mínimo que usa
// toda pantalla (y las de antes de ingresar) es `Ajustes`, en `ajustes.ts`.
import type { Tables } from '@/shared/types/database.types'
import { iconosDesde, type Iconos } from './iconos'

export type AjustesEmpresa = {
  nombre: string
  razonSocial: string | null
  nit: string | null
  direccion: string | null
  ciudad: string | null
  pais: string
  telefono: string | null
  whatsapp: string | null
  email: string | null
  logoRuta: string | null
  colorAcento: string | null
  iconos: Iconos | null
  locale: string
  zonaHoraria: string
  monedaBase: string
  registroAbierto: boolean
  // Retención: cuántos días se guarda lo que se manda a la papelera y el registro de actividad.
  papeleraDias: number
  actividadDias: number
  // ISO. La versión de los ajustes: la mandan de vuelta las ediciones.
  actualizadoEn: string
}

export function ajustesEmpresaDesde(fila: Tables<'ajustes_empresa'>): AjustesEmpresa {
  return {
    nombre: fila.nombre,
    razonSocial: fila.razon_social,
    nit: fila.nit,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    pais: fila.pais,
    telefono: fila.telefono,
    whatsapp: fila.whatsapp,
    email: fila.email,
    logoRuta: fila.logo_ruta,
    colorAcento: fila.color_acento,
    iconos: iconosDesde(fila.iconos),
    locale: fila.locale,
    zonaHoraria: fila.zona_horaria,
    monedaBase: fila.moneda_base,
    registroAbierto: fila.registro_abierto,
    papeleraDias: fila.papelera_dias,
    actividadDias: fila.actividad_dias,
    actualizadoEn: fila.actualizado_en,
  }
}

// Lo que una edición puede cambiar. Una clave ausente no se toca; `null` vacía el dato (quitar el
// logo, volver a los íconos neutros).
export type CambiosDeAjustes = Partial<Omit<AjustesEmpresa, 'actualizadoEn'>>

const COLUMNA: Record<keyof CambiosDeAjustes, string> = {
  nombre: 'nombre',
  razonSocial: 'razon_social',
  nit: 'nit',
  direccion: 'direccion',
  ciudad: 'ciudad',
  pais: 'pais',
  telefono: 'telefono',
  whatsapp: 'whatsapp',
  email: 'email',
  logoRuta: 'logo_ruta',
  colorAcento: 'color_acento',
  iconos: 'iconos',
  locale: 'locale',
  zonaHoraria: 'zona_horaria',
  monedaBase: 'moneda_base',
  registroAbierto: 'registro_abierto',
  papeleraDias: 'papelera_dias',
  actividadDias: 'actividad_dias',
}

type Valor = string | number | boolean | Iconos | null

// Los cambios con los nombres de columna que espera `empresa_guardar_ajustes()`. Lo que viene
// `undefined` no viaja: la RPC distingue «no tocar» de «vaciar» por la presencia de la clave.
export function cambiosComoColumnas(cambios: CambiosDeAjustes): Record<string, Valor> {
  const columnas: Record<string, Valor> = {}
  for (const [campo, columna] of Object.entries(COLUMNA)) {
    const valor = cambios[campo as keyof CambiosDeAjustes]
    if (valor !== undefined) {
      columnas[columna] = valor
    }
  }
  return columnas
}

// Lo que el formulario de la empresa muestra y edita, en un texto. Sirve de `key`: cambia cuando
// cambia algo de eso y no cuando sólo se movió la versión (regenerar los íconos toca la misma
// fila, y no tiene por qué reiniciar un formulario a medio tipear).
export function huellaDelFormulario(ajustes: AjustesEmpresa): string {
  const { iconos: _iconos, actualizadoEn: _version, ...loQueEdita } = ajustes
  return JSON.stringify(loQueEdita)
}

// Lo mínimo y lo máximo de las dos retenciones (los mismos CHECK de la tabla).
export const RETENCION_MINIMA_DIAS = 1
export const RETENCION_MAXIMA_DIAS = 365
