import React, { useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import SplashLoader from './components/SplashLoader'
import ErrorBoundary from './components/errors/ErrorBoundary'
import { ToastProvider } from './components/ui/ToastProvider'

function Root() {
  // Skip splash on customer QR routes for instant menu load
  const isCustomerRoute = window.location.pathname.startsWith('/menu/') || window.location.pathname.startsWith('/chat/') || window.location.pathname.startsWith('/r/');
  const [showSplash, setShowSplash] = useState(!isCustomerRoute);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <React.StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              {showSplash && <SplashLoader onComplete={handleSplashComplete} />}
              <App />
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
