## 2026-11-06 — Paso 4.24-2b

- **Lo que contestó la persona:** compuerta `datos` del plan: «Aprobar y esperar al A». Compuerta `afuera` (P1), en dos vueltas: primero «Seguir con el 4.24-3
  mientras»; después el registro llegó a `main` (`2f87361d`, PR #39) y el paso se ejecutó con el plan aprobado.
- **Lo que se aprobó en permisos:** dos puertas en la app, ninguna en la base. La action mira `cotizaciones.papelera.purgar` antes de llamar. La revisión de
  `?panel=purgar` también la mira: leads no lo hace, pero aquí quien no purga ve sus propios lotes y una URL escrita a mano le abriría el diálogo.
- **Lo no obvio:**
  - Mismo rechazo, dos textos. La app dice «No tienes permiso para purgar la papelera de cotizaciones.» (nombra su papelera) y la base, «No tienes permiso para
    purgar la papelera.» (la misma para todas). En la app es una constante, `MENSAJE_SIN_PERMISO_DE_PURGAR`, que usan la action y la revisión de la URL.
  - «Purgar» va con `variant="destructive"`, como en leads y vehículos, y no `outline` como decía el plan: lo irreversible se ve distinto en las tres papeleras.
    El orden es «Restaurar» y después «Purgar» (la destructiva al final).
  - **El tope de bytes de E8 pasa de 360.000 a 475.000 B.** Con la dueña, la página 1 dibuja 100 «Purgar» y 5 «Purgar el lote» y mide 452.015 B: ≈ 1 KB por
    botón (342.808 B en el 4.24-2). Casi todo son las 598 letras de clases de la base de `Button` (`src/shared/ui/button.tsx`, del A). Medido el largo de las
    clases por variante: `ghost` ahorraría ≈ 107 por botón (≈ 11 KB, 2,5 %) y `outline` ≈ 44. No compensa perder el tono de lo destructivo, así que el tope
    queda en lo medido más un 5 %. La razón: una papelera es una pantalla de trabajo de quien la vacía, sin SEO, y lo que la protege es que no crezca con el lote.
    Con 21 o con 200, mide lo mismo (±0,1 %). Nodos 1.329 de 3.000; JS 424,5 de 440.
  - `resumenDeRestauracion` y `resumenDePurga` comparten un `resumir()` con sus palabras (el mismo esquema que leads). `usePapelera` avisa el resultado de
    purgar; el error lo dice el diálogo, y por eso `purgar` devuelve el `Resultado`.
  - Las acciones de un lote y de una fila salen de `<AccionesDePapelera>`, como `Acciones` de leads. El lote sólo las ubica.
  - La prueba de la pantalla monta `NuqsTestingAdapter`, porque ahora la pantalla lee `?panel=purgar`.
  - La limpieza del soporte e2e borra primero los comprobantes de la serie `E2E-PAPELERA` y su contador. Un comprobante frena el borrado de su cotización (`restrict`)
    y nombra a quien lo emitió: sin esto caían el `afterAll` y el `prepararPapelera` del proyecto `movil`. `irALaPapelera`, `lotesDeLaPagina` y `filasDe` pasaron al
    soporte para los dos specs.
- **Para el coordinador (o el A):**
  - 4-68 y 4-70 (`docs/PLAN.md`) ya están cerrados en la base: 4-68 en el 4.24-1a (`docs/pasos/4.24-1a/bitacora.md`) y 4-70 en el 4.24-1b
    (`docs/pasos/4.24-1b/decisiones.md`). Se quitan al integrar el 4.24.
  - El 4.24-2b (`depende_de: ['4.24-2']` y el chore del registro) purga desde `/cotizaciones/papelera`. El 4.25 depende de `4.24-3` y de `4.24-2b`.
  - Este PR **no marca `integrado 4.24`**: el 4.24 sigue con el 4.24-3 («Enviar a la papelera» con «Deshacer»).
  - Sigue abierto para un paso de base del C, si la persona lo pide: el motivo de lo bloqueado en la fila del lote (P3 del 4.24-2).
