import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Check, FileText, Layers3, Network, Search } from "lucide-react";
import styles from "./LandingPage.module.css";

const capabilities = [
  { icon: Search, title: "Plan with historical context.", text: "Find comparable packages and documented procurement approaches. Investigate what made similar work succeed, stall, or need clarification." },
  { icon: BookOpen, title: "Check the evidence behind a decision.", text: "Move from an answer to its source passage. Keep documented requirements, your interpretation, and missing evidence visible in notes and tags." },
  { icon: Check, title: "Carry findings into the work.", text: "Track specification checks, audit questions, and planning follow-ups. Keep multiple procurements together in the workspace for your review." },
];

export default function LandingPage() {
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" aria-label="Research Workspace home" className={styles.brand}>
        <Image src="/brand/world-bank-institute.svg" alt="World Bank Group — Institute for Economic Development" width={220} height={48} priority />
      </Link>
      <nav aria-label="Main navigation" className={styles.navigation}>
        <a href="#problem">The problem</a><a href="#approach">How it works</a>
      </nav>
      <Link href="/workspace" className={styles.navCta}>Open workspace <ArrowRight aria-hidden="true" size={16} /></Link>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
        <p className={styles.intro}><span className={styles.statusDot} aria-hidden="true" /> A research workspace for procurement intelligence.</p>
        <h1 id="hero-title">Better procurement.<br />Grounded in <span>evidence.</span></h1>
        <p className={styles.heroText}>The award tells you what happened. The documents explain how and why. Bring the evidence together to research procurement decisions, capture findings, and plan what comes next.</p>
        <div className={styles.heroActions}>
          <Link href="/workspace" className={styles.primary}>Explore the workspace <ArrowRight size={18} aria-hidden="true" /></Link>
          <a href="#evidence" className={styles.secondary}>See how it comes together <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        <p className={styles.heroNote}><BookOpen size={14} aria-hidden="true" /> From institutional knowledge to informed procurement decisions.</p>
        </div>
        <div className={styles.heroVisual} aria-label="Illustrative procurement research workflow linking a comparable package, source evidence, and a planning follow-up">
          <div className={styles.visualTop}><span><Network size={15} aria-hidden="true" /> PROCUREMENT PLANNING</span><span>Workspace preview</span></div>
          <div className={styles.visualQuestion}><span>START WITH A QUESTION</span><p>A substation in hilly terrain.<br />What can past projects tell us?</p></div>
          <div className={styles.trailLine} aria-hidden="true"></div>
          <article className={styles.visualRecord}><div className={styles.visualIcon}><Layers3 size={20} aria-hidden="true" /></div><div><span>COMPARABLE PROCUREMENT · NAGALAND</span><h2>Tuensang substation upgrade</h2><p>NAG-SS-02A <span>132 kV · GIS substation</span></p></div><Check size={17} aria-hidden="true" /></article>
          <article className={styles.visualInsight}><div><BookOpen size={17} aria-hidden="true" /><span>Your notebook</span></div><p>Terrain decisions carry<br />into detailed design.</p><blockquote>Planning note: clarify responsibility for terrace levels and gantry locations before finalizing the scope.</blockquote><div className={styles.previewTags}><span>site readiness</span><span>design scope</span></div><a href="#evidence">Explore the workflow <ArrowRight size={16} aria-hidden="true" /></a></article>
          <div className={styles.visualBottom}><span className={styles.statusDot} aria-hidden="true" /> Next step: verify site conditions with engineering.</div>
        </div>
      </section>

      <div className={styles.contextStrip}><span>CONNECT THE INSTITUTIONAL RECORD</span><span><Layers3 size={16} aria-hidden="true" /> Contract & project records</span><span><FileText size={16} aria-hidden="true" /> Operational documents</span><span><BookOpen size={16} aria-hidden="true" /> Evaluations & lessons</span></div>
      <section id="problem" className={styles.approach} aria-labelledby="problem-title">
        <div className={styles.sectionHeading}><h2 id="problem-title">The records are there.<br />The connections are missing.</h2><p>Public procurement decisions rely on data, operational context, and lessons learned. When they sit in separate registries and document repositories, teams must reconstruct the full story by hand—and risk repeating the same mistakes.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerIndex}>What occurred</span><h3>Data.</h3><p>Award values, suppliers, methods, and milestones capture the transaction, but rarely its rationale.</p><span className={styles.layerSource}>Contract awards · project portfolios</span></article>
          <article><span className={styles.layerIndex}>How it was executed</span><h3>Context.</h3><p>Tender requirements and supervision reports explain implementation, but are scattered across documents.</p><span className={styles.layerSource}>Specifications · procurement plans · ISRs</span></article>
          <article><span className={styles.layerIndex}>Why it succeeded or failed</span><h3>Knowledge.</h3><p>Completion reports and independent evaluations contain lessons that are difficult to bring into the next decision.</p><span className={styles.layerSource}>ICRs · IEG evaluations · lessons learned</span></article>
        </div>
        <p className={styles.problemImpact}>The cost of that fragmentation: unrealistic schedules, specification mismatches, re-tendering, and delayed outcomes. Our solution brings the evidence into a workspace where teams can investigate it and prepare their response.</p>
      </section>
      <section id="evidence" className={styles.evidence} aria-labelledby="evidence-title">
        <div className={styles.workbenchHeader}><span><Network size={17} aria-hidden="true" /> From a question to working knowledge.</span><span>From the demo library</span></div>
        <div className={styles.workbench}>
          <div className={styles.question}>
            <span className={styles.questionLabel}>An example from the supplied procurement library</span>
            <h2 id="evidence-title">What should we investigate before planning a substation in hilly terrain?</h2>
            <p>Start with the evidence. Inspect the source, save a useful observation, and bring an open question into your plan.</p>
            <Link href="/workspace" className={styles.textLink}>Research your own question <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className={styles.evidenceStack}>
            <article className={styles.record}>
              <div className={styles.recordType}><Layers3 size={17} aria-hidden="true" /><span>Comparable procurement</span><span className={styles.sourceNumber}>RECORD</span></div>
              <h3>Tuensang substation upgrade</h3>
              <p>GIS substation package NAG-SS-02A · Nagaland, India</p>
              <div className={styles.recordFoot}>132 kV <span>Substation upgrade</span></div>
            </article>
            <article className={styles.lesson}>
              <div className={styles.recordType}><FileText size={17} aria-hidden="true" /><span>What the source tells us</span><span className={styles.sourceNumber}>CONTEXT</span></div>
              <h3>Terrain decisions carry into design.</h3>
              <p>The package left terrace levels and gantry locations to the contractor during detailed engineering.</p>
              <details className={styles.source}>
                <summary><BookOpen size={14} aria-hidden="true" /> Inspect the supplied evidence</summary>
                <p>“The NAG-SS-02A package required the contractor to determine substation terrace levels and 33 kV gantry locations during detail engineering, indicating terrain adaptation was deferred to design phase under turnkey responsibility.”</p>
                <span>Overview · supplied procurement research library</span>
              </details>
            </article>
            <p className={styles.limit}><Check size={16} aria-hidden="true" /> Add a note. Tag the finding. Keep a next step in your plan.</p>
          </div>
        </div>
        <div className={styles.workbenchFooter}><span>Ask → inspect → annotate → act.</span><span>Illustrative research view</span></div>
      </section>

      <section id="approach" className={styles.approach} aria-labelledby="approach-title">
        <div className={styles.sectionHeading}><h2 id="approach-title">Research the decision.<br />Keep the reasoning.</h2><p>Create a workspace for a procurement strategy, an audit, or a portfolio review. Investigate multiple packages, keep evidence and observations together, and track the checks needed before acting.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerIndex}>Explore the question</span><h3>Research.</h3><p>Ask follow-ups, compare findings, and inspect the sources behind an answer.</p><span className={styles.layerSource}>Questions · answers · evidence</span></article>
          <article><span className={styles.layerIndex}>Make it your own</span><h3>Notebook.</h3><p>Collect notes and tagged passages from answers and sources, alongside your own ideas.</p><span className={styles.layerSource}>Notes · highlights · tags</span></article>
          <article><span className={styles.layerIndex}>Move the work forward</span><h3>Plan.</h3><p>Keep a practical checklist of what to verify, decide, and follow up on next.</p><span className={styles.layerSource}>Tasks · checks · next steps</span></article>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.capabilityIntro}><h2 id="capabilities-title">Past experience.<br />Present decisions.</h2><p>Use institutional knowledge while planning, reviewing tender requirements, and examining procurement performance.</p><Link className={styles.textLink} href="/workspace">Try the research demo <ArrowRight size={17} aria-hidden="true" /></Link></div>
        <div className={styles.capabilityList}>{capabilities.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className={styles.vision} aria-labelledby="vision-title">
        <div><span className={styles.visionLabel}>The proposed platform</span><h2 id="vision-title">Across the procurement<br />lifecycle.</h2></div>
        <div><p>The platform vision connects World Bank awards and project data with procurement documents, implementation reports, completion evaluations, and governance indicators. That foundation would support timeline benchmarking, risk analysis, monitoring, and learning from new project outcomes.</p><p className={styles.visionNote}>Today’s workspace researches a supplied procurement library, shows source passages, and helps organize findings and follow-ups. Notes, tags, research history, and plans save in this browser. Live ingestion, predictive risk and timeline models, and continuous monitoring are proposed capabilities, not active demo features.</p></div>
      </section>
      <section className={styles.closing} aria-labelledby="closing-title"><span className={styles.closingMark} aria-hidden="true"><Network size={32} /></span><h2 id="closing-title">Your next decision<br />can learn from the last.</h2><p>Start with a procurement question. Keep the evidence, the reasoning, and the next step together.</p><Link href="/workspace" className={styles.primary}>Explore the workspace <ArrowRight size={18} aria-hidden="true" /></Link></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>Research Workspace</Link><p>Institutional knowledge for better procurement decisions.</p><a href="#main">Back to top ↑</a></footer>
  </div>;
}
