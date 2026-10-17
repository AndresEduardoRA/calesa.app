import { describe, expect, it } from 'vitest'
import { LEAD_QUE_NO_VES, nombreDeLead, relacionesDesde } from './vinculo'

const LEAD = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const vinculo = (lead: string, hasta: string | null, nombre: string | null = 'Ana Quispe') => ({
  lead_id: lead,
  lead_nombre: nombre,
  lead_numero: nombre ? 12 : null,
  lead_numero_propio: null,
  desde: '2026-10-01T12:00:00+00:00',
  hasta,
  por_nombre: 'Rosa Mamani',
})

describe('relacionesDesde', () => {
  it('separa el vínculo vigente de los anteriores', () => {
    const relaciones = relacionesDesde(
      [vinculo(LEAD, null), vinculo(OTRO, '2026-09-30T12:00:00+00:00', null)],
      [],
    )
    expect(relaciones.vinculo).toMatchObject({ leadId: LEAD, leadNombre: 'Ana Quispe' })
    expect(relaciones.historial.map((uno) => uno.leadId)).toEqual([OTRO])
  })

  it('sin un vínculo abierto, el vehículo no es de ningún lead', () => {
    const relaciones = relacionesDesde([vinculo(LEAD, '2026-10-02T12:00:00+00:00')], [])
    expect(relaciones.vinculo).toBeNull()
    expect(relaciones.historial).toHaveLength(1)
  })

  it('lee los interesados con su nota y quién los marcó', () => {
    const { interesados } = relacionesDesde(
      [],
      [
        {
          lead_id: LEAD,
          lead_nombre: 'Ana Quispe',
          lead_numero: 12,
          lead_numero_propio: 3,
          nota: 'Lo quiere en blanco',
          creado_en: '2026-10-05T12:00:00+00:00',
          por_nombre: null,
        },
      ],
    )
    expect(interesados).toEqual([
      {
        leadId: LEAD,
        leadNombre: 'Ana Quispe',
        leadNumeros: { numero: 12, numeroPropio: 3, creadorDelPropio: null },
        nota: 'Lo quiere en blanco',
        creadoEn: '2026-10-05T12:00:00+00:00',
        porNombre: null,
      },
    ])
  })
})

describe('nombreDeLead', () => {
  it('el nombre si quien mira ve al lead; si no, lo dice sin nombrarlo', () => {
    expect(nombreDeLead({ leadNombre: 'Ana Quispe' })).toBe('Ana Quispe')
    expect(nombreDeLead({ leadNombre: null })).toBe(LEAD_QUE_NO_VES)
  })
})
