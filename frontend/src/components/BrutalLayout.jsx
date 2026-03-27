import { motion } from 'framer-motion'

export function BrutalLayout({ countdown = '10:00', children }) {
  return (
    <div className="min-h-[100svh] bg-[#0f0f0f] text-[#f3f3f3]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between gap-3"
        >
          <div>
            <h1 className="m-0 text-[20px] font-medium">Mock Interview</h1>
            <div className="mt-1.5 text-[13px] text-[#9a9a9a]">Powered by AI — speak naturally</div>
          </div>
          <div className="text-[14px] font-mono text-[#9a9a9a] tabular-nums">{countdown}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mt-[14px] rounded-[14px] border border-white/10 bg-[#1a1a1a] p-4 sm:p-5"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

