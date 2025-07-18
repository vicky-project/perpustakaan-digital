
			// URL untuk data Al-Quran
			const QURAN_DATA_URL = "data/quran_data.json";
			const QURAN_CACHE_KEY = "quran_data_cache";
			const CACHE_EXPIRY_DAYS = 7; // Data akan disimpan selama 7 hari
			const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Milidetik

			// Variabel global untuk menyimpan data
			let quranData = null;
			let loadingError = false;

			// Event listener saat halaman dimuat
			document.addEventListener("DOMContentLoaded", function () {
				document
					.getElementById("quranBook")
					.addEventListener("click", function () {
						showSurahList();
					});

				document
					.getElementById("hadithBook")
					.addEventListener("click", function () {
						alert("Fitur Hadits akan segera hadir!");
					});

				document
					.getElementById("backToShelf")
					.addEventListener("click", function () {
						showMainShelf();
					});

				document
					.getElementById("backToSurah")
					.addEventListener("click", function () {
						showSurahList();
					});

				document
					.getElementById("searchInput")
					.addEventListener("input", function () {
						filterSurahs(this.value);
					});
			});

			function showMainShelf() {
				document.getElementById("mainShelf").style.display = "block";
				document.getElementById("surahList").style.display = "none";
				document.getElementById("surahDetail").style.display = "none";
				document.getElementById("backToShelf").style.display = "none";
				document.getElementById("backToSurah").style.display = "none";
				window.scrollTo({ top: 0, behavior: "smooth" });
			}

			function showSurahList() {
				document.getElementById("mainShelf").style.display = "none";
				document.getElementById("surahList").style.display = "block";
				document.getElementById("surahDetail").style.display = "none";
				document.getElementById("backToShelf").style.display = "flex";
				document.getElementById("backToSurah").style.display = "none";

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
				document.getElementById("backToShelf").style.display = "none";
				document.getElementById("backToSurah").style.display = "flex";

				renderSurahDetail(surah);
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
					await CacheManager.setItem(
						QURAN_CACHE_KEY,
						quranData,
						CACHE_EXPIRY_MS
					);

					renderSurahBooks();
				} catch (error) {
					console.error("Error fetching Quran data:", error);
					loadingError = true;

					// 4. Coba gunakan cache jika ada meskipun mungkin expired
					try {
						const fallbackCache = await CacheManager.getItem(
							QURAN_CACHE_KEY,
							true
						);
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
				const sortedSurahs = [...quranData.quran].sort(
					(a, b) => a.number - b.number
				);

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
		