// script.js

// ====================== KONFIGURASI ======================
const API_CONFIG = {
	quran: "https://vickyserver.my.id/server/api/books/quran",
	hadith: "https://vickyserver.my.id/server/api/books/hadith-book",
	asmaulHusna: "https://vickyserver.my.id/server/api/books/asmaul-husna",
	prophetStories: "https://vickyserver.my.id/server/api/books/prophet-stories",
	cacheExpiry: 604800000 // 7 hari dalam milidetik
};

// ====================== STATE APLIKASI ======================
const appState = {
	currentView: "mainShelf",
	currentData: null,
	history: [],
	searchQuery: "",
	quranData: null,
	hadithData: null
};

// ====================== DOM ELEMENTS ======================
const DOM = {
	mainShelf: document.getElementById("mainShelf"),
	listContainer: document.getElementById("listContainer"),
	listTitle: document.getElementById("listTitle"),
	listSubtitle: document.getElementById("listSubtitle"),
	listIcon: document.getElementById("listIcon"),
	listContent: document.getElementById("listContent"),
	listLoading: document.getElementById("listLoading"),
	detailContainer: document.getElementById("detailContainer"),
	paginationContainer: document.getElementById("paginationContainer"),
	backButton: document.getElementById("backButton"),
	searchInput: document.getElementById("searchInput"),
	themeToggle: document.getElementById("themeToggle"),
	backToTopBtn: document.getElementById("backToTopBtn"),
	header: document.querySelector("header")
};

// ====================== UTILITY FUNCTIONS ======================
const Utils = {
	showElement: (element, show = true) => {
		if (element) element.style.display = show ? "block" : "none";
	},

	clearContainer: element => {
		if (element) element.innerHTML = "";
	},

	renderLoading: (container, show = true) => {
		if (container) {
			container.style.display = show ? "flex" : "none";
			if (show) {
				container.innerHTML = '<div class="loading-spinner"></div>';
			}
		}
	},

	showError: (message, container) => {
		if (container) {
			container.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>${message}</p></div>`;
		}
	},

	playAudio: url => {
		if (url) new Audio(url).play().catch(console.log);
	},

	shareContent: content => {
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
	},

	formatProphetYear: (year, prophetName) => {
		if (!year) return { text: "Tidak diketahui", className: "" };
		const yearNum = typeof year === "string" ? parseInt(year) || 0 : year;

		if (prophetName.includes("Isa")) {
			return { text: "1 M (Kelahiran Nabi Isa AS)", className: "isa-year" };
		}

		return { text: `${yearNum}`, className: "sm-year" };
	},

	// Fungsi fetch umum dengan caching
	fetchWithCache: async (url, cacheKey) => {
		// Cek cache
		const cachedData = localStorage.getItem(cacheKey);
		const now = Date.now();

		if (cachedData) {
			const { data, timestamp } = JSON.parse(cachedData);

			// Periksa apakah cache masih berlaku
			if (now - timestamp < API_CONFIG.cacheExpiry) {
				return data;
			}
		}

		// Fetch dari API
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Gagal mengambil data dari ${url}`);
		}

		const data = await response.json();

		// Simpan ke cache dengan timestamp
		localStorage.setItem(
			cacheKey,
			JSON.stringify({
				data,
				timestamp: now
			})
		);

		return data;
	},

	scrollToTop: () => {
		const headerHeight = DOM.header ? DOM.header.offsetHeight - 70 : 70;
		window.scrollTo({
			top: headerHeight,
			behavior: "smooth"
		});
	}
};

// ====================== VIEW MANAGER ======================
const ViewManager = {
	navigateTo: (viewName, data = null) => {
		// Simpan state saat ini ke history
		appState.history.push({
			view: appState.currentView,
			data: appState.currentData
		});

		// Update state
		appState.currentView = viewName;
		appState.currentData = data;

		// Render view baru
		ViewManager.renderCurrentView();

		// Scroll ke atas
		Utils.scrollToTop();
	},

	goBack: () => {
		if (appState.history.length > 0) {
			// Ambil state sebelumnya
			const prevState = appState.history.pop();

			// Update state
			appState.currentView = prevState.view;
			appState.currentData = prevState.data;

			// Render view
			ViewManager.renderCurrentView();

			// Scroll ke atas
			Utils.scrollToTop();
		} else {
			// Kembali ke halaman utama jika tidak ada history
			ViewManager.navigateTo("mainShelf");
		}
	},

	renderCurrentView: () => {
		// Sembunyikan semua tampilan
		Utils.showElement(DOM.mainShelf, false);
		Utils.showElement(DOM.listContainer, false);
		Utils.showElement(DOM.detailContainer, false);
		Utils.showElement(DOM.paginationContainer, false);

		// Tampilkan tombol kembali jika tidak di tampilan utama
		Utils.showElement(DOM.backButton, appState.currentView !== "mainShelf");

		// Render view yang sesuai
		switch (appState.currentView) {
			case "mainShelf":
				ViewManager.renderMainShelf();
				break;

			case "surahList":
			case "hadithList":
			case "asmaulHusnaList":
			case "prophetStoriesList":
				ViewManager.renderListView();
				break;

			case "surahDetail":
			case "hadithDetail":
			case "asmaDetail":
			case "prophetDetail":
				ViewManager.renderDetailView();
				break;
		}
	},

	renderMainShelf: () => {
		Utils.showElement(DOM.mainShelf, true);
		appState.searchQuery = "";
	},

	renderListView: () => {
		// Konfigurasi berdasarkan jenis tampilan
		const viewConfigs = {
			surahList: {
				title: "Daftar Surah Al-Quran",
				subtitle: "Pilih Surah",
				icon: "fas fa-book-quran",
				placeholder: "Cari surah berdasarkan nama atau nomor...",
				fetchFunction: DataManager.fetchQuranData
			},
			hadithList: {
				title: "Kitab Hadits Utama",
				subtitle: "Pilih Kitab Hadits",
				icon: "fas fa-book",
				placeholder: "Cari hadits dalam semua kitab...",
				fetchFunction: DataManager.fetchHadithData
			},
			asmaulHusnaList: {
				title: "Asmaul Husna",
				subtitle: "99 Nama Allah",
				icon: "fas fa-signature",
				placeholder: "Cari nama Allah...",
				fetchFunction: DataManager.fetchAsmaulHusnaData
			},
			prophetStoriesList: {
				title: "Kisah Nabi dan Rasul",
				subtitle: "25 Nabi dan Rasul",
				icon: "fas fa-book-open",
				placeholder: "Cari nabi...",
				fetchFunction: DataManager.fetchProphetStoriesData
			}
		};

		const config = viewConfigs[appState.currentView];
		if (!config) return;

		// Atur tampilan
		DOM.listTitle.textContent = config.title;
		DOM.listSubtitle.textContent = config.subtitle;
		DOM.listIcon.className = config.icon;
		DOM.searchInput.placeholder = config.placeholder;
		DOM.searchInput.value = "";
		appState.searchQuery = "";

		// Tampilkan container
		Utils.showElement(DOM.listContainer, true);

		// Load data
		config.fetchFunction();
	},

	renderDetailView: () => {
		Utils.clearContainer(DOM.detailContainer);
		Utils.showElement(DOM.detailContainer, true);

		switch (appState.currentView) {
			case "surahDetail":
				DataManager.renderSurahDetail(appState.currentData);
				break;

			case "hadithDetail":
				DataManager.renderHadithDetail(appState.currentData);
				break;

			case "asmaDetail":
				DataManager.renderAsmaDetail(appState.currentData);
				break;

			case "prophetDetail":
				DataManager.renderProphetDetail(appState.currentData);
				break;
		}
	}
};

// ====================== DATA MANAGER ======================
const DataManager = {
	// Fungsi helper untuk render detail dengan paginasi
	async renderDetailWithPagination(options) {
		const {
			container,
			loadingMessage,
			fetchUrl,
			renderHeader,
			renderContent,
			onPageChange,
			dataObject
		} = options;

		// Tampilkan loading state
		container.innerHTML = `<div class="loading">${loadingMessage}</div>`;
		Utils.showElement(DOM.paginationContainer, false);

		try {
			// Fetch data
			const response = await fetch(fetchUrl);
			if (!response.ok) throw new Error("Gagal mengambil data");
			const data = await response.json();

			// Render konten
			container.innerHTML = renderHeader() + renderContent(data);

			// Handle paginasi
			if (dataObject(data).last_page > 1) {
				paginationModule.render(
					DOM.paginationContainer,
					dataObject(data),
					newPageUrl => {
						Utils.scrollToTop();
						onPageChange(newPageUrl);
					}
				);
				Utils.showElement(DOM.paginationContainer, true);
			}
		} catch (error) {
			console.error("Error:", error);
			Utils.showError(error.message, container);
		}
	},

	fetchQuranData: async () => {
		Utils.renderLoading(DOM.listLoading, true);
		Utils.clearContainer(DOM.listContent);

		try {
			const data = await Utils.fetchWithCache(API_CONFIG.quran, "quran_data");
			appState.quranData = data;
			DataManager.renderSurahList(data);
		} catch (error) {
			console.error("Error fetching Quran data:", error);
			Utils.showError(error.message, DOM.listContent);
		} finally {
			Utils.renderLoading(DOM.listLoading, false);
		}
	},

	renderSurahList: data => {
		DOM.listContent.innerHTML = data
			.map(
				surah => `
            <div class="book small" data-id="${surah.number}">
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

		// Event listener
		DOM.listContent.querySelectorAll(".book").forEach(book => {
			book.addEventListener("click", () => {
				const surah = data.find(s => s.number === parseInt(book.dataset.id));
				ViewManager.navigateTo("surahDetail", surah);
			});
		});
	},

	fetchHadithData: async () => {
		Utils.renderLoading(DOM.listLoading, true);
		Utils.clearContainer(DOM.listContent);

		try {
			const data = await Utils.fetchWithCache(API_CONFIG.hadith, "hadith_data");
			appState.hadithData = data;
			DataManager.renderHadithList(data);
		} catch (error) {
			console.error("Error fetching Hadith data:", error);
			Utils.showError(error.message, DOM.listContent);
		} finally {
			Utils.renderLoading(DOM.listLoading, false);
		}
	},

	renderHadithList: data => {
		DOM.listContent.innerHTML = data
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

		// Event listener
		DOM.listContent.querySelectorAll(".book").forEach(book => {
			book.addEventListener("click", () => {
				const collection = data.find(c => c.id === book.dataset.id);
				ViewManager.navigateTo("hadithDetail", collection);
			});
		});
	},

	fetchAsmaulHusnaData: async () => {
		Utils.renderLoading(DOM.listLoading, true);
		Utils.clearContainer(DOM.listContent);

		try {
			const data = await Utils.fetchWithCache(
				API_CONFIG.asmaulHusna,
				"asmaul_husna"
			);
			DataManager.renderAsmaulHusnaList(data);
		} catch (error) {
			console.error("Error fetching Asmaul Husna data:", error);
			Utils.showError(error.message, DOM.listContent);
		} finally {
			Utils.renderLoading(DOM.listLoading, false);
		}
	},

	renderAsmaulHusnaList: data => {
		// Gunakan grid layout untuk Asmaul Husna
		DOM.listContent.innerHTML = `
        <div class="asma-grid">${data.data
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
					.join("")}</div>
        `;

		// Event listener
		DOM.listContent.querySelectorAll(".asma-card").forEach(card => {
			card.addEventListener("click", () => {
				ViewManager.navigateTo("asmaDetail", card.dataset.id);
			});
		});
	},

	fetchProphetStoriesData: async () => {
		Utils.renderLoading(DOM.listLoading, true);
		Utils.clearContainer(DOM.listContent);

		try {
			const data = await Utils.fetchWithCache(
				API_CONFIG.prophetStories,
				"prophet_stories"
			);
			DataManager.renderProphetStoriesList(data);
		} catch (error) {
			console.error("Error fetching Prophet stories data:", error);
			Utils.showError(error.message, DOM.listContent);
		} finally {
			Utils.renderLoading(DOM.listLoading, false);
		}
	},

	renderProphetStoriesList: data => {
		// Gunakan grid layout untuk kisah nabi
		DOM.listContent.innerHTML = `
           <div class="prophet-grid">
      ${data.data
				.map(prophet => {
					const { text, className } = Utils.formatProphetYear(
						prophet.birth_year,
						prophet.name
					);
					return `
            <div class="prophet-card" data-id="${prophet.id}">
              <div class="prophet-image-container">
                <img src="${prophet.image_url}" alt="${prophet.name}" class="prophet-image">
                <div class="prophet-overlay">
                  <h3 class="prophet-name">${prophet.name}</h3>
                  <div class="prophet-meta">
                    <i class="fas fa-calendar"></i>
                    <span class="prophet-year ${className}">${text}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
				})
				.join("")}
    </div>
        `;

		// Event listener
		DOM.listContent.querySelectorAll(".prophet-card").forEach(card => {
			card.addEventListener("click", () => {
				ViewManager.navigateTo("prophetDetail", card.dataset.id);
			});
		});
	},

	renderSurahDetail: (surah, pageUrl = null) => {
		const url = pageUrl || `${API_CONFIG.quran}/${surah.number}/verses`;

		DataManager.renderDetailWithPagination({
			container: DOM.detailContainer,
			loadingMessage: "Memuat detail surah...",
			fetchUrl: url,
			renderHeader: () => `
                <div class="detail-header">
                    <h2>${surah.name}</h2>
                    <h3>${surah.name_latin}</h3>
                    <div class="surah-meta">
                        <div>${surah.number_of_verses} Ayat</div>
                        <div>${surah.place}</div>
                        <div>Arti: ${surah.meaning}</div>
                    </div>
                </div>
            `,
			renderContent: verses => `
                <div class="detail-content">
                    ${verses.data
											.map(verse => DataManager.renderVerseItem(verse, surah))
											.join("")}
                </div>
            `,
			onPageChange: newPageUrl => {
				DataManager.renderSurahDetail(surah, newPageUrl);
			},
			dataObject: data => data
		});
	},

	renderVerseItem: (verse, surah, showSurahName = false) => {
		const audio = verse.audio?.["05"] || "";
		const shareContent = `Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;

		return `
            <div class="verse-item">
                ${
									showSurahName
										? `
                    <div class="surah-name">
                        <i class="fas fa-book-quran"></i>${surah.name_latin} (${surah.number})
                    </div>`
										: ""
								}
                <div class="verse-header">
                    <div class="verse-number">${verse.verse_number}</div>
                    <div class="verse-controls">
                        <button class="audio-btn" data-audio="${audio}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="share-btn" data-content="${encodeURIComponent(
													shareContent
												)}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="arabic-text">${verse.arabic_text}</div>
                <div class="latin-text">${verse.latin_text}</div>
                <div class="translation-text">${verse.translation}</div>
            </div>
        `;
	},

	renderHadithDetail: (collection, pageUrl = null) => {
		const url = pageUrl || `${API_CONFIG.hadith}/${collection.id}/hadiths`;

		DataManager.renderDetailWithPagination({
			container: DOM.detailContainer,
			loadingMessage: "Memuat hadits...",
			fetchUrl: url,
			renderHeader: () => `
                <div class="detail-header">
                    <h2>${collection.name}</h2>
                    <div class="surah-meta">
                        <div>Total Hadits: ${collection.total_hadiths}</div>
                    </div>
                </div>
            `,
			renderContent: hadiths => `
                <div class="detail-content">
                    ${hadiths.hadiths.data
											.map(hadith =>
												DataManager.renderHadithItem(hadith, collection)
											)
											.join("")}
                </div>
            `,
			onPageChange: newPageUrl => {
				DataManager.renderHadithDetail(collection, newPageUrl);
			},
			dataObject: data => data.hadiths
		});
	},

	renderHadithItem: (hadith, collection) => {
		const shareContent = `${collection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;

		return `
            <div class="verse-item">
                <div class="verse-header">
                    <div class="verse-number">${hadith.number}</div>
                    <div class="verse-controls">
                        <button class="share-btn" data-content="${encodeURIComponent(
													shareContent
												)}">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="arabic-text">${hadith.arabic}</div>
                <div class="translation-text">
                    <strong>Terjemahan:</strong>
                    <p>${hadith.translation}</p>
                </div>
            </div>
        `;
	},

	renderAsmaDetail: id => {
		// Tampilkan loading sementara
		DOM.detailContainer.innerHTML =
			'<div class="loading">Memuat detail Asmaul Husna...</div>';

		// Fetch data detail
		fetch(`${API_CONFIG.asmaulHusna}/${id}`)
			.then(response => response.json())
			.then(data => {
				const asma = data.data;
				DOM.detailContainer.innerHTML = `
                    <div class="detail-header">
                        <h2>${asma.latine}</h2>
                        <h3>${asma.arabic}</h3>
                        <div class="surah-meta">
                            <div>Nomor: ${asma.number}</div>
                            <div>Arti: ${asma.meaning}</div>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="surah-section">
                            <h3>Penjelasan</h3>
                            <p>${asma.description}</p>
                        </div>
                        <div class="surah-section">
                            <h3>Ayat Referensi</h3>
                            <div class="verses-container">
                                ${asma.verses
																	.map(verse =>
																		DataManager.renderVerseItem(
																			verse,
																			verse.surah,
																			true
																		)
																	)
																	.join("")}
                            </div>
                        </div>
                    </div>
                `;
			})
			.catch(error => {
				console.error("Error fetching asma detail:", error);
				Utils.showError(error.message, DOM.detailContainer);
			});
	},

	renderProphetDetail: id => {
		// Tampilkan loading sementara
		DOM.detailContainer.innerHTML =
			'<div class="loading">Memuat detail kisah nabi...</div>';

		// Fetch data detail
		fetch(`${API_CONFIG.prophetStories}/${id}`)
			.then(response => response.json())
			.then(data => {
				const prophet = data.data;
				const { text, className } = Utils.formatProphetYear(
					prophet.birth_year,
					prophet.name
				);

				DOM.detailContainer.innerHTML = `
                    <div class="detail-header">
                        <h2>${prophet.name}</h2>
                        <div class="surah-meta">
                            <div class="meta-item ${className}">Tahun Kelahiran: ${text}</div>
                            <div class="meta-item">Usia: ${
															prophet.age || "Tidak diketahui"
														}</div>
                            <div class="meta-item">Tempat: ${
															prophet.place || "Tidak diketahui"
														}</div>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="prophet-detail-image-container">
                            <img src="${prophet.image_url}" alt="${
															prophet.name
														}" class="prophet-detail-image">
                            <div class="image-caption">${prophet.name}</div>
                        </div>
                        <div class="surah-description">
                            <p>${prophet.description}</p>
                        </div>
                    </div>
                `;
			})
			.catch(error => {
				console.error("Error fetching prophet detail:", error);
				Utils.showError(error.message, DOM.detailContainer);
			});
	},

	filterList: () => {
		const query = appState.searchQuery.toLowerCase();
		const items = DOM.listContent.querySelectorAll(
			".book, .asma-card, .prophet-card"
		);

		items.forEach(item => {
			const text = item.textContent.toLowerCase();
			item.style.display = text.includes(query) ? "block" : "none";
		});
	}
};

// ====================== EVENT LISTENERS ======================
function setupEventListeners() {
	// Navigasi utama
	document.getElementById("quranBook").addEventListener("click", () => {
		ViewManager.navigateTo("surahList");
	});

	document.getElementById("hadithBook").addEventListener("click", () => {
		ViewManager.navigateTo("hadithList");
	});

	document.getElementById("asmaulHusnaBook").addEventListener("click", () => {
		ViewManager.navigateTo("asmaulHusnaList");
	});

	document
		.getElementById("prophetStoriesBook")
		.addEventListener("click", () => {
			ViewManager.navigateTo("prophetStoriesList");
		});

	// Tombol kembali
	DOM.backButton.addEventListener("click", ViewManager.goBack);

	// Pencarian
	DOM.searchInput.addEventListener("input", e => {
		appState.searchQuery = e.target.value.toLowerCase();
		DataManager.filterList();
	});

	// Toggle tema
	DOM.themeToggle.addEventListener("click", () => {
		const currentTheme =
			document.documentElement.getAttribute("data-theme") || "dark";
		const newTheme = currentTheme === "dark" ? "light" : "dark";
		document.documentElement.setAttribute("data-theme", newTheme);
		localStorage.setItem("theme", newTheme);

		const icon = DOM.themeToggle.querySelector("i");
		icon.className = newTheme === "dark" ? "fas fa-moon" : "fas fa-sun";
	});

	// Delegated events for audio and share buttons
	document.addEventListener("click", e => {
		const audioBtn = e.target.closest(".audio-btn");
		if (audioBtn) {
			Utils.playAudio(audioBtn.dataset.audio);
		}

		const shareBtn = e.target.closest(".share-btn");
		if (shareBtn) {
			Utils.shareContent(shareBtn.dataset.content);
		}
	});

	// Tombol kembali ke atas
	if (DOM.backToTopBtn) {
		window.addEventListener("scroll", () => {
			DOM.backToTopBtn.classList.toggle("show", window.scrollY > 300);
		});

		DOM.backToTopBtn.addEventListener("click", () => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}
}

// ====================== INISIALISASI APLIKASI ======================
function initApp() {
	// Inisialisasi tema
	const savedTheme = localStorage.getItem("theme") || "dark";
	document.documentElement.setAttribute("data-theme", savedTheme);

	const icon = DOM.themeToggle.querySelector("i");
	icon.className = savedTheme === "dark" ? "fas fa-moon" : "fas fa-sun";

	// Setup event listeners
	setupEventListeners();

	// Tambahkan padding untuk header
	document.body.style.paddingTop = DOM.header
		? `${DOM.header.offsetHeight}px`
		: "70px";

	// Tampilkan tampilan utama
	ViewManager.renderCurrentView();
}

// Jalankan aplikasi saat DOM siap
document.addEventListener("DOMContentLoaded", initApp);
