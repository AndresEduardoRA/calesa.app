// 9-11: cuando cae el e2e en CI, el artefacto del rojo lleva el rastro de la base (`scripts/ci/volcar-base.sh`). Sin él, un rojo por
// lentitud se reconstruía a ciegas. Lee el workflow por líneas, como `workflows.ts`; la prueba es `workflows-fallo.test.ts`.

// Los archivos que el guion tiene que dejar en la carpeta (nombres exactos: los lee quien abre el artefacto).
export const ARCHIVOS_DEL_VOLCADO = [
  'base-docker.log',
  'pg_stat_statements.txt',
  'pg_stat_user_tables-leads.txt',
  'pg_stat_checkpointer.txt',
  'cron-job_run_details.txt',
]

export const GUION_DEL_VOLCADO = 'scripts/ci/volcar-base.sh'

const CORRE_EL_E2E = /\bplaywright test\b/

// Los pasos de un workflow: cada bloque que arranca con `      - ` (los pasos de un job viven a seis espacios) y llega hasta el
// siguiente paso o hasta una línea menos sangrada.
function pasosDe(texto: string): string[] {
  const pasos: string[] = []
  let abierto = false
  for (const linea of texto.split('\n')) {
    if (/^ {6}- /.test(linea)) {
      pasos.push(linea)
      abierto = true
    } else if (/^ {0,5}\S/.test(linea)) {
      abierto = false
    } else if (abierto) {
      pasos[pasos.length - 1] += `\n${linea}`
    }
  }
  return pasos
}

const sinComentarios = (texto: string) =>
  texto
    .split('\n')
    .map((l) => l.replace(/(^|\s)#.*$/, ''))
    .join('\n')

const caeEnFallo = (paso: string) => /^\s*(?:-\s*)?if:\s*failure\(\)\s*$/m.test(paso)

// Un workflow que corre el e2e vuelca la base cuando falla: un paso `if: failure()` que llama al guion con la carpeta que el artefacto
// sube, un `upload-artifact` `if: failure()` con `e2e-fallos/`, y el guion deja los cinco archivos. `guion` es su texto.
export function problemasDelPasoDeFallo(texto: string, archivo: string, guion: string): string[] {
  const codigo = sinComentarios(texto)
  if (!CORRE_EL_E2E.test(codigo)) return []
  const pasos = pasosDe(codigo)
  const problemas: string[] = []
  const volcado = pasos.find((p) => caeEnFallo(p) && p.includes(GUION_DEL_VOLCADO))
  if (volcado === undefined) {
    problemas.push(
      `${archivo}: el e2e no vuelca la base al caer: falta un paso «if: failure()» que corra ${GUION_DEL_VOLCADO} (9-11)`,
    )
  } else if (!/volcar-base\.sh\s+e2e-fallos\b/.test(volcado)) {
    problemas.push(`${archivo}: el volcado de la base tiene que ir a la carpeta e2e-fallos`)
  }
  const sube = pasos.find((p) => caeEnFallo(p) && p.includes('actions/upload-artifact'))
  if (sube === undefined) {
    problemas.push(`${archivo}: el e2e no sube el artefacto del rojo con «if: failure()»`)
  } else if (!/^\s*e2e-fallos\/\s*$/m.test(sube)) {
    problemas.push(
      `${archivo}: el artefacto del rojo no incluye e2e-fallos/ (ahí queda el volcado de la base)`,
    )
  }
  for (const nombre of ARCHIVOS_DEL_VOLCADO) {
    if (!guion.includes(nombre)) {
      problemas.push(`${GUION_DEL_VOLCADO}: no deja ${nombre}`)
    }
  }
  return problemas
}
