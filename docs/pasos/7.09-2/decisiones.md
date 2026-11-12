## 2026-11-12 — 7.09-2

Siguen la numeración de la parte 1 (llegó a D11). Plan: `.piloto/planes/7.09-2.md`.

- **D12** — Un grupo se arma con 1 a 49 personas más quien lo crea (2 a 50 en total): espeja `chat_grupo_crear`, que rechaza 50 elegidas. El plan servido decía «2–50».
- **D13** — Cada acción es una Server Action sobre `RepositorioDeConversaciones` (`features` no importa `infra`); la RPC corre con la sesión de quien actúa y el campo del
  rechazo sale del `hint`. Éxito ⇒ `revalidatePath('/chat')`.
- **D14** — «Silenciar» y «Salir» viven en el «⋯» del encabezado del hilo. El diálogo de salir se monta en la lista porque un `DELETE` de miembro no genera señal de Realtime:
  la lista gana `quitar(id)` y se relee.
- **D15** — `?panel=nueva|grupo|salir` sin claves nombradas: abrir o cerrar un panel no toca `?c=` (con `claves: ['c']`, cerrar cerraría el hilo). Lo mismo valdrá para el panel de
  borrar de 7.09-4: `claves: ['mensaje']`, sin `c`.
- **D16** — El buscador de personas se copia dentro del módulo (sin importar `agenda` ni subirlo a `shared`); Enter en el campo no envía el formulario del grupo.
- **D17** — Se puede dejar un grupo y el canal global; una directa no (se silencia). Si la fila de la conversación abierta no está cargada, el diálogo abre y la base responde.
- **D18** — «Entrar al canal del equipo» sólo con `puede(permisos, 'chat.global')`; `ya_estaba` no es error. El nombre «Equipo» es del catálogo, no se escribe.
- **D19** — Quién no puede usar el chat se rechaza en la base (`23514`): el buscador lista a toda persona activa y sin bloqueo y el modal dice el texto de la base.
- **D20** — El modal de la directa es un `<Modal>` registrado como `sinFormulario`; el del grupo, un `ModalDeFormulario`. Los paneles van con `diferido()` y `useAbiertoAlgunaVez()`.
- **D21** — Nivel 1 (esta parte no toca `_shell`, `shared` ni la base); los e2e dirigidos en `escritorio` y `movil`.
- **Pendiente para la persona:** agregar o quitar miembros de un grupo (`chat_grupo_miembros`, ya en la base) no tiene pantalla en ningún paso de la fila 7.09 ni 7.10.
