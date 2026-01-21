'use client';

import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Bell,
  Lightbulb,
  Settings,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tareas', href: '/tasks', icon: CheckSquare },
  { name: 'Finanzas', href: '/finance', icon: Wallet },
  { name: 'Recordatorios', href: '/reminders', icon: Bell },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-primary-500 rounded-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white">Optimai</span>
      </div>
      <nav className="px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
