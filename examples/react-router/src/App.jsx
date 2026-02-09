import { Routes, Route, Link } from 'react-router-dom';
import * as m from './paraglide/messages.js';
import Simple from './pages/Simple';
import Parameters from './pages/Parameters';
import Variants from './pages/Variants';
import Inputs from './pages/Inputs';
import Stacking from './pages/Stacking';
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
          <Link to="/inputs">{m.nav_inputs()}</Link>
          <Link to="/stacking">{m.nav_stacking()}</Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Simple />} />
          <Route path="/parameters" element={<Parameters />} />
          <Route path="/variants" element={<Variants />} />
          <Route path="/inputs" element={<Inputs />} />
          <Route path="/stacking" element={<Stacking />} />
        </Routes>
      </main>

      <LanguageSwitcher />
    </div>
  );
}

export default App;
