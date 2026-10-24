import type { AccionDeMenu } from '@/shared/ui/lista'
import { accionesDeNivel, type NivelDeAcceso } from '../../../entities/nivel'

type Quehaceres = {
  alRenombrar: (id: string) => void
  alRetirar: (nivel: NivelDeAcceso) => void
  alRestaurar: (nivel: NivelDeAcceso) => void
  alPedirEliminar: (id: string) => void
}

const ETIQUETA = {
  renombrar: 'Renombrar',
  retirar: 'Retirar',
  restaurar: 'Restaurar',
  eliminar: 'Eliminar',
} as const

// Las líneas del «⋯» de un nivel, en su orden: Renombrar · Retirar o Restaurar · ─ · Eliminar. Qué se ofrece y por qué no se puede lo dice
// `accionesDeNivel()` (de lo que trae la fila); acá sólo se dibuja. Retirar y restaurar guardan solos, con «Deshacer». Eliminar está apagado
// y dice por qué (el motivo de la base: «Está en 6 celdas de 2 orígenes…») con «Retirar» en la línea de arriba. Lo que abre algo encima
// espera a que el menú se cierre.
export function menuDeNivel(
  nivel: NivelDeAcceso,
  { alRenombrar, alRetirar, alRestaurar, alPedirEliminar }: Quehaceres,
): AccionDeMenu[] {
  return accionesDeNivel(nivel).flatMap((linea): AccionDeMenu[] => {
    switch (linea.accion) {
      case 'renombrar':
        return [
          {
            tipo: 'accion',
            clave: 'renombrar',
            etiqueta: ETIQUETA.renombrar,
            despuesDeCerrar: true,
            alElegir: () => {
              alRenombrar(nivel.id)
            },
          },
        ]
      case 'retirar':
        return [
          {
            tipo: 'accion',
            clave: 'retirar',
            etiqueta: ETIQUETA.retirar,
            alElegir: () => {
              alRetirar(nivel)
            },
          },
        ]
      case 'restaurar':
        return [
          {
            tipo: 'accion',
            clave: 'restaurar',
            etiqueta: ETIQUETA.restaurar,
            alElegir: () => {
              alRestaurar(nivel)
            },
          },
        ]
      case 'eliminar':
        return [
          { tipo: 'separador', clave: 'antes-de-eliminar' },
          {
            tipo: 'accion',
            clave: 'eliminar',
            etiqueta: ETIQUETA.eliminar,
            destructiva: true,
            despuesDeCerrar: true,
            deshabilitada: linea.motivoParaNo !== null,
            alElegir: () => {
              alPedirEliminar(nivel.id)
            },
          },
          ...(linea.motivoParaNo === null
            ? []
            : [{ tipo: 'nota' as const, clave: 'motivo-de-eliminar', texto: linea.motivoParaNo }]),
        ]
    }
  })
}
