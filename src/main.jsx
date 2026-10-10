import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { brandAssetMimeType, brandAssetUrl } from './lib/brandAssets.js'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.jsx'
import ApplicationPage from './ApplicationPage.jsx'
import AdminPage from './AdminPage.jsx'
import StaffPage from './StaffPage.jsx'

if (brandAssetUrl) {
  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.type = brandAssetMimeType
  favicon.href = brandAssetUrl
  document.head.append(favicon)
}

const path = window.location.pathname.replace(/\/+$|^\/+/g, '') || '/'
const normalizedPath = path.startsWith('/') ? path.slice(1) : path
const isApplicationPage = normalizedPath === 'ansogning' || normalizedPath.startsWith('ansogning/')
const isAdminPage = normalizedPath === 'admin'
const isStaffPage = normalizedPath === 'staff'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isApplicationPage ? (
      <ApplicationPage />
    ) : isAdminPage ? (
      <AdminPage />
    ) : isStaffPage ? (
      <StaffPage />
    ) : (
      <App />
    )}
  </StrictMode>,
)
