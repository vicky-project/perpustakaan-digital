// ============================
// MODULE HELPER versi 6.1
// ============================
// GLOBAL CONFIGURATION
// ============================
const CONFIG = {
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
			const config = CONFIG.libraries[libName];
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
		if (!CONFIG.libraries) return;

		const load = () => {
			Object.keys(CONFIG.libraries).forEach(lib => {
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

window.CacheManager = CacheManager;
