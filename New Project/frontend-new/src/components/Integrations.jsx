import { motion } from 'framer-motion';
import { SiOpenai, SiGoogle } from 'react-icons/si';
import { FaRobot, FaMicrochip } from 'react-icons/fa';
import SectionHeading from './SectionHeading';
import { Badge } from './ui/badge';

const INTEGRATIONS = [
  {
    name: 'GPT',
    company: 'OpenAI',
    icon: <SiOpenai className="text-xl" />,
    description: 'Advanced language models.',
  },
  {
    name: 'Claude',
    company: 'Anthropic',
    icon: <FaRobot className="text-xl" />,
    description: 'Constitutional AI assistant.',
  },
  {
    name: 'Gemini',
    company: 'Google',
    icon: <SiGoogle className="text-xl" />,
    description: 'Multimodal AI model.',
  },
  {
    name: 'Groq',
    company: 'Groq',
    icon: <FaMicrochip className="text-xl" />,
    description: 'Ultra-fast inference.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const Integrations = () => {
  return (
    <section className="py-24 px-6 bg-land-ink border-y border-land-line">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="ai integrations"
          title="AI Integrations"
          description="Connect with the world's most powerful AI models. Choose your preferred assistant or use them all."
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {INTEGRATIONS.map((integration) => (
            <motion.div
              key={integration.name}
              variants={cardVariants}
              className="relative bg-land-surface border border-land-line hover:border-land-accent/50 rounded-lg p-5 transition-colors duration-300"
            >
              <Badge
                variant="outline"
                className="rounded-full absolute top-4 right-4 border-land-line text-land-signal font-mono text-[10px] font-normal px-1.5 py-0"
              >
                Available
              </Badge>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-md border border-land-line flex items-center justify-center text-land-paper shrink-0">
                  {integration.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-mono font-semibold text-land-paper truncate">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-land-muted truncate">by {integration.company}</p>
                </div>
              </div>

              <p className="text-sm text-land-muted leading-relaxed">{integration.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 text-center bg-land-surface border border-land-line rounded-lg p-8 max-w-3xl mx-auto"
        >
          <p className="font-mono text-sm text-land-accent mb-3">// switch models on the fly</p>
          <h3 className="font-mono text-xl font-bold text-land-paper mb-3">
            Switch Between AI Models Instantly
          </h3>
          <p className="text-land-muted">
            No need to choose just one. CodeSync.AI lets you switch between different AI models
            on the fly, giving you the best of all worlds for your coding needs.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Integrations;
