// Las carreras de los teléfonos extra con la regla «cuentan como el principal» encendida: un índice único no abarca `leads` y `leads_telefonos`,
// así que las serializa un candado por número (`pg_advisory_xact_lock`): primero la fila del lead, después el número. A abre y retiene; B intenta
// y espera ese candado; al confirmar A, B ve lo que A escribió y lo dice como valor, sin escribir.
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido } = PERSONAS

export async function carrerasDeTelefonosExtra({ orquesta, carrera, espero }) {
  const origen = (
    await orquesta.query(
      `select id from public.origenes_lead where activo order by orden, id limit 1`,
    )
  ).rows[0].id
  await orquesta.query(
    `update public.ajustes_leads set telefonos_extra_como_principal = true, telefonos_extra_maximo = 6 where id = 1`,
  )
  const extras = async (lead) =>
    Number(
      (
        await orquesta.query(
          `select count(*) as n from public.leads_telefonos where lead_id = $1`,
          [lead],
        )
      ).rows[0].n,
    )
  const alta = (numero, adoptar = false) => ({
    persona: duena,
    sql: 'public.crear_lead($1, $2::jsonb)',
    args: [
      crypto.randomUUID(),
      JSON.stringify({
        nombre: `${PREFIJO} extra alta ${numero}`,
        telefono_principal: numero,
        origen_lead_id: origen,
        ...(adoptar ? { adoptar: true } : {}),
      }),
    ],
  })
  const agregar = (persona, lead, numero) => ({
    persona,
    sql: `public.lead_telefono_guardar($1, $2, '', $3, null)`,
    args: [lead, crypto.randomUUID(), numero],
  })

  try {
    console.log('Un alta con el número X contra agregar X como extra de otro lead, a la vez')
    {
      const lead = await leadDeLaDuena(orquesta, 'extra contra alta', { compartidoCon: compartido })
      const r = await carrera(orquesta, {
        a: alta('78111111'),
        b: agregar(compartido, lead, '78111111'),
      })
      espero(
        'el alta confirma y agregar el extra dice que ya es de otro lead, sin escribir',
        r.a.ok &&
          r.a.valor.resultado === 'creado' &&
          r.b.ok &&
          ['existe', 'de_otro'].includes(r.b.valor.resultado) &&
          (await extras(lead)) === 0,
        { a: r.a, b: r.b, extras: await extras(lead) },
      )
    }

    console.log('El mismo extra en dos leads a la vez')
    {
      const uno = await leadDeLaDuena(orquesta, 'extra doble uno', { compartidoCon: compartido })
      const dos = await leadDeLaDuena(orquesta, 'extra doble dos', { compartidoCon: compartido })
      const r = await carrera(orquesta, {
        a: agregar(duena, uno, '78222222'),
        b: agregar(compartido, dos, '78222222'),
      })
      espero(
        'gana uno y el otro devuelve «existe» o «de_otro»',
        r.a.ok &&
          r.a.valor.resultado === 'agregado' &&
          r.b.ok &&
          ['existe', 'de_otro'].includes(r.b.valor.resultado),
        { a: r.a, b: r.b },
      )
      espero('el número queda en un solo lead', (await extras(uno)) + (await extras(dos)) === 1, {
        uno: await extras(uno),
        dos: await extras(dos),
      })
    }

    console.log('Dos altas que adoptan al lead en limbo por su extra')
    {
      const limbo = await leadDeLaDuena(orquesta, 'extra limbo')
      await orquesta.query(
        `update public.leads_asesores set revocado_en = now() where lead_id = $1`,
        [limbo],
      )
      await orquesta.query(
        `insert into public.leads_telefonos (lead_id, telefono) values ($1, '59178333333')`,
        [limbo],
      )
      const segunda = alta('+59178333333', true)
      segunda.persona = compartido
      const r = await carrera(orquesta, { a: alta('+59178333333', true), b: segunda })
      const duenos = (
        await orquesta.query(
          `select usuario_id from public.leads_asesores
            where lead_id = $1 and tipo_acceso = 'dueno' and revocado_en is null`,
          [limbo],
        )
      ).rows
      espero(
        'adopta uno solo: el primero toma ese lead y el segundo ya no lo encuentra libre',
        r.a.ok &&
          r.a.valor.resultado === 'adoptado' &&
          r.a.valor.id === limbo &&
          r.b.ok &&
          ['existe', 'de_otro'].includes(r.b.valor.resultado) &&
          duenos.length === 1,
        { a: r.a, b: r.b, duenos },
      )
    }
  } finally {
    await orquesta.query(
      `update public.ajustes_leads set telefonos_extra_como_principal = false, telefonos_extra_maximo = 6 where id = 1`,
    )
  }
}
