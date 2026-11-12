import {
  AlarmClockIcon,
  ArrowRightLeftIcon,
  BellIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  GlobeIcon,
  GlobeLockIcon,
  HourglassIcon,
  ListChecksIcon,
  MessageSquareIcon,
  Share2Icon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { tipoDe } from '../../../entities/tipos'

// El catálogo (`entities/tipos.ts`) guarda el nombre del icono; acá se resuelve a su componente. Sólo los que
// el catálogo nombra: un nombre que no esté acá se dibuja como la campana, nunca se rompe.
const ICONOS: Readonly<Record<string, LucideIcon>> = {
  AlarmClock: AlarmClockIcon,
  ArrowRightLeft: ArrowRightLeftIcon,
  Bell: BellIcon,
  CalendarDays: CalendarDaysIcon,
  CalendarPlus: CalendarPlusIcon,
  Globe: GlobeIcon,
  GlobeLock: GlobeLockIcon,
  Hourglass: HourglassIcon,
  ListChecks: ListChecksIcon,
  MessageSquare: MessageSquareIcon,
  Share2: Share2Icon,
  Trash2: Trash2Icon,
}

export function IconoDeTipo({ tipo, className }: { tipo: string; className?: string }) {
  const nombre = tipoDe(tipo).icono
  const Icono = (Object.hasOwn(ICONOS, nombre) ? ICONOS[nombre] : undefined) ?? BellIcon
  return <Icono aria-hidden className={className} />
}
