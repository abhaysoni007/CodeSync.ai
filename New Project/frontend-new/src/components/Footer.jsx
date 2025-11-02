import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin, FaTwitter, FaCode } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Company: ['About Us', 'Careers', 'Blog', 'Press Kit'],
    Resources: ['Documentation', 'Guides', 'API Reference', 'Community'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
  };

  const socialLinks = [
    { icon: <FaGithub />, href: '#', label: 'GitHub' },
    { icon: <FaLinkedin />, href: '#', label: 'LinkedIn' },
    { icon: <FaTwitter />, href: '#', label: 'Twitter' },
  ];

  return (
    <footer id="contact" className="bg-slate-950 border-t border-slate-800">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 mb-4 cursor-pointer"
            >
              <FaCode className="text-cyan-400 text-2xl" />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                CodeSync.AI
              </span>
            </motion.div>
            <p className="text-gray-400 text-sm mb-4">
              Real-time collaborative coding platform powered by AI.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.2, color: '#06b6d4' }}
                  className="text-gray-400 text-xl hover:text-cyan-400 transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <div key={index}>
              <h4 className="font-bold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-cyan-400 transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="border-t border-slate-800 pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              Stay Updated
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Get the latest features and updates delivered to your inbox.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white font-semibold"
              >
                Subscribe
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>© {currentYear} CodeSync.AI — All Rights Reserved</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-cyan-400 transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
