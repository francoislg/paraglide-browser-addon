import { Routes, Route, Link } from 'react-router-dom';
import * as m from './paraglide/messages.js';
import Simple from './pages/Simple';
import Parameters from './pages/Parameters';
import Variants from './pages/Variants';
import LanguageSwitcher from './components/LanguageSwitcher';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>{m.welcome()}</h1>
        <nav className="nav">
          <Link to="/">{m.nav_simple()}</Link>
          <Link to="/parameters">{m.nav_parameters()}</Link>
          <Link to="/variants">{m.nav_variants()}</Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Simple />} />
          <Route path="/parameters" element={<Parameters />} />
          <Route path="/variants" element={<Variants />} />
        </Routes>
      </main>

      <LanguageSwitcher />
    </div>
  );
}

export default App;
