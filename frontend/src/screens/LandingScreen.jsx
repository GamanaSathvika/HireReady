import { motion } from 'framer-motion'
import { useState } from 'react'

const roleFocusMap = {
  "💻 Software Engineer": ["Data Structures", "Algorithms", "System Design"],
  "🎨 Frontend Developer": ["HTML/CSS", "React", "Performance"],
  "⚙️ Backend Developer": ["APIs", "Databases", "System Design"],
  "☁️ Cloud Engineer": ["AWS / Azure", "Networking", "Deployment"],
  "📊 Data Analyst": ["SQL", "Data Cleaning", "Visualization"],
  "🤖 Machine Learning Engineer": [
    "ML Basics",
    "Model Training",
    "Data Processing",
  ],
  "📱 Mobile Developer": ["UI/UX", "Performance", "App Architecture"],
  "🔐 DevOps Engineer": ["CI/CD", "Docker", "Monitoring"],
};

export function LandingScreen({ onStart }) {
  const [role, setRole] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [difficulty, setDifficulty] = useState("Medium");
  const [focus, setFocus] = useState("");
  const [mode, setMode] = useState("Voice");
  const [strictness, setStrictness] = useState("Normal");
  const [duration, setDuration] = useState("10 min");

  const roles = Object.keys(roleFocusMap);

  const filteredRoles = roles.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  );

  const Pill = ({ value, selected, onClick }) => (
    <button
      onClick={() => onClick(value)}
      className={`pill ${selected ? "pill-active" : ""}`}
    >
      {value}
    </button>
  );

  const Section = ({ title, children }) => (
    <div className="section">
      <div className="section-title">{title}</div>
      <div className="pill-container">{children}</div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="row"
    >
      {/* HEADING */}
      <div className="heading">
        <div className="tag">AI INTERVIEW SIMULATOR</div>
        <h1>
          <span>Set your role, difficulty, and mode before starting.</span>
          <span className="highlight">Let’s get you ready</span>
        </h1>
        <p>Practice with an AI that gives brutally honest feedback.</p>
      </div>

      {/* CARD */}
      <div className="card">
          {/* ROLE DROPDOWN */}
          <div className="section">
            <div className="section-title">Role Selection</div>

            <div className="dropdown">
              <div
                className="dropdown-input"
                onClick={() => setIsOpen((prev) => !prev)}
              >
                {role || "Select Role"}
              </div>

              {isOpen && (
                <div className="dropdown-menu">
                  <input
                    type="text"
                    placeholder="Search role..."
                    className="dropdown-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  {filteredRoles.map((r) => (
                    <div
                      key={r}
                      className={`dropdown-item ${
                        role === r ? "selected" : ""
                      }`}
                      onClick={() => {
                        setRole(r);
                        setFocus(""); // 🔥 reset focus
                        setIsOpen(false);
                      }}
                    >
                      {r}
                      {role === r && <span className="check">✔</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DIFFICULTY */}
          <Section title="Difficulty Level">
            {["Easy", "Medium", "Hard"].map((v) => (
              <Pill
                key={v}
                value={v}
                selected={difficulty === v}
                onClick={setDifficulty}
              />
            ))}
          </Section>

          {/* FOCUS AREA (DYNAMIC) */}
          <div className="section">
            <div className="section-title">Focus Area</div>

            {!role ? (
              <div className="empty-state">
                Select a role to see focus areas
              </div>
            ) : (
              <div className="pill-container fade-in">
                {roleFocusMap[role].map((v) => (
                  <Pill
                    key={v}
                    value={v}
                    selected={focus === v}
                    onClick={setFocus}
                  />
                ))}
              </div>
            )}
          </div>

          {/* MODE */}
          <Section title="Interaction Mode">
            {["Voice", "Video"].map((v) => (
              <Pill
                key={v}
                value={v}
                selected={mode === v}
                onClick={setMode}
              />
            ))}
          </Section>

          {/* STRICTNESS */}
          <Section title="Feedback Strictness">
            {["Normal", "Brutal"].map((v) => (
              <Pill
                key={v}
                value={v}
                selected={strictness === v}
                onClick={setStrictness}
              />
            ))}
          </Section>

          {/* DURATION */}
          <Section title="Duration">
            {["5 min", "10 min", "15 min"].map((v) => (
              <Pill
                key={v}
                value={v}
                selected={duration === v}
                onClick={setDuration}
              />
            ))}
          </Section>

          {/* CTA */}
          <div className="cta-container">
            <button
              className="cta"
              onClick={() =>
                onStart?.({
                  role,
                  difficulty,
                  focus,
                  mode,
                  strictness,
                  duration,
                })
              }
            >
              Start Interview →
            </button>
          </div>
      </div>
    </motion.div>
  )
}