// El archivo de ejemplo y el de errores. Las columnas son las mismas que las de la exportación: lo que
// se exporta se puede volver a importar. Sin I/O.
import type { Celda } from '@/shared/lib/csv/escribir'
import { diaEnZona } from '@/shared/lib/fechas'
import type { CampoDeLead } from '../campo'
import { ENCABEZADOS_FIJOS, camposDeExportacion } from '../exportacion'
import type { FilaPreparada } from './filas'
import type { ContextoDeImportacion } from './contexto'
import type { ObjetivoDeImportacion } from './emparejar'
import type { ResultadoDeFila } from './lotes'

export const NOMBRE_DE_LA_PLANTILLA = 'plantilla-de-leads.csv'
export const NOMBRE_DE_LOS_ERRORES = 'leads-rechazados.csv'

type Muestra = (campo: CampoDeLead, hoy: string) => Celda

const textoDeEjemplo: Muestra = () => 'Texto de ejemplo'
const primeraOpcion: Muestra = (campo) => campo.opciones[0]?.etiqueta ?? ''

const MUESTRA_POR_TIPO: Record<CampoDeLead['tipo'], Muestra> = {
  numero: () => 10,
  moneda: () => 10,
  booleano: () => 'Sí',
  fecha: (_campo, hoy) => hoy,
  fecha_hora: (_campo, hoy) => `${hoy} 09:00`,
  opcion: primeraOpcion,
  multi_opcion: primeraOpcion,
  correo: () => 'nombre@ejemplo.com',
  url: () => 'https://ejemplo.com',
  documento: () => '1234567',
  texto: textoDeEjemplo,
  texto_largo: textoDeEjemplo,
}

const muestraDe = (campo: CampoDeLead, hoy: string): Celda =>
  MUESTRA_POR_TIPO[campo.tipo](campo, hoy)

// Los encabezados del layout de hoy y una fila de muestra para entender el formato.
export function plantillaDeImportacion(
  campos: readonly CampoDeLead[],
  contexto: ContextoDeImportacion,
  ahoraIso: string,
  zona: string,
): { encabezados: string[]; muestra: Celda[] } {
  const activos = camposDeExportacion(campos)
  const hoy = diaEnZona(ahoraIso, { zona })
  return {
    encabezados: [...ENCABEZADOS_FIJOS, ...activos.map((campo) => campo.etiqueta)],
    muestra: [
      'Nombre de ejemplo',
      '70011002',
      // El tipo que propone el alta (el primero activo de la clase prospecto): el nombre sale de la base.
      (contexto.tipos.find((tipo) => tipo.id === contexto.tipoPorDefectoId) ?? contexto.tipos[0])
        ?.nombre ?? '',
      contexto.origenes[0]?.nombre ?? '',
      ...activos.map((campo) => muestraDe(campo, hoy)),
    ],
  }
}

export type FilaRechazada = {
  fila: number
  celdas: readonly string[]
  motivo: string
}

const MOTIVO_DE_YA_EXISTE = 'Ese teléfono ya existe.'

// Por qué no entró una fila: lo que no pasó la vista previa o lo que dijo la base. Con el nombre del
// dato al principio, como lo ve quien corrige.
export function filasRechazadas(
  preparadas: readonly FilaPreparada[],
  resultados: ReadonlyMap<string, ResultadoDeFila>,
  objetivos: readonly ObjetivoDeImportacion[],
): FilaRechazada[] {
  const etiquetas = new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.etiqueta]))
  const dicho = (campo: string | null, motivo: string) => {
    const etiqueta = campo === null ? undefined : etiquetas.get(campo)
    return etiqueta === undefined ? motivo : `${etiqueta}: ${motivo}`
  }
  return preparadas.flatMap((fila) => {
    const resultado = resultados.get(fila.id)
    if (fila.pedido === null) {
      return [
        {
          fila: fila.fila,
          celdas: fila.celdas,
          motivo: fila.motivos.map((m) => dicho(m.campo, m.motivo)).join(' · '),
        },
      ]
    }
    if (resultado?.resultado === 'error') {
      return [
        {
          fila: fila.fila,
          celdas: fila.celdas,
          motivo: dicho(resultado.campo, resultado.motivo ?? ''),
        },
      ]
    }
    if (resultado?.resultado === 'ya_existe') {
      return [{ fila: fila.fila, celdas: fila.celdas, motivo: MOTIVO_DE_YA_EXISTE }]
    }
    return []
  })
}

// El CSV de lo rechazado: «Fila» y «Motivo» y después las columnas tal como venían, para corregir y
// volver a subir (las dos primeras se ignoran al emparejar).
export function tablaDeRechazadas(
  encabezados: readonly string[],
  rechazadas: readonly FilaRechazada[],
): Celda[][] {
  return [
    ['Fila', 'Motivo', ...encabezados],
    ...rechazadas.map((r) => [r.fila, r.motivo, ...r.celdas]),
  ]
}
