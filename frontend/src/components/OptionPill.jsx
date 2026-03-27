import { cn } from '../lib/cn'

export function OptionPill({ selected, className, children, ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-full px-[14px] py-[6px] text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30 active:scale-[0.99]'

  const styles = selected
    ? 'bg-yellow-400 text-black border border-transparent hover:brightness-[1.02]'
    : 'bg-[#1a1a1a] text-[#ccc] border border-[#333] hover:brightness-110'

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(base, styles, className)}
      {...props}
    >
      {children}
    </button>
  )
}

const roleFocusMap = {
  "💻 Software Engineer": [
    "Data Structures",
    "Algorithms",
    "System Design",
  ],
  "🎨 Frontend Developer": [
    "HTML/CSS",
    "React",
    "Performance",
  ],
  "⚙️ Backend Developer": [
    "APIs",
    "Databases",
    "System Design",
  ],
  "☁️ Cloud Engineer": [
    "AWS / Azure",
    "Networking",
    "Deployment",
  ],
  "📊 Data Analyst": [
    "SQL",
    "Data Cleaning",
    "Visualization",
  ],
  "🤖 Machine Learning Engineer": [
    "ML Basics",
    "Model Training",
    "Data Processing",
  ],
  "📱 Mobile Developer": [
    "UI/UX",
    "Performance",
    "App Architecture",
  ],
  "🔐 DevOps Engineer": [
    "CI/CD",
    "Docker",
    "Monitoring",
  ],
};