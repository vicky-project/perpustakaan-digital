// URL untuk data Al-Quran dan Hadits
const QURAN_DATA_URL = "data/quran_data.json";
const HADITH_DATA_URL =
	"https://vickyserver.my.id/server/api/books/hadith-book";
const QURAN_CACHE_KEY = "quran_data_cache__";
const HADITH_DATA_CACHE_KEY = "hadith_data_cache__";
const CACHE_EXPIRY_DAYS = 7; // Data akan disimpan selama 7 hari
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Milidetik

// Variabel global untuk menyimpan data
let quranData = null;
let hadithCollections = null;
let currentHadithCollection = null;
let loadingError = false;

// Variabel untuk paginasi hadits
let currentHadithPage = 1;
let hadithPaginationInfo = null;

// Variabel untuk pencarian hadits
let currentSearchQuery = "";
let currentSearchBookId = null;
let currentSearchPage = 1;
let hadithSearchResults = null;

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

	// Event listener untuk tombol kembali dari pencarian
	document
		.getElementById("backFromSearch")
		.addEventListener("click", backFromSearch);

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
function showSurahDetail(surah) {
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

	renderSurahDetail(surah);
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

// Fungsi untuk menampilkan buku-buku surah
function renderSurahBooks() {
	const surahBooksContainer = document.getElementById("surahBooks");

	if (!quranData) return;

	surahBooksContainer.innerHTML = "";

	// Urutkan surah berdasarkan nomor
	const sortedSurahs = [...quranData.quran].sort((a, b) => a.number - b.number);

	sortedSurahs.forEach(surah => {
		const surahBook = document.createElement("div");
		surahBook.className = "book small";
		surahBook.dataset.number = surah.number;
		surahBook.dataset.name = surah.name_latin;
		surahBook.dataset.nameAr = surah.name;
		surahBook.dataset.meaning = surah.meaning.toLowerCase();

		surahBook.classList.add("surah-book-item");

		surahBook.innerHTML = `
            <div class="book-image">
                <i class="fas fa-book"></i>
                <div class="surah-number-badge">${surah.number}</div>
            </div>
            <div class="book-title">
                <h3>${surah.name_latin}</h3>
                <p>${surah.number_of_verses} Ayat • ${surah.place}</p>
                <p class="meaning-text">${surah.meaning}</p>
            </div>
        `;

		surahBook.addEventListener("click", () => {
			showSurahDetail(surah);
		});

		surahBooksContainer.appendChild(surahBook);
	});
}

// Fungsi untuk menyaring surah berdasarkan query
function filterSurahs(query) {
	if (!quranData) return;

	const books = document.querySelectorAll("#surahBooks .book");
	const lowerQuery = query.toLowerCase().trim();

	books.forEach(book => {
		const name = book.dataset.name.toLowerCase();
		const nameAr = book.dataset.nameAr;
		const number = book.dataset.number;
		const meaning = book.dataset.meaning;

		const title = book.querySelector("h3");
		const meaningEl = book.querySelector(".meaning-text");

		// Reset highlight
		title.innerHTML = title.textContent;
		meaningEl.innerHTML = meaningEl.textContent;

		if (
			lowerQuery === "" ||
			name.includes(lowerQuery) ||
			nameAr.includes(query) ||
			number === query ||
			number === lowerQuery ||
			meaning.includes(lowerQuery)
		) {
			book.style.display = "inline-block";

			// Highlight hasil pencarian
			title.innerHTML = highlightMatch(title.textContent, query);
			meaningEl.innerHTML = highlightMatch(meaningEl.textContent, query);
		} else {
			book.style.display = "none";
		}
	});
}

// Fungsi untuk menyoroti teks yang cocok dengan query
function highlightMatch(text, query) {
	if (!query.trim()) return text;

	try {
		const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
		return text.replace(regex, '<span class="search-highlight">$1</span>');
	} catch (e) {
		// Jika regex error (misal karena karakter khusus), kembalikan teks asli
		return text;
	}
}

// Fungsi untuk escape karakter khusus regex
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Fungsi untuk menampilkan detail surah
function renderSurahDetail(surah) {
	const surahDetailContainer = document.getElementById("surahDetail");

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
    `;

	// Urutkan ayat berdasarkan nomor
	const sortedVerses = [...surah.verses].sort(
		(a, b) => a.verse_number - b.verse_number
	);

	sortedVerses.forEach(verse => {
		const shareContent = `Q.S. ${surah.name_latin}:${verse.verse_number}\n\n${verse.arabic_text}\n\nTerjemahan: ${verse.translation}`;
		const encodedContent = encodeURIComponent(shareContent);

		surahDetailHTML += `
            <div class="verse-item">
                <div class="verse-header">
                  <div class="verse-number">${verse.verse_number}</div>
                  <div class="verse-controls">
                    <div class="verse-audio">
                        <button onclick="playAudio('${verse.audio["05"]}')">
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
	});

	surahDetailHTML += `</div>`;
	surahDetailContainer.innerHTML = surahDetailHTML;
}

// Fungsi untuk memutar audio ayat
function playAudio(url) {
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

// Fungsi untuk menampilkan daftar kitab hadits
function renderHadithCollections() {
	const collectionsContainer = document.getElementById(
		"hadithCollectionsBooks"
	);

	if (!hadithCollections) return;

	collectionsContainer.innerHTML = "";

	hadithCollections.forEach(collection => {
		const collectionBook = document.createElement("div");
		collectionBook.className = "book small";
		collectionBook.dataset.id = collection.id;

		collectionBook.innerHTML = `
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
        `;

		collectionBook.addEventListener("click", () => {
			currentHadithCollection = collection;
			showHadithList(collection.id);
		});

		collectionsContainer.appendChild(collectionBook);
	});
}

// Fungsi untuk mengambil hadits per kitab dengan paginasi
async function fetchHadithsByBook(bookId, page = 1) {
	try {
		const response = await fetch(
			`${HADITH_DATA_URL}/${bookId}/hadiths?page=${page}`
		);

		if (!response.ok) {
			// Coba dapatkan pesan error dari response
			let errorBody;
			try {
				errorBody = await response.json();
			} catch {
				errorBody = await response.text();
			}

			throw new Error(
				`HTTP error ${response.status}: ${JSON.stringify(errorBody)}`
			);
		}

		const data = await response.json();

		if (!data.success || !data.hadiths) {
			throw new Error("Format data hadits tidak valid");
		}

		return data;
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
	const paginationContainer = document.getElementById("hadithPagination");
	const headerContainer = document.getElementById("hadithHeaderContainer");

	loadingContainer.style.display = "flex";
	headerContainer.innerHTML = "";
	hadithsContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	try {
		const response = await fetchHadithsByBook(collectionId, page);
		const collection = response.book;
		const hadithsData = response.hadiths;

		// Simpan info paginasi
		hadithPaginationInfo = hadithsData;
		currentHadithPage = page;

		// Render header kitab hadits
		headerContainer.innerHTML = `<div class="surah-header">
            <h2>${collection.name}</h2>
            <div class="surah-meta">
                <div class="meta-item">Total Hadits: ${collection.total_hadiths}</div>
                <div class="meta-item">Halaman ${page} dari ${hadithsData.last_page}</div>
            </div>
        </div>`;

		// Render semua hadits langsung
		hadithsData.data.forEach(hadith => {
			const shareContent = `${currentHadithCollection.name} - Hadits No. ${hadith.number}\n\n${hadith.arabic}\n\nTerjemahan: ${hadith.translation}`;
			const encodedContent = encodeURIComponent(shareContent);

			const hadithItem = document.createElement("div");
			hadithItem.className = "verse-item";
			hadithItem.innerHTML = `
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
            `;
			hadithsContainer.appendChild(hadithItem);
		});

		renderHadithPagination(collectionId, hadithsData, paginationContainer);
	} catch (error) {
		hadithsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message}</p>
                <button class="nav-btn" onclick="renderHadithList('${collectionId}', ${currentHadithPage})">
                    <i class="fas fa-redo"></i> Muat Ulang
                </button>
            </div>
        `;
	} finally {
		loadingContainer.style.display = "none";
	}
}

// Fungsi untuk menampilkan kontrol paginasi
function renderHadithPagination(collectionId, pagination, container) {
	container.innerHTML = `
        <div class="pagination-info">
            Menampilkan hadits ${pagination.from}-${pagination.to} dari ${
							pagination.total
						}
        </div>
        <div class="pagination-controls">
            <button class="pagination-btn ${
							!pagination.prev_page_url ? "disabled" : ""
						}" 
                ${
									pagination.prev_page_url
										? `onclick="renderHadithList('${collectionId}', ${
												pagination.current_page - 1
										  })"`
										: ""
								}>
                <i class="fas fa-chevron-left"></i> <span class="pagination-text">Sebelumnya</span>
            </button>
            
            <div class="page-numbers">
                ${generatePageNumbers(collectionId, pagination)}
            </div>
            
            <button class="pagination-btn ${
							!pagination.next_page_url ? "disabled" : ""
						}" 
                ${
									pagination.next_page_url
										? `onclick="renderHadithList('${collectionId}', ${
												pagination.current_page + 1
										  })"`
										: ""
								}>
                <span class="pagination-text">Selanjutnya</span> <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// Fungsi untuk menghasilkan nomor halaman
function generatePageNumbers(collectionId, pagination) {
	let pagesHtml = "";
	const maxVisiblePages = 5;
	const currentPage = pagination.current_page;
	const lastPage = pagination.last_page;
	let startPage, endPage;

	if (lastPage <= maxVisiblePages) {
		startPage = 1;
		endPage = lastPage;
	} else {
		const maxVisibleBeforeCurrent = Math.floor(maxVisiblePages / 2);
		const maxVisibleAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

		if (currentPage <= maxVisibleBeforeCurrent) {
			startPage = 1;
			endPage = maxVisiblePages;
		} else if (currentPage + maxVisibleAfterCurrent >= lastPage) {
			startPage = lastPage - maxVisiblePages + 1;
			endPage = lastPage;
		} else {
			startPage = currentPage - maxVisibleBeforeCurrent;
			endPage = currentPage + maxVisibleAfterCurrent;
		}
	}

	// Tombol pertama
	if (startPage > 1) {
		pagesHtml += `
            <button class="page-number" onclick="renderHadithList('${collectionId}', 1)">1</button>
            ${startPage > 2 ? '<span class="page-dots">...</span>' : ""}
        `;
	}

	// Nomor halaman
	for (let i = startPage; i <= endPage; i++) {
		pagesHtml += `
            <button class="page-number ${i === currentPage ? "active" : ""}" 
                onclick="renderHadithList('${collectionId}', ${i})">
                ${i}
            </button>
        `;
	}

	// Tombol terakhir
	if (endPage < lastPage) {
		pagesHtml += `
            ${
							endPage < lastPage - 1 ? '<span class="page-dots">...</span>' : ""
						}
            <button class="page-number" onclick="renderHadithList('${collectionId}', ${lastPage})">
                ${lastPage}
            </button>
        `;
	}

	return pagesHtml;
}

// ===== FUNGSI PENCARIAN HADITS =====

// Fungsi untuk menampilkan hasil pencarian
function showSearchResults() {
	// Sembunyikan semua kontainer utama
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";

	// Tampilkan kontainer hadithList
	const hadithListContainer = document.getElementById("hadithList");
	hadithListContainer.style.display = "block";

	// Tampilkan bagian yang diperlukan
	document.getElementById("hadithBooks").style.display = "block";

	// Kelola tombol navigasi
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	document.getElementById("backFromSearch").style.display = "flex";

	// Sembunyikan input pencarian
	document.getElementById(
		"searchGlobalHadithInput"
	).parentElement.style.display = "none";
	document.getElementById("searchHadithInput").parentElement.style.display =
		"none";

	// Tampilkan loading spinner sementara
	const loadingContainer = document.getElementById("hadithLoading");
	loadingContainer.style.display = "flex";

	// Kosongkan konten sementara
	document.getElementById("hadithHeaderContainer").innerHTML = "";
	document.getElementById("hadithBooks").innerHTML = "";
	document.getElementById("hadithPagination").innerHTML = "";
}

// Fungsi untuk melakukan pencarian global hadits
async function searchHadithsGlobal(query, page = 1) {
	// Tampilkan UI hasil pencarian
	showSearchResults();

	const loadingContainer = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	// Pastikan spinner ditampilkan
	loadingContainer.style.display = "flex";

	currentSearchQuery = query;
	currentSearchBookId = null;
	currentSearchPage = page;

	const url = `https://vickyserver.my.id/server/api/books/hadith-book/search?query=${encodeURIComponent(
		query
	)}&page=${page}`;

	try {
		const response = await fetch(url);
		let responseClone;

		if (response.clone) {
			responseClone = response.clone();
		}

		if (!response.ok) {
			// Coba parse response sebagai JSON untuk mendapatkan pesan error
			let errorBody;
			try {
				errorBody = await response.json();
			} catch (jsonError) {
				// Jika gagal parse JSON, ambil sebagai teks biasa
				errorBody = await response.text();
			}

			throw new Error(`
                Server error: ${response.status} ${response.statusText}
                Response: ${JSON.stringify(errorBody, null, 2)}
            `);
		}

		const data = await response.json();
		hadithSearchResults = data;

		// Sembunyikan spinner setelah data diterima
		loadingContainer.style.display = "none";

		if (data.success && data.results && data.results.data.length > 0) {
			renderSearchResults();
		} else {
			hadithsContainer.innerHTML = `<div class="error-message">Tidak ditemukan hasil pencarian untuk "${query}"</div>`;
		}
	} catch (error) {
		console.error("Error searching hadiths:", error);
		loadingContainer.style.display = "none";

		// Coba dapatkan response asli untuk debugging
		let responseText = "Tidak dapat mendapatkan response";
		try {
			const responseClone = await responseClone;
			responseText = await responseClone.text();
		} catch (cloneError) {
			console.error("Failed to clone response:", cloneError);
		}

		hadithsContainer.innerHTML = `
            <div class="error-message">
                <h3>Terjadi kesalahan server</h3>
                <p>${error.message}</p>
                <div class="debug-info">
                    <p><strong>URL:</strong> ${url}</p>
                    <p><strong>Response:</strong></p>
                    <pre>${responseText}</pre>
                </div>
                <button class="nav-btn" onclick="searchHadithsGlobal('${query}', ${page})">
                    <i class="fas fa-redo"></i> Coba Lagi
                </button>
            </div>
        `;
	}
}

// Fungsi untuk melakukan pencarian hadits dalam satu buku
async function searchHadithsInBook(bookId, query, page = 1) {
	// Tampilkan UI hasil pencarian
	showSearchResults();

	const loadingContainer = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	// Pastikan spinner ditampilkan
	loadingContainer.style.display = "flex";

	currentSearchQuery = query;
	currentSearchBookId = bookId;
	currentSearchPage = page;

	const url = `https://vickyserver.my.id/server/api/books/hadith-book/search?query=${encodeURIComponent(
		query
	)}&book_id=${bookId}&page=${page}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			// Coba parse response sebagai JSON untuk mendapatkan pesan error
			let errorBody;
			try {
				errorBody = await response.json();
			} catch (jsonError) {
				// Jika gagal parse JSON, ambil sebagai teks biasa
				errorBody = await response.text();
			}

			throw new Error(`
                Server error: ${response.status} ${response.statusText}
                Response: ${JSON.stringify(errorBody, null, 2)}
            `);
		}

		const data = await response.json();
		hadithSearchResults = data;

		// Sembunyikan spinner setelah data diterima
		loadingContainer.style.display = "none";

		// Handle struktur data yang berbeda untuk pencarian dalam buku
		if (data.success && data.results && data.results.data) {
			// Untuk pencarian dalam buku, data.results.data adalah array langsung hadits
			if (data.results.data.length > 0) {
				renderSearchResults();
			} else {
				hadithsContainer.innerHTML = `<div class="error-message">Tidak ditemukan hasil pencarian untuk "${query}" dalam kitab ini</div>`;
			}
		} else {
			hadithsContainer.innerHTML = `<div class="error-message">Format respons tidak valid</div>`;
		}
	} catch (error) {
		console.error("Error searching hadiths:", error);
		loadingContainer.style.display = "none";

		// Coba dapatkan response asli untuk debugging
		let responseText = "Tidak dapat mendapatkan response";
		try {
			responseText = await response.text();
		} catch (textError) {
			console.error("Failed to get response text:", textError);
		}

		hadithsContainer.innerHTML = `
            <div class="error-message">
                <h3>Terjadi kesalahan server</h3>
                <p>${error.message}</p>
                <div class="debug-info">
                    <p><strong>URL:</strong> ${url}</p>
                    <p><strong>Response:</strong></p>
                    <pre>${responseText}</pre>
                </div>
                <button class="nav-btn" onclick="searchHadithsInBook('${bookId}', '${query}', ${page})">
                    <i class="fas fa-redo"></i> Coba Lagi
                </button>
            </div>
        `;
	}
}

// Fungsi untuk menampilkan hasil pencarian
function renderSearchResults() {
	const hadithsContainer = document.getElementById("hadithBooks");
	const headerContainer = document.getElementById("hadithHeaderContainer");
	const paginationContainer = document.getElementById("hadithPagination");

	// Sembunyikan spinner
	const loadingContainer = document.getElementById("hadithLoading");
	loadingContainer.style.display = "none";

	// Kosongkan konten
	hadithsContainer.innerHTML = "";
	headerContainer.innerHTML = "";
	paginationContainer.innerHTML = "";

	if (!hadithSearchResults || !hadithSearchResults.success) {
		hadithsContainer.innerHTML = `<div class="error-message">Tidak ada hasil pencarian</div>`;
		return;
	}

	const results = hadithSearchResults.results;

	// Render header
	let headerHtml = `<div class="search-header">`;
	if (currentSearchBookId) {
		const bookName = currentHadithCollection?.name || "Kitab Hadits";
		headerHtml += `<h2>Hasil Pencarian dalam ${bookName}</h2>`;
	} else {
		headerHtml += `<h2>Hasil Pencarian Global</h2>`;
	}
	headerHtml += `
        <div class="surah-meta">
            <div class="meta-item">Kata kunci: "${currentSearchQuery}"</div>
            <div class="meta-item">Ditemukan ${results.total} hadits</div>
        </div>
    </div>`;
	headerContainer.innerHTML = headerHtml;

	// Render hasil
	let hadithsHtml = "";

	try {
		// Loop melalui semua kitab dalam hasil
		results.data.forEach(bookResult => {
			// Pastikan ada hadits dalam kitab ini
			if (bookResult.hadiths && Array.isArray(bookResult.hadiths)) {
				bookResult.hadiths.forEach(hadith => {
					hadithsHtml += renderHadithItem(
						hadith,
						bookResult.book_name || "Kitab Hadits"
					);
				});
			}
		});

		hadithsContainer.innerHTML = hadithsHtml;

		// Render paginasi
		renderSearchPagination();
	} catch (error) {
		console.error("Error rendering search results:", error);
		hadithsContainer.innerHTML = `
            <div class="error-message">
                Gagal menampilkan hasil pencarian. 
                <p>${error.message}</p>
            </div>
        `;
	}
}

// Fungsi untuk menampilkan item hadits dalam hasil pencarian
function renderHadithItem(hadith, bookName) {
	// Highlight teks yang cocok dengan query
	const highlight = text => {
		if (!currentSearchQuery || !text) return text;
		try {
			const regex = new RegExp(currentSearchQuery, "gi");
			return text.replace(
				regex,
				match => `<span class="search-highlight">${match}</span>`
			);
		} catch (e) {
			// Handle invalid regex (misalnya jika query mengandung karakter khusus)
			return text;
		}
	};

	// Pastikan properti ada
	const arabicText = hadith.arabic || "Teks Arab tidak tersedia";
	const translationText = hadith.translation || "Terjemahan tidak tersedia";
	const number = hadith.number || "N/A";

	const shareContent = `${bookName} - Hadits No. ${number}\n\n${arabicText}\n\nTerjemahan: ${translationText}`;
	const encodedContent = encodeURIComponent(shareContent);

	return `
        <div class="search-hadith-item">
            <div class="verse-header">
              <div class="verse-info">
                <div class="verse-number">${number}</div>
                <div class="verse-book">${bookName}</div>
              </div>
              <div class="verse-share">
                <button class="share-btn" data-content="${encodedContent}">
								  <i class="fas fa-share-alt"></i>
								</button>
              </div>
            </div>
            <div class="arabic-text">${highlight(arabicText)}</div>
            <div class="translation-text">${highlight(translationText)}</div>
        </div>
    `;
}

// Fungsi untuk menampilkan paginasi hasil pencarian
function renderSearchPagination() {
	const paginationContainer = document.getElementById("hadithPagination");
	const results = hadithSearchResults.results;

	if (!results || results.last_page <= 1) {
		paginationContainer.innerHTML = "";
		return;
	}

	let html = `
        <div class="pagination-info">
            Menampilkan hadits ${results.from}-${results.to} dari ${results.total}
        </div>
        <div class="pagination-controls">
    `;

	// Tombol sebelumnya
	if (results.prev_page_url) {
		html += `<button class="pagination-btn" onclick="changeSearchPage(${
			results.current_page - 1
		})">
                    <i class="fas fa-chevron-left"></i> <span class="pagination-text">Sebelumnya</span>
                </button>`;
	} else {
		html += `<button class="pagination-btn disabled">
                    <i class="fas fa-chevron-left"></i> <span class="pagination-text">Sebelumnya</span>
                </button>`;
	}

	// Tombol halaman
	html += '<div class="page-numbers">';
	for (let i = 1; i <= results.last_page; i++) {
		if (i === results.current_page) {
			html += `<button class="page-number active">${i}</button>`;
		} else {
			html += `<button class="page-number" onclick="changeSearchPage(${i})">${i}</button>`;
		}
	}
	html += "</div>";

	// Tombol berikutnya
	if (results.next_page_url) {
		html += `<button class="pagination-btn" onclick="changeSearchPage(${
			results.current_page + 1
		})">
                    <span class="pagination-text">Selanjutnya</span> <i class="fas fa-chevron-right"></i>
                </button>`;
	} else {
		html += `<button class="pagination-btn disabled">
                    <span class="pagination-text">Selanjutnya</span> <i class="fas fa-chevron-right"></i>
                </button>`;
	}

	html += "</div>";
	paginationContainer.innerHTML = html;
}

// Fungsi untuk mengubah halaman hasil pencarian
function changeSearchPage(page) {
	currentSearchPage = page;

	if (currentSearchBookId) {
		searchHadithsInBook(currentSearchBookId, currentSearchQuery, page);
	} else {
		searchHadithsGlobal(currentSearchQuery, page);
	}
}

// Fungsi untuk kembali dari hasil pencarian
function backFromSearch() {
	document.getElementById("backFromSearch").style.display = "none";

	// Reset state pencarian
	currentSearchQuery = "";
	currentSearchBookId = null;
	currentSearchPage = 1;
	hadithSearchResults = null;

	// Reset input
	document.getElementById("searchGlobalHadithInput").value = "";
	document.getElementById("searchHadithInput").value = "";

	if (currentHadithCollection) {
		// Kembali ke daftar hadits dalam buku
		showHadithList(currentHadithCollection.id);
	} else {
		// Kembali ke daftar kitab hadits
		showHadithCollections();
	}
}
