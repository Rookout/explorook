import React, { useEffect, useState } from "react";
import "typeface-roboto/index.css";
// import 'material-design-icons/iconfont/material-icons.css'
import "./App.css";
import { Header } from "./components/Header";
import Footer from "./components/Footer";
import { Token } from "./components/Token";
import { ReposList } from "./components/ReposList";
import { EulaModal } from "./components/EulaModal";
import { ipcRenderer } from "electron";
import "./App.scss";

export const App = ({ ...props }) => {
  const [loading, setLoading] = useState(true);
  const [hasSignedEula, setHasSignedEula] = useState(ipcRenderer.sendSync("has-signed-eula"));

  useEffect(() => {
    ipcRenderer.on("indexer-worker-id", (e, id) => {
      window.indexWorkerId = id;
      setLoading(false);
    });
    ipcRenderer.send("app-window-up");
  }, []);

  if (loading) { return (<div />); }

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <div>
        <Header />
        <Token />
      </div>
      <div style={{ overflow: "auto"}}>
        <div id="content-container">
          { hasSignedEula && <ReposList /> }
          { !hasSignedEula && <EulaModal setSignedEula={setHasSignedEula} {...props} /> }
        </div>
      </div>
      <div style={{ justifyContent: "flex-end", marginTop: "auto" }}>
        <Footer />
      </div>
    </div>
  );
};
