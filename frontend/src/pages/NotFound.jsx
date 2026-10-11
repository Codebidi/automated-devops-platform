import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button, Container } from '../components/ui';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col items-center justify-center p-4">
      <Container size="narrow" className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-elevated">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
          HTTP 404
        </span>

        <h1 className="mt-2 text-3xl sm:text-4xl font-heading font-extrabold text-content-primary tracking-tight">
          Resource or Route Not Found
        </h1>

        <p className="mt-3 text-sm sm:text-base text-content-secondary max-w-md mx-auto leading-relaxed">
          The requested path does not exist on this DeployHub instance or may have moved to a new route.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Link to="/">
            <Button
              variant="primary"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Return to Landing
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
