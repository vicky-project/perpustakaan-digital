// URL untuk data Al-Quran
const QURAN_DATA_URL = "data/quran_data.json";
const HADITH_DATA_URL =
	"https://vickyserver.my.id/server/api/books/hadith-book";
const QURAN_CACHE_KEY = "quran_data_cache";
const HADITH_DATA_CACHE_KEY = "hadith_data_cache";
const CACHE_EXPIRY_DAYS = 7; // Data akan disimpan selama 7 hari
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Milidetik

// Variabel global untuk menyimpan data
let quranData = null;
let hadithData = null;
let hadithCollections = null;
let currentHadithCollection = null;
let loadingError = false;

// Event listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
	document.getElementById("quranBook").addEventListener("click", function () {
		showSurahList();
	});

	document.getElementById("hadithBook").addEventListener("click", function () {
		showHadithCollections();
	});

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
				showHadithList(currentHadithCollection);
			}
		});

	document.getElementById("searchInput").addEventListener("input", function () {
		filterSurahs(this.value);
	});

	document
		.getElementById("searchHadithInput")
		.addEventListener("input", function () {
			filterHadiths(this.value);
		});
});

function showMainShelf() {
	document.getElementById("mainShelf").style.display = "block";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("hadithDetail").style.display = "none";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSurahList() {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "block";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("hadithDetail").style.display = "none";
	document.getElementById("backToShelf").style.display = "flex";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";

	document.getElementById("searchInput").value = "";

	if (!quranData && !loadingError) {
		fetchQuranData();
	} else if (quranData) {
		renderSurahBooks();
	}
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSurahDetail(surah) {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "block";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("hadithDetail").style.display = "none";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "flex";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";

	renderSurahDetail(surah);
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHadithCollections() {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "block";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("hadithDetail").style.display = "none";
	document.getElementById("backToShelf").style.display = "flex";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "none";

	fetchHadithData();
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHadithList(collectionId) {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "block";
	document.getElementById("hadithDetail").style.display = "none";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "flex";
	document.getElementById("backToHadithBook").style.display = "none";

	document.getElementById("searchHadithInput").value = "";
	renderHadithList(collectionId);
	window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHadithDetail(collectionId, hadith) {
	document.getElementById("mainShelf").style.display = "none";
	document.getElementById("surahList").style.display = "none";
	document.getElementById("surahDetail").style.display = "none";
	document.getElementById("hadithCollections").style.display = "none";
	document.getElementById("hadithList").style.display = "none";
	document.getElementById("hadithDetail").style.display = "block";
	document.getElementById("backToShelf").style.display = "none";
	document.getElementById("backToSurah").style.display = "none";
	document.getElementById("backToHadithList").style.display = "none";
	document.getElementById("backToHadithBook").style.display = "flex";

	renderHadithDetail(collectionId, hadith);
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fungsi untuk mengambil data dari server
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

		surahBook.classList.add("surah-book-item");

		surahBook.innerHTML = `
			                 <div class="book-image">
			                     <i class="fas fa-book"></i>
			                     <div class="surah-number-badge">${surah.number}</div>
			                 </div>
			                 <div class="book-title">
			                     <h3>${surah.name_latin}</h3>
			                     <p>${surah.number_of_verses} Ayat • ${surah.place}</p>
			                 </div>
			             `;

		surahBook.addEventListener("click", () => {
			showSurahDetail(surah);
		});

		surahBooksContainer.appendChild(surahBook);
	});
}

function filterSurahs(query) {
	if (!quranData) return;

	const books = document.querySelectorAll("#surahBooks .book");
	const lowerQuery = query.toLowerCase().trim();

	books.forEach(book => {
		const name = book.dataset.name.toLowerCase();
		const nameAr = book.dataset.nameAr;
		const number = book.dataset.number;

		if (
			lowerQuery === "" ||
			name.includes(lowerQuery) ||
			nameAr.includes(query) ||
			number === query ||
			number === lowerQuery
		) {
			book.style.display = "inline-block";
		} else {
			book.style.display = "none";
		}
	});
}

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
		surahDetailHTML += `
			                 <div class="verse-item">
			                     <div class="verse-header">
			                         <div class="verse-number">${verse.verse_number}</div>
			                         <div class="verse-audio">
			                             <button onclick="playAudio('${verse.audio["05"]}')">
			                                 <i class="fas fa-play"></i>
			                             </button>
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

function playAudio(url) {
	const audio = new Audio(url);
	audio.play().catch(e => console.log("Audio play failed:", e));
}

// Fungsi untuk mengambil data Hadits
async function fetchHadithData() {
	const loadingContainer = document.getElementById("hadithCollectionsLoading");
	const collectionsContainer = document.getElementById(
		"hadithCollectionsBooks"
	);

	// Tampilkan loading indicator
	loadingContainer.style.display = "flex";
	collectionsContainer.innerHTML = "";

	try {
		// 1. Coba ambil dari cache terlebih dahulu
		const cachedData = await CacheManager.getItem(HADITH_DATA_CACHE_KEY);

		if (cachedData) {
			hadithCollections = cachedData;
			renderHadithCollections();
			return;
		}

		// 2. Jika tidak ada di cache, ambil dari server
		const response = await fetch(HADITH_DATA_URL);

		if (!response.ok) {
			throw new Error("Gagal mengambil data hadits");
		}

		const data = await response.json();

		if (!data || !data?.success) {
			throw new Error("Error mendapatkan data hadits.");
		}

		hadithCollections = data;

		// 3. Simpan ke cache untuk penggunaan selanjutnya
		await CacheManager.setItem(
			HADITH_DATA_CACHE_KEY,
			hadithCollections,
			CACHE_EXPIRY_MS
		);

		renderHadithCollections();
	} catch (error) {
		console.error("Error fetching hadith data:", error);
		loadingError = true;

		// 4. Tampilkan pesan error
		collectionsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Gagal memuat data hadits. Silakan coba lagi nanti.</p>
                        <button class="nav-btn" onclick="fetchHadithData()">
                            <i class="fas fa-redo"></i> Muat Ulang
                        </button>
                    </div>
                `;
	} finally {
		loadingContainer.style.display = "none";
	}
}

function renderHadithCollections() {
	const collectionsContainer = document.getElementById(
		"hadithCollectionsBooks"
	);

	if (!hadithCollections) return;

	collectionsContainer.innerHTML = "";

	hadithCollections.data.forEach(collection => {
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

// Fungsi untuk mengambil hadits per kitab
async function fetchHadithsByBook(bookId) {
	try {
		const res = await fetch(`${HADITH_DATA_URL}/${bookId}/hadiths`);
		if (!res.ok) {
			throw new Error("Gagal mengambil data hadiths.");
		}

		const data = await res.json();

		if (!data.success || !data.hadiths || !data.hadiths.data) {
			throw new Error("Format hadits tidak dapat di render.");
		}

		return data.hadiths.data;
	} catch (error) {
		console.error("Error fetching hadiths.", error);
		throw error;
	}
}

async function renderHadithList(collectionId, page = 1) {
	const loadingContainer = document.getElementById("hadithLoading");
	const hadithsContainer = document.getElementById("hadithBooks");

	// Tampilkan loading indicator
	loadingContainer.style.display = "flex";
	hadithsContainer.innerHTML = "";

	try {
		const hadiths = await fetchHadithsByBook(collectionId);

		hadiths.forEach(hadith => {
			const hadithBook = document.createElement("div");
			hadithBook.className = "book small";
			hadithBook.dataset.number = hadith.number;

			hadithBook.innerHTML = `
                    <div class="book-image">
                        <i class="fas fa-book-open"></i>
                        <div class="surah-number-badge">${hadith.number}</div>
                    </div>
                    <div class="book-title">
                        <h3>Hadits ${hadith.number}</h3>
                        <p>${currentHadithCollection.name}</p>
                    </div>
                `;

			hadithBook.addEventListener("click", () => {
				showHadithDetail(collectionId, hadith);
			});

			hadithsContainer.appendChild(hadithBook);
		});
	} catch (err) {
		hadithsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${err.message}</p>
                    </div>
                `;
	} finally {
		loadingContainer.style.display = "none";
	}
}

function filterHadiths(query) {
	const books = document.querySelectorAll("#hadithBooks .book");
	const lowerQuery = query.toLowerCase().trim();

	books.forEach(book => {
		const number = book.dataset.number;

		if (lowerQuery === "" || number.includes(lowerQuery)) {
			book.style.display = "inline-block";
		} else {
			book.style.display = "none";
		}
	});
}

function renderHadithDetail(collectionId, hadith) {
	const hadithDetailContainer = document.getElementById("hadithDetail");

	// Cari koleksi hadits berdasarkan ID
	const collection = hadithCollections.find(c => c.id === collectionId);

	if (!collection) {
		hadithDetailContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Kitab hadits tidak ditemukan.</p>
                    </div>
                `;
		return;
	}

	hadithDetailContainer.innerHTML = `
                <div class="surah-header">
                    <h2>Hadits ${hadith.number}</h2>
                    <h3>${collection.name}</h3>
                    <div class="surah-meta">
                        <div class="meta-item">Nomor: ${hadith.number}</div>
                        <div class="meta-item">Kitab: ${collection.name}</div>
                        <div class="meta-item">Total Hadits: ${collection.total_hadiths}</div>
                    </div>
                </div>
                <div class="verses-container">
                    <div class="hadith-item">
                        <div class="hadith-header">
                            <div class="hadith-number">${hadith.number}</div>
                        </div>
                        <div class="hadith-arabic">
                            ${hadith.arabic}
                        </div>
                        <div class="hadith-translation">
                            <strong>Terjemahan:</strong>
                            <p>${hadith.translation}</p>
                        </div>
                    </div>
                </div>
            `;
}
