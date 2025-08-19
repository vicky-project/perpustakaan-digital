// Elemen DOM
// ========== DOM SELECTORS ============
const DOM = {
	// Elemen utama
	body: document.body,
	header: document.querySelector("header"),
	mainshelfSection: document.getElementById("mainshelf"),
	listbookSection: document.getElementById("listbook"),
	detailbook: document.getElementById("detailbook"),
	bookList: document.getElementById("book-list"),
	descriptionContainer: document.getElementById("description-container"),
	paginationContainer: document.getElementById("pagination-container"),

	// Tombol dan kontrol
	btnTheme: document.getElementById("btn-theme"),
	btnBack: document.getElementById("btn-back"),

	// Elemen judul
	pageTitle: document.getElementById("page-title"),

	// Elemen detail buku
	bookContent: document.getElementById("book-content"),

	// Input pencarian
	searchInputs: document.querySelectorAll(".search-input"),
	searchButtons: document.querySelectorAll(".search-btn"),
	listSearch: document.getElementById("listbook-search"),
	detailSearch: document.getElementById("detailbook-search")
};

// ============== SEARCH VISIBILITY CONTROL ==============
const SearchVisibility = {
	hideAll() {
		DomHelper.hide(DOM.listSearch);
		DomHelper.hide(DOM.detailSearch);
	},

	showListSearch() {
		DomHelper.show(DOM.listSearch, "flex");
		DomHelper.hide(DOM.detailSearch);
	},

	showDetailSearch() {
		DomHelper.hide(DOM.listSearch);
		DomHelper.show(DOM.detailSearch, "flex");
	},

	hideForDescription() {
		DomHelper.hide(DOM.detailSearch);
	}
};

// ============== NAVIGATION MANAGER ==============
const NavigationManager = {
	// Menangani semua logika navigasi kembali
	handleBack: function () {
		DomHelper.scrollToTop();
		SearchService.clearAllInputs();

		// 1. Tangani penutupan deskripsi jika terbuka
		if (NavigationManager.handleDescriptionClose()) return;

		const currentBook = AppState.currentBook;

		// 2. Tangani navigasi berdasarkan halaman yang aktif
		if (DOM.detailbook.style.display === "block") {
			NavigationManager.handleDetailBack(currentBook);
		} else if (DOM.listbookSection.style.display === "block") {
			NavigationManager.handleListBack(currentBook);
		}
	},

	// Menangani penutupan deskripsi surah
	handleDescriptionClose: function () {
		if (DOM.descriptionContainer?.style.display === "block") {
			DomHelper.show(DOM.bookContent);
			DomHelper.hide(DOM.descriptionContainer);

			if (DOM.paginationContainer.children.length > 0) {
				DomHelper.show(DOM.paginationContainer);
			}

			SearchVisibility.showDetailSearch();
			return true;
		}
		return false;
	},

	// Menangani navigasi dari halaman detail
	handleDetailBack: function (currentBook) {
		// Simpan state sebelum navigasi
		const stateSnapshot = NavigationManager.getStateSnapshot(currentBook);

		switch (currentBook) {
			case "bible":
				NavigationManager.handleBibleBack(stateSnapshot);
				break;
			case "sekolah":
				NavigationManager.handleSekolahBack(stateSnapshot);
				break;
			default:
				NavigationManager.handleBookBack(currentBook);
		}
	},

	// Menangani navigasi dari halaman list
	handleListBack: function (currentBook) {
		if (currentBook === "bible") {
			NavigationManager.handleBibleListBack();
		} else if (currentBook === "sekolah") {
			NavigationManager.handleSekolahBack(
				NavigationManager.getStateSnapshot(currentBook)
			);
		} else {
			showMainShelf();
		}
	},

	// === BIBLE-SPECIFIC HANDLERS ===

	// Navigasi Bible dari halaman detail
	handleBibleBack: function (stateSnapshot) {
		const { level, translationId, bookId } = stateSnapshot;

		switch (level) {
			case "verses":
				BibleService.showList(translationId, bookId);
				break;
			case "chapters":
				BibleService.showList(translationId);
				break;
			case "books":
				BibleService.showList();
				break;
			default:
				showMainShelf();
		}
	},

	// Navigasi Bible dari halaman list
	handleBibleListBack: function () {
		const { level, translationId } = AppState.bible;

		switch (level) {
			case "chapters":
				BibleService.showList(translationId);
				break;
			case "books":
				BibleService.showList();
				break;
			default:
				showMainShelf();
		}
	},

	// === SEKOLAH-SPECIFIC HANDLER ===

	handleSekolahBack: function (stateSnapshot) {
		const { level } = stateSnapshot;

		switch (level) {
			case "kabkota":
				AppState.setBookState("sekolah", { level: "provinsi", kabkota: null });
				SekolahService.showList();
				break;
			case "kecamatan":
				AppState.setBookState("sekolah", {
					level: "kabkota",
					provinsi: stateSnapshot.provinsi
				});
				SekolahService.showList();
				break;
			case "sekolah":
				AppState.setBookState("sekolah", {
					level: "kecamatan",
					kabkota: stateSnapshot.kabkota,
					provinsi: stateSnapshot.provinsi
				});
				SekolahService.showList();
				break;
			default:
				showMainShelf();
				break;
		}
	},

	// === GENERAL BOOK HANDLER ===

	handleBookBack: function (bookType) {
		const serviceMap = {
			quran: QuranService,
			hadith: HadithService,
			doa: DoaService,
			prophet: ProphetService,
			asmaul: AsmaulService,
			ojk: OjkService,
			bahasa: BahasaService
		};

		if (serviceMap[bookType]) {
			serviceMap[bookType].showList();
		} else {
			showMainShelf();
		}
	},

	// === UTILITY FUNCTIONS ===

	// Membuat snapshot state untuk navigasi
	getStateSnapshot: function (bookType) {
		switch (bookType) {
			case "bible":
				return {
					...AppState.bible,
					level: AppState.bible.level,
					translationId: AppState.bible.translationId,
					bookId: AppState.bible.bookId,
					chapterId: AppState.bible.chapterId
				};
			case "sekolah":
				return {
					...AppState.sekolah,
					level: AppState.sekolah.level,
					provinsi: AppState.sekolah.provinsi,
					kabkota: AppState.sekolah.kabkota,
					kecamatan: AppState.sekolah.kecamatan
				};
			default:
				return { ...AppState[bookType] };
		}
	}
};

const ServiceHelper = {
	renderBookList: async (
		service,
		url,
		cacheKey,
		extractData,
		attrId,
		bookDataFn,
		onClickFn,
		title
	) => {
		try {
			AppState.currentData = null;
			const data = await ApiHelper.fetchWithCache(url, cacheKey);

			if (!data) {
				alert("Gagal memuat data...");
				return;
			}

			AppState.currentData = data;

			DomHelper.setHTML(DOM.bookList, "");
			const items = extractData(data);
			items.forEach(item => {
				const card = DomHelper.createElement("div", {
					className: "book-card-container",
					dataset: {
						id: attrId(item)
					},
					html: TemplateHelper.createBookCard(bookDataFn(item))
				});
				DOM.bookList.appendChild(card);
			});

			document
				.querySelectorAll(".book-card-container")
				.forEach(card => card.addEventListener("click", () => onClickFn(card)));

			DOM.pageTitle.textContent = title;
			showListBook();
		} catch (error) {
			console.error(error);
		}
	},

	renderDetail: options => {
		SearchService.clearListSearch();
		if (options.pageTitle) {
			DOM.pageTitle.textContent = options.pageTitle;
		}
		TemplateHelper.renderDetailWithPagination({
			container: DOM.bookContent,
			paginationContainer: DOM.paginationContainer,
			...options
		});

		showDetailBook();
	}
};

const QuranService = {
	showList: async () => {
		AppState.setBookState("quran", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			APP_CONFIG.endpoints.quran,
			"quran_list",
			data => data,
			item => item.id,
			surah => ({
				number: surah.number,
				title: surah.name_latin,
				subtitle: surah.name,
				content: `${surah.number_of_verses} ayat`
			}),
			card => QuranService.showDetail(card.dataset.id),
			"Al-Quran"
		);
	},
	showDetail: async (id, pageUrl = null) => {
		AppState.setBookState("quran", {
			currentPage: "detail",
			surahId: id
		});

		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.quran}/${id}/verses`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data ayat...",
			fetchUrl: url,
			renderHeader: data => {
				const surah = data.data[0].surah;
				AppState.quran.currentSurah = surah;

				return TemplateHelper.renderDetailHeaderView(
					{
						title: surah.name_latin,
						subtitle: surah.name,
						meta: `${surah.place} - ${surah.number_of_verses} Ayat`
					},
					true
				);
			},
			renderContent: data =>
				data.data
					.map(surah =>
						TemplateHelper.renderDetailContentItem(
							{
								number: surah.verse_number,
								arabic: surah.arabic_text,
								latin: surah.latin_text,
								translation: surah.translation,
								audio: surah.audio
							},
							"verse-item"
						)
					)
					.join(""),
			onPageChange: newPageUrl => QuranService.showDetail(id, newPageUrl),
			dataObject: data => data,
			onRenderComplete: () => {
				DomHelper.scrollToTop();
				const btnDescription = document.getElementById("btn-show-description");
				if (btnDescription) {
					btnDescription.addEventListener("click", () => {
						QuranService.showSurahDescription(AppState.quran.currentSurah);
					});
				}
			}
		});
	},

	showSurahDescription(surah) {
		// Sembunyikan konten utama
		DomHelper.hide(DOM.bookContent);
		DomHelper.hide(DOM.paginationContainer);

		// Buat container untuk deskripsi jika belum ada
		if (!DOM.descriptionContainer) {
			DOM.descriptionContainer = document.createElement("div");
			DOM.descriptionContainer.id = "description-container";
			DOM.detailbook.appendChild(DOM.descriptionContainer);
		}

		SearchVisibility.hideForDescription();

		// Render deskripsi surah
		DomHelper.setHTML(
			DOM.descriptionContainer,
			TemplateHelper.renderSurahDescription(
				surah.description || "Deskripsi surah tidak tersedia."
			)
		);

		DomHelper.show(DOM.descriptionContainer);

		// Tambahkan event listener untuk tombol tutup
		document
			.getElementById("btn-close-description")
			.addEventListener("click", () => {
				// Sembunyikan description-container
				DomHelper.hide(DOM.descriptionContainer);
				SearchVisibility.showDetailSearch();
				DomHelper.show(DOM.bookContent);
				QuranService.showDetail(surah.id);
			});
	}
};

const HadithService = {
	showList: async () => {
		AppState.setBookState("hadith", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			APP_CONFIG.endpoints.hadith,
			"hadith_list",
			data => data,
			item => item.id,
			book => ({
				number: book.id,
				title: book.name,
				content: `${book.total_hadiths} hadith`
			}),
			card => HadithService.showDetail(card.dataset.id),
			"Kitab Hadits"
		);
	},

	showDetail: (id, pageUrl = null) => {
		AppState.setBookState("hadith", {
			currentPage: "detail",
			bookId: id
		});

		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.hadith}/${id}/hadiths`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data hadiths...",
			fetchUrl: url,
			renderHeader: data => {
				return TemplateHelper.renderDetailHeaderView({
					title: data.name,
					meta: `Total ${data.total_hadiths} hadits`
				});
			},
			renderContent: data =>
				data.hadiths.data
					.map(hadith =>
						TemplateHelper.renderDetailContentItem(hadith, "verse-item")
					)
					.join(""),
			dataObject: data => data.hadiths,
			onPageChange: newPageUrl => HadithService.showDetail(id, newPageUrl),
			onRenderComplete: () => DomHelper.scrollToTop()
		});
	}
};

const BibleService = {
	showList: async (transId = null, bookId = null) => {
		DomHelper.scrollToTop();
		let level, state;

		if (!transId && !bookId) {
			// Level 1: Daftar terjemahan
			level = "translations";
			state = {
				currentPage: "list",
				level: "translations",
				translationId: null,
				bookId: null,
				chapterId: null
			};
		} else if (transId && !bookId) {
			// Level 2: Daftar buku
			level = "books";
			state = {
				currentPage: "list",
				level: "books",
				translationId: transId,
				bookId: null,
				chapterId: null
			};
		} else if (transId && bookId) {
			// Level 3: Daftar chapter
			level = "chapters";
			state = {
				currentPage: "list",
				level: "chapters",
				translationId: transId,
				bookId: bookId,
				chapterId: null
			};
		}

		AppState.setBookState("bible", {
			...state,
			translations: AppState.bible.translations || null,
			books: AppState.bible.books || null,
			chapters: AppState.bible.chapters || null
		});

		switch (level) {
			case "translations":
				await ServiceHelper.renderBookList(
					this,
					APP_CONFIG.endpoints.bible,
					"bible_translation",
					data => {
						AppState.bible.translations = data.data;
						return data.data;
					},
					item => item.id,
					item => ({
						number: item.id,
						title: item.name,
						content: item.language
					}),
					card => BibleService.showList(card.dataset.id),
					"Terjemahan Alkitab"
				);
				break;
			case "books":
				await ServiceHelper.renderBookList(
					this,
					`${APP_CONFIG.endpoints.bible}/${transId}/books`,
					`bible_books_${transId}`,
					data => {
						AppState.bible.books = data.data;
						return data.data;
					},
					item => item.id,
					item => ({
						number: item.id,
						title: item.name,
						content: item.book_id
					}),
					card => BibleService.showList(transId, card.dataset.id),
					"Daftar Kitab"
				);
				break;
			case "chapters":
				await ServiceHelper.renderBookList(
					this,
					`${APP_CONFIG.endpoints.bible}/${transId}/books/${bookId}/chapters`,
					`bible_chapters_${transId}_${bookId}`,
					data => {
						AppState.bible.chapters = data.data;
						return data.data;
					},
					item => item.id,
					item => ({
						number: item.number,
						title: `Pasal ${item.number}`,
						content: `${item.verses_count} ayat`
					}),
					card => BibleService.showDetail(card.dataset.id),
					"Daftar Pasal"
				);
				break;
		}
	},

	showDetail: (chapterId, pageUrl = null) => {
		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.bible}/${chapterId}/verses`
		);

		// Set state untuk level verses
		AppState.setBookState("bible", {
			...AppState.bible,
			currentPage: "detail",
			level: "verses",
			chapterId: chapterId
		});

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat ayat...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: data.chapter.book_name,
					subtitle: `${data.translation.name} (${data.translation.language})`,
					meta: `Pasal ${data.chapter.number} • ${data.chapter.verses_count} ayat`
				}),
			renderContent: data =>
				data.data.data
					.map(verse =>
						TemplateHelper.renderDetailContentItem(
							{
								number: verse.number,
								translation: verse.text
							},
							"verse-item"
						)
					)
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl =>
				BibleService.showDetail(chapterId, newPageUrl),
			onRenderComplete: () => DomHelper.scrollToTop()
		});
	}
};

const DoaService = {
	showList: async () => {
		AppState.setBookState("doa", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			`${APP_CONFIG.endpoints.doa}/sumber`,
			"doa_list",
			data => data.sumber,
			item => item.nama,
			item => ({
				title: item.nama,
				content: `${item.jumlah} doa`
			}),
			card => DoaService.showDetail(card.dataset.id),
			"Daftar Doa Harian"
		);
	},

	showDetail: (name, pageUrl = null) => {
		AppState.setBookState("doa", {
			currentPage: "detail",
			sourceName: name
		});

		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.doa}/sumber/${name}`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat doa...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: data.sumber,
					meta: `Total ${data.data.total}`
				}),
			renderContent: data =>
				data.data.data
					.map(doa =>
						TemplateHelper.renderDetailContentItem(
							{
								number: doa.id,
								title: doa.judul,
								arabic: doa.arab,
								latin: doa.latin,
								translation: doa.terjemahan
							},
							"verse-item"
						)
					)
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl => DoaService.showDetail(name, newPageUrl),
			onRenderComplete: () => DomHelper.scrollToTop()
		});
	}
};

const ProphetService = {
	showList: async () => {
		AppState.setBookState("prophet", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			APP_CONFIG.endpoints.prophet,
			"prophet_list",
			data => data.data,
			item => item.id,
			item => ({
				title: item.name,
				content: DomHelper.formatProphetYear(item.birth_year, item.name).text
			}),
			card => ProphetService.showDetail(card.dataset.id),
			"Cerita Nabi"
		);

		SearchVisibility.hideAll();
	},

	showDetail: id => {
		AppState.setBookState("prophet", {
			currentPage: "detail",
			prophetId: id
		});

		const url = ApiHelper.convertToHttps(
			`${APP_CONFIG.endpoints.prophet}/${id}`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data nabi...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: data.data.name,
					subtitle: `${data.data.birth_year} (${data.data.age} age)`,
					meta: `${data.data.place}`
				}),
			renderContent: data =>
				TemplateHelper.renderDetailContentItem(
					{
						number: data.data.birth_year,
						translation: data.data.description
					},
					"verse-item"
				),
			dataObject: data => data.data,
			onRenderComplete: () => {
				DomHelper.scrollToTop();
				SearchVisibility.hideAll();
			}
		});
	}
};

const AsmaulService = {
	showList: async () => {
		AppState.setBookState("asmaul", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			APP_CONFIG.endpoints.asmaul,
			"asmaul_husna",
			data => data.data,
			item => item.id,
			item => ({
				title: item.arabic,
				content: item.latine
			}),
			card => AsmaulService.showDetail(card.dataset.id),
			"Asmaul Husna"
		);

		SearchVisibility.hideAll();
	},

	showDetail: id => {
		AppState.setBookState("asmaul", {
			currentPage: "detail",
			asmaulId: id
		});

		const url = ApiHelper.convertToHttps(
			`${APP_CONFIG.endpoints.asmaul}/${id}`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data asmaul husna...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: data.data.arabic,
					subtitle: `${data.data.latine} (${data.data.meaning})`,
					meta: `${data.data.description}.<br>Found: ${data.data.found}`
				}),
			renderContent: data =>
				data.data.verses
					.map(verse =>
						TemplateHelper.renderDetailContentItem(
							{
								number: verse.verse_number,
								title: `Q.S. ${verse.surah.name_latin} (${verse.surah_number}:${verse.verse_number})`,
								arabic: verse.arabic_text,
								latin: verse.latin_text,
								translation: verse.translation,
								audio: verse.audio
							},
							"verse-item"
						)
					)
					.join(""),
			dataObject: data => data.data,
			onRenderComplete: () => {
				DomHelper.scrollToTop();
				SearchVisibility.hideAll();
			}
		});
	}
};

const OjkService = {
	showList: async () => {
		AppState.setBookState("ojk", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			APP_CONFIG.endpoints.ojk,
			"ojk_list",
			data => data.data,
			item => item.toLowerCase(),
			item => ({
				title: item,
				content: `Daftar ${item}`
			}),
			card => OjkService.showDetail(card.dataset.id),
			"OJK Portal"
		);

		SearchVisibility.hideAll();
	},

	showDetail: (type, pageUrl = null) => {
		AppState.setBookState("ojk", {
			currentPage: "detail",
			currentType: type
		});

		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.ojk}/${type}`
		);

		let dataObjectFn;

		switch (type) {
			case "apps":
				dataObjectFn = data => data.data;

				break;
			case "illegals":
				dataObjectFn = data => data.data;

				break;
			case "products":
				dataObjectFn = data => data.data;

				break;
		}

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data ojk...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: type.toUpperCase(),
					meta: `Total ${type.toUpperCase()}: ${data.data.total} item`
				}),
			renderContent: data =>
				TemplateHelper.renderOjkItems(data.data.data, type),
			dataObject: dataObjectFn,
			onPageChange: newPageUrl => OjkService.showDetail(type, newPageUrl),
			pageTitle: type.toUpperCase()
		});
	}
};

const SekolahService = {
	levelConfigs: {
		provinsi: {
			url: state => `${APP_CONFIG.endpoints.sekolah}/provinsi`,
			cacheKey: "sekolah_provinsi",
			attrKey: "kode_prop",
			title: "Sekolah: Daftar Provinsi",
			nextLevel: "kabkota",
			contentFormat: item => item.kode_prop
		},
		kabkota: {
			url: state =>
				`${APP_CONFIG.endpoints.sekolah}/kab-kota/${state.provinsi}`,
			cacheKey: state => `sekolah_kabkota_${state.provinsi}`,
			attrKey: "kode_kab_kota",
			title: "Sekolah: Daftar Kabupaten Kota",
			nextLevel: "kecamatan",
			contentFormat: item => item.kode_kab_kota
		},
		kecamatan: {
			url: state =>
				`${APP_CONFIG.endpoints.sekolah}/kecamatan/${state.kabkota}`,
			cacheKey: state => `sekolah_kecamatan_${state.kabkota}`,
			attrKey: "kode_kec",
			title: "Sekolah: Daftar Kecamatan",
			nextLevel: "sekolah",
			contentFormat: item => item.kode_kec
		}
	},
	showList: async () => {
		const level = AppState.sekolah.level || "provinsi";
		const state = AppState.sekolah;

		const config = SekolahService.levelConfigs[level];

		if (!config) return;

		await ServiceHelper.renderBookList(
			this,
			config.url(state),
			typeof config.cacheKey === "function"
				? config.cacheKey(state)
				: config.cacheKey,
			data => data.data,
			item => item[config.attrKey],
			item => ({
				title: item.nama,
				content: config.contentFormat(item)
			}),
			card => {
				const newState = {
					...state,
					level: config.nextLevel,
					[level]: card.dataset.id,
					currentPage: "list"
				};

				AppState.setBookState("sekolah", newState);
				if (config.nextLevel === "sekolah") {
					SekolahService.showDetail(card.dataset.id);
				} else {
					SekolahService.showList();
				}
			},
			config.title
		);
	},

	showDetail: async (kode_kec, newPageUrl = null) => {
		AppState.setBookState("sekolah", {
			...AppState.sekolah,
			currentPage: "detail",
			level: "sekolah",
			kecamatan: kode_kec
		});

		const url =
			newPageUrl ||
			`${APP_CONFIG.endpoints.sekolah}?kode_kec=${kode_kec}&with_wilayah=1`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data sekolah...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data => "",
			renderContent: data =>
				data.data.data
					.map(
						sekolah =>
							`<div class="school-card" id="${
								sekolah.id
							}">${TemplateHelper.createSchoolCard(sekolah)}</div>`
					)
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl =>
				SekolahService.showDetail(kode_kec, newPageUrl),
			pageTitle: "Daftar Sekolah"
		});
	},

	renderSekolahLevel: async config => {
		const { level, url, cacheKey, attrKey, title, nextLevel } = config;

		return ServiceHelper.renderBookList(
			this,
			url,
			cacheKey,
			data => data.data,
			item => item[attrKey],
			item => ({
				title: item.nama,
				content: `Kode ${level}: ${item[attrKey]}`
			}),
			card => {
				const stateUpdate = { level: nextLevel };
				stateUpdate[level] = card.dataset.id;
				stateUpdate = {
					...AppState.sekolah
				};

				AppState.setBookState("sekolah", stateUpdate);
				SekolahService.showList();
			},
			title
		);
	}
};

const BahasaService = {
	showList: async () => {
		AppState.setBookState("bahasa", {
			currentPage: "list"
		});

		await ServiceHelper.renderBookList(
			this,
			`${APP_CONFIG.endpoints.bahasa}/provinsi`,
			"bahasa_provinsi",
			data => data.data,
			item => item.id,
			item => ({
				title: item.nama || "Tidak diketahui",
				content: `${item.jumlah_bahasa} bahasa`
			}),
			card => BahasaService.showDetail(card.dataset.id),
			"Bahasa Daerah"
		);
	},
	showDetail: (id, pageUrl = null) => {
		AppState.setBookState("bahasa", {
			currentPage: "detail",
			provinceName: id
		});

		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.bahasa}/provinsi/${id}`
		);

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data bahasa daerah...",
			fetchUrl: url,
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: data.data.provinsi.nama
				}),
			renderContent: data =>
				'<h1 style="margin-bottom:2rem;">Daftar Bahasa Daerah:</h1>' +
				data.data.bahasa_daerah
					.map(bahasa =>
						TemplateHelper.renderDetailContentItem(
							{
								title: bahasa.nama,
								latin: bahasa.sumber,
								translation:
									bahasa.deskripsi.map(d => `<p>${d}</p>`).join("<br />") ||
									"No deskripsi"
							},
							"ojk-item"
						)
					)
					.join(""),
			dataObject: data => data.meta,
			onPageChange: newPageUrl => BahasaService.showDetail(id, newPageUrl),
			onRenderComplete: () => DomHelper.scrollToTop()
		});
	}
};

const SearchService = {
	contextParams: {
		quran: {
			list: () => ({ type: "quran" }),
			detail: () => ({ type: "quran", surah_id: AppState.quran.surahId })
		},
		hadith: {
			list: () => ({ type: "hadith" }),
			detail: () => ({ type: "hadith", book_id: AppState.hadith.bookId })
		},
		bible: {
			translations: () => ({
				type: "bible",
				search_type: "translations"
			}),
			books: () => ({
				type: "bible",
				translation_id: AppState.bible.translationId
			}),
			chapters: () => ({
				type: "bible",
				translation_id: AppState.bible.translationId,
				book_id: AppState.bible.bookId
			}),
			verses: () => ({
				type: "bible",
				translation_id: AppState.bible.translationId,
				book_id: AppState.bible.bookId,
				chapter_id: AppState.bible.chapterId
			})
		},
		doa: {
			list: () => ({ type: "doa" }),
			detail: () => ({ type: "doa", source: AppState.doa.sourceName })
		},
		sekolah: {
			provinsi: state => ({
				type: "sekolah",
				with_wilayah: 1
			}),
			kabkota: state => ({
				type: "sekolah",
				with_wilayah: 1,
				kode_prop: state.provinsi
			}),
			kecamatan: state => ({
				type: "sekolah",
				with_wilayah: 1,
				kode_prop: state.provinsi,
				kode_kab_kota: state.kabkota
			}),
			sekolah: state => ({
				type: "sekolah",
				with_wilayah: 1,
				kode_prop: state.provinsi,
				kode_kab_kota: state.kabkota,
				kode_kec: state.kecamatan
			})
		},
		bahasa: {
			list: () => ({ type: "bahasa" }),
			detail: () => ({
				type: "bahasa",
				provinsi_id: AppState.bahasa.provinceName
			})
		},
		ojk: {
			detail: state => ({ type: "ojk", name: state.currentType })
		},
		default: () => ({ type: AppState.currentBook })
	},

	resultRenderers: {
		quran: (verses, query) =>
			verses.quran.data
				.map(verse =>
					TemplateHelper.renderDetailContentItem(
						{
							number: verse.verse_number,
							arabic: DomHelper.highlightMatches(verse.arabic_text, query),
							latin: DomHelper.highlightMatches(verse.latin_text, query),
							translation: DomHelper.highlightMatches(verse.translation, query),
							audio: verse.audio,
							title: `Surah ${verse.surah.name_latin} (${verse.surah_number}:${verse.verse_number})`
						},
						"verse-item"
					)
				)
				.join(""),

		hadith: (hadiths, query) =>
			hadiths.hadith.data
				.map(hadith =>
					TemplateHelper.renderDetailContentItem(
						{
							number: hadith.number,
							title: hadith.book_id,
							arabic: DomHelper.highlightMatches(hadith.arabic, query),
							latin: DomHelper.highlightMatches(hadith.latin, query),
							translation: DomHelper.highlightMatches(hadith.translation, query)
						},
						"verse-item"
					)
				)
				.join(""),

		bible: (verses, query) =>
			verses.bible.data
				.map(verse =>
					TemplateHelper.renderDetailContentItem(
						{
							number: verse.number,
							title: verse.translation?.name || null,
							latin: `${verse.book?.name || ""} Pasal ${verse.chapter.number}:${
								verse.number
							}`,
							translation: DomHelper.highlightMatches(verse.text, query)
						},
						"verse-item"
					)
				)
				.join(""),

		doa: (doas, query) =>
			doas.doa.data
				.map(doa =>
					TemplateHelper.renderDetailContentItem(
						{
							title: DomHelper.highlightMatches(doa.judul, query),
							arabic: DomHelper.highlightMatches(doa.arab, query),
							latin: DomHelper.highlightMatches(doa.latin, query),
							translation: DomHelper.highlightMatches(doa.terjemahan, query)
						},
						"verse-item"
					)
				)
				.join(""),
		sekolah: (data, query) =>
			data.sekolah.data
				.map(
					sekolah =>
						`<div class="school-card" id="${
							sekolah.id
						}">${TemplateHelper.createSchoolCard(sekolah, query)}</div>`
				)
				.join(""),

		bahasa: (data, query) =>
			data.bahasa.data
				.map(bahasa =>
					TemplateHelper.renderDetailContentItem(
						{
							title: `${bahasa.nama} (${bahasa.provinsis[0].nama})`,
							latin: bahasa.provinsis[0].sumber,
							translation: bahasa.provinsis
								.map(p =>
									p.deskripsi
										.map(d => `<p>${DomHelper.highlightMatches(d, query)}</p>`)
										.join("")
								)
								.join("<br />")
						},
						"ojk-item"
					)
				)
				.join(""),

		ojk: (data, query) =>
			TemplateHelper.renderOjkItems(
				data.ojk.data,
				AppState.ojk.currentType,
				query
			),

		default: items =>
			items
				.map(
					item => `
      <div class="search-result-item">
        <h3>${item.title || item.name}</h3>
        ${
					item.content
						? `<div class="result-content">${item.content}</div>`
						: ""
				}
        ${
					item.description
						? `<div class="result-description">${item.description}</div>`
						: ""
				}
      </div>
    `
				)
				.join("")
	},

	performSearch: async (query, pageUrl = null) => {
		if (!query) return;

		try {
			DomHelper.showLoading();

			// 1. Dapatkan parameter pencarian
			const bookType = AppState.currentBook;
			let viewType = AppState[bookType].currentPage || "list";

			if (bookType === "bible") {
				viewType = AppState.bible.level || viewType;
			} else if (bookType === "sekolah") {
				viewType = AppState.sekolah.level || viewType;
			} else if (bookType === "ojk") {
				if (viewType !== "detail") {
					alert("Pencarian OJK hanya tersedia di halaman detail.");
					return;
				}

				if (!AppState.ojk.currentType) {
					alert(
						"Jenis OJK tidak ditemukan. Silakan pilih jenis terlebih dahulu"
					);
					return;
				}
			}

			// 2. Dapatkan fungsi parameter
			let paramsGetter;
			if (SearchService.contextParams[bookType]?.[viewType]) {
				paramsGetter = SearchService.contextParams[bookType][viewType];
			} else if (SearchService.contextParams[bookType]) {
				paramsGetter =
					SearchService.contextParams[bookType].list ||
					SearchService.contextParams.default;
			} else {
				paramsGetter = SearchService.contextParams.default;
			}

			const params = paramsGetter(AppState[bookType]);

			const renderer =
				SearchService.resultRenderers[params.type] ||
				SearchService.resultRenderers.default;

			const url = pageUrl || SearchService.generateSearchParams(query, params);

			ServiceHelper.renderDetail({
				loadingMessage: "Memuat hasil pencarian",
				fetchUrl: ApiHelper.convertToHttps(url),
				renderHeader: data =>
					TemplateHelper.renderDetailHeaderView({
						title: "Hasil Pencarian",
						meta: `Ditemukan ${
							data[params.type]?.total || 0
						} hasil untuk pencarian "${query}"`
					}),
				renderContent: data => renderer(data, query),
				dataObject: data => data[params.type],
				onPageChange: newPageUrl =>
					SearchService.performSearch(query, newPageUrl),
				onRenderComplete: () => DomHelper.scrollToTop(),
				pageTitle: `Pencarian ${query}`
			});
		} catch (error) {
			console.error("Search error:", error);
			alert("Pencarian gagal, Silakan coba lagi!");
		} finally {
			DomHelper.hideLoading();
		}
	},

	generateSearchParams: (query, params) => {
		const urlSearch = new URL(APP_CONFIG.endpoints.search);
		urlSearch.searchParams.append("query", query);
		Object.entries(params).forEach(([key, value]) => {
			if (value) urlSearch.searchParams.append(key, value);
		});
		console.log(urlSearch.toString());

		return urlSearch.toString();
	},

	clearAllInputs: () => {
		// Bersihkan semua input pencarian
		DOM.searchInputs.forEach(input => {
			input.value = "";
		});
	},

	clearListSearch: () => {
		// Bersihkan input pencarian di halaman list
		const listSearchInput = DOM.listSearch.querySelector(".search-input");
		if (listSearchInput) listSearchInput.value = "";
	},

	clearDetailSearch: () => {
		// Bersihkan input pencarian di halaman detail
		const detailSearchInput = DOM.detailSearch.querySelector(".search-input");
		if (detailSearchInput) detailSearchInput.value = "";
	}
};

const ThemeManager = {
	async init() {
		try {
			const savedTheme = await CacheManager.getItem("themePreferences");

			if (savedTheme === "light") {
				DOM.body.classList.add("light-mode");
				ThemeManager.updateThemeButton(true);
			} else {
				ThemeManager.updateThemeButton(false);
			}
		} catch (error) {
			console.error(error);
		}
	},

	async toggle() {
		try {
			const isLight = DOM.body.classList.toggle("light-mode");
			ThemeManager.updateThemeButton(isLight);
			await CacheManager.setItem(
				"themePreferences",
				isLight ? "light" : "dark",
				60 * 60 * 1000
			);
		} catch (error) {
			console.erro(error);
		}
	},

	updateThemeButton(isLight) {
		DOM.btnTheme.innerHTML = isLight
			? '<i class="fas fa-sun"></i><span class="text">Mode Terang</span>'
			: '<i class="fas fa-moon"></i><span class="text">Mode Gelap</span>';
	}
};

// Fungsi untuk menginisialisasi rak buku utama
const initMainShelf = () => {
	let shelvesHTML = "";

	// Membuat rak untuk setiap kategori
	for (const category in APP_CONFIG.bookshelves) {
		const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
		shelvesHTML += TemplateHelper.createBookshelf(
			categoryName,
			APP_CONFIG.bookshelves[category]
		);
	}

	DomHelper.setHTML(DOM.mainshelfSection, shelvesHTML);

	// Menambahkan event listener untuk buku di main shelf
	document.querySelectorAll(".book-cover").forEach(cover => {
		cover.style.setProperty("--book-color", APP_CONFIG.primaryBookColor.main);
		cover.style.setProperty(
			"--book-color-dark",
			APP_CONFIG.primaryBookColor.dark
		);
	});

	document
		.querySelectorAll(".book")
		.forEach(book =>
			book.addEventListener("click", () =>
				handleListAction(book.getAttribute("data-type"))
			)
		);
};

// Fungsi untuk menampilkan main shelf
function showMainShelf() {
	AppState.reset(); // Reset state saat kembali ke main shelf

	DomHelper.animateSectionChange(() => {
		DomHelper.show(DOM.mainshelfSection);
		DomHelper.hide(DOM.listbookSection);
		DomHelper.hide(DOM.detailbook);
		DomHelper.hide(DOM.btnBack);
		DOM.pageTitle.textContent = "Perpustakaan Digital";
	});

	SearchVisibility.hideAll();
}

function showListBook() {
	SearchService.clearDetailSearch();
	DomHelper.animateSectionChange(() => {
		DomHelper.hide(DOM.mainshelfSection);
		DomHelper.show(DOM.listbookSection);
		DomHelper.hide(DOM.detailbook);
		DomHelper.show(DOM.btnBack);
	});
	SearchVisibility.showListSearch();
	DomHelper.scrollToTop();
}

function showDetailBook() {
	SearchService.clearListSearch();
	DomHelper.animateSectionChange(() => {
		DomHelper.hide(DOM.mainshelfSection);
		DomHelper.hide(DOM.listbookSection);
		DomHelper.show(DOM.detailbook);
	});
	SearchVisibility.showDetailSearch();
	DomHelper.scrollToTop();
}

function handleListAction(bookType, transId = null, bookId = null) {
	DomHelper.scrollToTop();
	switch (bookType) {
		case "quran":
			QuranService.showList();
			break;
		case "hadith":
			HadithService.showList();
			break;
		case "bible":
			BibleService.showList(transId, bookId);
			break;
		case "doa":
			DoaService.showList();
			break;
		case "nabi":
			ProphetService.showList();
			break;
		case "asmaul":
			AsmaulService.showList();
			break;
		case "ojk":
			OjkService.showList();
			break;
		case "sekolah":
			SekolahService.showList();
			AppState.setBookState("sekolah", { level: "provinsi" });
			break;
		case "bahasadaerah":
			BahasaService.showList();
			break;
	}
}

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
	// Toggle tema
	DOM.btnTheme.addEventListener("click", () => ThemeManager.toggle());

	// Tombol kembali
	DOM.btnBack.addEventListener("click", () => NavigationManager.handleBack());

	// Pencarian
	DOM.searchInputs.forEach(input =>
		input.addEventListener("keyup", function (e) {
			if (e.key === "Enter") {
				SearchService.performSearch(this.value.trim());
			}
		})
	);

	DOM.searchButtons.forEach(btn =>
		btn.addEventListener("click", function () {
			const input = this.previousElementSibling;
			SearchService.performSearch(input.value.trim());
		})
	);
}

// Inisialisasi aplikasi
const initApp = async () => {
	try {
		initMainShelf();
		setupEventListeners();
		showMainShelf();
		await ThemeManager.init();
	} catch (error) {
		console.error(error);
	}
};

// Jalankan inisialisasi saat dokumen siap
document.addEventListener("DOMContentLoaded", () => initApp());
