// Lo que el listado recibe ya resuelto por la página.
import type { FaseResumen } from '@/modules/flujos/client'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import type { AlcanceDeAvisos } from '../../../entities/avisos-de-vehiculo'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  estadoDeVitrina,
  motivosDeNoVisible,
  type EstadoDeVitrina,
  type MotivoDeNoVisible,
  type PermisoDeVitrina,
  type VitrinaDelOrigen,
} from '../../../entities/vitrina'

export type DatosDelOrigen = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  fases: readonly FaseResumen[]
  categorias: readonly Categoria[]
  // Lo que hace falta para que algo de este origen se vea en la web: de acá sale la insignia.
  vitrina: VitrinaDelOrigen
  // El día de hoy en la zona de la empresa, si la limpieza automática aplica a este origen y está
  // encendida: con él cada fila dice «Se limpia el dd/mm». null = no hay nada que decir.
  limpiezaHoy: string | null
}

export type FilaDeVehiculo = Vehiculo

// Lo que decide qué ofrece el «⋯» de cada fila, resuelto por la página: quién edita (los de esta página), a quién se puede enviar a la
// papelera y si se puede publicar en este origen.
export type ParaElMenuDeLaLista = {
  editables: ReadonlySet<string>
  eliminables: ReadonlySet<string>
  publicar: PermisoDeVitrina
  // Los de esta página cuyo lead quien mira puede abrir («Ver el lead» en el aviso de un vehículo vinculado) y lo que puede abrir desde un aviso.
  leadsVisibles: ReadonlySet<string>
  alcance: AlcanceDeAvisos
}

// Lo que recibe el listado como listas, hecho conjuntos para preguntar por fila.
export function paraElMenuDe(datos: {
  editables: readonly string[]
  eliminables: readonly string[]
  leadsVisibles: readonly string[]
  alcance: AlcanceDeAvisos
  publicar: PermisoDeVitrina
}): ParaElMenuDeLaLista {
  return {
    editables: new Set(datos.editables),
    eliminables: new Set(datos.eliminables),
    leadsVisibles: new Set(datos.leadsVisibles),
    alcance: datos.alcance,
    publicar: datos.publicar,
  }
}

// ¿Alguna fila de la página tiene algo en su «⋯»? Si no, la columna de acciones no se dibuja.
export function hayMenuEnLaPagina(filas: readonly Vehiculo[], para: ParaElMenuDeLaLista): boolean {
  return (
    para.publicar.estado === 'habilitado' ||
    filas.some((fila) => para.editables.has(fila.id) || para.eliminables.has(fila.id))
  )
}

// La fase de un vehículo entre las de su origen; null = sin fase (o una que ya no existe).
export function faseDe(fases: readonly FaseResumen[], faseId: string | null): FaseResumen | null {
  return fases.find((fase) => fase.id === faseId) ?? null
}

// El estado de una fila en la vitrina y, si está publicada y no se ve, por qué.
export function vitrinaDe(
  vehiculo: Vehiculo,
  vitrina: VitrinaDelOrigen,
): { estado: EstadoDeVitrina; motivos: MotivoDeNoVisible[] } {
  const estado = estadoDeVitrina(vehiculo, vitrina)
  return { estado, motivos: estado === 'no_visible' ? motivosDeNoVisible(vehiculo, vitrina) : [] }
}
