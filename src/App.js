import "./App.css";
import movie_casts from "./movie_casts.json";
import actor_filmographies from "./actor_filmographies.json";
import gameConfig from "./game_config.json";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";

function launchFireworks() {
  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const colors = ["#067dac", "#1a8a5a", "#e0c069", "#ffffff", "#e05a5a"];
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 55 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, colors, origin: { x: randomInRange(0.1, 0.35), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, colors, origin: { x: randomInRange(0.65, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

function getCurrentGame() {
  // Get current date in EST/EDT timezone
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Convert from MM/DD/YYYY to YYYY-MM-DD format
  const [month, day, year] = today.split('/');
  const dateString = `${year}-${month}-${day}`

  return gameConfig.games.find(game => game.date === dateString) || gameConfig.games[0];
}

function App() {
  const currentGame = useMemo(() => getCurrentGame(), []);

  if (
    !localStorage.getItem("localStorageVersion") ||
    localStorage.getItem("localStorageVersion") !== "3"
  ) {
    localStorage.clear()
    localStorage.setItem("localStorageVersion", "3");
  }

  if (
    (
      !!!localStorage.getItem("currentGame") ||
      localStorage.getItem('currentGame') !== JSON.stringify(currentGame)
    )
  ) {
    localStorage.removeItem('currentGame')
    localStorage.removeItem('selections')
    localStorage.setItem("currentGame", JSON.stringify(currentGame));
  }

  // Initialize state with a function that reads localStorage
  const [localCurrentGame, setLocalCurrentGame] = useState(() => {
    const savedCurrentGame = localStorage.getItem('currentGame');
    if (savedCurrentGame) {
      try {
        return JSON.parse(savedCurrentGame);
      } catch (err) {
        localStorage.clear();
        return [];
      }
    }
    return [];
  });

  const [selections, setSelections] = useState(() => {
    const savedSelectionsString = localStorage.getItem('selections');
    if (savedSelectionsString) {
      try {
        return JSON.parse(savedSelectionsString);
      } catch (err) {
        localStorage.clear();
        return [];
      }
    }
    return [];
  });

  const [success, setSuccess] = useState(() => {
    const savedSelectionsString = localStorage.getItem('selections');
    if (savedSelectionsString) {
      try {
        const parsedSavedSelections = JSON.parse(savedSelectionsString);
        return parsedSavedSelections[parsedSavedSelections.length - 1]?.costar === localCurrentGame.endingActor;
      } catch (err) {
        return false;
      }
    }
    return false;
  });

  const [successModalOpen, setSuccessModalOpen] = useState(() => {
    const savedSelectionsString = localStorage.getItem('selections');
    if (savedSelectionsString) {
      try {
        const parsedSavedSelections = JSON.parse(savedSelectionsString);
        return parsedSavedSelections[parsedSavedSelections.length - 1]?.costar === localCurrentGame.endingActor;
      } catch (err) {
        return false;
      }
    }
    return false;
  });

  const [instructionsModalOpen, setInstructionsModalOpen] = useState(() => {
    return !localStorage.getItem('selections');
  });

  const swapActors = () => {
    const swappedGame = {
      ...localCurrentGame,
      startingActor: localCurrentGame.endingActor,
      endingActor: localCurrentGame.startingActor,
      idealPath: reversePath(localCurrentGame.startingActor, localCurrentGame.idealPath),
    };

    setLocalCurrentGame(swappedGame);
    localStorage.setItem('currentGame', JSON.stringify(swappedGame));

    // Swapping starts a fresh solve from the new starting actor.
    setSelections([]);
    setSuccess(false);
    setSuccessModalOpen(false);
    localStorage.setItem('selections', JSON.stringify([]));
  }

  const setSelectedFilm = (index, selectedFilm) => {
    const copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index] = { film: selectedFilm, costar: "" };
    } else {
      copySelections.push({ film: selectedFilm, costar: "" });
    }
    setSelections(copySelections.slice(0, index + 1));
    localStorage.setItem('selections', JSON.stringify(copySelections))
  };

  const setSelectedCostar = (index, selectedCostar) => {
    const copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index].costar = selectedCostar;
    } else {
      copySelections.push({ film: "", costar: selectedCostar });
    }

    if (selectedCostar === localCurrentGame.endingActor) {
      setSuccess(true);
      setSuccessModalOpen(true);
    }

    setSelections(copySelections.slice(0, index + 1));
    localStorage.setItem('selections', JSON.stringify(copySelections))
  };

  const renderSelectionComponents = () => {
    const components = [];
    const endingIndex = success ? selections.length - 1 : selections.length;

    for (let i = 0; i <= endingIndex; i++) {
      const shouldRender = i === 0 || (selections[i - 1]?.costar && selections[i - 1]?.film);

      if (shouldRender) {
        components.push(
          <div key={i}>
            <FilmAndCostarSelector
              success={success}
              index={i}
              inputActor={selections[i - 1]?.costar || localCurrentGame.startingActor}
              selectedFilm={selections[i]?.film || ""}
              selectedCostar={selections[i]?.costar || ""}
              onSelectedFilmChange={setSelectedFilm}
              onSelectedCostarChange={setSelectedCostar}
            />
          </div>
        );
      }
    }

    return components;
  };

  return (
    <div className="App">
      <h1 className="main-header">The Movie Game</h1>
      <p className="start-end-actor-indicator">
        <span className="path-icon" aria-hidden="true">👤</span>{" "}
        <b>Starting Actor:</b> {localCurrentGame.startingActor}
      </p>
      {renderSelectionComponents()}
      <p className="start-end-actor-indicator">
        <span className="path-icon" aria-hidden="true">👤</span>{" "}
        <b>Ending Actor:</b> {localCurrentGame.endingActor}
      </p>
      <button className="start-end-actor-indicator" onClick={() => swapActors()}>
        <b>Swap</b>
      </button>
      {instructionsModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setInstructionsModalOpen(false)}
        >
          <InstructionsModal onModalClose={() => setInstructionsModalOpen(false)} />
        </div>
      )}
      {success && successModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSuccessModalOpen(false)}
        >
          <WinningModal
            selections={selections}
            startingActor={localCurrentGame.startingActor}
            idealPath={localCurrentGame.idealPath}
            onModalClose={() => setSuccessModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function reversePath(startingActor, path) {
  // The path visits nodes in order: [start, costar_1, ..., costar_n (= end)],
  // where film_k connects node_{k-1} and node_k. To reverse it (end -> start),
  // film_n connects the end with node_{n-1}, film_{n-1} with node_{n-2}, and so
  // on -- so the films reverse and each keeps its *earlier* node as the co-star.
  const films = path.map((step) => step.film);
  const nodes = [startingActor, ...path.map((step) => step.costar)];
  const reversed = [];
  for (let k = path.length; k >= 1; k--) {
    reversed.push({ film: films[k - 1], costar: nodes[k - 1] });
  }
  return reversed;
}

function ActorChip({ name }) {
  return (
    <div className="path-actor">
      <span className="path-icon" aria-hidden="true">👤</span>
      <span>{name}</span>
    </div>
  );
}

function PathView({ startingActor, path, variant = "user" }) {
  const items = [<ActorChip name={startingActor} key="a0" />];

  path.forEach((step, i) => {
    items.push(
      <div className="path-film" key={`f${i}`}>
        <span className="path-icon" aria-hidden="true">🎬</span>
        <span className="path-film-title">{step.film}</span>
      </div>
    );
    items.push(<ActorChip name={step.costar} key={`a${i + 1}`} />);
  });

  return <div className={`path-view path-view--${variant}`}>{items}</div>;
}

function InstructionsModal({ onModalClose }) {
  const examplePath = [
    { film: "Air", costar: "Jason Bateman" },
    { film: "Tropic Thunder", costar: "Tom Cruise" },
  ];

  return (
    <div className="modal">
      <h1>Welcome</h1>
      <p>
        Find the connection between the Starting Actor and the Ending Actor by
        linking them through movies and co-stars.
      </p>
      <p>
        Daily updates at midnight EST
      </p>
      <hr />
      <p>
        <b><u>Example:</u></b>
      </p>
      <PathView startingActor="Matt Damon" path={examplePath} />
      <button onClick={onModalClose}>Close</button>
    </div>
  );
}

function buildSuccessMessage(startingActor, path) {
  const date = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });
  let message = `The Movie Game ${date}\n\n`;
  message += `🎬 Your Path (${path.length} moves)\n${startingActor}`;

  path.forEach(step => {
    message += `\n⬇️ ${step.film}`;
    message += `\n${step.costar}`;
  });

  return message;
}

function WinningModal({ selections, startingActor, onModalClose, idealPath }) {
  const [idealPathOpen, setIdealPathOpen] = useState(false);

  useEffect(() => {
    launchFireworks();
  }, []);

  const successMessage = buildSuccessMessage(startingActor, selections);
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /(iphone|ipad|ipod)/i.test(userAgent);
  const isMac = /(macintosh|macintel|macppc|mac68k|macos)/i.test(userAgent);

  const handleShare = async () => {

    if (navigator.share && (isIOS || isMac)) {
      try {
        await navigator.share({
          title: "The Movie Game",
          text: successMessage,
          url: "https://kiranthawardas.github.io/movie-game/",
        });
      } catch (error) {
        console.error('Error sharing content:', error);
      }
    }
    else {
      try {
        await navigator.clipboard.writeText(successMessage);
      } catch (error) {
        console.error('Error copying content:', error);
      }
    }
  };

  let shareText = "Share Results"
  if (!(isIOS || isMac)) {
    shareText = "Copy Results"
  }

  const moves = selections.length;
  const idealMoves = idealPath?.length;

  return (
    <div className="winning-modal modal">
      <h1>You got it! 🎉</h1>
      <p className="win-summary">
        Solved in {moves} {moves === 1 ? "move" : "moves"}
        {idealMoves != null && moves > idealMoves && ` · ideal is ${idealMoves}`}
      </p>
      <h1>Your Path</h1>
      <PathView startingActor={startingActor} path={selections} variant="user" />
      <button className="share-button" onClick={handleShare}>
        {shareText}
        <svg className="share-icon" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <circle cx="128" cy="256" r="48" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"></circle>
          <circle cx="384" cy="112" r="48" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"></circle>
          <circle cx="384" cy="400" r="48" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"></circle>
          <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="m169.83 279.53 172.34 96.94m0-240.94-172.34 96.94"></path>
        </svg>
      </button>
      <button className="close-button" onClick={onModalClose}>Close</button>
      <button className="ideal-path-button" onClick={() => setIdealPathOpen(!idealPathOpen)}>
        {idealPathOpen ? "Hide Ideal Path" : "Show Ideal Path"}
      </button>
      {idealPathOpen && (
        <>
          <h1>Ideal Path</h1>
          <PathView startingActor={startingActor} path={idealPath} variant="ideal" />
        </>
      )}
    </div>
  );
}

// Auto-focus the in-panel search box on open for pointer/desktop users, but
// NOT on touch devices, where focusing an input pops the on-screen keyboard --
// there, the user taps the search box themselves when they want to type.
const IS_TOUCH =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

// A single, predictable model: the collapsed control is a plain button that
// opens/closes the panel (tapping it never raises a keyboard). The open panel
// has its own search field -- tapping THAT is what raises the keyboard to
// filter -- and the scrollable option list. Open/browse and type/filter are
// separate targets, so there are no hidden modes to switch between.
function SearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight(-1);
  }, []);

  // Close when clicking/tapping outside the component.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, close]);

  // Focus the search box on open for desktop; skip on touch (avoids keyboard).
  useEffect(() => {
    if (open && !IS_TOUCH && searchRef.current) searchRef.current.focus();
  }, [open]);

  // Keep the highlighted option scrolled into view during keyboard nav.
  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const el = listRef.current.children[highlight];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const select = (item) => {
    onChange(item);
    close();
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && highlight < items.length) select(items[highlight]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <button
        type="button"
        className={"searchable-control" + (open ? " is-open" : "")}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className={"searchable-value" + (value ? "" : " is-placeholder")}>
          {value || placeholder}
        </span>
        <span className="searchable-chevron-box" aria-hidden="true">
          <svg className="searchable-chevron" viewBox="0 0 20 20" width="15" height="15">
            <path
              d="M5 8l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="searchable-panel">
          <div className="searchable-search">
            <span className="searchable-search-icon" aria-hidden="true">🔍</span>
            <input
              ref={searchRef}
              className="searchable-search-input"
              type="text"
              value={query}
              placeholder="Type to search…"
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(e.target.value ? 0 : -1);
              }}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <ul className="searchable-menu" role="listbox" ref={listRef}>
            {items.length === 0 && <li className="searchable-empty">No matches</li>}
            {items.map((item, index) => (
              <li
                key={item}
                role="option"
                aria-selected={item === value}
                className={
                  "searchable-option" +
                  (index === highlight ? " is-highlighted" : "") +
                  (item === value ? " is-selected" : "")
                }
                onMouseEnter={() => setHighlight(index)}
                onClick={() => select(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FilmAndCostarSelector({ success, index, inputActor, selectedFilm, selectedCostar, onSelectedFilmChange, onSelectedCostarChange }) {
  const filmOptions = actor_filmographies[inputActor] || [];
  const costarOptions = selectedFilm
    ? movie_casts[selectedFilm].filter(actor => actor !== inputActor)
    : [];

  const costarSelectorText = selectedFilm
    ? `Select ${inputActor}'s co-star`
    : "Select a film first";

  return (
    <div className="selector">
      <div className="column">
        <span className="path-icon" aria-hidden="true">🎬</span>
        <SearchableSelect
          options={filmOptions}
          value={selectedFilm}
          onChange={(film) => onSelectedFilmChange(index, film)}
          placeholder={`Select a ${inputActor} film`}
          disabled={success || filmOptions.length === 0}
        />
      </div>
      <div className="column">
        <span className="path-icon" aria-hidden="true">👤</span>
        <SearchableSelect
          options={costarOptions}
          value={selectedCostar}
          onChange={(costar) => onSelectedCostarChange(index, costar)}
          placeholder={costarSelectorText}
          disabled={!selectedFilm || success || costarOptions.length === 0}
        />
      </div>
    </div>
  );
}

export default App;