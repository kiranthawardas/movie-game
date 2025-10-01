import "./App.css";
import movie_casts from "./movie_casts.json";
import actor_filmographies from "./actor_filmographies.json";
import gameConfig from "./game_config.json";
import { useState, useMemo, useEffect } from "react";

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

  return gameConfig.games.find(game => game.date === today) || gameConfig.games[0];
}

function App() {
  const currentGame = useMemo(() => getCurrentGame(), []);
  const { startingActor, endingActor, idealPath } = currentGame;


  // Initialize state with a function that reads localStorage
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
        return parsedSavedSelections[parsedSavedSelections.length - 1]?.costar === endingActor;
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
        return parsedSavedSelections[parsedSavedSelections.length - 1]?.costar === endingActor;
      } catch (err) {
        return false;
      }
    }
    return false;
  });

  const [instructionsModalOpen, setInstructionsModalOpen] = useState(() => {
    return !localStorage.getItem('selections');
  });

  useEffect(() => {
    const savedCurrentGame = localStorage.getItem('currentGame');
    if (savedCurrentGame) {
      try {
        const parsed = JSON.parse(savedCurrentGame);
        if (JSON.stringify(parsed) !== JSON.stringify(currentGame)) {
          localStorage.clear();
          setSelections([]);
          setSuccess(false);
          setSuccessModalOpen(false);
          setInstructionsModalOpen(true);
        }
      } catch (err) {
        localStorage.clear();
      }
    } else {
      localStorage.setItem('currentGame', JSON.stringify(currentGame));
    }
  }, [currentGame, endingActor]);

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

    if (selectedCostar === endingActor) {
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
              inputActor={selections[i - 1]?.costar || startingActor}
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
      <h1 class="main-header">The Movie Game</h1>
      <p className="start-end-actor-indicator">
        <b>Starting Actor:</b> {startingActor}
      </p>
      {renderSelectionComponents()}
      <p className="start-end-actor-indicator">
        <b>Ending Actor:</b> {endingActor}
      </p>
      {instructionsModalOpen && (
        <InstructionsModal onModalClose={() => setInstructionsModalOpen(false)} />
      )}
      {success && successModalOpen && (
        <WinningModal
          selections={selections}
          startingActor={startingActor}
          idealPath={idealPath}
          onModalClose={() => setSuccessModalOpen(false)}
        />
      )}
    </div>
  );
}

function buildPathText(startingActor, path) {
  const pathElements = [<p key="start"><b>{startingActor}</b></p>];

  path.forEach((step, i) => {
    pathElements.push(
      <p key={`film-${i}`}>
        was in <b><i>{step.film}</i></b>
      </p>
    );
    pathElements.push(
      <p key={`costar-${i}`}>
        with <b>{step.costar}</b>
      </p>
    );
  });

  return pathElements;
}

function InstructionsModal({ onModalClose }) {
  const examplePath = [
    { film: "Air", costar: "Jason Bateman" },
    { film: "Tropic Thunder", costar: "Tom Cruise" },
  ];
  const examplePathText = buildPathText("Matt Damon", examplePath);

  return (
    <div className="modal">
      <h1>Welcome</h1>
      <p>
        Find the connection between the Starting Actor and the Ending Actor by
        linking them through movies and co-stars.
      </p>
      <hr />
      <p>
        <b><u>Example:</u></b>
      </p>
      <p>Starting Actor: Matt Damon</p>
      <p>Ending Actor: Tom Cruise</p>

      <div class="path"><i>
        {examplePathText}
      </i>
      </div>
      <button onClick={onModalClose}>Close</button>
    </div>
  );
}

function buildSuccessMessage(startingActor, path) {
  let message = "The Movie Game #3 \n\n";
  message += `🎬 Your Path (${path.length} moves)\n${startingActor}`;

  path.forEach(step => {
    message += `\n⬇️ ${step.film}`;
    message += `\n${step.costar}`;
  });

  return message;
}

function WinningModal({ selections, startingActor, onModalClose, idealPath }) {
  const [idealPathOpen, setIdealPathOpen] = useState(false);

  const idealPathText = buildPathText(startingActor, idealPath);
  const pathText = buildPathText(startingActor, selections);
  const successMessage = buildSuccessMessage(startingActor, selections);

  const handleShare = async () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /(iphone|ipad|ipod)/i.test(userAgent);
    const isMac = /(macintosh|macintel|macppc|mac68k|macos)/i.test(userAgent);

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

  return (
    <div className="winning-modal modal">
      <h1>Your Path</h1>
      <div class="path">
        <i>
          {pathText}
        </i>
      </div>
      <button className="share-button" onClick={handleShare}>
        Share Results
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
          <div class="path">
            <i>
              {idealPathText}
            </i>
          </div>
        </>
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
        <select
          disabled={success || filmOptions.length === 0}
          value={selectedFilm}
          onChange={(e) => onSelectedFilmChange(index, e.target.value)}
        >
          <option disabled value="">
            Select a {inputActor} film
          </option>
          {filmOptions.map((film) => (
            <option key={film} value={film}>{film}</option>
          ))}
        </select>
      </div>
      <div className="column">
        <select
          disabled={!selectedFilm || success || costarOptions.length === 0}
          value={selectedCostar}
          onChange={(e) => onSelectedCostarChange(index, e.target.value)}
        >
          <option disabled value="">
            {costarSelectorText}
          </option>
          {costarOptions.map((costar) => (
            <option key={costar} value={costar}>{costar}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default App;