// Las carreras del alta con primer seguimiento (parte 9b): el mismo intento enviado dos veces a la vez
// (un doble clic, o el reintento al volver la red mientras el primero seguía en vuelo). El lead sale una
// vez, el seguimiento una vez y el recordatorio una vez, tanto al crear como al «Tomar lead».
import { PERSONAS, PREFIJO, leadDeLaDuena } from './terreno.mjs'

const { compartido } = PERSONAS

const DOCUMENTO = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Carreras', marks: [{ type: 'bold' }] }],
    },
  ],
}

const seguimiento = (tipoId) => ({
  tipo_id: tipoId,
  titulo: `${PREFIJO} primer seguimiento`,
  detalle: DOCUMENTO,
  ocurrido_en: new Date(Date.now() - 3_600_000).toISOString(),
})

export async function carrerasDeAlta({ orquesta, carrera, espero }) {
  const web = (await orquesta.query(`select id from public.origenes_lead where clave = 'web'`))
    .rows[0].id
  const tipo = (
    await orquesta.query(
      `select id from public.tipos_seguimiento where activo order by orden limit 1`,
    )
  ).rows[0].id
  const manana = new Date(Date.now() + 86_400_000).toISOString()
  const cuenta = async (tabla, lead) =>
    Number(
      (await orquesta.query(`select count(*) as n from public.${tabla} where lead_id = $1`, [lead]))
        .rows[0].n,
    )

  console.log('El mismo intento de alta enviado dos veces a la vez')
  {
    const id = crypto.randomUUID()
    const lead = JSON.stringify({
      nombre: `${PREFIJO} alta doble`,
      telefono_principal: '78123456',
      origen_lead_id: web,
    })
    const args = [
      id,
      lead,
      JSON.stringify(seguimiento(tipo)),
      JSON.stringify({ recordar_en: manana }),
    ]
    const llamada = {
      persona: compartido,
      sql: 'public.crear_lead($1, $2::jsonb, $3::jsonb, $4::jsonb)',
      args,
    }
    const r = await carrera(orquesta, { a: llamada, b: llamada })
    espero(
      'el segundo devuelve el mismo lead como repetido',
      r.b.ok &&
        r.b.valor.resultado === 'creado' &&
        r.b.valor.repetido === true &&
        r.b.valor.id === id,
      r.b,
    )
    espero(
      'un solo lead, un solo seguimiento y un solo recordatorio',
      (await cuenta('seguimientos', id)) === 1 && (await cuenta('recordatorios', id)) === 1,
      {
        seguimientos: await cuenta('seguimientos', id),
        recordatorios: await cuenta('recordatorios', id),
      },
    )
  }

  console.log('El mismo intento de «Tomar lead» enviado dos veces a la vez')
  {
    const limbo = await leadDeLaDuena(orquesta, 'alta tomar doble')
    await orquesta.query(
      `update public.leads_asesores set revocado_en = now() where lead_id = $1`,
      [limbo],
    )
    const telefono = (
      await orquesta.query(`select telefono_principal as t from public.leads where id = $1`, [
        limbo,
      ])
    ).rows[0].t
    const id = crypto.randomUUID()
    const lead = JSON.stringify({
      nombre: `${PREFIJO} tomar doble`,
      telefono_principal: `+${telefono}`,
      origen_lead_id: web,
      adoptar: true,
    })
    const args = [
      id,
      lead,
      JSON.stringify(seguimiento(tipo)),
      JSON.stringify({ recordar_en: manana }),
    ]
    const llamada = {
      persona: compartido,
      sql: 'public.crear_lead($1, $2::jsonb, $3::jsonb, $4::jsonb)',
      args,
    }
    const r = await carrera(orquesta, { a: llamada, b: llamada })
    espero(
      'el segundo devuelve lo mismo, como repetido',
      r.b.ok &&
        r.b.valor.resultado === 'adoptado' &&
        r.b.valor.repetido === true &&
        r.b.valor.id === limbo,
      r.b,
    )
    espero(
      'un solo seguimiento y un solo recordatorio en el lead tomado',
      (await cuenta('seguimientos', limbo)) === 1 && (await cuenta('recordatorios', limbo)) === 1,
      {
        seguimientos: await cuenta('seguimientos', limbo),
        recordatorios: await cuenta('recordatorios', limbo),
      },
    )
  }
}
