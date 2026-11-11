// El formulario de una fase: lo escrito (`ValoresDeFase`, de `reglas-de-fase.ts`) y el pedido a la base. Sólo viaja lo que cambió (D12): la lista
// cerrada de claves de `_fase_forma()`, nunca `activa`, `orden` ni `flujo_id`.
import type { FaseParaConfigurar } from '../flujo'
import { COLOR_NEUTRO_DE_FASE, type DatosDeFase, type ValoresDeFase } from './reglas-de-fase'

export const MENSAJE_NADA_QUE_GUARDAR_DE_FASE = 'No hay nada que guardar.'

export function valoresDeFase(fase: FaseParaConfigurar): ValoresDeFase {
  return {
    nombre: fase.nombre,
    descripcion: fase.descripcion ?? '',
    color: fase.color,
    icono: fase.icono ?? '',
    demoraDias: fase.demoraDias === null ? '' : String(fase.demoraDias),
    alertaCadaHoras: fase.alertaCadaHoras === null ? '' : String(fase.alertaCadaHoras),
    esInicial: fase.esInicial,
    esFinal: fase.esFinal,
    esLogistica: fase.esLogistica,
    notaObligatoria: fase.notaObligatoria,
    permiteContenedor: fase.permiteContenedor,
    permiteAduana: fase.permiteAduana,
    cuentaLlegadaRepuestos: fase.cuentaLlegadaRepuestos,
    publicaWeb: fase.publicaWeb,
    visiblePortal: fase.visiblePortal,
    aliasPortal: fase.aliasPortal ?? '',
    descripcionPortal: fase.descripcionPortal ?? '',
  }
}

// Las claves de la base (`p_datos` y `p_cambios`).
export type CambiosDeFase = {
  nombre?: string
  descripcion?: string | null
  color?: string
  icono?: string | null
  demora_dias?: number | null
  alerta_cada_horas?: number | null
  es_inicial?: boolean
  es_final?: boolean
  es_logistica?: boolean
  nota_obligatoria?: boolean
  permite_contenedor?: boolean
  permite_aduana?: boolean
  cuenta_llegada_repuestos?: boolean
  publica_web?: boolean
  visible_portal?: boolean
  alias_portal?: string | null
  descripcion_portal?: string | null
}

// `[clave de la base, campo de la fase]`: lo mismo dicho de las dos maneras.
const CLAVES: readonly [keyof CambiosDeFase, keyof DatosDeFase][] = [
  ['nombre', 'nombre'],
  ['descripcion', 'descripcion'],
  ['color', 'color'],
  ['icono', 'icono'],
  ['demora_dias', 'demoraDias'],
  ['alerta_cada_horas', 'alertaCadaHoras'],
  ['es_inicial', 'esInicial'],
  ['es_final', 'esFinal'],
  ['es_logistica', 'esLogistica'],
  ['nota_obligatoria', 'notaObligatoria'],
  ['permite_contenedor', 'permiteContenedor'],
  ['permite_aduana', 'permiteAduana'],
  ['cuenta_llegada_repuestos', 'cuentaLlegadaRepuestos'],
  ['publica_web', 'publicaWeb'],
  ['visible_portal', 'visiblePortal'],
  ['alias_portal', 'aliasPortal'],
  ['descripcion_portal', 'descripcionPortal'],
]

// `p_cambios` de `fase_guardar`: sólo lo que cambió respecto de la fase que se tenía en pantalla. Nulo si no cambió nada.
export function cambiosParaGuardar(
  original: FaseParaConfigurar,
  datos: DatosDeFase,
): CambiosDeFase | null {
  const cambios = Object.fromEntries(
    CLAVES.filter(([, campo]) => datos[campo] !== original[campo]).map(([clave, campo]) => [
      clave,
      datos[campo],
    ]),
  ) as CambiosDeFase
  return Object.keys(cambios).length === 0 ? null : cambios
}

// Lo que se elige al crear una fase desde la lista.
export const TIPOS_DE_FASE_NUEVA = ['intermedia', 'inicial', 'final'] as const
export type TipoDeFaseNueva = (typeof TIPOS_DE_FASE_NUEVA)[number]

export const TEXTO_DEL_TIPO_DE_FASE: Record<TipoDeFaseNueva, string> = {
  intermedia: 'Intermedia',
  inicial: 'Inicial',
  final: 'Final',
}

export type ValoresDeFaseNueva = { nombre: string; color: string; tipo: TipoDeFaseNueva }

export const VALORES_DE_FASE_NUEVA: ValoresDeFaseNueva = {
  nombre: '',
  color: COLOR_NEUTRO_DE_FASE,
  tipo: 'intermedia',
}

// `p_datos` de `fase_crear`: sólo lo mínimo; lo demás tiene su valor por omisión y se edita en el inspector (D13).
export function datosParaCrear(datos: ValoresDeFaseNueva): CambiosDeFase {
  return {
    nombre: datos.nombre.trim(),
    color: datos.color,
    ...(datos.tipo === 'inicial' ? { es_inicial: true } : {}),
    ...(datos.tipo === 'final' ? { es_final: true } : {}),
  }
}
