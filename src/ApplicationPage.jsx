import Navbar from './components/Navbar.jsx'
import DiscordLogin from './components/DiscordLogin.jsx'
import Footer from './components/Footer.jsx'

export default function ApplicationPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="applications-page section">
          <div className="container applications-page__hero">
            <h1>Vælg din ansøgningsformular</h1>
            <p>
            Skriv din ansøgning grundigt og ærligt. Vi læser alle ansøgninger igennem, og vi vil kontakte dig, hvis vi har brug for yderligere information.
            </p>
          </div>
          <DiscordLogin />
        </section>
      </main>
      <Footer />
    </>
  )
}
  