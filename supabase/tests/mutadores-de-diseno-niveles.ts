// Los mutadores del corpus diferencial de `validar_diseno()` que rompen una regla de niveles sobre lo que va aparte (4-9: `nivel_no_admitido` del porcentaje de un par
// y de la bandera de un interruptor) y sobre ver y editar (`editar_sin_ver`). Cada uno cambia la entrada en su lugar y devuelve qué hizo, o null si no se aplica.
import { elegir } from './mutadores-de-formula'
import {
  deTipo,
  idsDe,
  itemsDe,
  nodosDeFormula,
  porcentajeDe,
  secciones,
  texto,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'

export const MUTADORES_DE_NIVELES: readonly MutadorDeDiseno[] = [
  // 4-9: lo que va aparte también es el porcentaje que muestra una celda con secundario y la bandera de un interruptor.
  {
    nombre: 'pct_aparte_restringido',
    aplicar: (e, azar) => {
      const aparte = new Set(idsDe(e, (n) => texto(n, 'salida') === 'aparte'))
      const pares = new Set(
        nodosDeFormula(e, porcentajeDe)
          .filter((n) => aparte.has(texto(n, 'pct') ?? ''))
          .map((n) => texto(n, 'id') ?? ''),
      )
      const yo = elegir(
        azar,
        itemsDe(
          e,
          (it) =>
            deTipo('celda')(it) &&
            it['secundario'] !== undefined &&
            pares.has(texto(it, 'nodo') ?? ''),
        ),
      )
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!yo || nivel === undefined) return null
      yo.it['nivel_ver'] = nivel
      yo.it['nivel_editar'] = nivel
      return `pct_aparte_restringido(${nivel})`
    },
  },
  {
    nombre: 'interruptor_aparte_restringido',
    aplicar: (e, azar) => {
      const aparte = new Set(idsDe(e, (n) => texto(n, 'salida') === 'aparte'))
      const yo = elegir(
        azar,
        itemsDe(e, (it) => deTipo('interruptor')(it) && aparte.has(texto(it, 'nodo') ?? '')),
      )
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!yo || nivel === undefined) return null
      yo.s['nivel_ver'] = nivel
      yo.s['nivel_editar'] = nivel
      return `interruptor_aparte_restringido(${nivel})`
    },
  },
  // Lo que no se ve no se edita (`editar_sin_ver`): un nivel de ver restringido con el de editar abierto, en una sección o en una celda.
  {
    nombre: 'ver_sin_editar_en_seccion',
    aplicar: (e, azar) => {
      const s = elegir(azar, secciones(e))
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!s || nivel === undefined) return null
      s['nivel_ver'] = nivel
      if (azar.entero(2) === 0) delete s['nivel_editar']
      else s['nivel_editar'] = 'todos'
      return `ver_sin_editar_en_seccion(${nivel})`
    },
  },
  {
    nombre: 'celda_abre_editar',
    aplicar: (e, azar) => {
      const yo = elegir(azar, itemsDe(e, deTipo('celda')))
      const nivel = elegir(
        azar,
        e.contexto.niveles.filter((n) => !e.contexto.retirados.includes(n)),
      )
      if (!yo || nivel === undefined) return null
      yo.it['nivel_ver'] = nivel
      yo.it['nivel_editar'] = 'todos'
      return `celda_abre_editar(${nivel})`
    },
  },
]
