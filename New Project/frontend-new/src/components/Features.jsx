import { motion } from 'framer-motion';
import { Users, Bot, Video, Clock, Lock, Zap, Globe } from 'lucide-react';
import SectionHeading from './SectionHeading';

const FEATURES = [
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    description: 'Edit code live with teammates. See changes instantly with cursor tracking and real-time synchronization.',
  },
  {
    icon: Bot,
    title: 'AI Code Assistants',
    description: 'Integrated GPT, Claude, Gemini, and Groq. Get intelligent code suggestions and automated debugging.',
  },
  {
    icon: Video,
    title: 'Chat & Video Calls',
    description: 'Work and communicate instantly. Built-in voice and video calls, plus real-time text chat.',
  },
  {
    icon: Clock,
    title: 'Version Timeline',
    description: 'Auto-save and rollback effortlessly. Never lose your work with automatic version control.',
  },
];

const HIGHLIGHTS = [
  { icon: Lock, text: 'End-to-End Encryption' },
  { icon: Zap, text: 'Lightning Fast Performance' },
  { icon: Globe, text: 'Works Anywhere, Anytime' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const Features = () => {
  return (
    <section id="features" className="py-24 px-6 bg-land-ink">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="features"
          title="Powerful Features"
          description="Everything you need to build, collaborate, and ship faster — all in one platform."
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group bg-land-surface border border-land-line hover:border-land-accent/50 rounded-lg p-6 transition-colors duration-300"
            >
              <div className="w-11 h-11 rounded-md border border-land-line flex items-center justify-center mb-5 text-land-muted group-hover:text-land-accent group-hover:border-land-accent/50 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-mono text-base font-semibold text-land-paper mb-2.5">
                {feature.title}
              </h3>
              <p className="text-land-muted text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-4 mt-6"
        >
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.text}
              className="flex items-center justify-center gap-3 bg-land-surface/50 border border-land-line rounded-md px-4 py-3.5 text-land-muted"
            >
              <item.icon className="w-4 h-4 text-land-accent" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
