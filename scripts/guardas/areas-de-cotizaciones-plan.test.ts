import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { leerPlan } from '../coordinador/plan.mjs'
import { MODULO } from './areas-de-cotizaciones'
import { RAIZ, archivosDelModulo } from './areas-de-cotizaciones-arbol'
import { problemasDelPlanDeAreas } from './areas-de-cotizaciones-plan'

// La coherencia de `docs/plan.yaml` con las áreas de `cotizaciones` (4.15-4 y 4.15-6b): cada carril posee áreas enteras, las familias del
// compilador las posee uno solo y una segunda pantalla de un área del carril que no es base la registra el carril base.
// Si cae: súmale a `dueno_de` del carril lo que dice el mensaje (el carril A, en `docs/plan.yaml`).

const lugares = (area: string) =>
  [
    `features/${area}/`,
    `entities/${area}/`,
    `infra/${area}/`,
    `areas/${area}/`,
    `pantallas/${area}.ts`,
  ].map((l) => `${MODULO}${l}`)
const familia = `${MODULO}entities/compilador.ts`
const rutasConFamilia = [
  familia,
  `${MODULO}entities/validar-diseno.ts`,
  `${MODULO}entities/hoja.ts`,
]

describe('áreas de cotizaciones › docs/plan.yaml', () => {
  const plan = (b: string[]) => ({
    carriles: [
      { id: 'a', base: true, dueno_de: [MODULO, 'src/app/'] },
      { id: 'b', dueno_de: b },
    ],
  })

  it('un carril con áreas enteras y todas las familias del compilador pasa', () => {
    const b = [
      ...lugares('formula'),
      ...lugares('diseno'),
      `${MODULO}entities/validar-diseno.ts`,
      familia,
      'src/app/(app)/x/',
    ]
    expect(problemasDelPlanDeAreas(plan(b), rutasConFamilia)).toEqual([])
  })

  it('T10 un carril con un área a medias cae', () => {
    const b = lugares('formula').filter((l) => !l.endsWith('areas/formula/'))
    expect(problemasDelPlanDeAreas(plan(b), [])).toEqual([
      `carril b: posee el área formula pero no ${MODULO}areas/formula/`,
    ])
  })

  it('T10 un carril que posee un archivo del núcleo o una carpeta sin dueño cae', () => {
    expect(problemasDelPlanDeAreas(plan([`${MODULO}entities/hoja.ts`]), [])).toEqual([
      expect.stringContaining(`carril b: posee ${MODULO}entities/hoja.ts, que es del núcleo`),
    ])
    expect(problemasDelPlanDeAreas(plan([`${MODULO}features/pdf/`]), [])).toEqual([
      expect.stringContaining('que es una carpeta sin dueño'),
    ])
  })

  it('T10 una familia del compilador del árbol que su carril no posee cae', () => {
    expect(problemasDelPlanDeAreas(plan([familia]), rutasConFamilia)).toEqual([
      `carril b: no posee ${MODULO}entities/validar-diseno.ts, de las familias del compilador: súmalo a su dueno_de en docs/plan.yaml`,
    ])
  })

  it('T10 dos carriles con familias del compilador cae', () => {
    const dos = {
      carriles: [
        ...plan([familia]).carriles,
        { id: 'c', dueno_de: [`${MODULO}entities/validar-diseno.ts`] },
      ],
    }
    expect(
      problemasDelPlanDeAreas(dos, [familia, `${MODULO}entities/validar-diseno.ts`]),
    ).toContainEqual(expect.stringContaining('las poseen varios carriles (b, c)'))
  })

  describe('T14 las segundas pantallas de un área', () => {
    const pantalla = `${MODULO}pantallas/papelera-listado.ts`
    const arbol = [
      pantalla,
      `${MODULO}pantallas/papelera.ts`,
      `${MODULO}pantallas/listado-ficha.ts`,
    ]

    it('una segunda pantalla del árbol que el carril de su área no posee cae, y dice que la suma el carril base', () => {
      expect(problemasDelPlanDeAreas(plan(lugares('papelera')), arbol)).toEqual([
        `carril b: posee el área papelera pero no ${pantalla}: la suma el carril base a su dueno_de en docs/plan.yaml`,
      ])
    })

    it('con la pantalla en su dueno_de pasa', () => {
      expect(problemasDelPlanDeAreas(plan([...lugares('papelera'), pantalla]), arbol)).toEqual([])
    })

    it('una segunda pantalla de un área del carril base no pide nada', () => {
      expect(
        problemasDelPlanDeAreas(plan(lugares('papelera')), [`${MODULO}pantallas/listado-ficha.ts`]),
      ).toEqual([])
    })

    it('una pantalla en su dueno_de que no está en el árbol no pide nada', () => {
      expect(problemasDelPlanDeAreas(plan([...lugares('papelera'), pantalla]), [])).toEqual([])
    })

    it('la pantalla de la propia área (pantallas/papelera.ts) no da dos mensajes', () => {
      const sinPantalla = lugares('papelera').filter((l) => !l.endsWith('pantallas/papelera.ts'))
      expect(
        problemasDelPlanDeAreas(plan(sinPantalla), [`${MODULO}pantallas/papelera.ts`]),
      ).toEqual([`carril b: posee el área papelera pero no ${MODULO}pantallas/papelera.ts`])
    })
  })
})

describe('áreas de cotizaciones › el plan real', () => {
  it('T12 docs/plan.yaml le da a cada carril áreas enteras y las familias del compilador a uno solo', () => {
    const plan = leerPlan(readFileSync(join(RAIZ, 'docs/plan.yaml'), 'utf8'))
    const rutas = archivosDelModulo().map((a) => a.ruta)
    expect(problemasDelPlanDeAreas(plan, rutas)).toEqual([])
    const b = plan.carriles.find((c: { id?: unknown }) => c.id === 'b') as { dueno_de: string[] }
    expect(b.dueno_de).toEqual(expect.arrayContaining(lugares('formula')))
    expect(
      b.dueno_de.filter(
        (r) => r.includes('/entities/') && !/\/entities\/(formula|diseno|tablas)\/$/.test(r),
      ),
    ).toHaveLength(37)
  })
})
