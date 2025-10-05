import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react'
import { ColorModeProvider } from './theme/colorMode.jsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error("Root container with id 'root' was not found in the DOM")
}

// Theme is now provided by ColorModeProvider

createRoot(container).render(
  <StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </StrictMode>,
)
