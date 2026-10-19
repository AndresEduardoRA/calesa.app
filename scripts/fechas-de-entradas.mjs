// Revisa la fecha de cada entrada de `docs/DECISIONES.md` y de `docs/BITACORA.md`. La entrada lleva el día en que se escribió, en hora de
// La Paz (`TZ=America/La_Paz date +%F`), y van en orden: una fecha posterior a hoy o anterior a la de la entrada de arriba es un error
// de quien la escribió, no una decisión. El cierre 5b encontró 35 entradas que se habían adelantado a su commit (hasta dos días) y
// dejaban dos inversiones de orden; esta guarda las impide.
// Uso: node scripts/fechas-de-entradas.mjs   (lo corre `bash scripts/mapa.sh --check`, y por eso lefthook en pre-commit y CI)
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const ZONA_DE_LAS_FECHAS = 'America/La_Paz'

// DECISIONES: `## AAAA-MM-DD — título`. BITACORA: `AAAA-MM-DD — …` al principio de la línea. La plantilla (`## AAAA-MM-DD`) no tiene dígitos.
export const FORMATOS = {
  decisiones: /^## (\d{4}-\d{2}-\d{2}) — /,
  bitacora: /^(\d{4}-\d{2}-\d{2}) — /,
}

// El día de hoy como AAAA-MM-DD en la zona de las fechas del repo.
export function hoyEnLaPaz(ahora = new Date()) {
  return ahora.toLocaleDateString('en-CA', { timeZone: ZONA_DE_LAS_FECHAS })
}

// Las entradas de un texto: su línea (desde 1) y su fecha, en el orden en que están.
export function fechasDeEntradas(texto, formato) {
  const entradas = []
  texto.split('\n').forEach((linea, i) => {
    const coincide = FORMATOS[formato].exec(linea)
    if (coincide?.[1]) {
      entradas.push({ linea: i + 1, fecha: coincide[1] })
    }
  })
  return entradas
}

// Los problemas de una lista de entradas: una fecha de mañana en adelante, o más vieja que la de la entrada de arriba.
export function problemasDeFechas(entradas, hoy) {
  const problemas = []
  let anterior = null
  for (const { linea, fecha } of entradas) {
    if (fecha > hoy) {
      // Una fecha de mañana no es la vara de las que le siguen: se señala ella y no las que están bien.
      problemas.push({ linea, fecha, motivo: `es posterior a hoy (${hoy})` })
      continue
    }
    if (anterior !== null && fecha < anterior.fecha) {
      problemas.push({
        linea,
        fecha,
        motivo: `va después de la entrada de la línea ${String(anterior.linea)} (${anterior.fecha}): las entradas van en orden`,
      })
    }
    anterior = { linea, fecha }
  }
  return problemas
}

const ARCHIVOS = [
  ['docs/DECISIONES.md', 'decisiones'],
  ['docs/BITACORA.md', 'bitacora'],
]

function principal() {
  const hoy = hoyEnLaPaz()
  let fallos = 0
  for (const [archivo, formato] of ARCHIVOS) {
    const entradas = fechasDeEntradas(readFileSync(archivo, 'utf8'), formato)
    for (const p of problemasDeFechas(entradas, hoy)) {
      console.error(`✗ ${archivo}:${String(p.linea)}: la fecha ${p.fecha} ${p.motivo}`)
      fallos += 1
    }
  }
  if (fallos > 0) {
    console.error(
      `Las fechas de las entradas salen de \`TZ=${ZONA_DE_LAS_FECHAS} date +%F\` (hoy es ${hoy}), no de la memoria.`,
    )
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal()
}
