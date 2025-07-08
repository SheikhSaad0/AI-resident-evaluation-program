import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { name: 'Evaluate', href: '/', icon: '/images/evaluate-icon.svg' },
  { name: 'Dashboard', href: '/dashboard', icon: '/images/dashboard-icon.svg' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full p-4 sm:p-6 gap-6">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <div className="h-full rounded-2xl bg-navy-700/80 backdrop-blur-2xl border border-glass-border p-4 flex flex-col">
          <div className="flex items-center justify-center h-16 mb-6">
             <Image src="/images/logo.svg" alt="Logo" width={120} height={40} />
          </div>
          <nav className="flex-grow">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-base font-medium group ${
                      router.pathname === item.href
                        ? 'bg-brand-teal text-white shadow-glow'
                        : 'text-text-secondary hover:bg-navy-600 hover:text-white'
                    }`}
                  >
                    <Image src={item.icon} alt={item.name} width={24} height={24} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="ml-4">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="text-center text-xs text-text-tertiary pb-2">
            <p>AI Surgical Evaluator</p>
            <p>v2.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow rounded-2xl bg-navy-700/60 backdrop-blur-2xl border border-glass-border overflow-hidden">
        <div className="w-full h-full overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}