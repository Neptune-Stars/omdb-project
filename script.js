const API_KEY = "446ca591";
const API_URL = "https://www.omdbapi.com/";

const searchForm = document.getElementById("searchForm");
const movieInput = document.getElementById("movieInput");
const statusElement = document.getElementById("status");
const movieResult = document.getElementById("movieResult");

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const movieTitle = movieInput.value.trim();

  if (!movieTitle) {
    showStatus("Please enter a movie name.", true);
    return;
  }

  searchMovie(movieTitle);
});

window.addEventListener("DOMContentLoaded", function () {
  const lastSearch = localStorage.getItem("lastSearch");

  if (lastSearch) {
    movieInput.value = lastSearch;
    searchMovie(lastSearch);
  }
});

async function searchMovie(title) {
  showStatus("Searching...");
  movieResult.innerHTML = "";

  try {
    const movie = await fetchMovie(title);

    if (movie.Response === "False") {
      showStatus(movie.Error || "Movie not found.", true);
      return;
    }

    localStorage.setItem("lastSearch", title);
    renderMovie(movie);
    showStatus("");
  } catch (error) {
    showStatus("Something went wrong. Please try again.", true);
  }
}

async function fetchMovie(title) {
  const requestUrl = `${API_URL}?apikey=${API_KEY}&t=${encodeURIComponent(title)}`;

  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error("Network response was not ok.");
  }

  return response.json();
}

function renderMovie(movie) {
  const posterContent =
    movie.Poster && movie.Poster !== "N/A"
      ? `<img class="movie-poster" src="${movie.Poster}" alt="${movie.Title} poster" />`
      : `<div class="placeholder-poster">No poster available</div>`;

  movieResult.innerHTML = `
    <article class="movie-card">
      ${posterContent}

      <div class="movie-info">
        <h2>${movie.Title}</h2>
        <p class="meta">${movie.Year} • ${movie.Runtime || "Runtime unknown"}</p>

        <p class="detail"><strong>Genre:</strong> ${movie.Genre || "N/A"}</p>
        <p class="detail"><strong>Director:</strong> ${movie.Director || "N/A"}</p>
        <p class="detail"><strong>Actors:</strong> ${movie.Actors || "N/A"}</p>
        <p class="detail"><strong>IMDb Rating:</strong> ${movie.imdbRating || "N/A"}</p>
        <p class="detail"><strong>Plot:</strong> ${movie.Plot || "N/A"}</p>
      </div>
    </article>
  `;
}

function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.className = isError ? "status error" : "status";
}