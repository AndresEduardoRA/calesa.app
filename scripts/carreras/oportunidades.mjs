// Las carreras de las oportunidades y los embudos (parte 7a). Orden de los candados: lead → embudo →
// oportunidad. Quitar el acceso bloquea el lead; guardar las etapas bloquea el embudo; mover toma los
// tres. Cada carrera parte de su propio lead y de una oportunidad recién creada por su dueña.
import { PERSONAS, PREFIJO, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido, supervision, destino } = PERSONAS

async function como(db, persona, sql, args = []) {
  await comoPersona(db, persona)
  try {
    return (await db.query(`select ${sql} as r`, args)).rows[0].r
  } finally {
    await db.query('reset role')
  }
}

async function embudoDe(db, persona) {
  const r = await como(db, persona, 'public.embudo_por_defecto()')
  const etapa = (nombre) => r.embudo.etapas.find((e) => e.nombre === nombre).id
  return { id: r.embudo.id, etapas: r.embudo.etapas, etapa }
}

async function oportunidad(db, persona, lead) {
  const r = await como(db, persona, `public.oportunidad_crear(gen_random_uuid(), $1, $2)`, [
    lead,
    { titulo: `${PREFIJO} oportunidad` },
  ])
  return r.oportunidad
}

const versionDelEmbudo = async (db, id) =>
  (await db.query('select actualizado_en::text as v from public.embudos where id = $1', [id]))
    .rows[0].v

const sin = (etapas, nombre) => JSON.stringify(etapas.filter((e) => e.nombre !== nombre))

export async function carrerasDeOportunidades({ orquesta, carrera, espero }) {
  console.log('Quitar el acceso mientras el compartido mueve su oportunidad')
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad revocar 1', {
      compartidoCon: compartido,
    })
    const embudo = await embudoDe(orquesta, compartido)
    const op = await oportunidad(orquesta, compartido, lead)
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
      b: {
        persona: compartido,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Contactado')],
      },
    })
    const { rows } = await orquesta.query(
      'select etapa_id from public.oportunidades where id = $1',
      [op.id],
    )
    espero(
      'revoca primero: el compartido ya no mueve (42501) y la oportunidad queda donde estaba',
      r.b.codigo === '42501' && rows[0].etapa_id === op.etapa_id,
      { b: r.b, etapa: rows[0].etapa_id },
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad revocar 2', {
      compartidoCon: compartido,
    })
    const embudo = await embudoDe(orquesta, compartido)
    const op = await oportunidad(orquesta, compartido, lead)
    const r = await carrera(orquesta, {
      a: {
        persona: compartido,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Contactado')],
      },
      b: { persona: duena, sql: 'public.lead_revocar_acceso($1, $2)', args: [lead, compartido] },
    })
    const { rows } = await orquesta.query(
      'select etapa_id from public.oportunidades where id = $1',
      [op.id],
    )
    espero(
      'mueve primero: lo movido queda y la revocación entra después',
      r.b.ok && rows[0].etapa_id === embudo.etapa('Contactado'),
      r.b,
    )
  }

  console.log('Quitar una etapa mientras se mueve una oportunidad a ella')
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad etapa 1')
    const embudo = await embudoDe(orquesta, duena)
    const op = await oportunidad(orquesta, duena, lead)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.embudo_etapas_guardar($1, $2, $3)',
        args: [
          embudo.id,
          await versionDelEmbudo(orquesta, embudo.id),
          sin(embudo.etapas, 'Cotizado'),
        ],
      },
      b: {
        persona: duena,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Cotizado')],
      },
    })
    espero(
      'quita primero: mover dice que esa etapa ya no es del embudo (22023)',
      r.b.codigo === '22023' && r.b.mensaje === 'Esa etapa no es de este embudo.',
      r.b,
    )
    await como(orquesta, duena, 'public.oportunidad_eliminar($1, $2)', [
      op.id,
      (
        await orquesta.query(
          'select actualizado_en::text as v from public.oportunidades where id = $1',
          [op.id],
        )
      ).rows[0].v,
    ])
    // Vuelve a dejar el embudo con sus seis etapas para la que sigue.
    const actual = await embudoDe(orquesta, duena)
    await como(orquesta, duena, 'public.embudo_etapas_guardar($1, $2, $3)', [
      actual.id,
      await versionDelEmbudo(orquesta, actual.id),
      JSON.stringify([
        ...actual.etapas.slice(0, 2),
        { nombre: 'Cotizado', color: 'violeta' },
        ...actual.etapas.slice(2),
      ]),
    ])
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad etapa 2')
    const embudo = await embudoDe(orquesta, duena)
    const op = await oportunidad(orquesta, duena, lead)
    const version = await versionDelEmbudo(orquesta, embudo.id)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Cotizado')],
      },
      b: {
        persona: duena,
        sql: 'public.embudo_etapas_guardar($1, $2, $3)',
        args: [embudo.id, version, sin(embudo.etapas, 'Cotizado')],
      },
    })
    espero(
      'mueve primero: quitar la etapa lo rechaza porque ahora tiene una (23514)',
      r.b.codigo === '23514' && r.b.mensaje.startsWith('«Cotizado» tiene 1 oportunidad'),
      r.b,
    )
  }

  console.log('Transferir el lead mientras su dueña mueve una oportunidad')
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad transferir 1')
    const embudo = await embudoDe(orquesta, duena)
    await embudoDe(orquesta, destino)
    const op = await oportunidad(orquesta, duena, lead)
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Contactado')],
      },
      b: {
        persona: supervision,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
    })
    const { rows } = await orquesta.query(
      `select o.usuario_id, s.nombre from public.oportunidades o join public.embudos_etapas s on s.id = o.etapa_id where o.id = $1`,
      [op.id],
    )
    espero(
      'mueve primero: la transferencia la lleva al destino en la etapa a la que se movió',
      r.b.ok && rows[0].usuario_id === destino && rows[0].nombre === 'Contactado',
      { b: r.b, fila: rows[0] },
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'oportunidad transferir 2')
    const embudo = await embudoDe(orquesta, duena)
    const op = await oportunidad(orquesta, duena, lead)
    const r = await carrera(orquesta, {
      a: {
        persona: supervision,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
      b: {
        persona: duena,
        sql: 'public.oportunidad_mover($1, $2, $3)',
        args: [op.id, op.etapa_id, embudo.etapa('Contactado')],
      },
    })
    espero(
      'transfiere primero: la saliente ya no la mueve (42501)',
      r.b.codigo === '42501' &&
        r.b.mensaje === 'No encontramos esta oportunidad o no tienes acceso.',
      r.b,
    )
  }

  console.log('Guardar las etapas desde dos pestañas a la vez')
  {
    const embudo = await embudoDe(orquesta, duena)
    const version = await versionDelEmbudo(orquesta, embudo.id)
    const renombrada = (nombre) =>
      JSON.stringify(embudo.etapas.map((e, i) => (i === 1 ? { ...e, nombre } : e)))
    const guardar = { persona: duena, sql: 'public.embudo_etapas_guardar($1, $2, $3)' }
    const r = await carrera(orquesta, {
      a: { ...guardar, args: [embudo.id, version, renombrada('Llamado')] },
      b: { ...guardar, args: [embudo.id, version, renombrada('Escrito')] },
    })
    const despues = await embudoDe(orquesta, duena)
    espero(
      'la primera guarda y la segunda recibe PT409',
      r.b.codigo === 'PT409' && despues.etapas[1].nombre === 'Llamado',
      r.b,
    )
  }
}
