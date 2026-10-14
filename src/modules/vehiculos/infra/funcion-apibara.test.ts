// @vitest-environment node
// La edge function `apibara` (Deno) se carga en Node con un `fetch` simulado: ver el soporte.
import { describe, expect, it, vi } from 'vitest'
import {
  BASE_APIBARA,
  CLAVE,
  CONSULTA,
  ORIGEN,
  USUARIO,
  codigoDe,
  fixture,
  guardadas,
  llamadas,
  llamar,
  simular,
} from './funcion-apibara.soporte'

const ENLACE = 'https://www.copart.com/lot/58540656/clean-title-2024-ford-bronco-big-bend'
const URL_DE_FICHA = `${BASE_APIBARA}/vehicles/urltodetails?url=${encodeURIComponent(ENLACE)}`

describe('función apibara: la ficha', () => {
  it('un enlace de Copart trae la respuesta en bruto, con la clave sólo hacia la API', async () => {
    simular(null, () => undefined)
    simular({}, (url) => (url === URL_DE_FICHA ? Response.json(fixture('copart.json')) : undefined))
    const respuesta = await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE })
    const texto = await respuesta.text()
    const cuerpo = JSON.parse(texto) as {
      ok: boolean
      data: { consulta: string; data: { lot_number: string }; url: string }
    }
    expect(cuerpo.ok).toBe(true)
    expect(cuerpo.data.data.lot_number).toBe('58540656')
    expect(cuerpo.data.url).toBe(ENLACE)
    expect(texto).not.toContain(CLAVE)
    expect(llamadas).toEqual([{ url: URL_DE_FICHA, clave: CLAVE }])
  })

  it('guarda la ficha en la base a nombre de quien consultó y devuelve sólo su id', async () => {
    simular({}, (url) => (url === URL_DE_FICHA ? Response.json(fixture('copart.json')) : undefined))
    const respuesta = await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE })
    const cuerpo = (await respuesta.json()) as { data: { consulta: string } }
    expect(cuerpo.data.consulta).toBe(CONSULTA)
    expect(guardadas).toHaveLength(1)
    const [guardada] = guardadas
    expect(guardada?.cuerpo['p_usuario']).toBe(USUARIO)
    expect(guardada?.cuerpo['p_origen']).toBe(ORIGEN)
    expect(guardada?.cuerpo['p_raw']).toEqual((fixture('copart.json') as { data: unknown }).data)
    // La guarda la función con la service key, no la sesión de quien llama.
    expect(guardada?.autorizacion).toBe('Bearer servicio')
  })

  it('si la base no guarda la consulta, la ficha no vuelve: no serviría para guardar', async () => {
    simular(
      {},
      () => Response.json(fixture('copart.json')),
      () => new Response('{}', { status: 400 }),
    )
    expect(await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE }))).toBe(
      'proveedor',
    )
  })

  it('sin quién consultó no guarda nada', async () => {
    simular({ usuario: null }, () => Response.json(fixture('copart.json')))
    expect(await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE }))).toBe(
      'proveedor',
    )
    expect(guardadas).toHaveLength(0)
  })

  it('un VIN o un lote van por /vehicles/{id}', async () => {
    simular({}, () => Response.json({ data: { platform: 'iaai', lot_number: '45312823' } }))
    const porVin = await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '3fmcr9b64rre04601' })
    expect(await codigoDe(porVin)).toBeNull()
    await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '45312823' })
    expect(llamadas.map((llamada) => llamada.url)).toEqual([
      `${BASE_APIBARA}/vehicles/3FMCR9B64RRE04601`,
      `${BASE_APIBARA}/vehicles/45312823`,
    ])
  })
})

describe('función apibara: lo que responde la API', () => {
  it.each([
    [404, 'no_encontrado'],
    [401, 'clave_invalida'],
    [403, 'clave_invalida'],
    [429, 'cuota'],
    [400, 'no_soportado'],
    [422, 'no_soportado'],
  ])('un %i de la API es «%s»', async (estado, codigo) => {
    simular({}, () => new Response('{}', { status: estado }))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe(codigo)
  })

  it('con la cuota agotada no reintenta: otra consulta sólo la gastaría', async () => {
    simular({}, () => new Response('{}', { status: 429 }))
    await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })
    expect(llamadas).toHaveLength(1)
  })

  it('un 5xx se reintenta una vez; si sigue, es del proveedor', async () => {
    let n = 0
    simular({}, () => {
      n += 1
      return n === 1 ? new Response('', { status: 503 }) : Response.json(fixture('copart.json'))
    })
    const bien = await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE })
    expect(await codigoDe(bien)).toBeNull()
    expect(llamadas).toHaveLength(2)

    simular({}, () => new Response('', { status: 500 }))
    const mal = await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })
    expect(await codigoDe(mal)).toBe('proveedor')
    expect(llamadas).toHaveLength(2)
  })

  it('una consulta que no responde a tiempo es «tiempo»', async () => {
    simular({}, () => new DOMException('timeout', 'TimeoutError'))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('tiempo')
  })

  it('una plataforma que el origen no consulta se dice, antes o después de llamar', async () => {
    simular({ plataformas: ['iaai'] }, () => Response.json(fixture('copart.json')))
    expect(await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: ENLACE }))).toBe(
      'plataforma',
    )
    expect(llamadas).toHaveLength(0)
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('plataforma')
  })

  it('un enlace que no es de Copart ni de IAAI, o algo que no es un dato, no llega a la API', async () => {
    simular({}, () => Response.json({ data: {} }))
    expect(
      await codigoDe(
        await llamar({ accion: 'ficha', origen: ORIGEN, entrada: 'https://www.example.com/lot/1' }),
      ),
    ).toBe('no_soportado')
    expect(await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: 'hola' }))).toBe(
      'entrada',
    )
    expect(llamadas).toHaveLength(0)
  })

  it('una respuesta que no es un objeto es un problema del proveedor', async () => {
    simular({}, () => Response.json({ data: [1, 2] }))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('proveedor')
  })
})

describe('función apibara: quién puede', () => {
  it('apagada, o un origen que no es de subasta: no se lee la clave ni se llama', async () => {
    simular({ activa: false }, () => Response.json({ data: {} }))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('apagada')
    simular(null, () => Response.json({ data: {} }))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('apagada')
    expect(llamadas).toHaveLength(0)
  })

  it('sin permiso de crear ni de editar en ese origen', async () => {
    simular({ puede_crear: false, puede_editar: false }, () => Response.json({ data: {} }))
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('sin_permiso')
    expect(llamadas).toHaveLength(0)
  })

  it('con una dirección que no es de apibara.tech no manda la clave a ningún lado', async () => {
    for (const endpoint of [
      'https://atacante.example/api',
      'http://apibara.tech/api',
      'https://apibara.tech.atacante.example',
    ]) {
      simular({ endpoint }, () => Response.json({ data: {} }))
      expect(
        await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
      ).toBe('apagada')
      expect(llamadas).toHaveLength(0)
    }
  })

  it('un pedido mal formado no llega a la base', async () => {
    simular({}, () => Response.json({ data: {} }))
    for (const cuerpo of [
      {},
      { accion: 'ficha' },
      { accion: 'ficha', origen: 'no-uuid', entrada: 'x' },
      null,
      { accion: 'foto', origen: ORIGEN },
    ]) {
      expect(await codigoDe(await llamar(cuerpo))).toBe('entrada')
    }
  })

  it('una consulta sin sesión válida llega como «sin permiso»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 401 }))),
    )
    expect(
      await codigoDe(await llamar({ accion: 'ficha', origen: ORIGEN, entrada: '58540656' })),
    ).toBe('sin_permiso')
  })
})
