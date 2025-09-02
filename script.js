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

const ServiceHelper = {
	renderBookList: async options => {
		try {
			const {
				url,
				cacheKey,
				extractData = data => data,
				attrId = item => item.id,
				bookDataFn,
				onClickFn,
				title
			} = options;
			AppState.currentData = null;
			const data = await ApiHelper.fetchWithCache(url, cacheKey);

			if (!data) {
				alert("Gagal memuat data...");
				return;
			}
			AppState.currentData = data;

			if (!DomHelper.ensureElement(DOM.bookList)) return;
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
				DomHelper.ensureElement(DOM.bookList, el => el.appendChild(card));
				card.addEventListener("click", () => onClickFn(card));
			});
			DomHelper.ensureElement(DOM.pageTitle, el => (el.textContent = title));

			showListBook();
		} catch (error) {
			DomHelper.handleError(error, "ServiceHelper.renderBookList");
		}
	},

	renderDetail: options => {
		SearchService.clearListSearch();

		TemplateHelper.renderDetailWithPagination({
			container: DOM.bookContent,
			paginationContainer: DOM.paginationContainer,
			...options
		});

		if (options.pageTitle) {
			DomHelper.ensureElement(
				DOM.pageTitle,
				el => (el.textContent = options.pageTitle)
			);
		}

		showDetailBook();
	}
};

// ============== BASE SERVICE TEMPLATE ==============
const BaseService = {
	createService: config => ({
		showList: async () => {
			AppState.setBookState(config.bookType, { currentPage: "list" });

			await ServiceHelper.renderBookList({
				url: config.listUrl,
				cacheKey: config.cacheKey,
				extractData: config.extractData,
				attrId: config.attrId,
				bookDataFn: config.bookDataFn,
				onClickFn: config.onClickFn,
				title: config.title
			});

			if (config.afterRenderList) config.afterRenderList();
		},

		showDetail: (id, pageUrl = null) => {
			AppState.setBookState(config.bookType, {
				currentPage: "detail",
				[config.idProperty]: id
			});

			const url = ApiHelper.convertToHttps(
				pageUrl || `${config.detailUrl}/${id}${config.detailSuffix || ""}`
			);

			const renderContent = config.customRender
				? data => config.customRender(data, id)
				: data =>
						config
							.renderContent(data, id)
							.map(item =>
								TemplateHelper.renderDetailContentItem(item, config.renderType)
							)
							.join("");

			ServiceHelper.renderDetail({
				loadingMessage: config.loadingMessage,
				fetchUrl: url,
				renderHeader: data =>
					TemplateHelper.renderDetailHeaderView(
						config.renderHeader(data),
						config.showDescription || false,
						config.renderFilters
					),
				renderContent: renderContent,
				dataObject: config.dataObject,
				onPageChange: newPageUrl => config.onPageChange(id, newPageUrl),
				onRenderComplete: () => {
					DomHelper.scrollToTop();
					if (config.afterRenderDetail) config.afterRenderDetail();
				},
				pageTitle: config.pageTitle ? config.pageTitle(id) : null
			});
		}
	})
};

const QuranService = {
	...BaseService.createService({
		bookType: "quran",
		listUrl: APP_CONFIG.endpoints.server + "/quran",
		cacheKey: "quran_list",
		extractData: data => data,
		attrId: item => item.id,
		bookDataFn: surah => ({
			number: surah.number,
			title: surah.name_latin,
			subtitle: surah.name,
			content: `${surah.number_of_verses} ayat`
		}),
		onClickFn: card => QuranService.showDetail(card.dataset.id),
		title: "Al-Quran",
		detailUrl: `${APP_CONFIG.endpoints.server}/quran`,
		detailSuffix: "/verses",
		idProperty: "surahId",
		loadingMessage: "Memuat data ayat...",
		renderHeader: data => {
			const surah = data.data[0].surah;
			AppState.quran.currentSurah = surah;

			return {
				title: surah.name_latin,
				subtitle: surah.name,
				meta: `${surah.place} - ${surah.number_of_verses} Ayat`,
				showButton: true
			};
		},
		renderContent: data =>
			data.data.map(surah => ({
				number: surah.verse_number,
				arabic: surah.arabic_text,
				latin: surah.latin_text,
				translation: surah.translation,
				audio: surah.audio
			})),
		dataObject: data => data,
		onPageChange: (id, newPageUrl) => QuranService.showDetail(id, newPageUrl),
		afterRenderDetail: () => {
			const btnDescription = document.getElementById("btn-show-description");
			if (btnDescription) {
				btnDescription.addEventListener("click", () => {
					QuranService.showSurahDescription(AppState.quran.currentSurah);
				});
			}
		},
		showDescription: true,
		renderType: "verse-item"
	}),

	showSurahDescription(surah) {
		DomHelper.hide(DOM.bookContent);
		DomHelper.hide(DOM.paginationContainer);

		if (!DOM.descriptionContainer) {
			DOM.descriptionContainer = document.createElement("div");
			DOM.descriptionContainer.id = "description-container";
			Utils.ensureElement(DOM.detailbook, el =>
				el.appendChild(DOM.descriptionContainer)
			);
		}

		SearchVisibility.hideForDescription();
		DomHelper.setHTML(
			DOM.descriptionContainer,
			TemplateHelper.renderSurahDescription(
				surah.description || "Deskripsi surah tidak tersedia.",
				JSON.parse(surah.audio_full)
			)
		);

		DomHelper.show(DOM.descriptionContainer);

		document
			.getElementById("btn-close-description")
			.addEventListener("click", () => {
				DomHelper.hide(DOM.descriptionContainer);
				SearchVisibility.showDetailSearch();
				DomHelper.show(DOM.bookContent);
				QuranService.showDetail(surah.id);
			});
	}
};

const HadithService = {
	...BaseService.createService({
		bookType: "hadith",
		listUrl: APP_CONFIG.endpoints.server + "/hadith-book",
		cacheKey: "hadith_list",
		extractData: data => data,
		attrId: item => item.id,
		bookDataFn: book => ({
			number: book.id,
			title: book.name,
			content: `${book.total_hadiths} hadith`
		}),
		onClickFn: card => HadithService.showDetail(card.dataset.id),
		title: "Kitab Hadits",
		detailUrl: `${APP_CONFIG.endpoints.server}/hadith-book`,
		detailSuffix: "/hadiths",
		idProperty: "bookId",
		loadingMessage: "Memuat data hadiths...",
		renderHeader: data => {
			const bookId = data.id;
			AppState.hadith.bookId = bookId;
			return {
				title: data.name,
				meta: `Total ${data.total_hadiths} hadits`
			};
		},
		renderContent: data => data.hadiths.data,
		dataObject: data => data.hadiths,
		onPageChange: (id, newPageUrl) => HadithService.showDetail(id, newPageUrl),
		renderType: "verse-item"
	})
};

const DoaService = {
	...BaseService.createService({
		bookType: "doa",
		listUrl: `${APP_CONFIG.endpoints.server}/doa/sumber`,
		cacheKey: "doa_list",
		extractData: data => data.sumber,
		attrId: item => item.nama,
		bookDataFn: item => ({
			title: item.nama,
			content: `${item.jumlah} doa`
		}),
		onClickFn: card => DoaService.showDetail(card.dataset.id),
		title: "Daftar Doa Harian",
		detailUrl: `${APP_CONFIG.endpoints.server}/doa/sumber`,
		idProperty: "sourceName",
		loadingMessage: "Memuat doa...",
		renderHeader: data => ({
			title: data.sumber,
			meta: `Total ${data.data.total}`
		}),
		renderContent: data =>
			data.data.data.map(doa => ({
				number: doa.id,
				title: doa.judul,
				arabic: doa.arab,
				latin: doa.latin,
				translation: doa.terjemahan
			})),
		dataObject: data => data.data,
		onPageChange: (id, newPageUrl) => DoaService.showDetail(id, newPageUrl),
		renderType: "verse-item"
	})
};

const ProphetService = {
	...BaseService.createService({
		bookType: "prophet",
		listUrl: `${APP_CONFIG.endpoints.server}/prophet-stories`,
		cacheKey: "prophet_list",
		extractData: data => data.data,
		attrId: item => item.id,
		bookDataFn: item => {
			const formated = DomHelper.formatProphetYear(item.birth_year, item.name);
			return {
				title: item.name,
				content: `<span class="${formated.className}">${formated.text}</span>`
			};
		},
		onClickFn: card => ProphetService.showDetail(card.dataset.id),
		title: "Cerita Nabi",
		afterRenderList: () => SearchVisibility.hideAll(),
		detailUrl: `${APP_CONFIG.endpoints.server}/prophet-stories`,
		idProperty: "prophetId",
		loadingMessage: "Memuat data Nabi...",
		renderHeader: data => {
			const formated = DomHelper.formatProphetYear(
				data.data.birth_year,
				data.data.name
			);
			return {
				title: data.data.name,
				meta: `${data.data.place} pada <span class="${formated.className}">${formated.text}</span> (${data.data.age} age)`
			};
		},
		renderContent: data => [
			{
				number: data.data.birth_year,
				translation: data.data.description
			}
		],
		dataObject: data => data.data,
		afterRenderDetail: () => SearchVisibility.hideAll(),
		renderType: "verse-item"
	})
};

const AsmaulService = {
	...BaseService.createService({
		bookType: "asmaul",
		listUrl: `${APP_CONFIG.endpoints.server}/asmaul-husna`,
		cacheKey: "asmaul_husna",
		extractData: data => data.data,
		attrId: item => item.id,
		bookDataFn: item => ({
			title: item.arabic,
			content: item.latine
		}),
		onClickFn: card => AsmaulService.showDetail(card.dataset.id),
		title: "Asmaul Husna",
		afterRenderList: () => SearchVisibility.hideAll(),
		detailUrl: `${APP_CONFIG.endpoints.server}/asmaul-husna`,
		idProperty: "asmaulId",
		loadingMessage: "Memuat data Asmaul Husna...",
		renderHeader: data => ({
			title: `${data.data.latine} (${data.data.arabic})`,
			subtitle: `${data.data.meaning}`,
			meta: `${data.data.description}.<br>Found: ${data.data.found}`
		}),
		renderContent: data =>
			data.data.verses.map(verse => ({
				number: verse.verse_number,
				title: `Q.S. ${verse.surah.name_latin} (${verse.surah_number}:${verse.verse_number})`,
				arabic: verse.arabic_text,
				latin: verse.latin_text,
				translation: verse.translation,
				audio: verse.audio
			})),
		dataObject: data => data.data,
		afterRenderDetail: () => SearchVisibility.hideAll(),
		renderType: "verse-item"
	})
};

const ShalatService = {
	...BaseService.createService({
		bookType: "shalat",
		listUrl: `${APP_CONFIG.endpoints.server}/shalat`,
		cacheKey: "shalat_list",
		extractData: data => data.data,
		attrId: item => item.id,
		bookDataFn: item => ({
			title: DomHelper.toTitleCase(item.name),
			content: item.details.length + " bacaan"
		}),
		onClickFn: card => ShalatService.showDetail(card.dataset.id),
		title: "Shalat",
		detailUrl: `${APP_CONFIG.endpoints.server}/shalat`,
		idProperty: "shalatId",
		loadingMessage: "Memuat data shalat...",
		renderHeader: data => ({
			title: DomHelper.toTitleCase(data.data.name),
			meta: `Total ${data.data.shalats.length} item`
		}),
		renderContent: data =>
			data.data.shalats.map(shalat => ({
				number: shalat.id,
				title: shalat.name,
				arabic: shalat.arabic,
				latin: shalat.latin,
				translation: shalat.terjemahan
			})),
		dataObject: data => data.data.shalats
	})
};

const BahasaService = {
	...BaseService.createService({
		bookType: "bahasa",
		listUrl: `${APP_CONFIG.endpoints.server}/bahasa/provinsi`,
		cacheKey: "bahasa_provinsi",
		extractData: data => data.data,
		attrId: item => item.id,
		bookDataFn: item => ({
			title: item.nama || "Tidak diketahui",
			content: `${item.jumlah_bahasa} bahasa`
		}),
		onClickFn: card => BahasaService.showDetail(card.dataset.id),
		title: "Bahasa Daerah",
		detailUrl: `${APP_CONFIG.endpoints.server}/bahasa/provinsi`,
		idProperty: "provinceName",
		loadingMessage: "Memuat data Bahasa Daerah...",
		renderHeader: data => ({
			title: data.data.provinsi.nama
		}),
		renderContent: data =>
			data.data.bahasa_daerah.map(bahasa => ({
				title: bahasa.nama,
				latin: bahasa.sumber,
				translation:
					bahasa.deskripsi.map(d => `<p>${d}</p>`).join("<br />") ||
					"No deskripsi"
			})),
		dataObject: data => data.meta,
		onPageChange: (id, newPageUrl) => BahasaService.showDetail(id, newPageUrl),
		renderType: "verse-item"
	})
};

const VolcanoService = {
	...BaseService.createService({
		bookType: "volcano",
		listUrl: `${APP_CONFIG.endpoints.server}/volcanoes/bentuk`,
		cacheKey: "volcano_bentuk",
		extractData: data => data.data,
		attrId: item => item.bentuk,
		bookDataFn: item => ({
			title: item.bentuk,
			content: `${item.jumlah} gunung`
		}),
		onClickFn: card => VolcanoService.prepareShowDetail(card.dataset.id),
		title: "Bentuk Gunung Berapi",
		detailUrl: `${APP_CONFIG.endpoints.server}/volcanoes`,
		idProperty: "bentuk",
		loadingMessage: "Memuat data gunung berapi...",
		renderHeader: data => ({
			title: AppState.volcano.bentuk?.toUpperCase(),
			meta: `Total ${data.data.total} gunung`
		}),
		renderContent: data =>
			data.data.data.map(item => ({
				title: item.nama,
				latin: item.geolokasi,
				translation: `<div>Tinggi: ${item.tinggi_numeric} <em>mdpl</em></div><div>Estimasi letusan terakhir: ${item.estimasi_letusan_terakhir}</div>                <div><a href="https://www.google.com/maps?q=&layer=c&cbll=${item.latitude},${item.longitude}" class="map-link" target="_blank" title="Buka di Google Maps">Buka Lokasi di Peta</a></div>`
			})),
		dataObject: data => data.data,
		onPageChange: (id, newPageUrl) =>
			VolcanoService.prepareShowDetail(id, newPageUrl),
		afterRenderDetail: () => {
			TemplateHelper.initFilterForm(
				".filter-form",
				(min, max) => VolcanoService.applyTinggiFilter(min, max),
				() => VolcanoService.resetTinggiFilter()
			);
		},
		renderFilters: TemplateHelper.createFilterForm([
			{
				type: "number",
				name: "tinggiMin",
				label: "Tinggi Min (mdpl)",
				placeholder: "Minimum",
				value: AppState.volcano.filters?.tinggiMin || ""
			},
			{
				type: "number",
				name: "tinggiMax",
				label: "Tinggi Max (mdpl)",
				placeholder: "Maksimum",
				value: AppState.volcano.filters?.tinggiMax || ""
			}
		]),
		pageTitle: id => id.toUpperCase()
	}),

	prepareShowDetail: (nama, pageUrl = null) => {
		const state = AppState.volcano;

		let params = "";
		if (state.filters?.tinggiMin) {
			params += `&tinggi_min=${state.filters.tinggiMin}`;
		}
		if (state.filters?.tinggiMax) {
			params += `&tinggi_max=${state.filters.tinggiMax}`;
		}

		pageUrl =
			pageUrl ||
			`${APP_CONFIG.endpoints.server}/volcanoes?bentuk=${nama}${params || ""}`;

		VolcanoService.showDetail(nama, pageUrl);
	},

	applyTinggiFilter: (min, max) => {
		const state = AppState.volcano;
		AppState.setBookState("volcano", {
			...AppState.volcano,
			filters: {
				tinggiMin: min || null,
				tinggiMax: max || null
			}
		});
		VolcanoService.prepareShowDetail(state.bentuk);
	},

	resetTinggiFilter: () => {
		const state = AppState.volcano;
		AppState.setBookState("volcano", {
			filters: {
				tinggiMin: null,
				tinggiMax: null
			}
		});
		VolcanoService.prepareShowDetail(state.bentuk);
	}
};

const OjkService = {
	...BaseService.createService({
		bookType: "ojk",
		listUrl: `${APP_CONFIG.endpoints.server}/ojk`,
		cacheKey: "ojk_list",
		extractData: data => data.data,
		attrId: item => item.toLowerCase(),
		bookDataFn: item => ({
			title: item,
			content: `Daftar ${item}`
		}),
		onClickFn: card => OjkService.showDetail(card.dataset.id),
		title: "OJK Portal",
		afterRenderList: () => SearchVisibility.hideAll(),
		detailUrl: `${APP_CONFIG.endpoints.server}/ojk`,
		idProperty: "currentType",
		loadingMessage: "Memuat data OJK...",
		renderHeader: data => ({
			title: AppState.ojk.currentType?.toUpperCase(),
			meta: `Total ${AppState.ojk.currentType?.toUpperCase()}: ${
				data.data.total
			} item`
		}),
		customRender: (data, id) =>
			data.data.data
				.map(item => TemplateHelper.createBookCards(item, "ojk"))
				.join(""),
		dataObject: data => data.data,
		onPageChange: (id, newPageUrl) => OjkService.showDetail(id, newPageUrl),
		pageTitle: id => id.toUpperCase()
	})
};

const BookService = {
	...BaseService.createService({
		bookType: "book",
		listUrl: `${APP_CONFIG.endpoints.server}/book/categories`,
		cacheKey: "books_list",
		extractData: data => data.data,
		attrId: item => item.id,
		bookDataFn: item => ({
			title: item.name,
			content: `${item.books_count} buku`
		}),
		onClickFn: card => BookService.showDetail(card.dataset.id),
		title: "Categories",
		detailUrl: `${APP_CONFIG.endpoints.server}/book`,
		detailSuffix: "/books",
		idProperty: "categoryId",
		loadingMessage: "Memuat data Buku...",
		renderHeader: data => ({
			title: data.data.category.name,
			meta: `Total ${data.data.books.total} buku`
		}),
		renderContent: data =>
			data.data.books.data.map(book => ({
				title: book.title,
				cover_image: book.cover_image,
				summary: book.summary,
				book_link: book.book_link,
				author: book.author,
				publisher: book.publisher,
				detail: book.detail,
				tags: book.tags,
				buy_links: book.buy_links
			})),
		dataObject: data => data.data.books,
		onPageChange: (id, newPageUrl) => BookService.showDetail(id, newPageUrl),
		pageTitle: id => "Buku Item",
		renderType: "book-item"
	})
};

const SekolahService = {
	levelConfigs: {
		provinsi: {
			url: state => `${APP_CONFIG.endpoints.server}/sekolah/provinsi`,
			cacheKey: "sekolah_provinsi",
			attrKey: "kode_prop",
			title: "Sekolah: Daftar Provinsi",
			nextLevel: "kabkota",
			contentFormat: item => item.kode_prop
		},
		kabkota: {
			url: state =>
				`${APP_CONFIG.endpoints.server}/sekolah/kab-kota/${state.provinsi}`,
			cacheKey: state => `sekolah_kabkota_${state.provinsi}`,
			attrKey: "kode_kab_kota",
			title: "Sekolah: Daftar Kabupaten Kota",
			nextLevel: "kecamatan",
			contentFormat: item => item.kode_kab_kota
		},
		kecamatan: {
			url: state =>
				`${APP_CONFIG.endpoints.server}/sekolah/kecamatan/${state.kabkota}`,
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

		await ServiceHelper.renderBookList({
			url: config.url(state),
			cacheKey:
				typeof config.cacheKey === "function"
					? config.cacheKey(state)
					: config.cacheKey,
			extractData: data => data.data,
			attrId: item => item[config.attrKey],
			bookDataFn: item => ({
				title: item.nama,
				content: config.contentFormat(item)
			}),
			onClickFn: card => {
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
			title: config.title
		});
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
			`${APP_CONFIG.endpoints.server}/sekolah?kode_kec=${kode_kec}&with_wilayah=1`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data sekolah...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data => "",
			renderContent: data =>
				data.data.data
					.map(sekolah => TemplateHelper.createBookCards(sekolah, "sekolah"))
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl =>
				SekolahService.showDetail(kode_kec, newPageUrl),
			pageTitle: "Daftar Sekolah"
		});
	}
};

const PesantrenService = {
	levelConfigs: {
		provinsi: {
			url: state => `${APP_CONFIG.endpoints.server}/pesantren/provinsi`,
			cacheKey: "pesantren_provinsi",
			attrKey: "id",
			title: "Pesantren: Daftar Provinsi",
			nextLevel: "kabupaten",
			contentFormat: item => `${item.kabupatens_count} kabupaten`
		},
		kabupaten: {
			url: state =>
				`${APP_CONFIG.endpoints.server}/pesantren/kabupaten/${state.provinsi}`,
			cacheKey: state => `pesantren_kabupaten_${state.provinsi}`,
			attrKey: "id",
			title: "Pesantren: Daftar Kabupaten",
			nextLevel: "pesantren",
			contentFormat: item => `${item.pesantrens_count} pesantren`
		}
	},
	showList: async () => {
		const level = AppState.pesantren.level || "provinsi";
		const state = AppState.pesantren;

		const config = PesantrenService.levelConfigs[level];

		if (!config) return;

		await ServiceHelper.renderBookList({
			url: config.url(state),
			cacheKey:
				typeof config.cacheKey === "function"
					? config.cacheKey(state)
					: config.cacheKey,
			extractData: data => data.data,
			attrId: item => item[config.attrKey],
			bookDataFn: item => ({
				title: item.nama,
				content: config.contentFormat(item)
			}),
			onClickFn: card => {
				const newState = {
					...state,
					level: config.nextLevel,
					[level]: card.dataset.id,
					currentPage: "list"
				};

				AppState.setBookState("pesantren", newState);
				if (config.nextLevel === "pesantren") {
					PesantrenService.showDetail(card.dataset.id);
				} else {
					PesantrenService.showList();
				}
			},
			title: config.title
		});
	},
	showDetail: (kabupatenId, pageUrl = null) => {
		AppState.setBookState("pesantren", {
			...AppState.pesantren,
			currentPage: "detail",
			level: "pesantren",
			Kabupaten: kabupatenId
		});

		const url =
			pageUrl || `${APP_CONFIG.endpoints.server}/pesantren/${kabupatenId}`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data pesantren...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: "Pesantren",
					meta: `Total ${data.data.total} pesantren`
				}),
			renderContent: data =>
				data.data.data
					.map(pesantren =>
						TemplateHelper.createBookCards(pesantren, "pesantren")
					)
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl =>
				PesantrenService.showDetail(kabupatenId, newPageUrl),
			pageTitle: "Daftar Pesantren"
		});
	}
};

const SwiftService = {
	levelConfigs: {
		country: {
			url: state => `${APP_CONFIG.endpoints.server}/swift/country`,
			cacheKey: "swift_country",
			attrKey: "code",
			title: "Daftar Negara",
			nextLevel: "city",
			contentFormat: item => `${item.cities_count} kota`
		},
		city: {
			url: state =>
				`${APP_CONFIG.endpoints.server}/swift/${state.country}/city`,
			cacheKey: state => `swift_city_${state.country}`,
			attrKey: "id",
			title: "Daftar Kota",
			nextLevel: "bank",
			contentFormat: item => `${item.banks_count} Bank`
		}
	},
	showList: async () => {
		const level = AppState.swift.level || "country";
		const state = AppState.swift;

		const config = SwiftService.levelConfigs[level];

		if (!config) return;

		await ServiceHelper.renderBookList({
			url: config.url(state),
			cacheKey:
				typeof config.cacheKey === "function"
					? config.cacheKey(state)
					: config.cacheKey,
			extractData: data => data.data,
			attrId: item => item[config.attrKey],
			bookDataFn: item => ({
				title: item.name,
				content: config.contentFormat(item)
			}),
			onClickFn: card => {
				const newState = {
					...state,
					level: config.nextLevel,
					[level]: card.dataset.id,
					currentPage: "list"
				};

				AppState.setBookState("swift", newState);
				if (config.nextLevel === "bank") {
					SwiftService.showDetail(card.dataset.id);
				} else {
					SwiftService.showList();
				}
			},
			title: config.title
		});
	},
	showDetail: (cityId, pageUrl = null) => {
		AppState.setBookState("swift", {
			...AppState.swift,
			currentPage: "detail",
			level: "bank",
			city: cityId
		});

		const url =
			pageUrl || `${APP_CONFIG.endpoints.server}/swift/${cityId}/bank`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data bank...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: "Swift Bank",
					meta: `Total ${data.data.total} bank`
				}),
			renderContent: data =>
				data.data.data
					.map(code => TemplateHelper.createBookCards(code, "bank"))
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl => SwiftService.showDetail(cityId, newPageUrl),
			pageTitle: "Daftar Swift Bank"
		});
	}
};

const HeroService = {
	showDetail: (pageUrl = null) => {
		AppState.setBookState("hero", {
			currentPage: "detail"
		});
		const url = pageUrl || `${APP_CONFIG.endpoints.server}/heroes`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data pahlawan...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: "Daftar Pahlawan Nasional",
					meta: `Total: ${data.data.total} pahlawan`
				}),
			renderContent: data =>
				data.data.data
					.map(h =>
						TemplateHelper.renderDetailContentItem({
							title: h.name,
							latin: `${h.birth_year} - ${h.death_year}`,
							translation: `<div>${h.description}</div><br /><div><small>Diangkat sebagai pahlawan pada: <em>${h.ascension_year}</em></small></div>`
						})
					)
					.join(""),
			dataObject: data => data.data,
			onPageChange: newPageUrl => HeroService.showDetail(newPageUrl),
			onRenderComplete: () => DomHelper.scrollToTop(),
			pageTitle: "Pahlawan Nasional"
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
				await ServiceHelper.renderBookList({
					url: `${APP_CONFIG.endpoints.server}/bibles`,
					cacheKey: "bible_translation",
					extractData: data => {
						AppState.bible.translations = data.data;
						return data.data;
					},
					attrId: item => item.id,
					bookDataFn: item => ({
						number: item.id,
						title: item.name,
						content: item.language
					}),
					onClickFn: card => BibleService.showList(card.dataset.id),
					title: "Terjemahan Alkitab"
				});
				break;
			case "books":
				await ServiceHelper.renderBookList({
					url: `${APP_CONFIG.endpoints.server}/bibles/${transId}/books`,
					cacheKey: `bible_books_${transId}`,
					extractData: data => {
						AppState.bible.books = data.data;
						return data.data;
					},
					attrId: item => item.id,
					bookDataFn: item => ({
						number: item.id,
						title: item.name,
						content: item.book_id
					}),
					onClickFn: card => BibleService.showList(transId, card.dataset.id),
					title: "Daftar Kitab"
				});
				break;
			case "chapters":
				await ServiceHelper.renderBookList({
					url: `${APP_CONFIG.endpoints.server}/bibles/${transId}/books/${bookId}/chapters`,
					cacheKey: `bible_chapters_${transId}_${bookId}`,
					extractData: data => {
						AppState.bible.chapters = data.data;
						return data.data;
					},
					attrId: item => item.id,
					bookDataFn: item => ({
						number: item.number,
						title: `Pasal ${item.number}`,
						content: `${item.verses_count} ayat`
					}),
					onClickFn: card => BibleService.showDetail(card.dataset.id),
					title: "Daftar Pasal"
				});
				break;
		}
	},

	showDetail: (chapterId, pageUrl = null) => {
		const url = ApiHelper.convertToHttps(
			pageUrl || `${APP_CONFIG.endpoints.server}/bibles/${chapterId}/verses`
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

const KbbiService = {
	showDetail: (pageUrl = null) => {
		AppState.setBookState("kbbi", {
			currentPage: "detail"
		});
		const url = pageUrl || `${APP_CONFIG.endpoints.server}/kbbi`;

		ServiceHelper.renderDetail({
			loadingMessage: "Memuat data kbbi...",
			fetchUrl: ApiHelper.convertToHttps(url),
			renderHeader: data =>
				TemplateHelper.renderDetailHeaderView({
					title: "Kamus Besar Bahasa Indonesia",
					meta: `Total ${data.data.total} item`
				}),
			renderContent: data =>
				data.data.data.map(k =>
					TemplateHelper.renderDetailContentItem(
						{
							arabic: k.word,
							translation: `${k.arti}`
						},
						"verse-item"
					)
				),
			dataObject: data => data.data,
			onPageChange: newPageUrl => KbbiService.showDetail(newPageUrl),
			pageTitle: "KBBI"
		});
	}
};

// ========== SERVICE REGISTRY ============
const ServiceRegistry = {
	quran: { service: QuranService, needsInit: false },
	hadith: { service: HadithService, needsInit: false },
	bible: { service: BibleService, needsInit: false },
	doa: { service: DoaService, needsInit: false },
	prophet: { service: ProphetService, needsInit: false },
	asmaul: { service: AsmaulService, needsInit: false },
	shalat: { service: ShalatService, needsInit: false },
	ojk: { service: OjkService, needsInit: false },
	sekolah: {
		service: SekolahService,
		needsInit: true,
		init: () => AppState.setBookState("sekolah", { level: "provinsi" })
	},
	bahasa: { service: BahasaService, needsInit: false },
	hero: { service: HeroService, needsInit: false, useShowDetail: true },
	volcano: { service: VolcanoService, needsInit: false },
	kbbi: { service: KbbiService, needsInit: false, useShowDetail: true },
	book: { service: BookService, needsInit: false },
	pesantren: {
		service: PesantrenService,
		needsInit: true,
		init: () => AppState.setBookState("pesantren", { level: "provinsi" })
	},
	swift: {
		service: SwiftService,
		needsInit: true,
		init: () => AppState.setBookState("swift", { level: "country" })
	}
};

// ============== NAVIGATION MANAGER ==============
const NavigationManager = {
	backStrategies: {
		default: {
			detail: (state, bookType) => {
				const service = ServiceRegistry[bookType]?.service;
				if (service && service.showList) {
					AppState.reset();
					service.showList();
				} else {
					showMainShelf();
				}
			},
			list: () => showMainShelf()
		},
		bible: {
			detail: state => {
				const { level, translationId, bookId } = state;
				const actions = {
					verses: () => BibleService.showList(translationId, bookId),
					chapters: () => BibleService.showList(translationId),
					books: () => BibleService.showList(),
					default: () => showMainShelf()
				};
				(actions[level] || actions.default)();
			},
			list: state => {
				const { level, translationId } = state;
				const actions = {
					chapters: () => BibleService.showList(translationId),
					books: () => BibleService.showList(),
					default: () => showMainShelf()
				};
				(actions[level] || actions.default)();
			}
		},
		sekolah: {
			detail: state => {
				const { level } = state;
				const actions = {
					kabkota: () => {
						AppState.setBookState("sekolah", {
							level: "provinsi",
							kabkota: null
						});
						SekolahService.showList();
					},
					kecamatan: () => {
						AppState.setBookState("sekolah", {
							level: "kabkota",
							provinsi: state.provinsi
						});
						SekolahService.showList();
					},
					sekolah: () => {
						AppState.setBookState("sekolah", {
							level: "kecamatan",
							kabkota: state.kabkota,
							provinsi: state.provinsi
						});
						SekolahService.showList();
					},
					default: () => showMainShelf()
				};
				(actions[level] || actions.default)();
			},
			list: state => NavigationManager.backStrategies.sekolah.detail(state)
		},
		pesantren: {
			detail: state => {
				const { level } = state;
				const actions = {
					kabupaten: () => {
						AppState.setBookState("pesantren", {
							level: "provinsi",
							kabupaten: null
						});
						PesantrenService.showList();
					},
					pesantren: () => {
						AppState.setBookState("pesantren", {
							level: "kabupaten",
							provinsi: state.provinsi
						});
						PesantrenService.showList();
					},
					default: () => showMainShelf()
				};
				(actions[level] || actions.default)();
			},
			list: state => NavigationManager.backStrategies.pesantren.detail(state)
		},
		swift: {
			detail: state => {
				const { level } = state;
				const actions = {
					city: () => {
						AppState.setBookState("swift", {
							level: "country",
							city: null
						});
						SwiftService.showList();
					},
					bank: () => {
						AppState.setBookState("swift", {
							level: "city",
							country: state.country
						});
						SwiftService.showList();
					},
					default: () => showMainShelf()
				};
				(actions[level] || actions.default)();
			},
			list: state => NavigationManager.backStrategies.swift.detail(state)
		}
	},

	// Menangani semua logika navigasi kembali
	handleBack: function () {
		DomHelper.scrollToTop();
		SearchService.clearAllInputs();

		// 1. Tangani penutupan deskripsi jika terbuka
		if (NavigationManager.handleDescriptionClose()) return;

		const currentBook = AppState.currentBook;
		const state = AppState[currentBook];
		const viewType =
			DomHelper.ensureElement(DOM.detailbook) &&
			DOM.detailbook.style.display === "block"
				? "detail"
				: "list";
		const strategy =
			NavigationManager.backStrategies[currentBook] ||
			NavigationManager.backStrategies.default;
		const handler =
			strategy[viewType] || NavigationManager.backStrategies.default[viewType];
		handler(state, currentBook);
	},

	// Menangani penutupan deskripsi surah
	handleDescriptionClose: function () {
		if (
			DomHelper.ensureElement(DOM.descriptionContainer) &&
			DOM.descriptionContainer.style.display === "block"
		) {
			DomHelper.show(DOM.bookContent);
			DomHelper.hide(DOM.descriptionContainer);

			if (
				DomHelper.ensureElement(DOM.paginationContainer) &&
				DOM.paginationContainer.children.length > 0
			) {
				DomHelper.show(DOM.paginationContainer);
			}

			SearchVisibility.showDetailSearch();
			return true;
		}
		return false;
	}
};

const SearchService = {
	contextParams: {
		quran: {
			list: () => ({ type: "quran" }),
			detail: state => ({ type: "quran", surah_id: state.surahId })
		},
		hadith: {
			list: () => ({ type: "hadith" }),
			detail: state => ({ type: "hadith", book_id: state.bookId })
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
			detail: state => ({ type: "doa", source: state.sourceName })
		},
		shalat: {
			list: () => ({ type: "shalat" }),
			detail: state => ({ type: "shalat", shalat_id: state.shalatId })
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
		hero: {
			detail: () => ({
				type: "hero"
			})
		},
		ojk: {
			detail: state => ({ type: "ojk", name: state.currentType })
		},
		volcano: {
			list: state => ({ type: "volcano" }),
			detail: state => ({ type: "volcano", bentuk: state.bentuk })
		},
		kbbi: {
			detail: state => ({ type: "kbbi" })
		},
		book: {
			list: state => ({ type: "book" }),
			detail: state => ({ type: "boon", categoryId: state.categoryId })
		},
		pesantren: {
			provinsi: state => ({
				type: "pesantren"
			}),
			kabupaten: state => ({
				type: "pesantren",
				provinsi_id: state.provinsi
			}),
			pesantren: state => ({
				type: "pesantren",
				provinsi_id: state.provinsi,
				kabupaten_id: state.kabupaten
			})
		},
		swift: {
			country: state => ({
				type: "swift"
			}),
			city: state => ({
				type: "swift",
				country_id: state.country
			}),
			bank: state => ({
				type: "swift",
				country_id: state.country,
				city_id: state.city
			})
		},
		default: () => ({ type: AppState.currentBook })
	},

	resultRenderers: {
		quran: (verses, query) =>
			verses.data
				.map(verse =>
					TemplateHelper.renderDetailContentItem(
						{
							number: verse.verse_number,
							arabic: verse.arabic_text,
							latin: verse.latin_text,
							translation: verse.translation,
							audio: verse.audio,
							title: `Surah ${verse.surah.name_latin} (${verse.surah_number}:${verse.verse_number})`
						},
						"verse-item",
						query
					)
				)
				.join(""),

		hadith: (hadiths, query) =>
			hadiths.data
				.map(hadith =>
					TemplateHelper.renderDetailContentItem(
						{
							number: hadith.number,
							title: hadith.book_id,
							arabic: hadith.arabic,
							latin: hadith.latin,
							translation: hadith.translation
						},
						"verse-item",
						query
					)
				)
				.join(""),

		bible: (verses, query) =>
			verses.data
				.map(verse =>
					TemplateHelper.renderDetailContentItem(
						{
							number: verse.number,
							title: verse.translation?.name || null,
							latin: `${verse.book?.name || ""} Pasal ${verse.chapter.number}:${
								verse.number
							}`,
							translation: verse.text
						},
						"verse-item",
						query
					)
				)
				.join(""),

		doa: (doas, query) =>
			doas.data
				.map(doa =>
					TemplateHelper.renderDetailContentItem(
						{
							title: doa.judul,
							arabic: doa.arab,
							latin: doa.latin,
							translation: doa.terjemahan
						},
						"verse-item",
						query
					)
				)
				.join(""),
		shalat: (data, query) =>
			data.data.map(shalat =>
				TemplateHelper.renderDetailContentItem(
					{
						number: shalat.id,
						title: shalat.name,
						arabic: shalat.arabic,
						latin: shalat.latin,
						translation: shalat.terjemahan
					},
					"verse-item",
					query
				)
			),
		sekolah: (data, query) =>
			data.data
				.map(sekolah =>
					TemplateHelper.createBookCards(sekolay, "sekolah", query)
				)
				.join(""),

		bahasa: (data, query) =>
			data.data
				.map(bahasa =>
					TemplateHelper.renderDetailContentItem(
						{
							title: `${bahasa.nama} (${bahasa.provinsis[0].nama})`,
							latin: bahasa.provinsis[0].sumber,
							translation: bahasa.provinsis
								.map(p => p.deskripsi.map(d => `<p>${d}</p>`).join(""))
								.join("<br />")
						},
						"ojk-item",
						query
					)
				)
				.join(""),

		ojk: (data, query) =>
			data.data
				.map(item => TemplateHelper.createBookCards(item, "ojk", query))
				.join(""),
		hero: (data, query) =>
			data.data
				.map(h =>
					TemplateHelper.renderDetailContentItem({
						title: DomHelper.highlightMatches(h.name, query),
						latin: `${DomHelper.highlightMatches(
							h.birth_year,
							query
						)} - ${DomHelper.highlightMatches(h.death_year, query)}`,
						translation: `<div>${DomHelper.highlightMatches(
							h.description,
							query
						)}</div><br /><div><small>Diangkat sebagai pahlawan pada: <em>${DomHelper.highlightMatches(
							h.ascension_year,
							query
						)}</em></small></div>`
					})
				)
				.join(""),
		volcano: (data, query) =>
			data.data
				.map(v =>
					TemplateHelper.renderDetailContentItem({
						title: v.bentuk,
						arabic: DomHelper.highlightMatches(v.nama, query),
						latin: v.geolokasi,
						translation: `<div>${
							v.tinggi_numeric
						} <em>mdpl</em></div><div>Estimasi letusan terakhir: ${DomHelper.highlightMatches(
							v.estimasi_letusan_terakhir,
							query
						)}</div><div><a href="https://www.google.com/maps?q=&layer=c&cbll=${
							v.latitude
						},${
							v.longitude
						}" class="map-link" target="_blank" title="Buka di Google Maps">Buka Lokasi di Peta</a></div>`
					})
				)
				.join(""),

		kbbi: (data, query) =>
			data.data
				.map(k =>
					TemplateHelper.renderDetailContentItem({
						title: DomHelper.highlightMatches(k.word, query),
						translation: DomHelper.highlightMatches(k.arti, query)
					})
				)
				.join(""),
		book: (data, query) =>
			data.data
				.map(book =>
					TemplateHelper.renderDetailContentItem(book, "book-item", query)
				)
				.join(""),

		pesantren: (data, query) =>
			data.data
				.map(pesantren =>
					TemplateHelper.createBookCards(pesantren, "pesantren", query)
				)
				.join(""),

		swift: (data, query) =>
			data.data.map(bank =>
				TemplateHelper.createBookCards(bank, "bank", query)
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

	getSearchContext: (bookType, state) => {
		const contextGetters = {
			bible: () => {
				const viewType = state.level || "list";
				return {
					translations: () => ({ type: "bible", search_type: "translations" }),
					books: () => ({ type: "bible", translation_id: state.translationId }),
					chapters: () => ({
						type: "bible",
						translation_id: state.translationId,
						book_id: state.bookId
					}),
					verses: () => ({
						type: "bible",
						translation_id: state.translationId,
						book_id: state.bookId,
						chapter_id: state.chapterId
					})
				}[viewType]();
			},
			// Konteks untuk service lainnya
			default: () => ({ type: bookType })
		};

		return (contextGetters[bookType] || contextGetters.default)();
	},

	performSearch: async (query, pageUrl = null) => {
		if (!query) return;

		try {
			DomHelper.showLoading();

			// 1. Dapatkan parameter pencarian
			const bookType = AppState.currentBook;
			const state = AppState[bookType] || {};
			const viewType = SearchService.getViewType(bookType, state);

			if (bookType === "ojk" && viewType !== "detail") {
				alert("Pencarian OJK hanya tersedia di halaman detail.");
				return;
			}

			// 2. Dapatkan fungsi parameter
			const paramsGetter = SearchService.getParamsGetter(bookType, viewType);

			const params = paramsGetter(state);

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
				renderContent: data =>
					renderer(DomHelper.safeAccess(data, params.type, {}), query),
				dataObject: data => DomHelper.safeAccess(data, params.type, {}),
				onPageChange: newPageUrl =>
					SearchService.performSearch(query, newPageUrl),
				onRenderComplete: () => DomHelper.scrollToTop(),
				pageTitle: `Pencarian ${query}`
			});
		} catch (error) {
			DomHelper.handleError(error, "SearchService.performSearch");
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

	getParamsGetter: (bookType, viewType) => {
		if (!SearchService.contextParams[bookType])
			return SearchService.contextParams.default;

		return (
			SearchService.contextParams[bookType][viewType] ||
			SearchService.contextParams[bookType].list ||
			SearchService.contextParams.default
		);
	},

	getViewType: (bookType, state) => {
		let viewType = state.currentPage || "list";
		if (
			bookType === "bible" ||
			bookType === "sekolah" ||
			bookType === "pesantren"
		)
			viewType = state.level || viewType;

		return viewType;
	},

	clearAllInputs: () => {
		// Bersihkan semua input pencarian
		DOM.searchInputs.forEach(input => {
			input.value = "";
		});
	},

	clearListSearch: () => {
		// Bersihkan input pencarian di halaman list
		const listSearchInput = DOM.listSearch?.querySelector(".search-input");
		if (listSearchInput) listSearchInput.value = "";
	},

	clearDetailSearch: () => {
		// Bersihkan input pencarian di halaman detail
		const detailSearchInput = DOM.detailSearch?.querySelector(".search-input");
		if (detailSearchInput) detailSearchInput.value = "";
	}
};

const ThemeManager = {
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
			DomHelper.handleError(error, "ThemeManager.toggle");
		}
	},

	updateThemeButton(isLight) {
		DomHelper.ensureElement(DOM.btnTheme, btn => {
			btn.innerHTML = isLight
				? '<i class="fas fa-sun"></i><span class="text">Mode Terang</span>'
				: '<i class="fas fa-moon"></i><span class="text">Mode Gelap</span>';
		});
	}
};

// Fungsi untuk menampilkan main shelf
function showMainShelf() {
	AppState.reset(); // Reset state saat kembali ke main shelf

	DomHelper.animateSectionChange(() => {
		DomHelper.show(DOM.mainshelfSection);
		DomHelper.hide(DOM.listbookSection);
		DomHelper.hide(DOM.detailbook);
		DomHelper.hide(DOM.btnBack);
		DomHelper.ensureElement(
			DOM.pageTitle,
			el => (el.textContent = "Perpustakaan Digital")
		);
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
		DomHelper.show(DOM.btnBack);
	});
	SearchVisibility.showDetailSearch();
	DomHelper.scrollToTop();
}

function handleListAction(bookType, transId = null, bookId = null) {
	DomHelper.scrollToTop();
	const serviceConfig = ServiceRegistry[bookType];
	if (!serviceConfig)
		return console.warn(`Service tidak ditemukan untuk: ${bookType}`);
	const { service, needsInit, init, useShowDetail } = serviceConfig;

	if (bookType === "bible") service.showList(transId, bookId);
	else if (useShowDetail) {
		service.showDetail();
	} else {
		service.showList();
		if (needsInit && init) init();
	}
}

// ========== APP INITIALIZER ============
const App = {
	async init() {
		try {
			await this.initTheme();
			this.initMainShelf();
			this.setupEventListeners();
			showMainShelf();
			TrackUser.sendToTelegram();
			BackToTopButton.init({
				color: "#8b4513"
			});
		} catch (error) {
			DomHelper.handleError(error, "initApp");
			alert("Aplikasi gagal dimulai: " + error.message);
		}
	},

	async initTheme() {
		try {
			const savedTheme = await CacheManager.getItem("themePreferences");
			DOM.body.classList.toggle("light-mode", savedTheme === "light");
			ThemeManager.updateThemeButton(savedTheme === "light");
		} catch (error) {
			DomHelper.handleError(error, "ThemeManager.init");
		}
	},

	initMainShelf() {
		if (!DomHelper.ensureElement(DOM.mainshelfSection)) return;

		const shelvesHTML = Object.entries(APP_CONFIG.bookshelves)
			.map(([category, books]) => {
				const categoryName =
					category.charAt(0).toUpperCase() + category.slice(1);
				return TemplateHelper.createBookshelf(categoryName, books);
			})
			.join("");

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
	},

	setupEventListeners() {
		// Toggle tema
		DomHelper.ensureElement(DOM.btnTheme, el =>
			el.addEventListener("click", () => ThemeManager.toggle())
		);

		// Tombol kembali
		DomHelper.ensureElement(DOM.btnBack, el =>
			el.addEventListener("click", () => NavigationManager.handleBack())
		);

		// Pencarian
		DOM.searchInputs.forEach(input =>
			input.addEventListener("keyup", function (e) {
				if (e.key === "Enter") SearchService.performSearch(this.value.trim());
			})
		);

		DOM.searchButtons.forEach(btn =>
			btn.addEventListener("click", function () {
				const input = this.previousElementSibling;
				SearchService.performSearch(input.value.trim());
			})
		);
	}
};

// Jalankan inisialisasi saat dokumen siap
document.addEventListener("DOMContentLoaded", () => App.init());
