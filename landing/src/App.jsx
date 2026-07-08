import React from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Music, ListMusic, Bookmark, TabletSmartphone, Cloud } from "lucide-react";
import "./styles.css";

function Feature({ icon, title, children }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function App() {
  return (
    <main>
      <section className="hero">
        <nav className="nav">
          <div className="brand-mark">
            <span className="cloud">☁</span>
            <span className="note">♪</span>
          </div>
          <span className="brand-name">AriaScore</span>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Coming soon to Android</p>
          <h1>Digital sheet music for practice and performance.</h1>
          <p className="lead">
            AriaScore helps musicians organize their scores, build setlists,
            bookmark pages, and perform confidently from a tablet.
          </p>

          <div className="cta-row">
            <a className="primary-button" href="mailto:joshua.r.layne@gmail.com">
              Contact developer
            </a>
            <a className="secondary-button" href="#features">
              View features
            </a>
          </div>
        </div>

        <div className="preview-card" aria-label="AriaScore app preview">
          <div className="tablet">
            <div className="app-topbar">
              <span>AriaScore</span>
              <span>Setlist</span>
            </div>
            <div className="score-page">
              <div className="staff"></div>
              <div className="staff short"></div>
              <div className="staff"></div>
              <div className="staff medium"></div>
              <div className="music-note">♪</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="section-header">
          <p className="eyebrow">Built for musicians</p>
          <h2>Your score library, ready when you are.</h2>
        </div>

        <div className="feature-grid">
          <Feature icon={<BookOpen size={24} />} title="Score library">
            Keep your sheet music organized in one clean, searchable collection.
          </Feature>
          <Feature icon={<ListMusic size={24} />} title="Setlists">
            Prepare service orders, recitals, rehearsals, and performance lists.
          </Feature>
          <Feature icon={<Bookmark size={24} />} title="Bookmarks">
            Mark important pages and return to them quickly.
          </Feature>
          <Feature icon={<TabletSmartphone size={24} />} title="Tablet-first">
            Designed for reading, page turning, and live performance.
          </Feature>
          <Feature icon={<Music size={24} />} title="Musician-focused">
            Built around real practice and performance workflows.
          </Feature>
          <Feature icon={<Cloud size={24} />} title="Cloud-ready vision">
            Designed with future sync and portability in mind.
          </Feature>
        </div>
      </section>

      <section className="footer-cta">
        <h2>AriaScore is currently in development.</h2>
        <p>
          For questions, feedback, or early testing interest, contact the developer.
        </p>
        <a className="primary-button" href="mailto:joshua.r.layne@gmail.com">
          joshua.r.layne@gmail.com
        </a>
      </section>

      <footer>
        <span>© {new Date().getFullYear()} AriaScore.</span>
        <span>Developed by Joshua Layne.</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
