import { expect, test } from './soporte/prueba'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
  entorno,
} from './soporte/base'
import { pedirAFuncion } from './soporte/funciones'
import { codigoDePaisDeLaEmpresa } from './soporte/leads-alta'
import { borrarLeadsDePrueba, crearLead, idDe } from './soporte/leads'
import { literal, sql } from './soporte/sql'
import { escribirArchivo } from '../src/modules/datos/entities/plantillas'

// @sin-celular-archivo: no abre ninguna página: sube un archivo, llama la función edge importar-csv y mira la base

// La función edge `importar-csv` de verdad (9.06-3), con `pnpm funciones`: la dueña importa 3 leads para una asesora, uno con el teléfono
// de un lead que ya existe. La función canjea el pase, baja el archivo normalizado, procesa y lo borra; los leads nacen en la cartera de la
// asesora y el repetido queda «ya existe». Es la única prueba que carga la función en Deno (el `npm:` y las copias); la pantalla es del 9.06-5.

const CLAVE = 'una-clave-de-prueba-9'
// Nacionales: la base les pone el código de país de la empresa, como al tipearlos.
const TELEFONO_EXISTENTE = '71239001'
let duena = ''
let asesora = ''
let otra = ''

test.beforeAll(async ({}, info) => {
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-importar-${info.project.name}`)
  asesora = correoDePrueba(`asesora-importar-${info.project.name}`)
  otra = correoDePrueba(`otra-importar-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dora Importa' })
  for (const [email, nombre, clave] of [
    [asesora, 'Ana Recibe', 'e2e_importar_asesora'],
    [otra, 'Olga Tiene', 'e2e_importar_otra'],
  ] as const) {
    await crearPersona({ email, contrasena: CLAVE, nombre, invitada: true })
    sql(`update public.perfiles set invitacion_aceptada_en = now() where email = ${literal(email)}`)
    await darRolDePrueba({
      email,
      rol: { nombre: `E2E ${nombre}`, clave },
      permisos: ['leads.crear', { clave: 'leads.ver', alcance: 'propios' }],
    })
  }
  await crearLead({
    nombre: 'ya estaba',
    telefono: `${await codigoDePaisDeLaEmpresa()}${TELEFONO_EXISTENTE}`,
    deQuien: otra,
  })
})

test.afterAll(async () => {
  sql(`delete from public.leads where id in (select v.lead_id from public.importaciones_leads v
         join public.importaciones i on i.id = v.importacion_id join public.perfiles p on p.id = i.usuario_id
        where p.email = ${literal(duena)});
       delete from public.importaciones i using public.perfiles p where p.id = i.usuario_id and p.email = ${literal(duena)}`)
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// `importacion_crear` con la sesión de la dueña, como la llamará la acción de `/datos`.
function crearImportacion(idDuena: string, idDestino: string, id: string, ruta: string): string {
  const claims = JSON.stringify({ sub: idDuena, role: 'authenticated' })
  return sql(`begin;
    select set_config('request.jwt.claim.sub', ${literal(idDuena)}, true), set_config('request.jwt.claims', ${literal(claims)}, true) \\g /dev/null
    set local role authenticated;
    select public.importacion_crear(${literal(id)}, 'leads', ${literal(ruta)},
      '{"Nombre": "nombre", "Teléfono": "telefono_principal"}'::jsonb, ${literal(idDestino)}, null) ->> 'estado';
    commit;`)
}

async function llamar(pase: string): Promise<{ estado: number; cuerpo: unknown }> {
  const respuesta = await pedirAFuncion(
    `${entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/functions/v1/importar-csv`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pase }),
    },
    { etiqueta: 'importar-csv' },
  )
  expect(respuesta, 'importar-csv no respondió').not.toBeNull()
  return { estado: respuesta?.status ?? 0, cuerpo: await respuesta?.json() }
}

test('E2E escritorio: la dueña importa 3 leads para una asesora y el repetido queda «ya existe»', async () => {
  const [idDuena, idAsesora] = [await idDe(duena), await idDe(asesora)]
  const origen = sql('select id from public.origenes_lead where activo order by orden, id limit 1')
  const id = crypto.randomUUID()
  const ruta = `${idDuena}/${id}.csv`
  const archivo = escribirArchivo('leads', [
    {
      datos: {
        nombre: 'E2E importado uno',
        telefono_principal: '71239011',
        origen_lead_id: origen,
      },
    },
    {
      datos: {
        nombre: 'E2E importado repetido',
        telefono_principal: TELEFONO_EXISTENTE,
        origen_lead_id: origen,
      },
    },
    {
      datos: {
        nombre: 'E2E importado dos',
        telefono_principal: '71239012',
        origen_lead_id: origen,
      },
    },
  ])
  const almacen = admin().storage.from('importaciones')
  const subida = await almacen.upload(ruta, new Blob([archivo], { type: 'text/csv' }), {
    contentType: 'text/csv',
  })
  expect(subida.error).toBeNull()
  expect(crearImportacion(idDuena, idAsesora, id, ruta)).toBe('pendiente')

  const pase = sql(
    `insert into public.importaciones_pases (importacion_id) values (${literal(id)}) returning pase`,
  )
  const primera = await llamar(pase)
  expect(primera.estado, JSON.stringify(primera.cuerpo)).toBe(200)
  expect(primera.cuerpo).toEqual({
    ok: true,
    data: { importacion: id, estado: 'terminada', procesadas: 3, filas_total: 3 },
  })

  expect(
    sql(`select estado || ' ' || filas_ok || ' ' || ya_existian || ' ' || rechazadas
           from public.importaciones where id = ${literal(id)}`),
  ).toBe('terminada 2 1 0')
  // Los dos nuevos, en la cartera de la asesora; el repetido sigue siendo de quien lo tenía.
  expect(
    sql(`select string_agg(a.usuario_id::text, ',') from public.importaciones_leads v
           join public.leads_asesores a on a.lead_id = v.lead_id and a.tipo_acceso = 'dueno' and a.revocado_en is null
          where v.importacion_id = ${literal(id)}`),
  ).toBe(`${idAsesora},${idAsesora}`)
  expect(
    sql(
      `select fila || ' ' || resultado from public.importaciones_filas where importacion_id = ${literal(id)}`,
    ),
  ).toBe('2 ya_existe')
  // El archivo ya no está en el bucket.
  const { data: quedan } = await almacen.list(idDuena, { search: `${id}.csv` })
  expect(quedan ?? []).toEqual([])

  // El mismo pase no sirve dos veces.
  const segunda = await llamar(pase)
  expect(segunda.estado).toBe(401)
})
