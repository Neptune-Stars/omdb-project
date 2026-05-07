const PROXY_API_URL = "https://omdb-proxy-api.vercel.app/api";

const searchForm = document.getElementById("searchForm");
const movieInput = document.getElementById("movieInput");
const yearInput = document.getElementById("yearInput");
const typeSelect = document.getElementById("typeSelect");
const statusElement = document.getElementById("status");
const resultsGrid = document.getElementById("resultsGrid");
const detailsPanel = document.getElementById("detailsPanel");
const resultSummary = document.getElementById("resultSummary");
const clearButton = document.getElementById("clearButton");
const loadMoreButton = document.getElementById("loadMoreButton");

const movieCache = new Map();

let currentSearchState = null;
let currentPage = 1;
let totalResults = 0;
let loadedResults = 0;

loadMoreButton.addEventListener("click", function () {
  if (!currentSearchState) return;

  currentPage += 1;
  searchMovies(currentSearchState, true);
});

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
  loadMoreButton.classList.add("hidden");
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

async function searchMovies({ title, year, type }, append = false) {
  showStatus(append ? "Loading more results..." : "Searching movies...");

  if (!append) {
    currentPage = 1;
    currentSearchState = { title, year, type };
    resultsGrid.innerHTML = "";
    detailsPanel.innerHTML = "";
    resultSummary.textContent = "Loading results...";
    loadMoreButton.classList.add("hidden");
  }

  try {
    const params = new URLSearchParams({
      title,
      page: currentPage
    });

    if (year) params.append("year", year);
    if (type) params.append("type", type);

    const data = await fetchJson(`${PROXY_API_URL}/search?${params.toString()}`);

    if (!data.success) {
      if (!append) {
        resultSummary.textContent = "No matching results.";
      }

      showStatus(data.error || "No movies found.", "error");
      loadMoreButton.classList.add("hidden");
      return;
    }

    saveSearchState({ title, year, type });

    renderResults(data.results, append);

    totalResults = data.totalResults;
    loadedResults = resultsGrid.children.length;

    resultSummary.textContent = `${loadedResults} of ${totalResults} result(s) shown. Click a card to view full details.`;

    if (loadedResults < totalResults) {
      loadMoreButton.classList.remove("hidden");
    } else {
      loadMoreButton.classList.add("hidden");
    }

    showStatus("Search completed.", "success");

    if (!append && data.results.length > 0) {
      showMovieDetails(data.results[0].id);
    }
  } catch (error) {
    resultSummary.textContent = append ? resultSummary.textContent : "Search failed.";
    showStatus("Something went wrong while searching. Please try again.", "error");
  }
}

function renderResults(movies, append = false) {
  const html = movies
    .map((movie) => {
      const poster =
        movie.poster
          ? `<img class="poster" src="${movie.poster}" alt="${escapeHtml(movie.title)} poster" />`
          : `<div class="poster-placeholder">No poster available</div>`;

      return `
        <article class="result-card" onclick="showMovieDetails('${movie.id}')">
          ${poster}
          <div class="result-card-body">
            <h3>${escapeHtml(movie.title)}</h3>
            <div class="result-meta">
              <span>${escapeHtml(movie.year)}</span>
              <span>${escapeHtml(movie.type)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (append) {
    resultsGrid.insertAdjacentHTML("beforeend", html);
  } else {
    resultsGrid.innerHTML = html;
  }
}

async function showMovieDetails(imdbID) {
  showStatus("Loading movie details...");

  try {
    const movie = await getMovieDetails(imdbID);
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
    id: imdbID
  });

  const data = await fetchJson(`${PROXY_API_URL}/movie?${params.toString()}`);

  if (!data.success) {
    throw new Error(data.error || "Movie details could not be loaded.");
  }

  movieCache.set(imdbID, data.movie);

  return data.movie;
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
    movie.poster
      ? `<img class="movie-poster" src="${movie.poster}" alt="${escapeHtml(movie.title)} poster" />`
      : `<div class="poster-placeholder">No poster available</div>`;

  detailsPanel.innerHTML = `
    <article class="movie-card">
      ${poster}

      <div class="movie-info">
        <h2>${escapeHtml(movie.title)}</h2>
        <p class="movie-subtitle">
          ${escapeHtml(movie.year || "N/A")} •
          ${escapeHtml(movie.runtime || "Runtime unknown")} •
          ${escapeHtml(movie.type || "N/A")}
        </p>

        <div class="badges">
          <span class="badge">IMDb: ${escapeHtml(movie.imdbRating || "N/A")}</span>
          <span class="badge">${escapeHtml(movie.rated || "Not rated")}</span>
          <span class="badge">${escapeHtml(movie.language || "Language N/A")}</span>
        </div>

        <div class="details-list">
          <p class="detail"><strong>Genre:</strong> ${escapeHtml(movie.genre || "N/A")}</p>
          <p class="detail"><strong>Director:</strong> ${escapeHtml(movie.director || "N/A")}</p>
          <p class="detail"><strong>Writer:</strong> ${escapeHtml(movie.writer || "N/A")}</p>
          <p class="detail"><strong>Actors:</strong> ${escapeHtml(movie.actors || "N/A")}</p>
          <p class="detail"><strong>Released:</strong> ${escapeHtml(movie.released || "N/A")}</p>
          <p class="detail"><strong>Awards:</strong> ${escapeHtml(movie.awards || "N/A")}</p>
        </div>

        <p class="plot">${escapeHtml(movie.plot || "Plot not available.")}</p>
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