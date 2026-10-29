import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Check, FileText, Layers3, Network, Search } from "lucide-react";
import styles from "./LandingPage.module.css";

const capabilities = [
  { icon: Search, title: "Find the relevant precedent.", text: "Explore similar packages, compare procurement approaches, and bring the differences into view before making a decision." },
  { icon: BookOpen, title: "Read the reason behind it.", text: "Move from a concise answer to the original source passage. Keep requirements, interpretation, and missing evidence distinct." },
  { icon: Check, title: "Turn insight into preparation.", text: "Build a source-based checklist, explore geographic context, and keep the evidence beside the work." },
];

export default function LandingPage() {
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" aria-label="Procurement GPT home" className={styles.brand}>
        <Image src="/brand/world-bank-institute.svg" alt="World Bank Group — Institute for Economic Development" width={220} height={48} priority />
      </Link>
      <nav aria-label="Main navigation" className={styles.navigation}>
        <a href="#approach">The approach</a><a href="#evidence">Inside the workspace</a>
      </nav>
      <Link href="/workspace" className={styles.navCta}>Open workspace <ArrowRight aria-hidden="true" size={16} /></Link>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <p className={styles.intro}>Procurement GPT <span aria-hidden="true">/</span> Institutional knowledge, connected.</p>
        <h1 id="hero-title">Better procurement.<br />Built on <span>what we know.</span></h1>
        <p className={styles.heroText}>The record tells you what happened. The documents tell you why.<br className={styles.desktopBreak} /> Bring them together to inform what happens next.</p>
        <div className={styles.heroActions}>
          <Link href="/workspace" className={styles.primary}>Explore the workspace <ArrowRight size={18} aria-hidden="true" /></Link>
          <a href="#evidence" className={styles.secondary}>See the evidence in action <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        <p className={styles.heroNote}>A research workspace for public procurement. Answers with sources you can inspect.</p>
      </section>

      <section id="evidence" className={styles.evidence} aria-labelledby="evidence-title">
        <div className={styles.workbenchHeader}><span><Network size={17} aria-hidden="true" /> A question. A connected view.</span><span>From the demo library</span></div>
        <div className={styles.workbench}>
          <div className={styles.question}>
            <span className={styles.questionLabel}>Start with a real procurement question</span>
            <h2 id="evidence-title">What should we consider for a 132 kV substation in hilly terrain?</h2>
            <p>Look beyond the package description. Connect comparable work with the requirements and lessons behind it.</p>
            <Link href="/workspace" className={styles.textLink}>Research your own question <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className={styles.evidenceStack}>
            <article className={styles.record}>
              <div className={styles.recordType}><Layers3 size={17} aria-hidden="true" /><span>Comparable procurement</span><span className={styles.sourceNumber}>01</span></div>
              <h3>Tuensang substation upgrade</h3>
              <p>GIS substation package NAG-SS-02A · Nagaland, India</p>
              <div className={styles.recordFoot}>132 kV <span>Substation upgrade</span></div>
            </article>
            <article className={styles.lesson}>
              <div className={styles.recordType}><FileText size={17} aria-hidden="true" /><span>What the source tells us</span><span className={styles.sourceNumber}>02</span></div>
              <h3>Terrain decisions carry into design.</h3>
              <p>The package left terrace levels and gantry locations to the contractor during detailed engineering.</p>
              <details className={styles.source}>
                <summary><BookOpen size={14} aria-hidden="true" /> Inspect the supplied evidence</summary>
                <p>“The NAG-SS-02A package required the contractor to determine substation terrace levels and 33 kV gantry locations during detail engineering, indicating terrain adaptation was deferred to design phase under turnkey responsibility.”</p>
                <span>Overview · supplied procurement research library</span>
              </details>
            </article>
            <p className={styles.limit}><Check size={16} aria-hidden="true" /> A useful precedent. Site-specific conditions still need verification.</p>
          </div>
        </div>
        <div className={styles.workbenchFooter}><span>Find the connection. Follow it to the source.</span><span>Illustrative research view</span></div>
      </section>

      <section id="approach" className={styles.approach} aria-labelledby="approach-title">
        <div className={styles.sectionHeading}><h2 id="approach-title">The full story sits<br />between the records.</h2><p>Procurement knowledge is spread across transaction tables, operational documents, and institutional memory. Better decisions start by reading them together.</p></div>
        <div className={styles.layers}>
          <article><span className={styles.layerIndex}>What occurred</span><h3>Data.</h3><p>Contract awards, suppliers, methods, and project records establish the facts.</p><span className={styles.layerSource}>Awards & project portfolios</span></article>
          <article><span className={styles.layerIndex}>How it was executed</span><h3>Context.</h3><p>Specifications, tender documents, and implementation reports explain the approach.</p><span className={styles.layerSource}>Procurement & operational documents</span></article>
          <article><span className={styles.layerIndex}>Why it mattered</span><h3>Knowledge.</h3><p>Evaluations and lessons learned reveal what to question the next time around.</p><span className={styles.layerSource}>Completion reports & evaluations</span></article>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.capabilityIntro}><h2 id="capabilities-title">Less searching.<br />More understanding.</h2><p>One conversation, with the evidence close at hand.</p><Link className={styles.textLink} href="/workspace">Try the research demo <ArrowRight size={17} aria-hidden="true" /></Link></div>
        <div className={styles.capabilityList}>{capabilities.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className={styles.vision} aria-labelledby="vision-title">
        <div><span className={styles.visionLabel}>The platform vision</span><h2 id="vision-title">Institutional memory,<br />working across the lifecycle.</h2></div>
        <div><p>From planning and tender design to execution and continuous learning: a connected foundation for evidence-backed procurement decisions.</p><p className={styles.visionNote}>Today’s demo researches a supplied library. Live World Bank ingestion, predictive timelines, and continuous monitoring are part of the proposed platform, rather than active demo capabilities.</p></div>
      </section>
      <section className={styles.closing} aria-labelledby="closing-title"><span className={styles.closingMark} aria-hidden="true"><Network size={32} /></span><h2 id="closing-title">Start with a question.<br />Leave with the evidence.</h2><p>Your next procurement can learn from the last.</p><Link href="/workspace" className={styles.primary}>Explore the workspace <ArrowRight size={18} aria-hidden="true" /></Link></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.footerBrand}>Procurement GPT</Link><p>Evidence for better development decisions.</p><a href="#main">Back to top ↑</a></footer>
  </div>;
}
