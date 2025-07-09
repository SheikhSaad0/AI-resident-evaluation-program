import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { name: 'Evaluate', href: '/', icon: '/images/evaluate-icon.svg' },
  { name: 'Dashboard', href: '/dashboard', icon: '/images/dashboard-icon.svg' },
  { name: 'View Reports', href: '/evaluations', icon: '/images/dashboard-icon.svg' },
  { name: 'Resident Management', href: '/residents', icon: '/images/default-avatar.svg' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full p-4 sm:p-6 gap-6">
      {/* Enhanced Glassmorphism Sidebar */}
      <aside className="w-72 flex-shrink-0">
        <div className="h-full glassmorphism-strong rounded-4xl p-6 flex flex-col shadow-glass-lg">
          {/* Logo Section */}
          <div className="flex items-center justify-center h-20 mb-8">
            <div className="glassmorphism-subtle p-3 rounded-3xl">
              <Image src="/images/logo.svg" alt="AI Surgical Evaluator" width={140} height={48} />
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-grow">
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className={`
                      nav-item
                      ${router.pathname === item.href ? 'nav-item-active' : ''}
                    `}
                  >
                    <div className="glassmorphism-subtle p-2 rounded-2xl mr-3">
                      <Image 
                        src={item.icon} 
                        alt={item.name} 
                        width={20} 
                        height={20} 
                        className="opacity-80 group-hover:opacity-100 transition-opacity" 
                      />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Footer */}
          <div className="glassmorphism-subtle rounded-3xl p-4 text-center">
            <div className="text-xs font-medium text-text-tertiary space-y-1">
              <p className="text-gradient font-semibold">AI Surgical Evaluator</p>
              <p className="text-text-quaternary">Version 2.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow glassmorphism rounded-4xl shadow-glass-lg overflow-hidden">
        <div className="w-full h-full overflow-y-auto scrollbar-glass p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}