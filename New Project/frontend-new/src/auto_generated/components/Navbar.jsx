import React from 'react';
import PropTypes from 'prop-types';

const Navbar = ({ logo, menuItems }) => {
  return (
    <nav className="bg-blue-500 p-4 flex items-center justify-between">
      <div className="text-white font-bold text-xl">
        <a href="#">{logo}</a>
      </div>
      <ul className="flex space-x-4">
        {menuItems.map((item) => (
          <li key={item.id}>
            <a href={item.href} className="text-white hover:text-blue-200">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

Navbar.propTypes = {
  logo: PropTypes.string.isRequired,
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default Navbar;