import './App.css';

import movie_casts from './movie_casts.json'
import actor_filmographies from './actor_filmographies.json'
import { useState } from 'react';

function App() {
  const startingActor = 'Shah Rukh Khan'
  const endingActor = 'Chris Rock'
  const [selections, setSelections] = useState([])
  const [success, setSuccess] = useState(false)

  const setSelectedFilm = (index, selectedFilm) => {
    let copySelections = [...selections]
    if (index < copySelections.length) {
      copySelections[index] = { 'film': selectedFilm, 'costar': "" }
      copySelections = copySelections.slice(0, index + 1)
    }
    else {
      copySelections.push({ "film": selectedFilm })
    }
    setSelections(copySelections)
  }

  const setSelectedCostar = (index, selectedCostar) => {
    let copySelections = [...selections]
    if (index < copySelections.length) {
      copySelections[index]["costar"] = selectedCostar
      copySelections = copySelections.slice(0, index + 1)
    }
    else {
      copySelections.push({ "costar": selectedCostar })
    }
    if (selectedCostar === endingActor) {
      setSuccess(true);
    }
    setSelections(copySelections)
  }

  const selectionComponents = []
  const endingIndex = success ? selections.length - 1 : selections.length;
  for (let i = 0; i <= endingIndex; i++) {
    if ((i == 0 || (selections[i - 1]?.costar && selections[i - 1]?.film))) {
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
      )
    }
  }
  const successMessage = (
    <>
      <h1>YOU WIN</h1>
      <h2>Ideal Path:</h2>
      <p>Shah Rukh Khan →</p>
      <p><b>Ae Dil Hai Mushkil</b> - Aishwarya Rai Bachchan →</p>
      <p><b>The Last Legion</b> - Ben Kingsley →</p>
      <p><b>A.I. Artificial Intelligence</b> - Chris Rock →</p>
    </>
  )

  return (
    <div className="App">
      <h1>The Movie Game</h1>
      <p><b>Starting Actor:</b> {startingActor}</p>
      {[selectionComponents]}
      <p><b>Ending Actor:</b> {endingActor}</p>
      {success && successMessage}
    </div>
  );

}

function FilmAndCostarSelector(props) {
  let costarOptions = []
  if (props.selectedFilm) {
    costarOptions = movie_casts[props.selectedFilm].filter(item => item !== props.inputActor)
  }
  const filmOptions = actor_filmographies[props.inputActor]

  const filmSelector = (
    <div class='column'>
      <p>Film: </p>
      <select
        disabled={props.success}
        value={props.selectedFilm}
        defaultValue=""
        onChange={(e) => props.onSelectedFilmChange(props.index, e.target.value)}
      >
        <option disabled value=""> Select a {props.inputActor} film</option>
        {filmOptions.map(film => {
          return (<option>{film}</option>)
        })}
      </select>
    </div>
  )

  const costarSelectorText = props.selectedFilm ? `Select ${props.inputActor}'s co-star` : "Select a film first"
  const costarSelector = (
    <div class='column'>
      <p>Co-Star: </p>
      <select
        disabled={!props.selectedFilm || props.success}
        value={props.selectedCostar}
        onChange={(e) => props.onSelectedCostarChange(props.index, e.target.value)}
      >
        <option disabled value="">{costarSelectorText}</option>
        {costarOptions.map(costar => {
          return (<option>{costar}</option>)
        })}
      </select>
    </div>
  )

  return (
    <div class='selector'>
      {filmSelector}
      {costarSelector}
    </div>
  )
}


export default App;
