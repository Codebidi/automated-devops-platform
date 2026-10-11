import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, Rocket, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Container } from '../ui';

export function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Preview', href: '#preview' },
    { label: 'Roles', href: '#roles' },
    { label: 'Security', href: '#security' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface/85 dark:bg-canvas/85 backdrop-blur-md border-b border-border-subtle shadow-sm py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <Container size="wide">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-glow-brand group-hover:scale-105 transition-transform duration-200">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-lg text-content-primary tracking-tight leading-none">
                DeployHub
              </span>
              <span className="text-[10px] font-mono tracking-wider text-brand-600 dark:text-brand-400 font-semibold uppercase mt-0.5">
                CI/CD Console
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-subtle/70 dark:bg-surface-elevated/70 p-1 rounded-full border border-border-subtle/80 backdrop-blur-sm">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3.5 py-1.5 text-xs font-medium text-content-secondary hover:text-content-primary rounded-full transition-colors hover:bg-surface/80 dark:hover:bg-surface-subtle"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-content-secondary hover:text-content-primary rounded-xl hover:bg-surface-subtle transition-colors"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Open Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-content-secondary hover:text-content-primary rounded-lg"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 text-content-secondary hover:text-content-primary rounded-lg focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-surface dark:bg-surface-elevated border border-border-subtle rounded-2xl shadow-elevated animate-fade-up">
            <div className="flex flex-col gap-2">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="px-3 py-2 text-sm font-medium text-content-secondary hover:text-content-primary rounded-lg hover:bg-surface-subtle transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
                {isAuthenticated ? (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app');
                    }}
                  >
                    Open Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/login');
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/login');
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
