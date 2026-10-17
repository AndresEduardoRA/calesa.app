import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TAMANO_DE_PAGINA_DE_EXPORTACION } from '../../src/modules/leads/entities/exportacion'
import { MAXIMO_DE_PAGINA_DE_LEADS } from '../../src/modules/leads/entities/listado'
import { MAXIMO_DE_PAGINA_DE_VEHICULOS } from '../../src/modules/vehiculos/entities/vehiculo'
import { TAMANOS_DE_PAGINA, TAMANO_DE_PAGINA_POR_DEFECTO } from '../../src/shared/lib/paginacion'
import {
  PARAMETROS_DE_TAMANO,
  acotaAMano,
  cotaDeLaBase,
  llamadasConTamano,
  maxRows,
  tamanosDelCheck,
  ultimaDefinicion,
} from './paginas'
import { RPC_PAGINADAS } from './paginas-en-la-base'

// La guarda del tamaño de página (9g, `.claude/rules/escala.md`): el tamaño sale de un solo punto del código y cada RPC
// con tamaño lo acota en la base con un máximo declarado, que no puede ser menor que lo que el código le pide. Lee las
// migraciones (la última definición de cada RPC), el código de `src/`, el `check` de la preferencia y `max_rows`. Corre en
// `pnpm test`; el lado SQL (lo que hay en `pg_proc`) lo vigila `supabase/tests/escala.sql` en `pnpm db:probar`.

const RAIZ = process.cwd()

const migraciones = readdirSync(join(RAIZ, 'supabase/migrations'))
  .filter((nombre) => nombre.endsWith('.sql'))
  .sort()
  .map((archivo) => ({
    archivo,
    texto: readFileSync(join(RAIZ, 'supabase/migrations', archivo), 'utf8'),
  }))

function* archivosDeSrc(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (/(node_modules|\.next|\.test\.|\.spec\.|database\.types)/.test(ruta)) {
      continue
    }
    if (e.isDirectory()) {
      yield* archivosDeSrc(ruta)
    } else if (/\.tsx?$/.test(e.name)) {
      yield ruta
    }
  }
}

const llamadas = [...archivosDeSrc(join(RAIZ, 'src'))].flatMap((ruta) =>
  llamadasConTamano(readFileSync(ruta, 'utf8')).map((l) => ({
    ...l,
    archivo: relative(RAIZ, ruta).replaceAll('\\', '/'),
  })),
)

describe('el lector de la guarda', () => {
  const rpc = `create or replace function public.mi_lista(p_x uuid, p_tamano int default 20)
returns jsonb language sql as $$
  select public._acotar_pagina(p_tamano, 20, 50);
$$;`
  it('encuentra la última definición y su cota', () => {
    const vieja = { archivo: 'a.sql', texto: rpc.replace('20, 50', '20, 10') }
    const nueva = { archivo: 'b.sql', texto: rpc }
    const hallada = ultimaDefinicion([vieja, nueva], 'mi_lista')
    expect(hallada?.archivo).toBe('b.sql')
    expect(cotaDeLaBase(hallada?.cuerpo ?? '', 'p_tamano')).toEqual({ defecto: 20, maximo: 50 })
    expect(ultimaDefinicion([vieja], 'otra')).toBeNull()
  })

  it('un parámetro sin acotar, o acotado a mano, no pasa', () => {
    expect(cotaDeLaBase('select 1 limit p_tamano', 'p_tamano')).toBeNull()
    expect(cotaDeLaBase('_acotar_pagina(p_otro, 20, 50)', 'p_tamano')).toBeNull()
    expect(acotaAMano('v int := least(greatest(coalesce(p_tamano, 20), 1), 50);')).toBe(true)
    expect(acotaAMano('v int := public._acotar_pagina(p_tamano, 20, 50);')).toBe(false)
  })

  it('ve un número escrito a mano en una llamada, y una constante no', () => {
    const fuente = `
      await supabase.rpc('lead_seguimientos', { p_lead: id, p_tamano: 100 })
      await supabase.rpc('lead_seguimientos', { p_lead: id, p_tamano: TAMANO_DE_VER_MAS })
      await supabase.rpc('otra', { p_lead: id })
      await supabase.rpc('con_spread', {
        ...(cursor ? { p_antes_en: cursor.creadoEn, p_antes_id: cursor.id } : {}),
        p_tope: tamano + 1,
      })`
    expect(llamadasConTamano(fuente)).toEqual([
      { rpc: 'lead_seguimientos', parametro: 'p_tamano', literal: true, texto: '100' },
      {
        rpc: 'lead_seguimientos',
        parametro: 'p_tamano',
        literal: false,
        texto: 'TAMANO_DE_VER_MAS',
      },
      { rpc: 'con_spread', parametro: 'p_tope', literal: false, texto: 'tamano + 1' },
    ])
  })

  it('lee el check de la preferencia y max_rows', () => {
    expect(
      tamanosDelCheck(`constraint preferencias_por_pagina_valida check (
    clave <> 'listas.por_pagina' or valor in ('10'::jsonb, '25'::jsonb))`),
    ).toEqual([10, 25])
    expect(tamanosDelCheck('nada')).toBeNull()
    expect(maxRows('[api]\nmax_rows = 1000\n')).toBe(1000)
    expect(maxRows('[api]')).toBeNull()
  })
})

describe('cada RPC con tamaño de página acota en la base', () => {
  for (const r of RPC_PAGINADAS) {
    it(`${r.rpc}(${r.parametro}): ${r.lista}`, () => {
      const definicion = ultimaDefinicion(migraciones, r.rpc)
      expect(definicion, `no encontré ${r.rpc} en las migraciones`).not.toBeNull()
      const cuerpo = definicion?.cuerpo ?? ''
      expect(acotaAMano(cuerpo), `${r.rpc} acota a mano: usa _acotar_pagina`).toBe(false)
      const cota = cotaDeLaBase(cuerpo, r.parametro)
      expect(
        cota,
        `${r.rpc} (${definicion?.archivo}) no acota ${r.parametro} con _acotar_pagina`,
      ).not.toBeNull()
      // El máximo de la base no puede ser menor que lo que el código le pide: si lo fuera, la lista llegaría cortada.
      expect(
        cota?.maximo ?? 0,
        `el máximo de ${r.rpc} es menor que lo que pide el código`,
      ).toBeGreaterThanOrEqual(r.pideElCodigo)
      // Y el valor por defecto (cuando el cliente no manda nada) es el del código, así nadie ve otra cosa sin pedirla.
      expect(cota?.defecto, `el valor por defecto de ${r.rpc} no es el del código`).toBe(
        r.pideElCodigo,
      )
      expect(cota?.defecto ?? 0).toBeLessThanOrEqual(cota?.maximo ?? 0)
    })
  }

  it('toda función de la base con un parámetro de tamaño que un cliente puede llamar está en el registro', () => {
    const conocidas = new Set(RPC_PAGINADAS.map((r) => `${r.rpc}.${r.parametro}`))
    const noRegistradas = llamadas
      .filter((l) => !conocidas.has(`${l.rpc}.${l.parametro}`))
      .map((l) => `${l.archivo}: ${l.rpc}(${l.parametro})`)
    expect(noRegistradas, 'agrégalas a scripts/guardas/paginas-en-la-base.ts').toEqual([])
  })

  it('el código nunca escribe a mano el tamaño que le pide a la base', () => {
    expect(
      llamadas
        .filter((l) => l.literal)
        .map((l) => `${l.archivo}: ${l.rpc}(${l.parametro}: ${l.texto})`),
    ).toEqual([])
  })

  it('cada entrada del registro tiene quién la llame (si no, se saca)', () => {
    const usadas = new Set(llamadas.map((l) => `${l.rpc}.${l.parametro}`))
    // El kanban llama con un objeto armado en otra parte (`p_tope` y `p_tope_total` juntos): alcanza con que se llame la RPC.
    const sinLlamar = RPC_PAGINADAS.filter(
      (r) => !usadas.has(`${r.rpc}.${r.parametro}`) && !llamadas.some((l) => l.rpc === r.rpc),
    ).map((r) => `${r.rpc}(${r.parametro})`)
    expect(sinLlamar).toEqual([])
  })

  it('el parámetro del registro es de los que la guarda de SQL reconoce como tamaño', () => {
    for (const r of RPC_PAGINADAS) {
      expect(PARAMETROS_DE_TAMANO.test(r.parametro), r.parametro).toBe(true)
    }
  })
})

describe('el tamaño de las listas con selector', () => {
  it('la base sólo admite los tamaños del selector, en el mismo orden', () => {
    const esquema = readFileSync(join(RAIZ, 'supabase/schemas/02_equipo/01_equipo.sql'), 'utf8')
    expect(tamanosDelCheck(esquema)).toEqual([...TAMANOS_DE_PAGINA])
  })

  it('el tamaño de fábrica y el máximo de cada lista son tamaños del selector', () => {
    expect(TAMANOS_DE_PAGINA).toContain(TAMANO_DE_PAGINA_POR_DEFECTO)
    for (const maximo of [MAXIMO_DE_PAGINA_DE_LEADS, MAXIMO_DE_PAGINA_DE_VEHICULOS]) {
      expect(
        TAMANOS_DE_PAGINA,
        `el máximo ${String(maximo)} no es un tamaño del selector`,
      ).toContain(maximo)
      expect(maximo).toBeGreaterThanOrEqual(TAMANO_DE_PAGINA_POR_DEFECTO)
    }
  })

  it('el listado y el inventario se leen por PostgREST: su tope en la base es max_rows, y cubre la página más larga y la exportación', () => {
    const tope = maxRows(readFileSync(join(RAIZ, 'supabase/config.toml'), 'utf8'))
    expect(tope).not.toBeNull()
    expect(tope ?? 0).toBeGreaterThanOrEqual(Math.max(...TAMANOS_DE_PAGINA) + 1)
    expect(tope ?? 0).toBeGreaterThanOrEqual(TAMANO_DE_PAGINA_DE_EXPORTACION + 1)
  })
})
