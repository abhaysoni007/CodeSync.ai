import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Lead Developer @ TechCorp',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    quote: 'This tool redefined our hackathon workflow! We shipped a complete product in 48 hours with seamless collaboration.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'CTO @ StartupXYZ',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    quote: 'Feels like VSCode, Zoom, and ChatGPT in one! Our team productivity increased by 300% since we started using CodeSync.AI.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Software Engineer @ Google',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    quote: 'The AI integration is mind-blowing. Having multiple AI models at my fingertips while coding is a game-changer.',
    rating: 5,
  },
];

const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Spotify'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const Testimonials = () => {
  return (
    <section className="py-24 px-6 bg-land-ink">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="reviews"
          title="Loved by Developers"
          description="See what developers around the world are saying about CodeSync.AI"
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={cardVariants}
              className="bg-land-surface border border-land-line hover:border-land-accent/50 rounded-lg p-7 flex flex-col transition-colors duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-land-accent text-land-accent" />
                ))}
              </div>

              <p className="text-land-paper/90 mb-6 leading-relaxed flex-1">
                <span className="text-land-muted font-mono">// </span>
                {testimonial.quote}
              </p>

              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-land-line">
                <Avatar className="w-10 h-10 border border-land-line">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-land-paper text-sm">{testimonial.name}</div>
                  <div className="text-xs text-land-muted">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-20 text-center"
        >
          <h3 className="font-mono text-xl font-bold text-land-paper mb-10">
            Join 10,000+ Teams Already Using CodeSync.AI
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
            {COMPANIES.map((company) => (
              <span
                key={company}
                className="font-mono text-lg text-land-muted hover:text-land-paper transition-colors"
              >
                {company}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
