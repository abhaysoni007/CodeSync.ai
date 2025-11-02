import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const HybridDataSyncShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const features = [
    {
      title: 'Hybrid Delta Model',
      description: 'Combines structural + semantic diffs for intelligent change detection',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Instant Conflict Resolution',
      description: 'CRDT-inspired hybrid strategy for seamless multi-user editing',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Cross-Environment Sync',
      description: 'Terminal + File Explorer + State in harmony across all contexts',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M3 9H21" stroke="currentColor" strokeWidth="2"/>
          <path d="M9 3V21" stroke="currentColor" strokeWidth="2"/>
          <circle cx="15" cy="15" r="2" fill="currentColor"/>
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-600',
    },
  ];

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-6"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Glowing orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl top-1/4 left-1/4"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl bottom-1/4 right-1/4"
        />

        {/* Animated data flow lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
              <stop offset="50%" stopColor="rgba(6, 182, 212, 0.6)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
              <stop offset="50%" stopColor="rgba(168, 85, 247, 0.6)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </linearGradient>
          </defs>
          
          {/* Horizontal flowing lines */}
          <motion.line
            x1="0"
            y1="30%"
            x2="100%"
            y2="30%"
            stroke="url(#lineGradient1)"
            strokeWidth="2"
            animate={{
              pathLength: [0, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.line
            x1="0"
            y1="70%"
            x2="100%"
            y2="70%"
            stroke="url(#lineGradient2)"
            strokeWidth="2"
            animate={{
              pathLength: [0, 1, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
              delay: 0.5,
            }}
          />
        </svg>

        {/* Floating nodes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="relative z-10 container mx-auto max-w-7xl"
      >
        {/* Header */}
        <motion.div variants={titleVariants} className="text-center mb-16">
          {/* Glowing title effect */}
          <div className="relative inline-block">
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 blur-xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50"
            />
            <h2 className="relative text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Hybrid Data Sync Engine
            </h2>
          </div>
          
          <motion.p
            variants={titleVariants}
            className="text-2xl md:text-3xl text-gray-300 font-light"
          >
            Every change. Every user.{' '}
            <span className="font-semibold text-cyan-400">Perfectly synchronized.</span>
          </motion.p>

          {/* Animated underline */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="mx-auto mt-6 h-1 w-32 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full origin-center"
          />
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.3 },
              }}
              className="group relative"
            >
              {/* Card background glow */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-xl rounded-2xl transition-opacity duration-500`}
              />

              {/* Card content */}
              <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-slate-600 rounded-2xl p-8 h-full transition-all duration-300">
                {/* Icon container */}
                <div className="mb-6 relative">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}
                  >
                    {feature.icon}
                  </motion.div>

                  {/* Pulsing ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-20`}
                  />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Bottom accent line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} rounded-b-2xl origin-left`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline with pulse effect */}
        <motion.div
          variants={titleVariants}
          className="text-center mt-16"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(6, 182, 212, 0.3)',
                  '0 0 40px rgba(6, 182, 212, 0.6)',
                  '0 0 20px rgba(6, 182, 212, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="px-8 py-4 bg-slate-800/80 backdrop-blur-sm border border-cyan-500/30 rounded-full"
            >
              <p className="text-lg md:text-xl text-cyan-400 font-medium">
                ⚡ Powered by cutting-edge delta synchronization technology
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Technical specs badges */}
        <motion.div
          variants={containerVariants}
          className="flex flex-wrap justify-center gap-4 mt-12"
        >
          {['Real-time Sync', 'Version Aware', 'Multi-Device', 'Conflict-Free'].map((badge, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="px-6 py-2 bg-slate-800/60 border border-slate-700 rounded-full text-sm text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300"
            >
              {badge}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HybridDataSyncShowcase;
