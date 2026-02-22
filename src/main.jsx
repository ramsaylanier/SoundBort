import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AudioDeviceProvider } from '@/contexts/AudioDeviceProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AudioDeviceProvider>
      <App />
    </AudioDeviceProvider>
  </StrictMode>,
)
