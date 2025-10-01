import "./App.css";

import movie_casts from "./movie_casts.json";
import actor_filmographies from "./actor_filmographies.json";
import { useState, useRef, useEffect } from "react";

function App() {
  const startingActor = "Michael Cera";
  const endingActor = "Constance Wu";
  const [selections, setSelections] = useState([]);
  const [success, setSuccess] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(true);

  const handleWinningModalClose = () => {
    setSuccessModalOpen(false);
  };
  const handleInstructionsModalClose = () => {
    setInstructionsModalOpen(false);
  };

  const setSelectedFilm = (index, selectedFilm) => {
    let copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index] = { film: selectedFilm, costar: "" };
      copySelections = copySelections.slice(0, index + 1);
    } else {
      copySelections.push({ film: selectedFilm });
    }
    setSelections(copySelections);
  };

  const setSelectedCostar = (index, selectedCostar) => {
    let copySelections = [...selections];
    if (index < copySelections.length) {
      copySelections[index]["costar"] = selectedCostar;
      copySelections = copySelections.slice(0, index + 1);
    } else {
      copySelections.push({ costar: selectedCostar });
    }
    if (selectedCostar === endingActor) {
      setSuccess(true);
      setSuccessModalOpen(true);
    }
    setSelections(copySelections);
  };

  const selectionComponents = [];
  const endingIndex = success ? selections.length - 1 : selections.length;
  for (let i = 0; i <= endingIndex; i++) {
    if (i === 0 || (selections[i - 1]?.costar && selections[i - 1]?.film)) {
      selectionComponents.push(
        <>
          <FilmAndCostarSelector
            success={success}
            index={i}
            inputActor={selections[i - 1]?.costar || startingActor}
            selectedFilm={selections[i]?.film || ""}
            selectedCostar={selections[i]?.costar || ""}
            onSelectedFilmChange={setSelectedFilm}
            onSelectedCostarChange={setSelectedCostar}
          />
          <br></br>
        </>
      );
    }
  }

  return (
    <div className="App">
      <h1>The Movie Game</h1>
      <p class="start-end-actor-indicator">
        <b>Starting Actor:</b> {startingActor}
      </p>
      {[selectionComponents]}
      <p class="start-end-actor-indicator">
        <b>Ending Actor:</b> {endingActor}
      </p>
      {instructionsModalOpen && (
        <InstructionsModal onModalClose={handleInstructionsModalClose} />
      )}
      {success && successModalOpen && (
        <WinningModal
          selections={selections}
          startingActor={startingActor}
          onModalClose={handleWinningModalClose}
        />
      )}
    </div>
  );
}

function buildPathText(startingActor, path) {
  const pathText = [
    <p>
      <b>{startingActor}</b>
    </p>,
  ];
  for (let i = 0; i < path.length; i++) {
    pathText.push(
      <p>
        was in{" "}
        <b>
          <i>{path[i]["film"]}</i>
        </b>
      </p>
    );
    pathText.push(
      <p>
        with <b>{path[i]["costar"]}</b>
      </p>
    );
  }
  return pathText;
}

function InstructionsModal(props) {
  const examplePath = [
    { film: "Catch Me If You Can", costar: "Leonardo DiCaprio" },
    { film: "Once Upon a Time in Hollywood", costar: "Brad Pitt" },
  ];
  const examplePathText = buildPathText("Tom Hanks", examplePath);
  const winningModal = (
    <div class="modal">
      <h2>Welcome</h2>
      <p>
        Find the connection between the Starting Actor and the Ending Actor by
        linking them through movies and co-stars.
      </p>
      <hr></hr>
      <p>
        <u>Example:</u>
      </p>
      <p> Starting Actor: Tom Hanks</p>
      <p>Ending Actor: Emma Stone</p>
      {examplePathText}
      <button onClick={props.onModalClose}>Close</button>
    </div>
  );
  return winningModal;
}

function WinningModal(props) {
  const idealPath = [
    { film: "A Very Murray Christmas", costar: "Amy Poehler" },
    { film: "Baby Mama", costar: "Denis O'Hare" },
    { film: "Stephanie Daley", costar: "Constance Wu" },
  ];

  const idealPathText = buildPathText(props.startingActor, idealPath);
  const pathText = buildPathText(props.startingActor, props.selections);

  const winningModal = (
    <div class="modal">
      <h2>Your Path</h2>
      {pathText}
      <hr></hr>
      <h2>Ideal Path</h2>
      {idealPathText}
      <button onClick={props.onModalClose}>Close</button>
    </div>
  );
  return winningModal;
}

function FilmAndCostarSelector(props) {
  let costarOptions = [];
  if (props.selectedFilm) {
    costarOptions = movie_casts[props.selectedFilm].filter(
      (item) => item !== props.inputActor
    );
  }
  const filmOptions = actor_filmographies[props.inputActor];

  const filmSelector = (
    <div class="column">
      <select
        disabled={props.success}
        value={props.selectedFilm}
        defaultValue=""
        onChange={(e) =>
          props.onSelectedFilmChange(props.index, e.target.value)
        }
      >
        <option disabled value="">
          {" "}
          Select a {props.inputActor} film
        </option>
        {filmOptions.map((film) => {
          return <option>{film}</option>;
        })}
      </select>
    </div>
  );

  const costarSelectorText = props.selectedFilm
    ? `Select ${props.inputActor}'s co-star`
    : "Select a film first";
  const costarSelector = (
    <div class="column">
      <select
        disabled={!props.selectedFilm || props.success}
        value={props.selectedCostar}
        onChange={(e) =>
          props.onSelectedCostarChange(props.index, e.target.value)
        }
      >
        <option disabled value="">
          {costarSelectorText}
        </option>
        {costarOptions.map((costar) => {
          return <option>{costar}</option>;
        })}
      </select>
    </div>
  );

  return (
    <div class="selector">
      {filmSelector}
      {costarSelector}
    </div>
  );
}

export default App;
