## 6.09-2 — Aduana: escribir (2026-11-12)

- **D15** El buscador de vehículos busca al enviar (Enter o «Buscar»), no con un debounce a cada letra: una petición por intención, sin temporizadores, y una respuesta vieja no pisa a una nueva. El mínimo (3 letras o números) es el mismo que el de la lista.
- **D16** El alta y la edición no convive con el resumen (D8): el formulario es un panel propio por `?panel=` que la página dibuja leyendo la declaración en el servidor (`shallow: false`); guardar o cancelar vuelve al resumen con `replace` para que «atrás» no reabra el formulario.
- **D17** `?panel=canal` va sobre el resumen sin tocar `?declaracion=`: se abre con `usePanelPorUrl(PANEL_CANAL)` sin claves extra, así abrir y cerrar sólo escriben `?panel=`.
- **D18** Tras un conflicto de versión el formulario y la composición guardan la versión con la que chocaron: «Recargar» (`router.refresh()`) trae la declaración nueva y lo escrito se queda; el aviso se apaga solo cuando la versión cambia. El borrador se compara contra la versión nueva.
- **D19** Un vehículo ya marcado para quitar o ya agregado por otra persona se descarta solo al releer la declaración; «Guardar vehículos» manda sólo lo que aún aplica.
- **D20** El e2e no consulta la lista por rol mientras hay un panel modal abierto (el resto de la página queda oculto para el árbol de accesibilidad): el «Faltan los tributos de 2» se lee en el resumen y la fila «Pagada» se lee tras recargar la página.
