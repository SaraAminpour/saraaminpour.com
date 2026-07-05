import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const experiences = [
  {
    period: "2025 â€” 2026",
    role: "Instructor, Cybersecurity Essential Training Workshop",
    place: "University of Oklahoma, Gallogly College of Engineering",
    details:
      "Led hands-on sessions on quantum cybersecurity, post-quantum cryptography, quantum key distribution, and quantum attack models for professional audiences."
  },
  {
    period: "2024 â€” present",
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
      "Strategic Data Re-Uploads: A Pathway to Improved Quantum Classification â€” Data Re-Uploading Strategies for Improved Quantum Classifier Performance",
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

const quantumBasics = [
  {
    label: "Classical bit",
    title: "One definite answer",
    body:
      "A normal computer stores information as bits. Each bit is either 0 or 1, and a calculation is a long, reliable sequence of logic operations on those bits."
  },
  {
    label: "Qubit",
    title: "A weighted possibility",
    body:
      "A quantum computer stores information in qubits. Before measurement, a qubit is described by amplitudes: weighted possibilities for 0 and 1 that can interfere with each other."
  },
  {
    label: "Measurement",
    title: "A probability becomes data",
    body:
      "When we measure a qubit, we get an ordinary classical result. The art of quantum algorithm design is arranging amplitudes so useful answers become more likely before measurement."
  }
];

const calculationSteps = [
  "Encode the problem into qubits.",
  "Apply quantum gates that rotate, entangle, and interfere amplitudes.",
  "Measure many times to estimate probabilities or expectation values.",
  "Use the measured statistics to choose, classify, optimize, or simulate."
];

const hybridSteps = [
  {
    side: "Classical",
    title: "Data, loss, and optimizer",
    body:
      "A classical computer stores the dataset, prepares features, computes the loss, and updates trainable parameters with an optimizer such as gradient descent."
  },
  {
    side: "Quantum",
    title: "Parameterized circuit",
    body:
      "A quantum processor runs a circuit whose gates depend on those parameters. The circuit prepares a quantum state, entangles qubits, and returns measurements."
  },
  {
    side: "Loop",
    title: "Back and forth training",
    body:
      "The classical side proposes parameters, the quantum side evaluates the circuit, and the classical side updates the parameters. That repeated loop is why the method is called hybrid."
  }
];

const pureQuantumNotes = [
  "The model state, learning transformation, and inference are represented directly on quantum hardware.",
  "Training may use quantum subroutines such as phase estimation, amplitude amplification, quantum kernels, or quantum linear algebra.",
  "A classical computer can still start the job and read the final measurement, but the central learning dynamics are quantum rather than a classical optimizer steering a small circuit.",
  "This is the long-term vision for large fault-tolerant quantum computers; today, most practical experiments are still hybrid."
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
      <span className="sec-no">Â§ {no}</span>
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
        Â·
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

function SiteMasthead({ isQuantum = false }: { isQuantum?: boolean }) {
  return (
    <header className="masthead">
      <a className="masthead-item masthead-link" href="/">
        Sara Aminpour
      </a>
      <a
        className="masthead-item masthead-center masthead-link"
        href={isQuantum ? "/" : "/quantum/"}
      >
        {isQuantum ? "Portfolio" : "Quantum primer / Hybrid QML / Pure QML"}
      </a>
      <span className="masthead-item masthead-right">
        Vol. 01 Ã¢â‚¬â€ Norman, Oklahoma
      </span>
    </header>
  );
}

function QuantumDiagram() {
  return (
    <div className="quantum-diagram" aria-label="Simplified quantum calculation diagram">
      <div className="qubit-card">
        <span>|0&gt;</span>
        <span className="qubit-plus">+</span>
        <span>|1&gt;</span>
      </div>
      <div className="circuit-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="gate-stack" aria-hidden="true">
        <span>H</span>
        <span>U(theta)</span>
        <span>M</span>
      </div>
    </div>
  );
}

function QuantumPrimerPage() {
  return (
    <>
      <ScrollProgress />
      <div className="backdrop quantum-backdrop" aria-hidden="true" />
      <SiteMasthead isQuantum />

      <main className="quantum-main">
        <section className="quantum-hero" aria-label="Quantum primer introduction">
          <div className="quantum-hero-copy">
            <p className="hero-eyebrow rise" style={{ animationDelay: "80ms" }}>
              A beginner-friendly branch
            </p>
            <h1 className="quantum-title">
              <span className="line">
                <span className="rise" style={{ animationDelay: "160ms" }}>
                  Quantum
                </span>
              </span>
              <span className="line">
                <span className="rise hero-name-italic" style={{ animationDelay: "280ms" }}>
                  computing
                </span>
              </span>
              <span className="line">
                <span className="rise" style={{ animationDelay: "400ms" }}>
                  from zero
                </span>
              </span>
            </h1>
            <p className="quantum-lede rise" style={{ animationDelay: "520ms" }}>
              This guide is for curious readers with no physics background. It
              explains what quantum computers are, how a quantum calculation is
              built, why hybrid quantum machine learning mixes two kinds of
              hardware, and what fully quantum learning would mean.
            </p>
            <div className="hero-actions rise" style={{ animationDelay: "620ms" }}>
              <a className="btn btn-solid" href="#what-is-quantum">
                Start reading
              </a>
              <a className="btn" href="/">
                Back to portfolio
              </a>
            </div>
          </div>
          <QuantumDiagram />
        </section>

        <section className="learning-sheet" id="what-is-quantum">
          <SectionHead no="Q1" name="What quantum computing is" />
          <Reveal as="h2" className="sec-title" delay={60}>
            A quantum computer is not just a faster laptop.
          </Reveal>
          <Reveal as="p" className="sec-body" delay={120}>
            It is a machine that uses quantum states as part of the calculation.
            Instead of only storing definite 0s and 1s, it can prepare qubits
            with amplitudes, combine qubits through entanglement, and use
            interference to make some outcomes stronger and others weaker.
          </Reveal>
          <div className="concept-grid">
            {quantumBasics.map((item, i) => (
              <Reveal as="article" className="concept-card" key={item.label} delay={i * 80}>
                <span className="concept-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>

          <div className="calculation-panel">
            <Reveal className="calculation-copy">
              <h3>How a quantum calculation happens</h3>
              <p>
                Quantum programs are usually drawn as circuits. Time moves from
                left to right. Each wire is a qubit. Each box is a gate that
                changes the quantum state. At the end, measurements turn the
                quantum state into ordinary bits we can read.
              </p>
            </Reveal>
            <ol className="calculation-steps">
              {calculationSteps.map((step, i) => (
                <Reveal as="li" key={step} delay={i * 70}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="learning-sheet" id="hybrid-qml">
          <SectionHead no="Q2" name="Hybrid quantum machine learning" />
          <Reveal as="h2" className="sec-title" delay={60}>
            Hybrid means the learning loop is shared.
          </Reveal>
          <Reveal as="p" className="sec-body" delay={120}>
            In hybrid quantum machine learning, a classical computer and a
            quantum processor cooperate. The quantum circuit is part of the
            model, but the training loop still depends on classical storage,
            classical loss calculations, and classical parameter updates.
          </Reveal>
          <div className="hybrid-loop">
            {hybridSteps.map((item, i) => (
              <Reveal as="article" className="hybrid-card" key={item.title} delay={i * 90}>
                <span className="concept-label">{item.side}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="learning-sheet" id="pure-qml">
          <SectionHead no="Q3" name="Pure quantum machine learning" />
          <Reveal as="h2" className="sec-title" delay={60}>
            Fully quantum learning moves the main work onto quantum hardware.
          </Reveal>
          <Reveal as="p" className="sec-body" delay={120}>
            Pure quantum machine learning is the idea that the data
            representation, learning transformation, and inference procedure are
            carried out as quantum operations. A classical machine may still
            launch the experiment and read the result, but it is no longer
            steering every training step as the central optimizer.
          </Reveal>
          <div className="pure-list">
            {pureQuantumNotes.map((note, i) => (
              <Reveal as="article" className="pure-note" key={note} delay={i * 80}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{note}</p>
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function HomePage() {
  return (
    <>
      <ScrollProgress />
      <div className="backdrop" aria-hidden="true" />

      <SiteMasthead />

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
                LinkedIn â†—
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
              Fig. 01 â€” The author. Norman, Oklahoma, 2026.
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
              <em>Index terms</em> â€” {indexTerms.join("; ")}.
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
                    S. Aminpour et al., â€œ{pub.title}.â€{" "}
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
              University of Oklahoma â€” INQUIRE Laboratory
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
                Fig. 02 â€” The author, several experiments earlier.
              </figcaption>
            </figure>
          </Reveal>
        </section>

        <footer className="colophon">
          <span>Â© 2026 Sara Aminpour</span>
          <span className="colophon-center">
            Typeset in Fraunces, Newsreader &amp; Spline Sans Mono
          </span>
          <span className="colophon-right">Norman, Oklahoma</span>
        </footer>
      </main>
    </>
  );
}

function App() {
  const isQuantumPage = window.location.pathname.startsWith("/quantum");
  return isQuantumPage ? <QuantumPrimerPage /> : <HomePage />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
