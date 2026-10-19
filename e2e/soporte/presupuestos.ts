// Los presupuestos de JS en frío por pantalla, en KB con gzip (`e2e/soporte/js-en-frio.ts`). Se fijan en la
// 9e con lo medido más un 5 % (redondeado hacia arriba a la decena); `e2e/presupuesto-js.spec.ts` falla
// por encima. Subir un presupuesto es una decisión (va en `docs/DECISIONES.md` con su razón), no un
// arreglo para que pase. Medido en la 9e: `/leads` 544 KB, `/perfil` 435 KB, `/vehiculos` 505 KB.
export const PRESUPUESTO_DE_JS_EN_KB: Readonly<Record<string, number>> = {
  '/leads': 570,
  '/perfil': 460,
  '/vehiculos': 530,
}

// Lo que una sección de la ficha puede aportar al documento sobre `/perfil`, en KB. Era 44 hasta la 9e; con el
// shell delgado (`/perfil` ya no lleva la ficha) se midió 45,3 («Datos») y 44,3 («Oportunidades»): el
// presupuesto se volvió a fijar sobre lo medido más un 5 % (`docs/DECISIONES.md`, 2026-10-16).
export const PRESUPUESTO_DE_LA_FICHA_EN_KB = 48
