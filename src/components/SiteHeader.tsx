import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn, LogOut, Moon, Plus, Sun } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { projectCountQueryOptions } from "@/lib/queries";
import { useTheme } from "./useTheme";
import { BrandMark } from "./BrandMark";

function AuthButton() {
  const { ready, authenticated, logout, login } = usePrivy();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="header-actions">
      <button
        className="icon-button"
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle colour mode"
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      {!authenticated ? (
        <button className="button button--quiet" type="button" disabled={!ready} onClick={login}>
          <LogIn size={16} /> Sign in
        </button>
      ) : (
        <button className="button button--quiet" type="button" onClick={() => void logout()}>
          <LogOut size={16} /> Sign out
        </button>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { data: total } = useQuery(projectCountQueryOptions());

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" aria-label="Shohub home">
          <BrandMark />
        </Link>
        <div className="site-header__right">
          <span className="project-count">
            {typeof total === "number" ? `${total} live projects` : "A live builder directory"}
          </span>
          <Link to="/submit" className="button button--primary">
            <Plus size={16} /> Share a project
          </Link>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
