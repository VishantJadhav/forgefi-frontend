// 1. Inject Buffer into the browser's global window object FIRST
import { Buffer } from 'buffer';
(window as any).Buffer = (window as any).Buffer || Buffer;

// 2. Load the rest of the React application
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)