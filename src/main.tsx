import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Gate } from './components/Lock'
import { ConfirmProvider } from './components/ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <Gate>
        <App />
      </Gate>
    </ConfirmProvider>
  </StrictMode>,
)
