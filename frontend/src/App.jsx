import { Link, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Workspace from './pages/Workspace.jsx';
import Setup from './pages/Setup.jsx';
import Architecture from './pages/Architecture.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { Card } from './components/ui.jsx';

function App() {
  return <Routes><Route element={<AppLayout />}><Route index element={<Home />} /><Route path="login" element={<AuthPage mode="login" key="login" />} /><Route path="register" element={<AuthPage mode="register" key="register" />} /><Route path="workspace" element={<Workspace />} /><Route path="setup" element={<Setup />} /><Route path="architecture" element={<Architecture />} /><Route path="*" element={<div className="page-content"><Card><p className="eyebrow">404</p><h1>Page not found.</h1><p>This page is not part of the current workspace.</p><Link className="button button-primary" to="/">Return home</Link></Card></div>} /></Route></Routes>;
}

export default App;
