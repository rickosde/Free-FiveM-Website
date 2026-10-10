import Navbar from './components/Navbar.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Footer from './components/Footer.jsx'

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main>
        <AdminPanel />
      </main>
      <Footer />
    </>
  )
}
