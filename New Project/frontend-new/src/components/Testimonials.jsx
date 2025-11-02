import { motion } from 'framer-motion';
import { FaQuoteLeft, FaStar } from 'react-icons/fa';

const Testimonials = () => {
  const testimonials = [
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section className="py-20 bg-slate-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Loved by Developers
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            See what developers around the world are saying about CodeSync.AI
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 hover:border-cyan-400/50 transition-all duration-300 h-full">
                {/* Quote icon */}
                <FaQuoteLeft className="text-cyan-400/30 text-4xl mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 text-sm" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-300 mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 mt-auto">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full border-2 border-cyan-400/50"
                  />
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20"
        >
          <h3 className="text-3xl font-bold text-center mb-12 text-white">
            Join 10,000+ Teams Already Using CodeSync.AI
          </h3>
          
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Spotify'].map((company, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="text-2xl font-bold text-gray-400"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
