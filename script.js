// URL untuk data Al-Quran dan Hadits
const QURAN_DATA_URL = "https://vickyserver.my.id/server/api/books/quran";
const HADITH_DATA_URL =
	"https://vickyserver.my.id/server/api/books/hadith-book";
const QURAN_CACHE_KEY = "quran_data_cache___";
const HADITH_DATA_CACHE_KEY = "hadith_data_cache___";
const CACHE_EXPIRY_DAYS = 7; // Data akan disimpan selama 7 hari
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Milidetik

// Variabel global untuk menyimpan data
let quranData = null;
let hadithCollections = null;
let currentHadithCollection = null;
let loadingError = false;

// Variabel untuk instance paginasi
let surahPaginationInstance = null;
let hadithCollectionsPaginationInstance = null;
let hadithListPaginationInstance = null;
let surahDetailPaginationInstance = null;

// Back to Top Button
const backToTopBtn = document.getElementById("backToTopBtn");
// Theme Toggle button
const themeToggle = document.getElementById("themeToggle");
const themeIcon = themeToggle.querySelector("i");
const html = document.documentElement;

// Memuat preferensi tema dari localStorage
const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);

// Update ikon berdasarkan tema
if (savedTheme === "light") {
	themeIcon.classList.replace("fa-moon", "fa-sun");
}

themeToggle.addEventListener("click", () => {
	const currentTheme = html.getAttribute("data-theme");
	const newTheme = currentTheme === "dark" ? "light" : "dark";

	// Update tema
	html.setAttribute("data-theme", newTheme);
	localStorage.setItem("theme", newTheme);

	// Update ikon
	if (newTheme === "light") {
		themeIcon.classList.replace("fa-moon", "fa-sun");
	} else {
		themeIcon.classList.replace("fa-sun", "fa-moon");
	}
});

// Tampilkan/sembunyikan tombol saat scroll
window.addEventListener("scroll", () => {
	if (window.pageYOffset > 300) {
		backToTopBtn.classList.add("show");
	} else {
		backToTopBtn.classList.remove("show");
	}
});

// Fungsi untuk kembali ke atas
backToTopBtn.addEventListener("click", () => {
	window.scrollTo({
		top: 0,
		behavior: "smooth"
	});
});

// Event listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
	// Event listener untuk buku Quran
	document.getElementById("quranBook").addEventListener("click", function () {
		showSurahList();
	});

	// Event listener untuk buku Hadits
	document.getElementById("hadithBook").addEventListener("click", function () {
		showHadithCollections();
	});

	// Event listener untuk tombol kembali
	document.getElementById("backToShelf").addEventListener("click", function () {
		showMainShelf();
	});

	document.getElementById("backToSurah").addEventListener("click", function () {
		showSurahList();
	});

	document
		.getElementById("backToHadithList")
		.addEventListener("click", function () {
			showHadithCollections();
		});

	document
		.getElementById("backToHadithBook")
		.addEventListener("click", function () {
			if (currentHadithCollection) {
				showHadithList(currentHadithCollection.id);
			}
		});

	// Event listener untuk pencarian surah (tekan Enter)
	document
		.getElementById("searchInput")
		.addEventListener("keypress", function (e) {
			if (e.key === "Enter") {
				filterSurahs(this.value);
			}
		});

	// Event listener untuk pencarian global hadits (tekan Enter)
	document
		.getElementById("searchGlobalHadithInput")
		.addEventListener("keypress", async function (e) {
			if (e.key === "Enter") {
				const query = this.value.trim();
				if (query.length >= 3) {
					await searchHadithsGlobal(query);
				} else if (query.length === 0) {
					backFromSearch();
				}
			}
		});

	// Event listener untuk pencarian hadits dalam buku (tekan Enter)
	document
		.getElementById("searchHadithInput")
		.addEventListener("keypress", async function (e) {
			if (e.key === "Enter") {
				const query = this.value.trim();
				if (query.length >= 3) {
					await searchHadithsInBook(currentHadithCollection.id, query);
				} else if (query.length === 0) {
					backFromSearch();
				}
			}
		});

	document.addEventListener("click", function (e) {
		if (e.target.closest(".share-btn")) {
			const btn = e.target.closest(".share-btn");
			const content = btn.getAttribute("data-content");
			shareContent(content);
		}
	});
});

// Fungsi untuk membagikan konten
function shareContent(content) {
	if (navigator.share) {
		// Web Share API (mobile)
		navigator
			.share({
				title: "Perpustakaan Digital",
				text: decodeURIComponent(content)
			})
			.catch(error => console.log("Error sharing:", error));
	} else {
		// Fallback untuk desktop
		const text = decodeURIComponent(content);
		navigator.clipboard
			.writeText(text)
			.then(() => alert("Teks disalin ke clipboard!"))
			.catch(err => {
				console.error("Gagal menyalin teks:", err);
				alert("Gagal menyalin teks");
			});
	}
}

// Fungsi untuk menampilkan rak utama
function showMainShelf() {
	document.getElementById("mainShelf").style.display = "block";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "none";
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk menampilkan daftar surah
function showSurahList() {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "block";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("backToShelf").style.display = "flex";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "none";

	document.getElementById("searchInput").value = "";

	// Sembunyikan input pencarian hadits
	document.getElementById(
		"searchGlobalHadithInput"
	).parentElement.style.display = "none";
	document.getElementById("searchHadithInput").parentElement.style.display =
		"none";

	if (!quranData && !loadingError) {
		fetchQuranData();
	} else if (quranData) {
		renderSurahBooks();
	}
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk menampilkan detail surah
function showSurahDetail(surah, page = 1) {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "block";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "flex";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "none";

	// Sembunyikan input pencarian hadits
	document.getElementById(
		"searchGlobalHadithInput"
	).parentElement.style.display = "none";
	document.getElementById("searchHadithInput").parentElement.style.display =
		"none";

	renderSurahDetail(surah, page);
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk menampilkan daftar kitab hadits
function showHadithCollections() {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "block";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("backToShelf").style.display = "flex";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "none";

	// Tampilkan input pencarian global
	document.getElementById(
		"searchGlobalHadithInput"
	).parentElement.style.display = "block";
	document.getElementById("searchHadithInput").parentElement.style.display =
		"none";

	fetchHadithData();
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk menampilkan daftar hadits dalam satu kitab
function showHadithList(collectionId, page = 1) {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "block";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "flex";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "none";

	document.getElementById("searchHadithInput").value = "";

	// Tampilkan input pencarian dalam buku
	document.getElementById(
		"searchGlobalHadithInput"
	).parentElement.style.display = "none";
	document.getElementById("searchHadithInput").parentElement.style.display =
		"block";

	// Cari kitab hadits yang sesuai
	currentHadithCollection = hadithCollections.find(c => c.id === collectionId);

	if (!currentHadithCollection) {
		console.error("Kitab hadits tidak ditemukan:", collectionId);
		showHadithCollections();
		return;
	}

	renderHadithList(collectionId, page);
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk mengambil data Al-Quran dari server atau cache
async function fetchQuranData() {
	const loadingContainer = document.getElementById("surahLoading");
	const surahBooksContainer = document.getElementById("surahBooks");

	// Tampilkan loading indicator
	loadingContainer.style.display = "flex";
	surahBooksContainer.innerHTML = "";

	try {
		// 1. Coba ambil dari cache terlebih dahulu
		const cachedData = await CacheManager.getItem(QURAN_CACHE_KEY);

		if (cachedData) {
			quranData = cachedData;
			renderSurahBooks();
			return;
		}

		// 2. Jika tidak ada di cache, ambil dari server
		const response = await fetch(QURAN_DATA_URL);

		if (!response.ok) {
			throw new Error("Gagal mengambil data Al-Quran");
		}

		quranData = await response.json();

		// 3. Simpan ke cache untuk penggunaan selanjutnya
		await CacheManager.setItem(QURAN_CACHE_KEY, quranData, CACHE_EXPIRY_MS);

		renderSurahBooks();
	} catch (error) {
		console.error("Error fetching Quran data:", error);
		loadingError = true;

		// 4. Coba gunakan cache jika ada meskipun mungkin expired
		try {
			const fallbackCache = await CacheManager.getItem(QURAN_CACHE_KEY, true);
			if (fallbackCache) {
				quranData = fallbackCache;
				renderSurahBooks();
				return;
			}
		} catch (cacheError) {
			console.error("Fallback cache error:", cacheError);
		}

		// 5. Tampilkan pesan error jika tidak ada data sama sekali
		surahBooksContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat data Al-Quran. Silakan coba lagi nanti.</p>
                <button class="nav-btn" onclick="fetchQuranData()">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	} finally {
		loadingContainer.style.display = "none";
	}
}

// Fungsi untuk menampilkan buku-buku surah dengan paginasi
function renderSurahBooks() {
	const surahBooksContainer = document.getElementById("surahBooks");
	surahBooksContainer.innerHTML = "";

	if (!quranData) return;

	// Hapus instance sebelumnya jika ada
	if (surahPaginationInstance) {
		surahPaginationInstance.destroy();
	}

	// Urutkan surah berdasarkan nomor
	const sortedSurahs = [...quranData].sort((a, b) => a.number - b.number);

	// Fungsi untuk merender setiap item surah
	const renderItem = surah => {
		return `
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
        `;
	};

	// Inisialisasi paginasi dengan modul
	surahPaginationInstance = PaginationModule.init({
		container: surahBooksContainer,
		data: sortedSurahs,
		perPage: 12,
		dataRenderFn: pageData => {
			return pageData.map(renderItem).join("");
		},
		pagingContainer: document.getElementById("surahPaginationContainer"),
		onPageChange: page => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		},
		infoTemplate: "Menampilkan surah {from}-{to} dari {total}"
	});

	// Tambahkan event listener untuk buku
	surahBooksContainer.addEventListener("click", e => {
		const book = e.target.closest(".book");
		if (book) {
			const surahNumber = parseInt(book.dataset.number);
			const surah = quranData.find(s => s.number === surahNumber);
			if (surah) showSurahDetail(surah);
		}
	});
}

// Fungsi untuk menyaring surah berdasarkan query
function filterSurahs(query) {
	if (!quranData || !surahPaginationInstance) return;

	const lowerQuery = query.toLowerCase().trim();

	// Gunakan filter dari modul paginasi
	surahPaginationInstance.filterData(
		PaginationModule.createSimpleFilter(
			["name_latin", "name", "meaning"],
			lowerQuery
		)
	);
}

// Fungsi untuk mengambil ayat per surah
async function fetchVersesBySurah(surahNumber, page = 1) {
	const CACHE_KEY = `quran_verses_${surahNumber}_${page}`;
	const VERSES_URL = `https://vickyserver.my.id/server/api/books/quran/${surahNumber}/verses?page=${page}`;

	try {
		// Coba ambil dari cache terlebih dahulu
		const cachedData = await CacheManager.getItem(CACHE_KEY);

		if (cachedData) {
			return cachedData;
		}

		// Ambil dari server
		const response = await fetch(VERSES_URL);

		if (!response.ok) {
			throw new Error("Gagal mengambil data ayat");
		}

		const data = await response.json();

		// Simpan ke cache
		await CacheManager.setItem(CACHE_KEY, data, CACHE_EXPIRY_MS);

		return data;
	} catch (error) {
		console.error(`Error fetching verses for surah ${surahNumber}:`, error);
		throw error;
	}
}

// Fungsi untuk menampilkan detail surah dengan paginasi ayat
async function renderSurahDetail(surah, page = 1) {
	const surahDetailContainer = document.getElementById("surahDetail");
	surahDetailContainer.innerHTML = '<div class="loading">Memuat ayat...</div>';

	try {
		const versesData = await fetchVersesBySurah(surah.number, page);

		// Fungsi untuk merender setiap ayat
		const renderItem = verse => {
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
		};

		// Render header surah
		let surahDetailHTML = `
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
            </div>
            <div class="verses-container">
                ${versesData.data.map(renderItem).join("")}
            </div>
            <div id="surahDetailPaginationContainer"></div>
        `;

		surahDetailContainer.innerHTML = surahDetailHTML;

		// Hapus instance sebelumnya jika ada
		if (surahDetailPaginationInstance) {
			surahDetailPaginationInstance.destroy();
		}

		// Inisialisasi paginasi dengan modul (server-side)
		surahDetailPaginationInstance = PaginationModule.init({
			container: null, // Tidak digunakan untuk server-side
			pagingContainer: document.getElementById(
				"surahDetailPaginationContainer"
			),
			perPage: versesData.per_page,
			currentPage: versesData.current_page,
			serverSide: true,
			totalRecords: versesData.total,
			onPageChange: newPage => {
				renderSurahDetail(surah, newPage);
			},
			showInfo: true,
			infoTemplate: "Menampilkan ayat {from}-{to} dari {total}"
		});
	} catch (error) {
		console.error("Error fetching verses:", error);
		surahDetailContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat ayat. Silakan coba lagi nanti.</p>
                <button class="nav-btn" onclick="renderSurahDetail(${JSON.stringify(
									surah
								).replace(/"/g, "&quot;")}, ${page})">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	}
}

// Fungsi untuk memutar audio ayat
function playAudio(url) {
	if (!url) return;

	const audio = new Audio(url);
	audio.play().catch(e => console.log("Audio play failed:", e));
}

// Fungsi untuk mengambil data koleksi kitab hadits
async function fetchHadithData() {
	const loadingContainer = document.getElementById("hadithCollectionsLoading");
	const collectionsContainer = document.getElementById(
		"hadithCollectionsBooks"
	);

	loadingContainer.style.display = "flex";
	collectionsContainer.innerHTML = "";

	try {
		// Coba ambil dari cache
		const cachedData = await CacheManager.getItem(HADITH_DATA_CACHE_KEY);

		if (cachedData) {
			hadithCollections = cachedData;
			renderHadithCollections();
			return;
		}

		// Ambil data dari API
		const response = await fetch(HADITH_DATA_URL);

		if (!response.ok) {
			throw new Error("Gagal mengambil data kitab hadits");
		}

		const { data } = await response.json();

		// Pastikan format respons benar
		if (!data || !Array.isArray(data)) {
			throw new Error("Format data tidak valid");
		}

		hadithCollections = data;

		// Simpan ke cache
		await CacheManager.setItem(
			HADITH_DATA_CACHE_KEY,
			hadithCollections,
			CACHE_EXPIRY_MS
		);

		renderHadithCollections();
	} catch (error) {
		console.error("Error fetching hadith data:", error);
		collectionsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat data kitab hadits. Silakan coba lagi nanti.</p>
                <button class="nav-btn" onclick="fetchHadithData()">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	} finally {
		loadingContainer.style.display = "none";
	}
}

// Fungsi untuk menampilkan daftar kitab hadits dengan paginasi
function renderHadithCollections() {
	const collectionsContainer = document.getElementById(
		"hadithCollectionsBooks"
	);

	if (!hadithCollections) return;

	// Hapus instance sebelumnya jika ada
	//if (hadithCollectionsPaginationInstance) {
	//	hadithCollectionsPaginationInstance.destroy();
	//}

	// Fungsi untuk merender setiap item koleksi hadits
	const renderItem = collection => {
		return `
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
        `;
	};

	// Inisialisasi paginasi dengan modul
	hadithCollectionsPaginationInstance = PaginationModule.init({
		container: collectionsContainer,
		data: hadithCollections,
		perPage: 10,
		dataRenderFn: pageData => {
			return pageData.map(renderItem).join("");
		},
		pagingContainer: document.getElementById(
			"hadithCollectionsPaginationContainer"
		),
		onPageChange: page => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		},
		infoTemplate: "Menampilkan kitab {from}-{to} dari {total}"
	});

	// Tambahkan event listener untuk buku
	collectionsContainer.addEventListener("click", e => {
		const book = e.target.closest(".book");
		if (book) {
			const collectionId = book.dataset.id;
			currentHadithCollection = hadithCollections.find(
				c => c.id === collectionId
			);
			if (currentHadithCollection) showHadithList(currentHadithCollection.id);
		}
	});

	// Setel pencarian global hadits
	document
		.getElementById("searchGlobalHadithInput")
		.addEventListener("input", e => {
			const query = e.target.value.trim();
			hadithCollectionsPaginationInstance.filterData(
				PaginationModule.createSimpleFilter(["name"], query)
			);
		});
}

// Fungsi untuk mengambil hadits per kitab
async function fetchHadithsByBook(bookId, page = 1) {
	try {
		const response = await fetch(
			`${HADITH_DATA_URL}/${bookId}/hadiths?page=${page}`
		);

		if (!response.ok) {
			throw new Error("Gagal mengambil data hadits");
		}

		return await response.json();
	} catch (error) {
		console.error("Error fetching hadiths:", error);
		throw error;
	}
}

// Fungsi untuk menampilkan daftar hadits dengan paginasi
async function renderHadithList(collectionId, page = 1) {
	window.scrollTo({ top: 0, behavior: "smooth" });
	const loadingContainer = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");
	const paginationContainer = document.getElementById(
		"hadithListPaginationContainer"
	);
	const headerContainer = document.getElementById("hadithHeaderContainer");

	loadingContainer.style.display = "flex";
	headerContainer.innerHTML = "";
	hadithsContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	try {
		const data = await fetchHadithsByBook(collectionId, page);

		const hadithsData = data.hadiths;

		// Render header kitab hadits
		headerContainer.innerHTML = `<div class="surah-header">
            <h2>${data.name}</h2>
            <div class="surah-meta">
                <div class="meta-item">Total Hadits: ${data.total_hadiths}</div>
                <div class="meta-item">Halaman ${page} dari ${hadithsData.last_page}</div>
            </div>
        </div>`;

		// Fungsi untuk merender setiap hadits
		const renderItem = hadith => {
			const shareContent = `${data.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;
			const encodedContent = encodeURIComponent(shareContent);

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
                    <div class="arabic-text">${hadith.arabic}</div>
                    <div class="translation-text">
                        <strong>Terjemahan:</strong>
                        <p>${hadith.translation}</p>
                    </div>
                </div>
            `;
		};

		// Render data untuk halaman saat ini
		hadithsContainer.innerHTML = hadithsData.data.map(renderItem).join("");

		// Hapus instance sebelumnya jika ada
		//if (hadithListPaginationInstance) {
		//	hadithListPaginationInstance.destroy();
		//}

		// Inisialisasi paginasi dengan modul (server-side)
		hadithListPaginationInstance = PaginationModule.init({
			container: document.getElementById("surahDetailPaginationContainer"), // Tidak digunakan untuk server-side
			pagingContainer: paginationContainer,
			perPage: hadithsData.per_page,
			currentPage: hadithsData.current_page,
			serverSide: true,
			totalRecords: hadithsData.total,
			onPageChange: newPage => {
				renderHadithList(collectionId, newPage);
			},
			showInfo: true,
			infoTemplate: "Menampilkan hadits {from}-{to} dari {total}"
		});
	} catch (error) {
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
		loadingContainer.style.display = "none";
	}

	// Setel pencarian hadits dalam buku
	document.getElementById("searchHadithInput").addEventListener("input", e => {
		const query = e.target.value.trim();
		if (hadithListPaginationInstance) {
			hadithListPaginationInstance.filterData(
				PaginationModule.createSimpleFilter(["arabic", "translation"], query)
			);
		}
	});
}

// ===== FUNGSI PENCARIAN HADITS =====

// Fungsi untuk menampilkan hasil pencarian
function showSearchResults() {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk melakukan pencarian global hadits
async function searchHadithsGlobal(query, page = 1) {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk melakukan pencarian hadits dalam satu buku
async function searchHadithsInBook(bookId, query, page = 1) {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk menampilkan hasil pencarian
function renderSearchResults() {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk menampilkan item hadits dalam hasil pencarian
function renderHadithItem(hadith, bookName) {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk mengubah halaman hasil pencarian
function changeSearchPage(page) {
	// ... (tetap sama seperti sebelumnya) ...
}

// Fungsi untuk kembali dari hasil pencarian
function backFromSearch() {
	// ... (tetap sama seperti sebelumnya) ...
}
