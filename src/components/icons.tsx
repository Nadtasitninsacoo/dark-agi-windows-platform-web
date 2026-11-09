import {
  BookOpen, Bot, Bug, Cpu, FileText, Fingerprint, Flag, Gauge, Globe, Key, List, Lock, Monitor, Network, Radar,
  ScrollText, Search, Server, Settings, ShieldAlert, SquareTerminal, Target, Wrench, type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@/lib/modules';

export const MODULE_ICONS: Record<IconName, LucideIcon> = {
  gauge: Gauge,
  bot: Bot,
  cpu: Cpu,
  wrench: Wrench,
  network: Network,
  'shield-alert': ShieldAlert,
  globe: Globe,
  monitor: Monitor,
  search: Search,
  radar: Radar,
  bug: Bug,
  key: Key,
  list: List,
  scroll: ScrollText,
  'file-text': FileText,
  target: Target,
  lock: Lock,
  settings: Settings,
  book: BookOpen,
  terminal: SquareTerminal,
  flag: Flag,
  fingerprint: Fingerprint,
  server: Server,
};
