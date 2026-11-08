// Lo que dice un campo de la plantilla cuando la forma lo rechaza: la forma da un solo mensaje para todo («no tiene la forma esperada») y junto al campo hace falta
// decir qué se espera. `donde` es el de `validarPlantilla()`.
export function motivoDeForma(donde: string, mensaje: string): string {
  if (donde.startsWith('etiquetas.')) return 'La etiqueta lleva de 1 a 60 caracteres.'
  if (donde.startsWith('leyendas.') || donde === 'total.leyenda')
    return 'La leyenda lleva hasta 160 caracteres.'
  if (donde === 'total.etiqueta') return 'El total lleva de 1 a 40 caracteres.'
  if (donde === 'nota') return 'La nota lleva hasta 300 caracteres.'
  if (/^grupos\[\d+\]\.tono$/.test(donde)) return 'Elige un tono del catálogo o «Del grupo».'
  return mensaje
}

// Los `donde` que dibuja el editor en un campo propio; el resto del rechazo se dice arriba.
export function esDeUnCampo(donde: string): boolean {
  return (
    /^(etiquetas|leyendas)\./.test(donde) ||
    /^grupos\[\d+\]\.tono$/.test(donde) ||
    ['total.etiqueta', 'total.leyenda', 'nota'].includes(donde)
  )
}
