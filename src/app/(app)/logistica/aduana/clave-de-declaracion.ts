// El `?declaracion=<id>` de `/logistica/aduana`: qué declaración está abierta en el panel lateral. Un enlace suyo (el hueco «Aduana» de la unidad) abre el panel al cargar la página. Va
// aparte del drawer, que es de cliente: una constante importada de un archivo `'use client'` llega al servidor como una referencia, no como el texto.
export const CLAVE_DE_DECLARACION = 'declaracion'
