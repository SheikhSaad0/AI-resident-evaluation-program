import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { name: 'Evaluate', href: '/', icon: '/images/evaluate-icon.svg' },
  { name: 'Dashboard', href: '/dashboard', icon: '/images/dashboard-icon.svg' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleNewEvaluation = () => {
    router.push('/');
  };

  const handleViewReports = () => {
    router.push('/evaluations');
  };

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
            
            {/* Additional Navigation Section */}
            <div className="mt-8 pt-6 border-t border-glass-border">
              <p className="text-text-quaternary text-xs font-medium uppercase tracking-wider mb-4">
                Quick Actions
              </p>
              <div className="space-y-2">
                <button 
                  onClick={handleNewEvaluation}
                  className="nav-item w-full justify-start text-sm hover:bg-glass-200"
                >
                  <div className="glassmorphism-subtle p-1.5 rounded-2xl mr-3">
                    <Image src="/images/upload-icon.svg" alt="Upload" width={16} height={16} />
                  </div>
                  New Evaluation
                </button>
                <button 
                  onClick={handleViewReports}
                  className="nav-item w-full justify-start text-sm hover:bg-glass-200"
                >
                  <div className="glassmorphism-subtle p-1.5 rounded-2xl mr-3">
                    <Image src="/images/dashboard-icon.svg" alt="Reports" width={16} height={16} />
                  </div>
                  View Reports
                </button>
              </div>
            </div>
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