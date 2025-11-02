import { motion } from 'framer-motion';
import { FaUsers, FaRobot, FaVideo, FaClock } from 'react-icons/fa';
import Icon from './Icon';
import lockIcon from '/icons/icons/setting.svg'; // Lock placeholder
import boltIcon from '/icons/icons/setting.svg'; // Bolt placeholder  
import globeIcon from '/icons/icons/setting.svg'; // Globe placeholder

const Features = () => {
  const features = [
    {
      icon: <FaUsers className="text-4xl" />,
      title: 'Real-Time Collaboration',
      description: 'Edit code live with teammates. See changes instantly with cursor tracking and real-time synchronization.',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: <FaRobot className="text-4xl" />,
      title: 'AI Code Assistants',
      description: 'Integrated GPT, Claude, Gemini, and Groq. Get intelligent code suggestions and automated debugging.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <FaVideo className="text-4xl" />,
      title: 'Chat & Video Calls',
      description: 'Work and communicate instantly. Built-in voice and video calls, plus real-time text chat.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <FaClock className="text-4xl" />,
      title: 'Version Timeline',
      description: 'Auto-save and rollback effortlessly. Never lose your work with automatic version control.',
      color: 'from-orange-500 to-red-500',
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
    <section id="features" className="py-20 bg-slate-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to build, collaborate, and ship faster — all in one platform.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-cyan-400/50 transition-all duration-300 h-full">
                {/* Icon with gradient background */}
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: lockIcon, text: 'End-to-End Encryption' },
            { icon: boltIcon, text: 'Lightning Fast Performance' },
            { icon: globeIcon, text: 'Works Anywhere, Anytime' },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 text-center text-gray-300 hover:border-cyan-400/50 transition-colors flex items-center justify-center gap-3"
            >
              <Icon 
                src={item.icon} 
                alt={item.text}
                className="w-5 h-5"
                themed={true}
                animated={false}
              />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
