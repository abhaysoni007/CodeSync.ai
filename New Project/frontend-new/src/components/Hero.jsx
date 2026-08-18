import { motion } from 'framer-motion';
import { Rocket, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TypingAnimation from './TypingAnimation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

const typingTexts = [
  'Real-time AI-powered code collaboration platform.',
  'Bring your team, your code, and your AI — all in one place.',
  'Code together. Ship faster. Build better.',
];

const STATS = [
  { number: '10K+', label: 'Active Users' },
  { number: '50K+', label: 'Projects Created' },
  { number: '99.9%', label: 'Uptime' },
  { number: '24/7', label: 'Support' },
];

const PEERS = [
  { initials: 'MK', color: 'bg-land-accent/20 text-land-accent' },
  { initials: 'TS', color: 'bg-land-signal/20 text-land-signal' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden bg-land-ink pt-32 pb-20 px-6"
      style={{
        backgroundImage:
          'radial-gradient(rgba(237,237,239,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center"
      >
        {/* Left: copy */}
        <div>
          <motion.p variants={itemVariants} className="font-mono text-sm text-land-accent mb-4">
            // real-time ai pair programming
          </motion.p>

          <motion.h1
            variants={itemVariants}
            className="font-mono text-4xl md:text-6xl font-bold leading-[1.1] text-land-paper mb-6"
          >
            Collaborate. Code. Create
            <br />
            <span className="text-land-accent">— Together.</span>
          </motion.h1>

          <motion.div
            variants={itemVariants}
            className="text-lg text-land-muted mb-6 h-8 flex items-center font-mono"
          >
            <TypingAnimation texts={typingTexts} typingSpeed={80} deletingSpeed={40} pauseTime={3000} />
          </motion.div>

          <motion.p variants={itemVariants} className="text-land-muted text-base leading-relaxed max-w-xl mb-10">
            Experience the future of collaborative coding with real-time editing,
            integrated AI assistants, and seamless team communication.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 mb-12">
            <Button
              size="lg"
              className="bg-land-accent text-land-ink font-semibold hover:bg-land-accentHover px-6 h-11"
              onClick={() => navigate('/register')}
            >
              <Rocket className="w-4 h-4" />
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-land-line text-land-paper hover:bg-land-surface px-6 h-11"
              onClick={() => navigate('/login')}
            >
              Login
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-wrap divide-x divide-land-line border border-land-line rounded-md overflow-hidden w-fit bg-land-surface/50"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="px-5 py-3">
                <div className="font-mono text-lg font-bold text-land-paper">{stat.number}</div>
                <div className="text-[11px] uppercase tracking-wide text-land-muted mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: signature — live mock editor */}
        <motion.div variants={itemVariants} className="relative">
          <div className="absolute -inset-8 bg-land-accent/10 blur-3xl rounded-full" />

          <div className="relative rounded-lg border border-land-line bg-land-surface shadow-2xl shadow-black/50 overflow-hidden">
            {/* title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-land-line bg-land-ink/40">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-land-line" />
                  <span className="w-2.5 h-2.5 rounded-full bg-land-line" />
                  <span className="w-2.5 h-2.5 rounded-full bg-land-line" />
                </div>
                <span className="font-mono text-xs text-land-muted">collaborate.js</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {PEERS.map((peer) => (
                    <Avatar key={peer.initials} className="w-6 h-6 border-2 border-land-surface">
                      <AvatarFallback className={`text-[10px] font-mono ${peer.color}`}>
                        {peer.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-land-signal flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-land-signal animate-pulse" />
                  3 online
                </span>
              </div>
            </div>

            {/* code body */}
            <pre className="font-mono text-[13px] leading-relaxed p-5 overflow-x-auto">
              <code>
                <span className="text-land-accent">const</span>{' '}
                <span className="text-land-paper">collaborate</span>{' '}
                <span className="text-land-muted">=</span>{' '}
                <span className="text-land-accent">async</span>{' '}
                <span className="text-land-muted">() =&gt; {'{'}</span>
                {'\n  '}
                <span className="text-land-accent">const</span>{' '}
                <span className="text-land-paper">team</span>{' '}
                <span className="text-land-muted">=</span>{' '}
                <span className="text-land-accent">await</span>{' '}
                <span className="text-land-paper">connectTeam()</span>
                <span className="text-land-muted">;</span>
                <span className="relative inline-block w-px h-3.5 -mb-0.5 ml-1 bg-land-accent animate-caret-blink align-middle" />
                <span className="ml-1 align-middle text-[10px] font-sans px-1 py-0.5 rounded bg-land-accent/20 text-land-accent">
                  Maya
                </span>
                {'\n  '}
                <span className="text-land-accent">const</span>{' '}
                <span className="text-land-paper">ai</span>{' '}
                <span className="text-land-muted">=</span>{' '}
                <span className="text-land-accent">await</span>{' '}
                <span className="text-land-paper">initializeAI</span>
                <span className="text-land-muted">([</span>
                <span className="text-land-signal">'GPT'</span>
                <span className="text-land-muted">, </span>
                <span className="text-land-signal">'Claude'</span>
                <span className="text-land-muted">, </span>
                <span className="text-land-signal">'Gemini'</span>
                <span className="text-land-muted">]);</span>
                <span className="relative inline-block w-px h-3.5 -mb-0.5 ml-1 bg-land-signal animate-caret-blink align-middle" />
                <span className="ml-1 align-middle text-[10px] font-sans px-1 py-0.5 rounded bg-land-signal/20 text-land-signal">
                  Theo
                </span>
                {'\n  '}
                <span className="text-land-accent">return</span>{' '}
                <span className="text-land-paper">realTimeSync</span>
                <span className="text-land-muted">(team, ai);</span>
                {'\n'}
                <span className="text-land-muted">{'};'}</span>
              </code>
            </pre>

            {/* sync log strip */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.3, delayChildren: 0.3 }}
              className="border-t border-land-line bg-land-ink px-5 py-3 font-mono text-[11px] text-land-muted space-y-1"
            >
              <motion.p variants={itemVariants}>
                <span className="text-land-signal">$</span> synced 2 changes · 38ms
              </motion.p>
              <motion.p variants={itemVariants}>
                <span className="text-land-signal">$</span> ai: suggested optimization applied
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
