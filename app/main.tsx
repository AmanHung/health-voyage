import { createRoot } from 'react-dom/client';
import Home from './page';
import './globals.css';
const root = document.getElementById('root');
if (root) createRoot(root).render(<Home />);
