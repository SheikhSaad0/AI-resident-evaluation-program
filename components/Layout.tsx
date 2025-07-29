// components/Layout.tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../lib/auth';
import { GlassButton } from './ui';

// ... (navItems array remains the same) ...
const navItems = [
  { name: 'Evaluate', href: '/', icon: '/images/evaluate-icon.svg' },
  { name: 'Live Mode', href: '/live', icon: '/images/live-icon.svg' },
  { name: 'Dashboard', href: '/dashboard', icon: '/images/dashboard-icon.svg' },
  { name: 'View Reports', href: '/evaluations', icon: '/images/dashboard-icon.svg' },
  { name: 'Manage Profiles', href: '/manage-profiles', icon: '/images/default-avatar.svg' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useContext(AuthContext);

  const publicPages = ['/login', '/manage-profiles'];

  useEffect(() => {
    // Wait until loading is false before checking auth status
    if (!auth?.loading && !auth?.user && !publicPages.includes(router.pathname)) {
      router.push('/login');
    }
  }, [auth?.loading, auth?.user, router.pathname]);

  // Show a loading screen while checking for a user session
  if (auth?.loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  // If we are on a public page and not logged in, don't render the main layout
  if (!auth?.user && publicPages.includes(router.pathname)) {
    return <main className="bg-background-gradient">{children}</main>;
  }
  
  // Render null if user is not available but not loading anymore (during redirect)
  if (!auth?.user) {
    return null; 
  }

  return (
    <div className="flex min-h-screen w-full p-4 sm:p-6 gap-6 bg-background-gradient">
      {/* Sidebar - No changes needed here */}
      <aside className="w-72 flex-shrink-0">
        <div className="h-full glassmorphism-strong rounded-4xl p-6 flex flex-col shadow-glass-lg">
          <div className="flex items-center space-x-4 mb-10">
            <img
              src={auth.user.photoUrl || '/images/default-avatar.svg'}
              alt={auth.user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary-accent"
            />
            <div>
              <p className="font-bold text-lg text-text-primary truncate">{auth.user.name}</p>
              <p className="text-sm text-text-tertiary capitalize">{auth.user.type}</p>
            </div>
          </div>
          <nav className="flex-grow">
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className={`nav-item ${router.pathname === item.href ? 'nav-item-active' : ''}`}>
                    <div className="glassmorphism-subtle p-2 rounded-2xl mr-3">
                      <Image src={item.icon} alt={item.name} width={20} height={20} className="opacity-80 group-hover:opacity-100 transition-opacity"/>
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-4">
              <GlassButton variant="destructive" onClick={() => auth.logout()} className="w-full">
                  Logout
              </GlassButton>
              <div className="glassmorphism-subtle rounded-3xl p-4 text-center">
                  <div className="text-xs font-medium text-text-tertiary space-y-1">
                  <p className="text-gradient font-semibold">AI Surgical Evaluator</p>
                  <p className="text-text-quaternary">Version 2.0</p>
                  </div>
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