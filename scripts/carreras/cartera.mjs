// Las carreras de la cartera en la fila del lead (9h): `leads.cartera` la recalcula un trigger de `leads_asesores`, y dos
// transacciones que cambian quién tiene el mismo lead a la vez no pueden dejarla vieja. Cada una con dos conexiones reales
// (el arnés de `scripts/carreras.mjs`: A actúa y retiene, B espera un lock); al final la cartera es igual a lo que dice
// `leads_asesores`. El relleno con `skip locked` no espera: esa se prueba aparte, con las dos transacciones abiertas.
import { PERSONAS, PREFIJO, comoPersona, leadDeLaDuena } from './terreno.mjs'

const { duena, compartido, supervision, destino, configura } = PERSONAS
// Alguien a quien dar de baja, con un rol que puede hacerlo (las borra `limpiar()` por el correo).
const BAJA = '00000000-0000-4000-8000-0000000c0010'
const OTRA_BAJA = '00000000-0000-4000-8000-0000000c0011'
// La baja por lotes (cierre 1): una persona por carrera, cada una con su teléfono.
const BAJAS = {
  destinoEnBaja: ['00000000-0000-4000-8000-0000000c0012', '79300003'],
  compartirAntes: ['00000000-0000-4000-8000-0000000c0013', '79300004'],
  transferirDuranteElLote: ['00000000-0000-4000-8000-0000000c0014', '79300005'],
  transferirViejo: ['00000000-0000-4000-8000-0000000c0015', '79300006'],
  primeraDeDos: ['00000000-0000-4000-8000-0000000c0016', '79300007'],
  segundaDeDos: ['00000000-0000-4000-8000-0000000c0017', '79300008'],
  cortada: ['00000000-0000-4000-8000-0000000c0018', '79300009'],
  dosCorridas: ['00000000-0000-4000-8000-0000000c0019', '79300010'],
}

const carteraDe = async (db, lead) => {
  const {
    rows: [fila],
  } = await db.query(
    `select l.cartera::text as guardada, public._lead_cartera_calcular(l.id)::text as fuente from public.leads l where l.id = $1`,
    [lead],
  )
  return fila
}
const ordenada = (...ids) => `{${[...ids].sort().join(',')}}`

async function personaConLead(db, id, nombre, telefono = id === BAJA ? '79300001' : '79300002') {
  await db.query(
    `insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{"invitado": true}')`,
    [id, `carreras-${nombre}@ejemplo.com`],
  )
  await db.query(
    `update public.perfiles set nombre = $2, invitacion_aceptada_en = now() where id = $1`,
    [id, `${PREFIJO} ${nombre}`],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id) select $1, id from public.roles where clave = 'carreras_propios'`,
    [id],
  )
  await comoPersona(db, id)
  const {
    rows: [fila],
  } = await db.query(
    `select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', $1::text, 'telefono_principal', $2::text,
       'origen_lead_id', (select id from public.origenes_lead where activo order by orden, id limit 1))) as r`,
    [`${PREFIJO} de ${nombre}`, telefono],
  )
  await db.query('reset role')
  return fila.r.id
}

export async function carrerasDeLaCartera({ orquesta, carrera, espero, conectar, esperarBloqueo }) {
  // La supervisión da de baja: suma `equipo.usuarios.gestionar` con un rol propio de las carreras.
  const {
    rows: [rol],
  } = await orquesta.query(
    `insert into public.roles (clave, nombre) values ('carreras_equipo', $1) returning id`,
    [`${PREFIJO} equipo`],
  )
  await orquesta.query(
    `insert into public.roles_permisos (rol_id, permiso_clave, alcance) values ($1, 'equipo.usuarios.gestionar', 'todos')`,
    [rol.id],
  )
  await orquesta.query(`insert into public.usuarios_roles (usuario_id, rol_id) values ($1, $2)`, [
    supervision,
    rol.id,
  ])

  console.log('La cartera en la fila: la baja de una persona mientras se comparte su lead')
  {
    const lead = await personaConLead(orquesta, BAJA, 'baja')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [BAJA] },
      b: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      `la baja primero: el lead queda en el limbo y compartirlo ya no lo encuentra (${r.b.codigo ?? 'ok'})`,
      r.a.ok && r.b.codigo === '42501' && c.guardada === '{}' && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    // Compartir primero retiene el lead: el lote de la baja no espera, lo salta, y la baja queda en curso; el job lo aplica
    // después. La cartera queda con el compartido, sin dueño.
    const lead = await personaConLead(orquesta, OTRA_BAJA, 'otra-baja')
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, supervision)
      await comoPersona(cb, supervision)
      await ca.query('begin')
      await ca.query('select public.lead_compartir($1, $2)', [lead, compartido])
      const baja = (await cb.query('select public.equipo_dar_de_baja($1) as r', [OTRA_BAJA]))
        .rows[0].r
      await ca.query('commit')
      const job = await terminarBajas(orquesta)
      const c = await carteraDe(orquesta, lead)
      espero(
        'compartir primero: el lote salta el lead sin esperar, el job lo aplica y queda el compartido, sin dueño',
        baja.terminada === false &&
          job.terminadas === 1 &&
          c.guardada === ordenada(compartido) &&
          c.guardada === c.fuente,
        { baja, job, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  await carrerasDeLaBajaPorLotes({ orquesta, carrera, espero, conectar, esperarBloqueo })

  console.log('La cartera en la fila: transferir mientras otra persona comparte el mismo lead')
  {
    const lead = await leadDeLaDuena(orquesta, 'cartera transferir')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
      b: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'gana la transferencia y el compartir entra después: los tres en la cartera',
      r.a.ok &&
        r.b.ok &&
        c.guardada === ordenada(duena, destino, compartido) &&
        c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'cartera compartir')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.lead_compartir($1, $2)', args: [lead, compartido] },
      b: {
        persona: duena,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, duena],
      },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'gana el compartir y la transferencia entra después: los tres en la cartera',
      r.a.ok &&
        r.b.ok &&
        c.guardada === ordenada(duena, destino, compartido) &&
        c.guardada === c.fuente,
      { r, c },
    )
  }

  await carrerasDeLaFecha({ orquesta, carrera, espero })

  console.log('La cartera en la fila: el relleno y otra escritura a la vez')
  // Una base viva antes de `…001600`: la columna admite nulos (sin calcular). En una base nueva nace `not null`: se le quita
  // mientras duran estas dos carreras y se le vuelve a poner al final, con todo lleno.
  await orquesta.query('alter table public.leads alter column cartera drop not null')
  try {
    await carrerasDelRelleno({ orquesta, carrera, espero, conectar })
  } finally {
    while (
      (await orquesta.query('select public._leads_derivados_rellenar(5000) as n')).rows[0].n > 0
    );
    await orquesta.query('alter table public.leads alter column cartera set not null')
  }
}

// El job de las bajas, hasta que no quede ninguna en curso (en las carreras hay pocas filas: una corrida alcanza).
async function terminarBajas(db) {
  const {
    rows: [fila],
  } = await db.query('select public.equipo_bajas_continuar() as r')
  return fila.r
}
const vigentesDe = async (db, persona) =>
  (
    await db.query(
      'select count(*)::int as n from public.leads_asesores where usuario_id = $1 and revocado_en is null',
      [persona],
    )
  ).rows[0].n
const bajaDe = async (db, persona) =>
  (
    await db.query(
      'select leads_al_limbo, terminada_en is not null as terminada from public.equipo_bajas where usuario_id = $1',
      [persona],
    )
  ).rows[0]

// La baja por lotes (cierre 1): el primer tiempo toma el perfil `for update`; los lotes toman los leads `skip locked` y
// nunca esperan; lo que escribe la cartera aplica la baja al lead que bloqueó.
async function carrerasDeLaBajaPorLotes({ orquesta, carrera, espero, conectar, esperarBloqueo }) {
  console.log('La baja por lotes: compartir con la persona mientras se la da de baja')
  {
    const [persona, telefono] = BAJAS.destinoEnBaja
    await personaConLead(orquesta, persona, 'destino-en-baja', telefono)
    const lead = await leadDeLaDuena(orquesta, 'baja destino')
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [persona] },
      b: { persona: duena, sql: 'public.lead_compartir($1, $2)', args: [lead, persona] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      `la baja primero: compartir espera su perfil y ve la cuenta apagada (${r.b.codigo ?? 'ok'})`,
      r.a.ok && r.b.codigo === '22023' && c.guardada === ordenada(duena) && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    const [persona, telefono] = BAJAS.compartirAntes
    await personaConLead(orquesta, persona, 'compartir-antes', telefono)
    const lead = await leadDeLaDuena(orquesta, 'baja compartir antes')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: 'public.lead_compartir($1, $2)', args: [lead, persona] },
      b: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [persona] },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'compartir primero: la baja espera el perfil y se lleva también ese acceso nuevo',
      r.a.ok &&
        r.b.ok &&
        r.b.valor.terminada === true &&
        c.guardada === ordenada(duena) &&
        c.guardada === c.fuente &&
        (await vigentesDe(orquesta, persona)) === 0,
      { r, c },
    )
  }

  console.log('La baja por lotes: transferir un lead de la persona mientras corre un lote')
  {
    // Transferir retiene el lead: el lote lo salta; cuando la transferencia confirma, la persona quedó compartida en él
    // (el saliente conserva acceso) y el job se lo quita. Nadie espera y nada se pierde.
    const [persona, telefono] = BAJAS.transferirDuranteElLote
    const lead = await personaConLead(orquesta, persona, 'transferir-lote', telefono)
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, supervision)
      await comoPersona(cb, supervision)
      await ca.query('begin')
      await ca.query('select public.lead_transferir($1, $2, $3)', [lead, destino, persona])
      const baja = (await cb.query('select public.equipo_dar_de_baja($1) as r', [persona])).rows[0]
        .r
      await ca.query('commit')
      const antes = await vigentesDe(orquesta, persona)
      const job = await terminarBajas(orquesta)
      const c = await carteraDe(orquesta, lead)
      espero(
        'el lote salta el lead que se transfiere; el job quita a la persona después y la cartera queda con el destino',
        baja.terminada === false &&
          antes === 1 &&
          job.terminadas === 1 &&
          c.guardada === ordenada(destino) &&
          c.guardada === c.fuente &&
          (await vigentesDe(orquesta, persona)) === 0 &&
          (await bajaDe(orquesta, persona)).leads_al_limbo === 0,
        { baja, antes, job, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }
  {
    // El lote retiene el lead: transferir espera y, al ver la baja confirmada, el lead ya es limbo para todos.
    const [persona, telefono] = BAJAS.transferirViejo
    const lead = await personaConLead(orquesta, persona, 'transferir-viejo', telefono)
    const r = await carrera(orquesta, {
      a: { persona: supervision, sql: 'public.equipo_dar_de_baja($1)', args: [persona] },
      b: {
        persona: supervision,
        sql: 'public.lead_transferir($1, $2, $3)',
        args: [lead, destino, persona],
      },
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      `la baja primero: transferir espera el lead y ya no lo encuentra (${r.b.codigo ?? 'ok'})`,
      r.a.ok && r.b.codigo === '42501' && c.guardada === '{}' && c.guardada === c.fuente,
      { r, c },
    )
  }

  console.log('La baja por lotes: dos bajas a la vez con un lead de las dos')
  {
    const [primera, telPrimera] = BAJAS.primeraDeDos
    const [segunda, telSegunda] = BAJAS.segundaDeDos
    const comun = await personaConLead(orquesta, primera, 'primera-de-dos', telPrimera)
    await personaConLead(orquesta, segunda, 'segunda-de-dos', telSegunda)
    await orquesta.query(
      `insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values ($1, $2, 'compartido', $3)`,
      [comun, segunda, primera],
    )
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      await comoPersona(ca, supervision)
      await comoPersona(cb, supervision)
      await ca.query('begin')
      await ca.query('select public.equipo_dar_de_baja($1)', [primera])
      // La segunda no espera el lead común: lo salta y queda en curso.
      const segundaBaja = (await cb.query('select public.equipo_dar_de_baja($1) as r', [segunda]))
        .rows[0].r
      await ca.query('commit')
      const job = await terminarBajas(orquesta)
      const c = await carteraDe(orquesta, comun)
      const [a, b] = [await bajaDe(orquesta, primera), await bajaDe(orquesta, segunda)]
      espero(
        'las dos terminan, el lead común queda en el limbo y se cuenta una sola vez (dos leads, dos al limbo)',
        segundaBaja.terminada === false &&
          job.terminadas === 1 &&
          a.terminada &&
          b.terminada &&
          c.guardada === '{}' &&
          c.guardada === c.fuente &&
          a.leads_al_limbo + b.leads_al_limbo === 2,
        { segundaBaja, job, a, b, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  console.log('La baja por lotes: un lote cortado a la mitad se reanuda sin duplicar ni perder')
  {
    const [persona, telefono] = BAJAS.cortada
    const lead = await personaConLead(orquesta, persona, 'cortada', telefono)
    // Un lead retenido deja la baja en curso; después, una corrida del job que no confirma (lo que deja un corte).
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      // Como postgres: `authenticated` no puede tomar `for update` una fila de `leads`.
      await ca.query('begin')
      await ca.query('select 1 from public.leads where id = $1 for update', [lead])
      await comoPersona(cb, supervision)
      const baja = (await cb.query('select public.equipo_dar_de_baja($1) as r', [persona])).rows[0]
        .r
      await ca.query('commit')
      await cb.query('reset role')
      await cb.query('begin')
      await cb.query('select public.equipo_bajas_continuar()')
      const enElCorte = await vigentesDe(cb, persona)
      await cb.query('rollback')
      const tras = {
        vigentes: await vigentesDe(orquesta, persona),
        baja: await bajaDe(orquesta, persona),
      }
      const job = await terminarBajas(orquesta)
      const c = await carteraDe(orquesta, lead)
      const fin = await bajaDe(orquesta, persona)
      espero(
        'cortada: nada de esa corrida queda; la siguiente termina y cuenta el lead una vez',
        baja.terminada === false &&
          enElCorte === 0 &&
          tras.vigentes === 1 &&
          !tras.baja.terminada &&
          tras.baja.leads_al_limbo === 0 &&
          job.terminadas === 1 &&
          fin.leads_al_limbo === 1 &&
          c.guardada === '{}' &&
          c.guardada === c.fuente,
        { baja, enElCorte, tras, job, fin, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }

  console.log(
    'La baja por lotes: dos corridas del job sobre la misma baja cuentan cada lead una vez',
  )
  {
    // Lo que encontró la revisión del cierre 1 (`…002400`): un lote leía los ids de la persona y, antes de bloquear los leads,
    // otra corrida los revocaba y los contaba; el lote contaba los mismos leads otra vez (los que tenían la cartera vacía).
    // Acá se provoca sin esperas: A toma un candado de tabla sobre `leads`, corre su corrida (revoca y cuenta, sin confirmar) y
    // B —otra corrida— lee los ids (ve al lead todavía vigente) y espera el candado de `leads` justo antes de bloquearlo; al
    // confirmar A, B bloquea el lead ya revocado y su sentencia no revoca nada. Cuenta el lead una vez: con el arreglo B suma 0
    // (cuenta lo que revocó su sentencia); sin él sumaba 1 (cuenta los del lote con la cartera vacía): la baja decía 2 leads.
    const [persona, telefono] = BAJAS.dosCorridas
    const lead = await personaConLead(orquesta, persona, 'dos-corridas', telefono)
    const [ca, cb, retiene] = [await conectar(), await conectar(), await conectar()]
    try {
      // La baja en curso con el lead pendiente: un lead retenido hace que el primer lote lo salte.
      await retiene.query('begin')
      await retiene.query('select 1 from public.leads where id = $1 for update', [lead])
      await comoPersona(cb, supervision)
      const baja = (await cb.query('select public.equipo_dar_de_baja($1) as r', [persona])).rows[0]
        .r
      await retiene.query('commit')
      await cb.query('reset role')
      const pendientes = await vigentesDe(orquesta, persona)

      await ca.query('begin')
      await ca.query('lock table public.leads in exclusive mode')
      const a = (await ca.query('select public.equipo_bajas_continuar() as r')).rows[0].r
      const pidB = (await cb.query('select pg_backend_pid() as pid')).rows[0].pid
      const b = cb.query('select public.equipo_bajas_continuar() as r').then(
        (r) => ({ ok: true, valor: r.rows[0].r }),
        (e) => ({ ok: false, mensaje: e.message }),
      )
      await esperarBloqueo(orquesta, pidB)
      await ca.query('commit')
      const resultadoB = await b
      const c = await carteraDe(orquesta, lead)
      const fin = await bajaDe(orquesta, persona)
      espero(
        'dos corridas a la vez: el lead se cuenta una sola vez y la baja termina',
        baja.terminada === false &&
          pendientes === 1 &&
          a.terminadas === 1 &&
          resultadoB.ok &&
          fin.terminada &&
          fin.leads_al_limbo === 1 &&
          (await vigentesDe(orquesta, persona)) === 0 &&
          c.guardada === '{}' &&
          c.guardada === c.fuente,
        { baja, pendientes, a, b: resultadoB, fin, c },
      )
    } finally {
      await ca.end()
      await cb.end()
      await retiene.end()
    }
  }
}

// Antes de `…001600` la visibilidad no mira la cartera: una escritura de `leads_asesores` llega por cualquier camino mientras
// el relleno corre. Acá va directo a la tabla (como postgres), que es lo que dispara el trigger, sin pasar por `puede_lead()`
// (que desde `…001600` ya lee la cartera, y con una cartera nula a mano rechazaría sin esperar).
const compartirDirecto = (lead) => ({
  rol: 'postgres',
  consulta: `with x as (insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
             values ($1, $2, 'compartido', $3) returning 1) select count(*)::int as r from x`,
  args: [lead, compartido, duena],
})

// La fecha de creación del lead en cada fila de su cartera (5a-fix-1a): `leads_asesores.lead_creado_en` la llena un trigger al insertar
// y otro la sigue si el lead cambia. Nada cambia `leads.creado_en` en la app, pero la copia es la que ordena «míos»: tiene que ser la
// del lead aunque las dos cosas pasen a la vez. Con el candado de la inserción (`for no key update`) una espera a la otra.
const FECHA_NUEVA = '2001-02-03T04:05:06Z'
const cambiarFecha = (lead) => ({
  rol: 'postgres',
  consulta: `with x as (update public.leads set creado_en = $2::timestamptz where id = $1 returning 1) select count(*)::int as r from x`,
  args: [lead, FECHA_NUEVA],
})
const fechasDe = async (db, lead) =>
  (
    await db.query(
      `select count(*)::int as filas, coalesce(bool_and(la.lead_creado_en = l.creado_en), false) as iguales,
              l.creado_en = $2::timestamptz as es_la_nueva
         from public.leads_asesores la join public.leads l on l.id = la.lead_id where l.id = $1 group by l.creado_en`,
      [lead, FECHA_NUEVA],
    )
  ).rows[0]

async function carrerasDeLaFecha({ orquesta, carrera, espero }) {
  console.log(
    'La fecha de creación en la cartera: cambiar la del lead mientras otra transacción inserta una fila',
  )
  {
    const lead = await leadDeLaDuena(orquesta, 'fecha primero')
    const r = await carrera(orquesta, { a: cambiarFecha(lead), b: compartirDirecto(lead) })
    const f = await fechasDe(orquesta, lead)
    espero(
      'cambiar la fecha primero: la inserción espera y la fila nueva nace con la fecha nueva',
      r.a.ok && r.b.ok && f.filas === 2 && f.iguales && f.es_la_nueva,
      { r, f },
    )
  }
  {
    const lead = await leadDeLaDuena(orquesta, 'fila primero')
    const r = await carrera(orquesta, { a: compartirDirecto(lead), b: cambiarFecha(lead) })
    const f = await fechasDe(orquesta, lead)
    espero(
      'insertar primero: cambiar la fecha espera y la fila nueva la sigue',
      r.a.ok && r.b.ok && f.filas === 2 && f.iguales && f.es_la_nueva,
      { r, f },
    )
  }
}

async function carrerasDelRelleno({ orquesta, carrera, espero, conectar }) {
  {
    // El relleno toma primero el lead (sin calcular) y el trigger de la otra escritura espera.
    const lead = await leadDeLaDuena(orquesta, 'relleno primero')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const r = await carrera(orquesta, {
      a: { rol: 'postgres', sql: 'public._leads_derivados_rellenar(5000)', args: [] },
      b: compartirDirecto(lead),
    })
    const c = await carteraDe(orquesta, lead)
    espero(
      'el relleno primero: la otra escritura espera y la cartera queda con los dos',
      r.a.ok && r.b.ok && c.guardada === ordenada(duena, compartido) && c.guardada === c.fuente,
      { r, c },
    )
  }
  {
    // La otra escritura toma primero el lead: el relleno lo salta (no espera) y el trigger lo deja calculado.
    const lead = await leadDeLaDuena(orquesta, 'relleno después')
    await orquesta.query('update public.leads set cartera = null where id = $1', [lead])
    const [ca, cb] = [await conectar(), await conectar()]
    try {
      const escritura = compartirDirecto(lead)
      await ca.query('begin')
      await ca.query(escritura.consulta, escritura.args)
      const {
        rows: [hecho],
      } = await cb.query('select public._leads_derivados_rellenar(5000) as n')
      const saltado = (await carteraDe(cb, lead)).guardada === null
      await ca.query('commit')
      const c = await carteraDe(orquesta, lead)
      espero(
        `la otra escritura primero: el relleno no espera ni lo pisa (llenó ${String(hecho.n)}) y queda calculado`,
        saltado && c.guardada === ordenada(duena, compartido) && c.guardada === c.fuente,
        { hecho, c },
      )
    } finally {
      await ca.end()
      await cb.end()
    }
  }
}

// Pasar un campo a privado mientras otra persona crea un lead con ese dato (9h): ningún lead puede quedar con la clave en
// `atributos_publicos` cuando el campo ya es privado.
let campos = 0
async function campoNuevo(db) {
  campos += 1
  const clave = `carreras_priv_${String(campos)}`
  await db.query(
    `insert into public.leads_campos (clave, etiqueta, tipo, orden) values ($1, $2, 'texto', 900 + $3)`,
    [clave, `${PREFIJO} privado ${String(campos)}`, campos],
  )
  return clave
}
const altaConDato = (clave, telefono, origen) => ({
  persona: duena,
  sql: 'public.crear_lead($1, $2::jsonb, null)',
  args: [
    crypto.randomUUID(),
    JSON.stringify({
      nombre: `${PREFIJO} con ${clave}`,
      telefono_principal: telefono,
      origen_lead_id: origen,
      atributos: { [clave]: 'dato' },
    }),
  ],
})
const privatizar = async (db, clave) => ({
  persona: configura,
  sql: `public.lead_campo_guardar((select id from public.leads_campos where clave = $1), $2, '{"solo_cartera": true}')`,
  args: [
    clave,
    (
      await db.query(`select actualizado_en::text as v from public.leads_campos where clave = $1`, [
        clave,
      ])
    ).rows[0].v,
  ],
})
const estadoDe = async (db, clave) =>
  (
    await db.query(
      `select (select solo_cartera from public.leads_campos where clave = $1) as privado,
              (select count(*)::int from public.leads where atributos_publicos ? $1) as con_la_clave,
              (select count(*)::int from public.leads where atributos ? $1) as con_el_dato`,
      [clave],
    )
  ).rows[0]

export async function carrerasDePrivacidad({ orquesta, carrera, espero }) {
  const origen = (
    await orquesta.query(
      'select id from public.origenes_lead where activo order by orden, id limit 1',
    )
  ).rows[0].id
  console.log('Pasar un campo a privado mientras se crea un lead con ese dato')
  {
    const clave = await campoNuevo(orquesta)
    const r = await carrera(orquesta, {
      a: altaConDato(clave, '79300011', origen),
      b: await privatizar(orquesta, clave),
    })
    const e = await estadoDe(orquesta, clave)
    espero(
      'el alta primero: privatizar espera, quita la clave del lead nuevo y el campo queda privado',
      r.a.ok && r.b.ok && e.privado && e.con_el_dato === 1 && e.con_la_clave === 0,
      { r, e },
    )
  }
  {
    const clave = await campoNuevo(orquesta)
    const r = await carrera(orquesta, {
      a: await privatizar(orquesta, clave),
      b: altaConDato(clave, '79300012', origen),
    })
    const e = await estadoDe(orquesta, clave)
    espero(
      'privatizar primero: el alta espera y el lead nace sin la clave en los atributos públicos',
      r.a.ok && r.b.ok && e.privado && e.con_el_dato === 1 && e.con_la_clave === 0,
      { r, e },
    )
  }
}
