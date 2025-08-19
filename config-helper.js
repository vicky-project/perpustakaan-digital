const APP_CONFIG = {
	endpoints: {
		quran: "https://vickyserver.my.id/server/api/books/quran",
		hadith: "https://vickyserver.my.id/server/api/books/hadith-book",
		bible: "https://vickyserver.my.id/server/api/books/bibles",
		doa: "https://vickyserver.my.id/server/api/books/doa",
		prophet: "https://vickyserver.my.id/server/api/books/prophet-stories",
		asmaul: "https://vickyserver.my.id/server/api/books/asmaul-husna",
		ojk: "https://vickyserver.my.id/server/api/books/ojk",
		sekolah: "https://vickyserver.my.id/server/api/books/sekolah",
		bahasa: "https://vickyserver.my.id/server/api/books/bahasa",
		search: "https://vickyserver.my.id/server/api/search"
	},
	bookshelves: {
		islami: [
			{
				id: "quran",
				title: "Al-Quran",
				subtitle: "Al-Quran Al-Karim",
				type: "quran"
			},
			{
				id: "hadith",
				title: "Kitab Hadits",
				subtitle: "Kumpulan Hadits shahih",
				type: "hadith"
			},
			{
				id: "doa",
				title: "Doa Harian",
				subtitle: "Kumpulan doa sehari-hari",
				type: "doa"
			},
			{
				id: "kisah-nabi",
				title: "Kisah Nabi",
				subtitle: "25 Kisah Nabi",
				type: "nabi"
			},
			{
				id: "asmaulhusna",
				title: "Asmaul Husna",
				subtitle: "99 Sifat Allah",
				type: "asmaul"
			}
		],
		rohani: [
			{
				id: "bible",
				title: "Alkitab",
				subtitle: "Perjanjian lama & baru",
				type: "bible"
			}
		],
		finances: [
			{
				id: "ojk",
				title: "Otoritas Jasa Keuangan",
				subtitle: "Informasi Lembaga Jasa Keuangan",
				type: "ojk"
			}
		],
		education: [
			{
				id: "sekolah",
				title: "Data Sekolah",
				subtitle: "Daftar sekolah di Indonesia",
				type: "sekolah"
			},
			{
				id: "bahasadaerah",
				title: "Bahasa Daerah",
				subtitle: "Bahasa Daerah di Indonesia",
				type: "bahasadaerah"
			}
		]
	},
	primaryBookColor: {
		main: "#8D6E63",
		dark: "#6D4C41"
	},
	libraries: {
		LZString: {
			urls: [
				"https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"
			],
			globalVar: "LZString",
			check: () => typeof window.LZString !== "undefined"
		}
	}
};

// ======= APP STATE MANAGEMENT ========
const AppState = {
	// State navigasi umum
	currentCategory: "",
	currentBook: null,
	currentPage: null, // 'list' atau 'detail'

	// State spesifik buku
	quran: {
		surahId: null,
		currentSurah: null
	},
	hadith: {
		bookId: null
	},
	bible: {
		level: null, // 'translations', 'books', 'chapters', 'verses'
		translationId: null,
		bookId: null,
		chapterId: null,
		translations: null,
		books: null,
		chapters: null
	},
	doa: {
		sourceName: null
	},
	prophet: {
		prophetId: null
	},
	asmaul: {
		asmaulId: null
	},
	ojk: {
		currentType: null
	},
	sekolah: {
		level: null,
		provinsi: null,
		kabkota: null,
		kecamatan: null
	},
	bahasa: {
		provinceName: null
	},

	// Fungsi untuk reset state
	reset() {
		this.currentCategory = "";
		this.currentBook = null;
		this.currentPage = null;

		// Reset semua state buku
		this.quran = { surahId: null, currentSurah: null };
		this.hadith = { bookId: null };
		this.bible = {
			level: null,
			translationId: null,
			bookId: null,
			chapterId: null,
			translations: null,
			books: null,
			chapters: null
		};
		this.doa = { sourceName: null };
		this.prophet = { prophetId: null };
		this.asmaul = { asmaulId: null };
		this.ojk = { currentType: null };
		this.sekolah = {};
		this.bahasa = { provinceName: null };
	},

	// Set state untuk buku tertentu
	setBookState(bookType, state) {
		this.reset();
		this.currentBook = bookType;
		if (bookType === "bible") {
			this.bible = { ...this.bible, ...state };
		} else if (bookType === "sekolah") {
			this.sekolah = { ...this.sekolah, ...state };
		} else {
			Object.assign(this[bookType], state);
		}
	}
};

// ====== UTILITAS HELPER ==========
/**
 * Kumpulan utilitas untuk manipulasi DOM
 */
const DomHelper = {
	/**
	 * Menampilkan elemen dengan mengatur properti display
	 * @param {HTMLElement} element - Elemen target
	 * @param {string} [displayType=null] - Tipe display yang diinginkan (contoh: 'block', 'flex').
	 *                                      Jika tidak ditentukan, akan menggunakan nilai asli yang tersimpan.
	 */
	show(element, displayType = null) {
		if (displayType) {
			element.style.display = displayType;
		} else {
			// Pertahankan display asli jika diketahui
			const originalDisplay = element.dataset.originalDisplay || "block";
			element.style.display = originalDisplay;
		}
		element.classList.add("animated");
	},

	/**
	 * Menyembunyikan elemen dan menyimpan tipe display asli
	 * @param {HTMLElement} element - Elemen target
	 */
	hide(element) {
		if (element.style.display && element.style.display !== "none") {
			element.dataset.originalDisplay = element.style.display;
		}
		element.style.display = "none";
	},

	/**
	 * Mengatur konten HTML elemen
	 * @param {HTMLElement} element - Elemen target
	 * @param {string} html - String HTML yang akan di-set
	 */
	setHTML(element, html) {
		element.innerHTML = html;
	},

	/**
	 * Membuat elemen HTML dengan konfigurasi lengkap
	 *
	 * @param {string} tag - Nama tag HTML
	 * @param {Object} [options] - Opsi pembuatan elemen
	 * @param {string} [options.id] - ID elemen
	 * @param {string} [options.className] - Kelas CSS
	 * @param {Object} [options.attributes] - Atribut HTML
	 * @param {Object} [options.dataset] - Data atribut
	 * @param {Object} [options.styles] - Style inline
	 * @param {Object} [options.events] - Event listeners
	 * @param {string} [options.text] - Teks konten
	 * @param {string} [options.html] - HTML konten
	 * @param {Array} [options.children] - Elemen anak
	 * @returns {HTMLElement} Elemen yang dibuat
	 */
	createElement(tag, options = {}) {
		const el = document.createElement(tag);

		// Set ID
		if (options.id) el.id = options.id;

		// Set kelas
		if (options.className) el.className = options.className;

		// Set atribut
		if (options.attributes) {
			for (const [key, value] of Object.entries(options.attributes)) {
				el.setAttribute(key, value);
			}
		}

		// Set data atribut
		if (options.dataset) {
			for (const [key, value] of Object.entries(options.dataset)) {
				el.dataset[key] = value;
			}
		}

		// Set style
		if (options.styles) {
			for (const [property, value] of Object.entries(options.styles)) {
				el.style[property] = value;
			}
		}

		// Set event listeners
		if (options.events) {
			for (const [event, handler] of Object.entries(options.events)) {
				el.addEventListener(event, handler);
			}
		}

		// Set konten
		if (options.text) {
			el.textContent = options.text;
		} else if (options.html) {
			el.innerHTML = options.html;
		}

		// Tambahkan anak elemen
		if (options.children) {
			options.children.forEach(child => {
				if (typeof child === "string") {
					el.appendChild(document.createTextNode(child));
				} else {
					el.appendChild(child);
				}
			});
		}

		return el;
	},

	/**
	 * Membuat dropdown (select) dengan label dan opsi
	 * @param {string} id - ID untuk elemen select
	 * @param {string} label - Teks label
	 * @param {Array} options - Array objek opsi
	 * @param {string} selectedValue - Nilai yang terpilih
	 * @param {Function} onChange - Handler saat nilai berubah
	 * @param {Function} valueFn - Fungsi untuk mengambil nilai dari objek opsi
	 * @returns {HTMLElement} Div berisi label dan dropdown
	 */
	createDropdown(id, label, options, selectedValue, onChange, valueFn) {
		const optionsEl = options.map(opt =>
			DomHelper.createElement("option", {
				attributes: {
					value: valueFn(opt)
				},
				text: opt.nama,
				...(selectedValue === opt.id && {
					attributes: { selected: true }
				})
			})
		);

		return DomHelper.createElement("div", {
			className: "filter-group",
			children: [
				DomHelper.createElement("label", { text: label }),
				DomHelper.createElement("select", {
					id: id,
					children: [
						DomHelper.createElement("option", {
							attributes: { value: "" },
							text: `Pilih ${label}`
						}),
						...optionsEl
					],
					events: {
						change: async e => onChange(e.target.value)
					}
				})
			]
		});
	},

	/**
	 * Mereset dropdown dependen ke keadaan awal
	 * @param {Array<string>} dependents - Array ID dropdown yang akan direset
	 */
	resetDependentDropdowns(dependents) {
		dependents.forEach(id => {
			const select = document.getElementById(id);
			if (select) {
				select.innerHTML = "";
				select.appendChild(
					DomHelper.createElement("option", {
						attributes: {
							value: ""
						},
						text: `Pilih ${select.previousElementSibling.textContent.replace(
							":",
							""
						)}`
					})
				);
			}
		});
	},

	/**
	 * Menampilkan indikator loading global
	 */
	showLoading() {
		// Tampilkan indikator loading
		const loadingIndicator = document.createElement("div");
		loadingIndicator.id = "loading-indicator";
		loadingIndicator.style.position = "fixed";
		loadingIndicator.style.top = "0";
		loadingIndicator.style.left = "0";
		loadingIndicator.style.width = "100%";
		loadingIndicator.style.height = "4px";
		loadingIndicator.style.backgroundColor = "#8D6E63";
		loadingIndicator.style.zIndex = "1000";
		loadingIndicator.style.animation = "loading 2s infinite";

		document.body.appendChild(loadingIndicator);

		// Animasi loading
		const style = document.createElement("style");
		style.innerHTML = `
        @keyframes loading {
            0% { width: 0%; background-color: #6D4C41; }
            50% { width: 70%; background-color: #8D6E63; }
            100% { width: 100%; background-color: #6D4C41; }
        }
    `;
		document.head.appendChild(style);
	},

	/**
	 * Menyembunyikan indikator loading global
	 */
	hideLoading() {
		const loadingIndicator = document.getElementById("loading-indicator");
		if (loadingIndicator) {
			loadingIndicator.remove();
		}
	},

	/**
	 * Animasi transisi pergantian section
	 * @param {Function} callback - Fungsi yang dipanggil setelah animasi keluar selesai
	 */
	animateSectionChange(callback) {
		const sections = [
			document.getElementById("mainshelf"),
			document.getElementById("listbook"),
			document.getElementById("detailbook")
		];
		sections.forEach(section => {
			section.style.opacity = "0";
			section.style.transform = "translateY(20px)";
		});

		setTimeout(() => {
			callback();

			// Re-trigger animasi
			setTimeout(() => {
				const visibleSection = sections.find(s => s.style.display === "block");
				if (visibleSection) {
					visibleSection.style.opacity = "1";
					visibleSection.style.transform = "translateY(0)";
				}
			}, 50);
		}, 300);
	},

	/**
	 * Scroll ke bagian atas halaman dengan offset header
	 */
	scrollToTop() {
		const headerHeight = document.querySelector("header")
			? document.querySelector("header").offsetHeight - 70
			: 70;
		window.scrollTo({
			top: headerHeight,
			behavior: "smooth"
		});
	},

	/**
	 * Memformat tahun kenabian dengan penanganan khusus Nabi Isa AS
	 * @param {number|string} year - Tahun kenabian
	 * @param {string} prophetName - Nama nabi
	 * @returns {Object} Objek berisi teks dan class CSS
	 */
	formatProphetYear(year, prophetName) {
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

	highlightMatches(text, query) {
		if (!text || !query) return text;

		// Escape karakter khusus regex
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(${escapedQuery})`, "gi");

		return text.replace(regex, "<mark>$1</mark>");
	}
};

/**
 * Utility object for API interactions and URL handling
 */
const ApiHelper = {
	/**
	 * Fetches data from a URL with loading indicators and error handling
	 * @async
	 * @param {string} url - The URL to fetch data from
	 * @returns {Promise<Object|null>} Parsed JSON response or null on error
	 */
	async fetchData(url) {
		try {
			DomHelper.showLoading();
			const response = await fetch(url);
			if (!response.ok)
				throw new Error(`HTTP error! status: ${response.status}`);
			return await response.json();
		} catch (error) {
			console.error("Fetch error:", error);
			return null;
		} finally {
			DomHelper.hideLoading();
		}
	},

	/**
	 * Fetches data with caching mechanism
	 * @async
	 * @param {string} url - Data source URL
	 * @param {string} cacheKey - Unique key for cache storage
	 * @param {number} [ttl=86400000] - Cache lifetime in milliseconds (default: 24 hours)
	 * @returns {Promise<Object>} Cached or fresh data
	 * @throws {Error} Propagates fetch errors
	 */
	async fetchWithCache(url, cacheKey, ttl = 24 * 60 * 60 * 1000) {
		try {
			const cacheData = await CacheManager.getItem(cacheKey);

			if (cacheData) return cacheData;

			const data = await ApiHelper.fetchData(url);

			if (data) {
				await CacheManager.setItem(cacheKey, data, ttl);
			}
			return data;
		} catch (error) {
			throw error;
		}
	},

	/**
	 * Converts HTTP URLs to HTTPS while preserving URL structure
	 * @param {string} url - Original URL to convert
	 * @returns {string} Secure HTTPS URL
	 */
	convertToHttps(url) {
		try {
			const urlObj = new URL(url);
			if (urlObj.protocol === "http:") {
				urlObj.protocol = "https:";
				if (urlObj.port === "80") urlObj.port = "";
			}
			return urlObj.toString();
		} catch {
			return url.startsWith("//") ? `https:${url}` : url;
		}
	}
};

/**
 * Kumpulan utilitas untuk menghasilkan template HTML
 */
const TemplateHelper = {
	/**
	 * Membuat rak buku dengan koleksi buku
	 * @param {string} category - Judul kategori rak
	 * @param {Array<Object>} books - Array objek buku
	 * @returns {string} HTML rak buku
	 *
	 * Struktur objek buku:
	 * - id: Identifier unik
	 * - title: Judul buku
	 * - subtitle: Subjudul (opsional)
	 * - type: Jenis buku (opsional)
	 */
	createBookshelf(category, books) {
		return `
      <h2 class="shelf-title animated">${category}</h2>
      <div class="bookshelf-container animated">
        <div class="bookshelf">
          ${books.map(book => this.createBookItem(book, category)).join("")}
        </div>
      </div>
    `;
	},

	/**
	 * Membuat item buku individual untuk rak
	 * @param {Object} book - Data buku
	 * @param {string} category - Kategori induk
	 * @returns {string} HTML item buku
	 *
	 * Atribut data:
	 * - data-category: Kategori buku
	 * - data-book: ID buku
	 * - data-type: Jenis buku (jika ada)
	 */
	createBookItem(book, category) {
		return `
      <div class="book" data-category="${category}" data-book="${
				book.id
			}" data-type="${book.type || ""}">
        <div class="book-spine"></div>
        <div class="book-cover">
          <div class="book-title">${book.title}</div>
          <div class="book-subtitle">${book.subtitle}</div>
        </div>
      </div>
    `;
	},

	/**
	 * Membuat kartu buku detail
	 * @param {Object} data - Data buku
	 * @param {string} data.title - Judul buku
	 * @param {string} [data.subtitle] - Subjudul
	 * @param {string} data.content - Konten HTML
	 * @param {string|number} data.number - Nomor unik
	 * @returns {string} HTML kartu buku
	 *
	 * Warna diambil dari APP_CONFIG:
	 * --book-color: Warna utama
	 * --book-color-dark: Warna gelap untuk efek
	 */
	createBookCard(data) {
		return `
      <div class="book-card animated" data-book="${data.number}">
        <div class="book-card-image" 
             style="--book-color: ${
								APP_CONFIG.primaryBookColor.main
							}; --book-color-dark: ${APP_CONFIG.primaryBookColor.dark}">
          <div class="book-card-title">${data.title}</div>
          ${
						data.subtitle
							? `<div class="book-card-subtitle">${data.subtitle}</div>`
							: ""
					}
        </div>
        <div class="book-card-content">
          <div>${data.content}</div>
        </div>
      </div>
    `;
	},

	/**
	 * Membuat kartu informasi sekolah
	 * @param {Object} sekolah - Data sekolah
	 * @param {string} sekolah.nama - Nama sekolah
	 * @param {string} sekolah.bentuk - Jenis sekolah
	 * @param {string} sekolah.alamat - Alamat lengkap
	 * @param {'S'|'N'} sekolah.status - Status (S=Swasta, N=Negeri)
	 * @param {string} sekolah.npsn - Nomor Pokok Sekolah Nasional
	 * @param {Object} sekolah.kecamatan - Data kecamatan
	 * @returns {string} HTML kartu sekolah
	 */
	createSchoolCard(sekolah, query = "") {
		return `
            <div class="school-header">
                <div class="school-name">${DomHelper.highlightMatches(
									sekolah.nama,
									query
								)}</div>
                <div class="school-type">${sekolah.bentuk}</div>
            </div>
            <div class="school-address">
                <i class="fas fa-map-marker-alt"></i> ${DomHelper.highlightMatches(
									sekolah.alamat,
									query
								)}
            </div>
            <div class="school-details">
                <div><strong>Status:</strong> ${
									sekolah.status === "S" ? "Swasta" : "Negeri"
								}</div>
                <div><strong>NPSN:</strong> ${DomHelper.highlightMatches(
									sekolah.npsn,
									query
								)}</div>
                <div>${DomHelper.highlightMatches(
									sekolah.kecamatan.nama,
									query
								)} • ${DomHelper.highlightMatches(
									sekolah.kecamatan.kabupaten_kota.nama,
									query
								)}</div>
                <div>${DomHelper.highlightMatches(
									sekolah.kecamatan.kabupaten_kota.provinsi.nama,
									query
								)}</div>
                <div><a href="https://www.google.com/maps?q=&layer=c&cbll=${
									sekolah.lintang
								},${
									sekolah.bujur
								}" class="map-link" target="_blank" title="Buka di Google Maps">Buka Lokasi di Peta</a></div>
            </div>
        `;
	},

	/**
	 * Render tampilan detail dengan paginasi
	 * @async
	 * @param {Object} options - Opsi konfigurasi
	 * @param {HTMLElement} options.container - Kontainer target
	 * @param {HTMLElement} options.paginationContainer - Kontainer paginasi
	 * @param {string} options.loadingMessage - Pesan loading
	 * @param {string} options.fetchUrl - URL sumber data
	 * @param {Function} options.renderHeader - Fungsi render header (data) => string
	 * @param {Function} options.renderContent - Fungsi render konten (data) => string
	 * @param {Function} options.onPageChange - Handler perubahan halaman (newPageUrl) => void
	 * @param {Function} options.dataObject - Aksesor data (rawData) => paginationData
	 * @param {Function} [options.onRenderComplete] - Callback setelah render
	 */
	async renderDetailWithPagination(options) {
		const {
			container,
			paginationContainer,
			loadingMessage,
			fetchUrl,
			renderHeader,
			renderContent,
			onPageChange,
			dataObject,
			onRenderComplete
		} = options;

		// Tampilkan loading state
		DomHelper.setHTML(
			container,
			`<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>${loadingMessage}</p></div>`
		);

		DomHelper.hide(paginationContainer);

		try {
			// Fetch data
			const data = await ApiHelper.fetchData(fetchUrl);

			// Render konten
			DomHelper.setHTML(container, renderHeader(data) + renderContent(data));

			// Handle paginasi
			if (dataObject(data).last_page > 1) {
				paginationModule.render(
					DOM.paginationContainer,
					dataObject(data),
					newPageUrl => {
						DomHelper.scrollToTop();
						onPageChange(newPageUrl);
					}
				);
				DomHelper.show(paginationContainer);
			}

			onRenderComplete?.();
			// Panggil callback jika ada
		} catch (error) {
			console.error("Error:", error);
			throw error;
		}
	},

	/**
	 * Membuat header standar untuk tampilan detail
	 * @param {Object} headerData - Data header
	 * @param {string} headerData.title - Judul utama
	 * @param {string} [headerData.subtitle] - Subjudul
	 * @param {string} [headerData.meta] - Metadata tambahan
	 * @param {boolean} [showDescriptionButton=false] - Tampilkan tombol deskripsi?
	 * @returns {string} HTML header detail
	 */
	renderDetailHeaderView(headerData, showDescriptionButton = false) {
		const descriptionButton = showDescriptionButton
			? `<button id="btn-show-description" class="btn-description">
                  <i class="fas fa-book-open"></i> Deskripsi Surah
               </button>`
			: "";
		return `<div class="book-header">
	    <h1>${headerData.title}</h1>
	    ${
				headerData.subtitle
					? `<div class="book-header-subtitle">${headerData.subtitle}</div>`
					: ""
			}
			${
				headerData.meta
					? `<div class="book-header-meta">${headerData.meta}</div>`
					: ""
			}<div class="header-actions">${descriptionButton}</div>
	  </div>`;
	},

	/**
	 * Membuat item konten untuk tampilan detail
	 * @param {Object} data - Data konten
	 * @param {string|number} [data.number] - Nomor item
	 * @param {string} [data.title] - Judul item
	 * @param {string} [data.arabic] - Teks Arab
	 * @param {string} [data.latin] - Transkripsi Latin
	 * @param {string} [data.translation] - Terjemahan
	 * @param {Object} [data.audio] - Sumber audio {format: url}
	 * @param {string} [customClass] - Kelas CSS tambahan
	 * @returns {string} HTML item konten
	 */
	renderDetailContentItem(data, customClass = "") {
		const audioKeys = data.audio ? Object.keys(data.audio) : [];
		const audioUrl = audioKeys.length ? data.audio[audioKeys[0]] : "";

		return `<div class="book-content-item ${customClass}">
		  <div class="content-header">${
				data.number ? `<div class="content-number">${data.number}</div>` : ""
			}${
				data.title || data.book_id
					? `<div class="content-title">${
							data.title ||
							`HR. ${data.book_id.replace("-", " ").toUpperCase()}`
					  }</div>`
					: ""
			}
		  </div>
		  <div class="content-body">
		    ${data.arabic ? `<div class="content-arabic">${data.arabic}</div>` : ""}
		    ${data.latin ? `<div class="content-latin">${data.latin}</div>` : ""}
				${
					data.translation
						? `<div class="content-translation">${data.translation}</div>`
						: ""
				}${
					audioUrl
						? `<div class="content-audio">
				  <audio controls>
				    <source src="${audioUrl}" type="audio/mpeg">
				    Browser anda tidak mendukunh audio.
				  </audio>
				</div>`
						: ""
				}
		  </div>
		</div>`;
	},

	/**
	 * Membuat panel deskripsi surah
	 * @param {string} description - Deskripsi format HTML
	 * @returns {string} HTML panel deskripsi
	 */
	renderSurahDescription(description) {
		return `
            <div class="surah-description">
                <h2 class="description-title">Deskripsi Surah</h2>
                <div class="description-content">${description}</div>
                <button id="btn-close-description" class="btn-close">
                  <i class="fas fa-times"></i>
                  <span class="close-text">Tutup</span>
                </button>
            </div>
        `;
	},

	renderOjkItems(items, type, query = "") {
		return items
			.map(item => {
				switch (type) {
					case "apps":
						return TemplateHelper.renderDetailContentItem(
							{
								number: item.id,
								title: DomHelper.highlightMatches(item.name, query),
								latin: item.url,
								translation: DomHelper.highlightMatches(item.owner, query)
							},
							"ojk-item"
						);
					case "illegals":
						return TemplateHelper.renderDetailContentItem(
							{
								number: item.id,
								title: item.entity_type,
								arabic: DomHelper.highlightMatches(item.name, query),
								latin: `Web: ${
									item.web.join(", ") || "-"
								}<br>Email: ${DomHelper.highlightMatches(
									item.email.join(", ") || "-",
									query
								)}`,
								translation: `<strong>${
									item.activity_type
								}</strong><br>Address: ${
									item.address.join(", ") || "-"
								}<br>Phone: ${item.phone.join(", ") || "-"}<br>Input date: ${
									item.input_date || "-"
								}<br>${item.description}`
							},
							"ojk-item"
						);
					case "products":
						return TemplateHelper.renderDetailContentItem(
							{
								number: item.id,
								title: DomHelper.highlightMatches(item.management, query),
								arabic: DomHelper.highlightMatches(item.name, query),
								latin: DomHelper.highlightMatches(item.type, query),
								translation: item.custodian
							},
							"ojk-item"
						);
					default:
						return "";
				}
			})
			.join("");
	}
};

// ============================
// MODULE: SCRIPT LOADER
// ============================
const ScriptLoader = (() => {
	const loadedScripts = {};
	const loadingPromises = {};
	const loadedLibraries = {};
	const libraryPromises = {};

	async function loadScript(url) {
		if (loadedScripts[url]) return;
		if (loadingPromises[url]) return loadingPromises[url];

		loadingPromises[url] = new Promise((resolve, reject) => {
			const existingScript = document.querySelector(`script[src="${url}"]`);

			// Handler untuk existing script
			if (existingScript) {
				const isScriptLoaded = () => {
					const state = existingScript.readyState;
					return state === "complete" || state === "loaded";
				};

				if (isScriptLoaded()) {
					loadedScripts[url] = true;
					resolve();
					return;
				}

				// --- PERBAIKAN: Definisikan handler lokal ---
				const handleLoad = () => {
					loadedScripts[url] = true;
					resolve();
				};

				const handleError = () => {
					delete loadingPromises[url];
					reject(new Error(`Failed to load existing script: ${url}`));
				};

				existingScript.addEventListener("load", handleLoad, { once: true });
				existingScript.addEventListener("error", handleError, { once: true });
				return;
			}

			// --- Blok pembuatan script baru (tidak berubah) ---
			const script = document.createElement("script");
			script.src = url;

			const cleanup = () => {
				script.removeEventListener("load", handleLoad);
				script.removeEventListener("error", handleError);
			};

			const handleLoad = () => {
				cleanup();
				loadedScripts[url] = true;
				resolve();
			};

			const handleError = () => {
				cleanup();
				script.remove();
				delete loadingPromises[url];
				reject(new Error(`Failed to load script: ${url}`));
			};

			script.addEventListener("load", handleLoad, { once: true });
			script.addEventListener("error", handleError, { once: true });
			document.head.appendChild(script);
		});

		return loadingPromises[url];
	}

	async function ensureLibrary(libName) {
		if (loadedLibraries[libName]) return true;
		if (libraryPromises[libName]) return libraryPromises[libName];

		libraryPromises[libName] = new Promise(async resolve => {
			const config = APP_CONFIG.libraries[libName];
			if (!config) {
				console.error(`Library config not found: ${libName}`);
				resolve(false);
				return;
			}

			if (config.check && config.check()) {
				loadedLibraries[libName] = true;
				resolve(true);
				return;
			}

			try {
				for (const url of config.urls) {
					await loadScript(url);
				}

				// Check again after loading
				if (config.check && config.check()) {
					loadedLibraries[libName] = true;
					resolve(true);
					return;
				}

				console.warn(`Library ${libName} loaded but not available`);
				resolve(false);
			} catch (error) {
				console.error(`Error loading ${libName}:`, error);
				resolve(false);
			}
		});

		return libraryPromises[libName];
	}

	// Preload libraries on idle
	const preloadLibraries = () => {
		if (!APP_CONFIG.libraries) return;

		const load = () => {
			Object.keys(APP_CONFIG.libraries).forEach(lib => {
				ensureLibrary(lib).catch(e => console.warn("Preload failed:", e));
			});
		};

		if (typeof requestIdleCallback !== "undefined") {
			requestIdleCallback(load);
		} else {
			setTimeout(load, 3000);
		}
	};

	preloadLibraries();

	return { loadScript, ensureLibrary };
})();

// ============================
// MODULE: CACHE MANAGE (OPTIMIZED)
// ============================
const CacheManager = (() => {
	const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean every 1 hour
	let cleanupTimer = null;

	class CacheManager {
		static async setItem(key, data, expiration) {
			try {
				const lz =
					window.LZString ||
					((await ScriptLoader.ensureLibrary("LZString")) && window.LZString);

				const cacheData = {
					data: lz ? lz.compress(JSON.stringify(data)) : JSON.stringify(data),
					timestamp: Date.now(),
					expiration,
					compressed: !!lz
				};

				localStorage.setItem(key, JSON.stringify(cacheData));
			} catch (error) {
				console.error(`Cache save error for ${key}:`, error);
				// Fallback without compression
				localStorage.setItem(
					key,
					JSON.stringify({
						data,
						timestamp: Date.now(),
						expiration,
						compressed: false
					})
				);
				throw error;
			}

			// Start cleanup scheduler if not running
			this.startCleanupScheduler();
		}

		static async getItem(key) {
			try {
				const cache = localStorage.getItem(key);
				if (!cache) return null;

				let parsed;
				try {
					parsed = JSON.parse(cache);
				} catch {
					return JSON.parse(cache);
				}

				if (!parsed || !parsed.timestamp) {
					return parsed?.data || parsed;
				}

				if (Date.now() - parsed.timestamp > parsed.expiration) {
					this.removeItem(key);
					return null;
				}

				if (!parsed.compressed) {
					return typeof parsed.data === "string"
						? JSON.parse(parsed.data)
						: parsed.data;
				}

				const lz =
					window.LZString ||
					((await ScriptLoader.ensureLibrary("LZString")) && window.LZString);
				if (!lz) {
					console.warn("LZString unavailable for decompression");
					return null;
				}

				return JSON.parse(lz.decompress(parsed.data));
			} catch (error) {
				console.error(`Cache read error for ${key}:`, error);
				return null;
			}
		}

		static removeItem(key) {
			localStorage.removeItem(key);
		}

		static cleanExpired() {
			const now = Date.now();
			const keysToRemove = [];

			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				try {
					const cache = localStorage.getItem(key);
					if (!cache) continue;

					const parsed = JSON.parse(cache);
					// Skip non-cache items
					if (!parsed || !parsed.timestamp || !parsed.expiration) continue;

					if (now - parsed.timestamp > parsed.expiration) {
						keysToRemove.push(key);
					}
				} catch {
					// Skip invalid entries
				}
			}

			keysToRemove.forEach(key => {
				console.log(`Removing expired cache: ${key}`);
				localStorage.removeItem(key);
			});

			return keysToRemove.length;
		}

		static startCleanupScheduler() {
			if (cleanupTimer) return;

			cleanupTimer = setInterval(() => {
				const removedCount = this.cleanExpired();
				console.log(`Cache cleanup removed ${removedCount} expired items`);

				// Stop scheduler if no cache remains
				if (localStorage.length === 0) {
					clearInterval(cleanupTimer);
					cleanupTimer = null;
				}
			}, CLEANUP_INTERVAL);
		}
	}

	// Initial cleanup on module load
	CacheManager.cleanExpired();
	CacheManager.startCleanupScheduler();

	return CacheManager;
})();

// ============================
// PAGINATIOM MODULE
// ============================
const paginationModule = (function () {
	// Tambahkan style CSS
	function addStyles() {
		const styleId = "pagination-module-styles";
		if (document.getElementById(styleId)) return;

		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = `
                    .pagination-wrapper {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                    }
                    
                    .pagination-info {
                        text-align: center;
                        margin-bottom: 20px;
                        font-size: 0.95rem;
                        color: #cccccc; /* Warna abu-abu */
                    }
                    
                    .pagination {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        align-items: center;
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        gap: 5px;
                    }
                    
                    .pagination li {
                        margin: 2px;
                    }
                    
                    .pagination a, 
                    .pagination span {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 36px;
                        height: 36px;
                        padding: 0 8px;
                        text-align: center;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 500;
                        font-size: 0.95rem;
                        transition: all 0.2s ease;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                    }
                    
                    .pagination a {
                        background: rgba(255, 255, 255, 0.12);
                        color: #e0f0ff;
                        cursor: pointer;
                    }
                    
                    .pagination a:hover {
                        background: rgba(79, 172, 254, 0.35);
                        transform: translateY(-2px);
                    }
                    
                    .pagination .active a {
                        background: linear-gradient(to right, #4facfe, #00f2fe);
                        color: white;
                        font-weight: 600;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
                    }
                    
                    .pagination .disabled span {
                        background: rgba(255, 255, 255, 0.08);
                        color: #888;
                        cursor: not-allowed;
                    }
                    
                    .pagination .ellipsis span {
                        background: transparent;
                        border: none;
                        min-width: auto;
                        color: #aaa;
                    }
                    
                    .pagination .nav-item a {
                        min-width: auto;
                        padding: 0 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .pagination .mobile-only {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .pagination .desktop-only {
                        display: none;
                    }
                    
                    .pagination .hidden-mobile {
                        display: none;
                    }
                    
                    /* Desktop Styles */
                    @media (min-width: 768px) {
                        .pagination-wrapper {
                            flex-direction: row;
                            justify-content: space-between;
                            align-items: center;
                        }
                        
                        .pagination-info {
                            text-align: left;
                            margin-bottom: 0;
                            font-size: 1rem;
                        }
                        
                        .pagination {
                            gap: 8px;
                        }
                        
                        .pagination a, 
                        .pagination span {
                            min-width: 40px;
                            height: 40px;
                            font-size: 1rem;
                        }
                        
                        .pagination .nav-item a {
                            padding: 0 16px;
                        }
                        
                        .pagination .mobile-only {
                            display: none;
                        }
                        
                        .pagination .desktop-only {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                        }
                        
                        .pagination .hidden-mobile {
                            display: flex;
                        }
                    }
                    
                    @media (min-width: 992px) {
                        .pagination a, 
                        .pagination span {
                            min-width: 42px;
                            height: 42px;
                        }
                    }
                `;
		document.head.appendChild(style);
	}

	// Render pagination
	function render(container, paginationData, onPageChange) {
		// Validasi parameter

		if (!container || !paginationData || !onPageChange) {
			console.error("Parameter tidak valid untuk render pagination");
			return;
		}

		// Hapus pagination sebelumnya
		container.innerHTML = "";

		// Buat wrapper
		const wrapper = document.createElement("div");
		wrapper.className = "pagination-wrapper";

		// Buat elemen informasi halaman
		const infoDiv = document.createElement("div");
		infoDiv.className = "pagination-info";
		// Template: "Menampilkan {from} sampai {to} dari total {total} item"
		infoDiv.textContent = `Menampilkan ${paginationData.from} sampai ${paginationData.to} dari total ${paginationData.total}.`;
		wrapper.appendChild(infoDiv);

		// Buat elemen tombol pagination
		const ul = document.createElement("ul");
		ul.className = "pagination";

		// Tambahkan setiap link ke dalam pagination
		paginationData.links.forEach(link => {
			const li = document.createElement("li");

			// Tentukan class berdasarkan status link
			const classes = [];
			if (link.active) classes.push("active");
			if (!link.url) classes.push("disabled");
			if (link.label.includes("Previous") || link.label.includes("Next"))
				classes.push("nav-item");
			if (link.label === "...") classes.push("ellipsis");

			// Untuk mobile: sembunyikan beberapa tombol angka
			if (!isNaN(parseInt(link.label))) {
				const pageNum = parseInt(link.label);
				if (
					pageNum > 1 &&
					pageNum < paginationData.last_page &&
					Math.abs(pageNum - paginationData.current_page) > 1
				) {
					classes.push("hidden-mobile");
				}
			}

			li.className = classes.join(" ");

			// Buat elemen untuk link
			if (link.url) {
				const a = document.createElement("a");

				// Tampilkan icon untuk mobile dan teks untuk desktop
				if (link.label.trim().toLowerCase().includes("laquo")) {
					a.innerHTML = `
                                <span class="mobile-only">&laquo;</span>
                                <span class="desktop-only">${link.label}</span>
                            `;
				} else if (link.label.trim().toLowerCase().includes("raquo")) {
					a.innerHTML = `
                                <span class="mobile-only">&raquo;</span>
                                <span class="desktop-only">${link.label}</span>
                            `;
				} else {
					a.innerHTML = link.label;
				}

				a.href = "javascript:void(0)";
				a.addEventListener("click", () => {
					onPageChange(link.url);
				});
				li.appendChild(a);
			} else {
				const span = document.createElement("span");
				span.innerHTML = link.label;
				li.appendChild(span);
			}

			ul.appendChild(li);
		});

		wrapper.appendChild(ul);
		container.appendChild(wrapper);
	}

	// Inisialisasi modul
	addStyles();

	// Kembalikan fungsi publik
	return { render };
})();

window.APP_CONFIG = APP_CONFIG;
window.AppState = AppState;
window.DomHelper = DomHelper;
window.ApiHelper = ApiHelper;
window.TemplateHelper = TemplateHelper;
window.CacheManager = CacheManager;
window.paginationModule = paginationModule;
