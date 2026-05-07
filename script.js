const API_KEY = "446ca591";
const API_URL = "https://www.omdbapi.com/";

const searchForm = document.getElementById("searchForm");
const movieInput = document.getElementById("movieInput");
const yearInput = document.getElementById("yearInput");
const typeSelect = document.getElementById("typeSelect");
const statusElement = document.getElementById("status");
const resultsGrid = document.getElementById("resultsGrid");
const detailsPanel = document.getElementById("detailsPanel");
const resultSummary = document.getElementById("resultSummary");
const clearButton = document.getElementById("clearButton");

const movieCache = new Map();

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const searchState = getSearchState();

  if (!searchState.title) {
    showStatus("Please enter a movie title.", "error");
    return;
  }

  searchMovies(searchState);
});

clearButton.addEventListener("click", function () {
  movieInput.value = "";
  yearInput.value = "";
  typeSelect.value = "";
  resultsGrid.innerHTML = "";
  detailsPanel.innerHTML = "";
  resultSummary.textContent = "Search for a title to begin.";
  showStatus("");
});

window.addEventListener("DOMContentLoaded", function () {
  const savedSearch = loadSearchState();

  if (savedSearch && savedSearch.title) {
    movieInput.value = savedSearch.title;
    yearInput.value = savedSearch.year || "";
    typeSelect.value = savedSearch.type || "";
    searchMovies(savedSearch);
  }
});

function getSearchState() {
  return {
    title: movieInput.value.trim(),
    year: yearInput.value.trim(),
    type: typeSelect.value
  };
}

function saveSearchState(searchState) {
  localStorage.setItem("lastSearchState", JSON.stringify(searchState));
}

function loadSearchState() {
  try {
    const savedState = localStorage.getItem("lastSearchState");

    if (savedState) {
      return JSON.parse(savedState);
    }

    const oldSavedTitle = localStorage.getItem("lastSearch");

    if (oldSavedTitle) {
      return {
        title: oldSavedTitle,
        year: "",
        type: ""
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function searchMovies({ title, year, type }) {
  showStatus("Searching movies...");
  resultsGrid.innerHTML = "";
  detailsPanel.innerHTML = "";
  resultSummary.textContent = "Loading results...";

  try {
    const params = new URLSearchParams({
      apikey: API_KEY,
      s: title
    });

    if (year) params.append("y", year);
    if (type) params.append("type", type);

    const data = await fetchJson(`${API_URL}?${params.toString()}`);

    if (data.Response === "False") {
      resultSummary.textContent = "No matching results.";
      showStatus(data.Error || "No movies found.", "error");
      return;
    }

    saveSearchState({ title, year, type });

    renderResults(data.Search);
    resultSummary.textContent = `${data.Search.length} result(s) shown. Click a card to view full details.`;
    showStatus("Search completed.", "success");

    if (data.Search.length > 0) {
      showMovieDetails(data.Search[0].imdbID);
    }
  } catch (error) {
    resultSummary.textContent = "Search failed.";
    showStatus("Something went wrong while searching. Please try again.", "error");
  }
}

function renderResults(movies) {
  resultsGrid.innerHTML = movies
    .map((movie) => {
      const poster =
        movie.Poster && movie.Poster !== "N/A"
          ? `<img class="poster" src="${movie.Poster}" alt="${movie.Title} poster" />`
          : `<div class="poster-placeholder">No poster available</div>`;

      return `
        <article class="result-card" onclick="showMovieDetails('${movie.imdbID}')">
          ${poster}
          <div class="result-card-body">
            <h3>${escapeHtml(movie.Title)}</h3>
            <div class="result-meta">
              <span>${escapeHtml(movie.Year)}</span>
              <span>${escapeHtml(movie.Type)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function showMovieDetails(imdbID) {
  showStatus("Loading movie details...");

  try {
    const movie = await getMovieDetails(imdbID);

    if (movie.Response === "False") {
      showStatus(movie.Error || "Could not load movie details.", "error");
      return;
    }

    renderMovieDetails(movie);
    showStatus("");
  } catch (error) {
    showStatus("Could not load movie details. Please try again.", "error");
  }
}

async function getMovieDetails(imdbID) {
  if (movieCache.has(imdbID)) {
    return movieCache.get(imdbID);
  }

  const params = new URLSearchParams({
    apikey: API_KEY,
    i: imdbID,
    plot: "full"
  });

  const movie = await fetchJson(`${API_URL}?${params.toString()}`);
  movieCache.set(imdbID, movie);

  return movie;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Network response was not ok.");
  }

  return response.json();
}

function renderMovieDetails(movie) {
  const poster =
    movie.Poster && movie.Poster !== "N/A"
      ? `<img class="movie-poster" src="${movie.Poster}" alt="${movie.Title} poster" />`
      : `<div class="poster-placeholder">No poster available</div>`;

  detailsPanel.innerHTML = `
    <article class="movie-card">
      ${poster}

      <div class="movie-info">
        <h2>${escapeHtml(movie.Title)}</h2>
        <p class="movie-subtitle">
          ${escapeHtml(movie.Year || "N/A")} •
          ${escapeHtml(movie.Runtime || "Runtime unknown")} •
          ${escapeHtml(movie.Type || "N/A")}
        </p>

        <div class="badges">
          <span class="badge">IMDb: ${escapeHtml(movie.imdbRating || "N/A")}</span>
          <span class="badge">${escapeHtml(movie.Rated || "Not rated")}</span>
          <span class="badge">${escapeHtml(movie.Language || "Language N/A")}</span>
        </div>

        <div class="details-list">
          <p class="detail"><strong>Genre:</strong> ${escapeHtml(movie.Genre || "N/A")}</p>
          <p class="detail"><strong>Director:</strong> ${escapeHtml(movie.Director || "N/A")}</p>
          <p class="detail"><strong>Writer:</strong> ${escapeHtml(movie.Writer || "N/A")}</p>
          <p class="detail"><strong>Actors:</strong> ${escapeHtml(movie.Actors || "N/A")}</p>
          <p class="detail"><strong>Released:</strong> ${escapeHtml(movie.Released || "N/A")}</p>
          <p class="detail"><strong>Awards:</strong> ${escapeHtml(movie.Awards || "N/A")}</p>
        </div>

        <p class="plot">${escapeHtml(movie.Plot || "Plot not available.")}</p>
      </div>
    </article>
  `;
}

function showStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.className = type ? `status ${type}` : "status";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}