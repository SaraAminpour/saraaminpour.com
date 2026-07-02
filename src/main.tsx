import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BookOpen,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Microscope,
  Sparkles
} from "lucide-react";
import "./styles.css";

const experiences = [
  {
    role: "Instructor, Cybersecurity Essential Training Workshop",
    place: "University of Oklahoma, Gallogly College of Engineering",
    period: "Summers 2025 & 2026",
    details:
      "Led hands-on sessions on quantum cybersecurity, post-quantum cryptography, quantum key distribution, and quantum attack models for professional audiences."
  },
  {
    role: "Teaching Assistant",
    place: "University of Oklahoma",
    period: "August 2024 - Present",
    details:
      "Supported lab instruction across PLC, CLICK programming software, LabVIEW, and automated measurement systems while mentoring students one-on-one."
  },
  {
    role: "Research Assistant",
    place: "University of Oklahoma",
    period: "January 2024 - August 2024",
    details:
      "Designed Python and Qiskit simulations for quantum computing and AI research, supporting publications, technical reports, and group presentations."
  }
];

const publications = [
  "Strategic Data Re-Uploads: A Pathway to Improved Quantum Classification - Data Re-Uploading Strategies for Improved Quantum Classifier Performance. Entropy, 2026.",
  "Development of Hybrid Quantum Classifiers for Realistic Classification Tasks. Journal of Physics Communications, 2026.",
  "Learning with a Single Qubit: Classical Training of Quantum-Inspired Classifiers for Structured Tasks. Proc. SPIE, 2026.",
  "Exploring Quantum Advantage in Classification: Single-Qubit vs. Entangled Systems. Proc. SPIE, 2025.",
  "Quantum Machine Learning Performance Analysis: Accuracy and Efficiency Trade-offs in Linear Classification. Frontiers in Optics, 2024."
];

const skills = [
  "Quantum computing",
  "Qiskit",
  "Python",
  "Hybrid quantum classifiers",
  "Scientific writing",
  "Literature reviews",
  "Teaching assistance",
  "Research analysis"
];

function App() {
  return (
    <main className="page-shell">
      <aside className="portrait-rail" aria-label="Portrait">
        <div className="portrait-stage">
          <img
            className="portrait-image"
            src="/saraaminpour.JPG"
            alt="Sara Aminpour portrait"
            width="2784"
            height="4176"
          />
        </div>
      </aside>

      <section className="content-flow">
        <header className="hero">
          <div className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Quantum computing and AI researcher
          </div>
          <h1>Sara Aminpour</h1>
          <p className="lede">
            Ph.D. candidate in Electrical and Computer Engineering at the
            University of Oklahoma, working at the intersection of quantum
            computing, artificial intelligence, and cybersecurity.
          </p>
          <div className="hero-actions" aria-label="Primary links">
            <a className="button primary" href="mailto:sara.aminpour@ou.edu">
              <Mail size={18} aria-hidden="true" />
              Contact
            </a>
            <a
              className="button ghost"
              href="/Sara_Aminpour_Resume_2026.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} aria-hidden="true" />
              CV
            </a>
            <a
              className="button icon-only"
              href="https://www.linkedin.com/in/sara-aminpour/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn profile"
            >
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <dl className="quick-facts">
            <div>
              <dt>
                <MapPin size={15} aria-hidden="true" />
                Based in
              </dt>
              <dd>Norman, Oklahoma</dd>
            </div>
            <div>
              <dt>
                <GraduationCap size={15} aria-hidden="true" />
                Program
              </dt>
              <dd>Ph.D. in Electrical and Computer Engineering</dd>
            </div>
          </dl>
        </header>

        <section className="section-band" id="research">
          <div className="section-kicker">
            <Microscope size={18} aria-hidden="true" />
            Research
          </div>
          <h2>Hybrid quantum learning for realistic classification tasks.</h2>
          <p>
            Sara develops and evaluates quantum-enhanced algorithms, with work
            spanning data re-uploading, single-qubit classifiers, quantum
            advantage studies, and practical simulation workflows.
          </p>
          <div className="skill-cloud">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>

        <section className="section-band" id="experience">
          <div className="section-kicker">
            <BookOpen size={18} aria-hidden="true" />
            Experience
          </div>
          <div className="timeline">
            {experiences.map((item) => (
              <article className="timeline-item" key={item.role}>
                <div>
                  <h3>{item.role}</h3>
                  <p>{item.place}</p>
                </div>
                <time>{item.period}</time>
                <p>{item.details}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-band" id="publications">
          <div className="section-kicker">
            <BookOpen size={18} aria-hidden="true" />
            Selected Publications
          </div>
          <ol className="publication-list">
            {publications.map((publication) => (
              <li key={publication}>{publication}</li>
            ))}
          </ol>
        </section>

        <section className="closing-panel" id="contact">
          <p>University of Oklahoma / INQUIRE Laboratory</p>
          <h2>Open to research conversations, collaborations, and speaking opportunities.</h2>
          <a className="text-link" href="mailto:sara.aminpour@ou.edu">
            sara.aminpour@ou.edu
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
