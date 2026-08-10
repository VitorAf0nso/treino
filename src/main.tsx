import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { requestPersistence } from './db'
import { boot, persistNow } from './store'
import './styles.css'

registerSW({ immediate: true })

// Pede persistencia uma vez; o Safari costuma conceder para app instalado.
void requestPersistence()

// Grava pendencias antes de o iOS suspender o app.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void persistNow()
})
window.addEventListener('pagehide', () => void persistNow())

void boot().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
