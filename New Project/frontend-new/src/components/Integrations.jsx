import { motion } from 'framer-motion';
import { SiOpenai, SiGoogle } from 'react-icons/si';
import { FaBrain, FaRobot, FaMicrochip } from 'react-icons/fa';
import Icon from './Icon';
import rocketIcon from '/icons/icons/setting.svg'; // Rocket placeholder

const Integrations = () => {
  const integrations = [
    {
      name: 'GPT',
      company: 'OpenAI',
      icon: <SiOpenai className="text-5xl" />,
      color: 'from-emerald-400 to-teal-500',
      description: 'Advanced language models',
    },
    {
      name: 'Claude',
      company: 'Anthropic',
      icon: <FaRobot className="text-5xl" />,
      color: 'from-orange-400 to-amber-500',
      description: 'Constitutional AI assistant',
    },
    {
      name: 'Gemini',
      company: 'Google',
      icon: <SiGoogle className="text-5xl" />,
      color: 'from-blue-400 to-indigo-500',
      description: 'Multimodal AI model',
    },
    {
      name: 'Groq',
      company: 'Groq',
      icon: <FaMicrochip className="text-5xl" />,
      color: 'from-purple-400 to-pink-500',
      description: 'Ultra-fast inference',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            AI Integrations
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Connect with the world's most powerful AI models. Choose your preferred assistant or use them all.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                y: -15, 
                scale: 1.05,
                boxShadow: '0 20px 40px rgba(6, 182, 212, 0.3)',
              }}
              className="relative group cursor-pointer"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 hover:border-cyan-400/50 transition-all duration-300 h-full flex flex-col items-center text-center">
                {/* Icon container with gradient */}
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${integration.color} flex items-center justify-center mb-6 relative overflow-hidden group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white relative z-10">
                    {integration.icon}
                  </div>
                  
                  {/* Animated glow */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={`absolute inset-0 bg-gradient-to-br ${integration.color} blur-xl opacity-0 group-hover:opacity-50`}
                  />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {integration.name}
                </h3>

                <p className="text-cyan-400 text-sm mb-3">
                  {integration.company}
                </p>

                <p className="text-gray-400 text-sm">
                  {integration.description}
                </p>

                {/* Hover border glow */}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${integration.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none`} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-xl p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Icon 
                src={rocketIcon}
                alt="Rocket"
                className="w-8 h-8"
                themed={true}
                animated={true}
              />
              <h3 className="text-2xl font-bold text-white">
                Switch Between AI Models Instantly
              </h3>
            </div>
            <p className="text-gray-300">
              No need to choose just one. CodeSync.AI lets you switch between different AI models 
              on the fly, giving you the best of all worlds for your coding needs.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Integrations;
