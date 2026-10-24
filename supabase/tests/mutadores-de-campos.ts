// Los mutadores del corpus diferencial que rompen `campo_con_punto` (4-3): un campo del vehículo con punto, en un nodo
// `campo_vehiculo` o en un `match` que no nombra un nodo. Es la última regla del orden, así que estos defectos sólo la alcanzan
// si la fórmula no tiene otro.
import {
  elegir,
  esTipo,
  idDe,
  insertar,
  nodosDe,
  texto,
  totalDe,
  type Mutador,
  type Objeto,
} from './mutadores-de-formula'

const entradasDeMatch = (n: Objeto): [string, string][] =>
  Object.entries(n['match'] ?? {}).flatMap(([k, v]): [string, string][] =>
    typeof v === 'string' ? [[k, v]] : [],
  )

export const MUTADORES_DE_CAMPOS: readonly Mutador[] = [
  {
    // El campo de un `campo_vehiculo` que ya está pasa a tener el prefijo `atributos.`.
    nombre: 'campo_con_punto',
    aplicar: (f, azar) => {
      const yo = elegir(azar, nodosDe(f, esTipo('campo_vehiculo')))
      if (!yo) return null
      yo.n['campo'] = `atributos.${texto(yo.n, 'campo') ?? 'x'}`
      return `campo_con_punto(${idDe(yo.n)})`
    },
  },
  {
    // Un `campo_vehiculo` nuevo, sin lectores, justo antes del total.
    nombre: 'campo_con_punto_nuevo',
    aplicar: (f) => {
      const total = totalDe(f)
      if (!total || nodosDe(f, (n) => idDe(n) === 'campo_punto').length > 0) return null
      insertar(f, total.i, {
        id: 'campo_punto',
        tipo: 'campo_vehiculo',
        etiqueta: 'Con punto',
        formato: 'raw',
        campo: 'atributos.cilindrada',
      })
      return 'campo_con_punto_nuevo'
    },
  },
  {
    // Un valor de un `match` que no es un nodo pasa a nombrar un campo con punto.
    nombre: 'match_con_punto',
    aplicar: (f, azar) => {
      const ids = new Set(nodosDe(f).map(({ n }) => idDe(n)))
      const yo = elegir(
        azar,
        nodosDe(f, esTipo('tabla')).filter(({ n }) =>
          entradasDeMatch(n).some(([, v]) => !ids.has(v)),
        ),
      )
      const par = yo ? entradasDeMatch(yo.n).find(([, v]) => !ids.has(v)) : undefined
      if (!yo || !par || typeof yo.n['match'] !== 'object' || Array.isArray(yo.n['match']))
        return null
      ;(yo.n['match'] as Objeto)[par[0]] = `atributos.${par[1]}`
      return `match_con_punto(${idDe(yo.n)})`
    },
  },
]
