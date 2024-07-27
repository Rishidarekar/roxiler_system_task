document.addEventListener('DOMContentLoaded', () => {
    const monthSelect = document.getElementById('monthSelect');
    const searchBox = document.getElementById('searchBox');
    const transactionsTableBody = document.getElementById('transactionsTable').getElementsByTagName('tbody')[0];
    const statisticsBox = document.getElementById('statisticsBox');
    const selectedMonth = document.getElementById('selectedMonth');
    const totalSaleAmount = document.getElementById('totalSaleAmount');
    const totalSoldItems = document.getElementById('totalSoldItems');
    const totalNotSoldItems = document.getElementById('totalNotSoldItems');
    const barChartContainer = document.getElementById('barChart');
    const pieChartContainer = document.getElementById('pieChart');
    const prevPageButton = document.getElementById('prevPage');
    const nextPageButton = document.getElementById('nextPage');
    
    let currentPage = 1;
    let totalPages = 1;
    
    function fetchTransactions() {
        const month = monthSelect.value;
        const search = searchBox.value;
        const page = currentPage;
        const perPage = 10;
    
        console.log(`Fetching page ${page}`);
    
        fetch(`/transactions?page=${page}&perPage=${perPage}&search=${search}&month=${month}`)
            .then(response => response.json())
            .then(data => {
                console.log(`Total Pages: ${data.totalPages}, Current Page: ${data.currentPage}`);
    
                // Clear existing rows
                transactionsTableBody.innerHTML = '';
    
                // Populate table rows
                data.transactions.forEach(transaction => {
                    const row = transactionsTableBody.insertRow();
                    row.insertCell(0).textContent = transaction.id;
                    row.insertCell(1).textContent = transaction.title;
                    row.insertCell(2).textContent = transaction.price;
                    row.insertCell(3).textContent = transaction.description;
                    row.insertCell(4).textContent = transaction.category;
                    row.insertCell(5).textContent = transaction.sold ? 'Yes' : 'No';
                    row.insertCell(6).textContent = new Date(transaction.dateOfSale).toLocaleDateString();
                });
    
                // Update pagination
                totalPages = data.totalPages;
                prevPageButton.disabled = currentPage === 1;
                nextPageButton.disabled = currentPage === totalPages;
    
                console.log(`Pagination updated: Prev ${prevPageButton.disabled}, Next ${nextPageButton.disabled}`);
    
                // Fetch statistics and charts data
                fetchStatistics();
                fetchCharts();
            })
            .catch(error => console.error('Error fetching transactions:', error));
    }
    
    
    function fetchStatistics() {
        const month = monthSelect.value;

        fetch(`/statistics?month=${month}`)
            .then(response => response.json())
            .then(data => {
                selectedMonth.textContent = new Date(`2024-${month}-01`).toLocaleString('default', { month: 'long' });
                totalSaleAmount.textContent = data.totalSaleAmount.toFixed(2);
                totalSoldItems.textContent = data.totalSoldItems;
                totalNotSoldItems.textContent = data.totalNotSoldItems;
            })
            .catch(error => console.error('Error fetching statistics:', error));
    }

    function fetchCharts() {
        const month = monthSelect.value;

        fetch(`/combinedData?month=${month}`)
            .then(response => response.json())
            .then(data => {
                // Bar Chart
                const priceRanges = data.priceRanges.map(range => range.range);
                const counts = data.priceRanges.map(range => range.count);

                new Chart(barChartContainer, {
                    type: 'bar',
                    data: {
                        labels: priceRanges,
                        datasets: [{
                            label: 'Number of Items',
                            data: counts,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });

                // Pie Chart
                const categories = data.categoryDistribution.map(cat => cat._id);
                const categoryCounts = data.categoryDistribution.map(cat => cat.count);

                new Chart(pieChartContainer, {
                    type: 'pie',
                    data: {
                        labels: categories,
                        datasets: [{
                            label: 'Category Distribution',
                            data: categoryCounts,
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)'
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)'
                            ],
                            borderWidth: 1
                        }]
                    }
                });
            })
            .catch(error => console.error('Error fetching charts:', error));
    }

    // Event listeners
    monthSelect.addEventListener('change', () => {
        currentPage = 1;
        fetchTransactions();
    });

    searchBox.addEventListener('input', () => {
        currentPage = 1;
        fetchTransactions();
    });

    // Event listeners
prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchTransactions();
    }
});

nextPageButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchTransactions();
    }
});


    // Initial data fetch
    fetchTransactions();
});
