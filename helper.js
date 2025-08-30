const APP_CONFIG = {
	endpoints: {
		server: "https://vickyserver.my.id/server/api/books",
		search: "https://vickyserver.my.id/server/api/search",
		telegram: "https://vickyserver.my.id/telegram/send"
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
				type: "prophet"
			},
			{
				id: "asmaulhusna",
				title: "Asmaul Husna",
				subtitle: "99 Sifat Allah",
				type: "asmaul"
			},
			{
				id: "shalat",
				title: "Shalat",
				subtitle: "Shalat 5 waktu",
				type: "shalat"
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
				type: "bahasa"
			},
			{
				id: "hero",
				title: "Pahlawan Nasional",
				subtitle: "Pahlawan Nasional di Indonesia",
				type: "hero"
			},
			{
				id: "volcano",
				title: "Gunung Berapi",
				subtitle: "Gunung berapi di Indonesia",
				type: "volcano"
			},
			{
				id: "kbbi",
				title: "KBBI",
				subtitle: "Kamus Besar Bahasa Indonesia",
				type: "kbbi"
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
		misc: [
			{
				id: "book",
				title: "Buku",
				subtitle: "Buku Acak",
				type: "book"
			},
			{
				id: "pesantren",
				title: "Pesantren",
				subtitle: "Daftar Pesantren di Indonesia",
				type: "pesantren"
			}
		]
	},
	primaryBookColor: {
		main: "#8D6E63",
		dark: "#6D4C41"
	},
	defaultBookCover:
		"https://via.placeholder.com/300x400/f5f5f5/cccccc?text=Cover+Tidak+Tersedia",
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

	hero: {},

	volcano: {
		bentuk: null,
		currentPage: null,
		filters: {
			tinggiMin: null,
			tinggiMax: null
		}
	},

	kbbi: {},

	book: {
		categoryId: null
	},

	shalat: {
		shalatId: null
	},

	pesantren: {
		level: null,
		provinsi: null,
		kabupaten: null
	},

	// Fungsi untuk reset state
	reset() {
		this.currentCategory = "";
		this.currentBook = null;
		this.currentPage = null;

		// Reset semua state buku
		const bookStates = {
			quran: { surahId: null, currentSurah: null },
			hadith: { bookId: null },
			bible: {
				level: null,
				translationId: null,
				bookId: null,
				chapterId: null,
				translations: null,
				books: null,
				chapters: null
			},
			doa: { sourceName: null },
			prophet: { prophetId: null },
			asmaul: { asmaulId: null },
			ojk: { currentType: null },
			sekolah: {
				level: null,
				provinsi: null,
				kabkota: null,
				kecamatan: null
			},
			bahasa: { provinceName: null },
			volcano: { bentuk: null, filters: { tinggiMin: null, tinggiMax: null } },
			hero: {},
			kbbi: {},
			book: {
				categoryId: null
			},
			shalat: { shalatId: null },
			pesantren: { level: null, provinsi: null, kabupaten: null }
		};

		// Reset semua state buku
		Object.keys(bookStates).forEach(key => {
			this[key] = { ...this[key], ...bookStates[key] };
		});
	},

	// Set state untuk buku tertentu
	setBookState(bookType, state) {
		this.reset();
		this.currentBook = bookType;

		this[bookType] = bookType in this ? { ...this[bookType], ...state } : state;
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
		if (!element) return;
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
		if (!element) return;
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
		if (element) element.innerHTML = html;
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

		const configMap = [
			{ key: "id", action: val => (el.id = val) },
			{ key: "className", action: val => (el.className = val) },
			{
				key: "attributes",
				action: val =>
					Object.entries(val).forEach(([k, v]) => el.setAttribute(k, v))
			},
			{
				key: "dataset",
				action: val =>
					Object.entries(val).forEach(([k, v]) => (el.dataset[k] = v))
			},
			{ key: "styles", action: val => Object.assign(el.style, val) },
			{
				key: "events",
				action: val =>
					Object.entries(val).forEach(([e, h]) => el.addEventListener(e, h))
			},
			{ key: "text", action: val => (el.textContent = val) },
			{ key: "html", action: val => (el.innerHTML = val) }
		];

		configMap.forEach(({ key, action }) => {
			if (options[key]) action(options[key]);
		});

		// Tambahkan anak elemen
		if (options.children) {
			options.children.forEach(child => {
				if (typeof child === "string") {
					el.appendChild(document.createTextNode(child));
				} else if (child instanceof Node) {
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
	createDropdown(
		id,
		label,
		options,
		selectedValue,
		onChange,
		valueFn = opt => opt.id
	) {
		const optionsEl = options.map(opt => {
			const value = valueFn(opt);
			return DomHelper.createElement("option", {
				attributes: {
					value
				},
				text: opt.nama,
				...(selectedValue == value && {
					attributes: { selected: true }
				})
			});
		});

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
						text: `Pilih ${
							select.previousElementSibling?.textContent?.replace(":", "") ||
							"item"
						}`
					})
				);
			}
		});
	},

	/**
	 * Menampilkan indikator loading global
	 */
	showLoading() {
		DomHelper.hideLoading();

		// Tampilkan indikator loading
		const loadingIndicator = DomHelper.createElement("div", {
			id: "loading-indicator",
			styles: {
				position: "fixed",
				top: "0",
				left: "0",
				width: "100%",
				height: "4px",
				backgroundColor: "#8D6E63",
				zIndex: "1000",
				animation: "loading 2s infinite"
			}
		});

		document.body.appendChild(loadingIndicator);

		// Animasi loading
		if (!document.getElementById("loading-animation-style")) {
			const style = DomHelper.createElement("style", {
				id: "loading-animation-style",
				html: `
			  @keyframes loading {
            0% { width: 0%; background-color: #6D4C41; }
            50% { width: 70%; background-color: #8D6E63; }
            100% { width: 100%; background-color: #6D4C41; }
        }`
			});
			document.head.appendChild(style);
		}
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
		const sections = ["mainshelf", "listbook", "detailbook"]
			.map(id => document.getElementById(id))
			.filter(Boolean);
		sections.forEach(section => {
			section.style.opacity = "0";
			section.style.transform = "translateY(20px)";
		});

		setTimeout(() => {
			callback();

			// Re-trigger animasi
			setTimeout(() => {
				const visibleSection = sections.find(s => s.style.display !== "none");
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
		const header = document.querySelector("header");
		const headerHeight = header ? header.offsetHeight - 70 : 70;
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

		return {
			text: `${yearNum}`,
			className: prophetName.includes("Muhammad") ? "m-year" : "sm-year"
		};
	},

	highlightMatches(text, query) {
		if (!text || !query) return text;

		// Escape karakter khusus regex
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`(${escapedQuery})`, "gi");

		return text.toString().replace(regex, "<mark>$1</mark>");
	},

	// Memastikan elemen tersedia sebelum manipulasi
	ensureElement: (element, action = () => {}) => {
		return element ? action(element) || true : false;
	},

	// Safe property access dengan default value
	safeAccess: (obj, path, defaultValue = null) => {
		return (
			path.split(".").reduce((acc, part) => acc && acc[part], obj) ||
			defaultValue
		);
	},

	// Error handler terpusat
	handleError: (error, context = "") => {
		console.error(`Error in ${context}:`, error);
		return null;
	},

	toTitleCase: text => {
		return text
			.replace(/_/g, " ")
			.split(" ")
			.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(" ");
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
	async fetchData(url, options = {}) {
		try {
			DomHelper.showLoading();
			const response = await fetch(url, options);
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

			if (data) await CacheManager.setItem(cacheKey, data, ttl);

			return data;
		} catch (error) {
			DomHelper.handleError(error, "ApiHelper.fetchWithCache");
			return await ApiHelper.fetchData(url);
		}
	},

	/**
	 * Converts HTTP URLs to HTTPS while preserving URL structure
	 * @param {string} url - Original URL to convert
	 * @returns {string} Secure HTTPS URL
	 */
	convertToHttps(url) {
		if (!url) return url;
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
	createBookVerse(data, query = "") {
		const audioKeys = data.audio ? Object.keys(data.audio) : [];
		const audioUrl = audioKeys.length ? data.audio["05"] : "";
		const highlight = text => DomHelper.highlightMatches(text, query);
		let html = "";
		html += data.arabic ? `<div class="verse-arabic">${data.arabic}</div>` : "";
		html += data.latin
			? `<div class="content-latin">${highlight(data.latin)}</div>`
			: "";
		html += data.translation
			? `<div class="content-translation">${highlight(data.translation)}</div>`
			: "";
		html += audioUrl
			? `<div class="content-audio"><audio controls class="audio-player"><source src="${audioUrl}" type="audio/mpeg">Browser anda tidak mendukung audio.</audio></div>`
			: "";
		return html;
	},

	createBookOjk(data) {
		let html = "";
		html += data.arabic
			? `<div class="verse-arabic ojk">${data.arabic}</div>`
			: "";
		html += data.latin ? `<div class="content-latin">${data.latin}</div>` : "";
		html += data.translation
			? `<div class="book-details"><div class="detail-grid">${data.translation}</div></div>`
			: "";
		return html;
	},

	createBookBook(data, query = "") {
		const highlight = text => DomHelper.highlightMatches(text, query);
		let html = '<div class="book-cover-section">';
		html += data.cover_image
			? `<div class="book-cover-image"><img src="${data.cover_image}" alt="${data.title}" onerror="this.src='${APP_CONFIG.defaultBookCover}'"><div class="book-cover-effect"></div></div>`
			: "";
		html += data.book_link
			? `<a href="${data.book_link}" class="btn-download-book" target="_blank"><i class="fas fa-download"></i> Unduh Buku</a>`
			: "";
		html += '</div><div class="book-info-section">';
		html += data.summary
			? `<div class="book-summary"><h3>Sinopsis</h3><p>${highlight(
					data.summary
			  )}</p></div>`
			: "";
		html += '<div class="book-meta-info">';
		html += data.author
			? `<div class="book-author"><strong>Penulis:</strong> ${
					data.author.url
						? `<a href="${data.author.url}" target="_blank">${highlight(
								data.author.name
						  )}</a>`
						: highlight(data.author.name)
			  }</div>`
			: "";
		html += data.publisher
			? `<div class="book-publisher"><strong>Penerbit:</strong> ${highlight(
					data.publisher.name
			  )}</div>`
			: "";
		html += "</div>";
		html += data.detail
			? `<div class="book-details"><h3>Detail Buku</h3><div class="detail-grid">${
					data.detail.no_gm
						? `<div><strong>No. GM:</strong> ${highlight(
								data.detail.no_gm
						  )}</div>`
						: ""
			  }${
					data.detail.isbn
						? `<div><strong>ISBN:</strong> ${highlight(data.detail.isbn)}</div>`
						: ""
			  }${
					data.detail.price
						? `<div><strong>Harga:</strong> ${highlight(
								data.detail.price
						  )}</div>`
						: ""
			  }${
					data.detail.total_pages
						? `<div><strong>Halaman:</strong> ${highlight(
								data.detail.total_pages
						  )}</div>`
						: ""
			  }${
					data.detail.size
						? `<div><strong>Ukuran:</strong> ${data.detail.size}</div>`
						: ""
			  }${
					data.detail.published_date
						? `<div><strong>Tanggal Terbit:</strong> ${highlight(
								data.detail.published_date
						  )}</div>`
						: ""
			  }${
					data.detail.format
						? `<div><strong>Format:</strong> ${data.detail.format}</div>`
						: ""
			  }</div></div>`
			: "";
		html +=
			data.tags && data.tags.length > 0
				? `<div class="book-tags"><h3>Tag</h3><div class="tags-container">${data.tags
						.map(
							tag =>
								`<a href="${tag.url}" class="tag" target="_blank">${highlight(
									tag.name
								)}</a>`
						)
						.join("")}</div></div>`
				: "";
		html +=
			data.buy_links && data.buy_links.length > 0
				? `<div class="book-buy-links"><h3>Tempat Pembelian</h3><div class="buy-links">${data.buy_links
						.map(
							link =>
								`<a href="${link.url}" class="btn-buy" target="_blank"><i class="fas fa-shopping-cart"></i> ${link.store}</a>`
						)
						.join("")}</div></div>`
				: "";
		html += "</div>";
		return html;
	},

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
          ${books
						.map(book => TemplateHelper.createBookItem(book, category))
						.join("")}
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
      <div class="book book-accented" data-category="${category}" data-book="${
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
		const highlight = text => DomHelper.highlightMatches(text, query);
		return `<div class="school-header">
              <div class="school-name">${highlight(sekolah.nama)}</div>
              <div class="school-type">${sekolah.bentuk}</div>
            </div>
            <div class="school-address">
              <i class="fas fa-map-marker-alt"></i> ${highlight(sekolah.alamat)}
            </div>
            <div class="school-details">
              <div><strong>Status:</strong> ${
								sekolah.status === "S" ? "Swasta" : "Negeri"
							}</div>
              <div><strong>NPSN:</strong> ${highlight(sekolah.npsn)}</div>
              <div>${highlight(sekolah.kecamatan.nama)} • ${highlight(
								sekolah.kecamatan.kabupaten_kota.nama
							)}</div>
              <div>${highlight(
								sekolah.kecamatan.kabupaten_kota.provinsi.nama
							)}</div>
              <div><a href="https://www.google.com/maps?q=&layer=c&cbll=${
								sekolah.lintang
							},${
								sekolah.bujur
							}" class="map-link" target="_blank" title="Buka di Google Maps">Buka Lokasi di Peta</a></div>
            </div>`;
	},

	createPesantrenCard(pesantren, query = "") {
		const highlight = text => DomHelper.highlightMatches(text, query);

		return `<div class="pesantren-card"><div class="pesantren-header">
		  <h1 class="pesantren-name">${highlight(pesantren.nama)}</h1>
		  <div class="pesantren-code">${highlight(pesantren.nspp)}</div>
		</div>
		<div class="pesantren-details">
		  ${
				pesantren.kyai && pesantren.kyai !== " "
					? `<div class="detail-item kyai-section">
		    <div class="detail-icon"><i class="fas fa-user"></i></div>
		    <div class="detail-content">
		      <div class="detail-label">Pimpinan Pesantren</div>
		      <div class="detail-value">${highlight(pesantren.kyai)}</div>
		    </div>
		  </div>`
					: ""
			}
			<div class="detail-item">
			  <div class="detail-icon"><i class="fas fa-map-marker-alt"></i></div>
			  <div class="detail-content">
			    <div class="detail-label">Alamat</div>
			    <div class="detail-value">${highlight(pesantren.alamat)}</div>
			  </div>
			</div>
			<div class="detail-item">
			  <div class="detail-icon"><i class="fas fa-city"></i></div>
			  <div class="detail-content location-section">
			    <div class="detail-label">Wilayah</div>
			    <div class="detail-value">${pesantren.kabupaten.nama}</div>
			    <div class="detail-value">${pesantren.kabupaten.provinsi.nama}</div>
			  </div>
			</div>
		</div></div>`;
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
			const paginationData = dataObject(data);
			if (paginationData.last_page > 1) {
				paginationModule.render(
					DOM.paginationContainer,
					paginationData,
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
			DomHelper.handleError(error, "TemplateHelper.renderDetailWithPagination");
			DomHelper.setHTML(
				container,
				`<div class="error">Gagal memuat data: ${error.message}</div>`
			);
		}
	},

	/**
	 * Membuat header standar untuk tampilan detail
	 * @param {Object} headerData - Data header
	 * @param {string} headerData.title - Judul utama
	 * @param {string} [headerData.subtitle] - Subjudul
	 * @param {string} [headerData.meta] - Metadata tambahan
	 * @param {boolean} [showDescriptionButton=false] - Tampilkan tombol deskripsi?
	 * @param {string} [filterHtml] - HTML string untuk form filter
	 * @returns {string} HTML header detail
	 */
	renderDetailHeaderView(
		headerData,
		showDescriptionButton = false,
		filterHtml = null
	) {
		const descriptionButton = showDescriptionButton
			? `<button id="btn-show-description" class="btn-description">
                  <i class="fas fa-book-open"></i> Deskripsi Surah
               </button>`
			: "";

		// Toggle filter dengan animasi CSS
		const filterToggle = filterHtml
			? `
      <div class="filter-toggle-wrapper">
        <label class="filter-toggle">
          <input type="checkbox" onchange="document.getElementById('filter-content').classList.toggle('show')">
          <span class="toggle-slider"></span>
          <span class="toggle-text">Filter</span>
        </label>
        <div id="filter-content" class="filter-content">
          ${filterHtml}
        </div>
      </div>
    `
			: "";

		return `<div class="book-detail-header">
	    <h1 class="detail-title">${headerData.title}</h1>
	    ${
				headerData.subtitle
					? `<div class="detail-subtitle">${headerData.subtitle}</div>`
					: ""
			}
			${
				headerData.meta
					? `<div class="detail-meta">${headerData.meta}</div>`
					: ""
			}<div class="header-actions">${descriptionButton}${filterToggle}</div>
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
	renderDetailContentItem(data, type = "default", query = "") {
		const highlight = text => DomHelper.highlightMatches(text, query);
		const contentHtml = {
			"verse-item": TemplateHelper.createBookVerse(data, query),
			"ojk-item": `<div class="book-detail-content">${TemplateHelper.createBookOjk(
				data
			)}</div>`,
			"book-item": `<div class="book-detail-content">
        ${TemplateHelper.createBookBook(data, query)}
      </div>`,
			default: `<div class="book-detail-content">
			${data.arabic ? `<div class="verse-arabic">${data.arabic}</div>` : ""}
			${data.latin ? `<div class="content-latin">${data.latin}</div>` : ""}
			${
				data.translation
					? `<div class="content-translation">${data.translation}</div>`
					: ""
			}
			</div>`
		};

		return `<div class="book-detail-item animated ${type}">
		  <div class="list-item-header">
		    ${data.number ? `<div class="list-item-number">${data.number}</div>` : ""}
		    ${
					data.title
						? `<div class="list-item-title"><h3>${highlight(
								data.title
						  )}</h3></div>`
						: ""
				}
		  </div>
		  ${contentHtml[type] || contentHtml.default}
		</div>`;
	},

	/**
	 * Membuat panel deskripsi surah
	 * @param {string} description - Deskripsi format HTML
	 * @returns {string} HTML panel deskripsi
	 */
	renderSurahDescription(description, audioFull) {
		return `<div class="surah-description">
		          <h2 class="description-title">Deskripsi Surah</h2>
                <div class="description-content">${description}</div>
                <button id="btn-close-description" class="btn-close">
                  <i class="fas fa-times"></i>
                  <span class="close-text">Tutup</span>
                </button>
            </div>${
							audioFull
								? `<div class="content-audio">
				  <audio controls>
				    <source src="${audioFull["05"]}" type="audio/mpeg">
				    Browser anda tidak mendukunh audio.
				  </audio>
				</div>`
								: ""
						}`;
	},

	renderOjkItems(items, type, query = "") {
		const highlight = text => DomHelper.highlightMatches(text, query);
		const renderers = {
			apps: item =>
				TemplateHelper.renderDetailContentItem(
					{
						number: item.id,
						title: highlight(item.name),
						latin: item.url,
						translation: highlight(item.owner)
					},
					"ojk-item"
				),
			illegals: item =>
				TemplateHelper.renderDetailContentItem(
					{
						number: item.id,
						title: item.entity_type,
						arabic: highlight(item.name),
						latin: `Web: ${item.web.join(", ") || "-"}<br>Email: ${highlight(
							item.email.join(", ") || "-"
						)}`,
						translation: `<div><strong>Activity: </strong>${
							item.activity_type
						}</div><div><strong>Address:</strong> <span>${
							item.address.join(", ") || "-"
						}</span></div><div><strong>Phone:</strong> ${
							item.phone.join(", ") || "-"
						}</div><div><strong>Input date:</strong> ${
							item.input_date || "-"
						}</div><div><strong>Description:</strong> ${item.description}</div>`
					},
					"ojk-item"
				),
			products: item =>
				TemplateHelper.renderDetailContentItem(
					{
						number: item.id,
						title: highlight(item.management),
						arabic: highlight(item.name),
						latin: highlight(item.type),
						translation: item.custodian
					},
					"ojk-item"
				)
		};
		return items
			.map(item => (renderers[type] ? renderers[type](item) : ""))
			.join("");
	},

	/**
	 * Membuat form filter fleksibel
	 * @param {Array} fields - Array konfigurasi field filter
	 * @param {Function} onApply - Callback saat filter diterapkan
	 * @param {Function} onReset - Callback saat filter direset
	 * @returns {string} HTML form filter
	 *
	 * Struktur field:
	 * {
	 *   type: 'number|text|select|etc',
	 *   name: 'nama_field',
	 *   label: 'Label field',
	 *   placeholder: 'Placeholder',
	 *   value: 'nilai_default',
	 *   options: [{value: '', text: ''}] // untuk type select
	 * }
	 */
	createFilterForm(fields) {
		const fieldsHtml = fields
			.map(field => {
				let inputHtml = "";

				switch (field.type) {
					case "select":
						inputHtml = `<select name="${
							field.name
						}" class="filter-input">${field.options
							.map(
								opt =>
									`<option value="${opt.value}" ${
										field.value === opt.value ? "selected" : ""
									}>${opt.text}</option>`
							)
							.join("")}</select>`;
						break;
					default:
						inputHtml = `<input type="${field.type}" name="${
							field.name
						}" value="${field.value || ""}" placeholder="${
							field.placeholder || ""
						}" class="filter-input">`;
				}

				return `<div class="filter-field">
                    <label>${field.label}</label>
                    ${inputHtml}
                </div>`;
			})
			.join("");

		return `<div class="filter-form">${fieldsHtml}
		          <div class="filter-buttons">
                <button type="button" class="btn-apply-filter">Terapkan</button>
                <button type="button" class="btn-reset-filter">Reset</button>
              </div>
            </div>`;
	},

	/**
	 * Inisialisasi event listeners untuk form filter
	 * @param {string} formContainer - Selector container form
	 * @param {Function} onApply - Callback saat filter diterapkan
	 * @param {Function} onReset - Callback saat filter direset
	 */
	initFilterForm(formContainer, onApply, onReset) {
		const form = document.querySelector(formContainer);
		if (!form) return;

		// Handler terapkan filter
		const applyBtn = form.querySelector(".btn-apply-filter");
		if (applyBtn) {
			applyBtn.addEventListener("click", () => {
				const tinggiMin = form.querySelector('[name="tinggiMin"]').value;
				const tinggiMax = form.querySelector('[name="tinggiMax"]').value;
				onApply(tinggiMin, tinggiMax);
			});
		}

		// Handler reset filter
		const resetBtn = form.querySelector(".btn-reset-filter");
		if (resetBtn) {
			resetBtn.addEventListener("click", () => {
				form.querySelectorAll(".filter-input").forEach(input => {
					input.value = "";
					if (input.tagName === "SELECT") input.selectedIndex = 0;
				});
				onReset();
			});
		}
	}
};

// IIFE Module untuk Back to Top Button
const BackToTopButton = (function () {
	let button = null;
	let scrollThreshold = 300;

	// Fungsi untuk menginisialisasi tombol
	function init(options = {}) {
		// Opsi konfigurasi
		const config = {
			threshold: options.threshold || 300,
			color: options.color || "#5D4037",
			bottom: options.bottom || "20px",
			right: options.right || "20px",
			size: options.size || "50px"
		};

		scrollThreshold = config.threshold;

		// Hapus tombol jika sudah ada
		if (button) {
			document.body.removeChild(button);
		}

		// Buat elemen tombol
		button = DomHelper.createElement("button", {
			id: "back-to-top-btn",
			className: "back-to-top-btn",
			html: "&uarr;",
			styles: {
				position: "fixed",
				bottom: config.bottom,
				right: config.right,
				width: config.size,
				height: config.size,
				borderRadius: "50%",
				backgroundColor: config.color,
				color: "white",
				border: "none",
				cursor: "pointer",
				fontSize: "24px",
				fontWeight: "bold",
				opacity: "0",
				visibility: "hidden",
				transition:
					"opacity 0.3s, visibility 0.3s, background-color 0.3s, transform 0.3s",
				zIndex: "1000",
				boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)"
			},
			events: {
				click: () => DomHelper.scrollToTop()
			}
		});

		// Tambahkan tombol ke body
		document.body.appendChild(button);

		// Tambahkan style untuk hover dan responsivitas
		addStyles(config);

		// Tambahkan event listener untuk scroll
		window.addEventListener("scroll", toggleButtonVisibility);

		// Juga tambahkan event listener untuk resize (responsivitas)
		window.addEventListener("resize", adjustButtonPosition);

		// Posisikan tombol secara inisial
		adjustButtonPosition();
	}

	// Fungsi untuk menambahkan style CSS
	function addStyles(config) {
		// Pastikan style belum ditambahkan
		if (document.getElementById("back-to-top-styles")) return;

		const styles = `
                .back-to-top-btn:hover {
                    background-color: ${adjustColor(
											config.color,
											-30
										)} !important;
                    transform: translateY(-2px) scale(1.05);
                }
                
                .back-to-top-btn.visible {
                    opacity: 0.9 !important;
                    visibility: visible !important;
                }
                
                .back-to-top-btn:active {
                    transform: scale(0.95);
                }
                
                @media (min-width: 1024px) {
                    .back-to-top-btn {
                        bottom: 30px !important;
                        right: 30px !important;
                        width: 60px !important;
                        height: 60px !important;
                        font-size: 26px !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .back-to-top-btn {
                        bottom: 15px !important;
                        right: 15px !important;
                        width: 45px !important;
                        height: 45px !important;
                        font-size: 20px !important;
                    }
                }
            `;

		const styleElement = DomHelper.createElement("style", {
			id: "back-to-top-styles",
			html: styles
		});

		document.head.appendChild(styleElement);
	}

	// Fungsi untuk menyesuaikan kecerahan warna
	function adjustColor(color, amount) {
		return (
			"#" +
			color
				.replace(/^#/, "")
				.replace(/../g, color =>
					(
						"0" +
						Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(
							16
						)
					).substr(-2)
				)
		);
	}

	// Fungsi untuk menampilkan atau menyembunyikan tombol
	function toggleButtonVisibility() {
		if (!button) return;

		const scrollY = window.scrollY || document.documentElement.scrollTop;

		if (scrollY > scrollThreshold) {
			button.classList.add("visible");
		} else {
			button.classList.remove("visible");
		}
	}

	// Fungsi untuk menyesuaikan posisi tombol pada layar lebar
	function adjustButtonPosition() {
		if (!button) return;

		// Jika ada elemen dengan class 'footer' atau elemen lain yang mungkin menutupi
		const footer = document.querySelector("footer");
		if (footer) {
			const footerRect = footer.getBoundingClientRect();
			const viewportHeight = window.innerHeight;

			// Jika footer terlihat di viewport, atur posisi tombol di atas footer
			if (footerRect.top < viewportHeight) {
				button.style.bottom = `${footerRect.height + 20}px`;
			} else {
				button.style.bottom = "20px";
			}
		}
	}

	// Kembalikan metode publik
	return {
		init,
		// Ekspos metode untuk testing atau kontrol manual
		show: toggleButtonVisibility,
		adjustPosition: adjustButtonPosition
	};
})();

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

// ============================
// MODULE: TRACK USER
// ============================
const TrackUser = (() => {
	// Fungsi untuk mendeteksi localhost
	function isLocalhost(urlString) {
		try {
			const url = new URL(urlString);
			const hostname = url.hostname;

			// Daftar identifier untuk localhost
			return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
		} catch (e) {
			console.error("Invalid URL format:", urlString);
			return false;
		}
	}

	async function sendTelegram(data) {
		try {
			await fetch(APP_CONFIG.endpoints.telegram, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data)
			});
		} catch (error) {
			console.error("Error:", error);
		}
	}

	async function trackWithIPGeolocation(ip) {
		try {
			const response = await fetch(`https://ipapi.co/${ip}/json/`);
			const geoData = await response.json();

			const visitorData = {
				ip: ip,
				page: window.location.href,
				time: new Date().toISOString(),
				agent: navigator.userAgent,
				screen: `${screen.width}x${screen.height}`,
				location: {
					city: geoData.city,
					region: geoData.region,
					country: geoData.country_name,
					lat: geoData.latitude,
					lon: geoData.longitude,
					provider: "IP-API"
				},
				mapUrl: `https://maps.google.com/?q=${geoData.latitude},${geoData.longitude}`
			};

			await sendTelegram(visitorData);
		} catch (error) {
			console.error("Gagal mendapatkan lokasi via IP:", error);
		}
	}

	return {
		async sendToTelegram() {
			try {
				if (isLocalhost(window.location.href)) {
					console.log("Skipping notification for localhost");
					return;
				}

				const res = await fetch("https://api.ipify.org?format=json");
				const { ip } = await res.json();

				trackWithIPGeolocation(ip);

				localStorage.setItem("visitorTracked", "true");
			} catch (_) {}
		}
	};
})();

window.APP_CONFIG = APP_CONFIG;
window.AppState = AppState;
window.DomHelper = DomHelper;
window.ApiHelper = ApiHelper;
window.TemplateHelper = TemplateHelper;
window.CacheManager = CacheManager;
window.paginationModule = paginationModule;
window.TrackUser = TrackUser;
window.BackToTopButton = BackToTopButton;
