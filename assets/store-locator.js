
const SHEET_ID = "1plTSM4rgcDhEkhUDCA0kPUitVRTxUJyOwaHsESk0U2w";
const SHEET_NAME = "Fitflop- Store Locator";
const API_KEY = "AIzaSyBaEJ_lMBD6APWT__GFlNr_rMpL_MtE1UQ";

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;


document.addEventListener("DOMContentLoaded", function () {
  initStoreLocator();
});

async function initStoreLocator() {
  const input = document.getElementById("storeSearch");
  const countLabel = document.getElementById("storeCount");
  const storeContainer = document.getElementById("storeCards");
  const template = document.getElementById("storeCardTemplate");
  const suggestionBox = document.getElementById("suggestionBox");

  const noResultsMessage = document.createElement("div");
  noResultsMessage.textContent = "No stores are available in this location.";
  noResultsMessage.classList.add("no-results-message");
  noResultsMessage.style.display = "none";
  storeContainer.appendChild(noResultsMessage);

  if (countLabel) countLabel.style.display = "none";

  const storeSuggestions = new Map();
  const cards = [];

  function normalize(str) {
    return str.toLowerCase().replace(/\s+/g, "");
  }

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const rows = data.values;
    const headers = rows[0];
    const records = rows.slice(1);

    records.forEach(row => {
      const rowData = headers.reduce((obj, key, i) => {
        obj[key.trim()] = row[i] ? row[i].trim() : "";
        return obj;
      }, {});

      const { 
        "Store Name": salonName, 
        State: state, 
        City: city, 
        Address: address, 
        "Get Directions": directionsLink, 
        Pincode: pincode 
      } = rowData;

      const clone = template.content.cloneNode(true);
      clone.querySelector(".store-name").textContent = salonName;
      clone.querySelector(".store-city").textContent = city;
      clone.querySelector(".store-state").textContent = state;
      clone.querySelector(".store-address").textContent = address;

      const directionsAnchor = clone.querySelector(".store-directions a");
      if (directionsLink) {
        directionsAnchor.href = directionsLink.trim();
        directionsAnchor.target = "_blank";
      } else {
        directionsAnchor.href = "#";
      }

      const cardEl = clone.querySelector(".store-card");
      cardEl.setAttribute("data-state", state);
      cardEl.setAttribute("data-city", city);
      cardEl.setAttribute("data-pincode", pincode || "");

      setTimeout(() => cardEl.classList.add("loaded"), 50);

      storeContainer.appendChild(clone);
      cards.push(cardEl);

      // Suggestions
      const cityStateKey = normalize(`${city}${state}`);
      if (!storeSuggestions.has(cityStateKey)) {
        storeSuggestions.set(cityStateKey, { suggestion: `${city}, ${state}`, city, state });
      }
      if (pincode && !storeSuggestions.has(pincode)) {
        storeSuggestions.set(pincode, { suggestion: pincode, pincode });
      }
    });

    function filterCards(term) {
      const normalizedTerm = normalize(term);
      let found = 0;

      cards.forEach(card => {
        const city = normalize(card.getAttribute("data-city") || "");
        const state = normalize(card.getAttribute("data-state") || "");
        const pincode = normalize(card.getAttribute("data-pincode") || "");
        const combined = `${city}${state}${pincode}`;

        const isMatch = combined.includes(normalizedTerm);
        card.style.display = isMatch ? "flex" : "none";

        if (isMatch) found++;
      });

      noResultsMessage.style.display = found ? "none" : "block";
      if (countLabel) countLabel.textContent = `${found} Store${found !== 1 ? "s" : ""} found`;
    }

    function showAllCards() {
      cards.forEach(card => (card.style.display = "flex"));
      noResultsMessage.style.display = "none";
      if (countLabel) countLabel.style.display = "none";
    }

    function showSuggestions(searchTerm) {
      suggestionBox.innerHTML = "";
      if (!searchTerm) return;

      const normalizedSearch = normalize(searchTerm);
      const matches = Array.from(storeSuggestions.values()).filter(item =>
        normalize(item.suggestion).includes(normalizedSearch)
      );

      matches.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("suggestion-place");
        div.textContent = item.suggestion;
        div.addEventListener("click", () => {
          input.value = item.suggestion;
          suggestionBox.innerHTML = "";
          if (item.city && item.state) filterCards(`${item.city} ${item.state}`);
          else if (item.pincode) filterCards(item.pincode);
        });
        suggestionBox.appendChild(div);
      });
    }

    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const term = input.value.trim();
        if (!term) {
          showAllCards();
          suggestionBox.innerHTML = "";
          return;
        }
        showSuggestions(term);
        filterCards(term);
      }, 150);
    });

    // Keyboard navigation
    let selectedIndex = -1;
    let suggestionItems = [];

    input.addEventListener("keydown", e => {
      suggestionItems = Array.from(suggestionBox.querySelectorAll(".suggestion-place"));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (selectedIndex < suggestionItems.length - 1) selectedIndex++;
        updateHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (selectedIndex > 0) selectedIndex--;
        updateHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestionItems[selectedIndex]) {
          suggestionItems[selectedIndex].click();
        }
      }
    });

    function updateHighlight() {
      suggestionItems.forEach((item, index) => {
        item.classList.toggle("highlighted", index === selectedIndex);
      });
    }

    document.addEventListener("click", e => {
      if (!input.contains(e.target) && !suggestionBox.contains(e.target)) {
        suggestionBox.innerHTML = "";
      }
    });
  } catch (err) {
    console.error("Error fetching store data:", err);
  }
}
