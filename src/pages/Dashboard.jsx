import React from 'react';
import DashboardPro from './DashboardPro';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-500">
          Something went wrong. Please refresh or contact support.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardPro />
    </ErrorBoundary>
  );
}