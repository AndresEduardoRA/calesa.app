import { describe, expect, it } from 'vitest'
import { esquemaVerComo } from './perspectiva'

describe('esquemaVerComo', () => {
  it('sólo acepta el id de un rol', () => {
    expect(
      esquemaVerComo.safeParse({ rolId: '00000000-0000-0000-0000-0000000000aa' }).success,
    ).toBe(true)
    expect(esquemaVerComo.safeParse({ rolId: 'dueno' }).success).toBe(false)
    expect(esquemaVerComo.safeParse({}).success).toBe(false)
  })
})
