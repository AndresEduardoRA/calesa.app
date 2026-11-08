// Una fórmula «mini» con `n` miembros más en el grupo `compra`, publicada en un origen (4.19-3b, E7): volumen para el editor de la tarjeta. Cada miembro nuevo es del nivel
// «todos»; lo demás de la «mini» queda igual. Todo cae con el origen.
import { readFileSync } from 'node:fs'
import { literal, sql } from './sql'

const RUTA_DEL_JUEGO = 'src/modules/cotizaciones/entities/plantilla/casos-de-plantilla.json'

type Mini = {
  definicion: { nodos: Record<string, unknown>[] } & Record<string, unknown>
  diseno: unknown
  visibilidad: Record<string, unknown>
}

export function publicarLaMiniConMiembros(origenId: string, n: number): void {
  const juego = JSON.parse(readFileSync(RUTA_DEL_JUEGO, 'utf8')) as { formulas: { mini: Mini } }
  const { mini } = juego.formulas
  const nuevos = Array.from({ length: n }, (_, i) => ({
    id: `miembro_${String(i + 1)}`,
    tipo: 'input',
    etiqueta: `Miembro ${String(i + 1)}`,
    grupo: 'compra',
  }))
  const definicion = { ...mini.definicion, nodos: [...mini.definicion.nodos, ...nuevos] }
  const visibilidad = {
    ...mini.visibilidad,
    ...Object.fromEntries(nuevos.map((x) => [x.id, { ver: 'todos' }])),
  }
  const json = (v: unknown) => `$e2e$${JSON.stringify(v)}$e2e$::jsonb`
  sql(`
    insert into public.formulas (origen_id, estado, version, definicion, params, diseno, visibilidad, nota)
    values (${literal(origenId)}::uuid, 'publicada', 1, ${json(definicion)}, '{}'::jsonb, ${json(mini.diseno)}, ${json(visibilidad)}, 'E2E 4.19-3b volumen')`)
}
