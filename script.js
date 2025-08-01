// Konfigurasi URL dan cache
const API_CONFIG = {
	quran: {
		url: "https://vickyserver.my.id/server/api/books/quran",
		cacheKey: "quran_data_cache___"
	},
	hadith: {
		url: "https://vickyserver.my.id/server/api/books/hadith-book",
		cacheKey: "hadith_data_cache___"
	},
	asmaulHusna: {
		url: "https://vickyserver.my.id/server/api/books/asmaul-husna",
		cacheKey: "asmaul_husna_cache___"
	},
	prophetStories: {
		url: "https://vickyserver.my.id/server/api/books/prophet-stories",
		cacheKey: "prophet_stories_cache___"
	},
	search: { url: "https://vickyserver.my.id/server/api/search" },
	cacheExpiry: 604800000 // 7 hari
};

// State aplikasi
const appState = {
	quranData: null,
	hadithCollections: null,
	currentSurah: null,
	currentCollection: null,
	currentQuery: null,
	loadingError: false
};

// Elemen DOM
const domElements = {
	views: [
		"mainShelf",
		"surahList",
		"surahDetail",
		"hadithCollections",
		"hadithList",
		"hadithPagination",
		"asmaulHusnaList",
		"asmaDetail",
		"prophetStoriesList",
		"prophetDetail"
	],
	backButtons: [
		"backToShelf",
		"backToSurah",
		"backToHadithList",
		"backToHadithBook",
		"backFromSearch",
		"backFromAsma",
		"backToAsmaList",
		"backFromProphets",
		"backToProphetsList"
	],
	searchInputs: [
		"searchInput",
		"searchGlobalHadithInput",
		"searchHadithInput",
		"searchInSurahInput",
		"searchAsmaInput",
		"searchProphetInput"
	]
};

const viewHandlers = {
	mainShelf: () => {},
	surahList: () => {
		showElement("backToShelf");
		!appState.quranData && !appState.loadingError && fetchQuranData();
		resetInput("searchInput");
	},
	surahDetail: options => {
		showElement("backToSurah");
		options.surah && renderSurahDetail(options.surah, options.page || 1);
		resetInput("searchInSurahInput");
	},
	hadithCollections: () => {
		showElement("backToShelf");
		showElement("searchGlobalHadithInput", true);
		resetInput("searchGlobalHadithInput");
		fetchHadithData();
	},
	hadithList: options => {
		showElement("hadithPagination");
		showElement("backToHadithList");
		showElement("searchHadithInput", true);
		resetInput("searchHadithInput");
		!options.isSearch &&
			options.collection &&
			renderHadithList(options.collection.id, options.page || 1);
	},
	asmaulHusnaList: () => {
		showElement("backFromAsma");
		showElement("searchAsmaInput", true);
		resetInput("searchAsmaInput");
		fetchAsmaulHusna();
	},
	asmaDetail: options => {
		showElement("backToAsmaList");
		options.id && showAsmaDetail(options.id);
	},
	prophetStoriesList: () => {
		showElement("backFromProphets");
		showElement("searchProphetInput", true);
		resetInput("searchProphetInput");
		fetchProphetStories();
	},
	prophetDetail: options => {
		showElement("backToProphetsList");
		options.id && showProphetDetail(options.id);
	}
};

// Fungsi utilitas DOM
function hideElement(id, isParent = false) {
	const el = document.getElementById(id);
	if (!el) return;
	if (isParent && el.parentElement) el.parentElement.style.display = "none";
	else el.style.display = "none";
}

function showElement(id, isParent = false) {
	const el = document.getElementById(id);
	if (!el) return;
	if (isParent && el.parentElement) el.parentElement.style.display = "block";
	else el.style.display = "block";
}

function toggleElement(id, show) {
	const el = document.getElementById(id);
	if (el) el.style.display = show ? "flex" : "none";
}

function clearContainer(id) {
	const el = document.getElementById(id);
	if (el) el.innerHTML = "";
}

function resetInput(inputId) {
	const input = document.getElementById(inputId);
	if (input) input.value = "";
}

function resetSearchInputs() {
	domElements.searchInputs.forEach(id => {
		const input = document.getElementById(id);
		if (input) input.value = "";
	});
}

function errorMessage(error, retryFn = "") {
	return `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${error.message || "Terjadi kesalahan"}</p>
            ${
							retryFn
								? `<button class="nav-btn" onclick="${retryFn}"><i class="fas fa-redo"></i> Coba Lagi</button>`
								: ""
						}
        </div>
    `;
}

// Inisialisasi tema
function initTheme() {
	const theme = localStorage.getItem("theme") || "dark";
	document.documentElement.setAttribute("data-theme", theme);
	const icon = document.querySelector("#themeToggle i");
	if (icon) icon.classList.toggle("fa-sun", theme === "light");
}

// Manajemen tampilan
function showView(viewId, options = {}) {
	// Sembunyikan semua view dan tombol
	domElements.views.forEach(id => hideElement(id));
	domElements.backButtons.forEach(id => hideElement(id));

	// Sembunyikan input pencarian
	domElements.searchInputs.forEach(id => hideElement(id, true));

	// Tampilkan view yang diminta
	showElement(viewId);

	if (viewId === "mainShelf") resetSearchInputs();

	// Eksekusi handler untuk view
	viewHandlers[viewId]?.(options);

	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fetch data dengan caching
async function fetchData(type, cacheKey, processData) {
	const [loadingId, containerId] =
		type === "quran"
			? ["surahLoading", "surahBooks"]
			: ["hadithLoading", "hadithCollectionsBooks"];

	toggleElement(loadingId, true);
	clearContainer(containerId);

	try {
		let data = await CacheManager.getItem(cacheKey);
		if (data) return processData(data);

		const res = await fetch(API_CONFIG[type].url);
		if (!res.ok) throw new Error(`Gagal mengambil data ${type}`);

		data = await res.json();
		await CacheManager.setItem(cacheKey, data);
		processData(type === "hadith" ? data || [] : data);
	} catch (error) {
		console.error(`Error: ${error}`);
		appState.loadingError = true;

		const fallback = await CacheManager.getItem(cacheKey, true);
		if (fallback) processData(fallback);
		else {
			const container = document.getElementById(containerId);
			if (container) {
				container.innerHTML = errorMessage(
					error,
					type === "quran" ? "fetchQuranData" : "fetchHadithData"
				);
			}
		}
	} finally {
		toggleElement(loadingId, false);
	}
}

// Fetch data Al-Quran
function fetchQuranData() {
	fetchData("quran", API_CONFIG.quran.cacheKey, data => {
		appState.quranData = data;
		renderSurahBooks();
	});
}

// Fetch data Hadits
function fetchHadithData() {
	fetchData("hadith", API_CONFIG.hadith.cacheKey, data => {
		appState.hadithCollections = data;
		renderHadithCollections();
	});
}

// Render daftar surah
function renderSurahBooks() {
	const container = document.getElementById("surahBooks");
	if (!container || !appState.quranData) return;

	container.innerHTML = [...appState.quranData]
		.sort((a, b) => a.number - b.number)
		.map(
			surah => `
            <div class="book small surah-book-item" data-number="${surah.number}">
                <div class="book-image">
                    <i class="fas fa-book"></i>
                    <div class="surah-number-badge">${surah.number}</div>
                </div>
                <div class="book-title">
                    <h3>${surah.name_latin}</h3>
                    <p>${surah.number_of_verses} Ayat • ${surah.place}</p>
                </div>
            </div>
        `
		)
		.join("");

	container.addEventListener("click", e => {
		const book = e.target.closest(".surah-book-item");
		if (!book) return;

		const surah = appState.quranData.find(
			s => s.number === parseInt(book.dataset.number)
		);
		surah && showView("surahDetail", { surah });
	});
}

// Render detail surah
async function renderSurahDetail(surah, page = 1) {
	const container = document.getElementById("surahDetail");

	if (!container) return;

	container.innerHTML = '<div class="loading">Memuat ayat...</div>';

	try {
		const data = await fetchVersesBySurah(surah.number, page);
		if (!data?.data?.length) throw new Error("Data ayat tidak valid");

		container.innerHTML = `
            <div class="surah-header">
                <h2>${surah.name}</h2>
                <h3>${surah.name_latin}</h3>
                <div class="surah-meta">
                    <div>${surah.number_of_verses} Ayat</div>
                    <div>${surah.place}</div>
                    <div>Arti: ${surah.meaning}</div>
                </div>
                <div class="surah-description"><p>${surah.description}</p></div>
                <div class="search-container">
                    <input type="text" id="searchInSurahInput" placeholder="Cari dalam surah..." class="search-box">
                    <div class="search-icon"><i class="fas fa-search"></i></div>
                </div>
            </div>
            <div class="verses-container">${data.data
							.map(v => renderVerseItem(v, surah))
							.join("")}</div>
            <div id="surahDetailPaginationContainer"></div>
        `;

		const paginationContainer = document.getElementById(
			"surahDetailPaginationContainer"
		);
		if (paginationContainer && paginationModule.render && data.last_page > 1) {
			paginationModule.render(paginationContainer, data, url =>
				renderSurahDetail(surah, url ? parseInt(url.match(/page=(\d+)/)[1]) : 1)
			);
		}

		document
			.getElementById("searchInSurahInput")
			?.addEventListener("keypress", e => {
				if (e.key === "Enter")
					searchInSurah(surah.number, e.target.value.trim());
			});
	} catch (error) {
		container.innerHTML = errorMessage(
			error,
			`renderSurahDetail(${JSON.stringify(surah)}, ${page})`
		);
	}
}

// Render item ayat
function renderVerseItem(verse, surah) {
	const audio = verse.audio?.["05"] || "";
	const share = encodeURIComponent(
		`Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`
	);

	return `
        <div class="verse-item">
            <div class="verse-header">
                <div class="verse-number">${verse.verse_number}</div>
                <div class="verse-controls">
                    <div><button onclick="playAudio('${audio}')"><i class="fas fa-play"></i></button></div>
                    <div><button class="share-btn" data-content="${share}"><i class="fas fa-share-alt"></i></button></div>
                </div>
            </div>
            <div class="arabic-text">${verse.arabic_text}</div>
            <div class="latin-text">${verse.latin_text}</div>
            <div class="translation-text">${verse.translation}</div>
        </div>
    `;
}

// Fetch ayat per surah
async function fetchVersesBySurah(surahNumber, page = 1) {
	const cacheKey = `quran_verses_${surahNumber}_${page}`;
	const url = `${API_CONFIG.quran.url}/${surahNumber}/verses?page=${page}`;

	try {
		const cached = await CacheManager.getItem(cacheKey);
		if (cached) return cached;

		const res = await fetch(url);
		if (!res.ok) throw new Error("Gagal mengambil data ayat");

		const data = await res.json();
		if (!data?.data) throw new Error("Data ayat tidak valid");

		await CacheManager.setItem(cacheKey, data);
		return data;
	} catch (error) {
		console.error(`Error fetching verses: ${error}`);
		throw error;
	}
}

// Render koleksi hadits
function renderHadithCollections() {
	const container = document.getElementById("hadithCollectionsBooks");
	if (!container || !appState.hadithCollections) return;

	container.innerHTML = appState.hadithCollections
		.map(
			collection => `
        <div class="book small" data-id="${collection.id}">
            <div class="book-image">
                <i class="fas fa-book"></i>
                <div class="surah-number-badge">${collection.id
									.charAt(0)
									.toUpperCase()}</div>
            </div>
            <div class="book-title">
                <h3>${collection.name}</h3>
                <p>${collection.total_hadiths} Hadits</p>
            </div>
        </div>
    `
		)
		.join("");

	container.addEventListener("click", e => {
		const book = e.target.closest(".book");
		if (!book) return;

		const collection = appState.hadithCollections.find(
			c => c.id === book.dataset.id
		);
		collection && showView("hadithList", { collection });
	});
}

// Render daftar hadits
async function renderHadithList(collectionId, page = 1) {
	const loadingEl = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");
	const paginationContainer = document.getElementById("hadithPagination");
	const headerContainer = document.getElementById("hadithHeaderContainer");

	toggleElement("hadithLoading", true);
	clearContainer("hadithBooks");
	clearContainer("hadithPagination");
	clearContainer("hadithHeaderContainer");

	try {
		const data = await fetchHadithsByBook(collectionId, page);
		if (!data?.hadiths?.data) throw new Error("Data hadits tidak valid");

		appState.currentCollection = { id: collectionId, name: data.name };

		// Render header
		if (headerContainer) {
			headerContainer.innerHTML = `
                <div class="surah-header">
                    <h2>${data.name}</h2>
                    <div class="surah-meta">
                        <div>Total Hadits: ${data.total_hadiths}</div>
                        <div>Halaman ${data.hadiths.current_page} dari ${data.hadiths.last_page}</div>
                    </div>
                </div>
            `;
		}

		// Render hadits
		if (hadithsContainer) {
			hadithsContainer.innerHTML = data.hadiths.data
				.map(hadith => renderHadithItem(hadith, data))
				.join("");
		}

		const searchInput = document.getElementById("searchHadithInput");
		if (searchInput) {
			searchInput.addEventListener("keypress", e => {
				if (e.key === "Enter") {
					const query = e.target.value.trim();

					if (query.length >= 3 && appState.currentCollection) {
						searchHadithsInBook(appState.currentCollection.id, query);
					}
				}
			});

			// Juga untuk ikon pencarian
			const searchIcon = searchInput.nextElementSibling?.querySelector("i");
			if (searchIcon) {
				searchIcon.addEventListener("click", () => {
					const query = searchInput.value.trim();
					if (query.length >= 3 && appState.currentCollection) {
						searchHadithsInBook(appState.currentCollection.id, query);
					}
				});
			}
		}

		// Render paginasi
		if (paginationContainer && paginationModule.render) {
			paginationModule.render(paginationContainer, data.hadiths, url => {
				const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
				renderHadithList(collectionId, newPage);
			});
		}
	} catch (error) {
		console.error("Error rendering hadith list:", error);
		if (hadithsContainer) {
			hadithsContainer.innerHTML = errorMessage(
				error,
				`renderHadithList('${collectionId}', ${page})`
			);
		}
	} finally {
		toggleElement("hadithLoading", false);
	}
}

// Render item hadits
function renderHadithItem(hadith, collection) {
	const share = encodeURIComponent(
		`${collection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`
	);

	return `
        <div class="verse-item">
            <div class="verse-header">
                <div class="verse-number">${hadith.number}</div>
                <div class="verse-controls">
                    <div class="verse-share">
                        <button class="share-btn" data-content="${share}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="arabic-text">${hadith.arabic}</div>
            <div class="translation-text">
                <strong>Terjemahan:</strong>
                <p>${hadith.translation}</p>
            </div>
        </div>
    `;
}

// Fetch hadits per kitab
async function fetchHadithsByBook(bookId, page = 1) {
	try {
		const res = await fetch(
			`${API_CONFIG.hadith.url}/${bookId}/hadiths?page=${page}`
		);
		if (!res.ok) throw new Error("Gagal mengambil data hadits");
		return await res.json();
	} catch (error) {
		console.error("Error fetching hadiths:", error);
		throw error;
	}
}

// Fungsi utilitas
function playAudio(url) {
	if (url) new Audio(url).play().catch(console.log);
}

function highlightMatches(text, query) {
	if (!query || !text) return text;
	const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
	return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shareContent(content) {
	if (!content) return;
	const text = decodeURIComponent(content);

	if (navigator.share) {
		navigator
			.share({
				title: "Perpustakaan Digital",
				text
			})
			.catch(console.log);
	} else {
		navigator.clipboard
			.writeText(text)
			.then(() => alert("Teks disalin!"))
			.catch(console.error);
	}
}

// Event listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
	initTheme();

	// Toggle tema
	document.getElementById("themeToggle")?.addEventListener("click", () => {
		const theme =
			document.documentElement.getAttribute("data-theme") === "dark"
				? "light"
				: "dark";
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);

		const icon = document.querySelector("#themeToggle i");
		if (icon) icon.classList.toggle("fa-sun", theme === "light");
	});

	// Navigasi
	const navHandlers = {
		quranBook: () => showView("surahList"),
		hadithBook: () => showView("hadithCollections"),
		asmaulHusnaBook: () => showView("asmaulHusnaList"),
		prophetStoriesBook: () => showView("prophetStoriesList"),
		backToShelf: () => showView("mainShelf"),
		backToSurah: () => showView("surahList"),
		backToHadithList: () => showView("hadithCollections"),
		backToAsmaList: () => showView("asmaulHusnaList"),
		backToProphetsList: () => showView("prophetStoriesList"),
		backToHadithBook: () =>
			appState.currentCollection &&
			showView("hadithList", { collection: appState.currentCollection }),
		backFromAsma: () => showView("mainShelf"),
		backFromProphets: () => showView("mainShelf")
	};

	Object.entries(navHandlers).forEach(([id, handler]) => {
		document.getElementById(id)?.addEventListener("click", handler);
	});

	// Pencarian
	const searchHandlers = {
		searchInput: filterSurahs,
		searchGlobalHadithInput: searchHadithsGlobal,
		searchHadithInput: q =>
			appState.currentCollection &&
			searchHadithsInBook(appState.currentCollection.id, q),
		searchInSurahInput: q =>
			appState.currentSurah && searchInSurah(appState.currentSurah.number, q)
	};

	Object.entries(searchHandlers).forEach(([id, handler]) => {
		const input = document.getElementById(id);
		if (!input) return;

		const search = () => {
			const query = input.value.trim();
			if (query.length >= 3) handler(query);
		};

		input.addEventListener("keypress", e => e.key === "Enter" && search());
		input.nextElementSibling?.addEventListener("click", search);
	});

	// Tombol kembali ke atas
	const backToTopBtn = document.getElementById("backToTopBtn");
	if (backToTopBtn) {
		window.addEventListener("scroll", () => {
			backToTopBtn.classList.toggle("show", window.scrollY > 300);
		});

		backToTopBtn.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	// Berbagi konten
	document.addEventListener("click", e => {
		const btn = e.target.closest(".share-btn");
		if (btn) shareContent(btn.dataset.content);
	});
});

// Fungsi pencarian
async function searchInSurah(surahId, query, page = 1) {
	const container = document.getElementById("surahDetail");
	if (!container) return;

	container.innerHTML = '<div class="loading">Memuat hasil pencarian...</div>';

	try {
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=quran&surah_id=${surahId}&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Pencarian dalam surah gagal");

		const data = await res.json();
		renderSearchInSurahResults(data.quran, query, surahId);
	} catch (error) {
		console.error("Error searching in surah:", error);
		if (container) {
			container.innerHTML = errorMessage(error);
		}
	}
}

function renderSearchInSurahResults(quran, query, surahId) {
	const container = document.getElementById("surahDetail");
	if (!container) return;

	if (!quran?.data?.length) {
		container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-info-circle"></i>
                <p>Tidak ditemukan hasil pencarian untuk "${query}" dalam surah ini</p>
            </div>
        `;
		return;
	}

	const surah = appState.quranData?.find(s => s.number === surahId);
	if (!surah) {
		container.innerHTML = errorMessage(new Error("Data surah tidak ditemukan"));
		return;
	}

	let html = `
        <div class="search-header">
            <h2>Hasil Pencarian: "${query}" dalam ${surah.name_latin}</h2>
            <div class="surah-meta">
                <div>Ditemukan ${quran.total} hasil</div>
                <div>Halaman ${quran.current_page} dari ${quran.last_page}</div>
            </div>
        </div>
        <div class="verses-container">
    `;

	quran.data.forEach(verse => {
		const audio = verse.audio?.["05"] || "";
		const share = encodeURIComponent(
			`Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`
		);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-number">${verse.verse_number}</div>
                    <div class="verse-controls">
                        <div><button onclick="playAudio('${audio}')"><i class="fas fa-play"></i></button></div>
                        <div><button class="share-btn" data-content="${share}"><i class="fas fa-share-alt"></i></button></div>
                    </div>
                </div>
                <div class="arabic-text">${highlightMatches(
									verse.arabic_text,
									query
								)}</div>
                <div class="latin-text">${highlightMatches(
									verse.latin_text,
									query
								)}</div>
                <div class="translation-text">${highlightMatches(
									verse.translation,
									query
								)}</div>
            </div>
        `;
	});

	html += `</div><div id="searchInSurahPaginationContainer"></div>`;
	container.innerHTML = html;

	const paginationContainer = document.getElementById(
		"searchInSurahPaginationContainer"
	);
	if (paginationContainer && paginationModule.render) {
		paginationModule.render(paginationContainer, quran, url => {
			const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
			searchInSurah(surahId, query, newPage);
		});
	}
}

// Fungsi untuk melakukan pencarian global hadits
async function searchHadithsGlobal(query, page = 1) {
	appState.currentCollection = null;

	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	// Tampilkan loading state
	if (hadithsContainer)
		hadithsContainer.innerHTML = '<div class="loading">Mencari hadits...</div>';
	if (headerContainer) headerContainer.innerHTML = "";
	if (paginationContainer) paginationContainer.innerHTML = "";

	try {
		showView("hadithList", { isSearch: true });
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=hadith&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Pencarian global hadits gagal");

		const data = await res.json();
		renderSearchHadithResults(data, query);
	} catch (error) {
		console.error("Error searching global hadiths:", error);
		const container = document.getElementById("hadithBooks");
		if (container) container.innerHTML = errorMessage(error);
	}
}

function renderSearchHadithResults(hadithData, query) {
	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	if (!hadithsContainer || !headerContainer || !paginationContainer) return;

	hadithsContainer.innerHTML = "";
	headerContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	// Render header
	headerContainer.innerHTML = `
        <div class="surah-header">
            <h2>Hasil Pencarian: "${query}"</h2>
            <div class="surah-meta">
                <div>Ditemukan ${hadithData.total} hasil</div>
                <div>Halaman ${hadithData.current_page} dari ${hadithData.last_page}</div>
            </div>
        </div>
    `;

	// Render hasil pencarian
	let html = "";

	hadithData.data.forEach(hadith => {
		const share = encodeURIComponent(
			`${hadith.book_id} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`
		);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-reference">
                        <div class="book-name">${hadith.book_id}</div>
                        <div class="hadith-number">${hadith.number}</div>
                    </div>
                    <div class="verse-controls">
                        <div class="verse-share">
                            <button class="share-btn" data-content="${share}">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="arabic-text">${highlightMatches(
									hadith.arabic,
									query
								)}</div>
                <div class="translation-text">
                    <p>${highlightMatches(hadith.translation, query)}</p>
                </div>
            </div>
        `;
	});

	hadithsContainer.innerHTML = html;

	// Render pagination
	if (hadithData.last_page > 1 && paginationModule.render) {
		paginationModule.render(paginationContainer, hadithData, url => {
			const match = url.match(/page=(\d+)/);
			const newPage = match ? parseInt(match[1]) : 1;
			searchHadithsGlobal(query, newPage);
		});
	}
}

// Fungsi untuk melakukan pencarian hadits dalam satu buku
async function searchHadithsInBook(bookId, query, page = 1) {
	try {
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=hadith&book_id=${bookId}&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Pencarian dalam kitab hadits gagal");

		const data = await res.json();
		renderHadithSearchResults(data, query);
	} catch (error) {
		console.error("Error searching hadiths in book:", error);
		const container = document.getElementById("hadithBooks");
		if (container) container.innerHTML = errorMessage(error);
	}
}

// Fungsi untuk menampilkan hasil pencarian hadits dalam buku
function renderHadithSearchResults(hadithData, query) {
	window.scrollTo({ top: 0, behavior: "smooth" });
	const hadithsContainer = document.getElementById("hadithBooks");
	const paginationContainer = document.getElementById("hadithPagination");
	const headerContainer = document.getElementById("hadithHeaderContainer");

	if (!hadithsContainer || !paginationContainer || !headerContainer) return;

	hadithsContainer.innerHTML = "";
	headerContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	// Render header
	headerContainer.innerHTML = `
        <div class="search-header">
            <h2>Hasil Pencarian: "${query}" dalam ${appState.currentCollection.name}</h2>
            <div class="surah-meta">
                <div>Ditemukan ${hadithData.total} hasil</div>
                <div>Halaman ${hadithData.current_page} dari ${hadithData.last_page}</div>
            </div>
        </div>
    `;

	let html = "";

	// Render hasil pencarian
	hadithData.data.forEach(hadith => {
		const share = encodeURIComponent(
			`${appState.currentCollection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`
		);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-number">${hadith.number}</div>
                    <div class="verse-controls">
                        <div class="verse-share">
                            <button class="share-btn" data-content="${share}">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="arabic-text">${highlightMatches(
									hadith.arabic,
									query
								)}</div>
                <div class="translation-text">
                    <strong>Terjemahan:</strong>
                    <p>${highlightMatches(hadith.translation, query)}</p>
                </div>
            </div>
        `;
	});

	hadithsContainer.innerHTML = html;

	// Render pagination
	if (paginationModule.render) {
		paginationModule.render(paginationContainer, hadithData, url => {
			const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
			searchHadithsInBook(appState.currentCollection.id, query, newPage);
		});
	}
}

async function searchVersesGlobal(query, page = 1) {
	try {
		showView("surahDetail", { isSearch: true });
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=quran&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Pencarian di semua surah gagal");

		const data = await res.json();
		if (!data?.quran) throw new Error("Data pencarian tidak valid");

		renderSearchResults(data.quran, query);
	} catch (error) {
		console.error("Error searching:", error);
		const container = document.getElementById("surahDetail");
		if (container) {
			container.innerHTML = errorMessage(
				error,
				`searchVersesGlobal('${query}', ${page})`
			);
		}
	}
}

// Fungsi untuk menampilkan hasil pencarian
function renderSearchResults(quran, query) {
	const container = document.getElementById("surahDetail");
	if (!container || !quran || !appState.quranData) return;

	let html = `
        <div class="search-header">
            <h2>Hasil Pencarian: "${query}"</h2>
            <div class="surah-meta">
                <div>Ditemukan ${quran.total} hasil</div>
                <div>Halaman ${quran.current_page} dari ${quran.last_page}</div>
            </div>
        </div>
        <div class="verses-container">
    `;

	quran.data.forEach(verse => {
		const surah = appState.quranData.find(s => s.number === verse.surah_number);
		const surahName = surah ? surah.name_latin : `Surah ${verse.surah_number}`;
		const audio = verse.audio?.["05"] || "";
		const share = encodeURIComponent(
			`Q.S. ${surahName}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`
		);

		html += `
            <div class="verse-item search-result-item">
                <div class="surah-info">
                    <div class="surah-name">${surahName}</div>
                    <button class="nav-btn" onclick="goToSurah(${
											verse.surah_number
										})">
                        <i class="fas fa-book-open"></i> Buka Surah
                    </button>
                </div>
                <div class="verse-header">
                    <div class="verse-number">${verse.verse_number}</div>
                    <div class="verse-controls">
                        <div><button onclick="playAudio('${audio}')"><i class="fas fa-play"></i></button></div>
                        <div><button class="share-btn" data-content="${share}"><i class="fas fa-share-alt"></i></button></div>
                    </div>
                </div>
                <div class="arabic-text">${highlightMatches(
									verse.arabic_text,
									query
								)}</div>
                <div class="latin-text">${highlightMatches(
									verse.latin_text,
									query
								)}</div>
                <div class="translation-text">${highlightMatches(
									verse.translation,
									query
								)}</div>
            </div>
        `;
	});

	html += `</div><div id="searchPaginationContainer" class="pagination"></div>`;
	container.innerHTML = html;

	const paginationContainer = document.getElementById(
		"searchPaginationContainer"
	);
	if (paginationContainer && paginationModule.render) {
		paginationModule.render(paginationContainer, quran, url => {
			const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
			searchVersesGlobal(query, newPage);
		});
	}
}

// Fungsi untuk menyaring surah berdasarkan query
async function filterSurahs(query) {
	showView("surahDetail", {
		isSearch: true,
		surah: { number: -1, name_latin: "Hasil pencarian" }
	});

	const container = document.getElementById("surahDetail");
	if (container)
		container.innerHTML = '<div class="loading">Mencari ayat...</div>';

	try {
		await searchVersesGlobal(query);
	} catch (error) {
		console.error("Error filtering surah:", error);
		if (container) {
			container.innerHTML = errorMessage(error);
		}
	}
}

function goToSurah(surahNumber) {
	const surah = appState.quranData?.find(s => s.number === surahNumber);
	surah && showView("surahDetail", { surah });
}

// Fungsi untuk Asmaul Husna
async function fetchAsmaulHusna() {
	const loadingEl = document.getElementById("asmaLoading");
	const containerEl = document.getElementById("asmaGrid");

	toggleElement("asmaLoading", true);
	clearContainer("asmaGrid");

	try {
		const cacheKey = API_CONFIG.asmaulHusna.cacheKey;
		const cached = await CacheManager.getItem(cacheKey);
		if (cached) {
			renderAsmaulHusna(cached);
			return;
		}

		const res = await fetch(API_CONFIG.asmaulHusna.url);
		if (!res.ok) throw new Error("Gagal mengambil data Asmaul Husna");

		const data = await res.json();
		if (!data.success) throw new Error("Server error");

		const asma = data.data;
		await CacheManager.setItem(cacheKey, asma);
		renderAsmaulHusna(asma);
	} catch (error) {
		console.error("Error fetching Asmaul Husna:", error);
		if (containerEl) {
			containerEl.innerHTML = errorMessage(error, "fetchAsmaulHusna()");
		}
	} finally {
		toggleElement("asmaLoading", false);
	}
}

function renderAsmaulHusna(data) {
	const container = document.getElementById("asmaGrid");
	if (!container) return;

	container.innerHTML = data
		.map(
			asma => `
        <div class="asma-card" data-id="${asma.id}">
            <div class="asma-number">${asma.number}</div>
            <div class="asma-arabic">${asma.arabic}</div>
            <div class="asma-name">${asma.latine}</div>
            <div class="asma-meaning">${asma.meaning.id}</div>
        </div>
    `
		)
		.join("");

	container.querySelectorAll(".asma-card").forEach(card => {
		card.addEventListener("click", () => {
			showView("asmaDetail", { id: card.dataset.id });
		});
	});

	// Pencarian Asmaul Husna
	const searchInput = document.getElementById("searchAsmaInput");
	if (searchInput) {
		searchInput.addEventListener("input", function () {
			const query = this.value.toLowerCase().trim();
			const cards = container.querySelectorAll(".asma-card");

			cards.forEach(card => {
				const name = card.querySelector(".asma-name").textContent.toLowerCase();
				const meaning = card
					.querySelector(".asma-meaning")
					.textContent.toLowerCase();

				card.style.display =
					name.includes(query) || meaning.includes(query) ? "block" : "none";
			});
		});
	}
}

async function showAsmaDetail(id) {
	const header = document.getElementById("asmaHeader");
	const versesContainer = document.getElementById("asmaVerses");

	if (header) header.innerHTML = '<div class="loading">Memuat detail...</div>';
	clearContainer("asmaVerses");

	try {
		const res = await fetch(`${API_CONFIG.asmaulHusna.url}/${id}`);
		if (!res.ok) throw new Error("Gagal mengambil detail Asmaul Husna");

		const data = await res.json();
		renderAsmaDetail(data.data);
	} catch (error) {
		console.error("Error fetching Asmaul Husna detail:", error);
		if (header) {
			header.innerHTML = errorMessage(error, `showAsmaDetail(${id})`);
		}
	} finally {
		if (header) header.innerHTML = "";
	}
}

function renderAsmaDetail(asma) {
	document.getElementById("asmaNameLatin").textContent = asma.latine;
	document.getElementById("asmaArabic").textContent = asma.arabic;
	document.getElementById("asmaNumber").textContent = `Nomor: ${asma.number}`;
	document.getElementById("asmaMeaning").textContent = asma.meaning;

	document.getElementById("asmaDescription").innerHTML = `
        <p><strong>Arti:</strong> ${asma.meaning}</p>
        <p><strong>Ditemukan dalam:</strong> ${asma.found}</p>
    `;

	document.getElementById("asmaExplanation").textContent = asma.description;

	const versesContainer = document.getElementById("asmaVerses");
	versesContainer.innerHTML = "";

	asma.verses.forEach(verse => {
		versesContainer.innerHTML += renderVerseItem(verse, verse.surah);
	});
}

// Fungsi untuk Kisah Nabi
async function fetchProphetStories() {
	const containerEl = document.getElementById("prophetGrid");

	try {
		toggleElement("prophetLoading", true);
		clearContainer("prophetGrid");
		containerEl.innerHTML =
			'<div class="loading-container"><div class="loading-spinner"></div></div>';
		const cacheKey = API_CONFIG.prophetStories.cacheKey;
		const cached = await CacheManager.getItem(cacheKey);
		if (cached) {
			renderProphetStories(cached);
			return;
		}

		const res = await fetch(API_CONFIG.prophetStories.url);
		if (!res.ok) throw new Error("Gagal mengambil data kisah nabi");

		const { data } = await res.json();
		const prophets = data || [];
		await CacheManager.setItem(cacheKey, prophets);
		renderProphetStories(prophets);
	} catch (error) {
		console.error("Error fetching prophet stories:", error);
		alert(error.message);
		if (containerEl) {
			containerEl.innerHTML = errorMessage(error, "fetchProphetStories()");
		}
	} finally {
		toggleElement("prophetLoading", false);
	}
}

function renderProphetStories(prophets) {
	const container = document.getElementById("prophetGrid");
	if (!container || !Array.isArray(prophets.data)) return;

	container.innerHTML = prophets.data
		.map(prophet => {
			const { text, className } = formatProphetYear(
				prophet.birth_year,
				prophet.name
			);
			return `
            <div class="prophet-card" data-id="${prophet.id}">
                <div class="book-cover" style="background-image: url('${prophet.image_url}')">
                    <div class="book-overlay"></div>
                    <div class="book-title">
                        <h3>${prophet.name}</h3>
                        <div class="prophet-meta">
                            <i class="fas fa-calendar"></i>
                            <span class="${className}">${text}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
		})
		.join("");

	container.querySelectorAll(".prophet-card").forEach(card => {
		card.addEventListener("click", () => {
			showView("prophetDetail", { id: card.dataset.id });
		});
	});

	// Pencarian Kisah Nabi
	const searchInput = document.getElementById("searchProphetInput");
	if (searchInput) {
		searchInput.addEventListener("input", function () {
			const query = this.value.toLowerCase().trim();
			const cards = container.querySelectorAll(".prophet-card");

			cards.forEach(card => {
				const name = card.querySelector("h3").textContent.toLowerCase();
				card.style.display = name.includes(query) ? "block" : "none";
			});
		});
	}
}

async function showProphetDetail(id) {
	showView("prophetDetail");

	const header = document.getElementById("prophetDetailLoading");
	if (header) header.innerHTML = '<div class="loading">Memuat detail...</div>';

	try {
		const res = await fetch(`${API_CONFIG.prophetStories.url}/${id}`);
		if (!res.ok) throw new Error("Gagal mengambil detail kisah nabi");

		const data = await res.json();
		const prophet = data.data || data;
		renderProphetDetail(prophet);
	} catch (error) {
		console.error("Error fetching prophet detail:", error);
		if (header) {
			header.innerHTML = errorMessage(error, `showProphetDetail(${id})`);
		}
	}
}

function renderProphetDetail(prophet) {
	document.getElementById("prophetName").textContent = prophet.name;

	const birthYearEl = document.getElementById("prophetBirthYear");
	const { text, className } = formatProphetYear(
		prophet.birth_year,
		prophet.name
	);

	if (birthYearEl) {
		birthYearEl.textContent = `Tahun Kelahiran: ${text}`;
		birthYearEl.className = `meta-item ${className}`;
	}

	const imageContainer = document.querySelector(".prophet-image-container");
	if (imageContainer) {
		imageContainer.innerHTML = `
            <img id="prophetImage" src="${prophet.image_url}" alt="${prophet.name}"
                 class="prophet-image" onload="this.style.opacity=1" 
                 style="opacity:0; transition: opacity 0.5s ease">
            <div class="image-caption">${prophet.name}</div>
        `;
	}

	const descriptionEl = document.getElementById("prophetDescription");
	if (descriptionEl) descriptionEl.innerHTML = `<p>${prophet.description}</p>`;

	const additionalInfo = document.getElementById("prophetAdditionalInfo");
	if (additionalInfo) {
		additionalInfo.innerHTML = `
            <div class="additional-info">
                <div class="info-item">
                    <i class="fas fa-calendar-day"></i>
                    <span class="${className}">Tahun Kelahiran: ${text}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-user-clock"></i>
                    <span>Usia: ${prophet.age || "Tidak diketahui"}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Tempat: ${prophet.place || "Tidak diketahui"}</span>
                </div>
            </div>
        `;
	}
}

// Fungsi untuk memformat tahun kelahiran
function formatProphetYear(year, prophetName) {
	if (!year) return { text: "Tidak diketahui", className: "" };

	const yearNum = typeof year === "string" ? parseInt(year) || 0 : year;

	if (prophetName.includes("Isa")) {
		return { text: "1 M (Kelahiran Nabi Isa AS)", className: "isa-year" };
	}

	if (["Muhammad"].some(name => prophetName.includes(name))) {
		return { text: `${yearNum}`, className: "m-year" };
	}

	return { text: `${yearNum}`, className: "sm-year" };
}
