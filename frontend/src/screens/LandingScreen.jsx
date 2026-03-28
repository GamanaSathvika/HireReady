import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

const MotionDiv = motion.div

const NAV_ITEMS = [
  { id: 'why-us', label: 'Why Us' },
  { id: 'mission', label: 'Mission' },
  { id: 'about', label: 'About Us' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact Us' },
]

const SECTION_ORDER = ['hero', 'why-us', 'mission', 'about', 'faq', 'contact']

const INSTRUCTIONS = [
  {
    icon: '👤',
    title: 'Select your role and experience level before starting',
    hint: 'Know your context so answers stay relevant.',
  },
  {
    icon: '🔇',
    title: 'Ensure you are in a quiet, distraction-free environment',
    hint: 'Clear audio helps the AI understand you.',
  },
  {
    icon: '🎙️',
    title: 'Speak clearly and confidently',
    hint: 'Pace yourself — clarity beats rushing.',
  },
  {
    icon: '💭',
    title: 'Think before answering — quality over speed',
    hint: 'A thoughtful answer always wins.',
  },
]

const WHY_US_FEATURES = [
  {
    icon: '🎙️',
    title: 'Voice-first practice',
    description: 'Speak out loud like a real interview — no typing, no scripts, just natural flow.',
  },
  {
    icon: '⚡',
    title: 'Instant, honest feedback',
    description: 'Get structured critique fast so you know what to fix before your next attempt.',
  },
  {
    icon: '🎯',
    title: 'Pressure you can repeat',
    description: 'Train under time and tone that mirror real panels, without the stakes.',
  },
]

function scrollToSection(id) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingScreen({ onStart }) {
  const [activeSection, setActiveSection] = useState('hero')
  const ticking = useRef(false)

  const updateActiveFromScroll = useCallback(() => {
    const navLine = 100

    let current = 'hero'
    for (const id of SECTION_ORDER) {
      const el = document.getElementById(id)
      if (!el) continue
      const top = el.getBoundingClientRect().top
      if (top <= navLine) current = id
    }
    setActiveSection((prev) => (prev === current ? prev : current))
  }, [])

  const onScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      ticking.current = false
      updateActiveFromScroll()
    })
  }, [updateActiveFromScroll])

  useEffect(() => {
    const root = document.querySelector('[data-landing-scroll]')
    if (!root) return undefined
    const initId = requestAnimationFrame(() => {
      updateActiveFromScroll()
    })
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(initId)
      root.removeEventListener('scroll', onScroll)
    }
  }, [onScroll, updateActiveFromScroll])

  const handleNavClick = (e, id) => {
    e.preventDefault()
    scrollToSection(id)
  }

  return (
    <div className="interview-ready-page">
      <header className="navbar" role="banner">
        <div className="nav-left">
          <button
            type="button"
            className="brand brand--nav"
            onClick={() => scrollToSection('hero')}
            aria-label="HireReady — Home"
          >
            <span className="brand-white">Hire</span>
            <span className="brand-yellow">Ready</span>
          </button>
        </div>

        <nav className="nav-center" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`nav-link ${activeSection === id ? 'nav-link--active' : ''}`}
              onClick={(e) => handleNavClick(e, id)}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="landing-main">
        <section id="hero" className="landing-section landing-section--hero" aria-label="Interview ready">
          <div className="interview-ready-root">
            <div className="interview-hero">
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="interview-hero__inner"
              >
                <div className="badge">AI Powered Interview Practice</div>

                <h1 className="interview-hero__title">
                  Get Ready for Your
                  <br />
                  <span className="highlight">Interview</span>
                </h1>

                <p className="interview-hero__subtitle">
                  Take a deep breath. Set yourself up for success.
                </p>

                <div className="interview-hero__list">
                  {INSTRUCTIONS.map((item) => (
                    <div key={item.title} className="interview-hero__row">
                      <div className="interview-hero__icon" aria-hidden>
                        {item.icon}
                      </div>
                      <div className="interview-hero__text">
                        <p>{item.title}</p>
                        <span>{item.hint}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="interview-hero__cta-wrap">
                  <button
                    type="button"
                    className="interview-hero__cta"
                    onClick={() => onStart?.()}
                  >
                    Start Interview
                  </button>
                </div>
              </MotionDiv>
            </div>
          </div>
        </section>

        <section
          id="why-us"
          className="landing-section landing-saas-section landing-saas-section--why"
          aria-labelledby="why-us-heading"
        >
          <div className="landing-saas__inner">
            <div className="landing-saas-badge">Why Us</div>

            <h2 id="why-us-heading" className="landing-saas-headline">
              Effortless Practice
              <br />
              <span className="highlight">Real Interview Experience</span>
            </h2>

            <p className="landing-saas-subtitle">
              One calm flow from mic check to feedback — so you rehearse the real thing, not a quiz.
            </p>

            <div className="landing-feature-grid">
              {WHY_US_FEATURES.map((item) => (
                <article key={item.title} className="landing-feature-card">
                  <div className="icon-circle" aria-hidden>
                    {item.icon}
                  </div>
                  <h3 className="landing-feature-card__title">{item.title}</h3>
                  <p className="landing-feature-card__desc">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="mission"
          className="landing-section landing-saas-section landing-saas-section--mission"
          aria-labelledby="mission-heading"
        >
          <div className="landing-saas__inner landing-saas__inner--mission">
            <div className="landing-saas-badge">Our Mission</div>

            <h2 id="mission-heading" className="landing-saas-headline landing-saas-headline--mission">
              <span className="landing-mission-line">
                <span className="landing-mission-emoji" aria-hidden>
                  🎯
                </span>
                Exposing <span className="highlight">Weakness</span>
              </span>
              <br />
              <span className="landing-mission-line">
                <span className="landing-mission-emoji" aria-hidden>
                  💪
                </span>
                Building <span className="highlight">Confidence</span>
              </span>
            </h2>

            <p className="landing-saas-subtitle landing-saas-subtitle--mission">
              We surface what hiring managers actually hear — gaps, filler, structure — then help you rebuild with
              clarity.
            </p>
            <p className="landing-saas-subtitle landing-saas-subtitle--mission-secondary">
              No sugarcoating. No generic tips. Just the truth, packaged so you can act on it today.
            </p>
          </div>
        </section>

        <section id="about" className="landing-section landing-block" aria-labelledby="about-heading">
          <div className="landing-block__inner">
            <h2 id="about-heading" className="landing-block__title">
              About Us
            </h2>
            <p className="landing-block__lead">
              HireReady is built for candidates who want clarity — not comfort. We combine voice interaction with
              structured evaluation so you know exactly what to improve before the real room.
            </p>
          </div>
        </section>

        <section id="faq" className="landing-section landing-block" aria-labelledby="faq-heading">
          <div className="landing-block__inner">
            <h2 id="faq-heading" className="landing-block__title">
              FAQ
            </h2>
            <ul className="landing-faq">
              <li>
                <strong>Do I need to install anything?</strong>
                <span>Just a modern browser and a microphone. Start from this page when you’re ready.</span>
              </li>
              <li>
                <strong>Is my practice session private?</strong>
                <span>Sessions are designed for practice; check our policies for how data is handled.</span>
              </li>
              <li>
                <strong>Can I retry?</strong>
                <span>Yes — run as many sessions as you need to sharpen your answers.</span>
              </li>
            </ul>
          </div>
        </section>

        <section id="contact" className="landing-section landing-block landing-block--contact" aria-labelledby="contact-heading">
          <div className="landing-block__inner">
            <h2 id="contact-heading" className="landing-block__title">
              Contact Us
            </h2>
            <p className="landing-block__lead">
              Questions, partnerships, or feedback? Reach out — we read every message.
            </p>
            <p className="landing-block__contact">
              <a href="mailto:hello@hireready.app" className="landing-block__link">
                hireready@gmail.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
