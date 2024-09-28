'use strict';

// HTML elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  // Form a string that says more about workout
  // String example -> "type of workout" on "date"
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calculatePace();
    this._setDescription();
  }

  // Calculate pace by formula
  // Formula -> workout duration / workout distance
  // Meassure unit -> min/km
  calculatePace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calculateSpeed();
    this._setDescription();
  }

  // Calculate speed by formula
  // Formula -> workout distance / workout duration / 60
  // Meassure unit -> km/h
  calculateSpeed() {
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

class App {
  // Private variables
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  // When App object is created get position, load local storage and set event listeners
  constructor() {
    // Get position as soon as application loads
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // Set event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Get user position
  _getPosition() {
    // Navigator.geolocation property returns Geolocation object which contain data about user location
    if (navigator.geolocation) {
      // getCurrentPosition() calls _loadMap callback if its success or _alertMessage callback if its error
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._alertMessage()
      );
    }
  }

  // Load map according to user position
  _loadMap(position) {
    // User position data
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // Set map view according to user coordinates
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map by revealing input form.
    this.#map.on('click', this._showForm.bind(this));

    // If there are any workouts show markers on map
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Set input form visible
  _showForm(mapEv) {
    this.#mapEvent = mapEv;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Set input form not visible
  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Stops page from reloading after enter is clicked
    // Form does is it by default so it have to be turned off
    e.preventDefault();

    // Check if all given numbers are finite
    // ...inputs means as many arguments as needed
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // Check if all numbers are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cylcing object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Edit marker according to given Workout object data
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // Edit workout log based on given Workout object data
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
       </li>
      `;
    }

    // Insert created html code into index.html file inside of form class
    form.insertAdjacentHTML('afterend', html);
  }

  // Display error
  _alertMessage() {
    alert('Could not get your position.');
  }

  // Set map view to the specific popup based on which workout in form user clicked
  _moveToPopup(e) {
    const workoutElement = e.target.closest('.workout');

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      w => w.id === workoutElement.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel),
      {
        animate: true,
        pan: {
          duration: 1,
        },
      };
  }

  // Set all workouts in local storage. After page is reloaded data remains in browser.
  // Local storage -> key-value principle
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // JSON.stringify -> converts objects to string
  }

  // Get all workouts from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); // JSON.parse -> converts string to objects

    // If there is no data simply return.
    if (!data) return;

    // If there is data, set it to workouts array.
    this.#workouts = data;

    this.#workouts.forEach(w => {
      this._renderWorkout(w);
    });
  }

  // Delete workouts from local storage and reload the page
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

// Start application
const app = new App();
