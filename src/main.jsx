import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* index.css already flattens CSS animations under prefers-reduced-motion,
        but that media query cannot reach animations driven from JavaScript.
        reducedMotion="user" holds every motion component to the same setting. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>
);
