'use strict';

// ===============================
// 🌍 Variables and Settings
// ===============================
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?q=';
const apiKey = '841cc8459f7d66baff6d5ddb0dd0a21c';
const cityInput = document.querySelector('.search_bar');
const inputBtn = document.querySelector('.search_button');
const suggestionsDiv = document.getElementById('suggestions');
let activeSuggestionIndex = 0;
let citiesList = [];

// ===============================
// 🔧 Helper Functions
// ===============================
const roundValue = (num) => Math.round(num);
const firstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// ===============================
// 🌦 API Requests (Weather and Geolocation)
// ===============================
const fetchWeatherData = async (city) => {
  const cacheKey = `weather_${city}`;
  const cachedData = localStorage.getItem(cacheKey);
  const now = Date.now();

  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
    if (now - parsedData.timestamp < 10 * 60 * 1000) return parsedData.data;
  }

  try {
    const response = await fetch(
      `${apiUrl}${city}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Request error');
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: now }));
    return data;
  } catch (error) {
    console.error('Request error:', error);
    return null;
  }
};

const fetchCityByCoords = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Error fetching city');
    displayWeatherData(data);
  } catch (error) {
    console.error('City loading error:', error);
  }
};

const getUserLocation = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) =>
        fetchCityByCoords(coords.latitude, coords.longitude),
      (error) =>
        alert(
          'Unable to get geolocation. Please enable access in your browser settings.'
        )
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }
};

// ===============================
// 🎨 Weather Data Display Functions
// ===============================
const displayWeatherData = (data) => {
  if (!data) return;
  requestAnimationFrame(() => {
    document.querySelector('.city').textContent = data.name;
    document.querySelector('.weather_temp').textContent = `${roundValue(
      data.main.temp
    )}°C`;
    document.querySelector(
      '.humidity_value'
    ).textContent = `${data.main.humidity}%`;
    document.querySelector('.wind_value').textContent = `${roundValue(
      data.wind.speed
    )}km/h`;
    document.querySelector(
      '.weather_icon'
    ).innerHTML = `<img class="weather_icon" src="./img/${data.weather[0].main.toLowerCase()}.svg" alt="${firstLetter(
      data.weather[0].main
    )}">`;
  });
};

// ===============================
// 🔍 Search and Autocomplete
// ===============================
const fetchSuggestions = (query) => {
  if (!query) return (suggestionsDiv.style.display = 'none');
  const filteredCities = citiesList
    .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 15);
  showSuggestions(filteredCities.map((name) => ({ name: { common: name } })));
};

const showSuggestions = (suggestions) => {
  suggestionsDiv.innerHTML = '';
  const fragment = document.createDocumentFragment();
  suggestions.slice(0, 15).forEach(({ name }) => {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.classList.add('suggestion');
    suggestionDiv.textContent = name.common;
    suggestionDiv.addEventListener('click', () => {
      cityInput.value = name.common;
      suggestionsDiv.style.display = 'none';
    });
    fragment.appendChild(suggestionDiv);
  });
  suggestionsDiv.appendChild(fragment);
  suggestionsDiv.style.display = 'block';
  suggestionsDiv.style.width = `${cityInput.offsetWidth}px`;
};

fetch('./cities.json')
  .then((response) => response.json())
  .then((data) => {
    citiesList = data.map((city) => city.name);
  })
  .catch((error) => console.error('Loading error:', error));

// ===============================
// 🎯 Event Handlers
// ===============================
const handleSearch = () => {
  const city = cityInput.value.trim();
  if (!city) return;
  cityInput.value = '';
  fetchWeatherData(city).then(displayWeatherData);
};

let debounceTimer = null;
inputBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});
cityInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchSuggestions(e.target.value), 200);
});
cityInput.addEventListener('blur', () =>
  setTimeout(() => (suggestionsDiv.style.display = 'none'), 200)
);

// ===============================
// 🚀 On Page Load
// ===============================
document.addEventListener('DOMContentLoaded', getUserLocation);
