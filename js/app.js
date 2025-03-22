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
        githubRepo: '',
        githubToken: '',

        init() {
            this.loadData();
            this.githubRepo = 'ixxydev.github.io/guitar-finder';
        },

        runScraper(source) {
            if (!this.githubRepo) {
                this.showScraperNotification(`Необходимо настроить имя репозитория в файле app.js`);
                return;
            }

            if (source === 'reverb') {
                this.isScrapingReverb = true;
                this.triggerGitHubWorkflow('scrape-reverb.yml', 'Reverb');
            } else if (source === 'buyee') {
                this.isScrapingBuyee = true;
                this.triggerGitHubWorkflow('scrape-buyee.yml', 'Buyee');
            }
        },

        triggerGitHubWorkflow(workflow, sourceName) {
            this.showScraperNotification(`Запуск обновления данных из ${sourceName} в GitHub...`);

            if (this.githubToken) {
                // Если у нас есть токен, запускаем workflow через API GitHub
                fetch(`https://api.github.com/repos/${this.githubRepo}/actions/workflows/${workflow}/dispatches`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ref: 'main' })
                })
                .then(response => {
                    if (response.status === 204) {
                        this.checkWorkflowStatus(workflow, sourceName);
                    } else {
                        throw new Error(`HTTP статус: ${response.status}`);
                    }
                })
                .catch(error => {
                    this.showScraperNotification(`Ошибка запуска обновления данных: ${error.message}`);
                    if (sourceName === 'Reverb') this.isScrapingReverb = false;
                    if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                });
            } else {
                // Если токена нет, показываем инструкцию для ручного запуска
                window.open(`https://github.com/${this.githubRepo}/actions/workflows/${workflow}`, '_blank');

                this.pollForChanges(sourceName);

                this.showScraperNotification(`Для запуска обновления данных, нажмите на кнопку "Run workflow" на открывшейся странице GitHub Actions. После запуска вернитесь на эту страницу.`);
            }
        },

        checkWorkflowStatus(workflow, sourceName) {
            this.showScraperNotification(`Обновление данных из ${sourceName} запущено. Проверка статуса...`);

            const checkInterval = setInterval(() => {
                fetch(`https://api.github.com/repos/${this.githubRepo}/actions/workflows/${workflow}/runs?status=completed&per_page=1`, {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.workflow_runs && data.workflow_runs.length > 0) {
                        const latestRun = data.workflow_runs[0];
                        const conclusion = latestRun.conclusion;

                        if (conclusion === 'success') {
                            this.showScraperNotification(`Данные из ${sourceName} успешно обновлены!`);
                            this.loadData();
                            clearInterval(checkInterval);
                            if (sourceName === 'Reverb') this.isScrapingReverb = false;
                            if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                        } else if (conclusion === 'failure') {
                            this.showScraperNotification(`Ошибка при обновлении данных из ${sourceName}.`);
                            clearInterval(checkInterval);
                            if (sourceName === 'Reverb') this.isScrapingReverb = false;
                            if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                        }
                    }
                })
                .catch(error => {
                    console.error('Ошибка при проверке статуса workflow:', error);
                });
            }, 10000);

            setTimeout(() => {
                clearInterval(checkInterval);
                if ((sourceName === 'Reverb' && this.isScrapingReverb) ||
                    (sourceName === 'Buyee' && this.isScrapingBuyee)) {
                    this.showScraperNotification(`Превышен таймаут проверки статуса. Пожалуйста, проверьте статус обновления данных на GitHub Actions.`);
                    if (sourceName === 'Reverb') this.isScrapingReverb = false;
                    if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                }
            }, 300000); // 5 минут таймаут
        },

        pollForChanges(sourceName) {
            const checkFile = sourceName.toLowerCase() === 'reverb' ? 'reverb_time.json' : 'buyee_time.json';
            const startTime = new Date();

            const fetchCurrentData = () => {
                return fetch(`data/${checkFile}?_=${Date.now()}`)
                    .then(response => {
                        if (!response.ok) return null;
                        return response.json();
                    })
                    .catch(() => null);
            };

            fetchCurrentData().then(initialData => {
                const initialTimestamp = initialData ? initialData.last_updated : null;

                const checkInterval = setInterval(() => {
                    fetchCurrentData().then(newData => {
                        if (newData && newData.last_updated !== initialTimestamp) {
                            this.showScraperNotification(`Данные из ${sourceName} успешно обновлены! Найдено ${newData.count} гитар.`);
                            this.loadData();
                            clearInterval(checkInterval);
                            if (sourceName === 'Reverb') this.isScrapingReverb = false;
                            if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                        }

                        // Проверяем таймаут (15 минут)
                        if (new Date() - startTime > 15 * 60 * 1000) {
                            this.showScraperNotification(`Превышен таймаут ожидания обновления данных из ${sourceName}.`);
                            clearInterval(checkInterval);
                            if (sourceName === 'Reverb') this.isScrapingReverb = false;
                            if (sourceName === 'Buyee') this.isScrapingBuyee = false;
                        }
                    });
                }, 30000); // Проверка каждые 30 секунд
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
