import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

class EditorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="admin-gate">
        <h1>The editor couldn't open.</h1>
        <p>Your saved browser drafts are still here.</p>
        <p role="alert">{this.state.error.message}</p>
        <button className="admin-primary-link" onClick={() => location.reload()}>
          Reload editor
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("admin-root")).render(
  <EditorBoundary>
    <App />
  </EditorBoundary>
);
