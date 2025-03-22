function guitarApp() {
    return {
        guitars: [],
        lastUpdated: '',
        isLoading: true,
        searchQuery: '',
        selectedSource: 'all',
        sortBy: 'default',
        loadError: '',

        isScrapingReverb: false,
        isScrapingBuyee: false,
        showNotification: false,
        notificationMessage: '',

        init() {
            this.loadData();
        },

        runScraper(source) {
            if (source === 'reverb') {
                this.isScrapingReverb = true;
            } else if (source === 'buyee') {
                this.isScrapingBuyee = true;
            }

            const endpoint = `/api/run-scraper?source=${source}`;

            fetch(endpoint)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.showScraperNotification(`Данные из ${source} успешно обновлены!`);
                    this.loadData();
                })
                .catch(error => {
                    this.showScraperNotification(`Ошибка обновления данных из ${source}: ${error.message}`);
                })
                .finally(() => {
                    if (source === 'reverb') {
                        this.isScrapingReverb = false;
                    } else if (source === 'buyee') {
                        this.isScrapingBuyee = false;
                    }
                });
        },

        showScraperNotification(message) {
            this.notificationMessage = message;
            this.showNotification = true;

            setTimeout(() => {
                this.showNotification = false;
            }, 5000);
        },

        loadData() {
            fetch('data/guitars.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Ошибка HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.guitars = data.guitars || [];
                    this.guitars = this.guitars.map(guitar => ({
                        ...guitar,
                        title: this.cleanJapaneseChars(guitar.title)
                    }));
                    this.lastUpdated = data.last_updated || '';
                    this.isLoading = false;
                })
                .catch(error => {
                    this.loadError = error.toString();

                    fetch('data/test-guitars.json')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Ошибка HTTP: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.guitars = data.guitars || [];
                            this.guitars = this.guitars.map(guitar => ({
                                ...guitar,
                                title: this.cleanJapaneseChars(guitar.title)
                            }));
                            this.lastUpdated = data.last_updated || '';
                            this.loadError += ' (Использую тестовые данные)';
                        })
                        .catch(err => {
                            if (this.guitars.length === 0) {
                                this.guitars = [
                                    {
                                        title: "Тестовая гитара Fender",
                                        price: "10,000 иена (6,000 руб)",
                                        image: "img/guitar-placeholder.jpg",
                                        url: "#",
                                        source: "buyee"
                                    }
                                ];
                            }
                        })
                        .finally(() => {
                            this.isLoading = false;
                        });
                });
        },

        cleanJapaneseChars(text) {
            if (!text) return '';

            const japaneseCharsRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;

            return text.replace(japaneseCharsRegex, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        get filteredGuitars() {
            let filtered = [...this.guitars];

            if (this.selectedSource !== 'all') {
                filtered = filtered.filter(guitar => guitar.source === this.selectedSource);
            }

            if (this.searchQuery.trim() !== '') {
                const query = this.searchQuery.toLowerCase().trim();
                filtered = filtered.filter(guitar =>
                    guitar.title.toLowerCase().includes(query)
                );
            }

            if (this.sortBy === 'price-asc') {
                filtered.sort((a, b) => this.extractPrice(a.price) - this.extractPrice(b.price));
            } else if (this.sortBy === 'price-desc') {
                filtered.sort((a, b) => this.extractPrice(b.price) - this.extractPrice(a.price));
            }

            return filtered;
        },

        extractPrice(priceString) {
            const matches = priceString.match(/[\d,.]+/);
            if (matches && matches.length > 0) {
                return parseFloat(matches[0].replace(/[^\d.]/g, '')) || 0;
            }
            return 0;
        }
    };
}
