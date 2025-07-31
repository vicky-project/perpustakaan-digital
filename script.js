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
	search: {
		url: "https://vickyserver.my.id/server/api/search"
	},
	cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7 hari dalam ms
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
		"asmaulHusnaList"
	],
	backButtons: [
		"backToShelf",
		"backToSurah",
		"backToHadithList",
		"backToHadithBook",
		"backFromSearch",
		"backFromAsma"
	]
};

// Inisialisasi tema
function initTheme() {
	const savedTheme = localStorage.getItem("theme") || "dark";
	document.documentElement.setAttribute("data-theme", savedTheme);

	const themeIcon = document.querySelector("#themeToggle i");
	if (savedTheme === "light") {
		themeIcon.classList.replace("fa-moon", "fa-sun");
	}
}

// Manajemen tampilan
function showView(viewId, options = {}) {
	// Sembunyikan semua view dan tombol kembali
	domElements.views.forEach(id => {
		const el = document.getElementById(id);
		if (el) el.style.display = "none";
	});
	domElements.backButtons.forEach(id => {
		const el = document.getElementById(id);
		if (el) el.style.display = "none";
	});

	// Atur tampilan input pencarian
	const globalHadithSearch = document.getElementById("searchGlobalHadithInput");
	const hadithSearch = document.getElementById("searchHadithInput");
	const inSurahSearch = document.getElementById("searchInSurahInput");

	[globalHadithSearch, hadithSearch, inSurahSearch].forEach(input => {
		if (input && input.parentElement) {
			input.parentElement.style.display = "none";
		}
	});

	// Tampilkan view yang diminta
	const viewEl = document.getElementById(viewId);
	if (viewEl) viewEl.style.display = "block";

	// Proses berdasarkan view
	switch (viewId) {
		case "mainShelf":
			break;

		case "surahList":
			const backToSelf = document.getElementById("backToShelf");
			if (backToShelf) backToShelf.style.display = "flex";

			const searchInput = document.getElementById("searchInput");
			if (searchInput) searchInput.value = "";

			if (!appState.quranData && !appState.loadingError) {
				fetchQuranData();
			} else if (appState.quranData) {
				renderSurahBooks();
			}
			break;

		case "surahDetail":
			const backToSurah = document.getElementById("backToSurah");
			if (backToSurah) backToSurah.style.display = "flex";

			if (options.isSearch) {
				viewEl.innerHTML =
					'<div class="loading">Memuat hasil pencarian...</div>';
			} else {
				appState.currentSurah = options.surah;
				renderSurahDetail(options.surah, options.page || 1);
			}
			break;

		case "hadithCollections":
			const backToShelf2 = document.getElementById("backToShelf");
			if (backToShelf2) backToShelf2.style.display = "flex";

			if (globalHadithSearch && globalHadithSearch.parentElement) {
				globalHadithSearch.parentElement.style.display = "block";
				globalHadithSearch.value = "";
			}
			fetchHadithData();
			break;

		case "hadithList":
			const hadithPagination = document.getElementById("hadithPagination");
			if (hadithPagination) hadithPagination.style.display = "block";

			const backToHadithList = document.getElementById("backToHadithList");
			if (backToHadithList) backToHadithList.style.display = "flex";

			if (hadithSearch && hadithSearch.parentElement) {
				hadithSearch.parentElement.style.display = "block";
				hadithSearch.value = "";
			}

			if (options.isSearch) {
				const headerContainer = document.getElementById(
					"hadithHeaderContainer"
				);
				const hadithsContainer = document.getElementById("hadithBooks");

				if (headerContainer) headerContainer.innerHTML = "";

				if (hadithsContainer) hadithsContainer.innerHTML = "";
			} else if (options.collection) {
				appState.currentCollection = options.collection;
				renderHadithList(options.collection.id, options.page || 1);
			}

			break;

		case "asmaulHusnaList":
			const backFromAsma = document.getElementById("backFromAsma");
			if (backFromAsma) backFromAsma.style.display = "flex";

			if (
				document.getElementById("searchAsmaInput") &&
				document.getElementById("searchAsmaInput").parentElement
			) {
				document.getElementById("searchAsmaInput").parentElement.style.display =
					"block";
				document.getElementById("searchAsmaInput").value = "";
			}

			fetchAsmaulHusna();
			break;

		case "asmaDetail":
			document.getElementById("backFromAsma").style.display = "flex";
			break;
	}

	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fetch data dengan caching
async function fetchData(type, cacheKey, processData) {
	const loadingId =
		type === "quran" ? "surahLoading" : "hadithCollectionsLoading";
	const containerId =
		type === "quran" ? "surahBooks" : "hadithCollectionsBooks";

	const loadingEl = document.getElementById(loadingId);
	const containerEl = document.getElementById(containerId);

	if (loadingEl) loadingEl.style.display = "flex";
	if (containerEl) containerEl.innerHTML = "";

	try {
		// Coba ambil dari cache
		let data = await CacheManager.getItem(cacheKey);
		if (data) return processData(data);

		// Ambil dari server
		const response = await fetch(API_CONFIG[type].url);
		if (!response.ok) throw new Error(`Gagal mengambil data ${type}`);

		data = await response.json();

		if (type === "hadith") data = data || [];

		// Simpan ke cache
		await CacheManager.setItem(cacheKey, data);
		processData(data);
	} catch (error) {
		console.error(`Error fetching ${type} data:`, error);
		appState.loadingError = true;

		// Coba gunakan cache yang ada
		const fallback = await CacheManager.getItem(cacheKey, true);
		if (fallback) return processData(fallback);

		// Tampilkan pesan error
		if (containerEl) {
			containerEl.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat data. Silakan coba lagi nanti.</p>
                <button class="nav-btn" onclick="${
									type === "quran" ? "fetchQuranData" : "fetchHadithData"
								}()">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
		}
	} finally {
		if (loadingEl) loadingEl.style.display = "none";
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

	const sortedSurahs = [...appState.quranData].sort(
		(a, b) => a.number - b.number
	);

	container.innerHTML = sortedSurahs
		.map(
			surah => `
        <div class="book small surah-book-item" 
             data-number="${surah.number}" 
             data-name="${surah.name_latin}" 
             data-name-ar="${surah.name}" 
             data-meaning="${surah.meaning.toLowerCase()}">
            <div class="book-image">
                <i class="fas fa-book"></i>
                <div class="surah-number-badge">${surah.number}</div>
            </div>
            <div class="book-title">
                <h3>${surah.name_latin}</h3>
                <p>${surah.number_of_verses} Ayat • ${surah.place}</p>
                <p class="meaning-text">${surah.meaning}</p>
            </div>
        </div>
    `
		)
		.join("");

	container.addEventListener("click", e => {
		const book = e.target.closest(".book");
		if (!book) return;

		const surahNumber = parseInt(book.dataset.number);
		const surah = appState.quranData.find(s => s.number === surahNumber);
		if (surah) showView("surahDetail", { surah });
	});
}

// Render detail surah
async function renderSurahDetail(surah, page = 1) {
	const container = document.getElementById("surahDetail");
	if (!container) return;

	container.innerHTML = '<div class="loading">Memuat ayat...</div>';

	try {
		const versesData = await fetchVersesBySurah(surah.number, page);

		if (!versesData || !versesData.data || !Array.isArray(versesData.data)) {
			throw new Error("Data ayat tidak valid atau tidak ditemukan.");
		}

		const versesHTML = versesData.data
			.map(verse => renderVerseItem(verse, surah))
			.join("");

		container.innerHTML = `
            <div class="surah-header">
                <h2>${surah.name}</h2>
                <h3>${surah.name_latin}</h3>
                <div class="surah-meta">
                    <div class="meta-item">${surah.number_of_verses} Ayat</div>
                    <div class="meta-item">${surah.place}</div>
                    <div class="meta-item">Arti: ${surah.meaning}</div>
                </div>
                <div class="surah-description">
                    <p>${surah.description}</p>
                </div>
                <div class="search-container">
                    <input type="text" id="searchInSurahInput" placeholder="Cari dalam surah..." class="search-box">
                    <div class="search-icon">
                        <i class="fas fa-search"></i>
                    </div>
                </div>
            </div>
            <div class="verses-container">${versesHTML}</div>
            <div id="surahDetailPaginationContainer"></div>
        `;

		// Paginasi
		const paginationContainer = document.getElementById(
			"surahDetailPaginationContainer"
		);

		if (paginationContainer && paginationModule.render) {
			paginationModule.render(paginationContainer, versesData, url => {
				const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
				showView("surahDetail", { surah, page: newPage });
			});
		}

		// Event listener pencarian dalam surah
		const searchInput = document.getElementById("searchInSurahInput");
		if (searchInput)
			searchInput.addEventListener("keypress", e => {
				if (e.key === "Enter") {
					const query = e.target.value.toLowerCase().trim();
					searchInSurah(surah.number, query);
				}
			});
	} catch (error) {
		console.error("Error rendering surah detail:", error);
		container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat ayat. Silakan coba lagi nanti.</p>
                <button class="nav-btn" onclick="renderSurahDetail(${JSON.stringify(
									surah
								)}, ${page})">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	}
}

// Render item ayat
function renderVerseItem(verse, surah) {
	const audioUrl = verse.audio?.["05"] || "";
	const shareContent = `Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;
	const encodedContent = encodeURIComponent(shareContent);

	return `
        <div class="verse-item">
            <div class="verse-header">
                <div class="verse-number">${verse.verse_number}</div>
                <div class="verse-controls">
                    <div class="verse-audio">
                        <button onclick="playAudio('${audioUrl}')">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <div class="verse-share">
                        <button class="share-btn" data-content="${encodedContent}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
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

		const response = await fetch(url);
		if (!response.ok) throw new Error("Gagal mengambil data ayat");

		const data = await response.json();

		// Validasi struktur data sebelum disimpan
		if (!data || !data.data || !Array.isArray(data.data)) {
			throw new Error("Struktur data ayat tidak valid");
		}

		await CacheManager.setItem(cacheKey, data);

		return data;
	} catch (error) {
		console.error(`Error fetching verses for surah ${surahNumber}:`, error);
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

		const collectionId = book.dataset.id;
		const collection = appState.hadithCollections.find(
			c => c.id === collectionId
		);
		if (collection) showView("hadithList", { collection });
	});
}

// Render daftar hadits
async function renderHadithList(collectionId, page = 1) {
	const loadingContainer = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");
	const paginationContainer = document.getElementById("hadithPagination");
	const headerContainer = document.getElementById("hadithHeaderContainer");

	if (loadingContainer) loadingContainer.style.display = "flex";
	if (headerContainer) headerContainer.innerHTML = "";
	if (hadithsContainer) hadithsContainer.innerHTML = "";
	if (paginationContainer) paginationContainer.innerHTML = "";

	try {
		const response = await fetchHadithsByBook(collectionId, page);
		if (!response || !response.id || !response.hadiths) {
			throw new Error("Format respons API tidak valid");
		}

		// Render header
		if (headerContainer) {
			headerContainer.innerHTML = `
            <div class="surah-header">
                <h2>${response.name}</h2>
                <div class="surah-meta">
                    <div class="meta-item">Total Hadits: ${response.total_hadiths}</div>
                    <div class="meta-item">Halaman ${response.hadiths.current_page} dari ${response.hadiths.last_page}</div>
                </div>
            </div>
        `;
		}

		// Render hadits
		if (hadithsContainer) {
			hadithsContainer.innerHTML = response.hadiths.data
				.map(hadith => renderHadithItem(hadith, response))
				.join("");
		}

		// Paginasi
		if (paginationContainer && paginationModule.render) {
			paginationModule.render(paginationContainer, response.hadiths, url => {
				const newPage = url ? parseInt(url.match(/page=(\d+)/)[1]) : 1;
				renderHadithList(collectionId, newPage);
			});
		}
	} catch (error) {
		console.error("Error rendering hadith list:", error);
		hadithsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message}</p>
                <button class="nav-btn" onclick="renderHadithList('${collectionId}', ${page})">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	} finally {
		if (loadingContainer) loadingContainer.style.display = "none";
	}
}

// Render item hadits
function renderHadithItem(hadith, collection) {
	const shareContent = `${collection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;
	const encodedContent = encodeURIComponent(shareContent);

	const highlightedArabic = highlightMatches(
		hadith.arabic,
		appState.currentQuery
	);
	const highlightedTranslation = highlightMatches(
		hadith.translation,
		appState.currentQuery
	);

	return `
        <div class="verse-item">
            <div class="verse-header">
                <div class="verse-number">${hadith.number}</div>
                <div class="verse-controls">
                    <div class="verse-share">
                        <button class="share-btn" data-content="${encodedContent}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="arabic-text">${highlightedArabic}</div>
            <div class="translation-text">
                <strong>Terjemahan:</strong>
                <p>${highlightedTranslation}</p>
            </div>
        </div>
    `;
}

// Fetch hadits per kitab
async function fetchHadithsByBook(bookId, page = 1) {
	try {
		const response = await fetch(
			`${API_CONFIG.hadith.url}/${bookId}/hadiths?page=${page}`
		);
		if (!response.ok) throw new Error("Gagal mengambil data hadits");
		return await response.json();
	} catch (error) {
		console.error("Error fetching hadiths:", error);
		throw error;
	}
}

// Fungsi utilitas
function playAudio(url) {
	if (!url) return;
	new Audio(url).play().catch(e => console.log("Audio play failed:", e));
}

function highlightMatches(text, query) {
	if (!query || !text) return text;
	const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
	return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Event listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
	// Inisialisasi tema
	initTheme();

	// Event listener untuk tema
	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.addEventListener("click", () => {
			const currentTheme = document.documentElement.getAttribute("data-theme");
			const newTheme = currentTheme === "dark" ? "light" : "dark";

			document.documentElement.setAttribute("data-theme", newTheme);
			localStorage.setItem("theme", newTheme);

			const themeIcon = document.querySelector("#themeToggle i");
			if (themeIcon) {
				if (newTheme === "light") {
					themeIcon.classList.replace("fa-moon", "fa-sun");
				} else {
					themeIcon.classList.replace("fa-sun", "fa-moon");
				}
			}
		});
	}

	// Tombol kembali ke atas
	const backToTopBtn = document.getElementById("backToTopBtn");
	if (backToTopBtn) {
		window.addEventListener("scroll", () => {
			backToTopBtn.classList.toggle("show", window.pageYOffset > 300);
		});

		backToTopBtn.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	// Navigasi utama
	const setupClickListener = (id, handler) => {
		const el = document.getElementById(id);
		if (el) el.addEventListener("click", handler);
	};

	setupClickListener("quranBook", () => showView("surahList"));
	setupClickListener("hadithBook", () => showView("hadithCollections"));
	setupClickListener("asmaulHusnaBook", () => showView("asmaulHusnaList"));
	setupClickListener("backToShelf", () => showView("mainShelf"));
	setupClickListener("backToSurah", () => showView("surahList"));
	setupClickListener("backToHadithList", () => showView("hadithCollections"));
	setupClickListener("backToHadithBook", () => {
		if (appState.currentCollection) {
			showView("hadithList", { collection: appState.currentCollection });
		}
	});
	setupClickListener("backFromAsma", () => showView("mainShelf"));

	// Pencarian
	const initSearchInput = (id, handler) => {
		const input = document.getElementById(id);
		if (input) {
			input.addEventListener("keypress", async function (e) {
				if (e.key === "Enter") {
					const query = this.value.trim();
					if (query.length >= 3) {
						handler(query);
					} else if (query.length === 0) {
						backFromSearch();
					}
				}
			});

			const icon = input.nextElementSibling;
			if (icon) {
				icon.addEventListener("click", async function () {
					const query = this.value.trim();
					if (query.length >= 3) {
						handler(query);
					} else if (query.length === 0) {
						backFromSearch();
					}
				});
			}
		}
	};

	initSearchInput("searchInput", filterSurahs);
	initSearchInput("searchGlobalHadithInput", searchHadithsGlobal);
	initSearchInput("searchHadithInput", query => {
		if (appState.currentCollection) {
			searchHadithsInBook(appState.currentCollection.id, query);
		}
	});
	initSearchInput("searchInSurahInput", query => {
		if (appState.currentSurah) {
			searchInSurah(appState.currentSurah.number, query);
		}
	});

	// Berbagi konten
	document.addEventListener("click", e => {
		const btn = e.target.closest(".share-btn");
		if (btn) {
			const content = btn.getAttribute("data-content");
			shareContent(content);
		}
	});
});

// Fungsi berbagi konten
function shareContent(content) {
	if (!content) return;

	if (navigator.share) {
		navigator
			.share({
				title: "Perpustakaan Digital",
				text: decodeURIComponent(content)
			})
			.catch(error => console.log("Error sharing:", error));
	} else {
		navigator.clipboard
			.writeText(decodeURIComponent(content))
			.then(() => alert("Teks disalin ke clipboard!"))
			.catch(err => console.error("Gagal menyalin teks:", err));
	}
}

async function searchInSurah(surahId, query, page = 1) {
	const container = document.getElementById("surahDetail");
	if (!container) return;

	container.innerHTML = '<div class="loading">Memuat hasil pencarian...</div>';

	try {
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=quran&surah_id=${surahId}&page=${page}`;
		const response = await fetch(url);

		if (!response.ok) throw new Error("Pencarian dalam surah gagal");

		const data = await response.json();
		renderSearchInSurahResults(data.quran, query, surahId);
	} catch (error) {
		console.error("Error searching in surah:", error);
		container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${
													error.message ||
													"Terjadi kesalahan saat melakukan pencarian"
												}</p>
                    </div>
                `;
	}
}

function renderSearchInSurahResults(quran, query, surahId) {
	const surahDetailContainer = document.getElementById("surahDetail");
	if (!surahDetailContainer) return;

	// Periksa apakah ada data
	if (!quran || !quran.data || quran.data.length === 0) {
		surahDetailContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-info-circle"></i>
                <p>Tidak ditemukan hasil pencarian untuk "${query}" dalam surah ini</p>
            </div>
        `;
		return;
	}

	// Cari data surah
	const surah = appState.quranData.find(s => s.number === surahId);
	if (!surah) {
		surahDetailContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Data surah tidak ditemukan</p>
            </div>
        `;
		return;
	}

	let html = `
        <div class="search-header">
            <h2>Hasil Pencarian: "${query}" dalam ${surah.name_latin}</h2>
            <div class="surah-meta">
                <div class="meta-item">Ditemukan ${quran.total} hasil</div>
                <div class="meta-item">Halaman ${quran.current_page} dari ${quran.last_page}</div>
            </div>
        </div>
        <div class="verses-container">
    `;

	// Render hasil pencarian
	quran.data.forEach(verse => {
		const audioUrl = verse.audio?.["05"] || "";
		const shareContent = `Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;
		const encodedContent = encodeURIComponent(shareContent);

		// Highlight matches in text
		const highlightedArabic = highlightMatches(verse.arabic_text, query);
		const highlightedLatin = highlightMatches(verse.latin_text, query);
		const highlightedTranslation = highlightMatches(verse.translation, query);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-number">${verse.verse_number}</div>
                    <div class="verse-controls">
                        <div class="verse-audio">
                            <button onclick="playAudio('${audioUrl}')">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                        <div class="verse-share">
                            <button class="share-btn" data-content="${encodedContent}">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="arabic-text">${highlightedArabic}</div>
                <div class="latin-text">${highlightedLatin}</div>
                <div class="translation-text">${highlightedTranslation}</div>
            </div>
        `;
	});

	html += `</div><div id="searchInSurahPaginationContainer"></div>`;
	surahDetailContainer.innerHTML = html;

	// Render pagination
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
	try {
		showView("hadithList", { isSearch: true });
		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=hadith&page=${page}`;
		const response = await fetch(url);

		if (!response.ok) throw new Error("Pencarian global hadits gagal");

		const data = await response.json();
		renderSearchHadithResults(data.hadiths, query);
	} catch (error) {
		console.error("Error searching global hadiths:", error);
		const hadithsContainer = document.getElementById("hadithBooks");
		if (hadithsContainer) {
			hadithsContainer.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>${
															error.message ||
															"Terjadi kesalahan saat melakukan pencarian"
														}</p>
                        </div>
                    `;
		}
	}
}

function renderSearchHadithResults(hadithData, query) {
	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	// Pastikan elemen DOM ada
	if (!hadithsContainer || !headerContainer || !paginationContainer) return;

	hadithsContainer.innerHTML = "";
	headerContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	// Render header
	headerContainer.innerHTML = `
        <div class="surah-header">
            <h2>Hasil Pencarian: "${query}"</h2>
            <div class="surah-meta">
                <div class="meta-item">Ditemukan ${hadithData.total} hasil</div>
                <div class="meta-item">Halaman ${hadithData.current_page} dari ${hadithData.last_page}</div>
            </div>
        </div>
    `;

	// Render hasil pencarian
	let html = "";

	hadithData.data.forEach(hadith => {
		// Highlight matches in hadith text
		const highlightedArabic = highlightMatches(hadith.arabic, query);
		const highlightedTranslation = highlightMatches(hadith.translation, query);

		const shareContent = `${hadith.book_id} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;
		const encodedContent = encodeURIComponent(shareContent);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-reference">
                        <div class="book-name">${hadith.book_id}</div>
                        <div class="hadith-number">${hadith.number}</div>
                    </div>
                    <div class="verse-controls">
                        <div class="verse-share">
                            <button class="share-btn" data-content="${encodedContent}">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="arabic-text">${highlightedArabic}</div>
                <div class="translation-text">
                    <p>${highlightedTranslation}</p>
                </div>
            </div>
        `;
	});

	hadithsContainer.innerHTML = html;

	// Render pagination jika ada lebih dari 1 halaman
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
		const response = await fetch(url);

		if (!response.ok) throw new Error("Pencarian dalam kitab hadits gagal");

		const data = await response.json();
		renderHadithSearchResults(data.hadiths, query);
	} catch (error) {
		console.error("Error searching hadiths in book:", error);
		const hadithsContainer = document.getElementById("hadithBooks");
		if (hadithsContainer) {
			hadithsContainer.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>${
															error.message ||
															"Terjadi kesalahan saat melakukan pencarian"
														}</p>
                        </div>
                    `;
		}
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
                <div class="meta-item">Ditemukan ${hadithData.total} hasil</div>
                <div class="meta-item">Halaman ${hadithData.current_page} dari ${hadithData.last_page}</div>
            </div>
        </div>
    `;

	let html = "";

	// Render hasil pencarian
	hadithData.data.forEach(hadith => {
		// Highlight matches in hadith text
		const highlightedArabic = highlightMatches(hadith.arabic, query);
		const highlightedTranslation = highlightMatches(hadith.translation, query);

		const shareContent = `${appState.currentCollection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;
		const encodedContent = encodeURIComponent(shareContent);

		html += `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-number">${hadith.number}</div>
                    <div class="verse-controls">
                        <div class="verse-share">
                            <button class="share-btn" data-content="${encodedContent}">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="arabic-text">${highlightedArabic}</div>
                <div class="translation-text">
                    <strong>Terjemahan:</strong>
                    <p>${highlightedTranslation}</p>
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
		// Pastikan kita berada di view yang benar
		showView("surahDetail", { isSearch: true });

		const url = `${API_CONFIG.search.url}?query=${encodeURIComponent(
			query
		)}&type=quran&page=${page}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error("Pencarian di semua surah gagal");
		}

		const data = await response.json();

		// Validasi struktur data sebelum diproses
		if (!data?.quran) {
			throw new Error("Format respons pencarian tidak valid");
		}

		renderSearchResults(data.quran, query);
	} catch (error) {
		console.error("Error searching:", error);
		const container = document.getElementById("surahDetail");

		if (container) {
			container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${
											error.message ||
											"Terjadi kesalahan saat melakukan pencarian"
										}</p>
                    <button class="nav-btn" onclick="searchVersesGlobal('${query}', ${page})">
                        <i class="fas fa-redo"></i> Coba Lagi
                    </button>
                </div>
            `;
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
                        <div class="meta-item">Ditemukan ${quran.total} hasil</div>
                        <div class="meta-item">Halaman ${quran.current_page} dari ${quran.last_page}</div>
                    </div>
                </div>
                <div class="verses-container">
            `;

	quran.data.forEach(verse => {
		const surah = appState.quranData.find(s => s.number === verse.surah_number);
		const surahName = surah ? surah.name_latin : `Surah ${verse.surah_number}`;
		const audioUrl = verse.audio?.["05"] || "";
		const shareContent = `Q.S. ${surahName}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;
		const encodedContent = encodeURIComponent(shareContent);

		// Highlight matches
		const highlightedArabic = highlightMatches(verse.arabic_text, query);
		const highlightedLatin = highlightMatches(verse.latin_text, query);
		const highlightedTranslation = highlightMatches(verse.translation, query);

		html += `
                    <div class="verse-item search-result-item">
                        <div class="surah-info">
                            <div class="surah-name">${surahName}</div>
                            <button class="nav-btn" onclick="goToSurah(${verse.surah_number})">
                                <i class="fas fa-book-open"></i> Buka Surah
                            </button>
                        </div>
                        <div class="verse-header">
                            <div class="verse-number">${verse.verse_number}</div>
                            <div class="verse-controls">
                                <div class="verse-audio">
                                    <button onclick="playAudio('${audioUrl}')">
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                                <div class="verse-share">
                                    <button class="share-btn" data-content="${encodedContent}">
                                        <i class="fas fa-share-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="arabic-text">${highlightedArabic}</div>
                        <div class="latin-text">${highlightedLatin}</div>
                        <div class="translation-text">${highlightedTranslation}</div>
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
	}); // Gunakan placeholder

	const container = document.getElementById("surahDetail");
	if (container) container.innerHTML = '<div class="Mencari ayat..."></div>';

	try {
		await searchVersesGlobal(query);
	} catch (error) {
		console.error("Error filtering surah:", error);
		if (container) {
			container.innerHTML = `<div error-message>
			<i class="fas fa-exclamation-triangle"></i>
			<p>${error.message || "Terjadi kesalahan saat melakukan pencarian"}</p>
			</div>`;
		}
	}
}

function goToSurah(surahNumber) {
	const surah = appState.quranData.find(s => s.number === surahNumber);
	if (surah) showView("surahDetail", { surah });
}

async function fetchAsmaulHusna() {
	const loadingEl = document.getElementById("asmaLoading");
	const containerEl = document.getElementById("asmaGrid");

	if (loadingEl) loadingEl.style.display = "flex";
	if (containerEl) containerEl.innerHTML = "";

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
			containerEl.innerHTML = `<div class="error-message">
			  <i class="fas fa-exclamation-triangle"></i>
			  <p>Gagal memuat data Asmaul Husna. Silakan coba lagi nanti.</p>
			  <button class="nav-btn" onclick="fetchAsmaulHusna()">
			    <i class="fas fa-redo"></i> Muat Ulang
			  </button>
			</div>`;
		}
	} finally {
		if (loadingEl) loadingEl.style.display = "none";
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

	container.querySelectorAll(".asma-card").forEach(card =>
		card.addEventListener("click", () => {
			const asmaId = card.dataset.id;
			showAsmaDetail(asmaId);
		})
	);

	// Event listener untuk pencarian
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

				if (name.includes(query) || meaning.includes(query)) {
					card.style.display = "block";
				} else {
					card.style.display = "none";
				}
			});
		});
	}
}

async function showAsmaDetail(id) {
	showView("asmaDetail");

	const header = document.getElementById("asmaHeader");
	const description = document.getElementById("asmaDescription");
	const explanation = document.getElementById("asmaExplanation");
	const versesContainer = document.getElementById("asmaVerses");

	// Tampilkan loading
	header.innerHTML = '<div class="loading">Memuat detail...</div>';
	versesContainer.innerHTML = "";

	try {
		// Ambil data detail dari server
		const response = await fetch(`${API_CONFIG.asmaulHusna.url}/${id}`);
		if (!response.ok) throw new Error("Gagal mengambil detail Asmaul Husna");

		const data = await response.json();

		// Render detail
		renderAsmaDetail(data.data);
	} catch (error) {
		console.error("Error fetching Asmaul Husna detail:", error);
		header.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Gagal memuat detail. Silakan coba lagi nanti.</p>
        <button class="nav-btn" onclick="showAsmaDetail(${id})">
          <i class="fas fa-redo"></i> Muat Ulang
        </button>
      </div>
    `;
	} finally {
		header.innerHTML = "";
	}
}

function renderAsmaDetail(asma) {
	// Render header
	document.getElementById("asmaNameLatin").textContent = asma.latine;
	document.getElementById("asmaArabic").textContent = asma.arabic;
	document.getElementById("asmaNumber").textContent = `Nomor: ${asma.number}`;
	document.getElementById("asmaMeaning").textContent = asma.meaning;

	// Render description
	document.getElementById("asmaDescription").innerHTML = `
    <p><strong>Arti:</strong> ${asma.meaning}</p>
    <p><strong>Ditemukan dalam:</strong> ${asma.found}</p>
  `;

	// Render explanation
	document.getElementById("asmaExplanation").textContent = asma.description;

	// Render ayat referensi
	const versesContainer = document.getElementById("asmaVerses");
	versesContainer.innerHTML = "";

	asma.verses.forEach(verse => {
		versesContainer.innerHTML += renderVerseItem(verse, verse.surah);
	});
}
