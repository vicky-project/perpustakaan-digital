(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof module === "object" && module.exports) {
		// CommonJS
		module.exports = factory();
	} else {
		// Browser global
		root.PaginationModule = factory();
	}
})(this, function () {
	"use strict";

	// Fungsi untuk menginisialisasi paginasi
	function initPagination(options) {
		// Validasi parameter
		if (!options.container) {
			console.error("PaginationModule: Container element is required");
			return null;
		}

		// Konfigurasi default
		const defaults = {
			data: [],
			perPage: 10,
			currentPage: 1,
			dataRenderFn: null,
			pagingContainer: null,
			onPageChange: null,
			filterFn: null,
			sortFn: null,
			isShowPerPage: true,
			perPageOptions: [10, 25, 50],
			showInfo: true,
			infoTemplate: "Menampilkan {from}-{to} dari {total}",
			serverSide: false,
			totalRecords: 0
		};

		// Gabungkan default dengan opsi pengguna
		const config = { ...defaults, ...options };

		// Inisialisasi pagination system
		try {
			const ps = new PaginationSystem({
				dataContainer: config.container,
				dataRenderFn: config.dataRenderFn,
				data: config.serverSide ? [] : config.data,
				pagingContainer: config.pagingContainer,
				currentPage: config.currentPage,
				perPage: config.perPage,
				filterFn: config.filterFn,
				sortFn: config.sortFn,
				isShowPerPage: config.isShowPerPage,
				perPageOptions: config.perPageOptions,
				isShowInfo: config.showInfo,
				infoTemplate: config.infoTemplate,
				onPageChange: config.onPageChange,
				totalRecords: config.serverSide
					? config.totalRecords
					: config.data.length
			});

			return ps;
		} catch (error) {
			console.error("PaginationModule initialization failed:", error);
			return null;
		}
	}

	// Fungsi untuk membuat filter sederhana
	function createSimpleFilter(fields, query) {
		return {
			fields: fields,
			operator: "or",
			action: "contains",
			value: query
		};
	}

	// API publik modul
	return {
		init: initPagination,
		createSimpleFilter: createSimpleFilter
	};
});
