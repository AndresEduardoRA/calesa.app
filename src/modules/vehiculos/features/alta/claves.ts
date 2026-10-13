// Claves de la URL del panel de alta y edición. Están acá, y no en el hook, porque también las lee
// la página en el servidor: una constante exportada desde un archivo `'use client'` le llegaría
// como referencia, no como texto.
export const PANEL_NUEVO = 'nuevo'
// El vehículo que se está editando, por su id. El servidor lo lee y se lo pasa al panel.
export const CLAVE_DE_EDICION = 'editar'
