import { Link } from "react-router-dom";
import { Icon, Mark } from "./Icon";
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
              <h2><Mark name="path">Programme</Mark></h2>
              <ul>
                <li><Link to="/how-it-works"><Icon name="path" /> How It Works</Link></li>
                <li><Link to="/researchers"><Icon name="researcher" /> For Researchers</Link></li>
                <li><Link to="/senior-researchers"><Icon name="senior" /> For Senior Researchers</Link></li>
              </ul>
            </div>
            <div>
              <h2><Mark name="apply">Apply</Mark></h2>
              <ul>
                <li><Link to="/apply/researcher"><Icon name="apply" /> Apply as a Researcher</Link></li>
                <li><Link to="/apply/senior-researcher"><Icon name="senior" /> Join the Senior Researcher pool</Link></li>
                <li><Link to="/research"><Icon name="projects" /> Research projects and outputs</Link></li>
              </ul>
            </div>
            <div>
              <h2><Mark name="about">TRI AI</Mark></h2>
              <ul>
                <li><a href="https://tri-ai.org"><Icon name="about" /> tri-ai.org</a></li>
                <li><Link to="/about"><Icon name="about" /> About TRI AI Research</Link></li>
                <li><Link to="/login"><Icon name="sign-in" /> Sign in</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="ftr-bot">
          <p>© {new Date().getFullYear()} TRI AI</p>
        </div>
      </div>
    </footer>
  );
}
