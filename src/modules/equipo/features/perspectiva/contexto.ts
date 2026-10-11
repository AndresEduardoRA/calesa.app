'use client'

import { createContext } from 'react'
import { SIN_PERSPECTIVA, type Perspectiva } from '../../entities/perspectiva'

// La perspectiva de este request, tal como la devolvió `mi_sesion()`. Sin proveedor (las
// pantallas de acceso) no hay perspectiva.
export const ContextoPerspectiva = createContext<Perspectiva>(SIN_PERSPECTIVA)
