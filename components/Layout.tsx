import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../lib/auth';
import { GlassButton } from './ui';

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
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const publicPages = ['/login', '/manage-profiles'];

  useEffect(() => {
    // Redirect to login page if not authenticated and not on a public page
    if (!auth?.loading && !auth?.user && !publicPages.includes(router.pathname)) {
      router.push('/login');
    }
  }, [auth?.loading, auth?.user, router.pathname, router, publicPages]);


  // Effect to close the sidebar on route change
  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  // Effect to prevent body scroll when the mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('overflow-hidden', 'sm:overflow-auto');
    } else {
      document.body.classList.remove('overflow-hidden', 'sm:overflow-auto');
    }
    return () => {
      document.body.classList.remove('overflow-hidden', 'sm:overflow-auto');
    };
  }, [isSidebarOpen]);

  if (auth?.loading || (!auth?.user && !publicPages.includes(router.pathname))) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-gradient">
            <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!auth?.user && publicPages.includes(router.pathname)) {
    return <main className="bg-background-gradient min-h-screen">{children}</main>;
  }
  
  if (!auth?.user) {
    return null; 
  }

  // Extracted Sidebar Content to a sub-component for clarity
  const SidebarContent = () => {
    if (!auth.user) return null; // Guard for TypeScript

    return (
        <div className="h-full glassmorphism-strong rounded-4xl p-6 flex flex-col shadow-glass-lg">
        <div className="flex justify-between items-start mb-10">
            <div className="flex items-center space-x-4">
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
            <button
                onClick={() => setSidebarOpen(false)}
                className="sm:hidden text-text-primary hover:text-white"
                aria-label="Close menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
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
    )
  }

  return (
    <>
      {/* Main layout container */}
      <div className="flex min-h-screen w-full bg-background-gradient">
        {/* Static sidebar for desktop (sm and up) */}
        <aside className="hidden sm:block flex-shrink-0 w-72 p-6">
          <SidebarContent />
        </aside>

        <div className="flex flex-col flex-1 w-full sm:w-auto">
          {/* Mobile Header - UPDATED */}
          <header className="sm:hidden p-4 flex justify-between items-center sticky top-0 bg-background-gradient/80 backdrop-blur-sm z-10">
              <div className="flex items-center space-x-3">
                  <img
                      src={auth.user.photoUrl || '/images/default-avatar.svg'}
                      alt={auth.user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary-accent"
                  />
                  <div>
                      <p className="font-semibold text-base text-text-primary truncate">{auth.user.name}</p>
                      <p className="text-xs text-text-tertiary capitalize">{auth.user.type}</p>
                  </div>
              </div>
              <button onClick={() => setSidebarOpen(true)} className="text-white" aria-label="Open menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              </button>
          </header>

          {/* Main Content */}
          <main className="flex-grow p-4 pt-0 sm:p-6 sm:pt-6">
              <div className="w-full h-full overflow-y-auto scrollbar-glass glassmorphism rounded-4xl shadow-glass-lg p-6 md:p-8">
                  {children}
              </div>
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 sm:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Mobile Sidebar (Drawer) */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[90vw] p-4 z-40 transform transition-transform sm:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}