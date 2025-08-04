// ====================== KONFIGURASI ======================
const API_CONFIG = {
	quran: "https://vickyserver.my.id/server/api/books/quran",
	hadith: "https://vickyserver.my.id/server/api/books/hadith-book",
	asmaulHusna: "https://vickyserver.my.id/server/api/books/asmaul-husna",
	prophetStories: "https://vickyserver.my.id/server/api/books/prophet-stories",
	dailyPrayers: "https://vickyserver.my.id/server/api/books/doa",
	search: "https://vickyserver.my.id/server/api/search",
	cacheExpiry: 604800000 // 7 hari dalam milidetik,
};

// ====================== LIBRARY CONFIGURATION ======================
const LibraryConfig = {
	shelves: [
		{
			id: "islam",
			title: "Islam",
			icon: "fas fa-mosque",
			books: [
				{
					id: "quran",
					title: "Al-Quran Al-Karim",
					subtitle: "",
					icon: "fas fa-book-quran",
					badge: "Q",
					viewName: "surahList"
				},
				{
					id: "hadith",
					title: "Al-Hadiths",
					subtitle: "Kitab Hadiths",
					icon: "fas fa-book",
					badge: "H",
					viewName: "hadithList"
				},
				{
					id: "daily-prayer",
					title: "Doa Harian",
					subtitle: "Kumpulan Doa Sehari hari",
					icon: "fas fa-hands-praying",
					badge: "D",
					viewName: "dailyPrayerList"
				},
				{
					id: "asmaul-husna",
					title: "Asmaul Husna",
					subtitle: "99 Nama Allah",
					icon: "fas fa-signature",
					badge: "A",
					viewName: "asmaulHusnaList"
				},
				{
					id: "prophet-stories",
					title: "Kisah Nabi",
					subtitle: "25 Nabi dan Rasul",
					icon: "fas fa-book-open",
					badge: "K",
					viewName: "prophetStoriesList"
				}
			]
		},
		{
			id: "science",
			title: "Sains",
			icon: "fas fa-flask",
			books: [
				{
					id: "physics",
					title: "Fisika Dasar",
					subtitle: "Prinsip Mekanika",
					icon: "fas fa-atom",
					badge: "F",
					viewName: "physicsList"
				}
			]
		}
	]
};

// ====================== LIBRARY MANAGER ======================
const LibraryManager = {
	shelves: [],

	init: function () {
		this.shelves = [...LibraryConfig.shelves];
	},

	addShelf: function (shelf) {
		this.shelves.push(shelf);
	},

	addBook: function (shelfId, book) {
		const shelf = this.shelves.find(s => s.id === shelfId);
		if (shelf) {
			if (!shelf.books) shelf.books = [];
			shelf.books.push(book);
			return true;
		}
		return false;
	},

	getShelf: function (shelfId) {
		return this.shelves.find(s => s.id === shelfId);
	},

	getAllBooks: function () {
		return this.shelves.flatMap(shelf => shelf.books || []);
	}
};

// Inisialisasi library manager
LibraryManager.init();

// ====================== STATE APLIKASI ======================
const appState = {
	currentView: "mainShelf",
	currentData: null,
	history: [],
	searchQuery: "",
	quranData: null,
	hadithData: null,
	dailyPrayerSources: [],
	searchContext: null, // 'global_quran', 'surah_quran', 'global_hadith', 'book_hadith'
	currentSurah: null,
	currentHadithBook: null,
	scrollToVerse: null,
	scrollToHadith: null
};

// =========== DOM ELEMENTS =========
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
	detailSearchInput: document.getElementById("detailSearchInput"),
	themeToggle: document.getElementById("themeToggle"),
	backToTopBtn: document.getElementById("backToTopBtn"),
	header: document.querySelector("header"),
	searchClearBtn: document.getElementById("searchClearBtn")
};

// ====================== UTILITY FUNCTIONS ======================
const Utils = {
	showElement: (element, show = true) => {
		if (element) element.style.display = show ? "block" : "none";
	},

	clearContainer: element => {
		if (element) element.innerHTML = "";
	},

	toggleTheme: () => {
		const currentTheme = document.documentElement.getAttribute("data-theme");
		const newTheme = currentTheme === "dark" ? "light" : "dark";

		document.documentElement.setAttribute("data-theme", newTheme);

		const icon = DOM.themeToggle.querySelector("i");
		icon.className = newTheme === "dark" ? "fas fa-moon" : "fas fa-sun";

		localStorage.setItem("theme", newTheme);
	},

	renderLoading: (container, show = true) => {
		if (container) {
			container.style.display = show ? "flex" : "none";
			if (show) {
				container.innerHTML = '<div class="loading-spinner"></div>';
			}
		}
	},

	renderSearchLoading: (container, show = true) => {
		if (container) {
			if (show) {
				container.innerHTML =
					'<div class="search-loading"><div class="loading-spinner"></div></div>';
			} else {
				container.innerHTML = "";
			}
		}
	},

	renderShareButton: content =>
		`<button class="share-btn" data-content="${encodeURIComponent(
			content
		)}"><i class="fas fa-share-alt"></i></button>`,

	renderSearchInput:
		() => `<div class="search-container" style="margin-top: 20px;">
					<input
						type="text"
						class="search-box"
						id="detailSearchInput"
						placeholder="Cari..." />
					<button id="searchClearBtn" class="search-clear-btn">
						<i class="fas fa-times"></i>
					</button>
				</div>`,

	setupSearchListener: async container => {
		if (!container) return;

		container.addEventListener("keyup", async e => {
			if (e.key === "Enter") {
				const query = e.target.value.trim();
				appState.searchQuery = query;

				DOM.searchClearBtn.style.display = query ? "block" : "none";

				// Hanya lakukan pencarian jika query cukup panjang
				if (query.length >= 3) {
					// Tampilkan indikator loading
					Utils.renderSearchLoading(DOM.detailContainer, true);
					Utils.showElement(DOM.listContainer, false);
					Utils.showElement(DOM.detailContainer, true);
					Utils.showElement(DOM.paginationContainer, false);

					try {
						// Render hasil
						Utils.renderSearchResults(
							query,
							appState.searchContext,
							appState.currentData
						);
					} catch (error) {
						console.error("Search error:", error);
						Utils.showError(error.message, DOM.detailContainer);
					}
				}
			}
		});
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

	highlightText: (text, query) => {
		if (!query || !text) return text;

		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(${escapedQuery})`, "gi");

		return text.replace(regex, "<mark>$1</mark>");
	},

	formatProphetYear: (year, prophetName) => {
		if (!year) return { text: "Tidak diketahui", className: "" };
		const yearNum = typeof year === "string" ? parseInt(year) || 0 : year;

		if (prophetName.includes("Isa")) {
			return {
				text: "1 M (Kelahiran Nabi Isa AS)",
				className: "isa-year"
			};
		}

		return { text: `${yearNum}`, className: "sm-year" };
	},

	// Fungsi fetch umum dengan caching
	fetchWithCache: async (url, cacheKey) => {
		// Cek cache
		const cachedData = await CacheManager.getItem(cacheKey);

		if (cachedData) {
			return cachedData;
		}

		// Fetch dari API
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Gagal mengambil data dari ${url}`);
		}

		const data = await response.json();

		// Simpan ke cache dengan timestamp
		await CacheManager.setItem(cacheKey, data, API_CONFIG.cacheExpiry);

		return data;
	},

	scrollToTop: () => {
		const headerHeight = DOM.header ? DOM.header.offsetHeight - 70 : 70;
		window.scrollTo({
			top: headerHeight,
			behavior: "smooth"
		});
	},

	// Fungsi untuk merender buku
	renderBook: book => {
		return `
            <div class="book" data-id="${book.id}" data-view="${book.viewName}">
                <div class="book-image">
                    <i class="${book.icon}"></i>
                    ${
											book.badge
												? `<div class="surah-number-badge">${book.badge}</div>`
												: ""
										}
                </div>
                <div class="book-title">
                    <h3>${book.title}</h3>
                    ${book.subtitle ? `<p>${book.subtitle}</p>` : ""}
                </div>
            </div>
        `;
	},

	renderSearchResults: (query, context, currentData, pageUrl = null) => {
		let url =
			pageUrl || `${API_CONFIG.search}?query=${encodeURIComponent(query)}`;
		if (context === "global_quran") {
			url += "&type=quran";
		} else if (context === "surah_quran" && currentData) {
			url += `&type=quran&surah_id=${currentData.number}`;
		} else if (context === "global_hadith") {
			url += "&type=hadith";
		} else if (context === "book_hadith" && currentData) {
			url += `&type=hadith&book_id=${currentData.id}`;
		}

		try {
			switch (context) {
				case "global_quran":
				case "surah_quran":
					console.log(currentData);
					DataManager.renderDetailWithPagination({
						container: DOM.detailContainer,
						loadingMessage: "Memuat ayat...",
						fetchUrl: url,
						renderHeader: data => `<div class="search-results-header">
                    <h3>Hasil Pencarian Quran: ${
											currentData ? currentData.name_latin : ""
										}</h3>
                    Mencari: <em>"${query}"</em>
                    <p>Ditemukan ${data.quran.total} hasil</p>
                </div>`,
						renderContent: data =>
							`<div class="search-results-container">${data.quran.data
								.map(item =>
									DataManager.renderVerseItem(
										item,
										item.surah,
										currentData ? false : true,
										query
									)
								)
								.join("")}</div>`,
						onPageChange: newPageUrl =>
							Utils.renderSearchResults(
								query,
								context,
								currentData,
								newPageUrl
							),
						dataObject: data => data.quran,
						onRenderComplete: () => {
							DOM.detailContainer
								.querySelectorAll(".audio-btn")
								.forEach(btn => {
									btn.addEventListener("click", () => {
										Utils.playAudio(btn.dataset.audio);
									});
								});

							DOM.detailContainer
								.querySelectorAll(".share-btn")
								.forEach(btn => {
									btn.addEventListener("click", () => {
										Utils.shareContent(btn.dataset.content);
									});
								});
						}
					});

					break;
				case "global_hadith":
				case "book_hadith":
					DataManager.renderDetailWithPagination({
						container: DOM.detailContainer,
						loadingMessage: "Memuat hadits...",
						fetchUrl: url,
						renderHeader: data => `<div class="search-results-header">
                    <h3>Hasil Pencarian Hadits: ${
											currentData ? currentData.name : ""
										}</h3>
                    Mencari: <em>"${query}"</em>
                    <p>Ditemukan ${data.total} hasil</p>
                </div>`,
						renderContent: data =>
							`<div class="search-results-container">${data.data
								.map(hadith =>
									DataManager.renderHadithItem(
										hadith,
										currentData ? null : hadith.book_id,
										query
									)
								)
								.join("")}</div>`,
						onPageChange: newPageUrl => {
							Utils.renderSearchResults(
								query,
								context,
								currentData,
								newPageUrl
							);
						},
						dataObject: data => data
					});
					break;
			}
		} catch (error) {
			console.error(error);
		}
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
		[appState.currentView, appState.currentData] = [viewName, data];

		// Set konteks pencarian berdasarkan tampilan
		const searchContextMap = {
			surahList: "global_quran",
			surahDetail: "surah_quran",
			hadithList: "global_hadith",
			hadithDetail: "book_hadith"
		};

		appState.searchContext = searchContextMap[viewName] || null;

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
			case "dailyPrayerList":
				ViewManager.renderListView();
				break;

			case "surahDetail":
			case "hadithDetail":
			case "asmaDetail":
			case "prophetDetail":
			case "dailyPrayerDetail":
				ViewManager.renderDetailView();
				break;
		}
	},

	renderMainShelf: () => {
		Utils.showElement(DOM.mainShelf, true);
		appState.searchQuery = "";

		// Render rak buku berdasarkan konfigurasi
		DOM.mainShelf.innerHTML = `
            <h2 class="section-title">Rak Buku</h2>
            ${LibraryManager.shelves
							.map(
								shelf => `
                <div class="shelf-header">
                    <i class="${shelf.icon}"></i>
                    <h3>${shelf.title}</h3>
                </div>
                <div class="bookshelf">
                    <div class="books-container">
                        <div class="books">
                            ${
															shelf.books
																? shelf.books
																		.map(book => Utils.renderBook(book))
																		.join("")
																: '<p class="empty-message">Belum ada buku</p>'
														}
                        </div>
                    </div>
                </div>
            `
							)
							.join("")}
        `;
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
			},
			dailyPrayerList: {
				title: "Sumber Doa Harian",
				subtitle: "Pilih Kategori Doa",
				icon: "fas fa-hands-praying",
				placeholder: "Cari doa...",
				fetchFunction: DataManager.fetchPrayerData
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
			case "dailyPrayerDetail":
				DataManager.renderDailyPrayerDetail(appState.currentData);
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
			dataObject,
			onRenderComplete
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
			container.innerHTML = renderHeader(data) + renderContent(data);

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

			// Panggil callback jika ada
			if (onRenderComplete) onRenderComplete();
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
                    <div class="asma-text-container">
                        <div class="asma-arabic">${asma.arabic}</div>
                        <div class="asma-name">${asma.latine}</div>
                        <div class="asma-meaning">${asma.meaning.id}</div>
                    </div>
                </div>`
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

	fetchPrayerData: async () => {
		Utils.renderLoading(DOM.listLoading, true);
		Utils.clearContainer(DOM.listContent);

		try {
			const data = await Utils.fetchWithCache(
				`${API_CONFIG.dailyPrayers}/sumber`,
				"prayer_data"
			);

			appState.dailyPrayerSources = data.sumber;
			DataManager.renderDailyPrayerSourcesList(data.sumber);
		} catch (error) {
			console.error("Error fetching prayer data:", error);
			Utils.showError(error.message, DOM.listContent);
		} finally {
			Utils.renderLoading(DOM.listLoading, false);
		}
	},

	renderDailyPrayerSourcesList: data => {
		DOM.listContent.innerHTML = data
			.map(
				source => `
                <div class="book small" data-id="${source.nama}">
                    <div class="book-image">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="book-title">
                        <h3>${source.nama}</h3>
                        <p>${source.jumlah} Doa</p>
                    </div>
                </div>
            `
			)
			.join("");

		// Event listener
		DOM.listContent.querySelectorAll(".book").forEach(book => {
			book.addEventListener("click", () => {
				const source = data.find(s => s.nama === book.dataset.id);
				ViewManager.navigateTo("dailyPrayerDetail", book.dataset.id);
			});
		});
	},

	renderDailyPrayerDetail: (sumberId, pageUrl = null) => {
		DOM.detailContainer.innerHTML =
			'<div class="loading">Memuat detail kisah nabi...</div>';

		const url = pageUrl
			? pageUrl
			: `${API_CONFIG.dailyPrayers}/sumber/${sumberId}`;

		DataManager.renderDetailWithPagination({
			container: DOM.detailContainer,
			loadingMessage: "Memuat daftar doa...",
			fetchUrl: url,
			renderHeader: () =>
				`<div class="detail-header">
                    <h2>Doa Harian</h2>
                    <h3>${sumberId}</h3>
                </div>`,
			renderContent: response => {
				const prayers = response.data?.data || [];
				const startNumber =
					(response.data.current_page - 1) * response.data.per_page + 1;

				return `<div class="detail-content">
                    ${prayers
											.map((prayer, index) =>
												DataManager.renderPrayerItem(
													prayer,
													startNumber + index
												)
											)
											.join("")}
                </div>`;
			},
			onPageChange: newPageUrl => {
				DataManager.renderDailyPrayerDetail(sumberId, newPageUrl);
			},
			dataObject: response => response.data
		});
	},

	renderPrayerItem: (prayer, number) => {
		const shareContent = `${prayer.judul}\n\n${prayer.arab || ""}\n\n${
			prayer.latin || ""
		}\n\nTerjemahan: ${prayer.terjemahan || ""}`;

		return `
            <div class="prayer-item">
                <div class="prayer-header">
                    <div class="prayer-number">${number}</div>
                    <div class="prayer-title-container">
                        <h3 class="prayer-title">${prayer.judul}</h3>
                    </div>
                    <div class="prayer-controls">${Utils.renderShareButton(
											shareContent
										)}
                    </div>
                </div>
                ${
									prayer.arab
										? `<div class="arabic-text">${prayer.arab}</div>`
										: ""
								}
                ${
									prayer.latin
										? `<div class="latin-text">${prayer.latin}</div>`
										: ""
								}
                ${
									prayer.terjemahan
										? `<div class="translation-text">${prayer.terjemahan}</div>`
										: ""
								}
            </div>
        `;
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
                    ${Utils.renderSearchInput()}
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
			dataObject: data => data,
			onRenderComplete: () => {
				Utils.setupSearchListener(
					DOM.detailContainer.querySelector("#detailSearchInput")
				);

				// Scroll ke ayat setelah render jika ada permintaan
				if (appState.scrollToVerse) {
					const verseElement = DOM.detailContainer.querySelector(
						`.verse-item[data-verse-number="${appState.scrollToVerse}"]`
					);
					if (verseElement) {
						verseElement.scrollIntoView({
							behavior: "smooth",
							block: "center"
						});
						verseElement.classList.add("highlight");
						setTimeout(() => verseElement.classList.remove("highlight"), 2000);
					}
					// Reset state
					delete appState.scrollToVerse;
				}
			}
		});
	},

	renderVerseItem: (verse, surah, showSurahName = false, query = null) => {
		const audio = verse.audio?.["05"] || "";
		const shareContent = `Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;

		const highlight = text => (query ? Utils.highlightText(text, query) : text);

		return `
            <div class="verse-item" data-verse-number="${verse.verse_number}">
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
                        </button>${Utils.renderShareButton(shareContent)}
                    </div>
                </div>
                <div class="arabic-text">${highlight(verse.arabic_text)}</div>
                <div class="latin-text">${highlight(verse.latin_text)}</div>
                <div class="translation-text">${highlight(
									verse.translation
								)}</div>
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
                    ${Utils.renderSearchInput()}
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
			dataObject: data => data.hadiths,
			onRenderComplete: () => {
				Utils.setupSearchListener(
					DOM.detailContainer.querySelector("#detailSearchInput")
				);

				// Scroll ke hadits setelah render jika ada permintaan
				if (appState.scrollToHadith) {
					const hadithElement = DOM.detailContainer.querySelector(
						`.verse-item[data-hadith-number="${appState.scrollToHadith}"]`
					);
					if (hadithElement) {
						hadithElement.scrollIntoView({
							behavior: "smooth",
							block: "center"
						});
						hadithElement.classList.add("highlight");
						setTimeout(() => hadithElement.classList.remove("highlight"), 2000);
					}
					// Reset state
					delete appState.scrollToHadith;
				}
			}
		});
	},

	renderHadithItem: (hadith, collection = null, query = null) => {
		const shareContent = `${
			collection ? collection.name : "Kitab Hadits"
		} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${
			hadith.translation
		}`;

		const highlight = text => (query ? Utils.highlightText(text, query) : text);
		console.log(collection);

		return `
            <div class="verse-item" data-hadith-number="${hadith.number}">
                <div class="verse-header">
                    <div class="verse-number">${hadith.number}</div>
                    ${
											collection
												? `<div class="surah-name">${
														collection?.name || collection
												  }</div>`
												: ""
										}
                    <div class="verse-controls">${Utils.renderShareButton(
											shareContent
										)}
                    </div>
                </div>
                <div class="arabic-text">${highlight(hadith.arabic)}</div>
                <div class="translation-text">
                    <strong>Terjemahan:</strong>
                    <p>${highlight(hadith.translation)}</p>
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
                            <div class="verses-container">${asma.verses
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
	// Navigasi utama menggunakan event delegation
	DOM.mainShelf.addEventListener("click", function (e) {
		const bookElement = e.target.closest(".book");
		if (bookElement) {
			const viewName = bookElement.dataset.view;
			if (viewName) {
				ViewManager.navigateTo(viewName);
			}
		}
	});

	// Tombol kembali
	DOM.backButton.addEventListener("click", ViewManager.goBack);

	Utils.setupSearchListener(DOM.searchInput);

	// Tombol clear search
	DOM.searchClearBtn.addEventListener("click", function () {
		DOM.searchInput.value = "";
		appState.searchQuery = "";
		this.style.display = "none";
		restoreOriginalView();
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

	DOM.themeToggle.addEventListener("click", Utils.toggleTheme);

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
