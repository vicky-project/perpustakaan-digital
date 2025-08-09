// ============================
// MODULE HELPER versi 6.1
// ============================
// GLOBAL CONFIGURATION
// ============================

const API_CONFIG = {
	urls: {
		quran: "https://vickyserver.my.id/server/api/books/quran",
		hadith: "https://vickyserver.my.id/server/api/books/hadith-book",
		asmaulHusna: "https://vickyserver.my.id/server/api/books/asmaul-husna",
		prophetStories:
			"https://vickyserver.my.id/server/api/books/prophet-stories",
		dailyPrayers: "https://vickyserver.my.id/server/api/books/doa",
		alkitab: "https://vickyserver.my.id/server/api/books/bibles",
		ojk: "https://vickyserver.my.id/server/api/books/ojk",
		search: "https://vickyserver.my.id/server/api/search"
	},
	cacheExpiry: 604800000, // 7 hari dalam milidetik,
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
			const config = API_CONFIG.libraries[libName];
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
		if (!API_CONFIG.libraries) return;

		const load = () => {
			Object.keys(API_CONFIG.libraries).forEach(lib => {
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

const PeriodicTableModule = (function () {
	// Data lengkap semua 118 unsur kimia
	const elements = [
		{
			symbol: "H",
			name: "Hydrogen",
			atomicNumber: 1,
			atomicMass: 1.008,
			group: "nonmetal",
			block: "s"
		},
		{
			symbol: "He",
			name: "Helium",
			atomicNumber: 2,
			atomicMass: 4.0026,
			group: "noble gas",
			block: "s"
		},
		{
			symbol: "Li",
			name: "Lithium",
			atomicNumber: 3,
			atomicMass: 6.94,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Be",
			name: "Beryllium",
			atomicNumber: 4,
			atomicMass: 9.0122,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "B",
			name: "Boron",
			atomicNumber: 5,
			atomicMass: 10.81,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "C",
			name: "Carbon",
			atomicNumber: 6,
			atomicMass: 12.011,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "N",
			name: "Nitrogen",
			atomicNumber: 7,
			atomicMass: 14.007,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "O",
			name: "Oxygen",
			atomicNumber: 8,
			atomicMass: 15.999,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "F",
			name: "Fluorine",
			atomicNumber: 9,
			atomicMass: 18.998,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Ne",
			name: "Neon",
			atomicNumber: 10,
			atomicMass: 20.18,
			group: "noble gas",
			block: "p"
		},
		{
			symbol: "Na",
			name: "Sodium",
			atomicNumber: 11,
			atomicMass: 22.99,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Mg",
			name: "Magnesium",
			atomicNumber: 12,
			atomicMass: 24.305,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "Al",
			name: "Aluminium",
			atomicNumber: 13,
			atomicMass: 26.982,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Si",
			name: "Silicon",
			atomicNumber: 14,
			atomicMass: 28.085,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "P",
			name: "Phosphorus",
			atomicNumber: 15,
			atomicMass: 30.974,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "S",
			name: "Sulfur",
			atomicNumber: 16,
			atomicMass: 32.06,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "Cl",
			name: "Chlorine",
			atomicNumber: 17,
			atomicMass: 35.45,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Ar",
			name: "Argon",
			atomicNumber: 18,
			atomicMass: 39.948,
			group: "noble gas",
			block: "p"
		},
		{
			symbol: "K",
			name: "Potassium",
			atomicNumber: 19,
			atomicMass: 39.098,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Ca",
			name: "Calcium",
			atomicNumber: 20,
			atomicMass: 40.078,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "Sc",
			name: "Scandium",
			atomicNumber: 21,
			atomicMass: 44.956,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ti",
			name: "Titanium",
			atomicNumber: 22,
			atomicMass: 47.867,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "V",
			name: "Vanadium",
			atomicNumber: 23,
			atomicMass: 50.942,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Cr",
			name: "Chromium",
			atomicNumber: 24,
			atomicMass: 51.996,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Mn",
			name: "Manganese",
			atomicNumber: 25,
			atomicMass: 54.938,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Fe",
			name: "Iron",
			atomicNumber: 26,
			atomicMass: 55.845,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Co",
			name: "Cobalt",
			atomicNumber: 27,
			atomicMass: 58.933,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ni",
			name: "Nickel",
			atomicNumber: 28,
			atomicMass: 58.693,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Cu",
			name: "Copper",
			atomicNumber: 29,
			atomicMass: 63.546,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Zn",
			name: "Zinc",
			atomicNumber: 30,
			atomicMass: 65.38,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ga",
			name: "Gallium",
			atomicNumber: 31,
			atomicMass: 69.723,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Ge",
			name: "Germanium",
			atomicNumber: 32,
			atomicMass: 72.63,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "As",
			name: "Arsenic",
			atomicNumber: 33,
			atomicMass: 74.922,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "Se",
			name: "Selenium",
			atomicNumber: 34,
			atomicMass: 78.971,
			group: "nonmetal",
			block: "p"
		},
		{
			symbol: "Br",
			name: "Bromine",
			atomicNumber: 35,
			atomicMass: 79.904,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Kr",
			name: "Krypton",
			atomicNumber: 36,
			atomicMass: 83.798,
			group: "noble gas",
			block: "p"
		},
		{
			symbol: "Rb",
			name: "Rubidium",
			atomicNumber: 37,
			atomicMass: 85.468,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Sr",
			name: "Strontium",
			atomicNumber: 38,
			atomicMass: 87.62,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "Y",
			name: "Yttrium",
			atomicNumber: 39,
			atomicMass: 88.906,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Zr",
			name: "Zirconium",
			atomicNumber: 40,
			atomicMass: 91.224,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Nb",
			name: "Niobium",
			atomicNumber: 41,
			atomicMass: 92.906,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Mo",
			name: "Molybdenum",
			atomicNumber: 42,
			atomicMass: 95.95,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Tc",
			name: "Technetium",
			atomicNumber: 43,
			atomicMass: 98,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ru",
			name: "Ruthenium",
			atomicNumber: 44,
			atomicMass: 101.07,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Rh",
			name: "Rhodium",
			atomicNumber: 45,
			atomicMass: 102.91,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Pd",
			name: "Palladium",
			atomicNumber: 46,
			atomicMass: 106.42,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ag",
			name: "Silver",
			atomicNumber: 47,
			atomicMass: 107.87,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Cd",
			name: "Cadmium",
			atomicNumber: 48,
			atomicMass: 112.41,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "In",
			name: "Indium",
			atomicNumber: 49,
			atomicMass: 114.82,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Sn",
			name: "Tin",
			atomicNumber: 50,
			atomicMass: 118.71,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Sb",
			name: "Antimony",
			atomicNumber: 51,
			atomicMass: 121.76,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "Te",
			name: "Tellurium",
			atomicNumber: 52,
			atomicMass: 127.6,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "I",
			name: "Iodine",
			atomicNumber: 53,
			atomicMass: 126.9,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Xe",
			name: "Xenon",
			atomicNumber: 54,
			atomicMass: 131.29,
			group: "noble gas",
			block: "p"
		},
		{
			symbol: "Cs",
			name: "Cesium",
			atomicNumber: 55,
			atomicMass: 132.91,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Ba",
			name: "Barium",
			atomicNumber: 56,
			atomicMass: 137.33,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "La",
			name: "Lanthanum",
			atomicNumber: 57,
			atomicMass: 138.91,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Ce",
			name: "Cerium",
			atomicNumber: 58,
			atomicMass: 140.12,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Pr",
			name: "Praseodymium",
			atomicNumber: 59,
			atomicMass: 140.91,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Nd",
			name: "Neodymium",
			atomicNumber: 60,
			atomicMass: 144.24,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Pm",
			name: "Promethium",
			atomicNumber: 61,
			atomicMass: 145,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Sm",
			name: "Samarium",
			atomicNumber: 62,
			atomicMass: 150.36,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Eu",
			name: "Europium",
			atomicNumber: 63,
			atomicMass: 151.96,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Gd",
			name: "Gadolinium",
			atomicNumber: 64,
			atomicMass: 157.25,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Tb",
			name: "Terbium",
			atomicNumber: 65,
			atomicMass: 158.93,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Dy",
			name: "Dysprosium",
			atomicNumber: 66,
			atomicMass: 162.5,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Ho",
			name: "Holmium",
			atomicNumber: 67,
			atomicMass: 164.93,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Er",
			name: "Erbium",
			atomicNumber: 68,
			atomicMass: 167.26,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Tm",
			name: "Thulium",
			atomicNumber: 69,
			atomicMass: 168.93,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Yb",
			name: "Ytterbium",
			atomicNumber: 70,
			atomicMass: 173.05,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Lu",
			name: "Lutetium",
			atomicNumber: 71,
			atomicMass: 174.97,
			group: "lanthanide",
			block: "f"
		},
		{
			symbol: "Hf",
			name: "Hafnium",
			atomicNumber: 72,
			atomicMass: 178.49,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ta",
			name: "Tantalum",
			atomicNumber: 73,
			atomicMass: 180.95,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "W",
			name: "Tungsten",
			atomicNumber: 74,
			atomicMass: 183.84,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Re",
			name: "Rhenium",
			atomicNumber: 75,
			atomicMass: 186.21,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Os",
			name: "Osmium",
			atomicNumber: 76,
			atomicMass: 190.23,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ir",
			name: "Iridium",
			atomicNumber: 77,
			atomicMass: 192.22,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Pt",
			name: "Platinum",
			atomicNumber: 78,
			atomicMass: 195.08,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Au",
			name: "Gold",
			atomicNumber: 79,
			atomicMass: 196.97,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Hg",
			name: "Mercury",
			atomicNumber: 80,
			atomicMass: 200.59,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Tl",
			name: "Thallium",
			atomicNumber: 81,
			atomicMass: 204.38,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Pb",
			name: "Lead",
			atomicNumber: 82,
			atomicMass: 207.2,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Bi",
			name: "Bismuth",
			atomicNumber: 83,
			atomicMass: 208.98,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Po",
			name: "Polonium",
			atomicNumber: 84,
			atomicMass: 209,
			group: "metalloid",
			block: "p"
		},
		{
			symbol: "At",
			name: "Astatine",
			atomicNumber: 85,
			atomicMass: 210,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Rn",
			name: "Radon",
			atomicNumber: 86,
			atomicMass: 222,
			group: "noble gas",
			block: "p"
		},
		{
			symbol: "Fr",
			name: "Francium",
			atomicNumber: 87,
			atomicMass: 223,
			group: "alkali metal",
			block: "s"
		},
		{
			symbol: "Ra",
			name: "Radium",
			atomicNumber: 88,
			atomicMass: 226,
			group: "alkaline earth metal",
			block: "s"
		},
		{
			symbol: "Ac",
			name: "Actinium",
			atomicNumber: 89,
			atomicMass: 227,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Th",
			name: "Thorium",
			atomicNumber: 90,
			atomicMass: 232.04,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Pa",
			name: "Protactinium",
			atomicNumber: 91,
			atomicMass: 231.04,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "U",
			name: "Uranium",
			atomicNumber: 92,
			atomicMass: 238.03,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Np",
			name: "Neptunium",
			atomicNumber: 93,
			atomicMass: 237,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Pu",
			name: "Plutonium",
			atomicNumber: 94,
			atomicMass: 244,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Am",
			name: "Americium",
			atomicNumber: 95,
			atomicMass: 243,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Cm",
			name: "Curium",
			atomicNumber: 96,
			atomicMass: 247,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Bk",
			name: "Berkelium",
			atomicNumber: 97,
			atomicMass: 247,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Cf",
			name: "Californium",
			atomicNumber: 98,
			atomicMass: 251,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Es",
			name: "Einsteinium",
			atomicNumber: 99,
			atomicMass: 252,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Fm",
			name: "Fermium",
			atomicNumber: 100,
			atomicMass: 257,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Md",
			name: "Mendelevium",
			atomicNumber: 101,
			atomicMass: 258,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "No",
			name: "Nobelium",
			atomicNumber: 102,
			atomicMass: 259,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Lr",
			name: "Lawrencium",
			atomicNumber: 103,
			atomicMass: 262,
			group: "actinide",
			block: "f"
		},
		{
			symbol: "Rf",
			name: "Rutherfordium",
			atomicNumber: 104,
			atomicMass: 267,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Db",
			name: "Dubnium",
			atomicNumber: 105,
			atomicMass: 268,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Sg",
			name: "Seaborgium",
			atomicNumber: 106,
			atomicMass: 269,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Bh",
			name: "Bohrium",
			atomicNumber: 107,
			atomicMass: 270,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Hs",
			name: "Hassium",
			atomicNumber: 108,
			atomicMass: 277,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Mt",
			name: "Meitnerium",
			atomicNumber: 109,
			atomicMass: 278,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Ds",
			name: "Darmstadtium",
			atomicNumber: 110,
			atomicMass: 281,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Rg",
			name: "Roentgenium",
			atomicNumber: 111,
			atomicMass: 282,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Cn",
			name: "Copernicium",
			atomicNumber: 112,
			atomicMass: 285,
			group: "transition metal",
			block: "d"
		},
		{
			symbol: "Nh",
			name: "Nihonium",
			atomicNumber: 113,
			atomicMass: 286,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Fl",
			name: "Flerovium",
			atomicNumber: 114,
			atomicMass: 289,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Mc",
			name: "Moscovium",
			atomicNumber: 115,
			atomicMass: 290,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Lv",
			name: "Livermorium",
			atomicNumber: 116,
			atomicMass: 293,
			group: "post-transition metal",
			block: "p"
		},
		{
			symbol: "Ts",
			name: "Tennessine",
			atomicNumber: 117,
			atomicMass: 294,
			group: "halogen",
			block: "p"
		},
		{
			symbol: "Og",
			name: "Oganesson",
			atomicNumber: 118,
			atomicMass: 294,
			group: "noble gas",
			block: "p"
		}
	];

	// Fungsi untuk mendapatkan warna berdasarkan golongan
	function getElementColor(group) {
		const colors = {
			nonmetal: "#A0FFA0",
			"noble gas": "#99CCFF",
			"alkali metal": "#FF9999",
			"alkaline earth metal": "#FFDE99",
			metalloid: "#CCFF99",
			halogen: "#FFFF99",
			metal: "#CCCCCC",
			"transition metal": "#FFCC99",
			lanthanide: "#FFBFFF",
			actinide: "#FF99CC",
			"post-transition metal": "#D4E4F0"
		};
		return colors[group] || "#CCCCCC";
	}

	// Fungsi untuk merender tabel periodik
	function renderTable() {
		// Render semua unsur
		const elementsHtml = elements
			.map(element => {
				const color = getElementColor(element.group);
				return `
                <div class="element-card" 
                     data-atomic-number="${element.atomicNumber}"
                     style="background: ${color};"
                     title="${element.name} - ${element.atomicMass.toFixed(3)}">
                    <div class="element-number">${element.atomicNumber}</div>
                    <div class="element-symbol">${element.symbol}</div>
                    <div class="element-name">${element.name}</div>
                    <div class="element-mass">${element.atomicMass.toFixed(
											3
										)}</div>
                </div>
            `;
			})
			.join("");

		// CSS hard-coded untuk tabel periodik
		const css = `
            <style>
                .periodic-table-container {
                    margin-top: 20px;
                    overflow-x: auto;
                }
                
                .periodic-table-grid {
                    display: grid;
                    grid-template-columns: repeat(18, 1fr);
                    gap: 4px;
                    min-width: 900px;
                    padding: 10px;
                }
                
                .element-card {
                    border-radius: 4px;
                    padding: 8px 4px;
                    text-align: center;
                    color: #333;
                    font-weight: 500;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    aspect-ratio: 1/1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    border: 1px solid rgba(0,0,0,0.1);
                }
                
                .element-card:hover {
                    transform: scale(1.05);
                    z-index: 2;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .element-number {
                    position: absolute;
                    top: 2px;
                    left: 4px;
                    font-size: 0.6rem;
                    opacity: 0.8;
                }
                
                .element-symbol {
                    font-size: 1.2rem;
                    font-weight: bold;
                    margin: 2px 0;
                    line-height: 1.1;
                }
                
                .element-name {
                    font-size: 0.5rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 2px;
                }
                
                .element-mass {
                    font-size: 0.5rem;
                    opacity: 0.8;
                }
                
                .periodic-table-legend {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 20px;
                    padding: 15px;
                    background: var(--card-dark);
                    border-radius: 8px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                }
                
                .legend-item {
                    display: flex;
                    align-items: center;
                    font-size: 0.8rem;
                    gap: 5px;
                }
                
                .legend-item span {
                    display: inline-block;
                    width: 15px;
                    height: 15px;
                    border-radius: 3px;
                    border: 1px solid rgba(0,0,0,0.2);
                }
                
                .periodic-table-full-btn {
                    display: block;
                    margin: 15px auto;
                    padding: 10px 20px;
                    background: var(--gold);
                    color: var(--dark);
                    border: none;
                    border-radius: 30px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .periodic-table-full-btn:hover {
                    background: var(--gold-light);
                    transform: translateY(-2px);
                }
                
                /* Responsiveness */
                @media (max-width: 767px) {
                    .periodic-table-grid {
                        gap: 3px;
                        min-width: 100%;
                        grid-template-columns: repeat(9, 1fr);
                    }
                    
                    .element-card {
                        padding: 4px 2px;
                        font-size: 0.8rem;
                    }
                    
                    .element-symbol {
                        font-size: 0.9rem;
                    }
                    
                    .element-name,
                    .element-mass {
                        display: none;
                    }
                    
                    .legend-item {
                        font-size: 0.7rem;
                        flex: 0 0 calc(33.333% - 10px);
                    }
                }
                
                @media (min-width: 768px) and (max-width: 991px) {
                    .periodic-table-grid {
                        min-width: 700px;
                        grid-template-columns: repeat(12, 1fr);
                    }
                    
                    .element-symbol {
                        font-size: 1rem;
                    }
                    
                    .element-name {
                        font-size: 0.45rem;
                    }
                }
            </style>
        `;

		// Legenda
		const legend = `
            <div class="periodic-table-legend">
                <div class="legend-item"><span style="background:#FF9999"></span>Alkali</div>
                <div class="legend-item"><span style="background:#FFDE99"></span>Alkali Tanah</div>
                <div class="legend-item"><span style="background:#FFCC99"></span>Logam Transisi</div>
                <div class="legend-item"><span style="background:#FFBFFF"></span>Lantanida</div>
                <div class="legend-item"><span style="background:#FF99CC"></span>Aktinida</div>
                <div class="legend-item"><span style="background:#CCFF99"></span>Metaloid</div>
                <div class="legend-item"><span style="background:#FFFF99"></span>Halogen</div>
                <div class="legend-item"><span style="background:#99CCFF"></span>Gas Mulia</div>
                <div class="legend-item"><span style="background:#A0FFA0"></span>Nonlogam</div>
                <div class="legend-item"><span style="background:#D4E4F0"></span>Logam Pascatransisi</div>
            </div>
        `;

		// Gabungkan semua komponen
		return `
            ${css}
            <div class="detail-header">
                <h2>Tabel Periodik</h2>
                <h3>Unsur-Unsur Kimia</h3>
            </div>
            <div class="periodic-table-container">
                <div class="periodic-table-grid">
                    ${elementsHtml}
                </div>
                <button class="periodic-table-full-btn">
                    <i class="fas fa-expand"></i> Tampilan Penuh
                </button>
            </div>
            ${legend}
        `;
	}

	// Public API
	return {
		render: renderTable
	};
})();

window.PeriodicTableModule = PeriodicTableModule;
window.API_CONFIG = API_CONFIG;
window.CacheManager = CacheManager;
window.paginationModule = paginationModule;
