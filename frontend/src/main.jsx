/**
 * Main Entry Point for the AI Interview Platform
 * 
 * This file serves as the root entry point for the React application.
 * It initializes the React app and renders the main App component.
 * 
 * @author AI Interview Platform Team
 * @version 1.0.0
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Create React root and render the application
// StrictMode enables additional checks and warnings for development
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
