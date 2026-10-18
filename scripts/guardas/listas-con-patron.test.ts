import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LISTAS_SIN_PATRON } from './listas-con-patron'

// Toda lista de un módulo usa el patrón de lista (`@/shared/ui/lista`) o figura en `listas-con-patron.ts` con su motivo. Es la guarda
// de los paneles y los `<Confirmar>`, para el patrón de las tablas: una lista nueva que dibuja su propia tabla, sin el clic en la
// fila, el nombre pegado ni el «⋯» de siempre, rompe esta prueba.

const RAIZ = process.cwd()

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const leer = (archivo: string) => sinComentarios(readFileSync(join(RAIZ, archivo), 'utf8'))

// Dibuja una tabla de registros o elige entre tabla y tarjetas por el ancho.
const ES_UNA_LISTA =
  /<Table(?:Header|Body|Footer|Row|Head|Cell|Caption)?[\s>]|<table[\s>]|CORTE_DE_LA_TABLA/
const USA_EL_PATRON = /from '@\/shared\/ui\/lista'/

const delasListas = [...archivos(join(RAIZ, 'src/modules'))]
  .map((ruta) => relative(RAIZ, ruta).replaceAll('\\', '/'))
  .filter((archivo) => ES_UNA_LISTA.test(leer(archivo)))
  .sort()

describe('toda lista de un módulo usa el patrón de lista', () => {
  it('cada archivo que dibuja una tabla importa el patrón o figura con su motivo', () => {
    const sinPatron = delasListas.filter(
      (archivo) => !USA_EL_PATRON.test(leer(archivo)) && !(archivo in LISTAS_SIN_PATRON),
    )
    expect(
      sinPatron,
      'estas listas no usan @/shared/ui/lista ni figuran en scripts/guardas/listas-con-patron.ts',
    ).toEqual([])
  })

  it('las listas de leads y de vehículos lo usan (no están registradas como excepción)', () => {
    for (const archivo of [
      'src/modules/leads/features/listado/components/tabla-de-leads.tsx',
      'src/modules/vehiculos/features/listado/components/tabla-de-vehiculos.tsx',
    ]) {
      expect(delasListas, `${archivo} ya no dibuja una tabla`).toContain(archivo)
      expect(leer(archivo), `${archivo} no importa el patrón`).toMatch(USA_EL_PATRON)
      expect(LISTAS_SIN_PATRON).not.toHaveProperty([archivo])
    }
  })

  it('una excepción sigue siendo una lista que no usa el patrón, y dice por qué', () => {
    for (const [archivo, motivo] of Object.entries(LISTAS_SIN_PATRON)) {
      expect(delasListas, `${archivo} ya no dibuja una tabla: sácalo del registro`).toContain(
        archivo,
      )
      expect(leer(archivo), `${archivo} ya usa el patrón: sácalo del registro`).not.toMatch(
        USA_EL_PATRON,
      )
      expect(motivo.length, `${archivo}: falta el motivo`).toBeGreaterThan(30)
    }
  })
})
