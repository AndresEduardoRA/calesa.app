// La cuenta `n de 3` de pasos de pantalla seguidos sin e2e completo (`.claude/rules/e2e.md`, Fase 4), leída de los marcadores de
// `docs/BITACORA.md`: `e2e completo: sí (<tarea>…)` la vuelve a 0, `e2e completo: no (<tarea>, pantalla, n de 3)` la fija en n y
// cualquier otro `no` (sólo SQL, el YAML, docs) la deja como está. Un marcador que no sigue el formato (el del 3a, por ejemplo) no
// cuenta y se informa en `no_reconocidos`: un «sí» mal escrito no resetea nada.
//
// Uso: node scripts/piloto/cuenta-e2e.mjs [docs/BITACORA.md]   → JSON por stdout. Se prueba en `cuenta-e2e.test.ts`.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DE = 3
const MARCADOR = /e2e completo: (sí|no) \(([^)\n]*)\)/
const PANTALLA = /pantalla, (\d+) de (\d+)/
// Lo que parece un marcador (`e2e completo:`, `e2e completo —`…), para avisar de los que no siguen el formato.
const PARECE = /e2e completo\s*[:—–-]/i

// Los ejemplos de la regla van entre comillas invertidas: no son marcadores.
const sinCodigo = (linea) => linea.replace(/`[^`]*`/g, ' ')

export function cuentaE2e(texto) {
  let n = 0
  let ultimo = null
  const noReconocidos = []
  texto.split('\n').forEach((original, i) => {
    const linea = sinCodigo(original)
    const m = MARCADOR.exec(linea)
    const tarea = m?.[2]?.split(/[,\s]/)[0] ?? ''
    if (m && /^[A-Za-z0-9][\w.-]*$/.test(tarea) && !tarea.includes('xx')) {
      const valor = m[1]
      if (valor === 'sí') n = 0
      else {
        const p = PANTALLA.exec(m[2] ?? '')
        if (p && Number(p[2]) === DE) n = Number(p[1])
      }
      ultimo = { valor, tarea, linea: i + 1, texto: linea.trim().slice(0, 200) }
    } else if (PARECE.test(linea)) {
      noReconocidos.push(linea.trim().slice(0, 200))
    }
  })
  return {
    n,
    de: DE,
    // La cuenta ya no pide el completo (`.claude/rules/e2e.md`, Fase 4: sólo el hito 4-A y el cierre lo corren en local, 2026-11-06).
    // El campo queda por compatibilidad con hechos.json y el ruteo.
    el_siguiente_corre_completo: false,
    ultimo,
    no_reconocidos: noReconocidos,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const archivo = process.argv[2] ?? 'docs/BITACORA.md'
  let texto = readFileSync(archivo, 'utf8')
  // Con carriles, lo que un paso dejó en docs/pasos/<paso>/bitacora.md y aún no se pasó a la bitácora también cuenta.
  if (existsSync('docs/pasos') && existsSync('docs/plan.yaml')) {
    try {
      // La copia del bucle vive fuera del árbol: la librería se carga de scripts/coordinador/ del árbol de trabajo.
      const carga = (f) => import(pathToFileURL(join(process.cwd(), 'scripts/coordinador', f)).href)
      const { textoParaLaCuenta } = await carga('consolidar-docs.mjs')
      const { leerPlan } = await carga('plan.mjs')
      texto = textoParaLaCuenta('.', leerPlan(readFileSync('docs/plan.yaml', 'utf8')))
    } catch {
      // sin la librería del plan, vale la bitácora sola
    }
  }
  console.log(JSON.stringify(cuentaE2e(texto)))
}
