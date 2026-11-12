// Los presupuestos de JS en frío por pantalla, en KB con gzip (`e2e/soporte/js-en-frio.ts`). Se fijan con lo medido más un 5 %
// (redondeado hacia arriba a la decena); `e2e/presupuesto-js.spec.ts` falla por encima. Subir un presupuesto es una decisión (va en
// `docs/DECISIONES.md` con su razón), no un arreglo para que pase. Medido en la 9e: `/leads` 544 KB, `/perfil` 435 KB,
// `/vehiculos` 505 KB. Medido en el cierre 5b, con el `index.ts` de cada módulo sin componentes (una pantalla paga lo que
// reexporta lo que importa): `/leads` 498,6 KB, `/perfil` 413,0 KB, `/vehiculos` 467,7 KB (antes 565,4, 443,3 y 520,0).
export const PRESUPUESTO_DE_JS_EN_KB: Readonly<Record<string, number>> = {
  '/leads': 530,
  '/perfil': 440,
  '/vehiculos': 500,
  // El listado de cotizaciones (4.16-4a), sin el resumen (4.16-4b): medido 358,4 KB en 23 chunks, más un 5 % hacia arriba a la decena.
  '/cotizaciones': 380,
  // La hoja de cotizar con la subasta de la semilla (`?origen=`, el diseño más grande del juego), su presupuesto formal desde el 4.13-4d: medido 429,5 KB en 25 chunks, más un 5 % hacia arriba a la decena.
  '/cotizaciones/nuevo': 460,
  // La página de una cotización guardada (4.15-3), con una cotización sembrada en la subasta de la semilla: el mismo marco y la misma hoja, sin las barras del vehículo y del cliente: medido 438,6 KB en 27 chunks, más un 2 % hacia arriba.
  '/cotizaciones/[id]': 448,
}

// Lo que una sección de la ficha puede aportar al documento sobre `/perfil`, en KB. Era 44 hasta la 9e; con el shell delgado (`/perfil` ya
// no lleva la ficha) se midió 45,3 («Datos») y 44,3 («Oportunidades») y se fijó en 48. En el cierre 5b la ficha dejó de mandar el layout
// completo y los catálogos de lead (el panel de edición los lee al abrirse) y se midió 39,2 a 40,3: sobre lo medido más un 5 %, 43. Con
// 100 orígenes y 100 tipos aporta lo mismo (`e2e/leads-ficha.spec.ts`); con las props de antes habrían sido 70 KB.
export const PRESUPUESTO_DE_LA_FICHA_EN_KB = 43

// La ficha con la sección «Oportunidades» llena (cierre 5b, `e2e/leads-oportunidades-ver-todas.spec.ts`), en KB sobre `/perfil`: cada
// oportunidad pesa ~3,5 KB en el documento. El servidor dibuja las 10 más recientes (lo máximo por defecto) y «Ver más» lee el resto desde el
// navegador: con 10 o con 1.000 el documento pesa lo mismo (se midió 62,3 con 10). Sobre lo medido más un 5 %.
export const PRESUPUESTO_DE_LA_FICHA_CON_10_OPORTUNIDADES_EN_KB = 66

// El documento de `/perfil` (los bytes del HTML con el payload RSC, sin comprimir), en KB, con 100 orígenes y 100 tipos de lead: lo que paga
// toda pantalla del marco (`e2e/presupuesto-js.spec.ts`). Antes del cierre 5b-fix el shell mandaba el contexto del alta de lead (los
// catálogos y el layout de campos) en cada documento: 79,3 KB con la semilla y 106,6 con 100 + 100 (~26 KB de más); ahora pesa lo mismo con
// los dos (77,4 KB, tolerancia ±1 KB). Con las entradas del marco que se fueron encendiendo (Logística, 6.01) pesa 82,8 KB (84.810 B en
// escritorio) y con la campana en la barra (7.02-2: su botón, las rutas con pantalla y el usuario por props) 86,6 KB (86.627 B): sobre lo medido más un 5 %.
export const PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB = 91
