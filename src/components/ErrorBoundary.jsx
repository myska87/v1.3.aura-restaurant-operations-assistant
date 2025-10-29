import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Component stack:', errorInfo?.componentStack);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6 flex items-center justify-center">
          <Card className="max-w-2xl w-full border-2 border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-3 text-red-800">
                <AlertTriangle className="w-6 h-6" />
                AURA One Pro encountered a startup issue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Alert className="bg-red-50 border-red-200 mb-6">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {this.state.error?.toString() || 'An unexpected error occurred during initialization'}
                </AlertDescription>
              </Alert>

              {this.state.errorInfo && (
                <details className="mb-6 p-4 bg-gray-50 rounded-lg text-xs">
                  <summary className="font-semibold text-gray-700 cursor-pointer mb-2">
                    Technical Details (for debugging)
                  </summary>
                  <pre className="text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload App
                </Button>
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                If this error persists, try clearing your browser cache or contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;