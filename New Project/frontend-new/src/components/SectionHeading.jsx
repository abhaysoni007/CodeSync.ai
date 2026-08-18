import { motion } from 'framer-motion';

const SectionHeading = ({ eyebrow, title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto text-center mb-16"
    >
      {eyebrow && (
        <p className="font-mono text-sm text-land-accent mb-3">// {eyebrow}</p>
      )}
      <h2 className="font-mono text-3xl md:text-4xl font-bold text-land-paper tracking-tight mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-land-muted text-lg leading-relaxed">{description}</p>
      )}
    </motion.div>
  );
};

export default SectionHeading;
