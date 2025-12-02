import { Routes, Route, Link } from 'react-router-dom';
import * as m from './paraglide/messages.js';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import LanguageSwitcher from './components/LanguageSwitcher';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>{m.welcome()}</h1>
        <nav className="nav">
          <Link to="/">{m.nav_home()}</Link>
          <Link to="/about">{m.nav_about()}</Link>
          <Link to="/products">{m.nav_products()}</Link>
        </nav>
        <LanguageSwitcher />
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
