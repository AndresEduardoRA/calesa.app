// Comprueba que acortar la suite no deja áreas sin cubrir (cierre 5a-fix-3, PLAN 5a-4): compara la salida de
// `playwright test --list --project=<p>` de antes y de después, por proyecto. Cada prueba que sale de un proyecto tiene que
// seguir en el otro (el escritorio la corre) o figurar entre las que bajaron de nivel, cada una con la prueba que la cubre.
// Uso: node scripts/areas-cubiertas.mjs <antes-escritorio> <antes-movil> <despues-escritorio> <despues-movil> [bajadas.json]
//   bajadas.json: { "<archivo> › <título>": "<prueba que la cubre>" }
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// «  [movil] › leads.spec.ts:12:5 › título» → «leads.spec.ts › título»
export function nombresDeUnaLista(texto) {
  const nombres = new Set()
  for (const linea of texto.split('\n')) {
    const coincide = /^\s*\[[^\]]+\] › ([^:]+\.spec\.ts):\d+:\d+ › (.+)$/.exec(linea)
    if (coincide?.[1] && coincide[2]) nombres.add(`${coincide[1]} › ${coincide[2].trim()}`)
  }
  return nombres
}

const resta = (a, b) => [...a].filter((nombre) => !b.has(nombre)).sort()

// Lo que salió de cada proyecto y si sigue cubierto.
export function areasCubiertas({ antes, despues, bajadas = {} }) {
  const salenDeMovil = resta(antes.movil, despues.movil)
  const salenDeEscritorio = resta(antes.escritorio, despues.escritorio)
  const sinCubrir = new Set()
  const detalle = []
  for (const nombre of salenDeMovil) {
    if (despues.escritorio.has(nombre)) detalle.push({ nombre, sigue: 'en escritorio' })
    else if (bajadas[nombre]) detalle.push({ nombre, sigue: `bajó: ${bajadas[nombre]}` })
    else sinCubrir.add(nombre)
  }
  for (const nombre of salenDeEscritorio) {
    if (despues.movil.has(nombre))
      detalle.push({ nombre, sigue: 'en celular (salió del escritorio)' })
    else if (bajadas[nombre]) detalle.push({ nombre, sigue: `bajó: ${bajadas[nombre]}` })
    else sinCubrir.add(nombre)
  }
  // Una prueba nueva en un proyecto que no estaba antes tampoco es una pérdida, pero se dice.
  const nuevas = [
    ...resta(despues.escritorio, antes.escritorio),
    ...resta(despues.movil, antes.movil),
  ]
  return { salenDeMovil, salenDeEscritorio, sinCubrir: [...sinCubrir].sort(), detalle, nuevas }
}

function principal([a, b, c, d, bajadasArchivo]) {
  if (!d) {
    console.error(
      'Uso: node scripts/areas-cubiertas.mjs <antes-escritorio> <antes-movil> <despues-escritorio> <despues-movil> [bajadas.json]',
    )
    process.exit(2)
  }
  const leer = (archivo) => nombresDeUnaLista(readFileSync(archivo, 'utf8'))
  const bajadas = bajadasArchivo ? JSON.parse(readFileSync(bajadasArchivo, 'utf8')) : {}
  const r = areasCubiertas({
    antes: { escritorio: leer(a), movil: leer(b) },
    despues: { escritorio: leer(c), movil: leer(d) },
    bajadas,
  })
  console.log(
    `Salen del celular: ${String(r.salenDeMovil.length)}; salen del escritorio: ${String(r.salenDeEscritorio.length)}; pruebas nuevas: ${String(r.nuevas.length)}; sin cubrir: ${String(r.sinCubrir.length)}`,
  )
  for (const nombre of r.sinCubrir) console.log(`SIN CUBRIR  ${nombre}`)
  if (r.sinCubrir.length > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) principal(process.argv.slice(2))
