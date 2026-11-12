// El mismo caso en `_fase_validar()` de la base (PGlite con la tabla mínima y las reglas del flujo en una tabla): el mismo campo en el `hint` y el
// mismo texto. Si cambia la regla en SQL, esta prueba rompe la espejo de la app (`reglas-de-fase.ts`).
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import { valoresDeFase } from './formulario-de-fase'
import { validarFase, type ContextoDeFase, type ValoresDeFase } from './reglas-de-fase'

const FLUJO = '22222222-2222-4222-8222-222222222222'
const REGLAS = ['vitrina_web', 'portal_cliente', 'aduana', 'logistica']
const CON_TODAS: ContextoDeFase = {
  ambito: 'vehiculos',
  reglas: REGLAS.map((regla) => ({ regla, activa: true })),
}
const SIN_REGLAS: ContextoDeFase = { ambito: 'vehiculos', reglas: [] }

const BASE: ValoresDeFase = valoresDeFase({
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'En puerto',
  descripcion: null,
  color: '#465fff',
  icono: null,
  orden: 10,
  activa: true,
  esInicial: false,
  esFinal: false,
  esLogistica: false,
  demoraDias: null,
  alertaCadaHoras: null,
  notaObligatoria: false,
  permiteContenedor: true,
  permiteAduana: false,
  cuentaLlegadaRepuestos: false,
  publicaWeb: false,
  visiblePortal: false,
  aliasPortal: null,
  descripcionPortal: null,
})

const CASOS: { caso: string; cambios: Partial<ValoresDeFase>; contexto?: ContextoDeFase }[] = [
  { caso: 'una fase sana', cambios: {} },
  { caso: 'sin nombre', cambios: { nombre: '' } },
  { caso: 'nombre de 61', cambios: { nombre: 'a'.repeat(61) } },
  { caso: 'nombre de 60 con emojis', cambios: { nombre: '🚗'.repeat(60) } },
  { caso: 'descripción de 501', cambios: { descripcion: 'a'.repeat(501) } },
  { caso: 'descripción del portal de 501', cambios: { descripcionPortal: 'a'.repeat(501) } },
  { caso: 'alias de 61', cambios: { aliasPortal: 'a'.repeat(61) } },
  { caso: 'color sin #', cambios: { color: '465fff' } },
  { caso: 'color corto', cambios: { color: '#12345' } },
  { caso: 'color en mayúsculas', cambios: { color: '#ABCDEF' } },
  { caso: 'ícono con mayúsculas', cambios: { icono: 'Camion' } },
  { caso: 'ícono de 41', cambios: { icono: 'a'.repeat(41) } },
  { caso: 'ícono bueno', cambios: { icono: 'truck-2' } },
  { caso: 'demora negativa', cambios: { demoraDias: '-1' } },
  { caso: 'demora 0 apaga la alerta', cambios: { demoraDias: '0' } },
  { caso: 'alerta 0', cambios: { alertaCadaHoras: '0' } },
  { caso: 'alerta 721', cambios: { alertaCadaHoras: '721' } },
  { caso: 'alerta 720', cambios: { alertaCadaHoras: '720' } },
  { caso: 'inicial y final', cambios: { esInicial: true, esFinal: true } },
  { caso: 'portal sin alias', cambios: { visiblePortal: true } },
  { caso: 'portal con alias', cambios: { visiblePortal: true, aliasPortal: 'En camino' } },
  { caso: 'web con la regla apagada', cambios: { publicaWeb: true }, contexto: SIN_REGLAS },
  {
    caso: 'portal con la regla apagada',
    cambios: { visiblePortal: true, aliasPortal: 'x' },
    contexto: SIN_REGLAS,
  },
  { caso: 'aduana con la regla apagada', cambios: { permiteAduana: true }, contexto: SIN_REGLAS },
  { caso: 'logística con la regla apagada', cambios: { esLogistica: true }, contexto: SIN_REGLAS },
  { caso: 'todo encendido con sus reglas', cambios: { publicaWeb: true, esLogistica: true } },
]

// Lo que `fase_crear()` le pasa a `_fase_validar()` tras mezclar: los textos recortados y los opcionales vacíos, nulos.
function aJson(v: ValoresDeFase) {
  const texto = (t: string) => (t.trim() === '' ? null : t.trim())
  const numero = (t: string) => (t.trim() === '' ? null : Number(t))
  return {
    flujo_id: FLUJO,
    nombre: v.nombre.trim(),
    descripcion: texto(v.descripcion),
    descripcion_portal: texto(v.descripcionPortal),
    alias_portal: texto(v.aliasPortal),
    color: v.color,
    icono: texto(v.icono),
    demora_dias: numero(v.demoraDias),
    alerta_cada_horas: numero(v.alertaCadaHoras),
    es_inicial: v.esInicial,
    es_final: v.esFinal,
    es_logistica: v.esLogistica,
    permite_aduana: v.permiteAduana,
    publica_web: v.publicaWeb,
    visible_portal: v.visiblePortal,
  }
}

describe('validarFase contra _fase_validar() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create table public.fases (
        flujo_id uuid, nombre text, descripcion text, descripcion_portal text, alias_portal text, color text, icono text,
        demora_dias integer, alerta_cada_horas integer, es_inicial boolean, es_final boolean, es_logistica boolean,
        permite_aduana boolean, publica_web boolean, visible_portal boolean
      );
      create table public.flujos_reglas (flujo_id uuid, regla text, activa boolean);
      create function public.flujo_regla_activa(p_flujo uuid, p_regla text) returns boolean language sql stable
        set search_path = '' as $$
          select exists (select 1 from public.flujos_reglas r where r.flujo_id = p_flujo and r.regla = p_regla and r.activa) $$;`)
    await db.exec(definicionSql('_fase_validar').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function enLaBase(v: ValoresDeFase, contexto: ContextoDeFase) {
    await db.exec('delete from public.flujos_reglas')
    for (const { regla, activa } of contexto.reglas) {
      await db.query('insert into public.flujos_reglas values ($1, $2, $3)', [FLUJO, regla, activa])
    }
    const json = aJson(v)
    try {
      await db.query(
        `select public._fase_validar(json_populate_record(null::public.fases, $1::json), $2::text[])`,
        [JSON.stringify(json), `{${Object.keys(json).join(',')}}`],
      )
      return { ok: true as const }
    } catch (error) {
      const { message, hint } = error as { message: string; hint?: string }
      return { ok: false as const, message, hint }
    }
  }

  it.each(CASOS)('$caso', async ({ cambios, contexto = CON_TODAS }) => {
    const valores = { ...BASE, ...cambios }
    const base = await enLaBase(valores, contexto)
    const espejo = validarFase(valores, contexto)
    expect(espejo.ok).toBe(base.ok)
    if (!base.ok && !espejo.ok) {
      expect(base.hint).toBeTruthy()
      expect(espejo.errores).toHaveProperty([base.hint ?? ''], base.message)
    }
  })
})
