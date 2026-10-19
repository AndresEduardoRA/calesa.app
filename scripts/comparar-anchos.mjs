// Compara, prueba por prueba, lo que hace una prueba de e2e en escritorio y en celular (cierre 5a-fix-3).
// Un spec sale del celular sólo si el celular no le agrega nada; esto es la prueba. Lee las huellas que deja
// `E2E_HUELLA=<carpeta> pnpm test:e2e:completo` (`e2e/soporte/huella.ts`) y dice, por prueba:
//   IGUAL      mismos pasos, mismo elemento en cada paso (la cadena de ancestros: etiqueta, rol, nombre, `data-slot`,
//              `data-side`, `aria-modal`), mismas URLs y los mismos errores de consola;
//   DISTINTO   con el primer paso que difiere, escrito por los dos lados;
//   SOLO_UNO   la prueba corrió en un solo proyecto (se saltó en el otro).
// Después mira el JS: lo que el celular ejecuta de más (funciones y bloques que el escritorio no ejecutó en esa misma
// prueba) tiene que ejecutarlo, en celular, alguna prueba que se queda. Una IGUAL con un extra que nadie más cubre
// se queda ella (la más corta primero, así se queda la que menos cuesta).
// Uso: node scripts/comparar-anchos.mjs <carpeta de huellas> [salida.json]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

// Lo que cambia entre un proyecto y otro sin ser el ancho: el nombre del proyecto que los datos de prueba llevan,
// los números largos (marcas de tiempo) y los ids.
export function normalizar(texto) {
  return String(texto)
    .replaceAll(/escritorio|movil/gi, 'P')
    .replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'U')
    .replaceAll(/\d{6,}/g, '#')
}

// La huella de un elemento, sin lo que cambia entre proyectos sin ser el ancho: los números de un nombre (el n.º de un lead,
// «E2E Escala 110») y las envolturas sin significado (un `div` o `span` sin rol, nombre, `data-slot`, `data-side` ni
// `aria-modal`: el celular y el escritorio envuelven distinto el marco). Lo que sí cuenta es la estructura con sentido:
// tabla y filas contra lista y artículos, el diálogo y de qué lado sale, la barra, el menú.
export function huellaLimpia(huella) {
  return normalizar(huella)
    .split(' < ')
    .filter((pieza) => {
      const [etiqueta, rol, nombre, hoja, lado, modal] = pieza.split('|')
      const vacia = !rol && !nombre && !hoja && !lado && !modal
      return !(vacia && ['div', 'span', 'p'].includes(etiqueta ?? ''))
    })
    .map((pieza) => pieza.replaceAll(/\d+/g, '#'))
}

// Las huellas de un paso son iguales si sus ancestros con sentido coinciden de adentro hacia afuera hasta donde llegan los dos: el
// navegador corta la cadena en 8 niveles y el marco del escritorio gasta más niveles que el del celular, así que lo que cae
// más afuera puede faltar en uno sin que sea una diferencia.
function huellasIguales(a, b) {
  if (a.length !== b.length) return false
  return a.every((h, i) => {
    const x = huellaLimpia(h)
    const y = huellaLimpia(b[i] ?? '')
    const comunes = Math.min(x.length, y.length)
    return JSON.stringify(x.slice(0, comunes)) === JSON.stringify(y.slice(0, comunes))
  })
}

// Un paso es de una acción (click, fill…) o un `expect`. El elemento de una acción se mide después de hacerla y puede
// haberse ido (el diálogo que el clic cerró): sólo se compara si existe en los dos lados. La URL de un paso es un instante
// (`nuqs` la escribe un cuadro después de que aparece el diálogo): sólo cuenta la de un `goto`, que espera la carga.
export function camposDistintos(a, b) {
  if (a.m !== b.m) return 'accion'
  if (normalizar(a.s) !== normalizar(b.s)) return 'selector'
  if (normalizar(a.x) !== normalizar(b.x)) return 'esperado'
  if (a.m === 'goto') return normalizar(a.u) === normalizar(b.u) ? null : 'url'
  const esExpect = a.m.startsWith('expect:')
  if (esExpect && a.n !== b.n) return 'cuantos'
  if (!esExpect && (a.n <= 0 || b.n <= 0)) return null
  return huellasIguales(a.h, b.h) ? null : esExpect ? 'huella-expect' : 'huella-accion'
}

export const pasosIguales = (a, b) => camposDistintos(a, b) === null

// La primera diferencia entre dos listas de pasos, o null si son la misma.
export function primeraDiferencia(escritorio, movil) {
  const largo = Math.max(escritorio.length, movil.length)
  for (let i = 0; i < largo; i++) {
    const a = escritorio[i]
    const b = movil[i]
    const campo = a && b ? camposDistintos(a, b) : 'largo'
    if (campo !== null) {
      return { paso: i + 1, campo, escritorio: a ?? null, movil: b ?? null }
    }
  }
  return null
}

// Los errores de consola y de página, sin lo que cambia entre corridas.
function erroresDe(huella) {
  return [...new Set(huella.errores.map(normalizar))].sort()
}

// Lo que el celular ejecutó y el escritorio no, en la misma prueba: funciones que sólo él llamó y bloques que en
// el escritorio no corrieron.
export function extrasDelCelular(escritorio, movil) {
  const extras = []
  for (const [clave, ceros] of Object.entries(movil.cobertura)) {
    const enEscritorio = escritorio.cobertura[clave]
    if (enEscritorio === undefined) {
      extras.push(`fn:${clave}`)
      continue
    }
    const cerosMovil = new Set(ceros === '' ? [] : ceros.split(','))
    for (const bloque of enEscritorio === '' ? [] : enEscritorio.split(',')) {
      if (!cerosMovil.has(bloque)) extras.push(`blk:${clave}:${bloque}`)
    }
  }
  return extras
}

// Cada prueba en un proyecto: `prueba` → huella.
export function leerHuellas(carpeta) {
  const huellas = new Map()
  for (const nombre of readdirSync(carpeta)) {
    if (!nombre.endsWith('.json.gz')) continue
    const huella = JSON.parse(gunzipSync(readFileSync(join(carpeta, nombre))).toString('utf8'))
    huellas.set(huella.prueba, huella)
  }
  return huellas
}

// El estado de cada prueba en cada proyecto, del JSON de Playwright: `proyecto` → (`archivo › título` → `passed`, `skipped`…).
export function estadosDelResultado(json) {
  const estados = new Map()
  const recorrer = (suite, camino) => {
    const aqui = suite.file ? [suite.file.split('/').at(-1)] : [...camino, suite.title]
    for (const sub of suite.suites ?? []) recorrer(sub, aqui)
    for (const spec of suite.specs ?? []) {
      for (const prueba of spec.tests) {
        const clave = [...aqui, spec.title].join(' › ')
        if (!estados.has(prueba.projectName)) estados.set(prueba.projectName, new Map())
        const resultado = prueba.results.at(-1)
        estados.get(prueba.projectName).set(clave, resultado ? resultado.status : prueba.status)
      }
    }
  }
  for (const suite of json.suites) recorrer(suite, [])
  return estados
}

export function comparar(escritorio, movil, estados = new Map()) {
  const pruebas = [...new Set([...escritorio.keys(), ...movil.keys()])].sort()
  return pruebas.map((prueba) => {
    const a = escritorio.get(prueba)
    const b = movil.get(prueba)
    if (!a || !b) {
      return {
        prueba,
        veredicto: 'SOLO_UNO',
        motivo: a ? 'sólo corrió en escritorio' : 'sólo corrió en celular',
        extras: [],
      }
    }
    const saltada = ['escritorio', 'movil'].filter((p) => estados.get(p)?.get(prueba) === 'skipped')
    if (saltada.length > 0) {
      return {
        prueba,
        veredicto: 'SALTADA',
        motivo: `se salta en ${saltada.join(' y ')}`,
        extras: [],
      }
    }
    const diferencia = primeraDiferencia(a.pasos, b.pasos)
    if (diferencia) {
      return {
        prueba,
        veredicto: 'DISTINTO',
        motivo: `paso ${String(diferencia.paso)}`,
        diferencia,
        extras: [],
      }
    }
    const errA = erroresDe(a)
    const errB = erroresDe(b)
    if (JSON.stringify(errA) !== JSON.stringify(errB)) {
      return {
        prueba,
        veredicto: 'DISTINTO',
        motivo: 'errores de consola distintos',
        diferencia: { escritorio: errA, movil: errB },
        extras: [],
      }
    }
    return {
      prueba,
      veredicto: 'IGUAL',
      motivo: `${String(a.pasos.length)} pasos`,
      extras: extrasDelCelular(a, b),
      pasos: a.pasos.length,
    }
  })
}

// Lo que ejecutan las pruebas que se quedan: función → los bloques que NO corrieron en ninguna de ellas.
function agregar(cubierto, cobertura) {
  for (const [clave, ceros] of Object.entries(cobertura)) {
    const nuevos = new Set(ceros === '' ? [] : ceros.split(','))
    const previos = cubierto.get(clave)
    cubierto.set(clave, previos ? new Set([...previos].filter((r) => nuevos.has(r))) : nuevos)
  }
}

// Un extra del celular está cubierto si una prueba que se queda llamó a la función (y, si es un bloque, lo ejecutó).
function cubre(cubierto, extra) {
  if (extra.startsWith('fn:')) return cubierto.has(extra.slice(3))
  const [, clave, bloque] = /^blk:(.*):([^:]+)$/.exec(extra) ?? []
  const ceros = cubierto.get(clave ?? '')
  return ceros !== undefined && !ceros.has(bloque ?? '')
}

// Quiénes pueden salir: las IGUAL cuyo extra de JS lo ejecuta, en celular, una prueba que se queda. Las que no son IGUAL
// se quedan; las IGUAL con extras que nadie cubre se quedan, de a una (la más corta primero), hasta que todo extra esté cubierto.
export function decidir(resultados, huellasMovil) {
  const cubierto = new Map()
  for (const r of resultados) {
    if (r.veredicto !== 'IGUAL') {
      r.sale = false
      r.razon = r.motivo
      agregar(cubierto, huellasMovil.get(r.prueba)?.cobertura ?? {})
    }
  }
  const candidatas = resultados
    .filter((r) => r.veredicto === 'IGUAL')
    .sort((x, y) => x.pasos - y.pasos || x.prueba.localeCompare(y.prueba))
  for (const r of candidatas) {
    const sinCubrir = r.extras.filter((e) => !cubre(cubierto, e))
    if (sinCubrir.length > 0) {
      r.sale = false
      r.razon = `${String(sinCubrir.length)} extras de JS del celular sin otra prueba que los ejecute (p. ej. ${sinCubrir[0]})`
      agregar(cubierto, huellasMovil.get(r.prueba)?.cobertura ?? {})
    } else {
      r.sale = true
      r.razon =
        'igual en pasos y en errores; todo el JS que el celular agrega lo ejecuta otra prueba que se queda'
    }
  }
  return resultados
}

function principal(argumentos) {
  const [carpeta, salida, resultado] = argumentos
  if (!carpeta) {
    console.error('Uso: node scripts/comparar-anchos.mjs <carpeta de huellas> [salida.json]')
    process.exit(2)
  }
  const escritorio = leerHuellas(join(carpeta, 'escritorio'))
  const movil = leerHuellas(join(carpeta, 'movil'))
  const estados = resultado
    ? estadosDelResultado(JSON.parse(readFileSync(resultado, 'utf8')))
    : new Map()
  const resultados = decidir(comparar(escritorio, movil, estados), movil)
  const cuenta = (v) => resultados.filter((r) => r.veredicto === v).length
  console.log(
    `${String(resultados.length)} pruebas: ${String(cuenta('IGUAL'))} IGUAL, ${String(cuenta('DISTINTO'))} DISTINTO, ${String(cuenta('SOLO_UNO'))} SOLO_UNO, ${String(cuenta('SALTADA'))} SALTADA; salen del celular: ${String(resultados.filter((r) => r.sale).length)}`,
  )
  if (salida) writeFileSync(salida, JSON.stringify(resultados, null, 1))
  else
    for (const r of resultados)
      console.log(
        `${r.sale ? 'SALE  ' : 'QUEDA '} ${r.veredicto.padEnd(8)} ${r.prueba} — ${r.razon}`,
      )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) principal(process.argv.slice(2))
