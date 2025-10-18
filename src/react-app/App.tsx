// src/App.tsx

import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import cloudflareLogo from "./assets/Cloudflare_Logo.svg";
import honoLogo from "./assets/hono.svg";
import "./App.css";
import { Toaster } from "sonner";
import ComponentsTest from "./ComponentsTest";

function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("unknown");
  const [showComponentsTest, setShowComponentsTest] = useState(false);

  if (showComponentsTest) {
    return (
      <>
        <div className="fixed top-4 left-4">
          <button
            onClick={() => setShowComponentsTest(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ← Back to Home
          </button>
        </div>
        <ComponentsTest />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://hono.dev/" target="_blank">
          <img src={honoLogo} className="logo cloudflare" alt="Hono logo" />
        </a>
        <a href="https://workers.cloudflare.com/" target="_blank">
          <img
            src={cloudflareLogo}
            className="logo cloudflare"
            alt="Cloudflare logo"
          />
        </a>
      </div>
      <h1>Vite + React + Hono + Cloudflare</h1>
      <div className="card">
        <button
          onClick={() => setCount((count) => count + 1)}
          aria-label="increment"
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <div className="card">
        <button
          onClick={() => {
            fetch("/api/")
              .then((res) => res.json() as Promise<{ name: string }>)
              .then((data) => setName(data.name))
              .catch((error) => {
                console.error("Failed to fetch name:", error);
              });
          }}
          aria-label="get name"
        >
          Name from API is: {name}
        </button>
        <p>
          Edit <code>worker/index.ts</code> to change the name
        </p>
      </div>
      <p className="read-the-docs">Click on the logos to learn more</p>
      <div className="card">
        <button
          onClick={() => setShowComponentsTest(true)}
          className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
        >
          🎨 View shadcn/ui Components Test
        </button>
        <p>View all installed shadcn/ui components</p>
      </div>
      <Toaster />
    </>
  );
}

export default App;
