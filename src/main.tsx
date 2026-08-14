import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const experiences = [
  {
    period: "2025 - 2026",
    role: "Instructor, Cybersecurity Essential Training Workshop",
    place: "University of Oklahoma, Gallogly College of Engineering",
    details:
      "Led hands-on sessions on quantum cybersecurity, post-quantum cryptography, quantum key distribution, and quantum attack models for professional audiences."
  },
  {
    period: "2024 - present",
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
      "Strategic Data Re-Uploads: A Pathway to Improved Quantum Classification - Data Re-Uploading Strategies for Improved Quantum Classifier Performance",
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

const newsItems = [
  {
    term: "Fall",
    year: "2026",
    title: "GSS Research Award",
    source: "Graduate Student Senate, University of Oklahoma",
    kind: "Research award"
  },
  {
    term: "Spring",
    year: "2026",
    title: "ECE Travel Award",
    source: "Electrical and Computer Engineering, University of Oklahoma",
    kind: "Travel award"
  },
  {
    term: "Fall",
    year: "2025",
    title: "GCoE Travel Award",
    source: "Gallogly College of Engineering, University of Oklahoma",
    kind: "Travel award"
  },
  {
    term: "Fall",
    year: "2025",
    title: "GSS Research Award",
    source: "Graduate Student Senate, University of Oklahoma",
    kind: "Research award"
  }
];

type GalleryItem = {
  src: string;
  caption: string;
  detail?: string;
};

// To add photographs: drop image files into public/gallery/ and list them
// here. caption is the short plate title; detail is an optional longer note.
const galleryItems: GalleryItem[] = [
  {
    src: "/gallery/spie-west-jan-2026.jpg",
    caption: "SPIE West - Jan 2026",
    detail:
      "Presenter badge on, at the SPIE Photonics West wall in San Francisco, where Sara presented her conference paper Learning with a Single Qubit: Classical Training of Quantum-Inspired Classifiers for Structured Tasks."
  },
  {
    src: "/gallery/spie-west-presenting-jan-2026.jpg",
    caption: "SPIE West - Jan 2026",
    detail:
      "On stage at SPIE Photonics West, presenting Learning with a Single Qubit: Classical Training of Quantum-Inspired Classifiers for Structured Tasks."
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

type Tale = {
  id: string;
  physics: string;
  storyTitle: string;
  image: string;
  alt: string;
  story: string[];
  plainly: string;
  research: string;
};

const quantumTales: Tale[] = [
  {
    id: "superposition",
    physics: "Superposition",
    storyTitle: "The coin that hasn't landed",
    image: "/tales/superposition.png",
    alt: "Watercolor illustration of a coin spinning above an open palm, blurred between heads and tails",
    story: [
      "Flip a coin and clap it onto the back of your hand. Before you peek, you would say it is heads or tails - one of them, you just don't know which. A qubit is stranger than that. While the coin is still spinning in the air, it isn't secretly heads and it isn't secretly tails; it genuinely carries both possibilities at once, each with its own weight. Quantum physics keeps a careful ledger of those weights, and calls them amplitudes.",
      "The surprise is that the weights can push and pull on each other - cancel out or pile up - like ripples meeting on a pond. That pushing and pulling is called interference, and it is the engine inside every quantum computer: you choreograph the possibilities so that wrong answers cancel themselves out and right answers grow louder."
    ],
    plainly:
      "Before you look, a quantum system holds many weighted possibilities at once - and those weights can be choreographed.",
    research:
      "Every qubit in Sara's Qiskit simulations starts life in superposition; a quantum classifier works by steering those weights until the correct label becomes the loudest possibility."
  },
  {
    id: "schrodingers-cat",
    physics: "Schrodinger's cat",
    storyTitle: "The cat who was both",
    image: "/tales/schrodingers-cat.png",
    alt: "Watercolor illustration of a cat in a box, half awake and half a translucent sleeping ghost",
    story: [
      "In 1935, Erwin Schrodinger told a deliberately absurd story. Seal a cat in a box with a tiny quantum trigger: if a single atom decays, a vial breaks and the cat dies; if it does not, the cat naps on. Quantum rules allow the atom to be in a superposition - decayed and not decayed - so, taken literally, the sealed box holds a cat that is asleep and not asleep at the same time. Schrodinger wasn't proposing an experiment; he was teasing his own field: surely this is ridiculous?",
      "The modern answer is that big, warm things like cats cannot stay in superposition. They constantly leak information into the world - light, heat, jostled air - and every leak acts like a little peek that forces a definite outcome. Physicists call this decoherence. The story survives because it points at the exact question the field still lives on: how do you keep a fragile quantum state un-peeked-at long enough to compute with it?"
    ],
    plainly:
      "The cat dramatizes how measurement and noise force quantum possibilities to settle into one plain fact.",
    research:
      "Decoherence is why real quantum hardware is noisy - and why Sara studies which learning tasks a small, imperfect quantum circuit can still do well."
  },
  {
    id: "entanglement",
    physics: "Entanglement",
    storyTitle: "Two parcels, one thread",
    image: "/tales/entanglement.png",
    alt: "Watercolor illustration of two parcels with mittens, joined by a single long red thread",
    story: [
      "Knit a pair of mittens, seal them into two parcels without looking, and mail one to a friend across the ocean. The moment she opens hers and finds the left mitten, she instantly knows yours is the right one. No magic - the answer was settled at the post office.",
      "Entangled qubits play a deeper version of this game. It is not that the answers were secretly settled in advance: measurements on the pair come out correlated more strongly than any settled-at-the-post-office story can explain. Einstein grumbled about 'spooky action at a distance,' and careful experiments have confirmed it again and again. Entanglement will not let you send messages faster than light - but it is a genuine resource, the connective tissue that lets many qubits behave as one computer instead of a bag of loose coins."
    ],
    plainly:
      "Entangled particles share one joint state, with correlations stronger than any pre-arranged plan could produce.",
    research:
      "One of Sara's publications asks exactly when entangled circuits beat single, unentangled qubits at classification - that is, when the spooky thread earns its keep."
  },
  {
    id: "uncertainty",
    physics: "Heisenberg's uncertainty principle",
    storyTitle: "The firefly in the jar",
    image: "/tales/uncertainty.png",
    alt: "Watercolor illustration of a firefly in a jar under a magnifying glass, its light trail blurred",
    story: [
      "Try to photograph a firefly at night. To see where it is, you need light - but light gives it a nudge, and the more sharply you pin down where it is, the more you have blurred where it was going. Heisenberg's uncertainty principle says something even stronger than 'measuring disturbs things': a quantum object simply does not possess a perfectly sharp position and a perfectly sharp momentum at the same time. The two blurs are locked in a trade - squeeze one and the other spreads.",
      "This is not a complaint about our cameras; it is written into nature's grammar. And it is not always the villain. Uncertainty is part of why atoms don't collapse in on themselves, and it is the raw, honest randomness that quantum cryptography refines into keys no computer can guess."
    ],
    plainly:
      "Nature enforces a trade-off: the more sharply one property is defined, the fuzzier its partner becomes.",
    research:
      "Quantum key distribution - which Sara teaches in her cybersecurity workshops - turns this built-in fuzziness into an alarm bell: an eavesdropper cannot look without leaving smudges."
  },
  {
    id: "measurement",
    physics: "Measurement",
    storyTitle: "The question that changes the answer",
    image: "/tales/measurement.png",
    alt: "Watercolor illustration of an instant camera photographing a soap bubble, the photo showing a single droplet",
    story: [
      "A soap bubble drifting across the room is round, shimmering, a little wobbly - many things at once. Photograph it and you get one frozen frame; touch it and you get one droplet. Asking a quantum system a question works the same way: before measurement it holds its whole spread of weighted possibilities, and the act of asking collapses that spread into a single plain answer, chosen at random according to the weights. Ask again and you are questioning a different, already-collapsed thing.",
      "That is why quantum programs are run not once but thousands of times. Each run hands back one droplet; the pattern of droplets, collected patiently, sketches the shape of the original bubble."
    ],
    plainly:
      "Measurement converts weighted possibilities into one classical fact - so quantum answers arrive as statistics, not certainties.",
    research:
      "Sara's classifiers never see 'the quantum state' directly - they see measurement statistics, and the craft lies in making those statistics carry the answer."
  },
  {
    id: "no-cloning",
    physics: "The no-cloning theorem",
    storyTitle: "The photocopier that refuses",
    image: "/tales/no-cloning.png",
    alt: "Watercolor illustration of an apologetic photocopier with a glowing marble on its glass and a blank page in its tray",
    story: [
      "Classical information is endlessly copyable - that is what makes backups, forwarding, and the whole internet possible. So it comes as a shock that quantum information refuses. The no-cloning theorem, proved in 1982, says that no machine can take an unknown quantum state and produce a perfect independent copy of it. This is not an engineering shortfall waiting for a cleverer photocopier; the mathematics of quantum mechanics simply has no room for one. To copy the marble, the machine would have to look at it first - and looking, as we know by now, changes it.",
      "This stubbornness turns out to be a gift. Because quantum states cannot be secretly duplicated, a quantum key cannot be skimmed by a wiretapper without leaving evidence. The theorem shapes quantum computing too: there are no mid-computation backup copies, which is why quantum error correction is such delicate, brilliant work."
    ],
    plainly:
      "An unknown quantum state cannot be perfectly copied - a law of nature, not a limitation of engineering.",
    research:
      "No-cloning is the bedrock of the quantum key distribution and post-quantum cryptography material Sara teaches: security guaranteed by physics rather than by hard math alone."
  }
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
      <span className="sec-no">No. {no}</span>
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
        /
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
        Vol. 01 / Norman, Oklahoma
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

function TalesReader({
  taleIndex,
  onClose,
  onSelect
}: {
  taleIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const tale = quantumTales[taleIndex];
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = quantumTales.length;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onSelect((taleIndex + 1) % count);
      if (event.key === "ArrowLeft") onSelect((taleIndex + count - 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taleIndex, count, onClose, onSelect]);

  return (
    <div
      className="tales-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Quantum tales: plain-language quantum physics"
    >
      <div className="tales-scrim" onClick={onClose} aria-hidden="true" />
      <div className="tales-book">
        <header className="tales-masthead">
          <span className="tales-masthead-title">
            A Small Book of Quantum Ideas
          </span>
          <span className="tales-masthead-no">
            Tale {String(taleIndex + 1).padStart(2, "0")} /{" "}
            {String(count).padStart(2, "0")}
          </span>
          <button
            ref={closeRef}
            className="tales-close"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="tales-body">
          <nav className="tales-toc" aria-label="Contents of the quantum tales">
            <span className="tales-toc-label">Contents</span>
            {quantumTales.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`tales-toc-item ${i === taleIndex ? "is-active" : ""}`.trim()}
                aria-current={i === taleIndex ? "true" : undefined}
                onClick={() => onSelect(i)}
              >
                <span className="tales-toc-no">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.physics}</span>
              </button>
            ))}
          </nav>
          <article className="tale" key={tale.id}>
            <figure className="tale-plate">
              <div className="tale-plate-frame">
                <img src={tale.image} alt={tale.alt} />
              </div>
              <figcaption>
                Plate {String(taleIndex + 1).padStart(2, "0")} - {tale.physics}
              </figcaption>
            </figure>
            <div className="tale-text">
              <p className="tale-eyebrow">{tale.physics}</p>
              <h2 className="tale-title">{tale.storyTitle}</h2>
              {tale.story.map((paragraph, i) => (
                <p
                  className={i === 0 ? "tale-para tale-para-first" : "tale-para"}
                  key={i}
                >
                  {paragraph}
                </p>
              ))}
              <p className="tale-plainly">
                <em>The idea, plainly</em> - {tale.plainly}
              </p>
              <p className="tale-research">
                <em>In this portfolio</em> - {tale.research}
              </p>
              <div className="tale-nav">
                <button
                  type="button"
                  className="btn btn-ink"
                  onClick={() => onSelect((taleIndex + count - 1) % count)}
                >
                  Previous tale
                </button>
                <button
                  type="button"
                  className="btn btn-ink"
                  onClick={() => onSelect((taleIndex + 1) % count)}
                >
                  Next tale
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const [newsOpen, setNewsOpen] = useState(false);
  const [talesOpen, setTalesOpen] = useState(false);
  const [taleIndex, setTaleIndex] = useState(0);

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
              aria-label="Primary links and news"
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
                LinkedIn
              </a>
              <a
                className="btn"
                href="https://scholar.google.com/citations?user=75NNTvUAAAAJ&hl=en"
                target="_blank"
                rel="noreferrer"
              >
                Scholar
              </a>
              <a
                className="btn"
                href="#gallery"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("gallery")?.scrollIntoView();
                }}
              >
                Gallery
              </a>
              <button
                className="btn tales-toggle"
                type="button"
                onClick={() => setTalesOpen(true)}
              >
                Quantum tales
                <span className="tales-toggle-mark" aria-hidden="true">
                  *
                </span>
              </button>
              <button
                className="btn news-toggle"
                type="button"
                aria-expanded={newsOpen}
                aria-controls="hero-news"
                onClick={() => setNewsOpen((open) => !open)}
              >
                News
                <span className="news-toggle-mark" aria-hidden="true">
                  {newsOpen ? "-" : "+"}
                </span>
              </button>
            </div>
            <div
              id="hero-news"
              className="hero-news-panel"
              role="region"
              aria-label="News and awards"
              hidden={!newsOpen}
            >
              {newsItems.map((item) => (
                <article
                  className="hero-news-card"
                  key={`${item.title}-${item.term}-${item.year}`}
                >
                  <div className="hero-news-meta">
                    <span>{item.kind}</span>
                    <time dateTime={item.year}>{item.term} {item.year}</time>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.source}</p>
                </article>
              ))}
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
              Fig. 01 - The author. Norman, Oklahoma, 2026.
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
              <em>Index terms</em> - {indexTerms.join("; ")}.
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
                    S. Aminpour et al., "{pub.title}."{" "}
                    <em className="ref-venue">{pub.venue}</em>,{" "}
                    <span className="ref-year">{pub.year}</span>.
                  </span>
                </Reveal>
              ))}
            </ol>
          </section>

          <section id="gallery" className="sec">
            <SectionHead no="04" name="Gallery" />
            {galleryItems.length === 0 ? (
              <Reveal as="p" className="gallery-empty" delay={80}>
                Plates forthcoming - photographs are being selected for this
                wall.
              </Reveal>
            ) : (
              <div className="gallery-grid">
                {galleryItems.map((item, i) => (
                  <Reveal
                    as="figure"
                    className="gallery-plate"
                    key={item.src}
                    delay={i * 70}
                  >
                    <div className="gallery-plate-frame">
                      <img src={item.src} alt={item.caption} loading="lazy" />
                    </div>
                    <figcaption>
                      <span className="gallery-caption-head">
                        Plate {String(i + 1).padStart(2, "0")} - {item.caption}
                      </span>
                      {item.detail && (
                        <span className="gallery-caption-detail">
                          {item.detail}
                        </span>
                      )}
                    </figcaption>
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </div>

        <section id="correspondence" className="outro">
          <div className="outro-copy">
            <SectionHead no="05" name="Correspondence" />
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
              University of Oklahoma - INQUIRE Laboratory
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
                Fig. 02 - The author, several experiments earlier.
              </figcaption>
            </figure>
          </Reveal>
        </section>

        <footer className="colophon">
          <span>(c) 2026 Sara Aminpour</span>
          <span className="colophon-center">
            Typeset in Fraunces, Newsreader &amp; Spline Sans Mono
          </span>
          <span className="colophon-right">Norman, Oklahoma</span>
        </footer>
      </main>

      {talesOpen && (
        <TalesReader
          taleIndex={taleIndex}
          onClose={() => setTalesOpen(false)}
          onSelect={setTaleIndex}
        />
      )}
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
