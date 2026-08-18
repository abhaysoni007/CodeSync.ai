import { Github, Linkedin, Twitter, Terminal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const FOOTER_LINKS = {
  Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  Company: ['About Us', 'Careers', 'Blog', 'Press Kit'],
  Resources: ['Documentation', 'Guides', 'API Reference', 'Community'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
};

const SOCIAL_LINKS = [
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Twitter, href: '#', label: 'Twitter' },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-land-ink border-t border-land-line">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-md border border-land-line bg-land-surface text-land-accent">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <span className="font-mono font-bold text-land-paper">
                CodeSync<span className="text-land-accent">.AI</span>
              </span>
            </div>
            <p className="text-land-muted text-sm mb-4">
              Real-time collaborative coding platform powered by AI.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="text-land-muted hover:text-land-accent transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-mono text-sm font-semibold text-land-paper mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-land-muted hover:text-land-accent transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-land-line pt-10 mb-10">
          <div className="max-w-md mx-auto text-center">
            <h3 className="font-mono text-lg font-bold text-land-paper mb-2">Stay Updated</h3>
            <p className="text-land-muted text-sm mb-4">
              Get the latest features and updates delivered to your inbox.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-land-surface border-land-line text-land-paper placeholder:text-land-muted focus-visible:ring-land-accent"
              />
              <Button className="bg-land-accent text-land-ink font-semibold hover:bg-land-accentHover shrink-0">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-land-line pt-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-land-muted">
          <p>© {currentYear} CodeSync.AI — All Rights Reserved</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-land-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-land-accent transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-land-accent transition-colors">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
