'use client'

import { parseAsString, useQueryStates } from 'nuqs'

// Todo lo que la barra elige vive en la URL (`?vista=`, `?fecha=`, `?ver=`, `?de=`): se puede recargar y compartir. Las mismas claves las
// lee la página en el servidor; aquí se repiten porque una constante de un archivo de cliente le llegaría como referencia.
const PARAMETROS = {
  vista: parseAsString,
  fecha: parseAsString,
  ver: parseAsString,
  de: parseAsString,
}

export function useParametrosDeAgenda() {
  return useQueryStates(PARAMETROS, { shallow: false })
}
