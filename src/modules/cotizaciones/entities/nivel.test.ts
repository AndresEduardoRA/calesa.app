import { describe, expect, it } from 'vitest'
import {
  CLAVE_DEL_NOMBRE,
  LARGO_MAXIMO_DE_NIVEL,
  MOTIVO_DE_NIVEL_NO_DISPONIBLE,
  MOTIVO_SIN_PERMISO_DE_NIVELES,
  accionesDeNivel,
  alTopeDeNiveles,
  anuncioDeRestauracion,
  anuncioDeRetiro,
  esNivelFijo,
  firmaDeNiveles,
  listaDeNivelesDesde,
  motivoDeUrlDeNivel,
  motivoParaNoAbrirNivel,
  motivoParaNoEliminar,
  motivoParaNoEliminarPorUrl,
  nivelPorId,
  normalizarNombreDeNivel,
  respuestaDeNivelesDesde,
  separarNiveles,
  textoDelTopeDeNiveles,
  validarNivel,
  validarNombreDeNivel,
  type NivelDeAcceso,
} from './nivel'

const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

function nivel(n: number, resto: Partial<NivelDeAcceso> = {}): NivelDeAcceso {
  return {
    id: ID(n),
    clave: `n${String(n)}`,
    nombre: `Nivel ${String(n)}`,
    retiradoEn: null,
    actualizadoEn: `2026-10-24T10:00:0${String(n)}Z`,
    seRenombra: true,
    seRetira: true,
    seElimina: true,
    motivoDeUso: null,
    ...resto,
  }
}

const fijo = nivel(0, {
  clave: 'todos',
  nombre: 'Todos',
  seRenombra: false,
  seRetira: false,
  seElimina: false,
})
const deFabrica = nivel(1, { clave: 'costos', nombre: 'Costos', seElimina: false })

const filaCruda = (n: number, resto: Record<string, unknown> = {}) => ({
  id: ID(n),
  clave: `n${String(n)}`,
  nombre: `Nivel ${String(n)}`,
  retirado_en: null,
  actualizado_en: '2026-10-24T10:00:00Z',
  se_renombra: true,
  se_retira: true,
  se_elimina: true,
  motivo_de_uso: null,
  ...resto,
})

describe('listaDeNivelesDesde y respuestaDeNivelesDesde', () => {
  it('da forma a lo que entrega la base, con las banderas y el motivo', () => {
    const lista = listaDeNivelesDesde({
      tope: 10,
      niveles: [
        filaCruda(1, { motivo_de_uso: 'Está en 2 celdas de 1 origen…', se_elimina: false }),
        filaCruda(2, { retirado_en: '2026-10-24T11:00:00Z' }),
      ],
    })
    expect(lista).toEqual({
      tope: 10,
      niveles: [
        {
          id: ID(1),
          clave: 'n1',
          nombre: 'Nivel 1',
          retiradoEn: null,
          actualizadoEn: '2026-10-24T10:00:00Z',
          seRenombra: true,
          seRetira: true,
          seElimina: false,
          motivoDeUso: 'Está en 2 celdas de 1 origen…',
        },
        expect.objectContaining({ id: ID(2), retiradoEn: '2026-10-24T11:00:00Z' }),
      ],
    })
  })

  it('una forma rota (sin motivo, sin banderas, un id que no es uuid, tope 0) no es una lista', () => {
    const { motivo_de_uso: _motivo, ...sinMotivo } = filaCruda(1)
    expect(listaDeNivelesDesde({ tope: 10, niveles: [sinMotivo] })).toBeNull()
    expect(
      listaDeNivelesDesde({ tope: 10, niveles: [filaCruda(1, { se_retira: 'sí' })] }),
    ).toBeNull()
    expect(listaDeNivelesDesde({ tope: 10, niveles: [filaCruda(1, { id: 'x' })] })).toBeNull()
    expect(listaDeNivelesDesde({ tope: 0, niveles: [] })).toBeNull()
    expect(listaDeNivelesDesde(null)).toBeNull()
  })

  it('la respuesta de una escritura trae el id y si repitió un pedido ya hecho', () => {
    const lista = { tope: 10, niveles: [filaCruda(1)] }
    expect(respuestaDeNivelesDesde({ id: ID(1), lista })).toMatchObject({
      id: ID(1),
      repetido: false,
    })
    expect(respuestaDeNivelesDesde({ id: ID(1), repetido: true, lista })?.repetido).toBe(true)
    // Restaurar uno que no estaba retirado.
    expect(respuestaDeNivelesDesde({ id: ID(1), sin_cambios: true, lista })?.repetido).toBe(true)
    // Eliminar no devuelve id.
    expect(respuestaDeNivelesDesde({ lista })?.id).toBeNull()
    expect(respuestaDeNivelesDesde({ id: ID(1), lista: { tope: 10 } })).toBeNull()
    expect(respuestaDeNivelesDesde('x')).toBeNull()
  })
})

describe('separarNiveles', () => {
  it('pone el fijo primero, los vivos después y los retirados aparte, cada grupo por nombre en español', () => {
    const niveles = [
      nivel(5, { nombre: 'Zeta' }),
      nivel(6, { nombre: 'Ñandú' }),
      fijo,
      nivel(7, { nombre: 'Álamo', retiradoEn: '2026-10-24T11:00:00Z' }),
      nivel(8, { nombre: 'alfa' }),
      nivel(9, { nombre: 'Berta', retiradoEn: '2026-10-23T11:00:00Z' }),
    ]
    const { fijos, vivos, retirados } = separarNiveles(niveles)
    expect(fijos.map((n) => n.nombre)).toEqual(['Todos'])
    expect(vivos.map((n) => n.nombre)).toEqual(['alfa', 'Ñandú', 'Zeta'])
    expect(retirados.map((n) => n.nombre)).toEqual(['Álamo', 'Berta'])
  })

  it('no cambia la lista que recibe', () => {
    const niveles = [nivel(2, { nombre: 'B' }), nivel(1, { nombre: 'A' })]
    separarNiveles(niveles)
    expect(niveles.map((n) => n.nombre)).toEqual(['B', 'A'])
  })

  it('«fijo» es el que ninguna acción toca, sin mirar su nombre', () => {
    expect(esNivelFijo(fijo)).toBe(true)
    expect(esNivelFijo(deFabrica)).toBe(false)
    expect(esNivelFijo(nivel(3, { clave: 'todos', nombre: 'Todos' }))).toBe(false)
  })
})

describe('nombre', () => {
  it('se normaliza como la base: sin espacios de más', () => {
    expect(normalizarNombreDeNivel('  Alta   gerencia \t')).toBe('Alta gerencia')
  })

  it('rechaza uno vacío, uno largo y uno repetido sin importar mayúsculas, con el texto de la base', () => {
    const niveles = [nivel(1, { nombre: 'Gerencia' })]
    expect(validarNombreDeNivel('   ', niveles, null)).toEqual({
      ok: false,
      motivo: 'Escribe el nombre del nivel.',
    })
    expect(validarNombreDeNivel('x'.repeat(LARGO_MAXIMO_DE_NIVEL + 1), niveles, null)).toEqual({
      ok: false,
      motivo: 'El nombre del nivel admite hasta 40 caracteres.',
    })
    expect(validarNombreDeNivel('x'.repeat(LARGO_MAXIMO_DE_NIVEL), niveles, null).ok).toBe(true)
    expect(validarNombreDeNivel(' gerencia ', niveles, null)).toEqual({
      ok: false,
      motivo: 'Ya hay un nivel «gerencia».',
    })
  })

  it('el nivel que se renombra no choca con su propio nombre', () => {
    const niveles = [nivel(1, { nombre: 'Gerencia' }), nivel(2, { nombre: 'Costos' })]
    expect(validarNombreDeNivel('gerencia', niveles, ID(1))).toEqual({
      ok: true,
      nombre: 'gerencia',
    })
    expect(validarNombreDeNivel('Costos', niveles, ID(1)).ok).toBe(false)
  })

  it('el modal dice el motivo junto al campo del nombre', () => {
    expect(validarNivel('', [], null)).toEqual({
      ok: false,
      motivos: { [CLAVE_DEL_NOMBRE]: 'Escribe el nombre del nivel.' },
    })
    expect(validarNivel(' Nuevo  nivel ', [], null)).toEqual({ ok: true, nombre: 'Nuevo nivel' })
  })
})

describe('el tope', () => {
  it('cuenta todos los niveles, también los retirados', () => {
    const diez = Array.from({ length: 10 }, (_, n) =>
      nivel(n + 1, n < 3 ? { retiradoEn: '2026-10-24T11:00:00Z' } : {}),
    )
    expect(alTopeDeNiveles(diez, 10)).toBe(true)
    expect(alTopeDeNiveles(diez.slice(1), 10)).toBe(false)
  })

  it('dice el motivo real: los retirados cuentan y se elimina uno que ninguna hoja use', () => {
    const texto = textoDelTopeDeNiveles(10)
    expect(texto).toContain('Ya hay 10 niveles')
    expect(texto).toContain('Los retirados también cuentan')
    expect(texto).toContain('ninguna hoja use')
  })
})

describe('accionesDeNivel', () => {
  it('un nivel común ofrece Renombrar · Retirar · Eliminar', () => {
    expect(accionesDeNivel(nivel(2))).toEqual([
      { accion: 'renombrar', motivoParaNo: null },
      { accion: 'retirar', motivoParaNo: null },
      { accion: 'eliminar', motivoParaNo: null },
    ])
  })

  it('uno retirado ofrece Restaurar en vez de Retirar', () => {
    expect(
      accionesDeNivel(nivel(2, { retiradoEn: '2026-10-24T11:00:00Z' })).map((a) => a.accion),
    ).toEqual(['renombrar', 'restaurar', 'eliminar'])
  })

  it('uno en uso deja Eliminar apagado con el motivo de la base y Retirar al lado', () => {
    const motivo = 'Está en 6 celdas de 2 orígenes: no se elimina. Puedes retirarlo.'
    const lineas = accionesDeNivel(nivel(2, { motivoDeUso: motivo }))
    expect(lineas.map((a) => a.accion)).toEqual(['renombrar', 'retirar', 'eliminar'])
    expect(lineas.at(-1)).toEqual({ accion: 'eliminar', motivoParaNo: motivo })
  })

  it('el de fábrica no se elimina (dice por qué, sin nombrar una clave) y se retira y restaura', () => {
    const lineas = accionesDeNivel(deFabrica)
    expect(lineas.map((a) => a.accion)).toEqual(['renombrar', 'retirar', 'eliminar'])
    expect(lineas.at(-1)?.motivoParaNo).toBe(
      '«Costos» lo traen las hojas de fábrica: no se elimina. Puedes retirarlo.',
    )
    const retirado = accionesDeNivel({ ...deFabrica, retiradoEn: '2026-10-24T11:00:00Z' })
    expect(retirado.map((a) => a.accion)).toEqual(['renombrar', 'restaurar', 'eliminar'])
    expect(retirado.at(-1)?.motivoParaNo).toBe(
      '«Costos» lo traen las hojas de fábrica: no se elimina.',
    )
  })

  it('el fijo no ofrece nada', () => {
    expect(accionesDeNivel(fijo)).toEqual([])
  })

  it('motivoParaNoEliminar: el uso manda sobre lo de fábrica, y sin motivo se puede', () => {
    expect(motivoParaNoEliminar(nivel(2, { motivoDeUso: 'en uso', seElimina: false }))).toBe(
      'en uso',
    )
    expect(motivoParaNoEliminar(nivel(2))).toBeNull()
  })
})

describe('lo que nombra la URL', () => {
  const niveles = [nivel(1), nivel(2, { motivoDeUso: 'en uso' }), fijo]

  it('eliminar no abre con un nivel que no está ni con uno que no se elimina', () => {
    expect(motivoParaNoEliminarPorUrl(niveles, ID(1))).toBeNull()
    expect(motivoParaNoEliminarPorUrl(niveles, ID(2))).toBe('en uso')
    expect(motivoParaNoEliminarPorUrl(niveles, ID(99))).toBe(MOTIVO_DE_NIVEL_NO_DISPONIBLE)
    expect(motivoParaNoEliminarPorUrl(niveles, null)).toBe(MOTIVO_DE_NIVEL_NO_DISPONIBLE)
  })

  it('renombrar no abre con un nivel que no está ni con el fijo', () => {
    expect(motivoDeUrlDeNivel(niveles, ID(1))).toBeNull()
    expect(motivoDeUrlDeNivel(niveles, ID(99))).toBe(MOTIVO_DE_NIVEL_NO_DISPONIBLE)
    expect(motivoDeUrlDeNivel(niveles, ID(0))).toBe('El nivel «Todos» no se renombra.')
  })

  it('«Nuevo nivel» no abre en el tope; renombrar mira el id', () => {
    const lista = { tope: 3, niveles }
    expect(motivoParaNoAbrirNivel(lista, 'nuevo', null, true)).toBe(textoDelTopeDeNiveles(3))
    expect(motivoParaNoAbrirNivel({ tope: 4, niveles }, 'nuevo', null, true)).toBeNull()
    expect(motivoParaNoAbrirNivel(lista, 'renombrar', ID(1), true)).toBeNull()
    expect(motivoParaNoAbrirNivel(lista, 'renombrar', ID(99), true)).toBe(
      MOTIVO_DE_NIVEL_NO_DISPONIBLE,
    )
    expect(motivoParaNoAbrirNivel(lista, null, null, true)).toBeNull()
  })

  it('quien sólo lee no abre ningún formulario, ni escribiendo la URL', () => {
    const lista = { tope: 10, niveles }
    expect(motivoParaNoAbrirNivel(lista, 'nuevo', null, false)).toBe(MOTIVO_SIN_PERMISO_DE_NIVELES)
    expect(motivoParaNoAbrirNivel(lista, 'renombrar', ID(1), false)).toBe(
      MOTIVO_SIN_PERMISO_DE_NIVELES,
    )
    expect(motivoParaNoAbrirNivel(lista, null, null, false)).toBeNull()
  })

  it('busca un nivel por su id', () => {
    expect(nivelPorId(niveles, ID(2))?.motivoDeUso).toBe('en uso')
    expect(nivelPorId(niveles, null)).toBeNull()
  })
})

describe('motivos fijos', () => {
  it('dicen lo mismo que la base', () => {
    expect(MOTIVO_DE_NIVEL_NO_DISPONIBLE).toBe('Ese nivel ya no existe.')
    expect(MOTIVO_SIN_PERMISO_DE_NIVELES).toBe(
      'No tienes permiso para cambiar los niveles de acceso.',
    )
  })
})

describe('firma y anuncios', () => {
  it('la firma cambia con la versión, el retiro y el motivo de uso, no con el orden de llegada de los campos', () => {
    const base = { tope: 10, niveles: [nivel(1)] }
    const igual = firmaDeNiveles({ tope: 10, niveles: [nivel(1)] })
    expect(firmaDeNiveles(base)).toBe(igual)
    expect(firmaDeNiveles({ tope: 10, niveles: [nivel(1, { actualizadoEn: 'otra' })] })).not.toBe(
      igual,
    )
    expect(
      firmaDeNiveles({ tope: 10, niveles: [nivel(1, { retiradoEn: '2026-10-24T11:00:00Z' })] }),
    ).not.toBe(igual)
    expect(firmaDeNiveles({ tope: 10, niveles: [nivel(1, { motivoDeUso: 'en uso' })] })).not.toBe(
      igual,
    )
    expect(firmaDeNiveles({ tope: 11, niveles: [nivel(1)] })).not.toBe(igual)
  })

  it('anuncia el cambio de grupo', () => {
    expect(anuncioDeRetiro('Gerencia')).toBe('«Gerencia» pasó a Retirados.')
    expect(anuncioDeRestauracion('Gerencia')).toBe('«Gerencia» volvió a los niveles en uso.')
  })
})
