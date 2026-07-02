import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const experiences = [
  {
    period: "2025 — 2026",
    role: "Instructor, Cybersecurity Essential Training Workshop",
    place: "University of Oklahoma, Gallogly College of Engineering",
    details:
      "Led hands-on sessions on quantum cybersecurity, post-quantum cryptography, quantum key distribution, and quantum attack models for professional audiences."
  },
  {
    period: "2024 — present",
    role: "Teaching Assistant",
    place: "University of Oklahoma",
    details:
      "Supported lab instruction across PLC, CLICK programming software, LabVIEW, and automated measurement systems while mentoring students one-on-one."
  },
  {
    period: "2024",
    role: "Research Assistant",
    place: "University of Oklahoma",
    details:
      "Designed Python and Qiskit simulations for quantum computing and AI research, supporting publications, technical reports, and group presentations."
  }
];

const publications = [
  {
    title:
      "Strategic Data Re-Uploads: A Pathway to Improved Quantum Classification — Data Re-Uploading Strategies for Improved Quantum Classifier Performance",
    venue: "Entropy",
    year: "2026"
  },
  {
    title:
      "Development of Hybrid Quantum Classifiers for Realistic Classification Tasks",
    venue: "Journal of Physics Communications",
    year: "2026"
  },
  {
    title:
      "Learning with a Single Qubit: Classical Training of Quantum-Inspired Classifiers for Structured Tasks",
    venue: "Proc. SPIE",
    year: "2026"
  },
  {
    title:
      "Exploring Quantum Advantage in Classification: Single-Qubit vs. Entangled Systems",
    venue: "Proc. SPIE",
    year: "2025"
  },
  {
    title:
      "Quantum Machine Learning Performance Analysis: Accuracy and Efficiency Trade-offs in Linear Classification",
    venue: "Frontiers in Optics",
    year: "2024"
  }
];

const indexTerms = [
  "quantum computing",
  "Qiskit",
  "Python",
  "hybrid quantum classifiers",
  "post-quantum cryptography",
  "scientific writing",
  "literature reviews",
  "teaching",
  "research analysis"
];

const tickerTopics = [
  "Data re-uploading",
  "Single-qubit classifiers",
  "Quantum advantage",
  "Post-quantum cryptography",
  "Quantum key distribution",
  "Hybrid quantum learning",
  "Qiskit simulation",
  "Quantum cybersecurity"
];

function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio})`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="progress-track" aria-hidden="true">
      <div ref={barRef} className="progress-bar" />
    </div>
  );
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof React.JSX.IntrinsicElements;
};

function Reveal({ children, className = "", delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-shown" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

function SectionHead({ no, name }: { no: string; name: string }) {
  return (
    <Reveal className="sec-head" as="header">
      <span className="sec-no">§ {no}</span>
      <span className="sec-rule" aria-hidden="true" />
      <span className="sec-name">{name}</span>
    </Reveal>
  );
}

function Ticker() {
  const strip = tickerTopics.map((topic, i) => (
    <span className="ticker-item" key={i}>
      {topic}
      <span className="ticker-dot" aria-hidden="true">
        ·
      </span>
    </span>
  ));
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {strip}
        {strip}
        {strip}
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <ScrollProgress />
      <div className="backdrop" aria-hidden="true" />

      <header className="masthead">
        <span className="masthead-item">Sara Aminpour</span>
        <span className="masthead-item masthead-center">
          Quantum Computing · Artificial Intelligence · Cybersecurity
        </span>
        <span className="masthead-item masthead-right">
          Vol. 01 — Norman, Oklahoma
        </span>
      </header>

      <main>
        <section className="hero" aria-label="Introduction">
          <div className="hero-copy">
            <p className="hero-eyebrow rise" style={{ animationDelay: "80ms" }}>
              A research portfolio
            </p>
            <h1 className="hero-name">
              <span className="line">
                <span className="rise" style={{ animationDelay: "160ms" }}>
                  Sara
                </span>
              </span>
              <span className="line">
                <span
                  className="rise hero-name-italic"
                  style={{ animationDelay: "280ms" }}
                >
                  Aminpour
                </span>
              </span>
            </h1>
            <p className="hero-lede rise" style={{ animationDelay: "420ms" }}>
              Ph.D. candidate in Electrical and Computer Engineering at the
              University of Oklahoma, working where quantum computing,
              artificial intelligence, and cybersecurity meet.
            </p>
            <div
              className="hero-actions rise"
              style={{ animationDelay: "540ms" }}
              aria-label="Primary links"
            >
              <a className="btn btn-solid" href="mailto:sara.aminpour@ou.edu">
                Write to me
              </a>
              <a
                className="btn"
                href="/Sara_Aminpour_Resume_2026.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Curriculum vitae
              </a>
              <a
                className="btn"
                href="https://www.linkedin.com/in/sara-aminpour/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>

          <figure className="hero-figure rise" style={{ animationDelay: "300ms" }}>
            <div className="plate">
              <img
                src="/saraaminpour.JPG"
                alt="Portrait of Sara Aminpour"
                className="plate-image"
              />
            </div>
            <figcaption className="plate-caption">
              Fig. 01 — The author. Norman, Oklahoma, 2026.
            </figcaption>
          </figure>
        </section>

        <Ticker />

        <div className="sheet">
          <section id="abstract" className="sec">
            <SectionHead no="01" name="Abstract" />
            <Reveal as="h2" className="sec-title" delay={60}>
              Hybrid quantum learning for realistic classification tasks.
            </Reveal>
            <Reveal as="p" className="sec-body" delay={120}>
              Sara develops and evaluates quantum-enhanced algorithms, with
              work spanning data re-uploading, single-qubit classifiers,
              quantum advantage studies, and practical simulation workflows.
              Her research asks a plain question of an extravagant technology:
              when does a qubit actually earn its keep?
            </Reveal>
            <Reveal as="p" className="index-terms" delay={180}>
              <em>Index terms</em> — {indexTerms.join("; ")}.
            </Reveal>
          </section>

          <section id="appointments" className="sec">
            <SectionHead no="02" name="Appointments" />
            <div className="appointments">
              {experiences.map((item, i) => (
                <Reveal as="article" className="appt" key={item.role} delay={i * 90}>
                  <div className="appt-period">{item.period}</div>
                  <div className="appt-main">
                    <h3>{item.role}</h3>
                    <p className="appt-place">{item.place}</p>
                    <p className="appt-details">{item.details}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="publications" className="sec">
            <SectionHead no="03" name="Selected publications" />
            <ol className="refs">
              {publications.map((pub, i) => (
                <Reveal as="li" className="ref" key={pub.title} delay={i * 70}>
                  <span className="ref-no">[{i + 1}]</span>
                  <span className="ref-body">
                    S. Aminpour et al., “{pub.title}.”{" "}
                    <em className="ref-venue">{pub.venue}</em>,{" "}
                    <span className="ref-year">{pub.year}</span>.
                  </span>
                </Reveal>
              ))}
            </ol>
          </section>
        </div>

        <section id="correspondence" className="outro">
          <div className="outro-copy">
            <SectionHead no="04" name="Correspondence" />
            <Reveal as="h2" className="outro-title" delay={80}>
              Open to research conversations, collaborations, and speaking
              opportunities.
            </Reveal>
            <Reveal delay={160}>
              <a className="outro-mail" href="mailto:sara.aminpour@ou.edu">
                sara.aminpour@ou.edu
              </a>
            </Reveal>
            <Reveal as="p" className="outro-affil" delay={220}>
              University of Oklahoma — INQUIRE Laboratory
            </Reveal>
          </div>

          <Reveal className="outro-sticker" delay={200}>
            <figure>
              <img
                src="/little-sara-sticker.png"
                alt="Illustrated sticker of Sara as a little girl, waving"
                className="sticker-image"
              />
              <figcaption className="plate-caption">
                Fig. 02 — The author, several experiments earlier.
              </figcaption>
            </figure>
          </Reveal>
        </section>

        <footer className="colophon">
          <span>© 2026 Sara Aminpour</span>
          <span className="colophon-center">
            Typeset in Fraunces, Newsreader &amp; Spline Sans Mono
          </span>
          <span className="colophon-right">Norman, Oklahoma</span>
        </footer>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
