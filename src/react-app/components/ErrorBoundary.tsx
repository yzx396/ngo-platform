import { Component, type ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * Catches React component errors and displays a fallback UI
 * Prevents entire app from crashing due to component errors
 */
class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-destructive">{t('errors.oopsError')}</h1>
              <p className="text-muted-foreground">
                {t('errors.unexpectedError')}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="space-y-2 p-3 bg-muted rounded-md text-sm">
                <summary className="font-semibold cursor-pointer">{t('errors.errorDetails')}</summary>
                <pre className="whitespace-pre-wrap break-words text-xs font-mono overflow-auto max-h-64">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                {t('common.tryAgain')}
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="flex-1"
              >
                {t('common.goHome')}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);
