import "./App.css";
import movie_casts from "./movie_casts.json";
import actor_filmographies from "./actor_filmographies.json";
import { useState } from "react";

const STARTING_ACTOR = "Marilyn Monroe";
const ENDING_ACTOR = "Timothée Chalamet";
const IDEAL_PATH = [
  { film: 'All About Eve', costar: 'Ann Robinson' },
  { film: 'War of the Worlds (2005)', costar: 'Amy Ryan' },
  { film: 'Beautiful Boy', costar: 'Timothée Chalamet' }
];

function App() {
  const [selections, setSelections] = useState([]);
  const [success, setSuccess] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(true);

  const setSelectedFilm = (index, selectedFilm) => {
    const copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index] = { film: selectedFilm, costar: "" };
    } else {
      copySelections.push({ film: selectedFilm, costar: "" });
    }
    setSelections(copySelections.slice(0, index + 1));
  };

  const setSelectedCostar = (index, selectedCostar) => {
    const copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index].costar = selectedCostar;
    } else {
      copySelections.push({ film: "", costar: selectedCostar });
    }
    
    if (selectedCostar === ENDING_ACTOR) {
      setSuccess(true);
      setSuccessModalOpen(true);
    }
    
    setSelections(copySelections.slice(0, index + 1));
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
              inputActor={selections[i - 1]?.costar || STARTING_ACTOR}
              selectedFilm={selections[i]?.film || ""}
              selectedCostar={selections[i]?.costar || ""}
              onSelectedFilmChange={setSelectedFilm}
              onSelectedCostarChange={setSelectedCostar}
            />
            <br />
          </div>
        );
      }
    }
    
    return components;
  };

  return (
    <div className="App">
      <h1>The Movie Game</h1>
      <p className="start-end-actor-indicator">
        <b>Starting Actor:</b> {STARTING_ACTOR}
      </p>
      {renderSelectionComponents()}
      <p className="start-end-actor-indicator">
        <b>Ending Actor:</b> {ENDING_ACTOR}
      </p>
      {instructionsModalOpen && (
        <InstructionsModal onModalClose={() => setInstructionsModalOpen(false)} />
      )}
      {success && successModalOpen && (
        <WinningModal
          selections={selections}
          startingActor={STARTING_ACTOR}
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
    { film: "Catch Me If You Can", costar: "Leonardo DiCaprio" },
    { film: "Once Upon a Time in Hollywood", costar: "Brad Pitt" },
  ];
  const examplePathText = buildPathText("Tom Hanks", examplePath);

  return (
    <div className="modal">
      <h2>Welcome</h2>
      <p>
        Find the connection between the Starting Actor and the Ending Actor by
        linking them through movies and co-stars.
      </p>
      <hr />
      <p>
        <b><u>Example:</u></b>
      </p>
      <p>Starting Actor: Tom Hanks</p>
      <p>Ending Actor: Brad Pitt</p>
      {examplePathText}
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

function WinningModal({ selections, startingActor, onModalClose }) {
  const [idealPathOpen, setIdealPathOpen] = useState(false);

  const idealPathText = buildPathText(startingActor, IDEAL_PATH);
  const pathText = buildPathText(startingActor, selections);
  const successMessage = buildSuccessMessage(startingActor, selections);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "The Movie Game",
          text: successMessage,
          url: "https://kiranthawardas.github.io/movie-game/",
        });
        console.log('Content shared successfully!');
      } catch (error) {
        console.error('Error sharing content:', error);
      }
    } else {
      console.log('Web Share API not supported in this browser.');
    }
  };

  return (
    <div className="winning-modal modal">
      <h2>Your Path</h2>
      {pathText}
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
          <h2>Ideal Path</h2>
          {idealPathText}
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