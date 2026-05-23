import { Link, Route, Routes } from "react-router-dom";
import { ConfirmationProvider } from "./context/ConfirmationContext";
import { RunLogPage } from "./pages/RunLogPage";
import { ScenarioEditorPage } from "./pages/ScenarioEditorPage";
import { ScenariosPage } from "./pages/ScenariosPage";

export default function App() {
  return (
    <ConfirmationProvider>
      <div className="app-shell">
        <header className="app-header">
          <h1>Джарвис / Creovix Agent</h1>
          <nav className="app-nav">
            <Link to="/">Сценарии</Link>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ScenariosPage />} />
            <Route path="/new" element={<ScenarioEditorPage />} />
            <Route path="/scenario/:id" element={<ScenarioEditorPage />} />
            <Route path="/logs/:scenarioId" element={<RunLogPage />} />
          </Routes>
        </main>
      </div>
    </ConfirmationProvider>
  );
}
