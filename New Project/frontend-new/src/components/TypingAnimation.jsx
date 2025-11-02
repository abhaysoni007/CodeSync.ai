import { useState, useEffect } from 'react';

const TypingAnimation = ({ texts, typingSpeed = 100, deletingSpeed = 50, pauseTime = 2000 }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    // Blinking cursor effect
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const fullText = texts[currentTextIndex];
    let timeout;

    if (!isDeleting && currentText === fullText) {
      // Pause before deleting
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && currentText === '') {
      // Move to next text
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      // Type or delete character
      const speed = isDeleting ? deletingSpeed : typingSpeed;
      timeout = setTimeout(() => {
        setCurrentText(
          isDeleting
            ? fullText.substring(0, currentText.length - 1)
            : fullText.substring(0, currentText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentTextIndex, texts, typingSpeed, deletingSpeed, pauseTime]);

  return (
    <span className="inline-block">
      {currentText}
      <span
        className={`inline-block w-0.5 h-6 ml-1 bg-cyan-400 ${
          showCursor ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-100`}
      />
    </span>
  );
};

export default TypingAnimation;
