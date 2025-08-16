import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../lib/auth';
import { GlassButton } from './ui';

// FIX: Added the 'Chat' nav item to the array
const navItems = [
  { name: 'Evaluate', href: '/', icon: '/images/evaluate-icon.svg' },
  { name: 'Live Mode', href: '/live', icon: '/images/live-icon.svg' },
  { name: 'Dashboard', href: '/dashboard', icon: '/images/dashboard-icon.svg' },
  { name: 'View Reports', href: '/evaluations', icon: '/images/dashboard-icon.svg' },
  { name: 'Manage Profiles', href: '/manage-profiles', icon: '/images/default-avatar.svg' },
  { name: 'Chat', href: '/chat', icon: '/images/chat.svg' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const publicPages = ['/login'];

  const profilePathMap = {
    resident: 'residents',
    attending: 'attendings',
    programDirector: 'program-directors',
  };

  useEffect(() => {
    if (!auth?.loading && !auth?.user && !publicPages.includes(router.pathname)) {
      router.push('/login');
    }
  }, [auth?.loading, auth?.user, router.pathname, router]);

  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarOpen(false);
    }
  }, [router.pathname]);

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

  if (publicPages.includes(router.pathname)) {
    return <main className="bg-background-gradient min-h-screen">{children}</main>;
  }
  
  if (!auth?.user) {
    return null; 
  }

  const profilePath = auth.user.type ? profilePathMap[auth.user.type] : '';
  const profileUrl = profilePath ? `/${profilePath}/${auth.user.id}` : '#';

  const SidebarContent = () => {
    const userTitle = auth.user?.title || auth.user?.year || (auth.user?.type === 'programDirector' ? 'Program Director' : auth.user?.type);

    return (
        <div className="h-full glassmorphism-strong rounded-4xl p-6 flex flex-col shadow-glass-lg">
        <Link href={profileUrl} className="block group">
          <div className="flex justify-between items-start mb-10">
              <div className="flex items-center space-x-4 min-w-0">
                  <img
                      src={auth.user?.photoUrl || '/images/default-avatar.svg'}
                      alt={auth.user?.name || 'User'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary-accent flex-shrink-0"
                  />
                  <div className="min-w-0">
                      <p className="font-bold text-lg text-text-primary break-words group-hover:text-brand-primary transition-colors">{auth.user?.name}</p>
                      <p className="text-sm text-text-tertiary">{userTitle}</p>
                  </div>
              </div>
          </div>
        </Link>
        <button
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden absolute top-8 right-8 text-text-primary hover:text-white"
            aria-label="Close menu"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
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
          <GlassButton variant="secondary" onClick={() => auth.logout()} className="w-full">
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

  // FIX: This determines if the main content area should have the glass card styling.
  // For the chat page, we want it to be plain so the chat component can control its own background.
  const useGlassmorphismLayout = router.pathname !== '/chat';

  return (
    <>
      <div className="flex min-h-screen w-full bg-background-gradient">
        <aside className="hidden sm:block flex-shrink-0 w-80 p-6">
          <SidebarContent />
        </aside>

        <div className="flex flex-col flex-1 w-full sm:w-auto">
          {/* Mobile Header (No changes needed here) */}
          <header className="sm:hidden p-4 flex justify-between items-center sticky top-0 bg-background-gradient/80 backdrop-blur-sm z-10">
              <Link href={profileUrl} className="flex items-center space-x-3 group min-w-0">
                  <img
                      src={auth.user.photoUrl || '/images/default-avatar.svg'}
                      alt={auth.user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary-accent flex-shrink-0"
                  />
                  <div className="min-w-0">
                      <p className="font-semibold text-base text-text-primary truncate group-hover:text-brand-primary transition-colors">{auth.user.name}</p>
                      <p className="text-xs text-text-tertiary">{auth.user.title || auth.user.year}</p>
                  </div>
              </Link>
              <button onClick={() => setSidebarOpen(true)} className="text-white" aria-label="Open menu">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              </button>
          </header>

          <main className="flex-grow p-4 pt-0 sm:p-6 sm:pt-6 h-full">
              {/* FIX: Conditional rendering for the main content wrapper */}
              {useGlassmorphismLayout ? (
                <div className="w-full h-full overflow-y-auto scrollbar-glass glassmorphism rounded-4xl shadow-glass-lg p-6 md:p-8">
                  {children}
                </div>
              ) : (
                <div className="w-full h-full">
                  {children}
                </div>
              )}
          </main>
        </div>
      </div>
      
      {/* Mobile Sidebar (No changes needed here) */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 sm:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full w-80 max-w-[90vw] p-4 z-40 transform transition-transform sm:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}