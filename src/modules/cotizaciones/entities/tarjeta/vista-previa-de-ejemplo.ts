// La tarjeta de la vista previa del editor de la plantilla (4.19-4): la lectura plana que arma `plantilla` vuelta en la `TarjetaLista` que dibuja `modeloDeLaTarjeta()`, con
// cifras de ejemplo (P6: se dicen). Determinista: nada de `Date`, que desajustaría la hidratación. Puro.
import type { LecturaParaLaVistaPrevia } from '../vista-previa-de-la-plantilla'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { Estado } from '../motor-contexto'
import type { TarjetaLista } from './lectura-de-la-tarjeta'
import type { PaginaDeLaTarjeta } from './modelo-de-la-tarjeta'

export const PAGINA_DE_EJEMPLO: PaginaDeLaTarjeta & { logo: { nombre: string; url: string } } = {
  fecha: 'Fecha de la cotización',
  asesor: 'Nombre del asesor',
  vehiculo: 'Vehículo de la cotización',
  numero: null,
  vencida: false,
  // Sin url: la marca dibuja su glifo neutro y el interruptor «Logo» se nota.
  logo: { nombre: 'Tu empresa', url: '' },
}

// Cada grupo es su propio bucket (`bucket = id`): el tipo de cambio de uno no pasa a otro.
export function tarjetaDeLaVistaPrevia(lectura: LecturaParaLaVistaPrevia): TarjetaLista {
  return {
    estado: 'lista',
    logo: lectura.logo,
    nota: lectura.nota,
    columnas: lectura.columnas,
    total: { nodo: null, etiqueta: lectura.total.etiqueta, leyenda: lectura.total.leyenda },
    secundarios: lectura.aparte.map((a) => ({ nodo: a.nodo, etiqueta: a.etiqueta })),
    grupos: lectura.grupos.map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta,
      plazo: g.plazo,
      tono: g.tono,
      bucket: g.id,
      filas: g.filas,
    })),
    tiposDeCambio: {
      buckets: new Map(lectura.grupos.map((g) => [g.id, g.tipoDeCambio])),
      modos: new Map(),
    },
    variante: null,
    tonos: lectura.tonos,
  }
}

// La fila n-ésima dibujada (de arriba abajo, en todos los grupos) vale `(n mod 8 + 1) × 250` USD; lo aparte, `100 × (posición + 1)`; el total es la suma de las filas dibujadas.
export function calculoDeEjemplo(tarjeta: TarjetaLista): CalculoDeLaTarjeta {
  const valores = new Map<string, number | string | null>()
  const estados = new Map<string, Estado>()
  let n = 0
  let suma = 0
  for (const g of tarjeta.grupos) {
    for (const f of g.filas) {
      const valor = ((n % 8) + 1) * 250
      valores.set(f.nodo, valor)
      estados.set(f.nodo, 'activo')
      suma += valor
      n += 1
    }
  }
  for (const [posicion, s] of tarjeta.secundarios.entries()) {
    valores.set(s.nodo, 100 * (posicion + 1))
    estados.set(s.nodo, 'activo')
  }
  return { valores, estados, totales: { usd: suma, bs: null }, modoTc: null, verTotalBs: false }
}
