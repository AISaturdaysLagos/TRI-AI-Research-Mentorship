import { Link } from "react-router-dom";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="ftr">
      <div className="container">
        <div className="ftr-top">
          <div>
            <Wordmark />
            <p className="mono" style={{ marginTop: 14 }}>
              Teaching · Research · Innovation
            </p>
            <p className="ftr-blurb">
              A digital home for the TRI AI Researcher and Senior Researcher Programme.
            </p>
          </div>
          <div className="ftr-cols">
            <div>
              <h2>Programme</h2>
              <ul>
                <li><Link to="/how-it-works">How It Works</Link></li>
                <li><Link to="/researchers">For Researchers</Link></li>
                <li><Link to="/senior-researchers">For Senior Researchers</Link></li>
              </ul>
            </div>
            <div>
              <h2>Apply</h2>
              <ul>
                <li><Link to="/apply/researcher">Apply as a Researcher</Link></li>
                <li><Link to="/apply/senior-researcher">Join the Senior Researcher pool</Link></li>
                <li><Link to="/research">Research projects and outputs</Link></li>
              </ul>
            </div>
            <div>
              <h2>TRI AI</h2>
              <ul>
                <li><a href="https://tri-ai.org">tri-ai.org</a></li>
                <li><Link to="/about">About TRI AI Research</Link></li>
                <li><Link to="/login">Sign in</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="ftr-bot">
          <p>Files stay in Google Drive. This app stores structured records only.</p>
          <p>© {new Date().getFullYear()} TRI AI</p>
        </div>
      </div>
    </footer>
  );
}
