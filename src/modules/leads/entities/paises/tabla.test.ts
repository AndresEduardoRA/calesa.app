import { describe, expect, it } from 'vitest'
import { TABLA_DE_PAISES } from './tabla'

// Los dos nombres que la tabla escribe distinto del de ICU (con tilde y con el nombre de uso).
const NOMBRES_PROPIOS: Record<string, string> = { AX: 'Islas Åland', CI: 'Costa de Marfil' }

const regiones = new Intl.DisplayNames(['es'], { type: 'region' })

describe('tabla de países', () => {
  const { nombres, prefijos, compartidos } = TABLA_DE_PAISES

  it('cubre todos los países y territorios con código propio', () => {
    expect(Object.keys(nombres).length).toBeGreaterThanOrEqual(240)
  })

  it('cada ISO existe y su nombre es el de ICU, salvo las excepciones', () => {
    for (const [iso, nombre] of Object.entries(nombres)) {
      const deIcu = regiones.of(iso)
      expect(deIcu, iso).toBeDefined()
      expect(deIcu, `«${iso}» no existe en ICU`).not.toBe(iso)
      expect(nombre, iso).toBe(NOMBRES_PROPIOS[iso] ?? deIcu)
    }
  })

  it('los prefijos son dígitos, no empiezan con 0 y apuntan a un país con nombre', () => {
    for (const [prefijo, iso] of Object.entries(prefijos)) {
      expect(prefijo, prefijo).toMatch(/^[1-9][0-9]{0,6}$/)
      expect(nombres[iso], `${prefijo} → ${iso}`).toBeDefined()
    }
  })

  it('los compartidos apuntan a países con nombre y no repiten un prefijo resuelto', () => {
    for (const [prefijo, isos] of Object.entries(compartidos)) {
      expect(prefijo in prefijos, prefijo).toBe(false)
      expect(isos.length).toBeGreaterThan(1)
      for (const iso of isos) {
        expect(nombres[iso], iso).toBeDefined()
      }
    }
  })

  it('todo país de la tabla tiene al menos un prefijo', () => {
    const conPrefijo = new Set([...Object.values(prefijos), ...Object.values(compartidos).flat()])
    for (const iso of Object.keys(nombres)) {
      expect(conPrefijo.has(iso), iso).toBe(true)
    }
  })

  it('los códigos de dos dígitos no chocan con un código de tres', () => {
    // «54» y «541» a la vez dejaría un código de país ambiguo (el plan de la UIT es sin prefijos).
    // Las excepciones son los subprefijos deliberados de un mismo país o territorio.
    const PERMITIDOS = new Set(['7→76', '7→77'])
    for (const corto of Object.keys(prefijos).filter((p) => p.length <= 3)) {
      for (const largo of Object.keys(prefijos).filter((p) => p.length <= 3 && p !== corto)) {
        if (largo.startsWith(corto)) {
          expect(PERMITIDOS.has(`${corto}→${largo}`), `${corto} y ${largo}`).toBe(true)
        }
      }
    }
  })
})
