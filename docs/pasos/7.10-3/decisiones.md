## 2026-11-12 — 7.10-3

Plan: `.piloto/planes/7.10-3.md`. **Corrige la D8 de 7.10**: suponía que un evento privado llegaba a las personas elegidas y la base lo rechaza (los destinatarios sólo valen con visibilidad `seleccionados`, que pide `agenda.eventos.publicar`).

- **D17** — `/evento` con invitados es un evento «para seleccionados» y pide `agenda.eventos.publicar`; sin ese permiso nace privado y sin invitados, y la ficha dice «Evento no disponible» a los demás miembros. No se otorga nada.
- **D18** — `/tarea` y `/evento` se reconocen al enviar (Enter o el botón), con un aviso bajo el campo; un menú de comandos con `/` queda fuera. Reversible: sólo cambia `useRedactor`.
- **D19** — El responsable y los invitados se eligen con `SelectorDePersonas` de agenda (≥ 3 letras), no con la lista de todos los miembros: el canal global no tiene tope. La tarea sólo ofrece a quien puede recibir y es miembro (`agenda_quienes_reciben` con la conversación).
- **D20** — En una directa la otra persona viene elegida (responsable o invitada) y se puede quitar. Sin `agenda.tareas.asignar`, la tarea es de quien la crea.
- **D21** — Sólo el responsable completa o reabre desde la ficha; el creador, que también puede en la base, lo hace en la agenda (enlace en la ficha). Reversible: `puedeCompletarDesdeFicha`.
- **D22** — El título de partida (lo escrito tras el comando) vive en estado y no en la URL: recargar con el panel abierto lo abre vacío.
- **D23** — Sin Realtime de tareas: si otra persona completa, la ficha lo muestra al releer el hilo.
- **D24** — El drawer de «Nueva tarea» no reusa el panel de agenda (monta calendario, `hoy` y el detalle); los campos y las reglas sí vienen de agenda por `client.ts`.
- **D25** — La tarea del chat nace sin vencimiento (opcional) y el evento empieza mañana a las 09:00 de la zona de la empresa; no hay descripción ni lugar en el formulario corto.

**Para `docs/DECISIONES.md` al cerrar el 7.10** (las de las tres partes): D2 y D3 de 7.10-1 (drawer propio del chat; «purgado» y «no lo veo» no se distinguen), D10, D12 y D15 de 7.10-2 (una palabra tras el `#`; campo plano; cualquier persona activa) y D17–D25.
