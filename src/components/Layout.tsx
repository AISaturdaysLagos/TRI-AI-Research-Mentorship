import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { firebaseLoaded, loadFirebase } from "../lib/firebase";
import { hostedDemo, programmeUrl } from "../lib/sites";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Loader } from "./Loader";

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function PublicLayout() {
  return (
    <div className="shell">
      <ScrollToTop />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      {hostedDemo ? (
        <p className="demo-bar">
          This is the programme demo. Sample accounts are on the sign-in page.
          <a href={programmeUrl}>Open the live programme</a>
        </p>
      ) : null}
      <main id="main">
        <Suspense fallback={<Loader label="Loading the programme" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export function SdkGate() {
  const [ready, setReady] = useState(firebaseLoaded);
  useEffect(() => {
    let live = true;
    loadFirebase().finally(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  if (!ready) return <Loader label="Loading the programme" />;
  return <Outlet />;
}

export function RequireAuth() {
  const { ready, user, configured } = useAuth();
  const location = useLocation();
  if (!ready) return <Loader label="Loading the programme" />;
  if (!configured || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
