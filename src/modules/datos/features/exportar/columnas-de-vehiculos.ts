// Cómo se escribe un vehículo en el archivo de «exportar todo» de un origen (9.05-2b). Puro: la fila ya viene de la tabla `vehiculos` con la
// sesión de quien exporta (la RLS decidió qué filas); acá sólo se dice cada valor.
//
// Columnas: «N.º», los datos comunes del tipo del origen (con las etiquetas de `vehiculos`, el único lugar con texto fijo; lote, plataforma y enlace
// sólo en subasta), los campos activos del layout en su orden y con su etiqueta, «Fase», «Creado» y «Actualizado». El precio sale tal como lo
// entrega la base. Las fechas, en la zona de la empresa (`AAAA-MM-DDTHH:mm`).
import type { FaseResumen } from '@/modules/flujos'
import type { CampoDeLayout, LayoutDeOrigen, TipoDeCampo } from '@/modules/origenes'
import { camposComunes, type CampoComun, type TipoComun } from '@/modules/vehiculos'
import type { Celda } from '@/shared/lib/csv/escribir'
import { localDeInstante } from '@/shared/lib/fechas'
import type { FilaDeVehiculoAExportar } from '../../entities/exportacion'

// El de las opciones de la exportación propia de `leads` (`SEPARADOR_DE_OPCIONES`): el mismo en todo CSV del sistema.
const SEPARADOR_DE_OPCIONES = ' | '

export type ContextoDeVehiculos = {
  comunes: readonly CampoComun[]
  // Los activos del layout, por `orden`.
  campos: readonly CampoDeLayout[]
  categorias: ReadonlyMap<string, string>
  // También las jubiladas: siguen nombrando lo que quedó ahí.
  fases: ReadonlyMap<string, string>
  zona: string
}

export function contextoDeVehiculos(entrada: {
  tipo: 'subasta' | 'manual'
  layout: LayoutDeOrigen
  fases: readonly FaseResumen[]
  zona: string
}): ContextoDeVehiculos {
  return {
    comunes: camposComunes(entrada.tipo),
    campos: entrada.layout.campos
      .filter((campo) => campo.activo)
      .toSorted((a, b) => a.orden - b.orden),
    categorias: new Map(entrada.layout.categorias.map((una) => [una.id, una.nombre])),
    fases: new Map(entrada.fases.map((una) => [una.id, una.nombre])),
    zona: entrada.zona,
  }
}

export function encabezadosDeVehiculos(contexto: ContextoDeVehiculos): string[] {
  return [
    'N.º',
    ...contexto.comunes.map((campo) => campo.etiqueta),
    ...contexto.campos.map((campo) => campo.etiqueta),
    'Fase',
    'Creado',
    'Actualizado',
  ]
}

const siONo = (valor: unknown): Celda => (typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : '')
const texto = (valor: unknown): Celda =>
  typeof valor === 'string' || typeof valor === 'number' ? String(valor) : ''
const numero = (valor: unknown): Celda => (typeof valor === 'number' ? valor : '')
const fecha = (iso: string, zona: string): string => localDeInstante(iso, { zona })

type LectorComun = (valor: unknown, contexto: ContextoDeVehiculos) => Celda

// Cómo se dice cada tipo de dato común.
const COMUN_POR_TIPO: Record<TipoComun, LectorComun> = {
  texto,
  vin: texto,
  enlace: texto,
  entero: numero,
  monto: numero,
  si_no: siONo,
  categoria: (valor, contexto) =>
    typeof valor === 'string' ? (contexto.categorias.get(valor) ?? '') : '',
}

const etiquetaDeOpcion = (campo: CampoDeLayout, clave: unknown): string => {
  const comoTexto = typeof clave === 'string' || typeof clave === 'number' ? String(clave) : ''
  return campo.opciones.find((opcion) => opcion.clave === comoTexto)?.etiqueta ?? comoTexto
}

type LectorDeCampo = (campo: CampoDeLayout, valor: unknown, zona: string) => Celda

// Cómo se dice cada tipo de campo del layout de un origen.
const CAMPO_POR_TIPO: Record<TipoDeCampo, LectorDeCampo> = {
  texto: (_campo, valor) => texto(valor),
  texto_largo: (_campo, valor) => texto(valor),
  url: (_campo, valor) => texto(valor),
  vin: (_campo, valor) => texto(valor),
  lote: (_campo, valor) => texto(valor),
  fecha: (_campo, valor) => (typeof valor === 'string' ? valor : ''),
  numero: (_campo, valor) => numero(valor),
  moneda: (_campo, valor) => numero(valor),
  booleano: (_campo, valor) => siONo(valor),
  fecha_hora: (_campo, valor, zona) =>
    typeof valor === 'string' ? fecha(valor, zona) || valor : '',
  opcion: (campo, valor) => etiquetaDeOpcion(campo, valor),
  multi_opcion: (campo, valor) =>
    Array.isArray(valor)
      ? valor.map((clave) => etiquetaDeOpcion(campo, clave)).join(SEPARADOR_DE_OPCIONES)
      : '',
}

const vacio = (valor: unknown): boolean => valor === undefined || valor === null || valor === ''

export function filaDeVehiculo(
  fila: FilaDeVehiculoAExportar,
  contexto: ContextoDeVehiculos,
): Celda[] {
  return [
    fila.numero,
    ...contexto.comunes.map((campo) => {
      // La fila trae cada dato común con el nombre de su `ClaveComun`: si `vehiculos` suma uno, esto deja de compilar.
      const valor = fila[campo.clave]
      return vacio(valor) ? '' : COMUN_POR_TIPO[campo.tipo](valor, contexto)
    }),
    ...contexto.campos.map((campo) => {
      const valor = fila.atributos[campo.clave]
      return vacio(valor) ? '' : CAMPO_POR_TIPO[campo.tipo](campo, valor, contexto.zona)
    }),
    fila.faseId === null ? '' : (contexto.fases.get(fila.faseId) ?? ''),
    fecha(fila.creadoEn, contexto.zona),
    fecha(fila.actualizadoEn, contexto.zona),
  ]
}
