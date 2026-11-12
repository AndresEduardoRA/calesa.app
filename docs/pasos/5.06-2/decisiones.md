## 2026-11-11 — Paso 5.06-2

- **D11 · Un solo botón «Guardar» en la salida:** manda lo que cambió en dos pedidos seguidos (acción y nota, luego roles), el segundo con la versión del primero. Reversible a dos botones sin tocar las RPC.
- **D12 · «Acción» y «Pide nota al mover» se factorizan** de la forma de alta a `campos-de-salida.tsx`; el alta no cambia de conducta.
- **D13 · Lo nuevo cuelga de `useSalidasDeLaFase`** (`editar`, `ponerRolesDeFase`): una sola escritura a la vez en todo el bloque; la fase y las salidas no se pisan la versión.
- **D14 · `alternarRol(actuales, rolId, marcado)`** y no `(actuales, visibles, marcado)`: tocar un solo id ya conserva los que el selector no muestra.
- **D15 · Borrador con `key` por la firma de lo guardado** en el selector de la fase; en la salida, la forma nace al abrir «Editar» y no se reinicia mientras está abierta.
- **D16 · Estado local, no URL,** para editar; sólo quitar vive en la URL.
- **D17 · El e2e edita «Comprar»**, no «Embarcar» (el primer test ya la quitó).
- **D18 · Sin roles que elegir:** «No hay roles para elegir.»; guardar sigue permitido (lista vacía = quita la lista).
- **D19 · Una forma a la vez:** abrir «Editar» apaga «Agregar salida» y los demás «Editar» (y al revés) en vez de cerrar lo escrito sin avisar.
- **Sin avisos de precedencia:** limitar a un rol que quien configura no tiene, o dejar a nadie con el permiso, no avisa; eso es del 5.12 «Revisar».
