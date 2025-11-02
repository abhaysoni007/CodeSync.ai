import { useState, useEffect } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, default to dark
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "dark";
  });

  useEffect(() => {
    // Update document class for dark mode
    document.documentElement.classList.toggle("dark", theme === "dark");
    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
};

