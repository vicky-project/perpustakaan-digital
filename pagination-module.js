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
