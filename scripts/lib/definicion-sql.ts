// La definición vigente de una función SQL: la última `create [or replace] function` con ese nombre entre todas las migraciones,
// en orden. Sirve para las pruebas que corren o leen una función de la base sin levantar la base (PGlite, regex).
// Entiende los dos estilos: el escrito a mano (`create or replace function public.x(`) y el del volcado de la base aplastada
// (`CREATE OR REPLACE FUNCTION "public"."x"(`), y el cuerpo entre cualquier `$etiqueta$`.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type DefinicionSql = { archivo: string; texto: string }

const CARPETA = 'supabase/migrations'

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Todas las definiciones de `nombre` en un texto SQL, en orden: la sentencia entera, desde `create` hasta el `;` que cierra el cuerpo.
export function definicionesEn(sql: string, nombre: string, esquema = 'public'): string[] {
  const cabecera = new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?function\\s+"?${escapar(esquema)}"?\\."?${escapar(nombre)}"?\\s*\\(`,
    'gi',
  )
  const salida: string[] = []
  for (const m of sql.matchAll(cabecera)) {
    const inicio = m.index
    const as = /\bas\s+(\$[A-Za-z_]*\$)/i.exec(sql.slice(inicio))
    if (!as?.[1]) continue
    const etiqueta = as[1]
    const abre = inicio + as.index + as[0].length
    const cierra = sql.indexOf(etiqueta, abre)
    if (cierra < 0) continue
    const fin = sql.indexOf(';', cierra + etiqueta.length)
    salida.push(sql.slice(inicio, fin < 0 ? undefined : fin + 1))
  }
  return salida
}

// La última definición de `nombre` entre las migraciones (la que vale después de un reset).
export function definicionSql(
  nombre: string,
  raiz = process.cwd(),
  esquema = 'public',
): DefinicionSql {
  let ultima: DefinicionSql | null = null
  for (const archivo of readdirSync(join(raiz, CARPETA))
    .filter((a) => a.endsWith('.sql'))
    .sort()) {
    const definiciones = definicionesEn(
      readFileSync(join(raiz, CARPETA, archivo), 'utf8'),
      nombre,
      esquema,
    )
    const texto = definiciones.at(-1)
    if (texto) ultima = { archivo, texto }
  }
  if (!ultima) throw new Error(`ninguna migración define ${esquema}.${nombre}`)
  return ultima
}

// El texto de todas las migraciones, en orden (para las guardas que buscan en todo lo aplicado).
export function migracionesEnOrden(raiz = process.cwd()): { archivo: string; texto: string }[] {
  return readdirSync(join(raiz, CARPETA))
    .filter((a) => a.endsWith('.sql'))
    .sort()
    .map((archivo) => ({ archivo, texto: readFileSync(join(raiz, CARPETA, archivo), 'utf8') }))
}

// Todas las `create table` de `nombre` en un texto SQL, en orden: desde `create` hasta el `;` (entiende `if not exists` y las comillas del volcado).
export function tablasEn(sql: string, nombre: string, esquema = 'public'): string[] {
  const cabecera = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?${escapar(esquema)}"?\\."?${escapar(nombre)}"?\\s*\\(`,
    'gi',
  )
  const salida: string[] = []
  for (const m of sql.matchAll(cabecera)) {
    const inicio = m.index
    let nivel = 1
    let i = inicio + m[0].length
    let enTexto = false
    for (; i < sql.length && nivel > 0; i++) {
      const c = sql[i]
      if (c === "'") enTexto = !enTexto
      else if (!enTexto && c === '(') nivel++
      else if (!enTexto && c === ')') nivel--
    }
    if (nivel > 0) continue
    const fin = sql.indexOf(';', i)
    salida.push(sql.slice(inicio, fin < 0 ? undefined : fin + 1))
  }
  return salida
}

// La última definición de la tabla `nombre` entre las migraciones, con sus `check` y su orden de columnas tal como las aplica un reset.
export function tablaSql(nombre: string, raiz = process.cwd(), esquema = 'public'): DefinicionSql {
  let ultima: DefinicionSql | null = null
  for (const { archivo, texto } of migracionesEnOrden(raiz)) {
    const definida = tablasEn(texto, nombre, esquema).at(-1)
    if (definida) ultima = { archivo, texto: definida }
  }
  if (!ultima) throw new Error(`ninguna migración crea la tabla ${esquema}.${nombre}`)
  return ultima
}
