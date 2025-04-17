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

// const forecastCard = document.querySelector('.hourly_forecast_card');
const hourlyCards = document.querySelectorAll('.hourly_forecast_card');
// const forecastCardTime = document.querySelector('.hourly_forecast_card_time');
// const forecastCardTemp = document.querySelector('.hourly_forecast_card_temp');
// const forecastCardIcon = document.querySelector('.hourly_forecast_card_icon');

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
    fetchDailyForecast(lat, lon, 7);
  } catch (error) {
    console.error('City loading error:', error);
  }
};

const fetchDailyForecast = async (lat, lon, cnt) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&cnt=${cnt}&units=metric&appid=${apiKey}`
    );
    const data = await response.json();
    if (!response.ok) throw new Error('Error fetching city');
    displayDailyForecast(data);
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

const displayDailyForecast = (data) => {
  if (!data) return;
  console.log(data);
  console.log(hourlyCards);

  requestAnimationFrame(() => {
    hourlyCards.forEach((card) => {
      const index = Number(card.dataset.hourlyIndex);
      const weatherData = data.list[index];
      const timezoneOffset = data.city.timezone; // in seconds

      if (!weatherData) return;

      const timeEl = card.querySelector('.hourly_forecast_card_time');
      const iconEl = card.querySelector('.hourly_forecast_card_icon');
      const tempEl = card.querySelector('.hourly_forecast_card_temp');

      // Use dt (UNIX UTC timestamp) and apply city timezone offset
      const utcTimestamp = weatherData.dt; // in seconds
      const localTimestamp = (utcTimestamp + timezoneOffset) * 1000;
      const localDate = new Date(localTimestamp);

      const localTime = localDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const temperature = weatherData.main.temp;

      timeEl.textContent = localTime;
      iconEl.innerHTML = `<img src="./img/${weatherData.weather[0].main.toLowerCase()}.svg" alt="${firstLetter(
        weatherData.weather[0].description
      )}" />`;
      tempEl.textContent = `${roundValue(temperature)}°C`;
    });
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

cityInput.addEventListener('keydown', (e) => {
  const suggestions = suggestionsDiv.querySelectorAll('.suggestion');

  // Если дропдаун закрыт — не реагируем на стрелки
  if (suggestions.length === 0 || suggestionsDiv.style.display === 'none')
    return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (activeSuggestionIndex < suggestions.length - 1) {
      activeSuggestionIndex++;
      updateActiveSuggestion(suggestions);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (activeSuggestionIndex > 0) {
      activeSuggestionIndex--;
      updateActiveSuggestion(suggestions);
    } else {
      activeSuggestionIndex = -1;
      cityInput.value = ''; // Очищаем инпут при возврате на пустое поле
    }
  } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
    e.preventDefault();
    cityInput.value = suggestions[activeSuggestionIndex].textContent;
    suggestionsDiv.style.display = 'none'; // Закрываем дропдаун
  }
});

const updateActiveSuggestion = (suggestions) => {
  suggestions.forEach((el, index) => {
    el.classList.toggle('active', index === activeSuggestionIndex);
  });

  if (activeSuggestionIndex >= 0) {
    cityInput.value = suggestions[activeSuggestionIndex].textContent;
  }
};

const showSuggestions = (suggestions) => {
  suggestionsDiv.innerHTML = '';
  activeSuggestionIndex = -1; // Сброс при новом вводе
  const fragment = document.createDocumentFragment();

  suggestions.slice(0, 15).forEach(({ name }, index) => {
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

// Close drowdown on blur
cityInput.addEventListener('blur', () => {
  setTimeout(() => {
    suggestionsDiv.style.display = 'none';
    activeSuggestionIndex = -1;
  }, 200);
});

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

  fetchWeatherData(city).then((data) => {
    if (!data) return;
    const { lat, lon } = data.coord;
    fetchCityByCoords(lat, lon);
  });
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
// 🛝 Slider
// ===============================

const swiper = new Swiper('.slider-wrapper', {
  // Optional parameters
  loop: false,
  slidesPerView: 1,

  // If we need pagination
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  // Navigation arrows
  navigation: {
    nextEl: '.custom-next',
    prevEl: '.custom-prev',
  },

  // And if we need scrollbar
  scrollbar: {
    el: '.swiper-scrollbar',
  },
});

// ===============================
// 🚀 On Page Load
// ===============================
document.addEventListener('DOMContentLoaded', getUserLocation);
