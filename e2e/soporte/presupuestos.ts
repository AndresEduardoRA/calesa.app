// Los presupuestos de JS en frío por pantalla, en KB con gzip (`e2e/soporte/js-en-frio.ts`). Se fijan con lo medido más un 5 %
// (redondeado hacia arriba a la decena); `e2e/presupuesto-js.spec.ts` falla por encima. Subir un presupuesto es una decisión (va en
// `docs/DECISIONES.md` con su razón), no un arreglo para que pase. Medido en la 9e: `/leads` 544 KB, `/perfil` 435 KB,
// `/vehiculos` 505 KB. Medido en el cierre 5b, con el `index.ts` de cada módulo sin componentes (una pantalla paga lo que
// reexporta lo que importa): `/leads` 498,6 KB, `/perfil` 413,0 KB, `/vehiculos` 467,7 KB (antes 565,4, 443,3 y 520,0).
export const PRESUPUESTO_DE_JS_EN_KB: Readonly<Record<string, number>> = {
  '/leads': 530,
  '/perfil': 440,
  '/vehiculos': 500,
}

// Lo que una sección de la ficha puede aportar al documento sobre `/perfil`, en KB. Era 44 hasta la 9e; con el shell delgado (`/perfil` ya
// no lleva la ficha) se midió 45,3 («Datos») y 44,3 («Oportunidades») y se fijó en 48. En el cierre 5b la ficha dejó de mandar el layout
// completo y los catálogos de lead (el panel de edición los lee al abrirse) y se midió 39,2 a 40,3: sobre lo medido más un 5 %, 43. Con
// 100 orígenes y 100 tipos aporta lo mismo (`e2e/leads-ficha.spec.ts`); con las props de antes habrían sido 70 KB.
export const PRESUPUESTO_DE_LA_FICHA_EN_KB = 43
