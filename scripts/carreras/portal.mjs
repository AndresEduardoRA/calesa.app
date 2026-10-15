// Las carreras del acceso del cliente (parte 7b). Candados: el equipo toma el lead y después la fila de
// `accesos_portal`; el portal (login, cambiar la clave) toma sólo esa fila, `for update`. Y lo que PGlite
// no puede mirar: bcrypt de verdad (el costo de los hashes y que el login gasta lo mismo cuando el código
// no existe, está bloqueado o la clave no es).
import { PERSONAS, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido } = PERSONAS

async function como(db, persona, sql, args = []) {
  await comoPersona(db, persona)
  try {
    return (await db.query(`select ${sql} as r`, args)).rows[0].r
  } finally {
    await db.query('reset role')
  }
}

async function comoServicio(db, sql, args = []) {
  await db.query('set role service_role')
  try {
    return (await db.query(`select ${sql} as r`, args)).rows[0].r
  } finally {
    await db.query('reset role')
  }
}

// La versión como texto: un `Date` de JavaScript no la cambia (está en milisegundos), pero así se usa
// como la usará la cookie de la Fase 8: tal cual la devolvió la base.
const versionDelAcceso = async (db, lead) =>
  (
    await db.query('select otorgado_en::text as v from public.accesos_portal where lead_id = $1', [
      lead,
    ])
  ).rows[0]?.v ?? null

const acceso = async (db, lead) =>
  (
    await db.query(
      'select codigo, habilitado, intentos_fallidos, bloqueado_hasta, clave_hash from public.accesos_portal where lead_id = $1',
      [lead],
    )
  ).rows[0]

async function otorgar(db, lead, clave) {
  return como(db, duena, 'public.otorgar_portal($1, $2, $3)', [
    lead,
    clave,
    await versionDelAcceso(db, lead),
  ])
}

const LOGIN = '(select to_jsonb(x) from web.portal_login($1, $2) x)'
const login = (db, codigo, clave) => comoServicio(db, LOGIN, [codigo, clave])

const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
async function tiempo(db, codigo, clave, veces = 5) {
  const ms = []
  for (let i = 0; i < veces; i += 1) {
    const desde = performance.now()
    await login(db, codigo, clave)
    ms.push(performance.now() - desde)
  }
  return mediana(ms)
}

export async function carrerasDelPortal({ orquesta, carrera, espero, conectar }) {
  console.log('Dos personas otorgan el acceso a la vez')
  for (const [primero, segundo] of [
    [duena, compartido],
    [compartido, duena],
  ]) {
    const lead = await leadDeLaDuena(orquesta, `portal otorgar ${primero.slice(-1)}`, {
      compartidoCon: compartido,
    })
    const otorgarSql = { sql: 'public.otorgar_portal($1, $2, null)' }
    const r = await carrera(orquesta, {
      a: { ...otorgarSql, persona: primero, args: [lead, 'clave-de-carrera-a'] },
      b: { ...otorgarSql, persona: segundo, args: [lead, 'clave-de-carrera-b'] },
    })
    const fila = await acceso(orquesta, lead)
    espero(
      `gana la primera y la segunda recibe PT409 con quién: ${r.b.mensaje}`,
      r.b.codigo === 'PT409' &&
        /^Ya lo otorgó Carreras /.test(r.b.mensaje) &&
        fila.codigo === r.a.valor.codigo,
      { b: r.b, codigo: fila.codigo },
    )
  }

  console.log('Revocar mientras el cliente entra')
  {
    const lead = await leadDeLaDuena(orquesta, 'portal revocar 1')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.revocar_portal($1)', args: [lead] },
      b: { rol: 'service_role', sql: LOGIN, args: [codigo, 'clave-de-carrera'] },
    })
    espero('revoca primero: el login no entra (vacío)', r.b.ok && r.b.valor === null, r.b)
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'portal revocar 2')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    const r = await carrera(orquesta, {
      a: { rol: 'service_role', sql: LOGIN, args: [codigo, 'clave-de-carrera'] },
      b: { persona: duena, sql: 'public.revocar_portal($1)', args: [lead] },
    })
    const snapshot = await comoServicio(orquesta, 'web.portal_snapshot($1, $2)', [
      lead,
      r.a.valor?.otorgado_en,
    ])
    espero(
      'entra primero: revocar espera, revoca, y la sesión recién abierta ya no ve nada',
      r.a.valor?.lead_id === lead && r.b.ok && snapshot === null,
      { a: r.a, b: r.b, snapshot },
    )
  }

  console.log('Desbloquear mientras caen fallos')
  {
    const lead = await leadDeLaDuena(orquesta, 'portal desbloquear 1')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    for (let i = 0; i < 5; i += 1) await login(orquesta, codigo, 'mala')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.portal_desbloquear($1)', args: [lead] },
      b: { rol: 'service_role', sql: LOGIN, args: [codigo, 'mala'] },
    })
    const fila = await acceso(orquesta, lead)
    espero(
      'desbloquea primero: el fallo cuenta desde cero (1) y no bloquea',
      r.b.ok && fila.intentos_fallidos === 1 && fila.bloqueado_hasta === null,
      fila,
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'portal desbloquear 2')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    for (let i = 0; i < 4; i += 1) await login(orquesta, codigo, 'mala')
    const r = await carrera(orquesta, {
      a: { rol: 'service_role', sql: LOGIN, args: [codigo, 'mala'] },
      b: { persona: duena, sql: 'public.portal_desbloquear($1)', args: [lead] },
    })
    const fila = await acceso(orquesta, lead)
    espero(
      'el quinto fallo primero: bloquea, y desbloquear espera y lo limpia',
      r.b.ok && fila.intentos_fallidos === 0 && fila.bloqueado_hasta === null,
      fila,
    )
  }

  console.log('Seis fallos a la vez')
  {
    const lead = await leadDeLaDuena(orquesta, 'portal seis fallos')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    const conexiones = await Promise.all(Array.from({ length: 6 }, () => conectar()))
    try {
      const resultados = await Promise.all(conexiones.map((c) => login(c, codigo, 'mala')))
      const fila = await acceso(orquesta, lead)
      espero(
        'bloquea exactamente al quinto: el sexto ya no cuenta ni alarga',
        resultados.every((x) => x === null) &&
          fila.intentos_fallidos === 0 &&
          fila.bloqueado_hasta !== null,
        { resultados, fila },
      )
    } finally {
      await Promise.all(conexiones.map((c) => c.end()))
    }
  }

  console.log('bcrypt de verdad')
  {
    const lead = await leadDeLaDuena(orquesta, 'portal bcrypt')
    const { codigo } = await otorgar(orquesta, lead, 'clave-de-carrera')
    const generada = await como(orquesta, duena, 'public.otorgar_portal($1, null, $2)', [
      lead,
      await versionDelAcceso(orquesta, lead),
    ])
    const fila = await acceso(orquesta, lead)
    const {
      rows: [falso],
    } = await orquesta.query('select public._portal_hash_falso() as h')
    espero(
      'los hashes y el falso son bcrypt de costo 10',
      fila.clave_hash.startsWith('$2a$10$') && falso.h.startsWith('$2a$10$'),
      fila.clave_hash.slice(0, 7),
    )
    // Lo vigente entra; con la clave generada, y el código viejo ya no.
    const bien = await login(orquesta, generada.codigo, generada.clave)
    const viejo = await login(orquesta, codigo, 'clave-de-carrera')
    espero(
      'la clave generada entra y el código anterior no',
      bien?.lead_id === lead && viejo === null,
      {
        bien,
        viejo,
      },
    )
    await orquesta.query(
      'update public.accesos_portal set intentos_fallidos = 0 where lead_id = $1',
      [lead],
    )
    // El tiempo: inexistente, revocado y bloqueado pagan el mismo hash que una clave errónea.
    const mala = await tiempo(orquesta, generada.codigo, 'mala-mala')
    await orquesta.query(
      'update public.accesos_portal set intentos_fallidos = 0 where lead_id = $1',
      [lead],
    )
    const inexistente = await tiempo(orquesta, 'ZZZ-ZZZZZ', 'mala-mala')
    await orquesta.query(
      `update public.accesos_portal set bloqueado_hasta = now() + interval '15 minutes' where lead_id = $1`,
      [lead],
    )
    const bloqueado = await tiempo(orquesta, generada.codigo, generada.clave)
    await como(orquesta, duena, 'public.revocar_portal($1)', [lead])
    const revocado = await tiempo(orquesta, generada.codigo, generada.clave)
    const medidas = { mala, inexistente, bloqueado, revocado }
    const dentro = Object.values(medidas).every((ms) => ms > mala * 0.5 && ms < mala * 2)
    espero(
      `el login gasta lo mismo cuando falla (mediana de 5, ms): ${Object.entries(medidas)
        .map(([k, v]) => `${k} ${v.toFixed(0)}`)
        .join(', ')}`,
      mala > 10 && dentro,
      medidas,
    )
  }
}
