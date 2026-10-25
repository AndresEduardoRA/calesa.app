// Las carreras de la cartera, del vínculo y de las oportunidades, con dos conexiones reales a la base del Supabase LOCAL
// (PGlite, el de `db:probar`, no tiene concurrencia). Sin `sleep`: A abre una transacción y actúa
// (retiene el lock); B lanza su llamada; el orquestador espera en `pg_stat_activity` a que B esté
// esperando un lock; A confirma y se mira cómo terminó B. Si B no llega a esperar, la carrera no se
// probó y el script falla (no reintenta). Trabaja sobre su propio terreno (prefijo «Carreras») y lo
// borra al terminar y al empezar. Uso: pnpm db:carreras
import { readFileSync } from 'node:fs'
import pg from 'pg'
import {
  PERSONAS,
  comoPersona,
  leadDeLaDuena,
  limpiar,
  sembrar,
  vehiculo,
} from './carreras/terreno.mjs'
import { carrerasDeOportunidades } from './carreras/oportunidades.mjs'
import { carrerasDelPortal } from './carreras/portal.mjs'
import { carrerasDeDeshacer, carrerasDeImportacion } from './carreras/importacion.mjs'
import { carrerasDeAlta } from './carreras/alta.mjs'
import { carrerasDeOrigenes } from './carreras/origenes.mjs'
import { carrerasDeTipos } from './carreras/tipos.mjs'
import { carrerasDeTonos } from './carreras/tonos.mjs'
import { carrerasDeNiveles } from './carreras/niveles.mjs'
import { carrerasDeCotizaciones } from './carreras/cotizaciones.mjs'
import { carrerasDeConfiguracionDeLeads } from './carreras/configuracion-de-leads.mjs'
import { carrerasDeMarcas } from './carreras/marcas.mjs'
import { carrerasDeNumeros } from './carreras/numeros.mjs'
import { carrerasDeLaRueda } from './carreras/rueda.mjs'
import { carrerasDeLaCartera, carrerasDePrivacidad } from './carreras/cartera.mjs'

const toml = readFileSync('supabase/config.toml', 'utf8')
const puerto = /^\[db\][^[]*?^port\s*=\s*(\d+)/ms.exec(toml)?.[1]
const url =
  process.env.CARRERAS_DB_URL ?? `postgresql://postgres:postgres@127.0.0.1:${puerto}/postgres`
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  console.error('Las carreras escriben y borran datos: sólo contra la base local.')
  process.exit(1)
}

const conectar = async () => {
  const c = new pg.Client({ connectionString: url })
  await c.connect()
  return c
}

// El resultado de una llamada como valor: { ok, valor } o { ok: false, codigo, mensaje }.
const comoValor = (promesa) =>
  promesa.then(
    (r) => ({ ok: true, valor: r.rows[0]?.r ?? null }),
    (e) => ({ ok: false, codigo: e.code, mensaje: e.message }),
  )

async function esperarBloqueo(orquesta, pid) {
  const hasta = Date.now() + 10_000
  while (Date.now() < hasta) {
    const { rows } = await orquesta.query(
      `select wait_event_type from pg_stat_activity where pid = $1`,
      [pid],
    )
    if (rows[0]?.wait_event_type === 'Lock') return
    await new Promise((listo) => setImmediate(listo))
  }
  throw new Error('B nunca esperó el lock de A: la carrera no se probó')
}

// Lo que corre cada lado: una llamada (`sql`, dentro de un `select`) o una consulta entera (`consulta`, que devuelve `r`).
const consultaDe = (lado) => lado.consulta ?? `select ${lado.sql} as r`

// Una carrera: A actúa dentro de una transacción; B intenta mientras A no confirma.
async function carrera(orquesta, { a, b }) {
  const [ca, cb] = [await conectar(), await conectar()]
  try {
    // Una persona del equipo, o un rol de la base (el portal del cliente llama como `service_role`).
    for (const [c, lado] of [
      [ca, a],
      [cb, b],
    ]) {
      if (lado.rol) await c.query(`set role ${lado.rol}`)
      else await comoPersona(c, lado.persona)
    }
    await ca.query('begin')
    const primero = await comoValor(ca.query(consultaDe(a), a.args))
    if (!primero.ok) throw new Error(`A falló antes de la carrera: ${primero.mensaje}`)
    const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
    const segundo = comoValor(cb.query(consultaDe(b), b.args))
    await esperarBloqueo(orquesta, pidB)
    await ca.query('commit')
    return { a: primero, b: await segundo }
  } finally {
    await ca.end()
    await cb.end()
  }
}

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const version = async (db, tabla, id) =>
  (await db.query(`select actualizado_en::text as v from public.${tabla} where id = $1`, [id]))
    .rows[0].v
const duenoDe = async (db, lead) =>
  (
    await db.query(
      `select usuario_id from public.leads_asesores where lead_id = $1 and tipo_acceso = 'dueno' and revocado_en is null`,
      [lead],
    )
  ).rows[0]?.usuario_id

const fallas = []
function espero(nombre, condicion, detalle) {
  console.log(`  ${condicion ? '✓' : '✗'} ${nombre}`)
  if (!condicion) fallas.push(`${nombre}: ${JSON.stringify(detalle)}`)
}

const { duena, compartido, supervision, destino } = PERSONAS
const orquesta = await conectar()
const inicio = Date.now()
try {
  await limpiar(orquesta)
  await sembrar(orquesta)

  console.log('Dos transferencias a la vez')
  for (const [quien, otro] of [
    [duena, supervision],
    [supervision, duena],
  ]) {
    const lead = await leadDeLaDuena(orquesta, `transferir ${quien.slice(-1)}`)
    const transferir = { sql: 'public.lead_transferir($1, $2, $3)' }
    const r = await carrera(orquesta, {
      a: { ...transferir, persona: quien, args: [lead, destino, duena] },
      b: { ...transferir, persona: otro, args: [lead, compartido, duena] },
    })
    // La supervisión que llega tarde ve que el dueño cambió (PT409); la dueña que llega tarde ya no es
    // la dueña (42501). En los dos casos queda la primera y nada se pisa.
    const esperado =
      quien === duena
        ? r.b.codigo === 'PT409'
        : r.b.codigo === '42501' && r.b.mensaje === 'Sólo quien es dueño del lead lo transfiere.'
    espero(
      `gana la primera y la segunda lo dice (primero ${quien === duena ? 'la dueña' : 'la supervisión'}): ${r.b.mensaje}`,
      esperado && (await duenoDe(orquesta, lead)) === destino,
      r.b,
    )
  }

  console.log('Quitar el acceso mientras el compartido edita o anota')
  {
    const lead = await leadDeLaDuena(orquesta, 'revocar 1', { compartidoCon: compartido })
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: {
        persona: compartido,
        sql: `public.lead_guardar($1, $2, '{"nombre": "Carreras editado"}')`,
        args: [lead, await version(orquesta, 'leads', lead)],
      },
    })
    espero('revoca primero: el compartido ya no edita (42501)', r.b.codigo === '42501', r.b)
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'revocar 2', { compartidoCon: compartido })
    const r = await carrera(orquesta, {
      a: {
        persona: compartido,
        sql: `public.lead_guardar($1, $2, '{"nombre": "Carreras editado 2"}')`,
        args: [lead, await version(orquesta, 'leads', lead)],
      },
      b: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
    })
    const { rows } = await orquesta.query('select nombre from public.leads where id = $1', [lead])
    espero(
      'edita primero: lo editado queda y la revocación entra después',
      r.b.ok && rows[0].nombre === 'Carreras editado 2',
      r.b,
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'revocar 3', { compartidoCon: compartido })
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: {
        persona: compartido,
        sql: `public.seguimiento_crear(gen_random_uuid(), $1, jsonb_build_object('tipo_id',
          (select id from public.tipos_seguimiento where activo order by orden limit 1), 'titulo', 'Carreras'))`,
        args: [lead],
      },
    })
    espero('revoca primero: el compartido ya no anota (42501)', r.b.codigo === '42501', r.b)
  }

  {
    const lead = await leadDeLaDuena(orquesta, 'revocar 4', { compartidoCon: compartido })
    const {
      rows: [nota],
    } = await orquesta.query(
      `insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo)
       values ($1, $2, (select id from public.tipos_seguimiento where activo order by orden limit 1), 'Carreras')
       returning id, actualizado_en::text as v`,
      [lead, compartido],
    )
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: {
        persona: compartido,
        sql: `public.seguimiento_guardar($1, $2, '{"titulo": "Carreras corregido"}')`,
        args: [nota.id, nota.v],
      },
    })
    espero(
      'revoca primero: el compartido ya no corrige su seguimiento (42501)',
      r.b.codigo === '42501',
      r.b,
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'revocar 5', { compartidoCon: compartido })
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: {
        persona: compartido,
        sql: `public.recordatorio_crear(gen_random_uuid(), $1, 'Carreras', now() + interval '1 day')`,
        args: [lead],
      },
    })
    espero(
      'revoca primero: el compartido ya no agenda sobre el lead (42501)',
      r.b.codigo === '42501',
      r.b,
    )
  }

  console.log('Enviar a la papelera mientras otro comparte')
  {
    const lead = await leadDeLaDuena(orquesta, 'papelera 1')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_papelera_enviar(gen_random_uuid(), array[$1::uuid])',
        args: [lead],
      },
      b: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, destino] },
    })
    espero('envía primero: compartir no encuentra el lead (42501)', r.b.codigo === '42501', r.b)
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'papelera 2')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, destino] },
      b: {
        persona: duena,
        sql: 'public.leads_papelera_enviar(gen_random_uuid(), array[$1::uuid])',
        args: [lead],
      },
    })
    espero('comparte primero: el envío entra después', r.b.ok, r.b)
  }

  console.log('El mismo vehículo a dos leads a la vez')
  {
    const [uno, dos] = [
      await leadDeLaDuena(orquesta, 'vínculo 1'),
      await leadDeLaDuena(orquesta, 'vínculo 2'),
    ]
    const auto = await vehiculo(orquesta, 'mismo auto')
    const vieja = await version(orquesta, 'vehiculos', auto)
    const vincular = { persona: duena, sql: 'public.vehiculo_vincular($1, $2, $3)' }
    const r = await carrera(orquesta, {
      a: { ...vincular, args: [auto, vieja, uno] },
      b: { ...vincular, args: [auto, vieja, dos] },
    })
    const { rows } = await orquesta.query('select lead_id from public.vehiculos where id = $1', [
      auto,
    ])
    espero(
      'uno lo vincula y el otro recibe PT409',
      r.b.codigo === 'PT409' && rows[0].lead_id === uno,
      r.b,
    )
  }

  console.log('Vincular mientras se envía el lead a la papelera')
  {
    const lead = await leadDeLaDuena(orquesta, 'vincular y papelera 1')
    const auto = await vehiculo(orquesta, 'auto 1')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.vehiculo_vincular($1, $2, $3)',
        args: [auto, await version(orquesta, 'vehiculos', auto), lead],
      },
      b: {
        persona: duena,
        sql: 'public.leads_papelera_enviar(gen_random_uuid(), array[$1::uuid])',
        args: [lead],
      },
    })
    espero(
      'vincula primero: el envío lo rechaza por el vehículo (23514)',
      r.b.codigo === '23514',
      r.b,
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'vincular y papelera 2')
    const auto = await vehiculo(orquesta, 'auto 2')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.leads_papelera_enviar(gen_random_uuid(), array[$1::uuid])',
        args: [lead],
      },
      b: {
        persona: duena,
        sql: 'public.vehiculo_vincular($1, $2, $3)',
        args: [auto, await version(orquesta, 'vehiculos', auto), lead],
      },
    })
    const { rows } = await orquesta.query('select lead_id from public.vehiculos where id = $1', [
      auto,
    ])
    espero(
      'envía primero: vincular no encuentra el lead (42501) y el vehículo queda libre',
      r.b.codigo === '42501' && rows[0].lead_id === null,
      { b: r.b, lead_id: rows[0].lead_id },
    )
  }

  await carrerasDeOportunidades({ orquesta, carrera, espero })
  await carrerasDelPortal({ orquesta, carrera, espero, conectar })
  await carrerasDeImportacion({ orquesta, carrera, espero, conectar })
  await carrerasDeDeshacer({ orquesta, carrera, espero, conectar })
  await carrerasDeAlta({ orquesta, carrera, espero, conectar })
  await carrerasDeOrigenes({ orquesta, carrera, espero })
  await carrerasDeTipos({ orquesta, carrera, espero })
  await carrerasDeTonos({ orquesta, carrera, espero })
  await carrerasDeNiveles({ orquesta, carrera, espero, conectar, esperarBloqueo })
  await carrerasDeCotizaciones({ orquesta, carrera, espero, conectar, esperarBloqueo })
  await carrerasDeConfiguracionDeLeads({ orquesta, carrera, espero })
  await carrerasDeMarcas({ orquesta, carrera, espero })
  await carrerasDeNumeros({ orquesta, carrera, espero, conectar, esperarBloqueo })
  await carrerasDeLaCartera({ orquesta, carrera, espero, conectar, esperarBloqueo })
  await carrerasDePrivacidad({ orquesta, carrera, espero })
  await carrerasDeLaRueda({ orquesta, espero, conectar, esperarBloqueo })
} finally {
  await limpiar(orquesta).catch((e) => fallas.push(`limpiar: ${e.message}`))
  await orquesta.end()
}

console.log(
  `\n${fallas.length === 0 ? 'Todas las carreras en verde' : 'Fallaron'} (${((Date.now() - inicio) / 1000).toFixed(1)} s).`,
)
if (fallas.length > 0) {
  for (const falla of fallas) console.error(`  ${falla}`)
  process.exit(1)
}
