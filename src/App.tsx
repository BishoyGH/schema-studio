import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-3"
      >
        <h1 className="text-3xl font-semibold tracking-tight">JSON Schema CRUD</h1>
        <p className="max-w-sm text-muted-foreground text-balance">
          Offline-first, schema-driven records. Manage your data entirely in the
          browser.
        </p>
      </motion.div>
      <Button type="button">Get started</Button>
    </main>
  )
}

export default App
