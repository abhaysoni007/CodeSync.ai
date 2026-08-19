import { motion } from 'framer-motion';
import { GitMerge, Radar, Layers } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { Badge } from './ui/badge';

const FEATURES = [
  {
    title: 'Hybrid Delta Model',
    description: 'Combines structural + semantic diffs for intelligent change detection.',
    icon: Layers,
  },
  {
    title: 'Instant Conflict Resolution',
    description: 'CRDT-inspired hybrid strategy for seamless multi-user editing.',
    icon: GitMerge,
  },
  {
    title: 'Cross-Environment Sync',
    description: 'Terminal + File Explorer + State in harmony across all contexts.',
    icon: Radar,
  },
];

const TAGS = ['Real-time Sync', 'Version Aware', 'Multi-Device', 'Conflict-Free'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const HybridDataSyncShowcase = () => {
  return (
    <section className="py-24 px-6 bg-land-ink border-y border-land-line">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="sync engine"
          title="Hybrid Data Sync Engine"
          description="Every change. Every user. Perfectly synchronized."
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group bg-land-surface border border-land-line hover:border-land-accent/50 rounded-lg p-8 transition-colors duration-300"
            >
              <div className="w-11 h-11 rounded-md border border-land-line flex items-center justify-center mb-6 text-land-muted group-hover:text-land-accent group-hover:border-land-accent/50 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-mono text-lg font-semibold text-land-paper mb-3">
                {feature.title}
              </h3>
              <p className="text-land-muted leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-6 mt-16"
        >
          <p className="font-mono text-sm text-land-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-land-signal animate-pulse" />
            Powered by cutting-edge delta synchronization technology
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {TAGS.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-land-line text-land-muted font-mono font-normal px-3 py-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HybridDataSyncShowcase;
