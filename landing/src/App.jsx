import React from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, Bookmark, Library, ListMusic, Search, SlidersHorizontal } from "lucide-react";
import logo from "./assets/logo.png";
import home from "./assets/home.png";
import library from "./assets/library.png";
import reader from "./assets/reader.png";
import metadata from "./assets/metadata.png";
import "./styles.css";

const contactEmail = "joshua.r.layne@gmail.com";

function Feature({ icon, title, children }) {
  return (
    <article className="feature">
      <div className="featureIcon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

function Shot({ image, title, description }) {
  return (
    <article className="shotCard">
      <div className="shotFrame">
        <img src={image} alt={title} />
      </div>
      <div className="shotText">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}

function App() {
  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#">
          <img src={logo} alt="" />
          <span>AriaScore</span>
        </a>
        <div className="navLinks">
          <a href="#features">Features</a>
          <a href="#screenshots">Screenshots</a>
          <a href={`mailto:${contactEmail}`}>Contact</a>
        </div>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Coming soon to Android</p>
          <h1>Digital sheet music for practice and performance.</h1>
          <p className="lead">
            AriaScore gives musicians a clean tablet-first library for scores,
            setlists, bookmarks, metadata, and live performance.
          </p>
          <div className="actions">
            <a className="primary" href={`mailto:${contactEmail}`}>Contact developer</a>
            <a className="secondary" href="#screenshots">View screenshots</a>
          </div>
        </div>
        <div className="heroShot">
          <img src={home} alt="AriaScore home screen" />
        </div>
      </section>

      <section id="features" className="features">
        <div className="sectionTitle">
          <p className="eyebrow">Built around real musician workflows</p>
          <h2>Everything you need before the first note.</h2>
        </div>
        <div className="featureGrid">
          <Feature icon={<Library size={24} />} title="Library">Organize your scores with titles, composers, arrangers, genres, document types, and page counts.</Feature>
          <Feature icon={<ListMusic size={24} />} title="Setlists">Prepare service music, recital orders, rehearsal packs, and repeatable performance lists.</Feature>
          <Feature icon={<BookOpen size={24} />} title="Reader">Open scores in a clean performance view with page controls designed for tablet use.</Feature>
          <Feature icon={<Bookmark size={24} />} title="Bookmarks">Mark important pages and return to them quickly during practice or performance.</Feature>
          <Feature icon={<Search size={24} />} title="Search">Find repertoire quickly as your digital library grows.</Feature>
          <Feature icon={<SlidersHorizontal size={24} />} title="Filters">Narrow your library by category and keep large collections manageable.</Feature>
        </div>
      </section>

      <section id="screenshots" className="screenshots">
        <div className="sectionTitle">
          <p className="eyebrow">Actual app screens</p>
          <h2>Minimal interface. Maximum focus on the score.</h2>
        </div>
        <div className="shotGrid">
          <Shot image={home} title="Start from your recent music" description="Open your library, manage sets, or add new scores from a simple home screen." />
          <Shot image={library} title="Browse and search your library" description="Keep a growing collection usable with search, filters, metadata, and clean score rows." />
          <Shot image={reader} title="Perform from a full-page reader" description="Read the score clearly, turn pages quickly, jump around, annotate, and access bookmarks." />
          <Shot image={metadata} title="Capture meaningful information about your scores" description="Store composer, arranger, genre, key signature, time signature, and document type." />
        </div>
      </section>

      <section className="deviceSection">
        <div className="deviceCopy">
          <p className="eyebrow">Tablet-first by design</p>
          <h2>Built for rehearsals, services, lessons, and performance.</h2>
          <p>
            AriaScore is designed for musicians who need their music ready at the stand:
            fast to open, easy to organize, and calm to use when it matters.
          </p>
        </div>
        <div className="deviceRow">
          <img src={library} alt="Library screen" />
          <img src={reader} alt="Reader screen" />
          <img src={metadata} alt="Metadata screen" />
        </div>
      </section>

      <section className="closing">
        <img src={logo} alt="" />
        <h2>AriaScore is currently in development.</h2>
        <p>For early testing interest, feature suggestions, or questions, contact the developer.</p>
        <a className="primary" href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </section>

      <footer>
        <span>© {new Date().getFullYear()} AriaScore</span>
        <span>Developed by Joshua Layne</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
